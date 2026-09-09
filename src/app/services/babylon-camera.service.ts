import { Injectable } from '@angular/core';
import { Camera, Scene, FreeCamera, Vector3 } from '@babylonjs/core';
import {
  CssPoint,
  CssSize,
  RenderPoint,
  RenderSize,
} from './coordinate-space.types';
import { CssBabylonProjection } from './css-babylon-projection';

@Injectable({
  providedIn: 'root'
})
export class BabylonCameraService {
  private camera?: FreeCamera;

  constructor() { }

  initialize(scene: Scene, canvas: HTMLCanvasElement): FreeCamera {
    const fov = this.getFOV(); // 60 degrees, or your preferred value
    const cssHeight = canvas.clientHeight || canvas.height;

    // Keep one world unit equal to one CSS pixel. The backing-store dimensions
    // may be multiplied by DPR, but they are a raster concern and must not
    // change the coordinate space used to project resolved CSS geometry.
    const cameraDistance = cssHeight / (2 * Math.tan(fov / 2));

    this.camera = new FreeCamera('camera', new Vector3(0, 0, cameraDistance), scene);
    this.camera.fov = fov;
    // DOM layout is planar: z-index changes paint order, not an element's
    // apparent x/y position or size. A perspective projection made high
    // z-index overlays grow toward the camera and move beyond the viewport.
    // Keep depth testing for paint order while projecting the UI orthographically.
    this.updateViewport(canvas);
    // Astylar content occupies a shallow band around the page plane. Keeping
    // Babylon's broad default clip range wastes depth-buffer precision and can
    // make closely layered parent/child surfaces z-fight at tall viewports.
    // One viewport height on either side of the page still leaves ample room
    // for authored stacking while keeping ordinary DOM paint layers stable.
    const clipRange = this.calculateUiClipRange(cameraDistance, cssHeight);
    this.camera.minZ = clipRange.minZ;
    this.camera.maxZ = clipRange.maxZ;
    this.camera.setTarget(Vector3.Zero());
    this.camera.attachControl(canvas, true);
    this.camera.inputs.clear();

    return this.camera;
  }

  getCamera(): FreeCamera | undefined {
    return this.camera;
  }

  updateViewport(canvas: HTMLCanvasElement): void {
    const cssWidth = canvas.clientWidth || canvas.width;
    const cssHeight = canvas.clientHeight || canvas.height;
    if (!this.camera || cssWidth <= 0 || cssHeight <= 0) return;

    // The camera is the final CSS-to-Babylon paint boundary. Its orthographic
    // bounds therefore describe the CSS viewport directly; DPR only controls
    // how many backing-store pixels Babylon uses to rasterize that viewport.
    const visibleWidth = cssWidth;
    const visibleHeight = cssHeight;
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    this.camera.orthoLeft = -visibleWidth / 2;
    this.camera.orthoRight = visibleWidth / 2;
    this.camera.orthoTop = visibleHeight / 2;
    this.camera.orthoBottom = -visibleHeight / 2;
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
    if (this.camera.mode === Camera.ORTHOGRAPHIC_CAMERA &&
        this.camera.orthoLeft !== null && this.camera.orthoRight !== null &&
        this.camera.orthoTop !== null && this.camera.orthoBottom !== null) {
      return {
        width: this.camera.orthoRight - this.camera.orthoLeft,
        height: this.camera.orthoTop - this.camera.orthoBottom,
      };
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

  private getPixelToWorldScale(): number {
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

  /** Project viewport-relative CSS pixels into Babylon world coordinates. */
  projectCssViewportPoint(point: CssPoint, renderDepth = 0): RenderPoint {
    return this.getCssProjection().projectViewportPoint(point, renderDepth);
  }

  /** Project element-local CSS pixels into Babylon world coordinates. */
  projectCssLocalPoint(point: CssPoint, renderDepth = 0): RenderPoint {
    return this.getCssProjection().projectLocalPoint(point, renderDepth);
  }

  /** Convert Babylon world coordinates back to element-local CSS pixels. */
  unprojectRenderLocalPoint(point: RenderPoint): CssPoint {
    return this.getCssProjection().unprojectLocalPoint(point);
  }

  /** Project a CSS pixel size without applying a position or axis translation. */
  projectCssSize(size: CssSize): RenderSize {
    return this.getCssProjection().projectSize(size);
  }

  /** Project one CSS length at the final paint boundary. */
  projectCssLength(cssPixels: number): number {
    return this.getCssProjection().projectSize({ width: cssPixels, height: 0 }).width;
  }

  private getCssProjection(): CssBabylonProjection {
    if (!this.camera) {
      throw new Error('Camera not initialized');
    }
    const canvas = this.camera.getScene().getEngine().getRenderingCanvas();
    if (!canvas) {
      throw new Error('No rendering canvas is available.');
    }
    const scale = this.getPixelToWorldScale();
    return new CssBabylonProjection({
      width: canvas.clientWidth || this.calculateViewportDimensions().width / scale,
      height: canvas.clientHeight || this.calculateViewportDimensions().height / scale,
    }, scale);
  }

  cleanup(): void {
    this.camera?.dispose();
    this.camera = undefined;
  }
}
