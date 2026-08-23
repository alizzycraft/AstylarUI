import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  ShaderMaterial,
  StandardMaterial,
  VertexBuffer,
} from '@babylonjs/core';
import { TextSelectionControllerService, TextSelectionState } from './text-selection-controller.service';
import { TextInteractionEntry, TextInteractionRegistryService } from './text-interaction-registry.service';
import { TextSelectionStore } from '../../../store/text-selection.store';
import { StyleService } from '../style.service';

interface HighlightSegment {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

interface HighlightMeshes {
  backgroundMeshes: Mesh[];
  foregroundMeshes: Mesh[];
  backgroundMaterial: StandardMaterial;
  foregroundMaterial: ShaderMaterial;
  contrast: { background: number; foreground: number };
  colors: { background: Color3; foreground: Color3 };
}

const MIN_SEGMENT_WIDTH = 0.002;
const MIN_SEGMENT_HEIGHT = 0.002;
// The highlight is opaque for reliable contrast, so it must sit immediately
// behind the glyph plane rather than tinting or covering the rendered text.
const HIGHLIGHT_Z_OFFSET = -0.0005;
const FOREGROUND_Z_OFFSET = 0.0005;

const LIGHT_SELECTION = Color3.FromHexString('#9ad5ff');
const DARK_SELECTION = Color3.FromHexString('#173f6b');

export function relativeLuminance(color: Color3): number {
  const linear = (channel: number): number => channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

export function contrastRatio(left: Color3, right: Color3): number {
  const [lighter, darker] = [relativeLuminance(left), relativeLuminance(right)]
    .sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

export function chooseSelectionHighlightColor(background: Color3, _text: Color3): Color3 {
  return chooseSelectionColors(background).background;
}

export function chooseSelectionColors(background: Color3): { background: Color3; foreground: Color3 } {
  const black = Color3.Black();
  const white = Color3.White();
  const preferred = relativeLuminance(background) < 0.45 ? LIGHT_SELECTION : DARK_SELECTION;
  const fallback = contrastRatio(black, background) >= contrastRatio(white, background)
    ? black
    : white;
  const highlight = (contrastRatio(preferred, background) >= 3 ? preferred : fallback).clone();
  const foreground = contrastRatio(black, highlight) >= contrastRatio(white, highlight)
    ? black
    : white;
  return { background: highlight, foreground };
}

@Injectable({ providedIn: 'root' })
export class TextHighlightMeshFactory {
  private readonly selectionStore = inject(TextSelectionStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly textSelectionController = inject(TextSelectionControllerService);
  private readonly textInteractionRegistry = inject(TextInteractionRegistryService);
  private readonly styleService = inject(StyleService);

  private readonly highlightRecords = new Map<string, HighlightMeshes>();
  private currentElementId?: string;

  constructor() {
    // Subscribe directly to the controller's observable for immediate updates during drag
    this.textSelectionController.selection$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {

        const entry = state.elementId
          ? this.textInteractionRegistry.getByElementId(state.elementId)
          : undefined;
        this.applySelection(state, entry);
      });

    this.destroyRef.onDestroy(() => {
      this.clearAllHighlights();
    });
  }

  clearAllHighlights(): void {
    for (const [elementId] of this.highlightRecords) {
      this.disposeHighlights(elementId);
    }
    this.highlightRecords.clear();
    this.currentElementId = undefined;
  }

  private applySelection(state: TextSelectionState, entry?: TextInteractionEntry): void {


    if (!state.range || state.range.start === state.range.end || !entry || !entry.metrics) {
      this.clearCurrentHighlights();
      return;
    }

    // Debug logging for range values


    if (this.currentElementId && this.currentElementId !== entry.elementId) {
      this.disposeHighlights(this.currentElementId);
    }

    this.currentElementId = entry.elementId;

    const segments = this.computeSegments(state.range.start, state.range.end, entry);
    if (!segments.length) {
      this.disposeHighlights(entry.elementId);
      return;
    }

    this.syncHighlightMeshes(entry, segments);
  }

  private computeSegments(start: number, end: number, entry: TextInteractionEntry): HighlightSegment[] {
    const metrics = entry.metrics;
    if (!metrics) {
      return [];
    }

    const cssMetrics = metrics.css;
    const characters = cssMetrics.characters;

    if (!cssMetrics.lines.length || !characters.length) {
      return [];
    }

    // Debug logging for selection range


    const lineCharMap = new Map<number, typeof characters>();
    for (const character of characters) {
      if (character.isLineBreak) {
        continue;
      }
      const bucket = lineCharMap.get(character.lineIndex);
      if (bucket) {
        bucket.push(character);
      } else {
        lineCharMap.set(character.lineIndex, [character]);
      }
    }

    const textMesh = entry.mesh;
    textMesh.computeWorldMatrix(true);
    textMesh.refreshBoundingInfo();
    const boundingInfo = textMesh.getBoundingInfo().boundingBox;
    const textWidth = boundingInfo.maximum.x - boundingInfo.minimum.x;
    const textHeight = boundingInfo.maximum.y - boundingInfo.minimum.y;
    const halfWidth = textWidth / 2;
    const halfHeight = textHeight / 2;

    // Debug logging for text mesh position



    const minTop = cssMetrics.lines.reduce((acc: number, line: any) => Math.min(acc, line.top), Number.POSITIVE_INFINITY);

    const segments: HighlightSegment[] = [];

    // Calculate scale based on the ratio of Mesh Width to CSS Content Width
    // The text mesh represents the actual text content, not the container
    // So we divide textWidth by the actual content width (calculated from characters), not the container width
    let actualContentWidth = 0;
    if (cssMetrics.characters && cssMetrics.characters.length > 0) {
      for (const char of cssMetrics.characters) {
        const charEnd = char.x + char.advance;
        if (charEnd > actualContentWidth) {
          actualContentWidth = charEnd;
        }
      }
    } else {
      actualContentWidth = cssMetrics.lines.reduce((max: number, line: any) => Math.max(max, line.width ?? 0), 0);
    }

    // If text is clipped/scrolled, textWidth corresponds to the visible window, not the full content width.
    // In that case, we should rely on the stored scale if available, or derive it carefully.
    // Using metrics.scale is usually safer if known.
    const scale = metrics.scale ?? (actualContentWidth > 0 ? textWidth / actualContentWidth : 1);
    const scrollOffset = entry.scrollOffset || 0;
    const scrollTop = entry.scrollTop || 0;
    for (const line of cssMetrics.lines) {
      const lineChars = lineCharMap.get(line.index) ?? [];
      const overlapStart = Math.max(start, line.startIndex);
      const overlapEnd = Math.min(end, line.endIndex);

      if (overlapStart >= overlapEnd) {
        continue;
      }



      const lineStartCaret = this.resolveCaretPosition(overlapStart, line, lineChars);
      const lineEndCaret = this.resolveCaretPosition(overlapEnd, line, lineChars, true);



      // Character x positions in CSS metrics are relative to line start (x=0)
      // We need to add lineOffset if text is aligned (center/right)
      const textAlign = entry.style?.textAlign?.toLowerCase() ?? 'left';
      const totalWidth = cssMetrics.totalWidth ?? 0;
      const lineWidth = line.width ?? 0;
      let lineOffset = 0;

      if (textAlign === 'right') {
        lineOffset = totalWidth - lineWidth;
      } else if (textAlign === 'center' || textAlign === 'middle') {
        lineOffset = (totalWidth - lineWidth) / 2;
      }

      // Convert to world units, applying scroll offset
      // Coordinates are relative to the *content* start, scrollOffset shifts the visual window.
      // visible_x = (absolute_x - scroll_offset)
      const startXCss = lineStartCaret + lineOffset - scrollOffset;
      const endXCss = lineEndCaret + lineOffset - scrollOffset;

      let startXWorld = startXCss * scale;
      let endXWorld = endXCss * scale;

      // Clamp values to the visible text area [0, textWidth]
      // This handles cases where parts of the selection are scrolled out of view
      startXWorld = Math.max(0, Math.min(startXWorld, textWidth));
      endXWorld = Math.max(0, Math.min(endXWorld, textWidth));

      // Calculate width from clamped world positions
      const widthWorld = Math.max(endXWorld - startXWorld, 0);

      // If segment is effectively invisible (or reversed due to clamping? shouldn't happen), skip
      if (widthWorld <= MIN_SEGMENT_WIDTH) {
        continue;
      }

      // Calculate center position directly from start and end positions
      // Map from text content coordinate system to text mesh coordinate system
      // With World X+ being Left and the text mesh rotated 180 degrees on Z,
      // the local X+ aligns with World Right (Visual Right).
      // Visual Left is at local -halfWidth, Visual Right is at local +halfWidth.
      const centerX = ((startXWorld + endXWorld) / 2) - (textWidth / 2);

      const topOffsetCss = line.top - minTop;
      const heightCss = Math.max(line.bottom - line.top, line.height ?? 0);
      // The selection planes are children of the text mesh. Padding has already
      // been applied to that mesh's position, so its local origin is the top of
      // the text texture rather than the control's padding box.
      const unclippedTopWorld = (topOffsetCss - scrollTop) * scale;
      const unclippedBottomWorld = unclippedTopWorld + (heightCss * scale);
      const clippedTopWorld = Math.max(0, Math.min(unclippedTopWorld, textHeight));
      const clippedBottomWorld = Math.max(0, Math.min(unclippedBottomWorld, textHeight));
      const heightWorld = clippedBottomWorld - clippedTopWorld;
      if (heightWorld <= MIN_SEGMENT_HEIGHT) {
        continue;
      }
      // Convert from top-left origin (text metrics) to center origin (text mesh)
      // With 180 degree rotation, local Y+ aligns with World Down (Visual Down).
      // Visual Top is at local -halfHeight, Visual Bottom is at local +halfHeight.
      const centerY = ((clippedTopWorld + clippedBottomWorld) / 2) - halfHeight;

      // Debug logging for calculated positions



      segments.push({
        centerX,
        centerY,
        width: widthWorld,
        height: heightWorld
      });
    }

    return segments;
  }

  private resolveLineOffset(entry: TextInteractionEntry, line: { width: number }, totalWidth: number): number {
    const textAlign = entry.style?.textAlign?.toLowerCase() ?? 'left';
    const lineWidth = line.width ?? totalWidth;

    switch (textAlign) {
      case 'center':
      case 'middle':
        return Math.max(0, (totalWidth - lineWidth) / 2);
      case 'right':
        return Math.max(0, totalWidth - lineWidth);
      default:
        return 0;
    }
  }

  private resolveCaretPosition(
    targetIndex: number,
    line: { startIndex: number; endIndex: number },
    lineCharacters: Array<{ index: number; x: number; advance: number }>,
    clampToEnd = false
  ): number {
    // Debug logging for caret position resolution


    if (!lineCharacters.length) {

      return 0;
    }

    if (targetIndex <= line.startIndex) {

      return 0;
    }

    if (targetIndex >= line.endIndex) {
      const last = lineCharacters[lineCharacters.length - 1];
      const result = clampToEnd ? last.x + last.advance : last.x + last.advance;

      return result;
    }

    const exact = lineCharacters.find((char) => char.index === targetIndex);
    if (exact) {

      return exact.x;
    }

    const preceding = this.findPrecedingCharacter(targetIndex, lineCharacters);
    if (preceding) {
      const result = preceding.x + preceding.advance;

      return result;
    }


    return 0;
  }

  private findPrecedingCharacter(
    targetIndex: number,
    characters: Array<{ index: number; x: number; advance: number }>
  ): { index: number; x: number; advance: number } | undefined {
    for (let i = characters.length - 1; i >= 0; i -= 1) {
      const candidate = characters[i];
      if (candidate.index < targetIndex) {
        return candidate;
      }
    }
    return undefined;
  }

  private syncHighlightMeshes(entry: TextInteractionEntry, segments: HighlightSegment[]): void {
    const existing = this.highlightRecords.get(entry.elementId) ?? this.createHighlightRecord(entry);
    const scene = entry.mesh.getScene();
    const textSize = this.resolveTextMeshSize(entry.mesh);
    this.syncForegroundTexture(existing.foregroundMaterial, entry);

    if (existing.backgroundMeshes.length && existing.backgroundMeshes[0].parent !== entry.mesh) {
      [...existing.backgroundMeshes, ...existing.foregroundMeshes].forEach((mesh) => {
        mesh.parent = entry.mesh;
      });
    }

    // Dispose surplus meshes if selection shrank
    while (existing.backgroundMeshes.length > segments.length) {
      existing.backgroundMeshes.pop()?.dispose();
      existing.foregroundMeshes.pop()?.dispose();
    }

    segments.forEach((segment, index) => {
      let backgroundMesh = existing.backgroundMeshes[index];
      let foregroundMesh = existing.foregroundMeshes[index];
      if (!backgroundMesh || !foregroundMesh) {
        backgroundMesh = this.createHighlightMesh(entry, existing, index, scene);
        foregroundMesh = this.createForegroundMesh(entry, existing, index, scene);
        existing.backgroundMeshes.push(backgroundMesh);
        existing.foregroundMeshes.push(foregroundMesh);
      }

      this.positionSelectionMesh(backgroundMesh, segment, HIGHLIGHT_Z_OFFSET);
      this.positionSelectionMesh(foregroundMesh, segment, FOREGROUND_Z_OFFSET);
      this.cropForegroundUvs(foregroundMesh, segment, textSize.width, textSize.height);

      backgroundMesh.metadata.highlight = {
        ...backgroundMesh.metadata.highlight,
        width: segment.width,
        height: segment.height,
        heightCss: segment.height / Math.max(entry.metrics?.scale ?? 1, Number.EPSILON),
      };
    });

    this.highlightRecords.set(entry.elementId, existing);
  }

  private createHighlightRecord(entry: TextInteractionEntry): HighlightMeshes {
    const scene = entry.mesh.getScene();
    const colors = this.resolveSelectionColors(entry);
    const backgroundMaterial = this.createHighlightMaterial(scene, colors.background);
    const foregroundMaterial = this.createForegroundMaterial(scene, entry, colors.foreground);
    const record: HighlightMeshes = {
      backgroundMeshes: [],
      foregroundMeshes: [],
      backgroundMaterial,
      foregroundMaterial,
      colors,
      contrast: {
        background: contrastRatio(colors.background, this.resolveBackground(entry)),
        foreground: contrastRatio(colors.foreground, colors.background),
      },
    };
    this.highlightRecords.set(entry.elementId, record);
    return record;
  }

  private createHighlightMesh(
    entry: TextInteractionEntry,
    record: HighlightMeshes,
    index: number,
    scene: Scene
  ): Mesh {
    const mesh = MeshBuilder.CreatePlane(`${entry.elementId}-highlight-${index}`, { width: 1, height: 1, sideOrientation: entry.mesh.sideOrientation }, scene);
    mesh.parent = entry.mesh;
    mesh.material = record.backgroundMaterial;
    mesh.isPickable = false;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      highlight: {
        ownerElementId: entry.elementId,
        color: record.colors.background.toHexString().toLowerCase(),
        foregroundColor: record.colors.foreground.toHexString().toLowerCase(),
        backgroundContrast: record.contrast.background,
        foregroundContrast: record.contrast.foreground,
      }
    };
    mesh.renderingGroupId = entry.mesh.renderingGroupId;
    return mesh;
  }

  private createHighlightMaterial(scene: Scene, highlight: Color3): StandardMaterial {
    const material = new StandardMaterial('text-selection-highlight', scene);
    material.diffuseColor = highlight;
    material.alpha = 1;
    material.specularColor = Color3.Black();
    material.emissiveColor = highlight;
    material.backFaceCulling = false;
    material.disableLighting = true;
    material.disableDepthWrite = true;
    return material;
  }

  private createForegroundMaterial(
    scene: Scene,
    entry: TextInteractionEntry,
    foreground: Color3,
  ): ShaderMaterial {
    const material = new ShaderMaterial(
      'text-selection-foreground',
      scene,
      {
        vertexSource: `
          precision highp float;
          attribute vec3 position;
          attribute vec2 uv;
          uniform mat4 worldViewProjection;
          varying vec2 vUV;
          void main(void) {
            gl_Position = worldViewProjection * vec4(position, 1.0);
            vUV = uv;
          }
        `,
        fragmentSource: `
          precision highp float;
          varying vec2 vUV;
          uniform sampler2D textTexture;
          uniform vec3 selectionColor;
          void main(void) {
            vec4 glyph = texture2D(textTexture, vUV);
            gl_FragColor = vec4(selectionColor, glyph.a);
          }
        `,
      },
      {
        attributes: ['position', 'uv'],
        uniforms: ['worldViewProjection', 'selectionColor'],
        samplers: ['textTexture'],
        needAlphaBlending: true,
      },
    );
    material.setColor3('selectionColor', foreground);
    material.disableDepthWrite = true;
    material.backFaceCulling = false;
    this.syncForegroundTexture(material, entry);
    return material;
  }

  private createForegroundMesh(
    entry: TextInteractionEntry,
    record: HighlightMeshes,
    index: number,
    scene: Scene,
  ): Mesh {
    const mesh = MeshBuilder.CreatePlane(
      `${entry.elementId}-selection-foreground-${index}`,
      { width: 1, height: 1, sideOrientation: entry.mesh.sideOrientation },
      scene,
    );
    mesh.parent = entry.mesh;
    mesh.material = record.foregroundMaterial;
    mesh.isPickable = false;
    mesh.renderingGroupId = entry.mesh.renderingGroupId;
    // Selected glyphs share the original text depth, so explicit transparent
    // ordering ensures this recolor pass is composed after the normal glyphs.
    mesh.alphaIndex = entry.mesh.alphaIndex + 1;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      selectionForeground: {
        ownerElementId: entry.elementId,
        color: record.colors.foreground.toHexString().toLowerCase(),
        contrast: record.contrast.foreground,
      },
    };
    return mesh;
  }

  private positionSelectionMesh(mesh: Mesh, segment: HighlightSegment, z: number): void {
    mesh.scaling.x = segment.width;
    mesh.scaling.y = segment.height;
    mesh.position.x = segment.centerX;
    mesh.position.y = segment.centerY;
    mesh.position.z = z;
    mesh.isVisible = true;
  }

  private cropForegroundUvs(
    mesh: Mesh,
    segment: HighlightSegment,
    textWidth: number,
    textHeight: number,
  ): void {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    if (!positions || textWidth <= 0 || textHeight <= 0) {
      return;
    }
    const left = (segment.centerX - segment.width / 2 + textWidth / 2) / textWidth;
    const top = (segment.centerY - segment.height / 2 + textHeight / 2) / textHeight;
    const width = segment.width / textWidth;
    const height = segment.height / textHeight;
    const uvs: number[] = [];
    for (let index = 0; index < positions.length; index += 3) {
      uvs.push(
        // Text planes are rotated by PI around Z to compensate for Babylon's
        // texture orientation, so visual-left maps to the texture's high-U edge.
        1 - (left + ((positions[index] + 0.5) * width)),
        top + ((positions[index + 1] + 0.5) * height),
      );
    }
    mesh.setVerticesData(VertexBuffer.UVKind, uvs, true);
  }

  private syncForegroundTexture(material: ShaderMaterial, entry: TextInteractionEntry): void {
    const textMaterial = entry.mesh.material;
    const texture = textMaterial instanceof StandardMaterial
      ? textMaterial.diffuseTexture ?? textMaterial.emissiveTexture
      : undefined;
    if (texture) {
      material.setTexture('textTexture', texture);
    }
  }

  private resolveTextMeshSize(mesh: Mesh): { width: number; height: number } {
    mesh.computeWorldMatrix(true);
    mesh.refreshBoundingInfo();
    const bounds = mesh.getBoundingInfo().boundingBox;
    return {
      width: bounds.maximum.x - bounds.minimum.x,
      height: bounds.maximum.y - bounds.minimum.y,
    };
  }

  private resolveBackground(entry: TextInteractionEntry): Color3 {
    return this.resolveColor(entry.style?.background) ??
      this.resolveAncestorBackground(entry.mesh) ?? Color3.White();
  }

  private resolveSelectionColors(entry: TextInteractionEntry): { background: Color3; foreground: Color3 } {
    return chooseSelectionColors(this.resolveBackground(entry));
  }

  private resolveColor(value: string | undefined): Color3 | undefined {
    const parsed = value ? this.styleService.parseBackgroundColor(value) : undefined;
    return parsed?.type === 'color' ? parsed.color : undefined;
  }

  private resolveAncestorBackground(mesh: Mesh): Color3 | undefined {
    let candidate = mesh.parent;
    while (candidate instanceof Mesh) {
      const material = candidate.material;
      if (material instanceof StandardMaterial &&
          material.alpha * candidate.visibility > 0.01 &&
          !material.diffuseTexture) {
        return material.emissiveColor.clone();
      }
      candidate = candidate.parent;
    }
    return undefined;
  }

  private clearCurrentHighlights(): void {
    if (!this.currentElementId) {
      return;
    }
    this.disposeHighlights(this.currentElementId);
    this.currentElementId = undefined;
  }

  private disposeHighlights(elementId: string): void {
    const record = this.highlightRecords.get(elementId);
    if (!record) {
      return;
    }

    for (const mesh of [...record.backgroundMeshes, ...record.foregroundMeshes]) {
      mesh.dispose();
    }

    record.backgroundMaterial.dispose();
    record.foregroundMaterial.dispose();
    this.highlightRecords.delete(elementId);
  }
}
