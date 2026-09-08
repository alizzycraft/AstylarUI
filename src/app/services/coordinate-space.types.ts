/** A point in CSS pixel space: origin at the top-left, +X right, +Y down. */
export interface CssPoint {
  readonly x: number;
  readonly y: number;
}

/** A size in CSS pixels. Fractional values are retained until rasterization. */
export interface CssSize {
  readonly width: number;
  readonly height: number;
}

/** A rectangle in CSS pixel space. */
export interface CssRect extends CssPoint, CssSize {}

/** CSS box-edge values in CSS pixels. */
export interface CssInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** Retained CSS geometry for one laid-out element. */
export interface CssLayoutBox {
  readonly borderBox: CssRect;
  readonly padding: CssInsets;
  readonly contentBox: CssRect;
  readonly margin: CssInsets;
}

/**
 * One retained layout node. The box is expressed in its parent's CSS border-box
 * coordinate system; the root node is expressed in viewport CSS coordinates.
 */
export interface CssLayoutNode {
  readonly parentId: string | null;
  readonly box: CssLayoutBox;
}

/** A point at the Babylon rendering boundary, expressed in world units. */
export interface RenderPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** A size at the Babylon rendering boundary, expressed in world units. */
export interface RenderSize {
  readonly width: number;
  readonly height: number;
}

/** The render-boundary representation of one CSS rectangle. */
export interface ProjectedCssRect {
  readonly center: RenderPoint;
  readonly size: RenderSize;
}
