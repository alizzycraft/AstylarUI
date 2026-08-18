import { Injectable } from '@angular/core';
import { Matrix, Mesh, PointerInfo, Vector3 } from '@babylonjs/core';
import { BabylonRender } from '../interfaces/render.types';
import { TextInteractionEntry, TextInteractionRegistryService } from './text-interaction-registry.service';
import { CssPoint, TextSelectionControllerService } from './text-selection-controller.service';

@Injectable({ providedIn: 'root' })
export class PointerInteractionService {
  constructor(
    private textInteractionRegistry: TextInteractionRegistryService,
    private textSelectionController: TextSelectionControllerService
  ) { }

  handlePointerDown(pointerInfo: PointerInfo, render: BabylonRender): void {
    if (!this.isPrimaryButton(pointerInfo)) {
      return;
    }

    const entry = this.resolveTextEntry(pointerInfo, render);
    if (!entry) {
      this.textSelectionController.clearSelection();
      return;
    }

    const cssPoint = this.toCssPoint(pointerInfo, entry) ?? { x: 0, y: 0 };
    this.textSelectionController.beginSelection(entry, cssPoint);
  }

  handlePointerMove(pointerInfo: PointerInfo, render: BabylonRender): void {
    this.updateCursor(pointerInfo, render);

    const isPointerDown = this.textSelectionController.snapshot.isPointerDown;

    if (!isPointerDown) {
      return;
    }

    const entry = this.resolveTextEntry(pointerInfo, render);
    if (!entry) {
      return;
    }

    const cssPoint = this.toCssPoint(pointerInfo, entry);
    if (!cssPoint) {
      return;
    }

    this.textSelectionController.updateSelection(entry, cssPoint);
  }

  private updateCursor(pointerInfo: PointerInfo, render: BabylonRender): void {
    const canvas = render.scene?.getEngine().getRenderingCanvas();
    if (!canvas) return;

    const mesh = this.resolvePreferredMesh(pointerInfo, render);

    if (mesh) {
      if (mesh.metadata?.isTextMesh) {
        canvas.style.cursor = 'text';
      } else if (mesh.metadata?.cursor) {
        canvas.style.cursor = mesh.metadata.cursor;
      } else {
        canvas.style.cursor = 'default';
      }
    } else {
      canvas.style.cursor = 'default';
    }
  }

  handlePointerUp(pointerInfo: PointerInfo, render: BabylonRender): void {
    if (!this.textSelectionController.snapshot.isPointerDown) {
      return;
    }

    const entry = this.resolveTextEntry(pointerInfo, render);
    if (entry) {
      const cssPoint = this.toCssPoint(pointerInfo, entry);
      if (cssPoint) {
        this.textSelectionController.updateSelection(entry, cssPoint);
      }
    }

    this.textSelectionController.finalizeSelection();
  }

  handlePointerOut(): void {
    if (!this.textSelectionController.snapshot.isPointerDown) {
      return;
    }

    this.textSelectionController.cancelSelection();
  }

  resolvePreferredMesh(pointerInfo: PointerInfo, render: BabylonRender): Mesh | undefined {
    const directMesh = pointerInfo.pickInfo?.pickedMesh as Mesh | undefined;
    if (directMesh) {
      const directTextEntry = this.textInteractionRegistry.getByMesh(directMesh);
      if (directTextEntry) {
        return directTextEntry.mesh;
      }
    }

    const scene = render.scene;
    const nativeEvent = pointerInfo.event as PointerEvent | MouseEvent | undefined;
    if (!scene || !nativeEvent || typeof nativeEvent.clientX !== 'number' || typeof nativeEvent.clientY !== 'number') {
      return directMesh;
    }

    const picks = scene.multiPick(nativeEvent.clientX, nativeEvent.clientY, (mesh) => !!mesh && mesh.isPickable);
    if (!picks?.length) {
      return directMesh;
    }

    for (const pick of picks) {
      const pickedMesh = pick.pickedMesh as Mesh | undefined;
      if (!pickedMesh) {
        continue;
      }

      // Check if this mesh is registered
      const entry = this.textInteractionRegistry.getByMesh(pickedMesh);
      if (entry) {
        return entry.mesh;
      }

      // Check if this is an input mesh that has a child text mesh
      if (pickedMesh.metadata?.textInput) {
        const textInput = pickedMesh.metadata.textInput;
        if (textInput.textMesh) {
          const entry = this.textInteractionRegistry.getByMesh(textInput.textMesh);
          if (entry) {
            return entry.mesh;
          }
        }
      }

      if (pickedMesh === directMesh) {
        break;
      }
    }

    return directMesh;
  }

