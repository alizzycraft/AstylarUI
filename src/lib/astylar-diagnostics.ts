import { Injectable, isDevMode } from '@angular/core';
import type { DOMElement } from '../app/types/dom-element';
import type { SiteData } from '../app/types/site-data';
import type {
  AstylarCapabilityRegistry,
  AstylarPluginValidationContext,
  AstylarPluginValidationResult,
} from './astylar-plugin';

export type AstylarDiagnosticSeverity = 'info' | 'warning' | 'error';

export type AstylarDiagnosticCode =
  | 'malformed-site-data'
  | 'invalid-root'
  | 'duplicate-element-id'
  | 'invalid-element-type'
  | 'unsupported-style-property'
  | 'asset-load-failed'
  | 'surface-disposed'
  | 'surface-not-found'
  | 'canvas-in-use'
  | 'render-failed'
  | 'plugin-id-invalid'
  | 'plugin-version-invalid'
  | 'plugin-api-incompatible'
  | 'plugin-duplicate'
  | 'plugin-dependency-invalid'
  | 'plugin-dependency-missing'
  | 'plugin-dependency-cycle'
  | 'plugin-contribution-invalid'
  | 'plugin-contribution-duplicate'
  | 'plugin-alias-invalid'
  | 'plugin-alias-conflict'
  | 'plugin-renderer-claim-invalid'
  | 'plugin-renderer-conflict'
  | 'plugin-renderer-missing'
  | 'plugin-registry-sealed'
  | 'plugin-initialization-failed'
  | 'plugin-render-failed'
  | 'plugin-element-invalid'
  | 'plugin-property-invalid';

export interface AstylarDiagnostic {
  readonly code: AstylarDiagnosticCode;
  readonly severity: AstylarDiagnosticSeverity;
  readonly message: string;
  readonly path?: string;
  readonly elementId?: string;
  readonly property?: string;
  readonly value?: unknown;
  readonly pluginId?: string;
  readonly contributionId?: string;
}

export type AstylarDiagnosticLogLevel = AstylarDiagnosticSeverity | 'silent';

export interface AstylarDiagnosticsOptions {
  /** Receives every diagnostic, regardless of the configured console level. */
  onDiagnostic?: (diagnostic: AstylarDiagnostic) => void;
  /** Defaults to `warning` in development and `error` in production. */
  logLevel?: AstylarDiagnosticLogLevel;
}

export class AstylarDiagnosticError extends Error {
  override readonly name = 'AstylarDiagnosticError';

  constructor(
    readonly diagnostic: AstylarDiagnostic,
    options?: ErrorOptions,
  ) {
    super(`${diagnostic.code}: ${diagnostic.message}`, options);
  }
}

const elementTypes = new Set([
  'div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside',
  'address', 'figure', 'figcaption', 'hgroup', 'ul', 'ol', 'li', 'dl', 'dt',
  'dd', 'menu', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
  'caption', 'col', 'colgroup', 'a', 'area', 'img', 'span', 'input', 'button',
  'form', 'select', 'textarea', 'label', 'option', 'fieldset', 'legend',
  'datalist', 'output', 'optgroup', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p',
  'br', 'wbr', 'hr', 'b', 'strong', 'i', 'em', 'cite', 'var', 'dfn', 'u',
  'ins', 's', 'strike', 'del', 'code', 'kbd', 'samp', 'pre', 'small', 'sub',
  'sup', 'blockquote', 'q', 'abbr', 'mark', 'details', 'summary', 'dialog',
  'canvas', 'iframe', 'embed', 'object', 'video', 'audio', 'map', 'param',
  'source', 'track',
]);

const styleProperties = new Set([
  'selector', 'mediaMinWidth', 'mediaMaxWidth', 'mediaMinHeight',
  'mediaMaxHeight', 'position', 'top', 'left', 'right', 'bottom', 'width',
  'height', 'boxSizing', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'background', 'borderWidth', 'borderColor', 'borderStyle', 'borderRadius',
  'boxShadow', 'polygonType', 'padding', 'paddingTop', 'paddingRight',
  'paddingBottom', 'paddingLeft', 'margin', 'marginTop', 'marginRight',
  'marginBottom', 'marginLeft', 'zIndex', 'opacity', 'transform', 'perspective',
  'listStyleType', 'listItemSpacing', 'src', 'objectFit', 'href', 'target',
  'onclick', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
  'textAlign', 'verticalAlign', 'lineHeight', 'letterSpacing', 'wordSpacing',
  'whiteSpace', 'wordWrap', 'textOverflow', 'overflow', 'textShadow',
  'textDecoration', 'textTransform', 'textStroke', 'cursor', 'display',
  'flexDirection', 'justifyContent', 'alignItems', 'alignContent', 'flexWrap',
  'gap', 'rowGap', 'columnGap', 'flexGrow', 'flexShrink', 'flexBasis', 'flex',
  'alignSelf', 'order', 'gridTemplateColumns', 'gridTemplateRows',
  'gridColumn', 'gridRow',
]);

