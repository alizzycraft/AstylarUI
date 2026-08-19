import {
  Injectable,
  InjectionToken,
  inject,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Mesh } from '@babylonjs/core';
import {
  ASTYLAR_PLUGIN_API_VERSION,
  ASTYLAR_PLUGIN_DEFINITIONS,
  AstylarCapabilityRegistry,
  defineAstylarPlugin,
  provideAstylar,
  provideAstylarPlugin,
  type AstylarPluginDefinition,
  type AstylarPluginElementRenderer,
} from './astylar-plugin';

const CONFIG = new InjectionToken<string>('test plugin config');

@Injectable()
class TestRenderer implements AstylarPluginElementRenderer {
  readonly config = inject(CONFIG);
  render(): Mesh {
    throw new Error('Not rendered by registry unit tests.');
  }
}

function plugin(
  id: string,
  options: {
    dependencies?: readonly string[];
    elementAlias?: string;
    propertyAlias?: string;
    elementId?: string;
    rendererElementId?: string;
    rendererId?: string;
    pluginApiVersion?: number;
    version?: string;
  } = {},
): AstylarPluginDefinition {
  const elementId = options.elementId ?? `${id}:card`;
  return defineAstylarPlugin({
    id,
    version: options.version ?? '1.0.0',
    pluginApiVersion: options.pluginApiVersion ?? ASTYLAR_PLUGIN_API_VERSION,
    dependencies: options.dependencies,
    contributes: ['elements', 'properties', 'renderers'],
    providers: [TestRenderer, { provide: CONFIG, useValue: id }],
    contributions: {
      elements: [{
        id: elementId,
        alias: options.elementAlias,
        children: 'any',
      }],
      properties: [{
        id: `${id}:depth`,
        alias: options.propertyAlias,
        initial: 0.1,
        inherits: false,
        affects: ['layout', 'paint'],
        validate: (value) => typeof value === 'number' ? true : 'Expected a number.',
      }],
      renderers: [{
        id: options.rendererId ?? `${id}:card-renderer`,
        elements: [options.rendererElementId ?? elementId],
        renderer: TestRenderer,
      }],
    },
  });
}

describe('Angular-native Astylar plugin API', () => {
  it('collects immutable plugin definitions through Angular provider helpers', () => {
    const first = plugin('example.alpha');
    const second = plugin('example.beta');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ plugins: [first] }),
        provideAstylarPlugin(second),
      ],
    });

    const definitions = TestBed.inject(ASTYLAR_PLUGIN_DEFINITIONS);

    expect(definitions.map(({ id }) => id)).toEqual(['example.alpha', 'example.beta']);
    expect(Object.isFrozen(definitions[0])).toBeTrue();
    expect(Object.isFrozen(definitions[0].contributions)).toBeTrue();
    expect(Object.isFrozen(definitions[0].providers)).toBeTrue();
    expect(Object.isFrozen(definitions[0].contributions.elements?.[0])).toBeTrue();
    expect(Object.isFrozen(definitions[0].contributions.properties?.[0].affects)).toBeTrue();
  });

  it('resolves dependencies deterministically rather than by provider order', () => {
    const registry = new AstylarCapabilityRegistry([
      plugin('example.gamma', { dependencies: ['example.alpha'] }),
      plugin('example.beta'),
      plugin('example.alpha'),
    ]);

    expect(registry.snapshot).toEqual({
      sealed: true,
      pluginIds: ['example.alpha', 'example.beta', 'example.gamma'],
      elementIds: ['example.alpha:card', 'example.beta:card', 'example.gamma:card'],
      propertyIds: ['example.alpha:depth', 'example.beta:depth', 'example.gamma:depth'],
      rendererIds: [
        'example.alpha:card-renderer',
        'example.beta:card-renderer',
        'example.gamma:card-renderer',
      ],
      lifecycleIds: [],
    });
    expect(registry.resolveElement('example.alpha:card')?.id).toBe('example.alpha:card');
    expect(registry.resolveRendererForElement('example.alpha:card')?.id)
      .toBe('example.alpha:card-renderer');
  });

  it('resolves unambiguous element and property aliases', () => {
    const registry = new AstylarCapabilityRegistry([
      plugin('example.badges', { elementAlias: 'badge', propertyAlias: 'badgeDepth' }),
    ]);

    expect(registry.resolveElement('badge')?.id).toBe('example.badges:card');
    expect(registry.resolveProperty('badgeDepth')?.id).toBe('example.badges:depth');
    expect(registry.resolveRendererForElement('badge')?.id)
      .toBe('example.badges:card-renderer');
  });

  it('rejects incompatible API versions and invalid semantic versions', () => {
    expect(() => new AstylarCapabilityRegistry([
      plugin('example.future', { pluginApiVersion: 2 }),
    ])).toThrowError(/plugin-api-incompatible/);
    expect(() => new AstylarCapabilityRegistry([
      plugin('example.invalid', { version: 'latest' }),
    ])).toThrowError(/plugin-version-invalid/);
  });

  it('rejects duplicate plugin and contribution IDs', () => {
    expect(() => new AstylarCapabilityRegistry([
      plugin('example.same'),
      plugin('example.same'),
    ])).toThrowError(/plugin-duplicate/);

    const duplicateElement = defineAstylarPlugin({
      ...plugin('example.duplicate'),
      contributions: {
        ...plugin('example.duplicate').contributions,
        elements: [
          { id: 'example.duplicate:card' },
          { id: 'example.duplicate:card' },
        ],
      },
    });
    expect(() => new AstylarCapabilityRegistry([duplicateElement]))
      .toThrowError(/plugin-contribution-duplicate/);
  });

  it('rejects ambiguous aliases', () => {
    expect(() => new AstylarCapabilityRegistry([
      plugin('example.alpha', { elementAlias: 'card' }),
      plugin('example.beta', { elementAlias: 'card' }),
    ])).toThrowError(/plugin-alias-conflict/);
  });

  it('rejects missing, self-referential, and cyclic dependencies', () => {
    expect(() => new AstylarCapabilityRegistry([
      plugin('example.alpha', { dependencies: ['example.missing'] }),
    ])).toThrowError(/plugin-dependency-missing/);
    expect(() => new AstylarCapabilityRegistry([
      plugin('example.alpha', { dependencies: ['example.alpha'] }),
    ])).toThrowError(/plugin-dependency-invalid/);
    expect(() => new AstylarCapabilityRegistry([
      plugin('example.alpha', { dependencies: ['example.beta'] }),
      plugin('example.beta', { dependencies: ['example.alpha'] }),
    ])).toThrowError(/plugin-dependency-cycle/);
  });

  it('rejects invalid or conflicting renderer claims', () => {
    expect(() => new AstylarCapabilityRegistry([
      plugin('example.alpha', { rendererElementId: 'example.beta:card' }),
      plugin('example.beta'),
    ])).toThrowError(/plugin-renderer-claim-invalid/);

    const base = plugin('example.conflict');
    const conflicting = defineAstylarPlugin({
      ...base,
      contributions: {
        ...base.contributions,
        renderers: [
          ...base.contributions.renderers!,
          {
            id: 'example.conflict:second-renderer',
            elements: ['example.conflict:card'],
            renderer: TestRenderer,
          },
        ],
      },
    });
    expect(() => new AstylarCapabilityRegistry([conflicting]))
      .toThrowError(/plugin-renderer-conflict/);
  });

  it('rejects mutation after construction', () => {
    const registry = new AstylarCapabilityRegistry([plugin('example.sealed')]);

    expect(() => registry.registerPlugin(plugin('example.late')))
      .toThrowError(/plugin-registry-sealed/);
  });
});
