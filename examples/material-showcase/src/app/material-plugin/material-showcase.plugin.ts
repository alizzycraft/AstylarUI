import { EnvironmentProviders, Injectable, InjectionToken, inject } from '@angular/core';
import { Color3, Mesh, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
import {
  ASTYLAR_PLUGIN_API_VERSION,
  defineAstylarPlugin,
  provideAstylarPlugin,
  type AstylarPluginElementRenderer,
  type AstylarPluginRenderContext,
} from 'astylarui';

export interface MaterialShowcasePluginConfig {
  readonly benchmarkMode: boolean;
}

export const MATERIAL_SHOWCASE_PLUGIN_CONFIG = new InjectionToken<MaterialShowcasePluginConfig>(
  'MATERIAL_SHOWCASE_PLUGIN_CONFIG',
);

abstract class MaterialRendererBase {
  protected readonly config = inject(MATERIAL_SHOWCASE_PLUGIN_CONFIG);

  protected color(context: AstylarPluginRenderContext, key: string, fallback: string): string {
    const value = context.element.data?.[key] ?? context.properties[`showcase.material:${key}`];
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  }

  protected number(context: AstylarPluginRenderContext, key: string, fallback: number): number {
    const value = context.element.data?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  protected material(context: AstylarPluginRenderContext, suffix: string, color: string, alpha = 1): StandardMaterial {
    const material = new StandardMaterial(`${context.meshId}-${suffix}`, context.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = material.diffuseColor;
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.alpha = alpha;
    return context.resources.own(material);
  }

  protected root(context: AstylarPluginRenderContext): Mesh {
    const scale = context.dimensions.pixelToWorldScale;
    const root = MeshBuilder.CreatePlane(context.meshId, {
      width: Math.max(scale, context.dimensions.width * scale),
      height: Math.max(scale, context.dimensions.height * scale),
    }, context.scene);
    root.material = this.material(context, 'transparent', '#000000', .001);
    root.isPickable = false;
    return root;
  }

  protected ownChild(context: AstylarPluginRenderContext, child: Mesh, root: Mesh): Mesh {
    child.parent = root;
    child.isPickable = false;
    return context.resources.own(child);
  }

  protected animate(context: AstylarPluginRenderContext, update: (phase: number) => void): void {
    if (this.config.benchmarkMode) {
      update(Math.max(0, Math.min(1, this.number(context, 'phase', 0))));
      return;
    }
    const started = performance.now();
    const observer = context.scene.onBeforeRenderObservable.add(() => update(((performance.now() - started) % 1_400) / 1_400));
    context.resources.addCleanup(() => context.scene.onBeforeRenderObservable.remove(observer));
  }
}

@Injectable()
class MaterialStateLayerRenderer extends MaterialRendererBase implements AstylarPluginElementRenderer {
  render(context: AstylarPluginRenderContext): Mesh {
    const root = this.root(context);
    const phase = Math.max(0, Math.min(1, this.number(context, 'phase', 0)));
    root.material = this.material(context, 'state-layer', this.color(context, 'state-layer-color', '#6750a4'), .12 * phase);
    root.metadata = { showcaseMaterialVisual: 'state-layer', phase, benchmarkMode: this.config.benchmarkMode };
    return root;
  }
}

@Injectable()
class MaterialLinearProgressRenderer extends MaterialRendererBase implements AstylarPluginElementRenderer {
  render(context: AstylarPluginRenderContext): Mesh {
    const root = this.root(context);
    const scale = context.dimensions.pixelToWorldScale;
    const width = context.dimensions.width * scale;
    const height = Math.max(2 * scale, context.dimensions.height * scale);
    const mode = String(context.element.data?.['mode'] ?? 'determinate');
    const progress = Math.max(0, Math.min(1, this.number(context, 'progress', .64)));
    const buffer = Math.max(progress, Math.min(1, this.number(context, 'buffer', .82)));
    const track = this.ownChild(context, MeshBuilder.CreatePlane(`${context.meshId}-track`, { width, height }, context.scene), root);
    track.material = this.material(context, 'track-material', this.color(context, 'track-color', '#e7e0ec'));
    track.position.z = .01;
    const bufferMesh = this.ownChild(context, MeshBuilder.CreatePlane(`${context.meshId}-buffer`, { width, height }, context.scene), root);
    bufferMesh.material = this.material(context, 'buffer-material', this.color(context, 'indicator-color', '#6750a4'), .32);
    bufferMesh.scaling.x = mode === 'buffer' ? buffer : .001;
    bufferMesh.position.x = width * (1 - bufferMesh.scaling.x) / 2;
    bufferMesh.position.z = .02;
    const indicator = this.ownChild(context, MeshBuilder.CreatePlane(`${context.meshId}-indicator`, { width, height }, context.scene), root);
    indicator.material = this.material(context, 'indicator-material', this.color(context, 'indicator-color', '#6750a4'));
    indicator.position.z = .03;
    const update = (phase: number) => {
      const amount = mode === 'determinate' || mode === 'buffer' ? progress : mode === 'query' ? .28 : .34;
      indicator.scaling.x = Math.max(.001, amount);
      indicator.position.x = mode === 'determinate' || mode === 'buffer'
        ? width * (1 - amount) / 2
        : -width / 2 + (width * (1 + amount) * phase) - width * amount / 2;
      if (mode === 'query') indicator.position.x *= -1;
    };
    if (mode === 'determinate' || mode === 'buffer') update(0);
    else this.animate(context, update);
    root.metadata = { showcaseMaterialVisual: 'linear-progress', mode, progress, buffer, benchmarkMode: this.config.benchmarkMode };
    return root;
  }
}

@Injectable()
class MaterialCircularProgressRenderer extends MaterialRendererBase implements AstylarPluginElementRenderer {
  render(context: AstylarPluginRenderContext): Mesh {
    const root = this.root(context);
    const scale = context.dimensions.pixelToWorldScale;
    const stroke = Math.max(scale, this.number(context, 'stroke-width', 4) * scale);
    const radius = Math.max(4 * scale, Math.min(context.dimensions.width, context.dimensions.height) * scale / 2 - stroke / 2);
    const mode = String(context.element.data?.['mode'] ?? 'determinate');
    const progress = Math.max(.01, Math.min(1, this.number(context, 'progress', .64)));
    const arc = mode === 'determinate' ? progress : .74;
    const pointCount = Math.max(8, Math.ceil(64 * arc));
    const points = Array.from({ length: pointCount }, (_, index) => {
      const angle = -Math.PI / 2 - (index / Math.max(1, pointCount - 1)) * Math.PI * 2 * arc;
      return new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    });
    const indicator = this.ownChild(context, MeshBuilder.CreateTube(`${context.meshId}-indicator`, {
      path: points, radius: stroke / 2, tessellation: this.config.benchmarkMode ? 12 : 16, cap: Mesh.CAP_ALL,
    }, context.scene), root);
    indicator.material = this.material(context, 'indicator-material', this.color(context, 'indicator-color', '#6750a4'));
    indicator.position.z = .02;
    if (mode !== 'determinate') this.animate(context, (phase) => { indicator.rotation.z = phase * Math.PI * 2; });
    root.metadata = { showcaseMaterialVisual: 'circular-progress', mode, progress, benchmarkMode: this.config.benchmarkMode };
    return root;
  }
}

@Injectable()
class MaterialRangeVisualRenderer extends MaterialRendererBase implements AstylarPluginElementRenderer {
  render(context: AstylarPluginRenderContext): Mesh {
    const root = this.root(context);
    const scale = context.dimensions.pixelToWorldScale;
    const width = context.dimensions.width * scale;
    const trackHeight = Math.max(4 * scale, Math.min(16 * scale, context.dimensions.height * scale * .16));
    const start = Math.max(0, Math.min(1, this.number(context, 'start', 0)));
    const end = Math.max(start, Math.min(1, this.number(context, 'end', .65)));
    const track = this.ownChild(context, MeshBuilder.CreatePlane(`${context.meshId}-track`, { width, height: trackHeight }, context.scene), root);
    track.material = this.material(context, 'track-material', this.color(context, 'track-color', '#e7e0ec'));
    track.position.z = .01;
    const active = this.ownChild(context, MeshBuilder.CreatePlane(`${context.meshId}-active`, { width, height: trackHeight }, context.scene), root);
    active.material = this.material(context, 'active-material', this.color(context, 'indicator-color', '#6750a4'));
    active.scaling.x = Math.max(.001, end - start);
    active.position.x = -width / 2 + width * (start + end) / 2;
    active.position.z = .02;
    for (const [name, ratio] of [['start', start], ['end', end]] as const) {
      const thumb = this.ownChild(context, MeshBuilder.CreateDisc(`${context.meshId}-${name}-thumb`, {
        radius: 10 * scale, tessellation: this.config.benchmarkMode ? 32 : 48,
      }, context.scene), root);
      thumb.material = this.material(context, `${name}-thumb-material`, this.color(context, 'indicator-color', '#6750a4'));
      thumb.position.x = -width / 2 + width * ratio;
      thumb.position.z = .03;
    }
    root.metadata = { showcaseMaterialVisual: 'range', start, end, benchmarkMode: this.config.benchmarkMode };
    return root;
  }
}

const elementDefinitions = [
  { name: 'state-layer', renderer: MaterialStateLayerRenderer },
  { name: 'linear-progress', renderer: MaterialLinearProgressRenderer },
  { name: 'circular-progress', renderer: MaterialCircularProgressRenderer },
  { name: 'range-visual', renderer: MaterialRangeVisualRenderer },
] as const;

export function provideMaterialShowcasePlugin(
  config: MaterialShowcasePluginConfig = { benchmarkMode: false },
): EnvironmentProviders {
  return provideAstylarPlugin(defineAstylarPlugin({
    id: 'showcase.material',
    version: '1.0.0',
    pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
    astylarVersionRange: '^0.1.0',
    documentSchemaVersion: 1,
    dependencies: [{ id: 'astylar.core', versionRange: '^1.0.0' }],
    contributes: ['elements', 'properties', 'renderers'],
    providers: [
      ...elementDefinitions.map(({ renderer }) => renderer),
      { provide: MATERIAL_SHOWCASE_PLUGIN_CONFIG, useValue: Object.freeze({ ...config }) },
    ],
    contributions: {
      elements: elementDefinitions.map(({ name }) => ({
        id: `showcase.material:${name}`,
        children: 'none' as const,
        validate: (element) => validateMaterialElement(name, element['data'] as Readonly<Record<string, unknown>> | undefined),
      })),
      properties: [
        colorProperty('indicator-color', 'materialIndicatorColor', '#6750a4'),
        colorProperty('track-color', 'materialTrackColor', '#e7e0ec'),
        colorProperty('state-layer-color', 'materialStateLayerColor', '#6750a4'),
        {
          id: 'showcase.material:stroke-width', alias: 'materialStrokeWidth',
          initial: 4, inherits: false, affects: ['layout', 'paint'],
          validate: (value: unknown) => typeof value === 'number' && value > 0 && value <= 24
            ? true : 'materialStrokeWidth must be greater than 0 and at most 24.',
        },
      ],
      renderers: elementDefinitions.map(({ name, renderer }) => ({
        id: `showcase.material:${name}-renderer`, elements: [`showcase.material:${name}`], renderer,
      })),
    },
  }));
}

function colorProperty(name: string, alias: string, initial: string) {
  return {
    id: `showcase.material:${name}`, alias, initial, inherits: name !== 'track-color', affects: ['paint'] as const,
    validate: (value: unknown) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
      ? true : `${alias} must be a six-digit hex color.`,
  };
}

function validateMaterialElement(name: string, data: Readonly<Record<string, unknown>> | undefined): true | string {
  for (const key of ['progress', 'buffer', 'phase', 'start', 'end']) {
    const value = data?.[key];
    if (value !== undefined && (typeof value !== 'number' || value < 0 || value > 1)) return `data.${key} must be a number from 0 through 1.`;
  }
  const modes = name === 'linear-progress' ? ['determinate', 'buffer', 'query', 'indeterminate'] : ['determinate', 'indeterminate'];
  const mode = data?.['mode'];
  if (mode !== undefined && !modes.includes(String(mode))) return `data.mode must be one of ${modes.join(', ')}.`;
  if (name === 'range-visual' && Number(data?.['start'] ?? 0) > Number(data?.['end'] ?? 1)) return 'data.start must not exceed data.end.';
  return true;
}
