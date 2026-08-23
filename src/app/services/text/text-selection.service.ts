import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { TextLayoutMetrics, TextCharacterMetrics, TextStyleProperties } from '../../types/text-rendering';
import { BabylonMeshService } from '../babylon-mesh.service';
import { StyleService } from '../dom/style.service';

/**
 * Service for creating and managing text selection highlighting
 * Works with existing text layout metrics to provide accurate selection rendering
 */
@Injectable({
  providedIn: 'root'
})
export class TextSelectionService {

  // Scaling factor for cursor movement. Ideally 1.0, but kept for adjustment if needed.
  private readonly CURSOR_WIDTH_SCALE = 1.0;



  constructor(
    private babylonMeshService: BabylonMeshService,
    private styleService: StyleService,
  ) { }

  /**
   * Creates selection highlight meshes for a text range
   * @param selectionStart - Start character index
   * @param selectionEnd - End character index
   * @param layoutMetrics - Text layout metrics from text rendering service
   * @param parentMesh - Parent mesh to attach selection to
   * @param scene - BabylonJS scene
   * @param scale - Pixel to world scale factor
   * @returns Array of selection highlight meshes
   */
  createSelectionHighlight(
    selectionStart: number,
    selectionEnd: number,
    layoutMetrics: TextLayoutMetrics,
    parentMesh: BABYLON.Mesh,
    scene: BABYLON.Scene,
    scale: number
  ): BABYLON.Mesh[] {
    if (selectionStart === selectionEnd || selectionStart < 0 || selectionEnd < 0) {
      return [];
    }

    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);

    // Group characters by line for multi-line selections
    const selectionRanges = this.calculateSelectionRanges(start, end, layoutMetrics);

    const selectionMeshes: BABYLON.Mesh[] = [];

    selectionRanges.forEach((range, index) => {
      const mesh = this.createSelectionMeshForRange(
        range,
        parentMesh,
        scene,
        scale,
        `selection_${parentMesh.name}_${index}`
      );
      if (mesh) {
        selectionMeshes.push(mesh);
      }
    });

