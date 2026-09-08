import {
  CssPoint,
  CssRect,
  CssSize,
  ProjectedCssRect,
  RenderPoint,
  RenderSize,
} from './coordinate-space.types';

/**
 * The authoritative, pure conversion between CSS geometry and Babylon world
 * geometry. Layout code must not reproduce these axis or scale rules.
 *
 * The projection assumes Babylon's right-handed scene with the camera at
 * positive Z, so world +X is screen-right and world +Y is screen-up. Render
 * depth is deliberately supplied by the paint/stacking boundary rather than
 * being represented as a CSS coordinate.
 */
export class CssBabylonProjection {
  constructor(
    readonly viewport: CssSize,
    readonly worldUnitsPerCssPixel: number,
  ) {
    if (viewport.width < 0 || viewport.height < 0) {
      throw new RangeError('CSS viewport dimensions cannot be negative.');
    }
    if (!Number.isFinite(worldUnitsPerCssPixel) || worldUnitsPerCssPixel <= 0) {
      throw new RangeError('World units per CSS pixel must be positive and finite.');
    }
  }

  projectViewportPoint(point: CssPoint, renderDepth = 0): RenderPoint {
    return {
      x: (point.x - this.viewport.width / 2) * this.worldUnitsPerCssPixel,
      y: (this.viewport.height / 2 - point.y) * this.worldUnitsPerCssPixel,
      z: renderDepth,
    };
  }

  unprojectViewportPoint(point: RenderPoint): CssPoint {
    return {
      x: point.x / this.worldUnitsPerCssPixel + this.viewport.width / 2,
      y: this.viewport.height / 2 - point.y / this.worldUnitsPerCssPixel,
    };
  }

  projectLocalPoint(point: CssPoint, renderDepth = 0): RenderPoint {
    return {
      x: point.x * this.worldUnitsPerCssPixel,
      y: -point.y * this.worldUnitsPerCssPixel,
      z: renderDepth,
    };
  }

  unprojectLocalPoint(point: RenderPoint): CssPoint {
    return {
      x: point.x / this.worldUnitsPerCssPixel,
      y: -point.y / this.worldUnitsPerCssPixel,
    };
  }

  projectSize(size: CssSize): RenderSize {
    return {
      width: size.width * this.worldUnitsPerCssPixel,
      height: size.height * this.worldUnitsPerCssPixel,
    };
  }

  projectRect(rect: CssRect, renderDepth = 0): ProjectedCssRect {
    return {
      center: this.projectViewportPoint({
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      }, renderDepth),
      size: this.projectSize(rect),
    };
  }
}