  resolveTextEntry(pointerInfo: PointerInfo, render: BabylonRender): TextInteractionEntry | undefined {
    const mesh = this.resolvePreferredMesh(pointerInfo, render);
    if (!mesh) {
      return undefined;
    }
    return this.textInteractionRegistry.getByMesh(mesh);
  }

  private toCssPoint(pointerInfo: PointerInfo, entry: TextInteractionEntry): CssPoint | undefined {
    const metrics = entry.metrics;
    if (!metrics) {
      return undefined;
    }

    const pickInfo = pointerInfo.pickInfo;
    let pickedPoint = pickInfo?.pickedPoint;

    // If we don't have a picked point (common during drag), perform a manual ray cast
    if (!pickedPoint) {
      const scene = entry.mesh.getScene();
      const nativeEvent = pointerInfo.event as PointerEvent | MouseEvent | undefined;

      if (scene && nativeEvent && typeof nativeEvent.clientX === 'number' && typeof nativeEvent.clientY === 'number') {
        const ray = scene.createPickingRay(nativeEvent.clientX, nativeEvent.clientY, Matrix.Identity(), scene.activeCamera);
        const hit = ray.intersectsMesh(entry.mesh as any);

        if (hit.hit && hit.pickedPoint) {
          pickedPoint = hit.pickedPoint;
          console.log('[toCssPoint] Manual ray cast successful:', pickedPoint);
        } else {
          console.log('[toCssPoint] Manual ray cast failed');
          return undefined;
        }
      } else {
        console.log('[toCssPoint] Cannot perform manual ray cast - missing scene or event data');
        return undefined;
      }
    }

    const inverse = new Matrix();
    entry.mesh.getWorldMatrix().invertToRef(inverse);
    const localPoint = Vector3.TransformCoordinates(pickedPoint, inverse);

    const bounding = entry.mesh.getBoundingInfo();
    const width = bounding.maximum.x - bounding.minimum.x;
    const height = bounding.maximum.y - bounding.minimum.y;
    if (width === 0 || height === 0) {
      return undefined;
    }

    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Coordinate transformation to match text rendering coordinate system
    // With World X+ being Left and the text mesh rotated 180 degrees on Z,
    // the local X+ aligns with World Right (Visual Right).
    // So (local.x + halfWidth) / width correctly maps Visual Left to 0 and Visual Right to 1.
    const normalizedX = clamp((localPoint.x + halfWidth) / width, 0, 1);
    // Similarly, with 180 degree rotation, local Y+ aligns with World Down (Visual Down).
    // So (local.y + halfHeight) / height correctly maps Visual Top to 0 and Visual Bottom to 1.
    const normalizedY = clamp((localPoint.y + halfHeight) / height, 0, 1);

    const cssMetrics = entry.metrics?.css;
    const cssWidth = cssMetrics?.totalWidth ?? 0;
    const cssHeight = cssMetrics?.totalHeight ?? 0;

    // Map normalized coordinates (0-1 across visible mesh) to CSS coordinates
    // width is availableWidth (world), width/scale is availableWidth (CSS)
    const scale = metrics.scale ?? 1;
    const availableWidthCss = width / scale;
    const scrollOffset = entry.scrollOffset || 0;
    const availableHeightCss = height / scale;
    const scrollTop = entry.scrollTop || 0;
    const verticalOrigin = entry.verticalOrigin || 0;

    // x in CSS pixels = (normalized percentage of visible area * pixels in visible area) + scroll offset
    let x = (normalizedX * availableWidthCss) + scrollOffset;

    return {
      x,
      y: clamp((normalizedY * availableHeightCss) + scrollTop - verticalOrigin, 0, cssHeight)
    };
  }

  private isPrimaryButton(pointerInfo: PointerInfo): boolean {
    const nativeEvent = pointerInfo.event as PointerEvent | MouseEvent | undefined;
    if (!nativeEvent || typeof nativeEvent.button !== 'number') {
      return true;
    }
    return nativeEvent.button === 0;
  }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