    return selectionMeshes;
  }

  /**
   * Updates existing selection highlight meshes
   * @param existingMeshes - Current selection meshes to update
   * @param selectionStart - New start character index
   * @param selectionEnd - New end character index
   * @param layoutMetrics - Text layout metrics
   * @param parentMesh - Parent mesh
   * @param scene - BabylonJS scene
   * @param scale - Pixel to world scale factor
   * @returns Updated array of selection meshes
   */
  updateSelectionHighlight(
    existingMeshes: BABYLON.Mesh[],
    selectionStart: number,
    selectionEnd: number,
    layoutMetrics: TextLayoutMetrics,
    parentMesh: BABYLON.Mesh,
    scene: BABYLON.Scene,
    scale: number
  ): BABYLON.Mesh[] {
    // Dispose existing meshes
    this.disposeSelectionMeshes(existingMeshes);

    // Create new selection
    return this.createSelectionHighlight(
      selectionStart,
      selectionEnd,
      layoutMetrics,
      parentMesh,
      scene,
      scale
    );
  }

  /**
   * Creates a text cursor mesh at the specified character position
   * @param cursorPosition - Character index for cursor position
   * @param layoutMetrics - Text layout metrics
   * @param parentMesh - Parent mesh to attach cursor to
   * @param scene - BabylonJS scene
   * @param scale - Pixel to world scale factor
   * @param style - Text style properties for cursor sizing
   * @returns Cursor mesh
   */
  createTextCursor(
    cursorPosition: number,
    layoutMetrics: TextLayoutMetrics,
    parentMesh: BABYLON.Mesh,
    scene: BABYLON.Scene,
    scale: number,
    style: TextStyleProperties,
    textureWidth?: number,
    widthCorrectionRatio: number = 1.0,
    scrollOffset: number = 0,
    visualTextLeftEdgeX?: number
  ): BABYLON.Mesh {




    const cursorX = this.calculateCursorPosition(cursorPosition, layoutMetrics);
    const cursorLine = this.findLineForPosition(cursorPosition, layoutMetrics);




    const cursorHeight = style.fontSize * scale * 1.2; // Slightly taller than font
    const cursorWidth = 2 * scale; // 2px cursor width





    const cursor = BABYLON.MeshBuilder.CreateBox(`cursor_${parentMesh.name}`, {
      width: cursorWidth,
      height: cursorHeight,
      depth: 0.01 * scale
    }, scene);

    // Create cursor material
    const material = new BABYLON.StandardMaterial(`cursorMaterial_${parentMesh.name}`, scene);
    cursor.material = material;
    // CSS caret-color:auto resolves to currentColor. Astylar does not yet
    // expose authored caret-color, so the resolved text color is the browser-
    // equivalent default and remains legible on dark controls.
    this.updateTextCursorColor(cursor, style);
    material.disableLighting = true;

    // Position cursor relative to parent mesh (input field)
    cursor.parent = parentMesh;

    // Calculate input field dimensions for proper positioning
    const inputBounds = parentMesh.getBoundingInfo().boundingBox;
    const inputWidth = (inputBounds.maximumWorld.x - inputBounds.minimumWorld.x);
    const inputHeight = (inputBounds.maximumWorld.y - inputBounds.minimumWorld.y);

    // Apply same positioning logic as text in input fields
    // Text mesh is positioned at: (inputWidth / 2) - (textureWidth / 2) - padding
    // Cursor position is measured from the left edge of text in CSS pixels, so convert to world
    // Use the actual texture width if available, otherwise fall back to layout metrics
    const textWidth = textureWidth !== undefined ? textureWidth : layoutMetrics.totalWidth * scale;
    // With accurate metrics, we just need standard padding if any, but the metrics should be 1:1
    const padding = 1.5 * scale; // Legacy fallback when no rendered text edge is available.
    const textMeshPosition = (inputWidth / 2) - (textWidth / 2) - padding;
    // Since the input text plane is rotated by PI, its visual left edge is its
    // positive local-X edge. Prefer that rendered edge when the owner supplies
    // it so authored padding, clipping, and alignment remain single-sourced.
    const textLeftEdgeX = visualTextLeftEdgeX ?? textMeshPosition + (textWidth / 2);

    // Position cursor at the correct location
    // The cursorX is in CSS pixels, so we need to convert it to world units using the scale
    // Account for text mesh rotation (180 degrees) which flips the text horizontally
    // Apply correction ratio to align metrics with actual texture width
    // scrollX is cursorX - scrollOffset (the visible X within the clipped mesh)
    let scrollX = cursorX - scrollOffset;

    // Clamp scrollX to ensure cursor stays within the visible bounds of the input field
    const availableWidth = inputWidth - (padding * 2);
    const availableWidthCss = availableWidth / scale;
    scrollX = Math.max(0, Math.min(availableWidthCss, scrollX));

    // Subtracting from LeftEdgeX moves towards Local -X (World Right)
    cursor.position.x = textLeftEdgeX - (scrollX * widthCorrectionRatio * scale / this.CURSOR_WIDTH_SCALE);
    cursor.position.y = 0; // Center vertically in input field
    cursor.position.z = 0.1 * scale; // In front of text



    cursor.isPickable = false;
    cursor.renderingGroupId = 3; // Highest priority for UI elements


    return cursor;
  }

  /** Keeps an existing caret aligned with the currently resolved text color. */
  updateTextCursorColor(cursor: BABYLON.Mesh, style: TextStyleProperties): void {
    const material = cursor.material;
    if (!(material instanceof BABYLON.StandardMaterial)) return;
    const parsedCaret = this.styleService.parseBackgroundColor(style.color);
    const caretColor = parsedCaret?.type === 'color'
      ? parsedCaret.color
      : BABYLON.Color3.Black();
    material.diffuseColor = caretColor;
    material.emissiveColor = caretColor;
    material.alpha = parsedCaret?.type === 'color' ? parsedCaret.alpha ?? 1 : 1;
  }

  /**
   * Updates cursor position
   * @param cursor - Existing cursor mesh
   * @param cursorPosition - New character index
   * @param layoutMetrics - Text layout metrics
   * @param scale - Pixel to world scale factor
   */
  updateCursorPosition(
    cursor: BABYLON.Mesh,
    cursorPosition: number,
    layoutMetrics: TextLayoutMetrics,
    scale: number,
    textureWidth?: number,
    widthCorrectionRatio: number = 1.0,
    scrollOffset: number = 0,
    visualTextLeftEdgeX?: number
  ): void {
    const cursorX = this.calculateCursorPosition(cursorPosition, layoutMetrics);

    // Apply same positioning logic as in createTextCursor
    if (cursor.parent && cursor.parent instanceof BABYLON.Mesh) {
      const parentMesh = cursor.parent as BABYLON.Mesh;
      const inputBounds = parentMesh.getBoundingInfo().boundingBox;
      const inputWidth = (inputBounds.maximumWorld.x - inputBounds.minimumWorld.x);

      const padding = 1.5 * scale;
      // Use the actual texture width if available, otherwise fall back to layout metrics
      const textWidth = textureWidth !== undefined ? textureWidth : layoutMetrics.totalWidth * scale;
      const textMeshPosition = (inputWidth / 2) - (textWidth / 2) - padding;
      const textLeftEdgeX = visualTextLeftEdgeX ?? textMeshPosition + (textWidth / 2);

      let scrollX = cursorX - scrollOffset;

      // Clamp scrollX to ensure cursor stays within the visible bounds of the input field
      const availableWidth = inputWidth - (padding * 2);
      const availableWidthCss = availableWidth / scale;
      scrollX = Math.max(0, Math.min(availableWidthCss, scrollX));

      // Position cursor at the correct location (Subtracting offset because of 180 rotation)
      cursor.position.x = textLeftEdgeX - (scrollX * widthCorrectionRatio * scale / this.CURSOR_WIDTH_SCALE);
    } else {
      cursor.position.x = (cursorX * widthCorrectionRatio * scale / this.CURSOR_WIDTH_SCALE);
    }
  }

  /**
   * Disposes selection meshes
   * @param selectionMeshes - Array of selection meshes to dispose
   */
  disposeSelectionMeshes(selectionMeshes: BABYLON.Mesh[]): void {
    selectionMeshes.forEach(mesh => {
      if (mesh.material) {
        mesh.material.dispose();
      }
      mesh.dispose();
    });
  }

  /**
   * Calculates selection ranges for multi-line text
   * @param start - Start character index
   * @param end - End character index
   * @param layoutMetrics - Text layout metrics
   * @returns Array of selection ranges per line
   */
  private calculateSelectionRanges(
    start: number,
    end: number,
    layoutMetrics: TextLayoutMetrics
  ): Array<{ startX: number; endX: number; line: number; y: number; height: number }> {
    const ranges: Array<{ startX: number; endX: number; line: number; y: number; height: number }> = [];

    // Group characters by line
    const lineGroups = new Map<number, TextCharacterMetrics[]>();
    layoutMetrics.characters.forEach(char => {
      if (char.index >= start && char.index < end) {
        if (!lineGroups.has(char.lineIndex)) {
          lineGroups.set(char.lineIndex, []);
        }
        lineGroups.get(char.lineIndex)!.push(char);
      }
    });

    // Create selection range for each line
    lineGroups.forEach((chars, lineIndex) => {
      if (chars.length === 0) return;

      const line = layoutMetrics.lines[lineIndex];
      if (!line) return;

      const firstChar = chars[0];
      const lastChar = chars[chars.length - 1];

      const startX = firstChar.x;
      const endX = lastChar.x + lastChar.width;

      ranges.push({
        startX,
        endX,
        line: lineIndex,
        y: line.top,
        height: line.height
      });
    });

    return ranges;
  }

  /**
   * Creates a selection mesh for a specific range
   * @param range - Selection range data
   * @param parentMesh - Parent mesh
   * @param scene - BabylonJS scene
   * @param scale - Pixel to world scale factor
   * @param meshName - Name for the mesh
   * @returns Selection mesh
   */
  private createSelectionMeshForRange(
    range: { startX: number; endX: number; line: number; y: number; height: number },
    parentMesh: BABYLON.Mesh,
    scene: BABYLON.Scene,
    scale: number,
    meshName: string
  ): BABYLON.Mesh | null {
    const width = range.endX - range.startX;
    if (width <= 0) return null;

    const selectionMesh = BABYLON.MeshBuilder.CreatePlane(meshName, {
      width: width * scale,
      height: range.height * scale,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);

    // Create selection material (semi-transparent blue)
    const material = new BABYLON.StandardMaterial(`${meshName}_material`, scene);
    material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 1.0);
    material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
    material.alpha = 0.3;
    material.disableLighting = true;
    selectionMesh.material = material;

    // Position selection mesh
    selectionMesh.parent = parentMesh;
    selectionMesh.position.x = (range.startX + width / 2) * scale;
    selectionMesh.position.y = (range.y + range.height / 2) * scale;
    selectionMesh.position.z = 0.05 * scale; // Behind cursor but in front of text

    selectionMesh.isPickable = false;
    selectionMesh.renderingGroupId = 2;

    return selectionMesh;
  }

  /**
   * Calculates cursor X position for a character index
   * @param position - Character index
   * @param layoutMetrics - Text layout metrics
   * @returns X position in CSS pixels
   */
  private calculateCursorPosition(position: number, layoutMetrics: TextLayoutMetrics): number {



    if (position <= 0) {

      return 0;
    }

    if (position >= layoutMetrics.characters.length) {
      // Position at end of text
      const lastChar = layoutMetrics.characters[layoutMetrics.characters.length - 1];
      const endPos = lastChar ? lastChar.x + lastChar.width : 0;

      return endPos;
    }

    // Position before the character at the given index
    const char = layoutMetrics.characters[position];
    const charPos = char ? char.x : 0;

    return charPos;
  }

  /**
   * Finds the line containing a character position
   * @param position - Character index
   * @param layoutMetrics - Text layout metrics
   * @returns Line metrics or null if not found
   */
  private findLineForPosition(position: number, layoutMetrics: TextLayoutMetrics) {
    const char = layoutMetrics.characters[position] || layoutMetrics.characters[layoutMetrics.characters.length - 1];
    if (!char) return layoutMetrics.lines[0] || null;

    return layoutMetrics.lines[char.lineIndex] || null;
  }

  /**
   * Calculates the character index closest to a given visual X position
   * @param visualX - The visual X distance from the start of the text (in CSS pixels)
   * @param layoutMetrics - Text layout metrics
   * @returns The character index
   */
  getCharacterIndexAtPosition(visualX: number, layoutMetrics: TextLayoutMetrics): number {
    // Basic validation
    if (!layoutMetrics.characters || layoutMetrics.characters.length === 0) return 0;

    // Initial check: if visualX is negative (before text), return 0
    if (visualX < 0) return 0;

    let closestIndex = 0;
    let minDiff = Number.MAX_VALUE;

    // Check distance to the start (0)
    const diffStart = Math.abs(visualX - 0);
    minDiff = diffStart;
    closestIndex = 0;

    // Iterate through all characters to find transition points
    // A transition point is the gap between characters.
    // Index i corresponds to the gap BEFORE character i.
    // Index length corresponds to the gap AFTER the last character.

    // Check all character centers to see if we should snap to the index before or after
    for (let i = 0; i < layoutMetrics.characters.length; i++) {
      const char = layoutMetrics.characters[i];
      const charCenter = char.x + (char.width / 2);

      // If we are past the center of this character, we are likely closer to index i+1
      // If we are before the center, we are likely closer to index i

      // Let's rely on finding the specific character whose center is closest,
      // then decide if we are left or right of it?
      // Actually, simpler: check the boundaries (cursor positions)
      // Cursor positions are at: char.x (Index i) and char.x + char.width (Index i+1)

      // Check "cursor at i" (Left of char i)
      const posAtI = char.x;
      const diffAtI = Math.abs(visualX - posAtI);
      if (diffAtI < minDiff) {
        minDiff = diffAtI;
        closestIndex = i;
      }

      // Check "cursor at i+1" (Right of char i / Left of char i+1)
      const posAtNext = char.x + char.width;
      const diffAtNext = Math.abs(visualX - posAtNext);
      if (diffAtNext < minDiff) {
        minDiff = diffAtNext;
        closestIndex = i + 1;
      }
    }

    return closestIndex;
  }
}
