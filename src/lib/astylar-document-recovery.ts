import { Injectable } from '@angular/core';
import type { DOMElement } from '../app/types/dom-element';
import type { SiteData } from '../app/types/site-data';
import type { AstylarDiagnostic } from './astylar-diagnostics';
import {
  AstylarDiagnosticError,
  AstylarDiagnostics,
} from './astylar-diagnostics';
import { validateAstylarDocumentPluginRequirements } from './astylar-document-preparation';
import {
  AstylarCapabilityRegistry,
  type AstylarDocumentPluginCompatibilityStatus,
} from './astylar-plugin';

export type AstylarPluginRecoveryPolicy = 'strict' | 'placeholder';

export type AstylarUnavailablePluginReason =
  | 'missing'
  | 'version-incompatible'
  | 'schema-unsupported'
  | 'migration-required'
  | 'contribution-missing';

export interface AstylarMissingPluginPlaceholderMetadata {
  readonly pluginId: string;
  readonly contributionId: string;
  readonly originalType: string;
  readonly path: string;
  readonly reason: AstylarUnavailablePluginReason;
  readonly authoredChildCount: number;
  readonly requiredSchemaVersion?: number;
  readonly installedVersion?: string;
}

interface UnavailablePlugin {
  readonly pluginId: string;
  readonly reason: AstylarUnavailablePluginReason;
  readonly required: boolean;
  readonly requiredSchemaVersion?: number;
  readonly installedVersion?: string;
}

interface AffectedCapability extends UnavailablePlugin {
  readonly elementPaths: string[];
  readonly stylePaths: string[];
}

/** Surface-scoped document analysis and render-only placeholder ownership. */
@Injectable()
export class AstylarDocumentRecovery {
  private policy: AstylarPluginRecoveryPolicy = 'strict';
  private readonly placeholders = new WeakMap<DOMElement, AstylarMissingPluginPlaceholderMetadata>();
  private unavailable = new Map<string, UnavailablePlugin>();

  constructor(
    private readonly registry: AstylarCapabilityRegistry,
    private readonly diagnostics: AstylarDiagnostics,
  ) {}

  configure(policy: AstylarPluginRecoveryPolicy | undefined): void {
    this.policy = policy ?? 'strict';
  }

  prepare(document: SiteData): SiteData {
    const requirements = document.plugins ?? [];
    const invalid = validateAstylarDocumentPluginRequirements(requirements);
    if (invalid.length > 0) {
      for (const diagnostic of invalid) this.diagnostics.report(diagnostic);
      throw new AstylarDiagnosticError(invalid[0]);
    }

    const compatibility = this.registry.inspectDocumentRequirements(requirements);
    const unavailable = new Map<string, UnavailablePlugin>();
    const compatibilityDiagnostics: AstylarDiagnostic[] = [];
    for (const entry of compatibility) {
      if (entry.status === 'compatible') continue;
      const required = entry.requirement.required !== false;
      unavailable.set(entry.requirement.id, {
        pluginId: entry.requirement.id,
        reason: reasonFromStatus(entry.status),
        required,
        requiredSchemaVersion: entry.requirement.schemaVersion,
        installedVersion: entry.installedVersion,
      });
      compatibilityDiagnostics.push(Object.freeze({
        code: diagnosticCodeFromStatus(entry.status),
        severity: required && this.policy === 'strict' ? 'error' : 'warning',
        message: compatibilityMessage(
          entry.requirement.id,
          entry.status,
          entry.requirement.versionRange,
          entry.requirement.schemaVersion,
          entry.installedVersion,
          entry.installedSchemaVersion,
        ),
        pluginId: entry.requirement.id,
        requiredSchemaVersion: entry.requirement.schemaVersion,
        installedVersion: entry.installedVersion,
      }));
    }

    const affected = this.scanAffected(document, unavailable);
    this.unavailable = unavailable;
    const aggregateDiagnostics = [...affected.values()].map((entry) =>
      aggregateDiagnostic(entry, this.policy));
    for (const diagnostic of [...compatibilityDiagnostics, ...aggregateDiagnostics]) {
      this.diagnostics.report(diagnostic);
    }

    if (this.policy === 'strict') {
      const blocker = compatibilityDiagnostics.find(({ severity }) => severity === 'error') ??
        aggregateDiagnostics.find(({ severity }) => severity === 'error');
      if (blocker) throw new AstylarDiagnosticError(blocker);
      return document;
    }
    if (affected.size === 0) return document;
    return this.createRenderDocument(document, unavailable);
  }

