import {
  DestroyRef,
  Injectable,
  InjectionToken,
  inject,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MeshBuilder, StandardMaterial, type Mesh } from '@babylonjs/core';
import type { SiteData } from '../app/types/site-data';
import { Astylar } from './astylar';
import { AstylarDiagnosticError, type AstylarDiagnostic } from './astylar-diagnostics';
import {
  ASTYLAR_PLUGIN_API_VERSION,
  ASTYLAR_PLUGIN_SURFACE_CONTEXT,
  defineAstylarPlugin,
  provideAstylar,
  type AstylarPluginElementRenderer,
  type AstylarPluginLifecycle,
  type AstylarPluginRenderContext,
} from './astylar-plugin';

const BADGE_CONFIG = new InjectionToken<{ readonly marker: string }>('badge config');
let nextBadgeConfig = 0;

@Injectable()
class BadgeRenderer implements AstylarPluginElementRenderer {
  static surfaceIds: symbol[] = [];
  static surfaceContexts: Array<ReturnType<typeof injectSurfaceContext>> = [];
  private readonly config = inject(BADGE_CONFIG);
  private readonly surface = inject(ASTYLAR_PLUGIN_SURFACE_CONTEXT);

  constructor() {
    BadgeRenderer.surfaceIds.push(this.surface.surfaceId);
    BadgeRenderer.surfaceContexts.push(this.surface);
  }

  render(context: AstylarPluginRenderContext): Mesh {
    const depth = context.properties['badgeDepth'] as number;
    const localProbe = context.coordinates.toRenderPoint({ x: -3, y: 4 }, .5);
    const cssProbe = context.coordinates.toCssPoint(localProbe);
    const size = context.coordinates.toRenderSize({
      width: context.dimensions.width,
      height: context.dimensions.height,
    });
    const mesh = MeshBuilder.CreateBox(context.meshId, {
      width: size.width,
      height: size.height,
      depth,
    }, context.scene);
    mesh.metadata = {
      pluginMarker: this.config.marker,
      pluginDepth: depth,
      pluginLabel: context.element.data?.['label'],
      pluginTone: context.properties['badgeTone'],
      localProbe: localProbe.asArray(),
      cssProbe,
      exposesWorldScale: 'pixelToWorldScale' in context.dimensions,
      renderedSize: size,
      surfaceId: this.surface.surfaceId,
    };
    return mesh;
  }
}

function injectSurfaceContext() {
  return inject(ASTYLAR_PLUGIN_SURFACE_CONTEXT);
}

interface DelayedProbe {
  readonly label: string;
  readonly dispose: jasmine.Spy;
}

@Injectable()
class DelayedRenderer implements AstylarPluginElementRenderer {
  static pending: Array<{
    resolve: (probe: DelayedProbe) => void;
    signal: AbortSignal;
  }> = [];

  render(context: AstylarPluginRenderContext): Mesh {
    const size = context.coordinates.toRenderSize({
      width: context.dimensions.width,
      height: context.dimensions.height,
    });
    const mesh = MeshBuilder.CreateBox(context.meshId, {
      width: size.width,
      height: size.height,
      depth: 0.1,
    }, context.scene);
    let resolve!: (probe: DelayedProbe) => void;
    const delayed = new Promise<DelayedProbe>((ready) => { resolve = ready; });
    DelayedRenderer.pending.push({ resolve, signal: context.resources.signal });
    void context.resources.track(delayed, {
      onReady: (probe) => {
        const material = context.resources.own(
          new StandardMaterial(`${context.meshId}-${probe.label}`, context.scene),
        );
        mesh.material = material;
        mesh.metadata = { readyLabel: probe.label };
      },
    });
    return mesh;
  }
}

@Injectable()
class ThrowingRenderer implements AstylarPluginElementRenderer {
  render(): Mesh {
    throw new Error('deliberate renderer failure');
  }
}

@Injectable()
class LifecycleProbe implements AstylarPluginLifecycle {
  static nextId = 0;
  static activated: number[] = [];
  static destroyed: number[] = [];