const severityRank: Record<AstylarDiagnosticSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
};

@Injectable()
export class AstylarDiagnostics {
  private readonly entries: AstylarDiagnostic[] = [];
  private readonly seen = new Set<string>();
  private options: AstylarDiagnosticsOptions = {};

  configure(options?: AstylarDiagnosticsOptions): void {
    this.options = options ?? {};
  }

  get snapshot(): readonly AstylarDiagnostic[] {
    return [...this.entries];
  }

  report(diagnostic: AstylarDiagnostic): AstylarDiagnostic {
    const frozen = Object.freeze({ ...diagnostic });
    const key = [
      frozen.code,
      frozen.severity,
      frozen.message,
      frozen.path ?? '',
      frozen.elementId ?? '',
      frozen.property ?? '',
      frozen.pluginId ?? '',
      frozen.contributionId ?? '',
    ].join('\u0000');
    if (this.seen.has(key)) return frozen;
    this.seen.add(key);
    this.entries.push(frozen);
    this.options.onDiagnostic?.(frozen);
    this.writeToConsole(frozen);
    return frozen;
  }

  validate(
    siteData: unknown,
    registry?: AstylarCapabilityRegistry,
  ): asserts siteData is SiteData {
    if (!siteData || typeof siteData !== 'object' || Array.isArray(siteData)) {
      this.fail('malformed-site-data', 'Site data must be an object.', '$', siteData);
    }
    const candidate = siteData as Partial<SiteData>;
    if (!Array.isArray(candidate.styles)) {
      this.fail('malformed-site-data', 'Site data must contain a styles array.', '$.styles', candidate.styles);
    }
    if (!candidate.root || typeof candidate.root !== 'object' || Array.isArray(candidate.root)) {
      this.fail('invalid-root', 'Site data must contain an object root.', '$.root', candidate.root);
    }
    if (!Array.isArray(candidate.root.children)) {
      this.fail('invalid-root', 'The root must contain a children array.', '$.root.children', candidate.root.children);
    }

    const ids = new Map<string, string>();
    for (const [index, style] of candidate.styles.entries()) {
      this.validateStyle(style, `$.styles[${index}]`, undefined, registry);
    }
    candidate.root.children.forEach((element, index) => {
      this.validateElement(element, `$.root.children[${index}]`, ids, registry);
    });
  }

