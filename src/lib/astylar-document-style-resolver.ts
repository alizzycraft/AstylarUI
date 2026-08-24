import { Injectable, inject } from '@angular/core';
import type { DOMElement } from '../app/types/dom-element';
import type { SiteData } from '../app/types/site-data';
import type { StyleRule } from '../app/types/style-rule';
import { AstylarDiagnostics } from './astylar-diagnostics';
import {
  AstylarDocumentStyleSource,
  type AstylarLoadedStyleSnapshot,
} from './astylar-document-style-source';

export type AstylarLoadedInteractionState = 'hover' | 'active' | 'focus';

export interface AstylarResolvedElementStyles {
  readonly normal: Readonly<StyleRule>;
  readonly hover?: Readonly<StyleRule>;
  readonly active?: Readonly<StyleRule>;
  readonly focus?: Readonly<StyleRule>;
}

export interface AstylarResolvedDocumentStyles {
  readonly enabled: boolean;
  readonly fingerprint: string;
  readonly elements: ReadonlyMap<DOMElement, AstylarResolvedElementStyles>;
}

interface MirrorEntry {
  readonly authored: DOMElement;
  readonly mirror: HTMLElement;
  baseline: ReadonlyMap<string, string>;
}

/**
 * Browser-backed, surface-sized computed-value resolver. The resulting values
 * remain typed StyleRule records; the offscreen document never owns Astylar
 * layout, paint, semantics, or interaction.
 */
@Injectable()
export class AstylarDocumentStyleResolver {
  private readonly source = inject(AstylarDocumentStyleSource);
  private readonly diagnostics = inject(AstylarDiagnostics);
  private frame?: HTMLIFrameElement;
  private cacheKey?: string;
  private cached: AstylarResolvedDocumentStyles = EMPTY_RESOLUTION;

  resolve(
    hostDocument: Document,
    siteData: SiteData,
    viewport: Readonly<{ width: number; height: number }>,
  ): AstylarResolvedDocumentStyles {
    const snapshot = this.source.snapshot(hostDocument);
    if (!snapshot.enabled) {
      this.dispose();
      return EMPTY_RESOLUTION;
    }
    const width = Math.max(1, Math.round(viewport.width));
    const height = Math.max(1, Math.round(viewport.height));
    const key = `${snapshot.fingerprint}:${width}x${height}:${documentFingerprint(siteData)}`;
    if (key === this.cacheKey) return this.cached;

    const frame = this.ensureFrame(hostDocument, width, height);
    const resolutionDocument = frame.contentDocument;
    if (!resolutionDocument || !frame.contentWindow) {
      return EMPTY_RESOLUTION;
    }
    this.resetDocument(resolutionDocument);
    const entries = this.createMirrorTree(resolutionDocument, siteData.root.children);
    for (const entry of entries) {
      entry.baseline = captureComputedValues(frame.contentWindow, entry.mirror);
    }
    this.installStyleSheets(resolutionDocument, snapshot);

    const matchedProperties = this.collectMatchedProperties(resolutionDocument, entries);
    const elements = new Map<DOMElement, AstylarResolvedElementStyles>();
    for (const entry of entries) {
      const directProperties = matchedProperties.get(entry.mirror) ?? EMPTY_PROPERTY_SET;
      const normalComputed = captureComputedValues(frame.contentWindow, entry.mirror);
      const normal = this.translateStyle(
        entry,
        normalComputed,
        directProperties,
        undefined,
      );
      const resolved: {
        normal: Readonly<StyleRule>;
        hover?: Readonly<StyleRule>;
        active?: Readonly<StyleRule>;
        focus?: Readonly<StyleRule>;
      } = { normal: Object.freeze(normal) };

      for (const state of ['hover', 'active', 'focus'] as const) {
        this.setState(entry.mirror, state, true);
        const stateComputed = captureComputedValues(frame.contentWindow, entry.mirror);
        const stateProperties = this.collectMatchedProperties(
          resolutionDocument,
          [entry],
          'interactive',
        ).get(entry.mirror) ?? EMPTY_PROPERTY_SET;
        this.setState(entry.mirror, state, false);
        const stateRule = this.translateStateDelta(
          entry,
          normalComputed,
          stateComputed,
          stateProperties,
          state,
        );
        if (Object.keys(stateRule).length > 1) resolved[state] = Object.freeze(stateRule);
      }
      if (Object.keys(normal).length > 1 || resolved.hover || resolved.active || resolved.focus) {
        elements.set(entry.authored, Object.freeze(resolved));
      }
    }

    this.cacheKey = key;
    this.cached = Object.freeze({
      enabled: true,
      fingerprint: key,
      elements,
    });
    return this.cached;
  }

