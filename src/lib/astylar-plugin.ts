import {
  EnvironmentProviders,
  InjectionToken,
  Provider,
  Type,
  makeEnvironmentProviders,
} from '@angular/core';
import type { Mesh, Scene } from '@babylonjs/core';
import type { DOMElement } from '../app/types/dom-element';
import type { AstylarDocumentPluginRequirement } from '../app/types/site-data';
import type { StyleRule } from '../app/types/style-rule';
import {
  AstylarDiagnosticError,
  type AstylarDiagnostic,
} from './astylar-diagnostics';
import { ASTYLAR_VERSION } from './astylar-version';
import {
  isAstylarVersion,
  isAstylarVersionRange,
  satisfiesAstylarVersion,
} from './astylar-semver';

/** Versioned independently from the Astylar package. */
export const ASTYLAR_PLUGIN_API_VERSION = 1 as const;

export type AstylarPluginApiVersion = typeof ASTYLAR_PLUGIN_API_VERSION;
export type AstylarPluginContributionKind =
  | 'elements'
  | 'properties'
  | 'renderers'
  | 'lifecycle'
  | 'migrations';
export type AstylarPluginInvalidationDomain =
  | 'layout'
  | 'paint'
  | 'semantics'
  | 'interaction';

export interface AstylarPluginDependency {
  readonly id: string;
  readonly versionRange: string;
}

/** Phase 13 string dependencies remain shorthand for an unrestricted version. */
export type AstylarPluginDependencyRequirement = string | AstylarPluginDependency;

export type AstylarDocumentPluginCompatibilityStatus =
  | 'compatible'
  | 'missing'
  | 'version-incompatible'
  | 'migration-required'
  | 'schema-unsupported';

export interface AstylarDocumentPluginCompatibility {
  readonly requirement: AstylarDocumentPluginRequirement;
  readonly status: AstylarDocumentPluginCompatibilityStatus;
  readonly installedVersion?: string;
  readonly installedSchemaVersion?: number;
}

export interface AstylarPluginValidationContext {
  readonly pluginId: string;
  readonly contributionId: string;
  readonly path: string;
  readonly elementId?: string;
}

/** `true` accepts a value; a message or messages reject it. */
export type AstylarPluginValidationResult = true | string | readonly string[];

export interface AstylarPluginElementDefinition {
  /** Canonical identity, for example `example.badges:badge`. */
  readonly id: string;
  /** Optional author-facing identity. Aliases must be globally unambiguous. */
  readonly alias?: string;
  readonly defaults?: Readonly<Record<string, unknown>>;
  readonly children?: 'any' | 'none' | readonly string[];
  readonly validate?: (
    element: Readonly<Record<string, unknown>>,
    context: AstylarPluginValidationContext,
  ) => AstylarPluginValidationResult;
}

export interface AstylarPluginPropertyDefinition {
  /** Canonical identity, for example `example.badges:depth`. */
  readonly id: string;
  /** Optional JSON-style identity, for example `badgeDepth`. */
  readonly alias?: string;
  readonly initial: unknown;
  readonly inherits: boolean;
  readonly affects: readonly AstylarPluginInvalidationDomain[];
  readonly validate: (
    value: unknown,
    context: AstylarPluginValidationContext,
  ) => AstylarPluginValidationResult;
}

export interface AstylarPluginRenderDimensions {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly padding: Readonly<{
    top: number;
    right: number;
    bottom: number;
    left: number;
  }>;
  readonly pixelToWorldScale: number;
}

/** Curated public context supplied to an injectable plugin renderer. */
export interface AstylarPluginRenderContext {
  readonly scene: Scene;
  readonly parent: Mesh;
  readonly meshId: string;
  readonly element: DOMElement;
  readonly style: Readonly<StyleRule>;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly dimensions: AstylarPluginRenderDimensions;
  report(diagnostic: AstylarDiagnostic): void;
}

export interface AstylarPluginElementRenderer {
  render(context: AstylarPluginRenderContext): Mesh;
}

