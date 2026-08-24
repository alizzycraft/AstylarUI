import { Injectable, inject } from '@angular/core';
import { AstylarDiagnostics } from './astylar-diagnostics';
import { ASTYLAR_CSS_OPTIONS } from './astylar-plugin';

export interface AstylarLoadedStyleSheet {
  readonly source: string;
  readonly cssText: string;
}

export interface AstylarLoadedStyleSnapshot {
  readonly enabled: boolean;
  readonly fingerprint: string;
  readonly sheets: readonly AstylarLoadedStyleSheet[];
}

interface StyleSheetLike {
  readonly cssRules: CSSRuleList;
  readonly disabled?: boolean;
  readonly href?: string | null;
  readonly media?: MediaList;
  readonly ownerNode?: Node | null;
}

/**
 * Surface-scoped discovery and observation for CSS already loaded by a browser
 * document. It intentionally performs no network requests and creates no
 * browser objects during construction, which keeps provider/SSR evaluation pure.
 */
@Injectable()
export class AstylarDocumentStyleSource {
  private readonly options = inject(ASTYLAR_CSS_OPTIONS);
  private readonly diagnostics = inject(AstylarDiagnostics);
  private observer?: MutationObserver;
  private observedDocument?: Document;
  private loadListener?: EventListener;
  private invalidationQueued = false;
  private invalidationTimer?: number;

  get enabled(): boolean {
    return this.options.useDocumentStyles === true;
  }

  snapshot(document: Document): AstylarLoadedStyleSnapshot {
    if (!this.enabled) return EMPTY_SNAPSHOT;

    const discovered = this.discoverStyleSheets(document);
    const sheets: AstylarLoadedStyleSheet[] = [];
    discovered.forEach((sheet, index) => {
      if (sheet.disabled) return;
      const source = this.describeStyleSheet(sheet, index);
      try {
        const cssText = this.serializeRules(sheet.cssRules, source);
        const media = sheet.media?.mediaText.trim();
        sheets.push(Object.freeze({
          source,
          cssText: media && media !== 'all'
            ? `@media ${media} {\n${cssText}\n}`
            : cssText,
        }));
      } catch (error) {
        this.diagnostics.report({
          code: 'document-stylesheet-inaccessible',
          severity: 'warning',
          message: `Skipped loaded stylesheet ${JSON.stringify(source)} because its CSS rules are not inspectable.`,
          source,
          value: error instanceof Error ? error.message : String(error),
        });
      }
    });

    const fingerprintInput = sheets
      .map(({ source, cssText }) => `${source}\u0000${cssText}`)
      .join('\u0001');
    return Object.freeze({
      enabled: true,
      fingerprint: fingerprint(fingerprintInput),
      sheets: Object.freeze(sheets),
    });
  }

