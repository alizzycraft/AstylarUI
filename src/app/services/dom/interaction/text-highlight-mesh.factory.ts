import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial } from '@babylonjs/core';
import { TextSelectionControllerService, TextSelectionState } from './text-selection-controller.service';
import { TextInteractionEntry, TextInteractionRegistryService } from './text-interaction-registry.service';
import { TextSelectionStore } from '../../../store/text-selection.store';

interface HighlightSegment {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

interface HighlightMeshes {
  meshes: Mesh[];
  material: StandardMaterial;
}

const MIN_SEGMENT_WIDTH = 0.002;
const MIN_SEGMENT_HEIGHT = 0.002;
const HIGHLIGHT_Z_OFFSET = 0.0005;

@Injectable({ providedIn: 'root' })
export class TextHighlightMeshFactory {
  private readonly selectionStore = inject(TextSelectionStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly textSelectionController = inject(TextSelectionControllerService);
  private readonly textInteractionRegistry = inject(TextInteractionRegistryService);

  private readonly highlightRecords = new Map<string, HighlightMeshes>();
  private currentElementId?: string;

  constructor() {
    // Subscribe directly to the controller's observable for immediate updates during drag
    this.textSelectionController.selection$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        console.log('[TextHighlight] Subscription received state update:', state);
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
    console.log('[TextHighlight] applySelection called:', {
      hasRange: !!state.range,
      rangeStart: state.range?.start,
      rangeEnd: state.range?.end,
      isPointerDown: state.isPointerDown,
      hasEntry: !!entry,
      hasMetrics: !!entry?.metrics
    });

    if (!state.range || state.range.start === state.range.end || !entry || !entry.metrics) {
      this.clearCurrentHighlights();
      return;
    }

    // Debug logging for range values
    console.log(`[TextHighlight] Applying selection range: start=${state.range.start}, end=${state.range.end}`);

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
    console.log(`[TextHighlight] computeSegments called with start=${start}, end=${end}`);

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
    console.log(`[TextHighlight] Text mesh position: x=${textMesh.position.x}, y=${textMesh.position.y}`);
    console.log(`[TextHighlight] Text mesh absolute position: x=${textMesh.absolutePosition.x}, y=${textMesh.absolutePosition.y}`);

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
    const verticalOrigin = entry.verticalOrigin || 0;

    console.log(`[TextHighlight] Scale calculation: textWidth=${textWidth}, actualContentWidth=${actualContentWidth}, scale=${scale}, scrollOffset=${scrollOffset}`);

    for (const line of cssMetrics.lines) {
      const lineChars = lineCharMap.get(line.index) ?? [];
      const overlapStart = Math.max(start, line.startIndex);
      const overlapEnd = Math.min(end, line.endIndex);

      if (overlapStart >= overlapEnd) {
        continue;
      }

      console.log(`[TextHighlight] Processing line ${line.index}: overlapStart=${overlapStart}, overlapEnd=${overlapEnd}, line.startIndex=${line.startIndex}, line.endIndex=${line.endIndex}`);

      const lineStartCaret = this.resolveCaretPosition(overlapStart, line, lineChars);
      const lineEndCaret = this.resolveCaretPosition(overlapEnd, line, lineChars, true);

      console.log(`[TextHighlight] Line ${line.index} caret positions: lineStartCaret=${lineStartCaret}, lineEndCaret=${lineEndCaret}`);

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
      const unclippedTopWorld = (topOffsetCss + verticalOrigin - scrollTop) * scale;
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
      console.log(`[TextHighlight] Line ${line.index}: startXWorld=${startXWorld}, endXWorld=${endXWorld}, centerX=${centerX}, centerY=${centerY}`);
      console.log(`[TextHighlight] Line ${line.index}: widthWorld=${widthWorld}, heightWorld=${heightWorld}`);

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
    console.log(`[TextHighlight] Resolving caret position: targetIndex=${targetIndex}, line.startIndex=${line.startIndex}, line.endIndex=${line.endIndex}, clampToEnd=${clampToEnd}`);

    if (!lineCharacters.length) {
      console.log(`[TextHighlight] No line characters, returning 0`);
      return 0;
    }

    if (targetIndex <= line.startIndex) {
      console.log(`[TextHighlight] Target index <= line start index, returning 0`);
      return 0;
    }

    if (targetIndex >= line.endIndex) {
      const last = lineCharacters[lineCharacters.length - 1];
      const result = clampToEnd ? last.x + last.advance : last.x + last.advance;
      console.log(`[TextHighlight] Target index >= line end index, returning ${result} (last.x=${last.x}, last.advance=${last.advance})`);
      return result;
    }

    const exact = lineCharacters.find((char) => char.index === targetIndex);
    if (exact) {
      console.log(`[TextHighlight] Found exact character match, returning ${exact.x}`);
      return exact.x;
    }

    const preceding = this.findPrecedingCharacter(targetIndex, lineCharacters);
    if (preceding) {
      const result = preceding.x + preceding.advance;
      console.log(`[TextHighlight] Found preceding character, returning ${result} (preceding.x=${preceding.x}, preceding.advance=${preceding.advance})`);
      return result;
    }

    console.log(`[TextHighlight] No match found, returning 0`);
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

    if (existing.meshes.length && existing.meshes[0].parent !== entry.mesh) {
      existing.meshes.forEach((mesh) => {
        mesh.parent = entry.mesh;
      });
    }

    // Dispose surplus meshes if selection shrank
    while (existing.meshes.length > segments.length) {
      const mesh = existing.meshes.pop();
      mesh?.dispose();
    }

    const isMultiLine = segments.length > 1;

    segments.forEach((segment, index) => {
      let mesh = existing.meshes[index];
      if (!mesh) {
        mesh = this.createHighlightMesh(entry, existing.material, index, scene);
        existing.meshes.push(mesh);
      }

      mesh.scaling.x = segment.width;
      mesh.scaling.y = segment.height;
      mesh.position.x = segment.centerX;
      mesh.position.y = segment.centerY;
      mesh.position.z = HIGHLIGHT_Z_OFFSET;
      mesh.isVisible = true; // Ensure mesh visibility

      // Debug logging for mesh positioning
      console.log(`[TextHighlight] Mesh ${index}: position=(${mesh.position.x}, ${mesh.position.y}), scale=(${mesh.scaling.x}, ${mesh.scaling.y})`);
    });

    this.highlightRecords.set(entry.elementId, existing);
  }

  private createHighlightRecord(entry: TextInteractionEntry): HighlightMeshes {
    const scene = entry.mesh.getScene();
    const material = this.createHighlightMaterial(scene);
    const record: HighlightMeshes = { meshes: [], material };
    this.highlightRecords.set(entry.elementId, record);
    return record;
  }

  private createHighlightMesh(
    entry: TextInteractionEntry,
    material: StandardMaterial,
    index: number,
    scene: Scene
  ): Mesh {
    const mesh = MeshBuilder.CreatePlane(`${entry.elementId}-highlight-${index}`, { width: 1, height: 1, sideOrientation: entry.mesh.sideOrientation }, scene);
    mesh.parent = entry.mesh;
    mesh.material = material;
    mesh.isPickable = false;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      highlight: {
        ownerElementId: entry.elementId
      }
    };
    mesh.renderingGroupId = entry.mesh.renderingGroupId;
    return mesh;
  }

  private createHighlightMaterial(scene: Scene): StandardMaterial {
    const material = new StandardMaterial('text-selection-highlight', scene);
    material.diffuseColor = new Color3(0.2, 0.45, 1.0);
    material.alpha = 0.35;
    material.specularColor = Color3.Black();
    material.emissiveColor = new Color3(0.05, 0.15, 0.35);
    material.backFaceCulling = false;
    material.disableLighting = true;
    material.disableDepthWrite = true;
    return material;
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

    for (const mesh of record.meshes) {
      mesh.dispose();
    }

    record.material.dispose();
    this.highlightRecords.delete(elementId);
  }
}
