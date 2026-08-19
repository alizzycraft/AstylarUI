import { Injectable } from '@angular/core';
import { Scene, FreeCamera, Vector3 } from '@babylonjs/core';

@Injectable({
  providedIn: 'root'
})
export class BabylonCameraService {
  private camera?: FreeCamera;
  private dprLogTimer?: ReturnType<typeof setTimeout>;

  constructor() { }

  initialize(scene: Scene, canvas: HTMLCanvasElement): FreeCamera {
    const fov = this.getFOV(); // 60 degrees, or your preferred value

    // Set camera distance so visible world height == cssHeight
    const cameraDistance = (canvas.height) / Math.tan(fov / 2);

    this.camera = new FreeCamera('camera', new Vector3(0, 0, cameraDistance), scene);
    this.camera.fov = fov;
    // Astylar content occupies a shallow band around the page plane. Keeping
    // Babylon's broad default clip range wastes depth-buffer precision and can
    // make closely layered parent/child surfaces z-fight at tall viewports.
    // One viewport height on either side of the page still leaves ample room
    // for authored stacking while keeping ordinary DOM paint layers stable.
    const clipRange = this.calculateUiClipRange(cameraDistance, canvas.height);
    this.camera.minZ = clipRange.minZ;
    this.camera.maxZ = clipRange.maxZ;
    this.camera.setTarget(Vector3.Zero());
    this.camera.attachControl(canvas, true);
    this.camera.inputs.clear();

    // Log for debugging
    console.log(`[DPR] Camera initialized for DPR-aware FOV: cssHeight=${canvas.height}, fov=${(fov * 180 / Math.PI).toFixed(1)}, cameraDistance=${cameraDistance}`);

    if (this.dprLogTimer) clearTimeout(this.dprLogTimer);
    this.dprLogTimer = setTimeout(() => {
      this.dprLogTimer = undefined;
      if (this.camera) this.logDprInfo();
    }, 100);

    return this.camera;
  }

  getCamera(): FreeCamera | undefined {
    return this.camera;
  }

  getFOV(): number {
    return Math.PI / 3;
  }

  private calculateUiClipRange(
    cameraDistance: number,
    viewportHeight: number
  ): { minZ: number; maxZ: number } {
    return {
      minZ: Math.max(0.1, cameraDistance - viewportHeight),
      maxZ: cameraDistance + viewportHeight
    };
  }

  /**
   * Calculate the dimensions of the viewport in world units
   * This method accounts for the device pixel ratio to ensure consistent sizing
   * across different screen densities
   */
  calculateViewportDimensions(): { width: number; height: number } {
    if (!this.camera) {
      throw new Error('Camera not initialized');
    }
    const cameraDistance = Math.abs(this.camera.position.z);
    const fov = this.getFOV();

    // Calculate visible height in world units: height = 2 * distance * tan(fov/2)
    // This is the physical height of the "frustum" at the target distance
    const visibleHeight = 2 * cameraDistance * Math.tan(fov / 2);

    const scene = this.camera.getScene();
    const canvas = scene.getEngine().getRenderingCanvas();

    if (!canvas) {
      throw new Error("no canvas.");
    }

    // Use actual canvas pixel dimensions for aspect ratio
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const aspectRatio = canvasWidth / canvasHeight;

    const visibleWidth = visibleHeight * aspectRatio;

    return { width: visibleWidth, height: visibleHeight };
  }

  getPixelToWorldScale(): number {
    if (!this.camera) {
      throw new Error('Camera not initialized');
    }

    const scene = this.camera.getScene();
    const canvas = scene.getEngine().getRenderingCanvas();

    if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
      // Fallback for initialization phase
      const { height: worldHeight } = this.calculateViewportDimensions();
      return worldHeight / 1080; // Assuming 1080p fallback
    }

    // Get canvas height in CSS pixels (logical pixels)
    const cssHeight = canvas.clientHeight;

    // Calculate viewport dimensions in world units
    const { height: worldHeight } = this.calculateViewportDimensions();