export interface AstylarPluginRendererDefinition {
  /** Canonical renderer contribution identity. */
  readonly id: string;
  /** Canonical element identities claimed by this renderer. */
  readonly elements: readonly string[];
  /** Injectable type; Astylar automatically provides it in each surface scope. */
  readonly renderer: Type<AstylarPluginElementRenderer>;
}

export interface AstylarPluginLifecycle {
  activate?(): void;
}

export interface AstylarPluginLifecycleDefinition {
  readonly id: string;
  /** Injectable type automatically provided in each surface scope. */
  readonly lifecycle: Type<AstylarPluginLifecycle>;
}

/** Immutable plugin-owned element fragment passed to a pure migration. */
export interface AstylarPluginElementMigrationData {
  readonly type: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

/** Immutable plugin-owned style fragment passed to a pure migration. */
export interface AstylarPluginStyleMigrationData {
  readonly selector: string;
  readonly extensions: Readonly<Record<string, unknown>>;
}

export interface AstylarPluginMigrationContext {
  readonly pluginId: string;
  readonly migrationId: string;
  readonly fromSchemaVersion: number;
  readonly toSchemaVersion: number;
  readonly path: string;
}

/**
 * One pure, deterministic edge in a plugin-owned document schema graph.
 * Migration callbacks run without an Angular injection context.
 */
export interface AstylarPluginMigrationDefinition {
  readonly id: string;
  readonly fromSchemaVersion: number;
  readonly toSchemaVersion: number;
  readonly migrateElement?: (
    element: AstylarPluginElementMigrationData,
    context: AstylarPluginMigrationContext,
  ) => AstylarPluginElementMigrationData;
  readonly migrateStyle?: (
    style: AstylarPluginStyleMigrationData,
    context: AstylarPluginMigrationContext,
  ) => AstylarPluginStyleMigrationData;
}

export interface AstylarPluginContributions {
  readonly elements?: readonly AstylarPluginElementDefinition[];
  readonly properties?: readonly AstylarPluginPropertyDefinition[];
  readonly renderers?: readonly AstylarPluginRendererDefinition[];
  readonly lifecycle?: readonly AstylarPluginLifecycleDefinition[];
  readonly migrations?: readonly AstylarPluginMigrationDefinition[];
}

export interface AstylarPluginDefinition {
  /** Namespaced plugin identity, for example `example.badges`. */
  readonly id: string;
  readonly version: string;
  readonly pluginApiVersion: number;
  /** Semantic-version range of Astylar releases supported by this plugin. */
  readonly astylarVersionRange?: string;
  /** Current positive integer version of plugin-owned persisted data. Defaults to 1. */
  readonly documentSchemaVersion?: number;
  readonly dependencies?: readonly AstylarPluginDependencyRequirement[];
  readonly contributes: readonly AstylarPluginContributionKind[];
  /** Providers installed into every surface before contributions resolve. */
  readonly providers?: readonly (Provider | EnvironmentProviders)[];
  readonly contributions: AstylarPluginContributions;
}

export interface AstylarConfig {
  readonly plugins?: readonly AstylarPluginDefinition[];
}

/**
 * Application-level definitions collected by `provideAstylar*` helpers.
 * The multi-provider's runtime value is a readonly definition array.
 */
export const ASTYLAR_PLUGIN_DEFINITIONS =
  new InjectionToken<readonly AstylarPluginDefinition[]>('ASTYLAR_PLUGIN_DEFINITIONS');

/** Curated surface-scoped host facilities available through Angular DI. */
export interface AstylarPluginSurfaceContext {
  /** Unique identity useful for proving and keying surface-local state. */
  readonly surfaceId: symbol;
  readonly capabilities: AstylarCapabilityRegistrySnapshot;
  report(diagnostic: AstylarDiagnostic): AstylarDiagnostic;
}

export const ASTYLAR_PLUGIN_SURFACE_CONTEXT =
  new InjectionToken<AstylarPluginSurfaceContext>('ASTYLAR_PLUGIN_SURFACE_CONTEXT');

export function defineAstylarPlugin<const T extends AstylarPluginDefinition>(
  definition: T,
): Readonly<T> {
  const contributions = Object.freeze({
    ...(definition.contributions.elements
      ? {
          elements: Object.freeze(definition.contributions.elements.map((element) =>
            Object.freeze({
              ...element,
              ...(element.defaults
                ? { defaults: freezeData({ ...element.defaults }) }
                : {}),
              ...(Array.isArray(element.children)
                ? { children: Object.freeze([...element.children]) }
                : {}),
            }))),
        }
      : {}),
    ...(definition.contributions.properties
      ? {
          properties: Object.freeze(definition.contributions.properties.map((property) =>
            Object.freeze({
              ...property,
              initial: freezeData(property.initial),
              affects: Object.freeze([...property.affects]),
            }))),
        }
      : {}),
    ...(definition.contributions.renderers
      ? {
          renderers: Object.freeze(definition.contributions.renderers.map((renderer) =>
            Object.freeze({
              ...renderer,
              elements: Object.freeze([...renderer.elements]),
            }))),
        }
      : {}),
    ...(definition.contributions.lifecycle
      ? {
          lifecycle: Object.freeze(definition.contributions.lifecycle.map((lifecycle) =>
            Object.freeze({ ...lifecycle }))),
        }
      : {}),
    ...(definition.contributions.migrations
      ? {
          migrations: Object.freeze(definition.contributions.migrations.map((migration) =>
            Object.freeze({ ...migration }))),
        }
      : {}),
  });
  return Object.freeze({
    ...definition,
    dependencies: Object.freeze((definition.dependencies ?? []).map((dependency) =>
      typeof dependency === 'string'
        ? dependency
        : Object.freeze({ ...dependency }))),
    contributes: Object.freeze([...definition.contributes]),
    providers: Object.freeze([...(definition.providers ?? [])]),
    contributions,
  }) as unknown as Readonly<T>;
}

/** Installs a complete immutable Astylar configuration at application scope. */
export function provideAstylar(config: AstylarConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders(
    (config.plugins ?? []).map((plugin) => ({
      provide: ASTYLAR_PLUGIN_DEFINITIONS,
      multi: true,
      useValue: defineAstylarPlugin(plugin),
    })),
  );
}

/** Allows a plugin package to expose one idiomatic Angular provider helper. */
export function provideAstylarPlugin(
  plugin: AstylarPluginDefinition,
): EnvironmentProviders {
  return provideAstylar({ plugins: [plugin] });
}

export interface AstylarCapabilityRegistrySnapshot {
  readonly sealed: true;
  readonly pluginIds: readonly string[];
  readonly elementIds: readonly string[];
  readonly propertyIds: readonly string[];
  readonly rendererIds: readonly string[];
  readonly lifecycleIds: readonly string[];
}

type DiagnosticReporter = (diagnostic: AstylarDiagnostic) => AstylarDiagnostic;

/**
 * Deterministic, sealed view of all core and application plugin capabilities.
 * A fresh instance is created for every mounted surface.
 */
export class AstylarCapabilityRegistry {
  readonly sealed = true as const;
  readonly plugins: readonly AstylarPluginDefinition[];