  dispose(): void {
    this.frame?.remove();
    this.frame = undefined;
    this.cacheKey = undefined;
    this.cached = EMPTY_RESOLUTION;
  }

  private ensureFrame(
    hostDocument: Document,
    width: number,
    height: number,
  ): HTMLIFrameElement {
    if (!this.frame || this.frame.ownerDocument !== hostDocument) {
      this.dispose();
      const frame = hostDocument.createElement('iframe');
      frame.dataset['astylarStyleResolver'] = '';
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      Object.assign(frame.style, {
        position: 'fixed',
        left: '-100000px',
        top: '0',
        border: '0',
        pointerEvents: 'none',
        visibility: 'hidden',
      });
      hostDocument.body.append(frame);
      this.frame = frame;
    }
    this.frame.style.width = `${width}px`;
    this.frame.style.height = `${height}px`;
    this.frame.width = String(width);
    this.frame.height = String(height);
    return this.frame;
  }

  private resetDocument(document: Document): void {
    document.head.replaceChildren();
    document.body.replaceChildren();
  }

  private createMirrorTree(
    document: Document,
    elements: readonly DOMElement[],
  ): MirrorEntry[] {
    const entries: Array<{
      authored: DOMElement;
      mirror: HTMLElement;
      baseline: ReadonlyMap<string, string>;
    }> = [];
    const create = (authored: DOMElement): HTMLElement => {
      const mirror = createMirrorElement(document, authored);
      entries.push({ authored, mirror, baseline: EMPTY_VALUE_MAP });
      for (const child of authored.children ?? []) mirror.append(create(child));
      return mirror;
    };
    for (const element of elements) document.body.append(create(element));
    return entries;
  }

  private installStyleSheets(
    document: Document,
    snapshot: AstylarLoadedStyleSnapshot,
  ): void {
    for (const [index, sheet] of snapshot.sheets.entries()) {
      const normal = document.createElement('style');
      normal.dataset['astylarLoadedStyleSource'] = sheet.source;
      normal.dataset['astylarLoadedStyleIndex'] = String(index);
      normal.textContent = sheet.cssText;
      document.head.append(normal);

      const interactiveText = serializeInteractiveRules(normal.sheet?.cssRules);
      if (interactiveText) {
        const interactive = document.createElement('style');
        interactive.dataset['astylarLoadedStyleSource'] = sheet.source;
        interactive.dataset['astylarInteractiveStyle'] = '';
        interactive.textContent = interactiveText;
        document.head.append(interactive);
      }
    }
  }

