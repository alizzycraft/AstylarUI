import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { TextCharacterMetrics, TextLayoutMetrics, TextStyleProperties } from '../../types/text-rendering';
import type { CssPoint, CssSize, RenderPoint, RenderSize } from '../coordinate-space.types';
import { BabylonMeshService } from '../babylon-mesh.service';
import { StyleService } from '../dom/style.service';

interface TextPaintProjection {
  projectCssLocalPoint(point: CssPoint, renderDepth?: number): RenderPoint;
  projectCssSize(size: CssSize): RenderSize;
}

/** Paints text selection and caret geometry from CSS-pixel measurements. */
@Injectable({ providedIn: 'root' })
export class TextSelectionService {
  private readonly CURSOR_WIDTH_SCALE = 1;

  constructor(
    private _babylonMeshService: BabylonMeshService,
    private styleService: StyleService,
  ) {}

  createSelectionHighlight(
    selectionStart: number,
    selectionEnd: number,
    layoutMetrics: TextLayoutMetrics,
    parentMesh: BABYLON.Mesh,
    scene: BABYLON.Scene,
    projection: TextPaintProjection,
  ): BABYLON.Mesh[] {
    if (selectionStart === selectionEnd || selectionStart < 0 || selectionEnd < 0) return [];

    const ranges = this.calculateSelectionRanges(
      Math.min(selectionStart, selectionEnd),
      Math.max(selectionStart, selectionEnd),
      layoutMetrics,
    );
    return ranges.flatMap((range, index) => {
      const mesh = this.createSelectionMeshForRange(
        range,
        parentMesh,
        scene,
        projection,
        `selection_${parentMesh.name}_${index}`,
      );
      return mesh ? [mesh] : [];
    });
  }

  updateSelectionHighlight(
    existingMeshes: BABYLON.Mesh[],
    selectionStart: number,
    selectionEnd: number,
    layoutMetrics: TextLayoutMetrics,
    parentMesh: BABYLON.Mesh,
    scene: BABYLON.Scene,
    projection: TextPaintProjection,
  ): BABYLON.Mesh[] {
    this.disposeSelectionMeshes(existingMeshes);
    return this.createSelectionHighlight(
      selectionStart,
      selectionEnd,
      layoutMetrics,
      parentMesh,
      scene,
      projection,
    );
  }

  createTextCursor(
    cursorPosition: number,
    layoutMetrics: TextLayoutMetrics,
    parentMesh: BABYLON.Mesh,
    scene: BABYLON.Scene,
    projection: TextPaintProjection,
    style: TextStyleProperties,
    inputCssSize: CssSize,
    _textureCssWidth?: number,
    widthCorrectionRatio = 1,
    scrollOffset = 0,
    visualTextLeftEdgeCss?: number,
  ): BABYLON.Mesh {
    const size = projection.projectCssSize({ width: 2, height: style.fontSize * 1.2 });
    const cursor = BABYLON.MeshBuilder.CreateBox(`cursor_${parentMesh.name}`, {
      width: size.width,
      height: size.height,
      depth: 0.01,
    }, scene);

    const material = new BABYLON.StandardMaterial(`cursorMaterial_${parentMesh.name}`, scene);
    cursor.material = material;
    this.updateTextCursorColor(cursor, style);
    material.disableLighting = true;
    cursor.parent = parentMesh;
    cursor.position.x = this.projectCursorX(
      cursorPosition,
      layoutMetrics,
      projection,
      inputCssSize,
      widthCorrectionRatio,
      scrollOffset,
      visualTextLeftEdgeCss,
    );
    cursor.position.y = 0;
    cursor.position.z = 0.1;
    cursor.isPickable = false;
    cursor.renderingGroupId = 3;
    return cursor;
  }

  updateTextCursorColor(cursor: BABYLON.Mesh, style: TextStyleProperties): void {
    const material = cursor.material;
    if (!(material instanceof BABYLON.StandardMaterial)) return;
    const authoredCaret = style.caretColor?.trim();
    const transparent = authoredCaret?.toLowerCase() === 'transparent';
    const caretSource = !authoredCaret || authoredCaret.toLowerCase() === 'auto'
      ? style.color
      : authoredCaret;
    const parsedCaret = transparent ? null : this.styleService.parseBackgroundColor(caretSource);
    const caretColor = parsedCaret?.type === 'color' ? parsedCaret.color : BABYLON.Color3.Black();
    material.diffuseColor = caretColor;
    material.emissiveColor = caretColor;
    material.alpha = transparent ? 0 : parsedCaret?.type === 'color' ? parsedCaret.alpha ?? 1 : 1;
  }

