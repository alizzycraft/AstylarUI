import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { StyleRule } from '../../../types/style-rule';

interface ClipBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const CLIP_BOUNDS_METADATA = 'astylarOverflowClipBounds';

@Injectable({ providedIn: 'root' })
export class OverflowClipService {
  apply(parent: BABYLON.Mesh, style: StyleRule): void {
    if (style.overflow !== 'hidden' && style.overflow !== 'clip' &&
        style.overflow !== 'auto' && style.overflow !== 'scroll') {
      return;
    }

    parent.computeWorldMatrix(true);
    const box = parent.getBoundingInfo().boundingBox;
    const parentBounds: ClipBounds = {
      minX: box.minimumWorld.x,
      maxX: box.maximumWorld.x,
      minY: box.minimumWorld.y,
      maxY: box.maximumWorld.y,
    };

    for (const descendant of parent.getChildMeshes(false)) {
      const metadata = descendant.metadata ?? {};
      const inherited = metadata[CLIP_BOUNDS_METADATA] as ClipBounds | undefined;
      const bounds = inherited ? this.intersect(inherited, parentBounds) : parentBounds;
      descendant.metadata = { ...metadata, [CLIP_BOUNDS_METADATA]: bounds };
      this.applyPlanes(descendant.material, bounds);
    }
  }

  private intersect(first: ClipBounds, second: ClipBounds): ClipBounds {
    return {
      minX: Math.max(first.minX, second.minX),
      maxX: Math.min(first.maxX, second.maxX),
      minY: Math.max(first.minY, second.minY),
      maxY: Math.min(first.maxY, second.maxY),
    };
  }

  private applyPlanes(material: BABYLON.Nullable<BABYLON.Material>, bounds: ClipBounds): void {
    if (!material) {
      return;
    }

    material.clipPlane = new BABYLON.Plane(-1, 0, 0, bounds.minX);
    material.clipPlane2 = new BABYLON.Plane(1, 0, 0, -bounds.maxX);
    material.clipPlane3 = new BABYLON.Plane(0, -1, 0, bounds.minY);
    material.clipPlane4 = new BABYLON.Plane(0, 1, 0, -bounds.maxY);
  }
}
