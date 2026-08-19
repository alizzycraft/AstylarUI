import { Injectable, isDevMode } from '@angular/core';
import type { DOMElement } from '../app/types/dom-element';
import type { SiteData } from '../app/types/site-data';

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
  | 'render-failed';

export interface AstylarDiagnostic {
  readonly code: AstylarDiagnosticCode;
  readonly severity: AstylarDiagnosticSeverity;
  readonly message: string;
  readonly path?: string;
  readonly elementId?: string;
  readonly property?: string;
  readonly value?: unknown;
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

  constructor(readonly diagnostic: AstylarDiagnostic) {
    super(`${diagnostic.code}: ${diagnostic.message}`);
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
    ].join('\u0000');
    if (this.seen.has(key)) return frozen;
    this.seen.add(key);
    this.entries.push(frozen);
    this.options.onDiagnostic?.(frozen);
    this.writeToConsole(frozen);
    return frozen;
  }

  validate(siteData: unknown): asserts siteData is SiteData {
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
      this.validateStyle(style, `$.styles[${index}]`);
    }
    candidate.root.children.forEach((element, index) => {
      this.validateElement(element, `$.root.children[${index}]`, ids);
    });
  }

  private validateElement(
    value: unknown,
    path: string,
    ids: Map<string, string>,
  ): void {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      this.fail('invalid-element-type', 'Every child must be an element object.', path, value);
    }
    const element = value as DOMElement;
    if (typeof element.type !== 'string' || !elementTypes.has(element.type)) {
      this.fail(
        'invalid-element-type',
        `Unsupported element type ${JSON.stringify(element.type)}.`,
        `${path}.type`,
        element.type,
        element.id,
      );
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
    if (element.style !== undefined) this.validateStyle(element.style, `${path}.style`, element.id);
    if (element.children !== undefined && !Array.isArray(element.children)) {
      this.fail('malformed-site-data', 'Element children must be an array.', `${path}.children`, element.children, element.id);
    }
    element.children?.forEach((child, index) => {
      this.validateElement(child, `${path}.children[${index}]`, ids);
    });
  }

  private validateStyle(value: unknown, path: string, elementId?: string): void {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      this.fail('malformed-site-data', 'A style rule must be an object.', path, value, elementId);
    }
    for (const property of Object.keys(value)) {
      if (styleProperties.has(property)) continue;
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

  private fail(
    code: Extract<AstylarDiagnosticCode, 'malformed-site-data' | 'invalid-root' | 'invalid-element-type'>,
    message: string,
    path: string,
    value: unknown,
    elementId?: string,
  ): never {
    throw new AstylarDiagnosticError(this.report({
      code,
      severity: 'error',
      message,
      path,
      elementId,
      value,
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