  private readonly pluginsById = new Map<string, AstylarPluginDefinition>();
  private readonly elementsById = new Map<string, AstylarPluginElementDefinition>();
  private readonly elementAliases = new Map<string, AstylarPluginElementDefinition>();
  private readonly propertiesById = new Map<string, AstylarPluginPropertyDefinition>();
  private readonly propertyAliases = new Map<string, AstylarPluginPropertyDefinition>();
  private readonly renderersById = new Map<string, AstylarPluginRendererDefinition>();
  private readonly rendererByElementId = new Map<string, AstylarPluginRendererDefinition>();
  private readonly lifecyclesById = new Map<string, AstylarPluginLifecycleDefinition>();

  constructor(
    definitions: readonly AstylarPluginDefinition[],
    private readonly report?: DiagnosticReporter,
  ) {
    this.plugins = Object.freeze(this.resolvePlugins(definitions));
    this.indexContributions();
  }

  get snapshot(): AstylarCapabilityRegistrySnapshot {
    return Object.freeze({
      sealed: true,
      pluginIds: Object.freeze(this.plugins.map(({ id }) => id)),
      elementIds: Object.freeze([...this.elementsById.keys()].sort()),
      propertyIds: Object.freeze([...this.propertiesById.keys()].sort()),
      rendererIds: Object.freeze([...this.renderersById.keys()].sort()),
      lifecycleIds: Object.freeze([...this.lifecyclesById.keys()].sort()),
    });
  }

