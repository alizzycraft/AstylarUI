import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { StyleRule } from '../../../types/style-rule';

interface ClipBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface RoundedClipRegion extends ClipBounds {
  radius: number;
}

export interface OverflowClipEntry {
  mesh: BABYLON.Mesh;
  style: StyleRule;
}

const CLIP_BOUNDS_METADATA = 'astylarOverflowClipBounds';
const CLIP_REGIONS_METADATA = 'astylarOverflowClipRegions';
const BORDER_RADIUS_METADATA = 'astylarBorderRadiusWorld';
const ROUNDED_CLIP_PLUGIN = 'AstylarRoundedOverflowClip';
const MAX_ROUNDED_CLIPS = 8;

class RoundedOverflowClipPlugin extends BABYLON.MaterialPluginBase {
  private regions: readonly RoundedClipRegion[] = [];

  constructor(material: BABYLON.Material) {
    super(material, ROUNDED_CLIP_PLUGIN, 200);
    this._enable(true);
  }

  setRegions(regions: readonly RoundedClipRegion[]): void {
    this.regions = regions.slice(-MAX_ROUNDED_CLIPS);
  }

  override getUniforms(shaderLanguage = BABYLON.ShaderLanguage.GLSL): {
    ubo: { name: string; size: number; type: string }[];
    fragment?: string;
  } {
    const ubo = [
      { name: 'astylarRoundedClipCount', size: 1, type: 'float' },
      ...Array.from({ length: MAX_ROUNDED_CLIPS }, (_, index) => [
        { name: `astylarRoundedClipRect${index}`, size: 4, type: 'vec4' },
        { name: `astylarRoundedClipRadius${index}`, size: 1, type: 'float' },
      ]).flat(),
    ];
    if (shaderLanguage === BABYLON.ShaderLanguage.WGSL) return { ubo };
    return {
      ubo,
      fragment: [
        'uniform float astylarRoundedClipCount;',
        ...Array.from({ length: MAX_ROUNDED_CLIPS }, (_, index) =>
          `uniform vec4 astylarRoundedClipRect${index};\nuniform float astylarRoundedClipRadius${index};`),
      ].join('\n'),
    };
  }

  override bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer): void {
    uniformBuffer.updateFloat('astylarRoundedClipCount', this.regions.length);
    for (let index = 0; index < MAX_ROUNDED_CLIPS; index += 1) {
      const region = this.regions[index];
      uniformBuffer.updateFloat4(
        `astylarRoundedClipRect${index}`,
        region?.minX ?? 0,
        region?.minY ?? 0,
        region?.maxX ?? 0,
        region?.maxY ?? 0,
      );
      uniformBuffer.updateFloat(`astylarRoundedClipRadius${index}`, region?.radius ?? 0);
    }
  }

  override getCustomCode(
    shaderType: string,
    shaderLanguage = BABYLON.ShaderLanguage.GLSL,
  ): BABYLON.Nullable<Record<string, string>> {
    if (shaderType !== 'fragment') return null;
    if (shaderLanguage === BABYLON.ShaderLanguage.WGSL) {
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `
          fn astylarRoundedClipDistance(point: vec2f, rect: vec4f, radiusInput: f32) -> f32 {
            let center = (rect.xy + rect.zw) * 0.5;
            let halfSize = (rect.zw - rect.xy) * 0.5;
            let radius = min(radiusInput, min(halfSize.x, halfSize.y));
            let delta = abs(point - center) - halfSize + vec2f(radius);
            return length(max(delta, vec2f(0.0))) + min(max(delta.x, delta.y), 0.0) - radius;
          }
        `,
        CUSTOM_FRAGMENT_MAIN_BEGIN: Array.from({ length: MAX_ROUNDED_CLIPS }, (_, index) => `
          if (uniforms.astylarRoundedClipCount > ${index}.5 && astylarRoundedClipDistance(
            fragmentInputs.vPositionW.xy,
            uniforms.astylarRoundedClipRect${index},
            uniforms.astylarRoundedClipRadius${index}
          ) > 0.0) { discard; }
        `).join('\n'),
      };
    }
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `
        float astylarRoundedClipDistance(vec2 point, vec4 rect, float radiusInput) {
          vec2 center = (rect.xy + rect.zw) * 0.5;
          vec2 halfSize = (rect.zw - rect.xy) * 0.5;
          float radius = min(radiusInput, min(halfSize.x, halfSize.y));
          vec2 delta = abs(point - center) - halfSize + vec2(radius);
          return length(max(delta, vec2(0.0))) + min(max(delta.x, delta.y), 0.0) - radius;
        }
      `,
      CUSTOM_FRAGMENT_MAIN_BEGIN: Array.from({ length: MAX_ROUNDED_CLIPS }, (_, index) => `
        if (astylarRoundedClipCount > ${index}.5 && astylarRoundedClipDistance(
          vPositionW.xy,
          astylarRoundedClipRect${index},
          astylarRoundedClipRadius${index}
        ) > 0.0) discard;
      `).join('\n'),
    };
  }
}

