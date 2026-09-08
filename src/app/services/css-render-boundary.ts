import { Mesh } from '@babylonjs/core';
import { CssPoint, CssRect, CssSize, RenderSize } from './coordinate-space.types';
import { cssLocalCenter } from './css-layout-geometry';
import { BabylonRender } from './dom/interfaces/render.types';

/**
 * Final paint-boundary helpers. Callers supply fully resolved CSS geometry;
 * only these helpers project it into Babylon-local coordinates.
 */
export function projectCssLength(render: BabylonRender, value: number): number {
  return render.actions.camera.projectCssSize({ width: value, height: value }).width;
}

export function projectCssSize(render: BabylonRender, size: CssSize): RenderSize {
  return render.actions.camera.projectCssSize(size);
}

export function projectCssPoint(
  render: BabylonRender,
  point: CssPoint,
  renderDepth = 0,
) {
  return render.actions.camera.projectCssLocalPoint(point, renderDepth);
}

export function positionRenderedCssBox(
  render: BabylonRender,
  mesh: Mesh,
  borderBox: CssRect,
  containingBlockSize: CssSize,
  renderDepth = mesh.position.z,
): void {
  const center = projectCssPoint(
    render,
    cssLocalCenter(borderBox, containingBlockSize),
    renderDepth,
  );
  render.actions.mesh.positionTextMesh(mesh, center.x, center.y, center.z);
}