  observe(document: Document, invalidate: () => void): () => void {
    if (!this.enabled || typeof MutationObserver === 'undefined') return () => undefined;
    this.disconnect();
    this.observedDocument = document;
    const queueInvalidation = (): void => {
      if (this.invalidationQueued) return;
      this.invalidationQueued = true;
      this.invalidationTimer = document.defaultView?.setTimeout(() => {
        this.invalidationTimer = undefined;
        this.invalidationQueued = false;
        if (this.observedDocument === document) invalidate();
      }, 0);
    };
    this.observer = new MutationObserver((records) => {
      if (records.some(isStylesheetMutation)) queueInvalidation();
    });
    this.observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['disabled', 'href', 'media', 'rel'],
    });
    this.loadListener = (event) => {
      if (isStylesheetLink(event.target)) queueInvalidation();
    };
    document.addEventListener('load', this.loadListener, true);
    return () => this.disconnect();
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    if (this.observedDocument && this.loadListener) {
      this.observedDocument.removeEventListener('load', this.loadListener, true);
    }
    this.observedDocument = undefined;
    this.loadListener = undefined;
    if (this.invalidationTimer !== undefined) {
      globalThis.clearTimeout(this.invalidationTimer);
      this.invalidationTimer = undefined;
    }
    this.invalidationQueued = false;
  }

  /** @internal Narrow seam used by CSSOM unit tests. */
  snapshotStyleSheets(sheets: readonly StyleSheetLike[]): AstylarLoadedStyleSnapshot {
    if (!this.enabled) return EMPTY_SNAPSHOT;
    const loaded: AstylarLoadedStyleSheet[] = [];
    sheets.forEach((sheet, index) => {
      if (sheet.disabled) return;
      const source = this.describeStyleSheet(sheet, index);
      try {
        loaded.push(Object.freeze({ source, cssText: this.serializeRules(sheet.cssRules, source) }));
      } catch (error) {
        this.diagnostics.report({
          code: 'document-stylesheet-inaccessible',
          severity: 'warning',
          message: `Skipped loaded stylesheet ${JSON.stringify(source)} because its CSS rules are not inspectable.`,
          source,
          value: error instanceof Error ? error.message : String(error),
        });
      }
    });
    const fingerprintInput = loaded
      .map(({ source, cssText }) => `${source}\u0000${cssText}`)
      .join('\u0001');
    return Object.freeze({
      enabled: true,
      fingerprint: fingerprint(fingerprintInput),
      sheets: Object.freeze(loaded),
    });
  }

  private discoverStyleSheets(document: Document): StyleSheetLike[] {
    const sheets: StyleSheetLike[] = [...Array.from(document.styleSheets)];
    const adopted = 'adoptedStyleSheets' in document
      ? Array.from(document.adoptedStyleSheets)
      : [];
    for (const sheet of adopted) {
      if (!sheets.includes(sheet)) sheets.push(sheet);
    }
    return sheets;
  }

  private serializeRules(rules: CSSRuleList, source: string): string {
    return Array.from(rules)
      .map((rule) => this.serializeRule(rule, source))
      .filter(Boolean)
      .join('\n');
  }

  private serializeRule(rule: CSSRule, source: string): string {
    if (typeof CSSImportRule !== 'undefined' && rule instanceof CSSImportRule) {
      if (!rule.styleSheet) return '';
      const importedSource = rule.href || source;
      try {
        let imported = this.serializeRules(rule.styleSheet.cssRules, importedSource);
        const media = rule.media.mediaText.trim();
        if (media && media !== 'all') imported = `@media ${media} {\n${imported}\n}`;
        const layerName = 'layerName' in rule ? String(rule.layerName ?? '').trim() : '';
        if (layerName) imported = `@layer ${layerName} {\n${imported}\n}`;
        return imported;
      } catch (error) {
        this.diagnostics.report({
          code: 'document-stylesheet-inaccessible',
          severity: 'warning',
          message: `Skipped imported stylesheet ${JSON.stringify(importedSource)} because its CSS rules are not inspectable.`,
          source: importedSource,
          value: error instanceof Error ? error.message : String(error),
        });
        return '';
      }
    }
    return rule.cssText;
  }

  private describeStyleSheet(sheet: StyleSheetLike, index: number): string {
    if (sheet.href) return sheet.href;
    const owner = sheet.ownerNode;
    if (owner instanceof HTMLStyleElement) {
      return owner.id ? `style#${owner.id}` : `style[${index}]`;
    }
    return owner ? `document-style[${index}]` : `adopted-style[${index}]`;
  }
}

const EMPTY_SNAPSHOT: AstylarLoadedStyleSnapshot = Object.freeze({
  enabled: false,
  fingerprint: 'disabled',
  sheets: Object.freeze([]),
});

function fingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function isStylesheetMutation(record: MutationRecord): boolean {
  if (record.type === 'characterData') {
    return record.target.parentElement?.closest('style') !== null;
  }
  if (record.type === 'attributes') {
    return record.target instanceof HTMLStyleElement || isStylesheetLink(record.target);
  }
  if (record.target instanceof HTMLStyleElement) return true;
  return [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)]
    .some((node) => node instanceof HTMLStyleElement || isStylesheetLink(node) ||
      (node instanceof Element && !!node.querySelector('style, link[rel~="stylesheet"]')));
}

function isStylesheetLink(value: unknown): value is HTMLLinkElement {
  return value instanceof HTMLLinkElement && value.relList.contains('stylesheet');
}
