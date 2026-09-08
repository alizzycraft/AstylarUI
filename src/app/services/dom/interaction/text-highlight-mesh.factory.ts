import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  ShaderMaterial,
  StandardMaterial,
  Texture,
  VertexBuffer,
} from '@babylonjs/core';
import { TextSelectionControllerService, TextSelectionState } from './text-selection-controller.service';
import { TextInteractionEntry, TextInteractionRegistryService } from './text-interaction-registry.service';
import { TextSelectionStore } from '../../../store/text-selection.store';
import { StyleService } from '../style.service';
import { BabylonCameraService } from '../../babylon-camera.service';

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
  colors: { background: Color3; foreground: Color3; source: Color3; sourceBackground: Color3 };
}

const MIN_SEGMENT_WIDTH_CSS = 0.2;
const MIN_SEGMENT_HEIGHT_CSS = 0.2;
// The highlight is opaque for reliable contrast, so it must sit immediately
// behind the glyph plane rather than tinting or covering the rendered text.
const HIGHLIGHT_Z_OFFSET = -0.0005;
const FOREGROUND_Z_OFFSET = 0.002;

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

export function mapSelectionVertexUv(
  positionX: number,
  positionY: number,
  segment: HighlightSegment,
  textWidth: number,
  textHeight: number,
  textureTransform = { uScale: 1, uOffset: 0, vScale: 1, vOffset: 0 },
): [number, number] {
  const left = (segment.centerX - segment.width / 2 + textWidth / 2) / textWidth;
  const top = (segment.centerY - segment.height / 2 + textHeight / 2) / textHeight;
  return [
    (left + ((positionX + 0.5) * segment.width / textWidth)) * textureTransform.uScale +
      textureTransform.uOffset,
    (top + ((positionY + 0.5) * segment.height / textHeight)) * textureTransform.vScale +
      textureTransform.vOffset,
  ];
}

@Injectable({ providedIn: 'root' })
export class TextHighlightMeshFactory {
  private readonly selectionStore = inject(TextSelectionStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly textSelectionController = inject(TextSelectionControllerService);
  private readonly textInteractionRegistry = inject(TextInteractionRegistryService);
  private readonly styleService = inject(StyleService);
  private readonly camera = inject(BabylonCameraService);

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

    const viewport = entry.viewportCssSize;
    if (!viewport || viewport.width <= 0 || viewport.height <= 0) return [];
    const halfWidth = viewport.width / 2;
    const halfHeight = viewport.height / 2;

    const minTop = cssMetrics.lines.reduce((acc: number, line: any) => Math.min(acc, line.top), Number.POSITIVE_INFINITY);

    const segments: HighlightSegment[] = [];

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

      const startXCss = lineStartCaret + lineOffset - scrollOffset;
      const endXCss = lineEndCaret + lineOffset - scrollOffset;
      const clippedStartCss = Math.max(0, Math.min(startXCss, viewport.width));
      const clippedEndCss = Math.max(0, Math.min(endXCss, viewport.width));
      const widthCss = Math.max(clippedEndCss - clippedStartCss, 0);
      if (widthCss <= MIN_SEGMENT_WIDTH_CSS) {
        continue;
      }
      const centerX = (clippedStartCss + clippedEndCss) / 2 - halfWidth;

      const topOffsetCss = line.top - minTop;
      const heightCss = Math.max(line.bottom - line.top, line.height ?? 0);
      // The selection planes are children of the text mesh. Padding has already
      // been applied to that mesh's position, so its local origin is the top of
      // the text texture rather than the control's padding box.
      const unclippedTopCss = topOffsetCss - scrollTop;
      const unclippedBottomCss = unclippedTopCss + heightCss;
      const clippedTopCss = Math.max(0, Math.min(unclippedTopCss, viewport.height));
      const clippedBottomCss = Math.max(0, Math.min(unclippedBottomCss, viewport.height));
      const clippedHeightCss = clippedBottomCss - clippedTopCss;
      if (clippedHeightCss <= MIN_SEGMENT_HEIGHT_CSS) {
        continue;
      }
      const centerY = (clippedTopCss + clippedBottomCss) / 2 - halfHeight;

      segments.push({
        centerX,
        centerY,
        width: widthCss,
        height: clippedHeightCss
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
    const textSize = entry.viewportCssSize;
    if (!textSize) return;
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
      this.cropForegroundUvs(entry, foregroundMesh, segment, textSize.width, textSize.height);

      backgroundMesh.metadata.highlight = {
        ...backgroundMesh.metadata.highlight,
        width: segment.width,
        height: segment.height,
        heightCss: segment.height,
      };
    });

    this.highlightRecords.set(entry.elementId, existing);
  }