  placeholderFor(
    element: DOMElement,
  ): AstylarMissingPluginPlaceholderMetadata | undefined {
    return this.placeholders.get(element);
  }

  isUnavailableElement(identity: string): boolean {
    return !!this.elementPluginIdentity(identity, this.unavailable);
  }

  isUnavailableProperty(identity: string): boolean {
    return !!this.propertyPluginIdentity(identity, this.unavailable);
  }

  private scanAffected(
    document: SiteData,
    unavailable: Map<string, UnavailablePlugin>,
  ): Map<string, AffectedCapability> {
    const affected = new Map<string, AffectedCapability>();
    const ensure = (plugin: UnavailablePlugin): AffectedCapability => {
      const existing = affected.get(plugin.pluginId);
      if (existing) return existing;
      const created = { ...plugin, elementPaths: [], stylePaths: [] };
      affected.set(plugin.pluginId, created);
      return created;
    };
    for (const plugin of unavailable.values()) ensure(plugin);

    const scanStyle = (style: unknown, path: string): void => {
      if (!style || typeof style !== 'object') return;
      const extensions = (style as { extensions?: unknown }).extensions;
      if (!extensions || typeof extensions !== 'object' || Array.isArray(extensions)) return;
      for (const property of Object.keys(extensions)) {
        const identity = this.propertyPluginIdentity(property, unavailable);
        if (identity) {
          ensure(identity).stylePaths.push(
            `${path}.extensions[${JSON.stringify(property)}]`,
          );
        }
      }
    };
    const walk = (element: DOMElement, path: string): void => {
      if (!element || typeof element !== 'object' || typeof element.type !== 'string') return;
      const identity = this.elementPluginIdentity(element.type, unavailable);
      if (identity) ensure(identity).elementPaths.push(path);
      if (element.style) {
        scanStyle(element.style, `${path}.style`);
      }
      if (Array.isArray(element.children)) {
        element.children.forEach((child, index) =>
          walk(child, `${path}.children[${index}]`));
      }
    };
    document.root.children.forEach((element, index) =>
      walk(element, `$.root.children[${index}]`));

    document.styles.forEach((style, styleIndex) => {
      scanStyle(style, `$.styles[${styleIndex}]`);
    });
    return affected;
  }

  private elementPluginIdentity(
    identity: string,
    unavailable: Map<string, UnavailablePlugin>,
  ): UnavailablePlugin | undefined {
    const resolved = this.registry.resolveElement(identity);
    if (resolved) {
      const pluginId = pluginIdFromContribution(resolved.id);
      return unavailable.get(pluginId);
    }
    if (!identity.includes(':')) return undefined;
    const pluginId = pluginIdFromContribution(identity);
    return unavailable.get(pluginId) ?? {
      pluginId,
      reason: this.registry.resolvePlugin(pluginId) ? 'contribution-missing' : 'missing',
      required: true,
    };
  }

  private propertyPluginIdentity(
    identity: string,
    unavailable: Map<string, UnavailablePlugin>,
  ): UnavailablePlugin | undefined {
    const resolved = this.registry.resolveProperty(identity);
    if (resolved) {
      const pluginId = pluginIdFromContribution(resolved.id);
      return unavailable.get(pluginId);
    }
    if (!identity.includes(':')) return undefined;
    const pluginId = pluginIdFromContribution(identity);
    return unavailable.get(pluginId) ?? {
      pluginId,
      reason: this.registry.resolvePlugin(pluginId) ? 'contribution-missing' : 'missing',
      required: true,
    };
  }

