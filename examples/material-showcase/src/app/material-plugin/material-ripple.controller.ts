import { DestroyRef, Injectable, inject } from '@angular/core';
import { Color3, DynamicTexture, Mesh, StandardMaterial } from '@babylonjs/core';
import type { AstylarSurface } from 'astylarui';

export interface MaterialRippleActivation {
  readonly surface: AstylarSurface;
  readonly elementId: string;
  readonly originX: number;
  readonly originY: number;
  readonly width: number;
  readonly height: number;
  readonly cornerRadius: number;
  readonly color: string;
}

interface ActiveRipple {
  readonly dispose: () => void;
}

@Injectable()
export class MaterialRippleController {
  private readonly destroyRef = inject(DestroyRef);
  private readonly active = new Map<string, ActiveRipple>();

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());
  }

  activate(activation: MaterialRippleActivation): void {
    const { surface, elementId } = activation;
    const scene = surface.scene;
    const button = scene.meshes.find((mesh): mesh is Mesh => mesh instanceof Mesh &&
      mesh.metadata?.elementId === elementId && mesh.metadata?.element?.id === elementId);
    if (!button || scene.isDisposed) return;
    this.active.get(elementId)?.dispose();

    const widthPx = Math.max(1, Math.ceil(activation.width));
    const heightPx = Math.max(1, Math.ceil(activation.height));
    const originX = Math.max(0, Math.min(widthPx, activation.originX));
    const originY = Math.max(0, Math.min(heightPx, activation.originY));
    const textureOriginX = originX;
    // Reuse the core-projected paint geometry verbatim. The effect knows its
    // CSS texture size, but it must not reverse-engineer CSS dimensions from a
    // Babylon bounding box or repeat the CSS-to-render projection itself.
    const plane = button.clone(`material-ripple-${elementId}`, button.parent, true);
    if (!plane) return;
    plane.position.z += .02;
    plane.isPickable = false;
    plane.actionManager = null;
    plane.metadata = { showcaseMaterialVisual: 'ripple', elementId, originX, originY, textureOriginX };
    const texture = new DynamicTexture(`material-ripple-${elementId}`, {
      width: widthPx,
      height: heightPx,
    }, scene, false);
    texture.hasAlpha = true;
    const material = new StandardMaterial(`material-ripple-${elementId}-material`, scene);
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.diffuseColor = Color3.White();
    material.emissiveColor = Color3.White();
    material.diffuseTexture = texture;
    material.opacityTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    plane.material = material;

    const started = performance.now();
    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      scene.onBeforeRenderObservable.remove(observer);
      plane.material = null;
      plane.dispose();
      material.dispose(false, true);
      texture.dispose();
      if (this.active.get(elementId)?.dispose === dispose) this.active.delete(elementId);
    };
    const observer = scene.onBeforeRenderObservable.add(() => {
      const phase = Math.min(1, (performance.now() - started) / 450);
      drawRipple(texture, activation, textureOriginX, originY, phase);
      if (phase === 1) dispose();
    });
    this.active.set(elementId, { dispose });
    drawRipple(texture, activation, textureOriginX, originY, 0);
  }

  dispose(): void {
    for (const ripple of [...this.active.values()]) ripple.dispose();
    this.active.clear();
  }
}

function drawRipple(
  texture: DynamicTexture,
  activation: MaterialRippleActivation,
  originX: number,
  originY: number,
  phase: number,
): void {
  const width = Math.max(1, Math.ceil(activation.width));
  const height = Math.max(1, Math.ceil(activation.height));
  const context = texture.getContext();
  context.clearRect(0, 0, width, height);
  context.save();
  roundedRect(context, width, height, activation.cornerRadius);
  context.clip();
  const maximumRadius = Math.hypot(Math.max(originX, width - originX), Math.max(originY, height - originY));
  const expansion = 1 - Math.pow(1 - Math.min(1, phase * 1.35), 3);
  const fade = phase < .55 ? 1 : Math.max(0, 1 - (phase - .55) / .45);
  context.globalAlpha = .18 * fade;
  context.fillStyle = activation.color;
  context.beginPath();
  context.arc(originX, originY, Math.max(.5, maximumRadius * expansion), 0, Math.PI * 2);
  context.fill();
  context.restore();
  texture.update(false);
}

function roundedRect(
  context: ReturnType<DynamicTexture['getContext']>,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(r, 0);
  context.lineTo(width - r, 0);
  context.quadraticCurveTo(width, 0, width, r);
  context.lineTo(width, height - r);
  context.quadraticCurveTo(width, height, width - r, height);
  context.lineTo(r, height);
  context.quadraticCurveTo(0, height, 0, height - r);
  context.lineTo(0, r);
  context.quadraticCurveTo(0, 0, r, 0);
  context.closePath();
}
