import type { SiteData } from '../app/types/site-data';
import { AstylarDiagnostics } from './astylar-diagnostics';
import { AstylarDocumentRecovery } from './astylar-document-recovery';
import {
  ASTYLAR_PLUGIN_API_VERSION,
  AstylarCapabilityRegistry,
  defineAstylarPlugin,
} from './astylar-plugin';

function missingDocument(): SiteData {
  return {
    plugins: [{
      id: 'missing.cards',
      versionRange: '^1.0.0',
      schemaVersion: 2,
    }],
    styles: [{
      selector: '#missing-card',
      width: '180px',
      height: '60px',
      extensions: {
        'missing.cards:depth': 0.2,
        'other.plugin:retained': true,
      },
    }],
    root: {
      children: [{
        id: 'missing-card',
        type: 'missing.cards:card',
        data: { tone: 'plum' },
        style: {
          extensions: { 'missing.cards:inline-depth': 0.3 },
        },
        children: [{ id: 'authored-child', type: 'span', textContent: 'Keep me' }],
      }],
    },
  };
}

describe('AstylarDocumentRecovery', () => {
  function setup(policy: 'strict' | 'placeholder') {
    const diagnostics = new AstylarDiagnostics();
    diagnostics.configure({ logLevel: 'silent' });
    const registry = new AstylarCapabilityRegistry([]);
    const recovery = new AstylarDocumentRecovery(registry, diagnostics);
    recovery.configure(policy);
    return { diagnostics, recovery, registry };
  }

  it('aggregates strict missing-plugin diagnostics before failing', () => {
    const authored = missingDocument();
    const before = JSON.stringify(authored);
    const { diagnostics, recovery } = setup('strict');

    expect(() => recovery.prepare(authored)).toThrowError(/plugin-document-missing/);
    expect(diagnostics.snapshot).toContain(jasmine.objectContaining({
      code: 'plugin-document-missing',
      severity: 'error',
      pluginId: 'missing.cards',
      requiredSchemaVersion: 2,
    }));
    expect(diagnostics.snapshot).toContain(jasmine.objectContaining({
      code: 'plugin-capability-unavailable',
      affectedElements: 1,
      affectedStyleDeclarations: 2,
      relatedPaths: [
        '$.root.children[0]',
        '$.root.children[0].style.extensions["missing.cards:inline-depth"]',
        '$.styles[0].extensions["missing.cards:depth"]',
      ],
    }));
    expect(JSON.stringify(authored)).toBe(before);
  });

  it('creates a render-only leaf and preserves all authored source data', () => {
    const authored = missingDocument();
    const before = JSON.stringify(authored);
    const { diagnostics, recovery, registry } = setup('placeholder');

    const renderDocument = recovery.prepare(authored);
    const placeholder = renderDocument.root.children[0];

    expect(renderDocument).not.toBe(authored);
    expect(placeholder.type).toBe('missing.cards:card');
    expect(placeholder.data).toEqual({ tone: 'plum' });
    expect(placeholder.children).toEqual([]);
    expect(renderDocument.styles).toEqual(authored.styles);
    expect(recovery.placeholderFor(placeholder)).toEqual({
      pluginId: 'missing.cards',
      contributionId: 'missing.cards:card',
      originalType: 'missing.cards:card',
      path: '$.root.children[0]',
      reason: 'missing',
      authoredChildCount: 1,
      requiredSchemaVersion: 2,
      installedVersion: undefined,
    });
    expect(() => diagnostics.validate(authored, registry, {
      isUnavailableElement: (identity) => recovery.isUnavailableElement(identity),
      isUnavailableProperty: (identity) => recovery.isUnavailableProperty(identity),
    })).not.toThrow();
    expect(diagnostics.snapshot.every(({ severity }) => severity !== 'error')).toBeTrue();
    expect(JSON.stringify(authored)).toBe(before);
  });

  it('distinguishes installed version, old schema, future schema, and contribution gaps', () => {
    const plugin = defineAstylarPlugin({
      id: 'example.cards',
      version: '2.0.0',
      pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
      documentSchemaVersion: 3,
      contributes: [],
      contributions: {},
    });
    const registry = new AstylarCapabilityRegistry([plugin]);
    const run = (versionRange: string, schemaVersion: number) => {
      const diagnostics = new AstylarDiagnostics();
      diagnostics.configure({ logLevel: 'silent' });
      const recovery = new AstylarDocumentRecovery(registry, diagnostics);
      recovery.configure('strict');
      const authored: SiteData = {
        plugins: [{ id: 'example.cards', versionRange, schemaVersion }],
        styles: [],
        root: { children: [] },
      };
      expect(() => recovery.prepare(authored)).toThrow();
      return diagnostics.snapshot.map(({ code }) => code);
    };

    expect(run('^3.0.0', 3)).toContain('plugin-document-version-incompatible');
    expect(run('^2.0.0', 1)).toContain('plugin-document-migration-required');
    expect(run('^2.0.0', 4)).toContain('plugin-document-schema-unsupported');

    const diagnostics = new AstylarDiagnostics();
    diagnostics.configure({ logLevel: 'silent' });
    const recovery = new AstylarDocumentRecovery(registry, diagnostics);
    recovery.configure('strict');
    expect(() => recovery.prepare({
      styles: [],
      root: { children: [{ type: 'example.cards:removed' }] },
    })).toThrowError(/plugin-capability-unavailable/);
    expect(diagnostics.snapshot).toContain(jasmine.objectContaining({
      code: 'plugin-capability-unavailable',
      message: jasmine.stringContaining('contribution-missing'),
    }));
  });
});
