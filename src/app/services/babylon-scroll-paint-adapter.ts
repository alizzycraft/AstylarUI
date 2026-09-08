import {
  Color3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  type Scene,
} from '@babylonjs/core';
import type {
  AstylarScrollPaintAdapter,
  AstylarScrollbarPaint,
} from '../../lib/astylar-scroll-runtime';
import type { CssPoint, CssRect, CssSize } from './coordinate-space.types';
import type { CameraActions } from './dom/interfaces/render.types';
import { cssLocalCenter } from './css-layout-geometry';

/** Babylon implementation of the final paint boundary for CSS scrolling. */
export class BabylonScrollPaintAdapter implements AstylarScrollPaintAdapter {
  constructor(private readonly camera: CameraActions) {}

  positionContent(
    mesh: Mesh,
    borderBox: CssRect,
    containerSize: CssSize,
    scrollOffset: CssPoint,
  ): void {
    const scrolledBox = {
      ...borderBox,
      x: borderBox.x - scrollOffset.x,
      y: borderBox.y - scrollOffset.y,
    };
    const position = this.camera.projectCssLocalPoint(
      cssLocalCenter(scrolledBox, containerSize),
      mesh.position.z,
    );
    mesh.position.set(position.x, position.y, position.z);
    mesh.computeWorldMatrix(true);
  }

  createScrollbar(
    container: Mesh,
    containerId: string,
    axis: 'horizontal' | 'vertical',
    trackBox: CssRect,
    thumbBox: CssRect,
    containerSize: CssSize,
  ): AstylarScrollbarPaint {
    const scene = container.getScene();
    const vertical = axis === 'vertical';
    const suffix = vertical ? '' : '-horizontal';
    const track = this.createPlane(
      `astylar-scrollbar-track-${containerId}${suffix}`,
      trackBox,
      containerSize,
      0.01,
      scene,
    );
    const thumb = this.createPlane(
      `astylar-scrollbar-thumb-${containerId}${suffix}`,
      thumbBox,
      containerSize,
      0.02,
      scene,
    );
    track.parent = container;
    thumb.parent = container;
    track.isPickable = false;
    thumb.isPickable = false;
    track.renderingGroupId = container.renderingGroupId;
    thumb.renderingGroupId = container.renderingGroupId;
    track.material = this.createMaterial(
      `astylar-scrollbar-track-material-${containerId}${suffix}`,
      '#f1eff1',
      scene,
    );
    thumb.material = this.createMaterial(
      `astylar-scrollbar-thumb-material-${containerId}${suffix}`,
      '#8b878d',
      scene,
    );
    return { track, thumb, axis };
  }

  positionScrollbarThumb(
    visual: AstylarScrollbarPaint,
    thumbBox: CssRect,
    containerSize: CssSize,
  ): void {
    const center = this.camera.projectCssLocalPoint(
      cssLocalCenter(thumbBox, containerSize),
      visual.thumb.position.z,
    );
    visual.thumb.position.set(center.x, center.y, center.z);
    visual.thumb.computeWorldMatrix(true);
  }

  disposeScrollbar(visual: AstylarScrollbarPaint): void {
    if (!visual.track.isDisposed()) visual.track.dispose(false, true);
    if (!visual.thumb.isDisposed()) visual.thumb.dispose(false, true);
  }

  private createPlane(
    name: string,
    box: CssRect,
    containerSize: CssSize,
    depth: number,
    scene: Scene,
  ): Mesh {
    const size = this.camera.projectCssSize(box);
    const mesh = MeshBuilder.CreatePlane(name, size, scene);
    const center = this.camera.projectCssLocalPoint(
      cssLocalCenter(box, containerSize),
      depth,
    );
    mesh.position.set(center.x, center.y, center.z);
    return mesh;
  }

  private createMaterial(name: string, color: string, scene: Scene): StandardMaterial {
    const material = new StandardMaterial(name, scene);
    const parsed = Color3.FromHexString(color);
    material.diffuseColor = parsed;
    material.emissiveColor = parsed;
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.disableDepthWrite = true;
    material.backFaceCulling = false;
    return material;
  }
}