  resolveElement(identity: string): AstylarPluginElementDefinition | undefined {
    return this.elementsById.get(identity) ?? this.elementAliases.get(identity);
  }

  resolvePlugin(identity: string): AstylarPluginDefinition | undefined {
    return this.pluginsById.get(identity);
  }

  inspectDocumentRequirements(
    requirements: readonly AstylarDocumentPluginRequirement[],
  ): readonly AstylarDocumentPluginCompatibility[] {
    return Object.freeze(requirements.map((requirement) => {
      const plugin = this.pluginsById.get(requirement.id);
      if (!plugin) {
        return Object.freeze({ requirement, status: 'missing' as const });
      }
      const installedSchemaVersion = plugin.documentSchemaVersion ?? 1;
      if (!satisfiesAstylarVersion(plugin.version, requirement.versionRange)) {
        return Object.freeze({
          requirement,
          status: 'version-incompatible' as const,
          installedVersion: plugin.version,
          installedSchemaVersion,
        });
      }
      const status: AstylarDocumentPluginCompatibilityStatus =
        requirement.schemaVersion < installedSchemaVersion
          ? 'migration-required'
          : requirement.schemaVersion > installedSchemaVersion
            ? 'schema-unsupported'
            : 'compatible';
      return Object.freeze({
        requirement,
        status,
        installedVersion: plugin.version,
        installedSchemaVersion,
      });
    }));
  }

  resolveProperty(identity: string): AstylarPluginPropertyDefinition | undefined {
    return this.propertiesById.get(identity) ?? this.propertyAliases.get(identity);
  }

  get propertyDefinitions(): readonly AstylarPluginPropertyDefinition[] {
    return Object.freeze([...this.propertiesById.values()]);
  }

  resolveRendererForElement(
    elementIdentity: string,
  ): AstylarPluginRendererDefinition | undefined {
    const element = this.resolveElement(elementIdentity);
    return element ? this.rendererByElementId.get(element.id) : undefined;
  }

  resolveLifecycle(identity: string): AstylarPluginLifecycleDefinition | undefined {
    return this.lifecyclesById.get(identity);
  }

  /** Registry mutation is never supported after construction. */
  registerPlugin(_definition: AstylarPluginDefinition): never {
    this.fail(
      'plugin-registry-sealed',
      'The Astylar capability registry is sealed before rendering begins.',
    );
  }

