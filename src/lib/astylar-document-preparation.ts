import { validRange } from 'semver';
import type { DOMElement } from '../app/types/dom-element';
import type {
  AstylarDocumentPluginRequirement,
  SiteData,
} from '../app/types/site-data';
import type { AstylarDiagnostic } from './astylar-diagnostics';
import type {
  AstylarCapabilityRegistry,
  AstylarDocumentPluginCompatibility,
  AstylarPluginDefinition,
  AstylarPluginMigrationContext,
  AstylarPluginMigrationDefinition,
} from './astylar-plugin';

export type AstylarDocumentPreparationStatus = 'ready' | 'migrated' | 'blocked';

export interface AstylarAppliedPluginMigration {
  readonly pluginId: string;
  readonly migrationId: string;
  readonly fromSchemaVersion: number;
  readonly toSchemaVersion: number;
}

export interface AstylarDocumentPreparationResult {
  readonly status: AstylarDocumentPreparationStatus;
  /** The original reference when preparation is unnecessary or blocked. */
  readonly document: SiteData;
  readonly compatibility: readonly AstylarDocumentPluginCompatibility[];
  readonly appliedMigrations: readonly AstylarAppliedPluginMigration[];
  readonly diagnostics: readonly AstylarDiagnostic[];
}

/**
 * Purely prepares plugin-owned document fragments. No Angular injection context
 * exists while migration callbacks execute.
 */
export function prepareAstylarDocument(
  document: SiteData,
  registry: AstylarCapabilityRegistry,
): AstylarDocumentPreparationResult {
  const requirements = document.plugins ?? [];
  const invalidDiagnostics = validateRequirements(requirements);
  if (invalidDiagnostics.length > 0) {
    return blocked(document, [], invalidDiagnostics);
  }

  const compatibility = registry.inspectDocumentRequirements(requirements);
  const compatibilityDiagnostics = compatibility.flatMap(compatibilityDiagnostic);
  if (compatibilityDiagnostics.some(({ severity }) => severity === 'error')) {
    return blocked(document, compatibility, compatibilityDiagnostics);
  }

  const migrationsToRun: Array<{
    plugin: AstylarPluginDefinition;
    requirement: AstylarDocumentPluginRequirement;
    path: readonly AstylarPluginMigrationDefinition[];
  }> = [];
  for (const entry of compatibility) {
    if (entry.status !== 'migration-required') continue;
    const plugin = registry.resolvePlugin(entry.requirement.id)!;
    const target = plugin.documentSchemaVersion ?? 1;
    const path = findMigrationPath(
      plugin.contributions.migrations ?? [],
      entry.requirement.schemaVersion,
      target,
    );
    if (!path) {
      return blocked(document, compatibility, [
        ...compatibilityDiagnostics,
        Object.freeze({
          code: 'plugin-migration-path-missing',
          severity: 'error',
          message: `Plugin ${JSON.stringify(plugin.id)} has no migration path from schema ${entry.requirement.schemaVersion} to ${target}.`,
          path: `$.plugins[${requirements.indexOf(entry.requirement)}].schemaVersion`,
          pluginId: plugin.id,
        }),
      ]);
    }
    migrationsToRun.push({ plugin, requirement: entry.requirement, path });
  }

  if (migrationsToRun.length === 0) {
    return Object.freeze({
      status: 'ready',
      document,
      compatibility,
      appliedMigrations: Object.freeze([]),
      diagnostics: Object.freeze(compatibilityDiagnostics),
    });
  }

  let working = cloneData(document);
  const applied: AstylarAppliedPluginMigration[] = [];
  try {
    for (const entry of migrationsToRun) {
      for (const migration of entry.path) {
        working = applyMigration(working, entry.plugin.id, migration);
        updateRequirementSchema(working, entry.plugin.id, migration.toSchemaVersion);
        applied.push(Object.freeze({
          pluginId: entry.plugin.id,
          migrationId: migration.id,
          fromSchemaVersion: migration.fromSchemaVersion,
          toSchemaVersion: migration.toSchemaVersion,
        }));
      }
    }
  } catch (error) {
    const failure = error instanceof MigrationFragmentError ? error : undefined;
    return blocked(document, compatibility, [
      ...compatibilityDiagnostics,
      Object.freeze({
        code: 'plugin-migration-failed',
        severity: 'error',
        message: `Plugin migration failed: ${errorMessage(error)}. The original document was preserved.`,
        path: failure?.path,
        pluginId: failure?.pluginId,
        contributionId: failure?.migrationId,
      }),
    ]);
  }

  return Object.freeze({
    status: 'migrated',
    document: working,
    compatibility,
    appliedMigrations: Object.freeze(applied),
    diagnostics: Object.freeze(compatibilityDiagnostics),
  });
}