  private collectMatchedProperties(
    document: Document,
    entries: readonly MirrorEntry[],
    sheetKind: 'normal' | 'interactive' = 'normal',
  ): Map<HTMLElement, Set<string>> {
    const matched = new Map<HTMLElement, Set<string>>();
    for (const entry of entries) matched.set(entry.mirror, new Set());
    for (const sheet of Array.from(document.styleSheets)) {
      const owner = sheet.ownerNode as HTMLStyleElement | null;
      const interactive = owner?.dataset['astylarInteractiveStyle'] !== undefined;
      if ((sheetKind === 'interactive') !== interactive) continue;
      const source = owner?.dataset['astylarLoadedStyleSource'] ?? 'loaded-style';
      this.visitActiveStyleRules(document.defaultView!, sheet.cssRules, (rule, selectorText) => {
        for (const entry of entries) {
          let matches = false;
          try {
            matches = entry.mirror.matches(selectorText);
          } catch (error) {
            this.diagnostics.report({
              code: 'document-css-rule-unsupported',
              severity: 'warning',
              message: `Skipped selector ${JSON.stringify(selectorText)} from ${JSON.stringify(source)} because it cannot be matched safely.`,
              source,
              selector: selectorText,
              value: error instanceof Error ? error.message : String(error),
            });
          }
          if (!matches) continue;
          const properties = matched.get(entry.mirror)!;
          for (const property of Array.from(rule.style)) {
            if (property.startsWith('--')) continue;
            const family = CSS_PROPERTY_FAMILIES.get(property);
            if (!family) {
              if (isImplicitlyIgnoredDeclaration(property, rule.style.getPropertyValue(property))) {
                continue;
              }
              this.diagnostics.report({
                code: 'document-css-declaration-unsupported',
                severity: 'warning',
                message: `Loaded CSS property ${JSON.stringify(property)} is not translated by Astylar.`,
                source,
                selector: selectorText,
                property,
                value: rule.style.getPropertyValue(property),
                affectedElements: 1,
              });
              continue;
            }
            for (const computedProperty of family) properties.add(computedProperty);
          }
        }
      });
    }
    return matched;
  }

  private visitActiveStyleRules(
    view: Window,
    rules: CSSRuleList,
    visit: (rule: CSSStyleRule, selectorText: string) => void,
    parentSelector?: string,
  ): void {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.STYLE_RULE) {
        const styleRule = rule as CSSStyleRule & { cssRules?: CSSRuleList };
        const selectorText = resolveNestedSelector(parentSelector, styleRule.selectorText);
        if (styleRule.style.length > 0) visit(styleRule, selectorText);
        if (styleRule.cssRules?.length) {
          this.visitActiveStyleRules(view, styleRule.cssRules, visit, selectorText);
        }
        continue;
      }
      if (rule.type === CSSRule.MEDIA_RULE) {
        const media = rule as CSSMediaRule;
        if (view.matchMedia(media.conditionText).matches) {
          this.visitActiveStyleRules(view, media.cssRules, visit, parentSelector);
        }
        continue;
      }
      if (rule.type === CSSRule.SUPPORTS_RULE) {
        const supports = rule as CSSSupportsRule;
        const css = (view as unknown as { CSS?: { supports(condition: string): boolean } }).CSS;
        if (css?.supports(supports.conditionText) ?? true) {
          this.visitActiveStyleRules(view, supports.cssRules, visit, parentSelector);
        }
        continue;
      }
      const grouping = rule as CSSRule & { cssRules?: CSSRuleList };
      if (grouping.cssRules) {
        this.visitActiveStyleRules(view, grouping.cssRules, visit, parentSelector);
      }
    }
  }

  private translateStyle(
    entry: MirrorEntry,
    computed: ReadonlyMap<string, string>,
    directProperties: ReadonlySet<string>,
    state: AstylarLoadedInteractionState | undefined,
  ): StyleRule {
    const selector = internalSelector(entry.authored, state);
    const output: StyleRule = { selector };
    for (const property of SUPPORTED_COMPUTED_PROPERTIES) {
      const value = computed.get(property) ?? '';
      const baseline = entry.baseline.get(property) ?? '';
      const inheritedDifference = INHERITED_PROPERTIES.has(property) && value !== baseline;
      if (!directProperties.has(property) && !inheritedDifference) continue;
      this.assignComputed(output, property, value, entry.authored);
    }
    return output;
  }

  private translateStateDelta(
    entry: MirrorEntry,
    normal: ReadonlyMap<string, string>,
    stateValues: ReadonlyMap<string, string>,
    directProperties: ReadonlySet<string>,
    state: AstylarLoadedInteractionState,
  ): StyleRule {
    const output: StyleRule = { selector: internalSelector(entry.authored, state) };
    for (const property of SUPPORTED_COMPUTED_PROPERTIES) {
      const value = stateValues.get(property) ?? '';
      if (!directProperties.has(property) && value === (normal.get(property) ?? '')) continue;
      this.assignComputed(output, property, value, entry.authored);
    }
    return output;
  }

  private assignComputed(
    output: StyleRule,
    property: string,
    value: string,
    element: DOMElement,
  ): void {
    if (!value) return;
    const key = COMPUTED_TO_ASTYLAR.get(property);
    if (!key) return;
    let translated = value;
    if (COLOR_PROPERTIES.has(property)) {
      translated = resolveColor(value);
    } else if (property === 'background-image') {
      if (value === 'none') return;
      translated = value;
    } else if (property === 'transform') {
      translated = translateTransform(value);
      if (!translated) {
        this.diagnostics.report({
          code: 'document-css-value-unsupported',
          severity: 'warning',
          message: `Computed transform ${JSON.stringify(value)} cannot be translated safely.`,
          elementId: element.id,
          property,
          value,
        });
        return;
      }
    } else if (property === 'scale') {
      const parts = value.trim().split(/\s+/);
      if (value === 'none') return;
      if (parts.length > 1 && parts.some((part) => part !== parts[0])) {
        this.diagnostics.report({
          code: 'document-css-value-unsupported',
          severity: 'warning',
          message: `Computed individual scale ${JSON.stringify(value)} is not uniform and cannot be translated safely.`,
          elementId: element.id,
          property,
          value,
        });
        return;
      }
      translated = `scale(${parts[0]})`;
    } else if (property === 'rotate') {
      if (value === 'none') return;
      translated = `rotate(${value})`;
    } else if (property === 'translate') {
      if (value === 'none') return;
      const [x, y = '0px'] = value.trim().split(/\s+/);
      translated = `translate(${x}, ${y})`;
    }
    if (property === 'background-color') {
      if (output.background === undefined) output.background = translated;
      return;
    }
    if (property === 'background-image') {
      output.background = translated;
      return;
    }
    if (property === 'scale' || property === 'rotate' || property === 'translate') {
      output.transform = output.transform && output.transform !== 'none'
        ? `${output.transform} ${translated}`
        : translated;
      return;
    }
    (output as unknown as Record<string, unknown>)[key] = translated;
  }

  private setState(
    element: HTMLElement,
    state: AstylarLoadedInteractionState,
    enabled: boolean,
  ): void {
    const attributes = state === 'focus'
      ? ['data-astylar-focus', 'data-astylar-focus-visible']
      : [`data-astylar-${state}`];
    for (const attribute of attributes) {
      if (enabled) element.setAttribute(attribute, '');
      else element.removeAttribute(attribute);
    }
  }
}