  private validateElement(
    value: unknown,
    path: string,
    ids: Map<string, string>,
    registry?: AstylarCapabilityRegistry,
  ): void {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      this.fail('invalid-element-type', 'Every child must be an element object.', path, value);
    }
    const element = value as DOMElement;
    const pluginElement = typeof element.type === 'string'
      ? registry?.resolveElement(element.type)
      : undefined;
    if (typeof element.type !== 'string' ||
        (!elementTypes.has(element.type) && !pluginElement)) {
      const missingContribution = typeof element.type === 'string' && element.type.includes(':')
        ? element.type
        : undefined;
      this.fail(
        'invalid-element-type',
        `Unsupported element type ${JSON.stringify(element.type)}.`,
        `${path}.type`,
        element.type,
        element.id,
        missingContribution ? contributionPluginId(missingContribution) : undefined,
        missingContribution,
      );
    }
    if (pluginElement) {
      const context: AstylarPluginValidationContext = {
        pluginId: contributionPluginId(pluginElement.id),
        contributionId: pluginElement.id,
        path,
        elementId: element.id,
      };
      const effectiveElement = {
        ...(pluginElement.defaults ?? {}),
        ...(value as Readonly<Record<string, unknown>>),
      };
      this.assertPluginValidation(
        'plugin-element-invalid',
        this.runPluginValidator(() =>
          pluginElement.validate?.(effectiveElement, context) ?? true),
        context,
        value,
      );
      const children = Array.isArray(element.children) ? element.children : [];
      if (pluginElement.children === 'none' && children.length > 0) {
        this.assertPluginValidation(
          'plugin-element-invalid',
          'This element does not accept children.',
          context,
          value,
        );
      }
      if (Array.isArray(pluginElement.children)) {
        children.forEach((child, index) => {
          const childDefinition = registry?.resolveElement(child.type);
          const childIdentity = childDefinition?.id ?? child.type;
          if (!pluginElement.children!.includes(childIdentity)) {
            this.assertPluginValidation(
              'plugin-element-invalid',
              `Child ${JSON.stringify(child.type)} is not accepted.`,
              { ...context, path: `${path}.children[${index}]` },
              child,
            );
          }
        });
      }
    }
    if (element.id) {
      const firstPath = ids.get(element.id);
      if (firstPath) {
        this.report({
          code: 'duplicate-element-id',
          severity: 'warning',
          message: `Element ID ${JSON.stringify(element.id)} is duplicated; the first occurrence is at ${firstPath}.`,
          path: `${path}.id`,
          elementId: element.id,
          value: element.id,
        });
      } else {
        ids.set(element.id, `${path}.id`);
      }
    }
    if (element.style !== undefined) {
      this.validateStyle(element.style, `${path}.style`, element.id, registry);
    }
    if (element.children !== undefined && !Array.isArray(element.children)) {
      this.fail('malformed-site-data', 'Element children must be an array.', `${path}.children`, element.children, element.id);
    }
    element.children?.forEach((child, index) => {
      this.validateElement(child, `${path}.children[${index}]`, ids, registry);
    });
  }

  private validateStyle(
    value: unknown,
    path: string,
    elementId?: string,
    registry?: AstylarCapabilityRegistry,
  ): void {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      this.fail('malformed-site-data', 'A style rule must be an object.', path, value, elementId);
    }
    for (const property of Object.keys(value)) {
      if (property === 'extensions') {
        const extensions = (value as { extensions?: unknown }).extensions;
        if (!extensions || typeof extensions !== 'object' || Array.isArray(extensions)) {
          this.fail(
            'malformed-site-data',
            'Style extensions must be an object.',
            `${path}.extensions`,
            extensions,
            elementId,
          );
        }
        for (const [identity, extensionValue] of Object.entries(extensions)) {
          const pluginProperty = registry?.resolveProperty(identity);
          if (!pluginProperty) {
            this.report({
              code: 'unsupported-style-property',
              severity: 'warning',
              message: `Plugin style property ${JSON.stringify(identity)} is not registered and will be ignored.`,
              path: `${path}.extensions.${identity}`,
              elementId,
              property: identity,
              value: extensionValue,
              pluginId: identity.includes(':') ? contributionPluginId(identity) : undefined,
              contributionId: identity.includes(':') ? identity : undefined,
            });
            continue;
          }
          const context: AstylarPluginValidationContext = {
            pluginId: contributionPluginId(pluginProperty.id),
            contributionId: pluginProperty.id,
            path: `${path}.extensions.${identity}`,
            elementId,
          };
          this.assertPluginValidation(
            'plugin-property-invalid',
            this.runPluginValidator(() => pluginProperty.validate(extensionValue, context)),
            context,
            extensionValue,
            identity,
          );
        }
        continue;
      }
      if (styleProperties.has(property)) continue;
      const pluginProperty = registry?.resolveProperty(property);
      if (pluginProperty) {
        const context: AstylarPluginValidationContext = {
          pluginId: contributionPluginId(pluginProperty.id),
          contributionId: pluginProperty.id,
          path: `${path}.${property}`,
          elementId,
        };
        this.assertPluginValidation(
          'plugin-property-invalid',
          this.runPluginValidator(() =>
            pluginProperty.validate((value as Record<string, unknown>)[property], context)),
          context,
          (value as Record<string, unknown>)[property],
          property,
        );
        continue;
      }
      this.report({
        code: 'unsupported-style-property',
        severity: 'warning',
        message: `Style property ${JSON.stringify(property)} is not supported and will be ignored.`,
        path: `${path}.${property}`,
        elementId,
        property,
        value: (value as Record<string, unknown>)[property],
      });
    }
  }

  private assertPluginValidation(
    code: 'plugin-element-invalid' | 'plugin-property-invalid',
    result: AstylarPluginValidationResult,
    context: AstylarPluginValidationContext,
    value: unknown,
    property?: string,
  ): void {
    if (result === true) return;
    const message = typeof result === 'string' ? result : result.join('; ');
    throw new AstylarDiagnosticError(this.report({
      code,
      severity: 'error',
      message,
      path: context.path,
      elementId: context.elementId,
      property,
      value,
      pluginId: context.pluginId,
      contributionId: context.contributionId,
    }));
  }

  private runPluginValidator(
    validate: () => AstylarPluginValidationResult,
  ): AstylarPluginValidationResult {
    try {
      return validate();
    } catch (error) {
      return `Validator threw: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private fail(
    code: Extract<AstylarDiagnosticCode, 'malformed-site-data' | 'invalid-root' | 'invalid-element-type'>,
    message: string,
    path: string,
    value: unknown,
    elementId?: string,
    pluginId?: string,
    contributionId?: string,
  ): never {
    throw new AstylarDiagnosticError(this.report({
      code,
      severity: 'error',
      message,
      path,
      elementId,
      value,
      pluginId,
      contributionId,
    }));
  }

  private writeToConsole(diagnostic: AstylarDiagnostic): void {
    const level = this.options.logLevel ?? (isDevMode() ? 'warning' : 'error');
    if (level === 'silent' || severityRank[diagnostic.severity] < severityRank[level]) return;
    const label = `[Astylar:${diagnostic.code}] ${diagnostic.message}`;
    if (diagnostic.severity === 'error') console.error(label, diagnostic);
    else if (diagnostic.severity === 'warning') console.warn(label, diagnostic);
    else console.info(label, diagnostic);
  }
}

function contributionPluginId(contributionId: string): string {
  return contributionId.slice(0, contributionId.indexOf(':'));
}