    // Calculate how many world units per CSS pixel
    // This ensures 1 CSS pixel maps to a consistent physical size regardless of DPR
    return worldHeight / cssHeight;
  }

  /**
   * Converts a percentage value to world units based on a container size in CSS pixels
   * This ensures consistent percentage calculations across different DPR values
   * 
   * @param percentage The percentage value (0-100)
   * @param containerSizeInCssPixels The container size in CSS pixels
   * @returns The equivalent size in world units
   */
  percentageToWorldUnits(percentage: number, containerSizeInCssPixels: number): number {
    // Calculate the size in CSS pixels
    const sizeInCssPixels = (percentage / 100) * containerSizeInCssPixels;

    // Convert CSS pixels to world units
    const worldUnits = this.cssPixelsToWorldUnits(sizeInCssPixels);

    console.log(`[DPR] Percentage to world units: ${percentage}% of ${containerSizeInCssPixels}px = ${sizeInCssPixels}px = ${worldUnits.toFixed(6)} world units`);

    return worldUnits;
  }

  /**
   * Snap world coordinates to pixel boundaries for sharp rendering
   * This prevents sub-pixel positioning that causes anti-aliasing
   * 
   * This method converts world coordinates to CSS pixels, rounds to the nearest pixel,
   * and then converts back to world coordinates. This ensures that elements are positioned
   * on exact pixel boundaries for sharp rendering.
   */
  snapToPixelBoundary(worldPosition: { x: number; y: number; z?: number }): { x: number; y: number; z: number } {
    const scale = this.getPixelToWorldScale();

    // Convert to CSS pixels, round to integers, convert back to world units
    const pixelX = Math.round(worldPosition.x / scale);
    const pixelY = Math.round(worldPosition.y / scale);

    const snappedX = pixelX * scale;
    const snappedY = pixelY * scale;

    // Enhanced logging for DPR debugging
    console.log(`[DPR] Snapping to pixel boundary:
      - Original world position: (${worldPosition.x.toFixed(6)}, ${worldPosition.y.toFixed(6)})
      - CSS pixel position: (${pixelX}, ${pixelY})
      - Snapped world position: (${snappedX.toFixed(6)}, ${snappedY.toFixed(6)})
      - Difference: (${(snappedX - worldPosition.x).toFixed(6)}, ${(snappedY - worldPosition.y).toFixed(6)})
    `);

    return {
      x: snappedX,
      y: snappedY,
      z: worldPosition.z || 0
    };
  }

  /**
   * Snap border width to pixel boundaries for consistent rendering
   * This is the single source of truth for border width calculations
   * 
   * This method converts a border width in world units to CSS pixels, ensures it's at least 1 pixel,
   * and then converts back to world units. This ensures that borders are always at least 1 CSS pixel
   * wide and are aligned to pixel boundaries for sharp rendering.
   */
  snapBorderWidthToPixel(borderWidth: number): number {
    const scale = this.getPixelToWorldScale();

    // Convert to CSS pixels, ensure minimum 1 pixel, convert back to world units
    const cssPixelWidth = borderWidth / scale;
    const roundedCssPixelWidth = Math.max(1, Math.round(cssPixelWidth)); // Minimum 1 CSS pixel
    const snappedWidth = roundedCssPixelWidth * scale;

    // Enhanced logging for DPR debugging
    console.log(`[DPR] Snapping border width to pixel boundary:
      - Original border width: ${borderWidth.toFixed(6)} world units
      - CSS pixel width: ${cssPixelWidth.toFixed(2)} CSS pixels
      - Rounded CSS pixel width: ${roundedCssPixelWidth} CSS pixels
      - Snapped border width: ${snappedWidth.toFixed(6)} world units
      - Scale factor: ${scale.toFixed(6)} world units per CSS pixel
    `);

    return snappedWidth;
  }

  /**
   * Calculate all border dimensions and positions in one unified operation
   * This ensures complete consistency across all border calculations
   * 
   * This method handles the complex calculations needed for border positioning and sizing,
   * ensuring that all borders are properly aligned to pixel boundaries for sharp rendering.
   * It accounts for DPR by using the snapToPixelBoundary and snapBorderWidthToPixel methods.
   */
  calculateUnifiedBorderLayout(
    centerX: number,
    centerY: number,
    centerZ: number,
    elementWidth: number,
    elementHeight: number,
    borderWidth: number
  ): {
    snappedBorderWidth: number;
    elementBounds: { left: number; right: number; top: number; bottom: number };
    borderPositions: {
      top: { x: number; y: number; z: number };
      bottom: { x: number; y: number; z: number };
      left: { x: number; y: number; z: number };
      right: { x: number; y: number; z: number };
    };
    borderDimensions: {
      horizontal: { width: number; height: number }; // top & bottom borders
      vertical: { width: number; height: number };   // left & right borders
    };
  } {
    const scale = this.getPixelToWorldScale();

    // Log input values for debugging
    console.log(`[DPR] calculateUnifiedBorderLayout input:
      - centerX: ${centerX.toFixed(6)} world units (${this.worldUnitsToCssPixels(centerX).toFixed(2)} CSS pixels)
      - centerY: ${centerY.toFixed(6)} world units (${this.worldUnitsToCssPixels(centerY).toFixed(2)} CSS pixels)
      - elementWidth: ${elementWidth.toFixed(6)} world units (${this.worldUnitsToCssPixels(elementWidth).toFixed(2)} CSS pixels)
      - elementHeight: ${elementHeight.toFixed(6)} world units (${this.worldUnitsToCssPixels(elementHeight).toFixed(2)} CSS pixels)
      - borderWidth: ${borderWidth.toFixed(6)} world units (${this.worldUnitsToCssPixels(borderWidth).toFixed(2)} CSS pixels)
      - Scale: ${scale.toFixed(6)} world units per CSS pixel
    `);

    // Single calculation of snapped border width - used everywhere
    const snappedBorderWidth = this.snapBorderWidthToPixel(borderWidth);

    // Snap the element center to pixel boundaries
    const snappedCenter = this.snapToPixelBoundary({ x: centerX, y: centerY, z: centerZ });

    // Calculate element boundaries using snapped coordinates
    const elementBounds = {
      left: snappedCenter.x - (elementWidth / 2),
      right: snappedCenter.x + (elementWidth / 2),
      top: snappedCenter.y + (elementHeight / 2),
      bottom: snappedCenter.y - (elementHeight / 2)
    };

    // Border Z position - significantly in front of the main element
    const borderZ = centerZ + 0.01; // Much larger offset to ensure visibility and avoid Z-fighting

    // Calculate border positions - borders "grow inward" with outer edge aligned to element edge
    const borderPositions = {
      // Top border: positioned so its bottom edge aligns with element's top edge
      top: this.snapToPixelBoundary({
        x: snappedCenter.x,
        y: elementBounds.top - (snappedBorderWidth / 2),
        z: borderZ
      }),

      // Bottom border: positioned so its top edge aligns with element's bottom edge
      bottom: this.snapToPixelBoundary({
        x: snappedCenter.x,
        y: elementBounds.bottom + (snappedBorderWidth / 2),
        z: borderZ
      }),

      // Left border: positioned so its right edge aligns with element's left edge
      left: this.snapToPixelBoundary({
        x: elementBounds.left + (snappedBorderWidth / 2),
        y: snappedCenter.y,
        z: borderZ
      }),

      // Right border: positioned so its left edge aligns with element's right edge
      right: this.snapToPixelBoundary({
        x: elementBounds.right - (snappedBorderWidth / 2),
        y: snappedCenter.y,
        z: borderZ
      })
    };

    // Calculate border mesh dimensions - borders grow inward and fit within element boundaries
    const borderDimensions = {
      // Horizontal borders (top & bottom) reduced by border width to fit perfectly between vertical borders
      horizontal: {
        width: elementWidth - snappedBorderWidth,
        height: snappedBorderWidth
      },
      // Vertical borders (left & right) span element height minus border thickness to avoid corner overlap
      vertical: {
        width: snappedBorderWidth,
        height: elementHeight - (snappedBorderWidth * 2)
      }
    };

    // Log output values for debugging
    console.log(`[DPR] calculateUnifiedBorderLayout output:
      - snappedBorderWidth: ${snappedBorderWidth.toFixed(6)} world units (${this.worldUnitsToCssPixels(snappedBorderWidth).toFixed(2)} CSS pixels)
      - snappedCenter: (${snappedCenter.x.toFixed(6)}, ${snappedCenter.y.toFixed(6)}) world units
      - elementBounds: left=${elementBounds.left.toFixed(6)}, right=${elementBounds.right.toFixed(6)}, top=${elementBounds.top.toFixed(6)}, bottom=${elementBounds.bottom.toFixed(6)} world units
      - borderPositions: 
          top=(${borderPositions.top.x.toFixed(6)}, ${borderPositions.top.y.toFixed(6)})
          bottom=(${borderPositions.bottom.x.toFixed(6)}, ${borderPositions.bottom.y.toFixed(6)})
          left=(${borderPositions.left.x.toFixed(6)}, ${borderPositions.left.y.toFixed(6)})
          right=(${borderPositions.right.x.toFixed(6)}, ${borderPositions.right.y.toFixed(6)})
      - borderDimensions:
          horizontal: width=${borderDimensions.horizontal.width.toFixed(6)}, height=${borderDimensions.horizontal.height.toFixed(6)} world units
          vertical: width=${borderDimensions.vertical.width.toFixed(6)}, height=${borderDimensions.vertical.height.toFixed(6)} world units
    `);

    return {
      snappedBorderWidth,
      elementBounds,
      borderPositions,
      borderDimensions
    };
  }

  // Device pixel conversion methods removed as they're not needed in our workflow
  // We only care about CSS pixels and world units

  /**
   * Converts CSS pixels to world units based on the current camera setup
   * This is the primary method for converting from CSS pixels to world units
   * 
   * @param cssPixels The number of CSS pixels to convert
   * @returns The equivalent number of world units
   */
  cssPixelsToWorldUnits(cssPixels: number): number {
    const pixelToWorldScale = this.getPixelToWorldScale();
    const worldUnits = cssPixels * pixelToWorldScale;

    console.log(`[DPR] Converting ${cssPixels.toFixed(2)} CSS pixels to ${worldUnits.toFixed(6)} world units (scale: ${pixelToWorldScale.toFixed(6)})`);

    return worldUnits;
  }

  /**
   * Converts a container size in CSS pixels to world units, accounting for DPR
   * This is useful for ensuring consistent container sizing across different DPR values
   * 
   * @param containerSizeInCssPixels The container size in CSS pixels
   * @returns The equivalent size in world units
   */
  containerSizeToWorldUnits(containerSizeInCssPixels: number): number {
    // For container sizes, we need to ensure they're consistent across different DPR values
    const worldUnits = this.cssPixelsToWorldUnits(containerSizeInCssPixels);

    console.log(`[DPR] Container size conversion: ${containerSizeInCssPixels.toFixed(2)} CSS pixels = ${worldUnits.toFixed(6)} world units`);

    return worldUnits;
  }

  /**
   * Converts world units to CSS pixels based on the current camera setup
   * This is useful for debugging and understanding the relationship between world units and CSS pixels
   * 
   * @param worldUnits The number of world units to convert
   * @returns The equivalent number of CSS pixels
   */
  worldUnitsToCssPixels(worldUnits: number): number {
    const pixelToWorldScale = this.getPixelToWorldScale();
    const cssPixels = worldUnits / pixelToWorldScale;

    console.log(`[DPR] Converting ${worldUnits.toFixed(6)} world units to ${cssPixels.toFixed(2)} CSS pixels (scale: ${pixelToWorldScale.toFixed(6)})`);

    return cssPixels;
  }

  /**
   * Logs detailed information about the current DPR setup
   * This is useful for debugging DPR-related issues
   */
  logDprInfo(): void {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const pixelToWorldScale = this.getPixelToWorldScale();

    console.log(`[DPR] Detailed DPR Information:
      - Device Pixel Ratio: ${devicePixelRatio}
      - Pixel to World Scale: ${pixelToWorldScale.toFixed(6)} world units per CSS pixel
      - 1 CSS pixel = ${pixelToWorldScale.toFixed(6)} world units
      - 1 world unit = ${(1 / pixelToWorldScale).toFixed(2)} CSS pixels
    `);

    // Example conversions for common values
    console.log(`[DPR] Example conversions:
      - 100 CSS pixels = ${this.cssPixelsToWorldUnits(100).toFixed(6)} world units
      - 1 world unit = ${this.worldUnitsToCssPixels(1).toFixed(2)} CSS pixels
    `);

    // Log viewport and canvas information
    if (this.camera) {
      const scene = this.camera.getScene();
      const canvas = scene.getEngine().getRenderingCanvas();

      if (canvas) {
        console.log(`[DPR] Canvas information:
          - canvas.width: ${canvas.width}px (device pixels)
          - canvas.height: ${canvas.height}px (device pixels)
          - CSS canvas width: ${(canvas.width / devicePixelRatio).toFixed(2)}px
          - CSS canvas height: ${(canvas.height / devicePixelRatio).toFixed(2)}px
          - canvas.style.width: ${canvas.style.width || 'not set'}
          - canvas.style.height: ${canvas.style.height || 'not set'}
        `);
      }
    }
  }

  cleanup(): void {
    if (this.dprLogTimer) {
      clearTimeout(this.dprLogTimer);
      this.dprLogTimer = undefined;
    }
    this.camera?.dispose();
    this.camera = undefined;
  }
}