  private resolvePlugins(
    definitions: readonly AstylarPluginDefinition[],
  ): AstylarPluginDefinition[] {
    for (const rawDefinition of definitions) {
      const definition = defineAstylarPlugin(rawDefinition);
      this.validatePluginMetadata(definition);
      if (this.pluginsById.has(definition.id)) {
        this.fail(
          'plugin-duplicate',
          `Plugin ${JSON.stringify(definition.id)} is registered more than once.`,
          definition.id,
        );
      }
      this.pluginsById.set(definition.id, definition);
    }

    for (const definition of this.pluginsById.values()) {
      for (const rawDependency of definition.dependencies ?? []) {
        const dependency = normalizeDependency(rawDependency);
        const installed = this.pluginsById.get(dependency.id);
        if (!installed) {
          this.fail(
            'plugin-dependency-missing',
            `Plugin ${JSON.stringify(definition.id)} requires missing plugin ${JSON.stringify(dependency.id)}.`,
            definition.id,
            dependency.id,
          );
        }
        if (!satisfiesAstylarVersion(installed.version, dependency.versionRange)) {
          this.fail(
            'plugin-dependency-version-incompatible',
            `Plugin ${JSON.stringify(definition.id)} requires ${JSON.stringify(dependency.id)} ${JSON.stringify(dependency.versionRange)}; installed version is ${JSON.stringify(installed.version)}.`,
            definition.id,
            dependency.id,
          );
        }
      }
    }

    const indegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();
    for (const definition of this.pluginsById.values()) {
      const dependencies = (definition.dependencies ?? []).map(normalizeDependency);
      indegree.set(definition.id, dependencies.length);
      for (const dependency of dependencies) {
        const entries = dependents.get(dependency.id) ?? [];
        entries.push(definition.id);
        dependents.set(dependency.id, entries);
      }
    }

    const ready = [...indegree]
      .filter(([, count]) => count === 0)
      .map(([id]) => id)
      .sort();
    const result: AstylarPluginDefinition[] = [];
    while (ready.length > 0) {
      const id = ready.shift()!;
      result.push(this.pluginsById.get(id)!);
      for (const dependent of (dependents.get(id) ?? []).sort()) {
        const remaining = indegree.get(dependent)! - 1;
        indegree.set(dependent, remaining);
        if (remaining === 0) {
          ready.push(dependent);
          ready.sort();
        }
      }
    }

    if (result.length !== this.pluginsById.size) {
      const cycle = [...indegree]
        .filter(([, count]) => count > 0)
        .map(([id]) => id)
        .sort();
      this.fail(
        'plugin-dependency-cycle',
        `Plugin dependency cycle includes: ${cycle.join(', ')}.`,
        cycle[0],
      );
    }
    return result;
  }

  private validatePluginMetadata(definition: AstylarPluginDefinition): void {
    if (!isPluginId(definition.id)) {
      this.fail(
        'plugin-id-invalid',
        `Plugin ID ${JSON.stringify(definition.id)} must be a lowercase namespaced identity.`,
        definition.id,
      );
    }
    if (!isAstylarVersion(definition.version)) {
      this.fail(
        'plugin-version-invalid',
        `Plugin ${JSON.stringify(definition.id)} has invalid version ${JSON.stringify(definition.version)}.`,
        definition.id,
      );
    }
    if (definition.pluginApiVersion !== ASTYLAR_PLUGIN_API_VERSION) {
      this.fail(
        'plugin-api-incompatible',
        `Plugin ${JSON.stringify(definition.id)} requires plugin API ${definition.pluginApiVersion}; Astylar supports ${ASTYLAR_PLUGIN_API_VERSION}.`,
        definition.id,
      );
    }
    if (definition.astylarVersionRange !== undefined) {
      if (!isAstylarVersionRange(definition.astylarVersionRange)) {
        this.fail(
          'plugin-astylar-version-invalid',
          `Plugin ${JSON.stringify(definition.id)} has invalid Astylar version range ${JSON.stringify(definition.astylarVersionRange)}.`,
          definition.id,
        );
      }
      if (!satisfiesAstylarVersion(ASTYLAR_VERSION, definition.astylarVersionRange)) {
        this.fail(
          'plugin-astylar-version-incompatible',
          `Plugin ${JSON.stringify(definition.id)} requires Astylar ${JSON.stringify(definition.astylarVersionRange)}; this package is ${ASTYLAR_VERSION}.`,
          definition.id,
        );
      }
    }
    if (definition.documentSchemaVersion !== undefined &&
        (!Number.isInteger(definition.documentSchemaVersion) ||
          definition.documentSchemaVersion < 1)) {
      this.fail(
        'plugin-document-schema-invalid',
        `Plugin ${JSON.stringify(definition.id)} must declare a positive integer document schema version.`,
        definition.id,
      );
    }
    const dependencies = definition.dependencies ?? [];
    const normalizedDependencies = dependencies.map(normalizeDependency);
    const dependencyIds = normalizedDependencies.map(({ id }) => id);
    if (new Set(dependencyIds).size !== dependencyIds.length ||
        dependencyIds.includes(definition.id)) {
      this.fail(
        'plugin-dependency-invalid',
        `Plugin ${JSON.stringify(definition.id)} has duplicate or self-referential dependencies.`,
        definition.id,
      );
    }
    for (const dependency of normalizedDependencies) {
      if (!isPluginId(dependency.id) ||
          !isAstylarVersionRange(dependency.versionRange)) {
        this.fail(
          'plugin-dependency-invalid',
          `Plugin ${JSON.stringify(definition.id)} has invalid dependency ${JSON.stringify(dependency)}.`,
          definition.id,
          dependency.id,
        );
      }
    }

    const actual = contributionKinds(definition.contributions);
    const declared = [...new Set(definition.contributes)].sort();
    if (declared.length !== definition.contributes.length ||
        actual.join('\0') !== declared.join('\0')) {
      this.fail(
        'plugin-contribution-invalid',
        `Plugin ${JSON.stringify(definition.id)} declares ${declared.join(', ') || 'no contributions'} but provides ${actual.join(', ') || 'none'}.`,
        definition.id,
      );
    }
    this.validateMigrationGraph(definition);
  }