  readonly id = ++LifecycleProbe.nextId;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => LifecycleProbe.destroyed.push(this.id));
  }

  activate(): void {
    LifecycleProbe.activated.push(this.id);
  }
}

@Injectable()
class FailingLifecycle implements AstylarPluginLifecycle {
  static destroyed = 0;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => FailingLifecycle.destroyed++);
  }

  activate(): void {
    throw new Error('deliberate activation failure');
  }
}

const lifecyclePlugin = defineAstylarPlugin({
  id: 'example.lifecycle',
  version: '1.0.0',
  pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
  contributes: ['lifecycle'],
  contributions: {
    lifecycle: [{
      id: 'example.lifecycle:surface-probe',
      lifecycle: LifecycleProbe,
    }],
  },
});

const failingPlugin = defineAstylarPlugin({
  id: 'example.failing',
  version: '1.0.0',
  pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
  contributes: ['lifecycle'],
  contributions: {
    lifecycle: [{
      id: 'example.failing:startup',
      lifecycle: FailingLifecycle,
    }],
  },
});

const badgePlugin = defineAstylarPlugin({
  id: 'example.badges',
  version: '1.0.0',
  pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
  dependencies: ['astylar.core'],
  contributes: ['elements', 'properties', 'renderers'],
  providers: [{
    provide: BADGE_CONFIG,
    useFactory: () => ({ marker: `surface-config-${++nextBadgeConfig}` }),
  }],
  contributions: {
    elements: [{
      id: 'example.badges:badge',
      alias: 'badge',
      defaults: { data: { label: 'Default badge' } },
      children: 'any',
      validate: (element) => typeof (element['data'] as { label?: unknown } | undefined)?.label === 'string'
        ? true
        : 'Badge data.label must be a string.',
    }],
    properties: [{
      id: 'example.badges:depth',
      alias: 'badgeDepth',
      initial: 0.08,
      inherits: false,
      affects: ['layout', 'paint'],
      validate: (value) => typeof value === 'number' && value > 0
        ? true
        : 'badgeDepth must be a positive number.',
    }, {
      id: 'example.badges:tone',
      alias: 'badgeTone',
      initial: 'violet',
      inherits: true,
      affects: ['paint'],
      validate: (value) => typeof value === 'string' && value.length > 0
        ? true
        : 'badgeTone must be a non-empty string.',
    }],
    renderers: [{
      id: 'example.badges:badge-renderer',
      elements: ['example.badges:badge'],
      renderer: BadgeRenderer,
    }],
  },
});

const incompatibleBadgePlugin = defineAstylarPlugin({
  ...badgePlugin,
  version: '2.0.0',
});

const delayedPlugin = defineAstylarPlugin({
  id: 'example.delayed',
  version: '1.0.0',
  pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
  contributes: ['elements', 'renderers'],
  contributions: {
    elements: [{ id: 'example.delayed:panel', children: 'none' }],
    renderers: [{
      id: 'example.delayed:renderer',
      elements: ['example.delayed:panel'],
      renderer: DelayedRenderer,
    }],
  },
});

