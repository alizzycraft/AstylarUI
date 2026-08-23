import type { SiteData } from '../app/types/site-data';
import { prepareAstylarDocument } from './astylar-document-preparation';
import {
  ASTYLAR_PLUGIN_API_VERSION,
  AstylarCapabilityRegistry,
  defineAstylarPlugin,
  type AstylarPluginDefinition,
  type AstylarPluginMigrationDefinition,
} from './astylar-plugin';

const PLUGIN_ID = 'example.cards';

function migrationPlugin(
  currentSchema: number,
  migrations: readonly AstylarPluginMigrationDefinition[],
): AstylarPluginDefinition {
  return defineAstylarPlugin({
    id: PLUGIN_ID,
    version: '2.1.0',
    pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
    documentSchemaVersion: currentSchema,
    contributes: ['migrations'],
    contributions: { migrations },
  });
}

function document(schemaVersion = 1): SiteData {
  return {
    plugins: [{ id: PLUGIN_ID, versionRange: '^2.0.0', schemaVersion }],
    styles: [{
      selector: '.card',
      color: 'white',
      extensions: {
        'example.cards:depth': 2,
        'other.plugin:retained': { nested: true },
      },
    }],
    root: {
      type: 'main',
      id: 'root',
      children: [{
        id: 'card',
        type: 'example.cards:card',
        class: 'card',
        data: { tone: 'violet', untouched: { value: 1 } },
        children: [{
          id: 'core-child',
          type: 'span',
          textContent: 'Preserved child',
        }],
      }],
    },
  };
}

describe('plugin document preparation', () => {
  it('applies a deterministic chain to owned fragments without mutating authored data', () => {
    const seenPaths: string[] = [];
    const plugin = migrationPlugin(3, [
      {
        id: 'example.cards:v1-to-v2',
        fromSchemaVersion: 1,
        toSchemaVersion: 2,
        migrateElement: (element, context) => {
          seenPaths.push(context.path);
          expect(Object.isFrozen(element)).toBeTrue();
          expect(Object.isFrozen(element.data)).toBeTrue();
          return {
            ...element,
            data: { ...element.data, color: element.data?.['tone'] },
          };
        },
        migrateStyle: (style) => ({
          selector: style.selector,
          extensions: {
            'example.cards:elevation': style.extensions['example.cards:depth'],
          },
        }),
      },
      {
        id: 'example.cards:v2-to-v3',
        fromSchemaVersion: 2,
        toSchemaVersion: 3,
        migrateElement: (element) => ({
          ...element,
          data: {
            ...element.data,
            color: String(element.data?.['color']).toUpperCase(),
          },
        }),
      },
    ]);
    const authored = document();
    const before = JSON.stringify(authored);

    const result = prepareAstylarDocument(
      authored,
      new AstylarCapabilityRegistry([plugin]),
    );

    expect(result.status).toBe('migrated');
    expect(result.document).not.toBe(authored);
    expect(result.document.plugins?.[0].schemaVersion).toBe(3);
    expect(result.appliedMigrations.map(({ migrationId }) => migrationId)).toEqual([
      'example.cards:v1-to-v2',
      'example.cards:v2-to-v3',
    ]);
    expect(result.document.root.children[0].data).toEqual({
      tone: 'violet',
      untouched: { value: 1 },
      color: 'VIOLET',
    });
    expect(result.document.root.children[0].children?.[0].textContent)
      .toBe('Preserved child');
    expect(result.document.styles[0].extensions).toEqual({
      'other.plugin:retained': { nested: true },
      'example.cards:elevation': 2,
    });
    expect(seenPaths).toEqual(['$.root.children[0]']);
    expect(JSON.stringify(authored)).toBe(before);

    const repeated = prepareAstylarDocument(
      result.document,
      new AstylarCapabilityRegistry([plugin]),
    );
    expect(repeated.status).toBe('ready');
    expect(repeated.document).toBe(result.document);
    expect(repeated.appliedMigrations).toEqual([]);
  });

  it('rolls back the complete chain when a later migration fails', () => {
    const plugin = migrationPlugin(3, [
      {
        id: 'example.cards:v1-to-v2',
        fromSchemaVersion: 1,
        toSchemaVersion: 2,
        migrateElement: (element) => ({ ...element, data: { advanced: true } }),
      },
      {
        id: 'example.cards:v2-to-v3',
        fromSchemaVersion: 2,
        toSchemaVersion: 3,
        migrateElement: () => { throw new Error('controlled failure'); },
      },
    ]);
    const authored = document();
    const before = JSON.stringify(authored);

    const result = prepareAstylarDocument(
      authored,
      new AstylarCapabilityRegistry([plugin]),
    );

    expect(result.status).toBe('blocked');
    expect(result.document).toBe(authored);
    expect(result.appliedMigrations).toEqual([]);
    expect(result.diagnostics).toContain(jasmine.objectContaining({
      code: 'plugin-migration-failed',
      pluginId: PLUGIN_ID,
      contributionId: 'example.cards:v2-to-v3',
      path: '$.root.children[0]',
    }));
    expect(JSON.stringify(authored)).toBe(before);
  });

  it('rejects migration outputs that escape plugin ownership', () => {
    const elementEscape = migrationPlugin(2, [{
      id: 'example.cards:escape-element',
      fromSchemaVersion: 1,
      toSchemaVersion: 2,
      migrateElement: () => ({ type: 'div', data: { stolen: true } }),
    }]);
    expect(prepareAstylarDocument(
      document(),
      new AstylarCapabilityRegistry([elementEscape]),
    ).diagnostics).toContain(jasmine.objectContaining({
      code: 'plugin-migration-failed',
      path: '$.root.children[0]',
    }));

    const styleEscape = migrationPlugin(2, [{
      id: 'example.cards:escape-style',
      fromSchemaVersion: 1,
      toSchemaVersion: 2,
      migrateStyle: (style) => ({
        selector: style.selector,
        extensions: { 'other.plugin:stolen': true },
      }),
    }]);
    expect(prepareAstylarDocument(
      document(),
      new AstylarCapabilityRegistry([styleEscape]),
    ).diagnostics).toContain(jasmine.objectContaining({
      code: 'plugin-migration-failed',
      path: '$.styles[0].extensions',
    }));
  });

  it('reports missing paths and invalid persisted requirements', () => {
    const noPath = migrationPlugin(3, [{
      id: 'example.cards:v2-to-v3',
      fromSchemaVersion: 2,
      toSchemaVersion: 3,
      migrateElement: (element) => element,
    }]);
    const missing = prepareAstylarDocument(
      document(1),
      new AstylarCapabilityRegistry([noPath]),
    );
    expect(missing.status).toBe('blocked');
    expect(missing.diagnostics).toContain(jasmine.objectContaining({
      code: 'plugin-migration-path-missing',
      pluginId: PLUGIN_ID,
    }));

    const invalid = document();
    invalid.plugins = [
      { id: PLUGIN_ID, versionRange: 'not-a-range', schemaVersion: 0 },
      { id: PLUGIN_ID, versionRange: '*', schemaVersion: 1 },
    ];
    expect(prepareAstylarDocument(
      invalid,
      new AstylarCapabilityRegistry([]),
    ).diagnostics.map(({ code }) => code)).toEqual([
      'plugin-document-requirement-invalid',
      'plugin-document-requirement-invalid',
    ]);
  });

  it('distinguishes required blockers from preserved optional requirements', () => {
    const required = document();
    expect(prepareAstylarDocument(
      required,
      new AstylarCapabilityRegistry([]),
    )).toEqual(jasmine.objectContaining({
      status: 'blocked',
      document: required,
    }));

    const optional = document();
    optional.plugins = [{
      id: PLUGIN_ID,
      versionRange: '*',
      schemaVersion: 1,
      required: false,
    }];
    const result = prepareAstylarDocument(
      optional,
      new AstylarCapabilityRegistry([]),
    );
    expect(result.status).toBe('ready');
    expect(result.document).toBe(optional);
    expect(result.diagnostics).toContain(jasmine.objectContaining({
      code: 'plugin-document-missing',
      severity: 'warning',
    }));
  });
});

