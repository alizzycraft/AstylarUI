import { DOMElement, DOMElementType } from '../app/types/dom-element';
import { SiteData } from '../app/types/site-data';

export interface AstylarSemanticSnapshot {
  nodes: number;
  eventRegistrations: number;
  observerRegistrations: number;
}

export interface AstylarSemanticBridgeOptions {
  host?: HTMLElement;
}

/**
 * Maintains the browser-owned semantic counterpart of an Astylar scene.
 *
 * The bridge is intentionally nonvisual. Babylon remains the only visual
 * renderer, while native elements give browsers and assistive technology a
 * familiar document structure. Stable authored IDs retain their native node
 * identity across compatible SiteData updates.
 */
export class AstylarSemanticBridge {
  private static nextInstanceId = 1;

  private readonly prefix = `astylar-semantic-${AstylarSemanticBridge.nextInstanceId++}-`;
  private readonly root: HTMLDivElement;
  private readonly nodes = new Map<string, HTMLElement>();
  private readonly textNodes = new Map<string, Text>();
  private readonly previousCanvasAriaHidden: string | null;
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: AstylarSemanticBridgeOptions = {},
  ) {
    const document = canvas.ownerDocument;
    this.root = document.createElement('div');
    this.root.dataset['astylarSemanticRoot'] = '';
    this.root.id = `${this.prefix}root`;
    this.root.style.cssText = [
      'position:absolute',
      'width:1px',
      'height:1px',
      'padding:0',
      'margin:-1px',
      'overflow:hidden',
      'clip:rect(0,0,0,0)',
      'white-space:nowrap',
      'border:0',
    ].join(';');
    this.previousCanvasAriaHidden = canvas.getAttribute('aria-hidden');
    canvas.setAttribute('aria-hidden', 'true');
    (options.host ?? canvas.parentElement ?? document.body).appendChild(this.root);
  }

  get element(): HTMLElement {
    return this.root;
  }

  get snapshot(): AstylarSemanticSnapshot {
    return {
      nodes: this.nodes.size,
      eventRegistrations: 0,
      observerRegistrations: 0,
    };
  }

  reconcile(siteData: SiteData): void {
    if (this.disposed) return;
    const idCounts = this.countIds(siteData.root.children);
    const liveKeys = new Set<string>();
    const children = siteData.root.children
      .filter((element) => !element.hidden)
      .map((element, index) => this.reconcileElement(
        element,
        `root/${index}:${element.type}`,
        idCounts,
        liveKeys,
      ));
    this.root.replaceChildren(...children);

    for (const [key, node] of this.nodes) {
      if (liveKeys.has(key)) continue;
      node.remove();
      this.nodes.delete(key);
      this.textNodes.delete(key);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.root.remove();
    this.nodes.clear();
    this.textNodes.clear();
    if (this.previousCanvasAriaHidden === null) {
      this.canvas.removeAttribute('aria-hidden');
    } else {
      this.canvas.setAttribute('aria-hidden', this.previousCanvasAriaHidden);
    }
  }

  private reconcileElement(
    element: DOMElement,
    path: string,
    idCounts: Map<string, number>,
    liveKeys: Set<string>,
  ): HTMLElement {
    const key = element.id && idCounts.get(element.id) === 1 ? `id:${element.id}` : path;
    liveKeys.add(key);
    const tagName = this.semanticTagName(element.type);
    let node = this.nodes.get(key);
    if (!node || node.tagName.toLowerCase() !== tagName) {
      const replacement = this.canvas.ownerDocument.createElement(tagName);
      node?.replaceWith(replacement);
      node = replacement;
      this.nodes.set(key, node);
    }
    this.applyAttributes(node, element);

    const childNodes: Node[] = [];
    if (element.textContent) {
      let text = this.textNodes.get(key);
      if (!text) {
        text = this.canvas.ownerDocument.createTextNode(element.textContent);
        this.textNodes.set(key, text);
      } else {
        text.data = element.textContent;
      }
      childNodes.push(text);
    } else {
      this.textNodes.delete(key);
    }
    for (const [index, child] of (element.children ?? []).entries()) {
      if (child.hidden) continue;
      childNodes.push(this.reconcileElement(
        child,
        `${path}/${index}:${child.type}`,
        idCounts,
        liveKeys,
      ));
    }
    node.replaceChildren(...childNodes);
    return node;
  }

  private applyAttributes(node: HTMLElement, element: DOMElement): void {
    for (const attribute of [...node.attributes]) {
      node.removeAttribute(attribute.name);
    }
    node.dataset['astylarId'] = element.id ?? '';
    if (element.id) node.id = this.nativeId(element.id);
    if (element.class) node.className = element.class;
    if (element.title) node.title = element.title;
    if (element.lang) node.lang = element.lang;
    if (element.dir) node.dir = element.dir;
    if (element.tabindex !== undefined) node.tabIndex = element.tabindex;

    if (element.href && node instanceof HTMLAnchorElement) node.href = element.href;
    if (element.target && node instanceof HTMLAnchorElement) node.target = element.target;
    if (element.alt !== undefined && node instanceof HTMLImageElement) node.alt = element.alt;
    if (element.src && node instanceof HTMLImageElement) node.src = element.src;
    if (element.scope && node instanceof HTMLTableCellElement) node.scope = element.scope;
    if (element.colspan && node instanceof HTMLTableCellElement) node.colSpan = element.colspan;
    if (element.rowspan && node instanceof HTMLTableCellElement) node.rowSpan = element.rowspan;
    if (element.for && node instanceof HTMLLabelElement) node.htmlFor = this.nativeId(element.for);
  }

  private nativeId(authoredId: string): string {
    return `${this.prefix}${authoredId}`;
  }

  private semanticTagName(type: DOMElementType): string {
    // These types are all valid native semantic elements. Area is only useful
    // inside an image map and is kept generic until that subset is supported.
    return type === 'area' || type === 'canvas' ? 'div' : type;
  }

  private countIds(elements: DOMElement[]): Map<string, number> {
    const counts = new Map<string, number>();
    const visit = (element: DOMElement): void => {
      if (element.id) counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
      element.children?.forEach(visit);
    };
    elements.forEach(visit);
    return counts;
  }
}