describe('Astylar surface plugin runtime', () => {
  beforeEach(() => {
    LifecycleProbe.nextId = 0;
    LifecycleProbe.activated = [];
    LifecycleProbe.destroyed = [];
    FailingLifecycle.destroyed = 0;
    BadgeRenderer.surfaceIds = [];
    BadgeRenderer.surfaceContexts = [];
    DelayedRenderer.pending = [];
    nextBadgeConfig = 0;
  });

  it('creates, activates, and destroys plugin services independently per surface', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ plugins: [lifecyclePlugin] }),
      ],
    });
    const astylar = TestBed.inject(Astylar);
    const firstCanvas = document.createElement('canvas');
    const secondCanvas = document.createElement('canvas');
    const first = astylar.mount(firstCanvas, site());
    const second = astylar.mount(secondCanvas, site());

    try {
      await Promise.all([first.whenSettled(), second.whenSettled()]);
      expect(LifecycleProbe.activated).toEqual([1, 2]);
      expect(first.diagnostics.plugins).toEqual(jasmine.objectContaining({
        sealed: true,
        pluginIds: ['astylar.core', 'example.lifecycle'],
        lifecycleIds: ['example.lifecycle:surface-probe'],
      }));
      expect(first.diagnostics.plugins.elementIds).toContain('astylar.core:div');
      expect(first.diagnostics.plugins.rendererIds)
        .toContain('astylar.core:compatibility-renderer');
      first.dispose();
      expect(LifecycleProbe.destroyed).toEqual([1]);
      expect(second.disposed).toBeFalse();
    } finally {
      first.dispose();
      second.dispose();
    }

    expect(LifecycleProbe.destroyed).toEqual([1, 2]);
  });

  it('normalizes activation failures and destroys the failed surface injector', () => {
    const reported: AstylarDiagnostic[] = [];
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ plugins: [failingPlugin] }),
      ],
    });
    const astylar = TestBed.inject(Astylar);

    expect(() => astylar.mount(document.createElement('canvas'), site(), {
      diagnostics: {
        logLevel: 'silent',
        onDiagnostic: (diagnostic) => reported.push(diagnostic),
      },
    })).toThrowError(AstylarDiagnosticError, /plugin-initialization-failed/);

    expect(reported.at(-1)).toEqual(jasmine.objectContaining({
      code: 'plugin-initialization-failed',
      pluginId: 'example.failing',
      contributionId: 'example.failing:startup',
    }));
    expect(FailingLifecycle.destroyed).toBe(1);
  });

  it('destroys activated plugin services when core mount validation fails', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ plugins: [lifecyclePlugin] }),
      ],
    });
    const astylar = TestBed.inject(Astylar);

    expect(() => astylar.mount(
      document.createElement('canvas'),
      { root: { children: [{ type: 'not-an-element' }] }, styles: [] } as unknown as SiteData,
      { diagnostics: { logLevel: 'silent' } },
    )).toThrowError(AstylarDiagnosticError, /invalid-element-type/);
    expect(LifecycleProbe.activated).toEqual([1]);
    expect(LifecycleProbe.destroyed).toEqual([1]);
  });

  it('validates and renders plugin elements and properties through an injectable renderer', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ plugins: [badgePlugin] }),
      ],
    });
    const astylar = TestBed.inject(Astylar);
    const first = astylar.mount(document.createElement('canvas'), badgeSite(0.12));
    const second = astylar.mount(document.createElement('canvas'), badgeSite(0.2, undefined, false));

    try {
      await Promise.all([first.whenSettled(), second.whenSettled()]);
      const firstBadge = first.scene.getMeshByName('proof-badge')!;
      const secondBadge = second.scene.getMeshByName('proof-badge')!;
      expect(firstBadge.metadata).toEqual(jasmine.objectContaining({
        pluginMarker: 'surface-config-1',
        pluginDepth: 0.12,
        pluginLabel: 'Proof',
        pluginTone: 'teal',
        cssProbe: { x: -3, y: 4 },
        exposesWorldScale: false,
      }));
      expect(firstBadge.metadata.renderedSize.width / firstBadge.metadata.renderedSize.height)
        .toBeCloseTo(3, 8);
      expect(firstBadge.metadata.localProbe[0]).toBeLessThan(0);
      expect(firstBadge.metadata.localProbe[1]).toBeLessThan(0);
      expect(firstBadge.metadata.localProbe[2]).toBe(.5);
      expect(secondBadge.metadata.pluginDepth).toBe(0.2);
      expect(secondBadge.metadata.pluginMarker).toBe('surface-config-2');
      expect(secondBadge.metadata.pluginLabel).toBe('Default badge');
      expect(firstBadge.metadata.surfaceId).not.toBe(secondBadge.metadata.surfaceId);
      expect(BadgeRenderer.surfaceIds.length).toBe(2);

      await first.update(badgeSite(0.3));
      expect(first.scene.getMeshByName('proof-badge')!.metadata.pluginDepth).toBe(0.3);
      expect(second.scene.getMeshByName('proof-badge')!.metadata.pluginDepth).toBe(0.2);
    } finally {
      first.dispose();
      second.dispose();
    }
    expect(first.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
    expect(second.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
  });

  it('rejects invalid plugin element and property values with contribution diagnostics', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ plugins: [badgePlugin] }),
      ],
    });
    const astylar = TestBed.inject(Astylar);

    expect(() => astylar.mount(
      document.createElement('canvas'),
      badgeSite(-1),
      { diagnostics: { logLevel: 'silent' } },
    )).toThrowError(AstylarDiagnosticError, /plugin-property-invalid/);
    expect(() => astylar.mount(
      document.createElement('canvas'),
      badgeSite(0.1, 42),
      { diagnostics: { logLevel: 'silent' } },
    )).toThrowError(AstylarDiagnosticError, /plugin-element-invalid/);
  });

  it('normalizes renderer failures and cleans up the partial render', async () => {
    const throwingPlugin = defineAstylarPlugin({
      id: 'example.throwing',
      version: '1.0.0',
      pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
      contributes: ['elements', 'renderers'],
      contributions: {
        elements: [{ id: 'example.throwing:badge', alias: 'throwing-badge' }],
        renderers: [{
          id: 'example.throwing:renderer',
          elements: ['example.throwing:badge'],
          renderer: ThrowingRenderer,
        }],
      },
    });
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ plugins: [throwingPlugin] }),
      ],
    });
    const astylar = TestBed.inject(Astylar);
    const reported: AstylarDiagnostic[] = [];
    const data: SiteData = {
      root: { children: [{ type: 'throwing-badge', id: 'bad-renderer' }] },
      styles: [{ selector: '#bad-renderer', width: '80px', height: '30px' }],
    };

    const surface = astylar.mount(document.createElement('canvas'), data, {
      diagnostics: {
        logLevel: 'silent',
        onDiagnostic: (diagnostic) => reported.push(diagnostic),
      },
    });
    await expectAsync(surface.whenSettled())
      .toBeRejectedWithError(AstylarDiagnosticError, /plugin-render-failed/);
    expect(reported.at(-1)).toEqual(jasmine.objectContaining({
      code: 'plugin-render-failed',
      pluginId: 'example.throwing',
      contributionId: 'example.throwing:renderer',
    }));
    surface.dispose();
    expect(surface.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
  });

  it('rejects plugin aliases that attempt to replace a core element renderer', () => {
    const conflictingPlugin = defineAstylarPlugin({
      id: 'example.override',
      version: '1.0.0',
      pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
      contributes: ['elements', 'renderers'],
      contributions: {
        elements: [{ id: 'example.override:panel', alias: 'div' }],
        renderers: [{
          id: 'example.override:renderer',
          elements: ['example.override:panel'],
          renderer: ThrowingRenderer,
        }],
      },
    });
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ plugins: [conflictingPlugin] }),
      ],
    });

    expect(() => TestBed.inject(Astylar).mount(
      document.createElement('canvas'),
      site(),
      { diagnostics: { logLevel: 'silent' } },
    )).toThrowError(AstylarDiagnosticError, /plugin-alias-conflict/);
  });

  it('keeps strict recovery as the fail-fast default with aggregate diagnostics', () => {
    const reported: AstylarDiagnostic[] = [];
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    expect(() => TestBed.inject(Astylar).mount(
      document.createElement('canvas'),
      missingBadgeSite(),
      {
        diagnostics: {
          logLevel: 'silent',
          onDiagnostic: (diagnostic) => reported.push(diagnostic),
        },
      },
    )).toThrowError(AstylarDiagnosticError, /plugin-document-missing/);
    expect(reported).toContain(jasmine.objectContaining({
      code: 'plugin-capability-unavailable',
      pluginId: 'example.badges',
      affectedElements: 1,
      affectedStyleDeclarations: 1,
    }));
  });

  it('renders deterministic owned leaf placeholders without mutating source data', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const astylar = TestBed.inject(Astylar);
    const authored = missingBadgeSite();
    const before = JSON.stringify(authored);
    const surface = astylar.mount(document.createElement('canvas'), authored, {
      pluginRecovery: 'placeholder',
      diagnostics: { logLevel: 'silent' },
    });

    try {
      await surface.whenSettled();
      const placeholder = surface.scene.getMeshByName('proof-badge')!;
      expect(placeholder).toBeTruthy();
      expect(placeholder.metadata.astylarMissingPlugin).toEqual(jasmine.objectContaining({
        pluginId: 'example.badges',
        contributionId: 'example.badges:badge',
        originalType: 'example.badges:badge',
        authoredChildCount: 1,
      }));
      expect(placeholder.metadata.element.type).toBe('example.badges:badge');
      expect(placeholder.metadata.element.data).toEqual({ label: 'Unavailable' });
      expect(placeholder.material?.name).toBe('proof-badge-missing-plugin-material');
      expect(surface.scene.getMeshByName('unrendered-child')).toBeNull();
      expect(surface.diagnostics.messages).toContain(jasmine.objectContaining({
        code: 'plugin-capability-unavailable',
        severity: 'warning',
        relatedPaths: jasmine.arrayContaining([
          '$.root.children[0].children[0]',
          '$.styles[1].extensions["example.badges:depth"]',
        ]),
      }));
      expect(JSON.stringify(authored)).toBe(before);

      const plateau = surface.diagnostics.resources;
      await surface.update(missingBadgeSite());
      await surface.update(missingBadgeSite());
      expect(surface.diagnostics.resources).toEqual(plateau);
      expect(surface.scene.getMeshByName('proof-badge')!.metadata.astylarMissingPlugin.path)
        .toBe('$.root.children[0].children[0]');
    } finally {
      surface.dispose();
    }
    expect(surface.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
  });

  it('does not resolve properties from an installed but document-incompatible plugin', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ plugins: [incompatibleBadgePlugin] }),
      ],
    });
    const surface = TestBed.inject(Astylar).mount(
      document.createElement('canvas'),
      missingBadgeSite(),
      { pluginRecovery: 'placeholder', diagnostics: { logLevel: 'silent' } },
    );

    try {
      await surface.whenSettled();
      const placeholder = surface.scene.getMeshByName('proof-badge')!;
      expect(placeholder.metadata.astylarMissingPlugin.reason).toBe('version-incompatible');
      expect(placeholder.metadata.astylarPluginProperties).toEqual({});
      expect(BadgeRenderer.surfaceIds).toEqual([]);
    } finally {
      surface.dispose();
    }
  });

  it('uses the real renderer on a newly mounted compatible configuration', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ plugins: [badgePlugin] }),
      ],
    });
    const surface = TestBed.inject(Astylar).mount(
      document.createElement('canvas'),
      missingBadgeSite(),
      { pluginRecovery: 'placeholder', diagnostics: { logLevel: 'silent' } },
    );

    try {
      await surface.whenSettled();
      const badge = surface.scene.getMeshByName('proof-badge')!;
      expect(badge.metadata.astylarMissingPlugin).toBeUndefined();
      expect(badge.metadata.pluginLabel).toBe('Unavailable');
      expect(badge.metadata.pluginDepth).toBe(0.15);
      expect(surface.scene.getMeshByName('unrendered-child')).toBeTruthy();

      const beforeRevision = surface.diagnostics.session!.revision;
      const pluginContext = BadgeRenderer.surfaceContexts[0];
      pluginContext.requestInvalidation({
        pluginId: 'example.badges',
        properties: ['badgeDepth'],
      });
      pluginContext.requestInvalidation({
        pluginId: 'example.badges',
        properties: ['badgeDepth'],
      });
      await surface.whenSettled();
      expect(surface.diagnostics.session!.revision).toBe(beforeRevision + 1);
      expect(surface.diagnostics.reconciliation!.strategy).toBe('rebuild');
    } finally {
      surface.dispose();
    }
    expect(() => BadgeRenderer.surfaceContexts[0].requestInvalidation({
      pluginId: 'example.badges',
      domains: ['paint'],
    })).not.toThrow();
  });

  it('awaits current async resources and rejects stale generation completion', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ plugins: [delayedPlugin] }),
      ],
    });
    const surface = TestBed.inject(Astylar).mount(
      document.createElement('canvas'),
      delayedSite('first'),
      { diagnostics: { logLevel: 'silent' } },
    );
    try {
      const initialSettlement = surface.whenSettled();
      await waitFor(() => DelayedRenderer.pending.length === 1);
      const first = DelayedRenderer.pending[0];
      const update = surface.update(delayedSite('second'));
      await waitFor(() => DelayedRenderer.pending.length === 2);
      expect(first.signal.aborted).toBeTrue();

      const currentProbe: DelayedProbe = {
        label: 'current',
        dispose: jasmine.createSpy('currentDispose'),
      };
      DelayedRenderer.pending[1].resolve(currentProbe);
      await update;
      await initialSettlement;
      expect(surface.scene.getMeshByName('delayed-panel')!.metadata.readyLabel).toBe('current');
      expect(surface.diagnostics.resources!.materials).toBeGreaterThan(0);
      expect(surface.diagnostics.pluginResources.resources).toBe(2);
      expect(surface.diagnostics.pluginResources.pending).toBe(0);

      const retainedMesh = surface.scene.getMeshByName('delayed-panel')!;
      const retainedMaterial = retainedMesh.material;
      const semanticOnly = delayedSite('second');
      semanticOnly.root.children[0].ariaLabel = 'Updated semantics';
      await surface.update(semanticOnly);
      expect(DelayedRenderer.pending.length).toBe(2);
      expect(surface.scene.getMeshByName('delayed-panel')).toBe(retainedMesh);
      expect(retainedMesh.material).toBe(retainedMaterial);
      expect(surface.diagnostics.pluginResources.resources).toBe(2);

      const staleProbe: DelayedProbe = {
        label: 'stale',
        dispose: jasmine.createSpy('staleDispose'),
      };
      first.resolve(staleProbe);
      await Promise.resolve();
      await Promise.resolve();
      expect(staleProbe.dispose).toHaveBeenCalledOnceWith();
      expect(surface.scene.getMeshByName('delayed-panel')!.metadata.readyLabel).toBe('current');
    } finally {
      surface.dispose();
    }
    expect(surface.diagnostics.pluginResources).toEqual({
      owners: 0,
      resources: 0,
      cleanups: 0,
      pending: 0,
    });
  });
});

