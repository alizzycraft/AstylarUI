import { Injectable } from '@angular/core';
import { Matrix, Mesh, Plane, PointerInfo, Vector3 } from '@babylonjs/core';
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

    this.updateCursor(pointerInfo, render);
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

    const entry = this.resolveActiveTextEntry();
    if (!entry) {
      return;
    }

    const cssPoint = this.toCssPoint(pointerInfo, entry, false);
    if (!cssPoint) {
      return;
    }

    this.textSelectionController.updateSelection(entry, cssPoint);
  }

  /**
   * Re-resolve the cursor after reconciliation replaces the mesh currently
   * beneath a stationary pointer. Babylon does not emit another pointer-move
   * merely because the picked scene object changed.
   */
  refreshCursor(render: BabylonRender): void {
    const scene = render.scene;
    const canvas = scene?.getEngine().getRenderingCanvas();
    if (!scene || !canvas) return;

    if (typeof canvas.matches === 'function' && !canvas.matches(':hover')) {
      canvas.style.cursor = 'default';
      return;
    }

    const pointerX = scene.pointerX;
    const pointerY = scene.pointerY;
    if (!Number.isFinite(pointerX) || !Number.isFinite(pointerY)) return;
    if ((canvas.clientWidth > 0 && (pointerX < 0 || pointerX > canvas.clientWidth)) ||
        (canvas.clientHeight > 0 && (pointerY < 0 || pointerY > canvas.clientHeight))) {
      canvas.style.cursor = 'default';
      return;
    }

    this.updateCursor(
      { pickInfo: scene.pick(pointerX, pointerY) } as PointerInfo,
      render,
    );
  }

  private updateCursor(pointerInfo: PointerInfo, render: BabylonRender): void {
    const canvas = render.scene?.getEngine().getRenderingCanvas();
    if (!canvas) return;

    const mesh = this.resolvePreferredMesh(pointerInfo, render);

    if (mesh) {
      const cursor = mesh.metadata?.cursor;
      if (cursor && cursor !== 'auto' && cursor !== 'default') {
        canvas.style.cursor = cursor;
      } else if (mesh.metadata?.isTextMesh) {
        canvas.style.cursor = 'text';
      } else if (cursor) {
        canvas.style.cursor = cursor;
      } else {
        canvas.style.cursor = 'default';
      }
    } else {
      canvas.style.cursor = 'default';
    }
  }

  handlePointerUp(pointerInfo: PointerInfo, render: BabylonRender): void {
    this.updateCursor(pointerInfo, render);
    if (!this.textSelectionController.snapshot.isPointerDown) {
      return;
    }

    const entry = this.resolveActiveTextEntry();
    if (entry) {
      const cssPoint = this.toCssPoint(pointerInfo, entry, false);
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
      const directElementId = directMesh.metadata?.elementId;
      const ownedTextEntry = typeof directElementId === 'string'
        ? this.textInteractionRegistry.getByElementId(directElementId)
        : undefined;
      if (ownedTextEntry) {
        return ownedTextEntry.mesh;
      }
    }

    const scene = render.scene;
    const nativeEvent = pointerInfo.event as PointerEvent | MouseEvent | undefined;
    if (!scene || !nativeEvent || typeof nativeEvent.clientX !== 'number' || typeof nativeEvent.clientY !== 'number') {
      return directMesh;
    }

    const pickX = Number.isFinite(scene.pointerX) ? scene.pointerX : nativeEvent.clientX;
    const pickY = Number.isFinite(scene.pointerY) ? scene.pointerY : nativeEvent.clientY;
    const picks = scene.multiPick(pickX, pickY, (mesh) => !!mesh && mesh.isPickable);
    if (!picks?.length) {
      return directMesh;
    }

    const orderedPicks = [...picks].sort((left, right) => left.distance - right.distance);
    for (const pick of orderedPicks) {
      const pickedMesh = pick.pickedMesh as Mesh | undefined;
      if (!pickedMesh) {
        continue;
      }

      // Check if this mesh is registered
      const entry = this.textInteractionRegistry.getByMesh(pickedMesh);
      if (entry) {
        return entry.mesh;
      }

      const elementId = pickedMesh.metadata?.elementId;
      const ownedTextEntry = typeof elementId === 'string'
        ? this.textInteractionRegistry.getByElementId(elementId)
        : undefined;
      if (ownedTextEntry) {
        return ownedTextEntry.mesh;
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
      // The nearest rendered element remains the cursor owner even when it is
      // not registered for text selection (for example an icon-only button).
      return pickedMesh;
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

  private resolveActiveTextEntry(): TextInteractionEntry | undefined {
    const elementId = this.textSelectionController.snapshot.elementId;
    return elementId ? this.textInteractionRegistry.getByElementId(elementId) : undefined;
  }

  private toCssPoint(
    pointerInfo: PointerInfo,
    entry: TextInteractionEntry,
    constrainToViewport = true
  ): CssPoint | undefined {
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
        const pickX = Number.isFinite(scene.pointerX) ? scene.pointerX : nativeEvent.clientX;
        const pickY = Number.isFinite(scene.pointerY) ? scene.pointerY : nativeEvent.clientY;
        const ray = scene.createPickingRay(pickX, pickY, Matrix.Identity(), scene.activeCamera);
        const hit = ray.intersectsMesh(entry.mesh as any);

        if (hit.hit && hit.pickedPoint) {
          pickedPoint = hit.pickedPoint;
        } else {
          const world = entry.mesh.computeWorldMatrix(true);
          const planeOrigin = Vector3.TransformCoordinates(Vector3.Zero(), world);
          const planeNormal = Vector3.TransformNormal(Vector3.Forward(), world).normalize();
          const distance = ray.intersectsPlane(Plane.FromPositionAndNormal(planeOrigin, planeNormal));
          if (distance === null) {
            return undefined;
          }
          pickedPoint = ray.origin.add(ray.direction.scale(distance));
        }
      } else {
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

    const rawNormalizedX = (localPoint.x + halfWidth) / width;
    const normalizedX = constrainToViewport ? clamp(rawNormalizedX, 0, 1) : rawNormalizedX;
    const rawNormalizedY = (halfHeight - localPoint.y) / height;
    const normalizedY = constrainToViewport ? clamp(rawNormalizedY, 0, 1) : rawNormalizedY;

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