function validateRequirements(
  requirements: readonly AstylarDocumentPluginRequirement[],
): AstylarDiagnostic[] {
  const diagnostics: AstylarDiagnostic[] = [];
  const ids = new Set<string>();
  requirements.forEach((requirement, index) => {
    if (!requirement || typeof requirement !== 'object' ||
        !isPluginId(requirement.id) ||
        !validRange(requirement.versionRange) ||
        !Number.isInteger(requirement.schemaVersion) ||
        requirement.schemaVersion < 1 ||
        (requirement.required !== undefined && typeof requirement.required !== 'boolean') ||
        ids.has(requirement.id)) {
      diagnostics.push(Object.freeze({
        code: 'plugin-document-requirement-invalid',
        severity: 'error',
        message: 'Plugin document requirements must have a unique canonical ID, valid semantic-version range, positive integer schema version, and optional boolean required flag.',
        path: `$.plugins[${index}]`,
        pluginId: typeof requirement?.id === 'string' ? requirement.id : undefined,
      }));
    }
    if (typeof requirement?.id === 'string') ids.add(requirement.id);
  });
  return diagnostics;
}

function compatibilityDiagnostic(
  compatibility: AstylarDocumentPluginCompatibility,
): AstylarDiagnostic[] {
  const { requirement, status } = compatibility;
  if (status === 'compatible' || status === 'migration-required') return [];
  const required = requirement.required !== false;
  const severity = required ? 'error' as const : 'warning' as const;
  const base = {
    severity,
    pluginId: requirement.id,
  };
  if (status === 'missing') {
    return [Object.freeze({
      ...base,
      code: 'plugin-document-missing',
      message: `${required ? 'Required' : 'Optional'} document plugin ${JSON.stringify(requirement.id)} is not installed.`,
    })];
  }
  if (status === 'version-incompatible') {
    return [Object.freeze({
      ...base,
      code: 'plugin-document-version-incompatible',
      message: `Document plugin ${JSON.stringify(requirement.id)} requires ${JSON.stringify(requirement.versionRange)}; installed version is ${JSON.stringify(compatibility.installedVersion)}.`,
    })];
  }
  return [Object.freeze({
    ...base,
    code: 'plugin-document-schema-unsupported',
    message: `Document plugin ${JSON.stringify(requirement.id)} uses schema ${requirement.schemaVersion}; installed plugin supports up to ${compatibility.installedSchemaVersion}.`,
  })];
}

function findMigrationPath(
  migrations: readonly AstylarPluginMigrationDefinition[],
  source: number,
  target: number,
): readonly AstylarPluginMigrationDefinition[] | undefined {
  if (source === target) return Object.freeze([]);
  const bySource = new Map<number, AstylarPluginMigrationDefinition[]>();
  for (const migration of migrations) {
    bySource.set(
      migration.fromSchemaVersion,
      [...(bySource.get(migration.fromSchemaVersion) ?? []), migration],
    );
  }
  const visit = (
    version: number,
    visited: ReadonlySet<number>,
  ): AstylarPluginMigrationDefinition[] | undefined => {
    if (version === target) return [];
    if (visited.has(version)) return undefined;
    const nextVisited = new Set(visited).add(version);
    for (const migration of (bySource.get(version) ?? [])
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))) {
      const remainder = visit(migration.toSchemaVersion, nextVisited);
      if (remainder) return [migration, ...remainder];
    }
    return undefined;
  };
  const path = visit(source, new Set());
  return path ? Object.freeze(path) : undefined;
}

