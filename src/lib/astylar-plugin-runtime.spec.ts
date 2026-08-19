import {
  DestroyRef,
  Injectable,
  InjectionToken,
  inject,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MeshBuilder, type Mesh } from '@babylonjs/core';
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
  private readonly config = inject(BADGE_CONFIG);
  private readonly surface = inject(ASTYLAR_PLUGIN_SURFACE_CONTEXT);

  constructor() {
    BadgeRenderer.surfaceIds.push(this.surface.surfaceId);
  }

  render(context: AstylarPluginRenderContext): Mesh {
    const depth = context.properties['badgeDepth'] as number;
    const mesh = MeshBuilder.CreateBox(context.meshId, {
      width: context.dimensions.width * context.dimensions.pixelToWorldScale,
      height: context.dimensions.height * context.dimensions.pixelToWorldScale,
      depth,
    }, context.scene);
    mesh.metadata = {
      pluginMarker: this.config.marker,
      pluginDepth: depth,
      pluginLabel: context.element.data?.['label'],
      pluginTone: context.properties['badgeTone'],
      surfaceId: this.surface.surfaceId,
    };
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
      children: 'none',
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

describe('Astylar surface plugin runtime', () => {
  beforeEach(() => {
    LifecycleProbe.nextId = 0;
    LifecycleProbe.activated = [];
    LifecycleProbe.destroyed = [];
    FailingLifecycle.destroyed = 0;
    BadgeRenderer.surfaceIds = [];
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
      }));
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