  private validateMigrationGraph(definition: AstylarPluginDefinition): void {
    const migrations = definition.contributions.migrations ?? [];
    if (migrations.length === 0) return;
    const current = definition.documentSchemaVersion ?? 1;
    const transitions = new Set<string>();
    const adjacency = new Map<number, number[]>();
    for (const migration of migrations) {
      if (!isContributionId(definition.id, migration.id) ||
          !Number.isInteger(migration.fromSchemaVersion) ||
          !Number.isInteger(migration.toSchemaVersion) ||
          migration.fromSchemaVersion < 1 ||
          migration.toSchemaVersion < 1 ||
          migration.fromSchemaVersion > current ||
          migration.fromSchemaVersion === migration.toSchemaVersion ||
          migration.toSchemaVersion > current ||
          (!migration.migrateElement && !migration.migrateStyle)) {
        this.fail(
          'plugin-migration-invalid',
          `Migration ${JSON.stringify(migration.id)} must define a valid transition ending at or before schema ${current} and at least one pure fragment callback.`,
          definition.id,
          migration.id,
        );
      }
      const transition = `${migration.fromSchemaVersion}:${migration.toSchemaVersion}`;
      if (transitions.has(transition)) {
        this.fail(
          'plugin-migration-duplicate',
          `Plugin ${JSON.stringify(definition.id)} declares transition ${transition} more than once.`,
          definition.id,
          migration.id,
        );
      }
      transitions.add(transition);
      adjacency.set(
        migration.fromSchemaVersion,
        [...(adjacency.get(migration.fromSchemaVersion) ?? []), migration.toSchemaVersion],
      );
    }

    const visiting = new Set<number>();
    const visited = new Set<number>();
    const visit = (version: number): void => {
      if (visiting.has(version)) {
        this.fail(
          'plugin-migration-cycle',
          `Plugin ${JSON.stringify(definition.id)} has a cyclic document migration graph.`,
          definition.id,
        );
      }
      if (visited.has(version)) return;
      visiting.add(version);
      for (const target of adjacency.get(version) ?? []) visit(target);
      visiting.delete(version);
      visited.add(version);
    };
    for (const version of adjacency.keys()) visit(version);

    const versions = new Set<number>([current]);
    for (const migration of migrations) {
      versions.add(migration.fromSchemaVersion);
      versions.add(migration.toSchemaVersion);
    }
    for (const source of versions) {
      for (const target of versions) {
        if (source === target) continue;
        if (countMigrationPaths(adjacency, source, target, new Set()) > 1) {
          this.fail(
            'plugin-migration-path-ambiguous',
            `Plugin ${JSON.stringify(definition.id)} has more than one migration path from schema ${source} to ${target}.`,
            definition.id,
          );
        }
      }
    }
  }