  updateCursorPosition(
    cursor: BABYLON.Mesh,
    cursorPosition: number,
    layoutMetrics: TextLayoutMetrics,
    projection: TextPaintProjection,
    inputCssSize: CssSize,
    _textureCssWidth?: number,
    widthCorrectionRatio = 1,
    scrollOffset = 0,
    visualTextLeftEdgeCss?: number,
  ): void {
    cursor.position.x = this.projectCursorX(
      cursorPosition,
      layoutMetrics,
      projection,
      inputCssSize,
      widthCorrectionRatio,
      scrollOffset,
      visualTextLeftEdgeCss,
    );
  }

  disposeSelectionMeshes(selectionMeshes: BABYLON.Mesh[]): void {
    selectionMeshes.forEach(mesh => {
      mesh.material?.dispose();
      mesh.dispose();
    });
  }

  getCharacterIndexAtPosition(visualX: number, layoutMetrics: TextLayoutMetrics): number {
    if (!layoutMetrics.characters?.length || visualX < 0) return 0;
    let closestIndex = 0;
    let minDiff = Math.abs(visualX);
    layoutMetrics.characters.forEach((character, index) => {
      const before = Math.abs(visualX - character.x);
      if (before < minDiff) {
        minDiff = before;
        closestIndex = index;
      }
      const after = Math.abs(visualX - (character.x + character.width));
      if (after < minDiff) {
        minDiff = after;
        closestIndex = index + 1;
      }
    });
    return closestIndex;
  }

  private projectCursorX(
    cursorPosition: number,
    layoutMetrics: TextLayoutMetrics,
    projection: TextPaintProjection,
    inputCssSize: CssSize,
    widthCorrectionRatio: number,
    scrollOffset: number,
    visualTextLeftEdgeCss?: number,
  ): number {
    const cursorX = this.calculateCursorPosition(cursorPosition, layoutMetrics);
    const availableWidthCss = Math.max(0, inputCssSize.width - 3);
    const visibleCursorX = Math.max(0, Math.min(availableWidthCss, cursorX - scrollOffset));
    const textLeftEdgeCss = visualTextLeftEdgeCss ?? -inputCssSize.width / 2 + 1.5;
    return projection.projectCssLocalPoint({
      x: textLeftEdgeCss + visibleCursorX * widthCorrectionRatio / this.CURSOR_WIDTH_SCALE,
      y: 0,
    }).x;
  }

  private calculateSelectionRanges(
    start: number,
    end: number,
    layoutMetrics: TextLayoutMetrics,
  ): Array<{ startX: number; endX: number; line: number; y: number; height: number }> {
    const lineGroups = new Map<number, TextCharacterMetrics[]>();
    layoutMetrics.characters.forEach(character => {
      if (character.index < start || character.index >= end) return;
      const line = lineGroups.get(character.lineIndex) ?? [];
      line.push(character);
      lineGroups.set(character.lineIndex, line);
    });

    const ranges: Array<{ startX: number; endX: number; line: number; y: number; height: number }> = [];
    lineGroups.forEach((characters, lineIndex) => {
      const line = layoutMetrics.lines[lineIndex];
      if (!line || !characters.length) return;
      const first = characters[0];
      const last = characters[characters.length - 1];
      ranges.push({
        startX: first.x,
        endX: last.x + last.width,
        line: lineIndex,
        y: line.top,
        height: line.height,
      });
    });
    return ranges;
  }

  private createSelectionMeshForRange(
    range: { startX: number; endX: number; line: number; y: number; height: number },
    parentMesh: BABYLON.Mesh,
    scene: BABYLON.Scene,
    projection: TextPaintProjection,
    meshName: string,
  ): BABYLON.Mesh | null {
    const width = range.endX - range.startX;
    if (width <= 0) return null;
    const size = projection.projectCssSize({ width, height: range.height });
    const selectionMesh = BABYLON.MeshBuilder.CreatePlane(meshName, {
      width: size.width,
      height: size.height,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    }, scene);
    const material = new BABYLON.StandardMaterial(`${meshName}_material`, scene);
    material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 1);
    material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
    material.alpha = 0.3;
    material.disableLighting = true;
    selectionMesh.material = material;
    selectionMesh.parent = parentMesh;
    const center = projection.projectCssLocalPoint({
      x: range.startX + width / 2,
      y: range.y + range.height / 2,
    });
    selectionMesh.position.set(center.x, center.y, 0.05);
    selectionMesh.isPickable = false;
    selectionMesh.renderingGroupId = 2;
    return selectionMesh;
  }

  private calculateCursorPosition(position: number, layoutMetrics: TextLayoutMetrics): number {
    if (position <= 0) return 0;
    if (position >= layoutMetrics.characters.length) {
      const last = layoutMetrics.characters[layoutMetrics.characters.length - 1];
      return last ? last.x + last.width : 0;
    }
    return layoutMetrics.characters[position]?.x ?? 0;
  }
}