function site(): SiteData {
  return {
    root: { children: [{ type: 'div', id: 'plugin-surface-root' }] },
    styles: [{ selector: '#plugin-surface-root', width: '100px', height: '40px' }],
  };
}

function badgeSite(
  depth: number,
  label: unknown = 'Proof',
  includeData = true,
): SiteData {
  return {
    root: {
      children: [{
        type: 'div',
        id: 'badge-host',
        children: [{
          type: 'badge',
          id: 'proof-badge',
          ...(includeData ? { data: { label } } : {}),
        }],
      }],
    },
    styles: [
      {
        selector: '#badge-host',
        width: '160px',
        height: '80px',
        extensions: { badgeTone: 'teal' },
      },
      {
        selector: '#proof-badge',
        width: '120px',
        height: '40px',
        background: '#6d28d9',
        extensions: { badgeDepth: depth },
      },
    ],
  };
}

function missingBadgeSite(): SiteData {
  return {
    plugins: [{
      id: 'example.badges',
      versionRange: '^1.0.0',
      schemaVersion: 1,
    }],
    root: {
      children: [{
        type: 'div',
        id: 'badge-host',
        children: [{
          type: 'example.badges:badge',
          id: 'proof-badge',
          data: { label: 'Unavailable' },
          children: [{
            type: 'span',
            id: 'unrendered-child',
            textContent: 'Source-only child',
          }],
        }],
      }],
    },
    styles: [
      { selector: '#badge-host', width: '200px', height: '100px' },
      {
        selector: '#proof-badge',
        width: '140px',
        height: '50px',
        extensions: { 'example.badges:depth': 0.15 },
      },
    ],
  };
}

function delayedSite(label: string): SiteData {
  return {
    plugins: [{ id: 'example.delayed', versionRange: '^1.0.0', schemaVersion: 1 }],
    styles: [{ selector: '#delayed-panel', width: '120px', height: '40px' }],
    root: {
      children: [{
        type: 'example.delayed:panel',
        id: 'delayed-panel',
        data: { label },
      }],
    },
  };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('Timed out waiting for asynchronous renderer state.');
}