  private indexContributions(): void {
    for (const plugin of this.plugins) {
      for (const element of plugin.contributions.elements ?? []) {
        this.addContribution(plugin.id, 'element', element.id, this.elementsById, element);
        this.addAlias(plugin.id, 'element', element.id, element.alias, this.elementAliases, element);
      }
      for (const property of plugin.contributions.properties ?? []) {
        this.addContribution(plugin.id, 'property', property.id, this.propertiesById, property);
        this.addAlias(plugin.id, 'property', property.id, property.alias, this.propertyAliases, property);
        if (property.affects.length === 0 ||
            property.affects.some((domain) => !INVALIDATION_DOMAINS.has(domain))) {
          this.fail(
            'plugin-contribution-invalid',
            `Property ${JSON.stringify(property.id)} must declare valid invalidation domains.`,
            plugin.id,
            property.id,
          );
        }
        let initialResult: AstylarPluginValidationResult;
        try {
          initialResult = property.validate(property.initial, {
            pluginId: plugin.id,
            contributionId: property.id,
            path: '<plugin-definition>.initial',
          });
        } catch (error) {
          initialResult = `Validator threw: ${errorMessage(error)}`;
        }
        if (initialResult !== true) {
          this.fail(
            'plugin-contribution-invalid',
            `Property ${JSON.stringify(property.id)} has an invalid initial value: ${validationMessage(initialResult)}.`,
            plugin.id,
            property.id,
          );
        }
      }
      for (const renderer of plugin.contributions.renderers ?? []) {
        this.addContribution(plugin.id, 'renderer', renderer.id, this.renderersById, renderer);
      }
      for (const lifecycle of plugin.contributions.lifecycle ?? []) {
        this.addContribution(plugin.id, 'lifecycle', lifecycle.id, this.lifecyclesById, lifecycle);
      }
    }

    for (const plugin of this.plugins) {
      for (const renderer of plugin.contributions.renderers ?? []) {
        if (renderer.elements.length === 0 || new Set(renderer.elements).size !== renderer.elements.length) {
          this.fail(
            'plugin-renderer-claim-invalid',
            `Renderer ${JSON.stringify(renderer.id)} must claim one or more distinct elements.`,
            plugin.id,
            renderer.id,
          );
        }
        for (const elementId of renderer.elements) {
          const element = this.elementsById.get(elementId);
          if (!element || !elementId.startsWith(`${plugin.id}:`)) {
            this.fail(
              'plugin-renderer-claim-invalid',
              `Renderer ${JSON.stringify(renderer.id)} may only claim elements contributed by ${JSON.stringify(plugin.id)}.`,
              plugin.id,
              renderer.id,
            );
          }
          const existing = this.rendererByElementId.get(element.id);
          if (existing) {
            this.fail(
              'plugin-renderer-conflict',
              `Element ${JSON.stringify(element.id)} is claimed by both ${JSON.stringify(existing.id)} and ${JSON.stringify(renderer.id)}.`,
              plugin.id,
              renderer.id,
            );
          }
          this.rendererByElementId.set(element.id, renderer);
        }
      }
    }

    for (const plugin of this.plugins) {
      for (const element of plugin.contributions.elements ?? []) {
        if (!this.rendererByElementId.has(element.id)) {
          this.fail(
            'plugin-renderer-missing',
            `Element ${JSON.stringify(element.id)} has no renderer contribution.`,
            plugin.id,
            element.id,
          );
        }
      }
    }
  }

  private addContribution<T>(
    pluginId: string,
    kind: string,
    id: string,
    target: Map<string, T>,
    value: T,
  ): void {
    if (!isContributionId(pluginId, id)) {
      this.fail(
        'plugin-contribution-invalid',
        `${capitalize(kind)} ID ${JSON.stringify(id)} must be namespaced by ${JSON.stringify(pluginId)}.`,
        pluginId,
        id,
      );
    }
    if (target.has(id)) {
      this.fail(
        'plugin-contribution-duplicate',
        `${capitalize(kind)} ${JSON.stringify(id)} is registered more than once.`,
        pluginId,
        id,
      );
    }
    target.set(id, value);
  }