describe('plugin migration graph validation', () => {
  const pass = (element: { readonly type: string; readonly data?: Readonly<Record<string, unknown>> }) =>
    element;

  it('rejects duplicate transitions', () => {
    expect(() => new AstylarCapabilityRegistry([migrationPlugin(2, [
      {
        id: 'example.cards:first',
        fromSchemaVersion: 1,
        toSchemaVersion: 2,
        migrateElement: pass,
      },
      {
        id: 'example.cards:second',
        fromSchemaVersion: 1,
        toSchemaVersion: 2,
        migrateElement: pass,
      },
    ])])).toThrowError(/plugin-migration-duplicate/);
  });

  it('rejects cycles', () => {
    expect(() => new AstylarCapabilityRegistry([migrationPlugin(2, [
      {
        id: 'example.cards:forward',
        fromSchemaVersion: 1,
        toSchemaVersion: 2,
        migrateElement: pass,
      },
      {
        id: 'example.cards:backward',
        fromSchemaVersion: 2,
        toSchemaVersion: 1,
        migrateElement: pass,
      },
    ])])).toThrowError(/plugin-migration-cycle/);
  });

  it('rejects ambiguous paths', () => {
    expect(() => new AstylarCapabilityRegistry([migrationPlugin(3, [
      {
        id: 'example.cards:one-two',
        fromSchemaVersion: 1,
        toSchemaVersion: 2,
        migrateElement: pass,
      },
      {
        id: 'example.cards:two-three',
        fromSchemaVersion: 2,
        toSchemaVersion: 3,
        migrateElement: pass,
      },
      {
        id: 'example.cards:one-three',
        fromSchemaVersion: 1,
        toSchemaVersion: 3,
        migrateElement: pass,
      },
    ])])).toThrowError(/plugin-migration-path-ambiguous/);
  });
});