@Injectable({ providedIn: 'root' })
export class OverflowClipService {
  /** Recomputes world-space clip intersections after the authored layout moves. */
  refresh(entries: readonly OverflowClipEntry[]): void {
    const descendants = new Set<BABYLON.AbstractMesh>();
    for (const { mesh } of entries) {
      mesh.getChildMeshes(false).forEach((descendant) => descendants.add(descendant));
    }
    for (const descendant of descendants) {
      if (descendant.metadata) {
        delete descendant.metadata[CLIP_BOUNDS_METADATA];
        delete descendant.metadata[CLIP_REGIONS_METADATA];
      }
      this.clearClip(descendant.material);
    }
    for (const { mesh, style } of entries) {
      this.apply(mesh, style);
    }
  }

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
    const radius = Math.min(
      Number(parent.metadata?.[BORDER_RADIUS_METADATA] ?? 0),
      (parentBounds.maxX - parentBounds.minX) / 2,
      (parentBounds.maxY - parentBounds.minY) / 2,
    );

    for (const descendant of parent.getChildMeshes(false)) {
      const metadata = descendant.metadata ?? {};
      const inherited = metadata[CLIP_BOUNDS_METADATA] as ClipBounds | undefined;
      const bounds = inherited ? this.intersect(inherited, parentBounds) : parentBounds;
      const inheritedRegions = metadata[CLIP_REGIONS_METADATA] as readonly RoundedClipRegion[] | undefined;
      const regions = radius > 0
        ? [...(inheritedRegions ?? []), { ...parentBounds, radius }]
        : inheritedRegions ?? [];
      descendant.metadata = {
        ...metadata,
        [CLIP_BOUNDS_METADATA]: bounds,
        [CLIP_REGIONS_METADATA]: regions,
      };
      this.applyPlanes(descendant.material, bounds);
      this.applyRoundedRegions(descendant.material, regions);
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

  private applyRoundedRegions(
    material: BABYLON.Nullable<BABYLON.Material>,
    regions: readonly RoundedClipRegion[],
  ): void {
    if (!material || regions.length === 0) return;
    const plugin = material.pluginManager?.getPlugin<RoundedOverflowClipPlugin>(ROUNDED_CLIP_PLUGIN) ??
      new RoundedOverflowClipPlugin(material);
    plugin.setRegions(regions);
  }

  private clearClip(material: BABYLON.Nullable<BABYLON.Material>): void {
    if (!material) return;
    material.clipPlane = null;
    material.clipPlane2 = null;
    material.clipPlane3 = null;
    material.clipPlane4 = null;
    material.pluginManager?.getPlugin<RoundedOverflowClipPlugin>(ROUNDED_CLIP_PLUGIN)?.setRegions([]);
  }
}