  private createHighlightRecord(entry: TextInteractionEntry): HighlightMeshes {
    const scene = entry.mesh.getScene();
    const sourceBackground = this.resolveBackground(entry);
    const colors = {
      ...chooseSelectionColors(sourceBackground),
      source: this.resolveColor(entry.style?.color) ?? Color3.Black(),
      sourceBackground,
    };
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
            if (glyph.a <= 0.001) discard;
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
    // Selected glyph fragments sit slightly nearer than the original text and
    // write depth. Fully transparent texture pixels are discarded above, so
    // they cannot occlude the source glyph plane if transparent sort order
    // changes.
    material.disableDepthWrite = false;
    material.forceDepthWrite = true;
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
    mesh.metadata = {
      ...(mesh.metadata || {}),
      selectionForeground: {
        ownerElementId: entry.elementId,
        color: record.colors.foreground.toHexString().toLowerCase(),
        sourceColor: record.colors.source.toHexString().toLowerCase(),
        backgroundColor: record.colors.background.toHexString().toLowerCase(),
        sourceBackgroundColor: record.colors.sourceBackground.toHexString().toLowerCase(),
        contrast: record.contrast.foreground,
      },
    };
    return mesh;
  }

  private positionSelectionMesh(mesh: Mesh, segment: HighlightSegment, z: number): void {
    const size = this.camera.projectCssSize({ width: segment.width, height: segment.height });
    const center = this.camera.projectCssLocalPoint({ x: segment.centerX, y: segment.centerY });
    mesh.scaling.x = size.width;
    mesh.scaling.y = size.height;
    mesh.position.x = center.x;
    mesh.position.y = center.y;
    mesh.position.z = z;
    mesh.isVisible = true;
  }

  private cropForegroundUvs(
    entry: TextInteractionEntry,
    mesh: Mesh,
    segment: HighlightSegment,
    textWidth: number,
    textHeight: number,
  ): void {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    if (!positions || textWidth <= 0 || textHeight <= 0) {
      return;
    }
    const texture = this.resolveForegroundTexture(entry);
    const textureTransform = texture instanceof Texture
      ? {
          uScale: texture.uScale,
          uOffset: texture.uOffset,
          vScale: texture.vScale,
          vOffset: texture.vOffset,
        }
      : undefined;
    const uvs: number[] = [];
    for (let index = 0; index < positions.length; index += 3) {
      uvs.push(...mapSelectionVertexUv(
        positions[index], positions[index + 1], segment, textWidth, textHeight, textureTransform,
      ));
    }
    mesh.setVerticesData(VertexBuffer.UVKind, uvs, true);
  }

  private syncForegroundTexture(material: ShaderMaterial, entry: TextInteractionEntry): void {
    const texture = this.resolveForegroundTexture(entry);
    if (texture) {
      material.setTexture('textTexture', texture);
    }
  }

  private resolveForegroundTexture(entry: TextInteractionEntry) {
    const textMaterial = entry.mesh.material;
    return textMaterial instanceof StandardMaterial
      ? textMaterial.diffuseTexture ?? textMaterial.emissiveTexture
      : undefined;
  }

  private resolveBackground(entry: TextInteractionEntry): Color3 {
    return this.resolveColor(entry.style?.background) ??
      this.resolveAncestorBackground(entry.mesh) ?? Color3.White();
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