function applyMigration(
  document: SiteData,
  pluginId: string,
  migration: AstylarPluginMigrationDefinition,
): SiteData {
  const next = cloneData(document);
  const walk = (element: DOMElement, path: string): void => {
    if (element.type.startsWith(`${pluginId}:`) && migration.migrateElement) {
      const context = migrationContext(pluginId, migration, path);
      let migrated;
      try {
        migrated = migration.migrateElement(
          freezeData({ type: element.type, ...(element.data ? { data: element.data } : {}) }),
          context,
        );
      } catch (error) {
        throw new MigrationFragmentError(pluginId, migration.id, path, error);
      }
      if (!migrated || typeof migrated !== 'object' ||
          typeof migrated.type !== 'string' ||
          !migrated.type.startsWith(`${pluginId}:`) ||
          (migrated.data !== undefined && !isRecord(migrated.data))) {
        throw new MigrationFragmentError(
          pluginId,
          migration.id,
          path,
          new Error('Element migrations must return a plugin-owned type and optional object data.'),
        );
      }
      element.type = migrated.type;
      if (migrated.data === undefined) delete element.data;
      else element.data = cloneData(migrated.data);
    }
    element.children?.forEach((child, index) => walk(child, `${path}.children[${index}]`));
  };
  next.root.children.forEach((element, index) =>
    walk(element, `$.root.children[${index}]`));

  const migrateStyle = migration.migrateStyle;
  if (migrateStyle) {
    next.styles.forEach((style, index) => {
      const extensions = style.extensions ?? {};
      const owned = Object.fromEntries(
        Object.entries(extensions).filter(([key]) => key.startsWith(`${pluginId}:`)),
      );
      if (Object.keys(owned).length === 0) return;
      const path = `$.styles[${index}].extensions`;
      const context = migrationContext(pluginId, migration, path);
      let migrated;
      try {
        migrated = migrateStyle(
          freezeData({ selector: style.selector, extensions: cloneData(owned) }),
          context,
        );
      } catch (error) {
        throw new MigrationFragmentError(pluginId, migration.id, path, error);
      }
      if (!migrated || typeof migrated !== 'object' ||
          migrated.selector !== style.selector ||
          !isRecord(migrated.extensions) ||
          Object.keys(migrated.extensions).some((key) => !key.startsWith(`${pluginId}:`))) {
        throw new MigrationFragmentError(
          pluginId,
          migration.id,
          path,
          new Error('Style migrations must preserve the selector and return only plugin-owned extension keys.'),
        );
      }
      const foreign = Object.fromEntries(
        Object.entries(extensions).filter(([key]) => !key.startsWith(`${pluginId}:`)),
      );
      style.extensions = cloneData({ ...foreign, ...migrated.extensions });
    });
  }
  return next;
}

function migrationContext(
  pluginId: string,
  migration: AstylarPluginMigrationDefinition,
  path: string,
): AstylarPluginMigrationContext {
  return Object.freeze({
    pluginId,
    migrationId: migration.id,
    fromSchemaVersion: migration.fromSchemaVersion,
    toSchemaVersion: migration.toSchemaVersion,
    path,
  });
}

function updateRequirementSchema(
  document: SiteData,
  pluginId: string,
  schemaVersion: number,
): void {
  const requirements = document.plugins;
  if (!requirements) return;
  document.plugins = requirements.map((requirement) =>
    requirement.id === pluginId
      ? { ...requirement, schemaVersion }
      : requirement);
}

function blocked(
  document: SiteData,
  compatibility: readonly AstylarDocumentPluginCompatibility[],
  diagnostics: readonly AstylarDiagnostic[],
): AstylarDocumentPreparationResult {
  return Object.freeze({
    status: 'blocked',
    document,
    compatibility: Object.freeze([...compatibility]),
    appliedMigrations: Object.freeze([]),
    diagnostics: Object.freeze([...diagnostics]),
  });
}

class MigrationFragmentError extends Error {
  constructor(
    readonly pluginId: string,
    readonly migrationId: string,
    readonly path: string,
    cause: unknown,
  ) {
    super(errorMessage(cause), { cause });
  }
}

function isPluginId(id: unknown): id is string {
  return typeof id === 'string' &&
    /^[a-z][a-z0-9]*(?:[.-][a-z0-9][a-z0-9-]*)+$/.test(id);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneData<T>(value: T): T {
  if (Array.isArray(value)) return value.map((entry) => cloneData(entry)) as T;
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneData(entry)]),
    ) as T;
  }
  return value;
}

function freezeData<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freezeData(entry))) as T;
  }
  if (isRecord(value)) {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, freezeData(entry)]),
    )) as T;
  }
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