  private createRenderDocument(
    document: SiteData,
    unavailable: Map<string, UnavailablePlugin>,
  ): SiteData {
    const cloneElement = (element: DOMElement, path: string): DOMElement => {
      if (!element || typeof element !== 'object' || typeof element.type !== 'string') {
        return cloneData(element);
      }
      const plugin = this.elementPluginIdentity(element.type, unavailable);
      const clone = cloneData(element);
      if (plugin) {
        clone.children = [];
        const resolved = this.registry.resolveElement(element.type);
        this.placeholders.set(clone, Object.freeze({
          pluginId: plugin.pluginId,
          contributionId: resolved?.id ?? element.type,
          originalType: element.type,
          path,
          reason: plugin.reason,
          authoredChildCount: element.children?.length ?? 0,
          requiredSchemaVersion: plugin.requiredSchemaVersion,
          installedVersion: plugin.installedVersion,
        }));
      } else {
        clone.children = Array.isArray(element.children)
          ? element.children.map((child, index) =>
              cloneElement(child, `${path}.children[${index}]`))
          : element.children;
      }
      return clone;
    };
    return {
      ...cloneData(document),
      root: {
        ...cloneData(document.root),
        children: document.root.children.map((element, index) =>
          cloneElement(element, `$.root.children[${index}]`)),
      },
    };
  }
}

function reasonFromStatus(
  status: Exclude<AstylarDocumentPluginCompatibilityStatus, 'compatible'>,
): AstylarUnavailablePluginReason {
  return status;
}

function diagnosticCodeFromStatus(
  status: Exclude<AstylarDocumentPluginCompatibilityStatus, 'compatible'>,
): AstylarDiagnostic['code'] {
  switch (status) {
    case 'missing': return 'plugin-document-missing';
    case 'version-incompatible': return 'plugin-document-version-incompatible';
    case 'schema-unsupported': return 'plugin-document-schema-unsupported';
    case 'migration-required': return 'plugin-document-migration-required';
  }
}

function compatibilityMessage(
  pluginId: string,
  status: Exclude<AstylarDocumentPluginCompatibilityStatus, 'compatible'>,
  versionRange: string,
  schemaVersion: number,
  installedVersion?: string,
  installedSchemaVersion?: number,
): string {
  switch (status) {
    case 'missing':
      return `Document plugin ${JSON.stringify(pluginId)} is not installed.`;
    case 'version-incompatible':
      return `Document plugin ${JSON.stringify(pluginId)} requires ${JSON.stringify(versionRange)}; installed version is ${JSON.stringify(installedVersion)}.`;
    case 'schema-unsupported':
      return `Document plugin ${JSON.stringify(pluginId)} uses schema ${schemaVersion}; installed plugin supports up to ${installedSchemaVersion}.`;
    case 'migration-required':
      return `Document plugin ${JSON.stringify(pluginId)} uses schema ${schemaVersion}; call prepareDocument() to upgrade to ${installedSchemaVersion} before mounting.`;
  }
}

function aggregateDiagnostic(
  affected: AffectedCapability,
  policy: AstylarPluginRecoveryPolicy,
): AstylarDiagnostic {
  const paths = Object.freeze([...affected.elementPaths, ...affected.stylePaths].sort());
  return Object.freeze({
    code: 'plugin-capability-unavailable',
    severity: policy === 'strict' && affected.required ? 'error' : 'warning',
    message: `Plugin ${JSON.stringify(affected.pluginId)} is unavailable (${affected.reason}); ${affected.elementPaths.length} element(s) and ${affected.stylePaths.length} style declaration(s) are affected.`,
    pluginId: affected.pluginId,
    relatedPaths: paths,
    affectedElements: affected.elementPaths.length,
    affectedStyleDeclarations: affected.stylePaths.length,
    requiredSchemaVersion: affected.requiredSchemaVersion,
    installedVersion: affected.installedVersion,
  });
}

function pluginIdFromContribution(contributionId: string): string {
  return contributionId.slice(0, contributionId.indexOf(':'));
}

function cloneData<T>(value: T): T {
  if (Array.isArray(value)) return value.map((entry) => cloneData(entry)) as T;
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, cloneData(entry)]),
      ) as T;
    }
  }
  return value;
}