const EMPTY_PROPERTY_SET: ReadonlySet<string> = new Set();
const EMPTY_VALUE_MAP: ReadonlyMap<string, string> = new Map();
const EMPTY_RESOLUTION: AstylarResolvedDocumentStyles = Object.freeze({
  enabled: false,
  fingerprint: 'disabled',
  elements: new Map(),
});

const COMPUTED_TO_ASTYLAR = new Map<string, keyof StyleRule>([
  ['position', 'position'], ['top', 'top'], ['right', 'right'], ['bottom', 'bottom'], ['left', 'left'],
  ['width', 'width'], ['height', 'height'], ['min-width', 'minWidth'], ['max-width', 'maxWidth'],
  ['min-height', 'minHeight'], ['max-height', 'maxHeight'], ['box-sizing', 'boxSizing'],
  ['background-color', 'background'], ['background-image', 'background'],
  ['border-top-width', 'borderWidth'], ['border-top-color', 'borderColor'],
  ['border-top-style', 'borderStyle'], ['border-top-left-radius', 'borderRadius'],
  ['box-shadow', 'boxShadow'], ['padding-top', 'paddingTop'], ['padding-right', 'paddingRight'],
  ['padding-bottom', 'paddingBottom'], ['padding-left', 'paddingLeft'], ['margin-top', 'marginTop'],
  ['margin-right', 'marginRight'], ['margin-bottom', 'marginBottom'], ['margin-left', 'marginLeft'],
  ['z-index', 'zIndex'], ['opacity', 'opacity'], ['transform', 'transform'],
  ['translate', 'transform'], ['rotate', 'transform'], ['scale', 'transform'],
  ['list-style-type', 'listStyleType'], ['object-fit', 'objectFit'], ['appearance', 'appearance'],
  ['color', 'color'],
  ['font-family', 'fontFamily'], ['font-size', 'fontSize'], ['font-weight', 'fontWeight'],
  ['font-style', 'fontStyle'], ['text-align', 'textAlign'], ['vertical-align', 'verticalAlign'],
  ['line-height', 'lineHeight'], ['letter-spacing', 'letterSpacing'], ['word-spacing', 'wordSpacing'],
  ['white-space', 'whiteSpace'], ['overflow-wrap', 'wordWrap'], ['text-overflow', 'textOverflow'],
  ['overflow', 'overflow'], ['text-shadow', 'textShadow'], ['text-decoration-line', 'textDecoration'],
  ['text-transform', 'textTransform'], ['cursor', 'cursor'], ['display', 'display'],
  ['flex-direction', 'flexDirection'], ['justify-content', 'justifyContent'],
  ['align-items', 'alignItems'], ['align-content', 'alignContent'], ['flex-wrap', 'flexWrap'],
  ['row-gap', 'rowGap'], ['column-gap', 'columnGap'], ['flex-grow', 'flexGrow'],
  ['flex-shrink', 'flexShrink'], ['flex-basis', 'flexBasis'], ['align-self', 'alignSelf'],
  ['order', 'order'], ['grid-template-columns', 'gridTemplateColumns'],
  ['grid-template-rows', 'gridTemplateRows'], ['grid-column', 'gridColumn'], ['grid-row', 'gridRow'],
]);

