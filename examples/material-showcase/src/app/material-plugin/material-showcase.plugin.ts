import { EnvironmentProviders, Injectable, InjectionToken, inject } from '@angular/core';
import { Color3, DynamicTexture, Material, Mesh, MeshBuilder, StandardMaterial, Texture, Vector3, VertexData } from '@babylonjs/core';
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
    return typeof value === 'string' && /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(value) ? value : fallback;
  }

  protected number(context: AstylarPluginRenderContext, key: string, fallback: number): number {
    const value = context.element.data?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  protected material(context: AstylarPluginRenderContext, suffix: string, color: string, alpha = 1): StandardMaterial {
    const material = new StandardMaterial(`${context.meshId}-${suffix}`, context.scene);
    const encodedAlpha = color.length === 9 ? Number.parseInt(color.slice(7, 9), 16) / 255 : 1;
    material.diffuseColor = Color3.FromHexString(color.slice(0, 7));
    material.emissiveColor = material.diffuseColor;
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.alpha = alpha * encodedAlpha;
    if (material.alpha < 1) material.transparencyMode = Material.MATERIAL_ALPHABLEND;
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

  protected animateOnce(context: AstylarPluginRenderContext, duration: number, update: (phase: number) => void): void {
    if (this.config.benchmarkMode) {
      update(Math.max(0, Math.min(1, this.number(context, 'phase', 1))));
      return;
    }
    const started = performance.now();
    const observer = context.scene.onBeforeRenderObservable.add(() => {
      const phase = Math.max(0, Math.min(1, (performance.now() - started) / duration));
      update(1 - Math.pow(1 - phase, 3));
      if (phase >= 1) context.scene.onBeforeRenderObservable.remove(observer);
    });
    context.resources.addCleanup(() => context.scene.onBeforeRenderObservable.remove(observer));
    update(0);
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
    const materialStartAngle = -Math.PI / 2 + Math.PI * 13 / 45;
    const points = Array.from({ length: pointCount }, (_, index) => {
      const angle = materialStartAngle - (index / Math.max(1, pointCount - 1)) * Math.PI * 2 * arc;
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
    active.position.z = .02;
    const stateHandle = String(context.element.data?.['state-handle'] ?? '');
    const stateColor = this.color(context, 'state-color', '#6750a414');
    const stateLayers: Partial<Record<'start' | 'end', Mesh>> = {};
    for (const name of ['start', 'end'] as const) {
      const stateLayer = this.ownChild(context, MeshBuilder.CreateDisc(`${context.meshId}-${name}-state-layer`, {
        radius: 24 * scale, tessellation: this.config.benchmarkMode ? 32 : 48,
      }, context.scene), root);
      stateLayer.material = this.material(
        context, `${name}-state-layer-material`, stateColor, name === stateHandle ? 1 : 0,
      );
      stateLayer.position.z = .025;
      stateLayers[name] = stateLayer;
    }
    const thumbs: Partial<Record<'start' | 'end', Mesh>> = {};
    for (const [name, ratio] of [['start', start], ['end', end]] as const) {
      const thumb = this.ownChild(context, MeshBuilder.CreateDisc(`${context.meshId}-${name}-thumb`, {
        radius: 10 * scale, tessellation: this.config.benchmarkMode ? 32 : 48,
      }, context.scene), root);
      thumb.material = this.material(context, `${name}-thumb-material`, this.color(context, 'indicator-color', '#6750a4'));
      thumb.position.x = context.coordinates.toLocalPoint(-width / 2 + width * ratio, 0).x;
      thumb.position.z = .03;
      thumbs[name] = thumb;
    }
    const updateRange = (nextStart: number, nextEnd: number): void => {
      const boundedStart = Math.max(0, Math.min(1, nextStart));
      const boundedEnd = Math.max(boundedStart, Math.min(1, nextEnd));
      active.scaling.x = Math.max(.001, boundedEnd - boundedStart);
      active.position.x = context.coordinates.toLocalPoint(
        -width / 2 + width * (boundedStart + boundedEnd) / 2, 0,
      ).x;
      if (thumbs.start) {
        thumbs.start.position.x = context.coordinates.toLocalPoint(-width / 2 + width * boundedStart, 0).x;
      }
      if (thumbs.end) {
        thumbs.end.position.x = context.coordinates.toLocalPoint(-width / 2 + width * boundedEnd, 0).x;
      }
      if (stateLayers.start && thumbs.start) stateLayers.start.position.x = thumbs.start.position.x;
      if (stateLayers.end && thumbs.end) stateLayers.end.position.x = thumbs.end.position.x;
    };
    const updateStateLayer = (nextHandle: '' | 'start' | 'end', alpha: number): void => {
      for (const name of ['start', 'end'] as const) {
        const material = stateLayers[name]?.material;
        if (material instanceof StandardMaterial) {
          material.alpha = name === nextHandle ? Math.max(0, Math.min(1, alpha)) : 0;
        }
      }
    };
    updateRange(start, end);
    root.metadata = {
      showcaseMaterialVisual: 'range', start, end,
      benchmarkMode: this.config.benchmarkMode,
      updateRange,
      updateStateLayer,
    };
    return root;
  }
}

@Injectable()
class MaterialCheckMarkRenderer extends MaterialRendererBase implements AstylarPluginElementRenderer {
  render(context: AstylarPluginRenderContext): Mesh {
    const root = this.root(context);
    const scale = context.dimensions.pixelToWorldScale;
    const path = materialCheckMarkPath(scale).map((point) =>
      context.coordinates.toLocalPoint(point.x, point.y, point.z));
    const mark = this.ownChild(context, MeshBuilder.CreateTube(`${context.meshId}-mark`, {
      path,
      radius: Math.max(.6, this.number(context, 'stroke-width', 1.8) / 2) * scale,
      tessellation: this.config.benchmarkMode ? 8 : 12,
      cap: Mesh.CAP_ALL,
    }, context.scene), root);
    mark.material = this.material(context, 'mark-material', this.color(context, 'indicator-color', '#49454f'));
    mark.position.z = .02;
    root.metadata = { showcaseMaterialVisual: 'check-mark', benchmarkMode: this.config.benchmarkMode };
    return root;
  }
}

export function materialCheckMarkPath(scale: number): Vector3[] {
  return [[-5.5, .4], [-1.8, 3.2], [5.5, -4.2]]
    .map(([logicalX, y]) => new Vector3(logicalX * scale, y * scale, 0));
}

@Injectable()
class MaterialSortArrowRenderer extends MaterialRendererBase implements AstylarPluginElementRenderer {
  render(context: AstylarPluginRenderContext): Mesh {
    const root = this.root(context);
    const scale = context.dimensions.pixelToWorldScale;
    const direction = context.element.data?.['direction'] === 'desc' ? 'desc' : 'asc';
    const logicalVertices = materialSortArrowTriangles(scale, direction);
    const vertices = logicalVertices.map((point) => context.coordinates.toLocalPoint(point.x, point.y, point.z));
    const positions = vertices.flatMap((point) => point.asArray());
    const indices = vertices.map((_, index) => index);
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);

    const arrow = this.ownChild(context, new Mesh(`${context.meshId}-path`, context.scene), root);
    const geometry = new VertexData();
    geometry.positions = positions;
    geometry.indices = indices;
    geometry.normals = normals;
    geometry.applyToMesh(arrow);
    arrow.material = this.material(
      context,
      'path-material',
      this.color(context, 'indicator-color', '#49454f'),
      Math.max(0, Math.min(1, this.number(context, 'opacity', 1))),
    );
    arrow.position.z = .02;
    root.metadata = { showcaseMaterialVisual: 'sort-arrow', direction, benchmarkMode: this.config.benchmarkMode };
    return root;
  }
}

/** Angular Material's 24px sort-arrow SVG path, centered in its 12px arrow container. */
export function materialSortArrowTriangles(scale: number, direction: 'asc' | 'desc'): Vector3[] {
  const points = {
    stemBottomLeft: [-1, 6],
    stemTopLeft: [-1, -3.2],
    leftNotch: [-4.6, .4],
    leftWing: [-6, -1],
    tip: [0, -7],
    rightWing: [6, -1],
    rightNotch: [4.6, .4],
    stemTopRight: [1, -3.2],
    stemBottomRight: [1, 6],
  } as const;
  const triangles = [
    points.tip, points.leftWing, points.rightWing,
    points.leftWing, points.leftNotch, points.stemTopLeft,
    points.rightWing, points.stemTopRight, points.rightNotch,
    points.stemBottomLeft, points.stemTopLeft, points.stemTopRight,
    points.stemBottomLeft, points.stemTopRight, points.stemBottomRight,
  ];
  const rotation = direction === 'desc' ? -1 : 1;
  return triangles.map(([x, y]) => new Vector3(x * scale * rotation, y * scale * rotation, 0));
}

@Injectable()
class MaterialTabPanelRenderer extends MaterialRendererBase implements AstylarPluginElementRenderer {
  render(context: AstylarPluginRenderContext): Mesh {
    const root = this.root(context);
    const scale = context.dimensions.pixelToWorldScale;
    const width = Math.max(1, Math.round(context.dimensions.width * 2));
    const height = Math.max(1, Math.round(context.dimensions.height * 2));
    const texture = context.resources.own(new DynamicTexture(`${context.meshId}-content`, { width, height }, context.scene, false));
    texture.hasAlpha = true;
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    texture.uScale = -1;
    texture.uOffset = 1;
    texture.vScale = -1;
    texture.vOffset = 1;
    const material = this.material(context, 'content-material', '#ffffff');
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.opacityTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    const content = this.ownChild(context, MeshBuilder.CreatePlane(`${context.meshId}-content-plane`, {
      width: Math.max(scale, context.dimensions.width * scale),
      height: Math.max(scale, context.dimensions.height * scale),
    }, context.scene), root);
    content.material = material;
    content.position.z = .02;

    const selected = context.element.data?.['selected'] !== false;
    const direction = selected ? -1 : 1;
    const outgoing = selected ? 'Activity content' : 'Overview content';
    const incoming = selected ? 'Overview content' : 'Activity content';
    const color = this.color(context, 'text-color', '#1d1b20');
    const authoredFontSize = Number(context.element.data?.['font-size'] ?? 16);
    const fontSize = Number.isFinite(authoredFontSize) && authoredFontSize > 0 ? authoredFontSize : 16;
    const authoredBaselineOffset = Number(context.element.data?.['baseline-offset'] ?? 0);
    const baselineOffset = Number.isFinite(authoredBaselineOffset) ? authoredBaselineOffset : 0;
    const draw = (phase: number) => {
      const canvas = texture.getContext();
      canvas.clearRect(0, 0, width, height);
      canvas.fillStyle = color;
      const textureFontSize = fontSize * 2;
      canvas.font = `${textureFontSize}px Roboto, Arial, sans-serif`;
      // Match a centered CSS line box while retaining the Roboto alphabetic
      // baseline used by the reference tab body.
      const baseline = Math.min(height - 1, height / 2 + textureFontSize * .328125 + baselineOffset);
      if (phase < 1) canvas.fillText(outgoing, -direction * phase * width, baseline);
      if (phase > 0) canvas.fillText(incoming, direction * (1 - phase) * width, baseline);
      texture.update(false);
    };
    this.animateOnce(context, 320, draw);
    root.metadata = { showcaseMaterialVisual: 'tab-panel', selected, benchmarkMode: this.config.benchmarkMode };
    return root;
  }
}

const elementDefinitions = [
  { name: 'state-layer', renderer: MaterialStateLayerRenderer },
  { name: 'linear-progress', renderer: MaterialLinearProgressRenderer },
  { name: 'circular-progress', renderer: MaterialCircularProgressRenderer },
  { name: 'range-visual', renderer: MaterialRangeVisualRenderer },
  { name: 'check-mark', renderer: MaterialCheckMarkRenderer },
  { name: 'sort-arrow', renderer: MaterialSortArrowRenderer },
  { name: 'tab-panel', renderer: MaterialTabPanelRenderer },
] as const;

export function provideMaterialShowcasePlugin(
  config: MaterialShowcasePluginConfig = { benchmarkMode: false },
): EnvironmentProviders {
  return provideAstylarPlugin(defineAstylarPlugin({
    id: 'showcase.material',
    version: '1.0.0',
    pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
    astylarVersionRange: '^0.2.0',
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
  if (name === 'sort-arrow' && data?.['direction'] !== undefined && !['asc', 'desc'].includes(String(data['direction']))) {
    return 'data.direction must be asc or desc.';
  }
  if (name === 'sort-arrow' && data?.['opacity'] !== undefined &&
      (typeof data['opacity'] !== 'number' || data['opacity'] < 0 || data['opacity'] > 1)) {
    return 'data.opacity must be a number from 0 through 1.';
  }
  if (name === 'tab-panel' && data?.['selected'] !== undefined && typeof data['selected'] !== 'boolean') return 'data.selected must be boolean.';
  if (name === 'tab-panel' && data?.['baseline-offset'] !== undefined && !Number.isFinite(Number(data['baseline-offset']))) {
    return 'data.baseline-offset must be a finite number.';
  }
  return true;
}