  private addAlias<T>(
    pluginId: string,
    kind: string,
    contributionId: string,
    alias: string | undefined,
    target: Map<string, T>,
    value: T,
  ): void {
    if (!alias) return;
    if (!/^[a-z][A-Za-z0-9-]*$/.test(alias)) {
      this.fail(
        'plugin-alias-invalid',
        `${capitalize(kind)} alias ${JSON.stringify(alias)} is invalid.`,
        pluginId,
        contributionId,
      );
    }
    if (target.has(alias)) {
      this.fail(
        'plugin-alias-conflict',
        `${capitalize(kind)} alias ${JSON.stringify(alias)} is ambiguous.`,
        pluginId,
        contributionId,
      );
    }
    target.set(alias, value);
  }

  private fail(
    code: Extract<AstylarDiagnostic['code'],
      | 'plugin-id-invalid'
      | 'plugin-version-invalid'
      | 'plugin-astylar-version-invalid'
      | 'plugin-astylar-version-incompatible'
      | 'plugin-api-incompatible'
      | 'plugin-duplicate'
      | 'plugin-dependency-invalid'
      | 'plugin-dependency-missing'
      | 'plugin-dependency-version-incompatible'
      | 'plugin-dependency-cycle'
      | 'plugin-document-schema-invalid'
      | 'plugin-migration-invalid'
      | 'plugin-migration-duplicate'
      | 'plugin-migration-cycle'
      | 'plugin-migration-path-ambiguous'
      | 'plugin-contribution-invalid'
      | 'plugin-contribution-duplicate'
      | 'plugin-alias-invalid'
      | 'plugin-alias-conflict'
      | 'plugin-renderer-claim-invalid'
      | 'plugin-renderer-conflict'
      | 'plugin-renderer-missing'
      | 'plugin-registry-sealed'>,
    message: string,
    pluginId?: string,
    contributionId?: string,
  ): never {
    const diagnostic: AstylarDiagnostic = {
      code,
      severity: 'error',
      message,
      pluginId,
      contributionId,
    };
    throw new AstylarDiagnosticError(this.report?.(diagnostic) ?? diagnostic);
  }
}

const INVALIDATION_DOMAINS = new Set<AstylarPluginInvalidationDomain>([
  'layout',
  'paint',
  'semantics',
  'interaction',
]);

function isPluginId(id: string): boolean {
  return /^[a-z][a-z0-9]*(?:[.-][a-z0-9][a-z0-9-]*)+$/.test(id);
}

function isContributionId(pluginId: string, id: string): boolean {
  if (!id.startsWith(`${pluginId}:`)) return false;
  return /^[a-z][a-z0-9]*(?:[.-][a-z0-9][a-z0-9-]*)+:[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)*$/.test(id);
}

function normalizeDependency(
  dependency: AstylarPluginDependencyRequirement,
): AstylarPluginDependency {
  return typeof dependency === 'string'
    ? { id: dependency, versionRange: '*' }
    : dependency;
}

function contributionKinds(
  contributions: AstylarPluginContributions,
): AstylarPluginContributionKind[] {
  const result: AstylarPluginContributionKind[] = [];
  if (contributions.elements?.length) result.push('elements');
  if (contributions.properties?.length) result.push('properties');
  if (contributions.renderers?.length) result.push('renderers');
  if (contributions.lifecycle?.length) result.push('lifecycle');
  if (contributions.migrations?.length) result.push('migrations');
  return result.sort();
}

function countMigrationPaths(
  adjacency: ReadonlyMap<number, readonly number[]>,
  source: number,
  target: number,
  visited: ReadonlySet<number>,
): number {
  if (source === target) return 1;
  if (visited.has(source)) return 0;
  const nextVisited = new Set(visited).add(source);
  let count = 0;
  for (const next of adjacency.get(source) ?? []) {
    count += countMigrationPaths(adjacency, next, target, nextVisited);
    if (count > 1) return count;
  }
  return count;
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function freezeData<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freezeData(entry))) as T;
  }
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) {
      return Object.freeze(Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, freezeData(entry)]),
      )) as T;
    }
  }
  return value;
}

function validationMessage(result: string | readonly string[]): string {
  return typeof result === 'string' ? result : result.join('; ');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