const SUPPORTED_COMPUTED_PROPERTIES = Object.freeze([...COMPUTED_TO_ASTYLAR.keys()]);
const COLOR_PROPERTIES = new Set(['background-color', 'border-top-color', 'color']);
const INHERITED_PROPERTIES = new Set([
  'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-align',
  'line-height', 'letter-spacing', 'word-spacing', 'white-space', 'overflow-wrap',
  'text-transform', 'cursor',
]);

const CSS_PROPERTY_FAMILIES = createPropertyFamilies();

function createPropertyFamilies(): ReadonlyMap<string, readonly string[]> {
  const map = new Map<string, readonly string[]>();
  for (const property of SUPPORTED_COMPUTED_PROPERTIES) map.set(property, [property]);
  map.set('background', ['background-color', 'background-image']);
  map.set('border', ['border-top-width', 'border-top-color', 'border-top-style']);
  map.set('border-width', ['border-top-width']);
  map.set('border-color', ['border-top-color']);
  map.set('border-style', ['border-top-style']);
  map.set('border-radius', ['border-top-left-radius']);
  map.set('padding', ['padding-top', 'padding-right', 'padding-bottom', 'padding-left']);
  map.set('margin', ['margin-top', 'margin-right', 'margin-bottom', 'margin-left']);
  map.set('padding-inline', ['padding-left', 'padding-right']);
  map.set('padding-inline-start', ['padding-left']);
  map.set('padding-inline-end', ['padding-right']);
  map.set('padding-block', ['padding-top', 'padding-bottom']);
  map.set('padding-block-start', ['padding-top']);
  map.set('padding-block-end', ['padding-bottom']);
  map.set('margin-inline', ['margin-left', 'margin-right']);
  map.set('margin-inline-start', ['margin-left']);
  map.set('margin-inline-end', ['margin-right']);
  map.set('margin-block', ['margin-top', 'margin-bottom']);
  map.set('margin-block-start', ['margin-top']);
  map.set('margin-block-end', ['margin-bottom']);
  map.set('overflow-x', ['overflow']);
  map.set('overflow-y', ['overflow']);
  map.set('gap', ['row-gap', 'column-gap']);
  map.set('flex', ['flex-grow', 'flex-shrink', 'flex-basis']);
  map.set('font', ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height']);
  map.set('text-decoration', ['text-decoration-line']);
  map.set('display', [
    'display', 'flex-direction', 'justify-content', 'align-items', 'align-content',
    'flex-wrap', 'row-gap', 'column-gap', 'grid-template-columns',
    'grid-template-rows',
  ]);
  for (const side of ['right', 'bottom', 'left']) {
    map.set(`border-${side}-width`, ['border-top-width']);
    map.set(`border-${side}-color`, ['border-top-color']);
    map.set(`border-${side}-style`, ['border-top-style']);
  }
  for (const corner of ['top-right', 'bottom-right', 'bottom-left']) {
    map.set(`border-${corner}-radius`, ['border-top-left-radius']);
  }
  return map;
}

function isImplicitlyIgnoredDeclaration(property: string, value: string): boolean {
  const defaults: Readonly<Record<string, string>> = {
    'border-image-source': 'none',
    'border-image-slice': '100%',
    'border-image-width': '1',
    'border-image-outset': '0',
    'border-image-repeat': 'stretch',
  };
  return defaults[property] === value.trim();
}

function captureComputedValues(view: Window, element: Element): ReadonlyMap<string, string> {
  const computed = view.getComputedStyle(element);
  return new Map(SUPPORTED_COMPUTED_PROPERTIES.map((property) => [
    property,
    computed.getPropertyValue(property).trim(),
  ]));
}

function createMirrorElement(document: Document, element: DOMElement): HTMLElement {
  const type = /^[a-z][a-z0-9-]*$/i.test(element.type) && !element.type.includes(':')
    ? element.type
    : 'div';
  const mirror = document.createElement(type) as HTMLElement;
  if (element.id) mirror.id = element.id;
  if (element.class) mirror.className = element.class;
  if (element.textContent !== undefined) mirror.textContent = element.textContent;
  for (const [name, value] of [
    ['title', element.title], ['lang', element.lang], ['dir', element.dir],
    ['name', element.name], ['placeholder', element.placeholder], ['href', element.href],
  ] as const) {
    if (value !== undefined) mirror.setAttribute(name, String(value));
  }
  for (const [name, value] of [
    ['disabled', element.disabled], ['required', element.required], ['readonly', element.readonly],
    ['checked', element.checked], ['selected', element.selected], ['multiple', element.multiple],
    ['open', element.open], ['hidden', element.hidden],
  ] as const) {
    if (value) mirror.setAttribute(name, '');
  }
  // Mirror nodes belong to the resolver iframe realm, so parent-window
  // constructors cannot be used for instanceof checks here.
  if (mirror.localName === 'input') {
    const input = mirror as HTMLInputElement;
    input.type = element.inputType ?? 'text';
    if (element.value !== undefined) input.value = element.value;
    input.checked = element.checked === true;
  } else if (mirror.localName === 'textarea') {
    (mirror as HTMLTextAreaElement).value = element.value ?? element.textContent ?? '';
  } else if (mirror.localName === 'select' && element.options) {
    const select = mirror as HTMLSelectElement;
    for (const option of element.options) {
      const node = document.createElement('option');
      node.value = String(option.value);
      node.textContent = option.label;
      node.disabled = option.disabled === true;
      node.selected = String(element.value) === String(option.value);
      select.append(node);
    }
  }
  return mirror;
}

function serializeInteractiveRules(
  rules: CSSRuleList | undefined,
  parentSelector?: string,
): string {
  if (!rules) return '';
  const output: string[] = [];
  for (const rule of Array.from(rules)) {
    if (rule.type === CSSRule.STYLE_RULE) {
      const styleRule = rule as CSSStyleRule & { cssRules?: CSSRuleList };
      const resolvedSelector = resolveNestedSelector(parentSelector, styleRule.selectorText);
      const selector = rewriteInteractiveSelector(resolvedSelector);
      if (selector !== resolvedSelector && styleRule.style.length > 0) {
        output.push(`${selector} { ${styleRule.style.cssText} }`);
      }
      const nested = serializeInteractiveRules(styleRule.cssRules, resolvedSelector);
      if (nested) output.push(nested);
      continue;
    }
    const grouping = rule as CSSRule & { cssRules?: CSSRuleList; conditionText?: string; name?: string };
    if (!grouping.cssRules) continue;
    const nested = serializeInteractiveRules(grouping.cssRules, parentSelector);
    if (!nested) continue;
    if (rule.type === CSSRule.MEDIA_RULE) {
      output.push(`@media ${(rule as CSSMediaRule).conditionText} { ${nested} }`);
    } else if (rule.type === CSSRule.SUPPORTS_RULE) {
      output.push(`@supports ${(rule as CSSSupportsRule).conditionText} { ${nested} }`);
    } else if (rule.cssText.trimStart().startsWith('@layer')) {
      const header = rule.cssText.slice(0, rule.cssText.indexOf('{')).trim();
      output.push(`${header} { ${nested} }`);
    }
  }
  return output.join('\n');
}

function resolveNestedSelector(parentSelector: string | undefined, selector: string): string {
  if (!parentSelector) return selector;
  return selector.includes('&')
    ? selector.replaceAll('&', `:is(${parentSelector})`)
    : `${parentSelector} ${selector}`;
}

function rewriteInteractiveSelector(selector: string): string {
  return selector
    // Tailwind encodes variants inside escaped class names (for example,
    // `.tw\:hover\:bg-blue-500:hover`). Only rewrite the real pseudo-class;
    // rewriting an escaped colon corrupts the class selector itself.
    .replace(/(?<!\\):focus-visible(?![\w-])/g, '[data-astylar-focus-visible]')
    .replace(/(?<!\\):focus(?![\w-])/g, '[data-astylar-focus]')
    .replace(/(?<!\\):hover(?![\w-])/g, '[data-astylar-hover]')
    .replace(/(?<!\\):active(?![\w-])/g, '[data-astylar-active]');
}

function internalSelector(
  element: DOMElement,
  state?: AstylarLoadedInteractionState,
): string {
  const base = element.id ? `#${element.id}` : element.type;
  return state ? `${base}:${state}` : base;
}

function resolveColor(value: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return value;
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = '#000000';
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  const opacity = Math.round((alpha / 255) * 1000) / 1000;
  return opacity >= 1
    ? `rgb(${red}, ${green}, ${blue})`
    : `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function translateTransform(value: string): string {
  if (!value || value === 'none') return 'none';
  const matrix = value.match(/^matrix\(([^)]+)\)$/);
  if (!matrix) return value.includes('matrix3d(') ? '' : value;
  const values = matrix[1].split(',').map((entry) => Number.parseFloat(entry.trim()));
  if (values.length !== 6 || values.some(Number.isNaN)) return '';
  const [a, b, c, d, e, f] = values;
  const scaleX = Math.hypot(a, b);
  const determinant = a * d - b * c;
  const scaleY = scaleX === 0 ? Math.hypot(c, d) : determinant / scaleX;
  const angle = Math.atan2(b, a) * 180 / Math.PI;
  const parts: string[] = [];
  if (Math.abs(e) > 0.0001 || Math.abs(f) > 0.0001) parts.push(`translate(${trim(e)}px, ${trim(f)}px)`);
  if (Math.abs(angle) > 0.0001) parts.push(`rotate(${trim(angle)}deg)`);
  if (Math.abs(scaleX - 1) > 0.0001 || Math.abs(scaleY - 1) > 0.0001) {
    parts.push(Math.abs(scaleX - scaleY) < 0.0001
      ? `scale(${trim(scaleX)})`
      : `scale(${trim(scaleX)}, ${trim(scaleY)})`);
  }
  return parts.join(' ') || 'none';
}

function trim(value: number): string {
  return String(Math.round(value * 10000) / 10000);
}

function documentFingerprint(siteData: SiteData): string {
  const visit = (element: DOMElement): unknown => ({
    type: element.type,
    id: element.id,
    class: element.class,
    textContent: element.textContent,
    value: element.value,
    checked: element.checked,
    disabled: element.disabled,
    required: element.required,
    readonly: element.readonly,
    selected: element.selected,
    hidden: element.hidden,
    children: element.children?.map(visit),
  });
  return JSON.stringify(siteData.root.children.map(visit));
}
