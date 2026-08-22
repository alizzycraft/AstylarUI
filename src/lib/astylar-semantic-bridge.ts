import { DOMElement, DOMElementType } from '../app/types/dom-element';
import { SiteData } from '../app/types/site-data';
import {
  areAstylarReconciliationNodesCompatible,
  AstylarReconciliationIdentityIndex,
  astylarChildReconciliationPath,
} from './astylar-reconciliation-identity';
import type { AstylarReconciliationIdentitySnapshot } from './astylar-reconciliation-identity';

export interface AstylarSemanticReconciliationSnapshot {
  reused: number;
  created: number;
  replaced: number;
  disposed: number;
}

export interface AstylarSemanticSnapshot {
  nodes: number;
  eventRegistrations: number;
  observerRegistrations: number;
  identities: AstylarReconciliationIdentitySnapshot;
  reconciliation: AstylarSemanticReconciliationSnapshot;
}

export interface AstylarSemanticBridgeOptions {
  host?: HTMLElement;
}

/** Mutable browser-facing state owned by an Astylar control instance. */
export interface AstylarSemanticControlState {
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
  readonly?: boolean;
  selectedIndex?: number;
  expanded?: boolean;
  selectionStart?: number;
  selectionEnd?: number;
  selectionDirection?: 'forward' | 'backward' | 'none';
}

/** Routes native semantic input into the scene's existing interaction owner. */
export interface AstylarSemanticInteractionAdapter {
  getFocusedElementId(): string | undefined;
  focus(elementId: string, preservePreviousSelectionOnReset?: boolean): boolean;
  blur(elementId: string): boolean;
  activate(elementId: string): boolean;
  keyDown(event: KeyboardEvent): void;
  keyUp(event: KeyboardEvent): void;
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
  private readonly elements = new Map<string, DOMElement>();
  private readonly previousCanvasAriaHidden: string | null;
  private readonly previousCanvasTabIndex: string | null;
  private identitySnapshot: AstylarReconciliationIdentitySnapshot = {
    totalNodes: 0,
    uniqueAuthoredIds: 0,
    anonymousNodes: 0,
    duplicateAuthoredIds: [],
    duplicateNodes: 0,
  };
  private reconciliationSnapshot: AstylarSemanticReconciliationSnapshot = {
    reused: 0,
    created: 0,
    replaced: 0,
    disposed: 0,
  };
  private interactionAdapter?: AstylarSemanticInteractionAdapter;
  private controlSyncQueued = false;
  private focusSyncQueued = false;
  private preserveSelectionForNextFocus = false;
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
    this.previousCanvasTabIndex = canvas.getAttribute('tabindex');
    canvas.setAttribute('aria-hidden', 'true');
    (options.host ?? canvas.parentElement ?? document.body).appendChild(this.root);
  }

  get element(): HTMLElement {
    return this.root;
  }

  get snapshot(): AstylarSemanticSnapshot {
    return {
      nodes: this.nodes.size,
      eventRegistrations: this.interactionAdapter ? 5 : 0,
      observerRegistrations: 0,
      identities: this.identitySnapshot,
      reconciliation: this.reconciliationSnapshot,
    };
  }

  reconcile(siteData: SiteData): void {
    if (this.disposed) return;
    const identities = new AstylarReconciliationIdentityIndex(siteData.root.children);
    this.identitySnapshot = identities.snapshot;
    this.reconciliationSnapshot = { reused: 0, created: 0, replaced: 0, disposed: 0 };
    const liveKeys = new Set<string>();
    const children = siteData.root.children
      .filter((element) => !element.hidden)
      .map((element, index) => this.reconcileElement(
        element,
        `root/${index}:${element.type}`,
        identities,
        liveKeys,
      ));
    this.root.replaceChildren(...children);
    this.applyModalInertness(siteData);

    for (const [key, node] of this.nodes) {
      if (liveKeys.has(key)) continue;
      node.remove();
      this.nodes.delete(key);
      this.textNodes.delete(key);
      this.elements.delete(key);
      this.reconciliationSnapshot.disposed += 1;
    }
  }

  /** Synchronizes live scene control state without rebuilding the semantic tree. */
  syncControlStates(
    getState: (elementId: string) => AstylarSemanticControlState | undefined,
  ): void {
    if (this.disposed) return;
    for (const node of this.nodes.values()) {
      const elementId = node.dataset['astylarId'];
      if (!elementId) continue;
      const state = getState(elementId);
      if (state) this.applyControlState(node, state);
    }
  }

  /** Coalesces state changes produced during one native input/default-action turn. */
  queueControlStateSync(
    getState: (elementId: string) => AstylarSemanticControlState | undefined,
  ): void {
    if (this.disposed || this.controlSyncQueued) return;
    this.controlSyncQueued = true;
    queueMicrotask(() => {
      this.controlSyncQueued = false;
      this.syncControlStates(getState);
    });
  }

  /** Connects delegated semantic input to one scene interaction runtime. */
  connectInteractions(adapter: AstylarSemanticInteractionAdapter): void {
    if (this.disposed) return;
    if (!this.interactionAdapter) {
      this.root.addEventListener('focusin', this.handleFocusIn);
      this.root.addEventListener('focusout', this.handleFocusOut);
      this.root.addEventListener('keydown', this.handleKeyDown);
      this.root.addEventListener('keyup', this.handleKeyUp);
      this.root.addEventListener('click', this.handleClick);
    }
    this.interactionAdapter = adapter;
    // Programmatic focus still works for scene pointer input, but browser Tab
    // reaches the authored semantic controls instead of the implementation canvas.
    this.canvas.tabIndex = -1;
  }

  /** Synchronizes native accessibility focus from the scene after one event turn. */
  queueFocusSync(
    getFocusedElementId: () => string | undefined,
    keepCanvasFocus: (elementId: string) => boolean = () => false,
  ): void {
    if (this.disposed || this.focusSyncQueued) return;
    this.focusSyncQueued = true;
    queueMicrotask(() => {
      this.focusSyncQueued = false;
      const elementId = getFocusedElementId();
      this.syncFocus(elementId, !!elementId && keepCanvasFocus(elementId));
    });
  }

  /** Applies live modal visibility/inertness without rebuilding authored semantics. */
  setModalPresentation(elementId: string, open: boolean): void {
    if (this.disposed) return;
    const dialog = [...this.nodes.values()].find((node) =>
      node.dataset['astylarId'] === elementId && node instanceof HTMLDialogElement);
    if (dialog instanceof HTMLDialogElement) dialog.open = open;
    this.clearModalInertness();
    if (open && dialog instanceof HTMLDialogElement) this.applyModalInertnessFor(dialog);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.root.remove();
    this.disconnectInteractions();
    this.nodes.clear();
    this.textNodes.clear();
    this.elements.clear();
    if (this.previousCanvasAriaHidden === null) {
      this.canvas.removeAttribute('aria-hidden');
    } else {
      this.canvas.setAttribute('aria-hidden', this.previousCanvasAriaHidden);
    }
    if (this.previousCanvasTabIndex === null) {
      this.canvas.removeAttribute('tabindex');
    } else {
      this.canvas.setAttribute('tabindex', this.previousCanvasTabIndex);
    }
  }

  private readonly handleFocusIn = (event: FocusEvent): void => {
    const elementId = this.semanticEventElementId(event);
    if (elementId) {
      this.interactionAdapter?.focus(elementId, this.preserveSelectionForNextFocus);
      this.preserveSelectionForNextFocus = false;
    }
  };

  private readonly handleFocusOut = (event: FocusEvent): void => {
    const elementId = this.semanticEventElementId(event);
    if (!elementId) return;
    // Native focusout fires before Babylon's canvas pointer observer. A task
    // boundary lets that observer preserve browser ordering (pointerdown before
    // change/blur) and makes this a no-op when it establishes the next focus.
    setTimeout(() => {
      const active = this.canvas.ownerDocument.activeElement;
      if (active instanceof HTMLElement &&
          this.root.contains(active) &&
          active.dataset['astylarId'] === elementId) return;
      if (active === (this.canvas as unknown as Element) &&
          this.interactionAdapter?.getFocusedElementId() === elementId) return;
      this.interactionAdapter?.blur(elementId);
    }, 0);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.interactionAdapter?.keyDown(event);
    if (event.key === 'Tab' && !event.defaultPrevented) {
      this.preserveSelectionForNextFocus = true;
    }
    if (event.key !== 'Tab') event.preventDefault();
    event.stopPropagation();
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.interactionAdapter?.keyUp(event);
    if (event.key === 'Tab') this.preserveSelectionForNextFocus = false;
    if (event.key !== 'Tab') event.preventDefault();
    event.stopPropagation();
  };

  private readonly handleClick = (event: MouseEvent): void => {
    const elementId = this.semanticEventElementId(event);
    if (!elementId) return;
    event.preventDefault();
    event.stopPropagation();
    this.interactionAdapter?.activate(elementId);
  };

  private semanticEventElementId(event: Event): string | undefined {
    const target = event.target;
    if (!(target instanceof Element)) return undefined;
    const semantic = target.closest<HTMLElement>('[data-astylar-id]');
    if (!semantic || !this.root.contains(semantic)) return undefined;
    return semantic.dataset['astylarId'] || undefined;
  }

  private syncFocus(elementId: string | undefined, keepCanvasFocus = false): void {
    const active = this.canvas.ownerDocument.activeElement;
    const activeSemantic = active instanceof HTMLElement && this.root.contains(active)
      ? active
      : undefined;
    if (!elementId) {
      activeSemantic?.blur();
      return;
    }
    const node = [...this.nodes.values()].find((candidate) =>
      candidate.dataset['astylarId'] === elementId);
    // Astylar's text editor owns directional pointer selection. Moving browser
    // focus into its semantic mirror while a range is selected collapses that
    // richer scene state. Collapsed carets can safely use native focus (and its
    // browser Tab order); native/AT focus always routes into the scene.
    if (keepCanvasFocus) {
      if (activeSemantic && activeSemantic !== node) activeSemantic.blur();
      if (active !== node) this.canvas.focus({ preventScroll: true });
      return;
    }
    if (node && active !== node) node.focus({ preventScroll: true });
  }

  private disconnectInteractions(): void {
    if (!this.interactionAdapter) return;
    this.root.removeEventListener('focusin', this.handleFocusIn);
    this.root.removeEventListener('focusout', this.handleFocusOut);
    this.root.removeEventListener('keydown', this.handleKeyDown);
    this.root.removeEventListener('keyup', this.handleKeyUp);
    this.root.removeEventListener('click', this.handleClick);
    this.interactionAdapter = undefined;
  }

  private reconcileElement(
    element: DOMElement,
    path: string,
    identities: AstylarReconciliationIdentityIndex,
    liveKeys: Set<string>,
  ): HTMLElement {
    const key = identities.key(element, path);
    liveKeys.add(key);
    const tagName = this.semanticTagName(element.type);
    let node = this.nodes.get(key);
    const previousElement = this.elements.get(key);
    if (!node || !previousElement ||
        !areAstylarReconciliationNodesCompatible(previousElement, element) ||
        node.tagName.toLowerCase() !== tagName) {
      const replacement = this.canvas.ownerDocument.createElement(tagName);
      node?.replaceWith(replacement);
      if (node) {
        this.reconciliationSnapshot.replaced += 1;
      } else {
        this.reconciliationSnapshot.created += 1;
      }
      node = replacement;
      this.nodes.set(key, node);
    } else {
      this.reconciliationSnapshot.reused += 1;
    }
    // Store the compatibility fields by value so an author mutating and reusing
    // the same SiteData object cannot rewrite our previous-owner record.
    this.elements.set(key, { ...element });
    this.applyAttributes(node, element);

    const childNodes: Node[] = [];
    const semanticText = element.textContent ??
      (element.type === 'button' ? String(element.value ?? '') : '');
    if (semanticText) {
      let text = this.textNodes.get(key);
      if (!text) {
        text = this.canvas.ownerDocument.createTextNode(semanticText);
        this.textNodes.set(key, text);
      } else if (text.data !== semanticText) {
        text.data = semanticText;
      }
      childNodes.push(text);
    } else {
      this.textNodes.delete(key);
    }
    for (const [index, child] of this.semanticChildren(element).entries()) {
      if (child.hidden) continue;
      childNodes.push(this.reconcileElement(
        child,
        astylarChildReconciliationPath(path, index, child),
        identities,
        liveKeys,
      ));
    }
    const childrenChanged = node.childNodes.length !== childNodes.length ||
      childNodes.some((child, index) => node.childNodes[index] !== child);
    if (childrenChanged) node.replaceChildren(...childNodes);
    this.applyControlState(node, this.authoredControlState(element));
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
    if (element.role) node.setAttribute('role', element.role);
    if (element.ariaLabel !== undefined) node.setAttribute('aria-label', element.ariaLabel);
    if (element.ariaLabelledby) {
      node.setAttribute('aria-labelledby', this.nativeIdRefs(element.ariaLabelledby));
    }
    if (element.ariaDescribedby) {
      node.setAttribute('aria-describedby', this.nativeIdRefs(element.ariaDescribedby));
    }
    if (element.ariaLive) node.setAttribute('aria-live', element.ariaLive);
    if (element.ariaAtomic !== undefined) {
      node.setAttribute('aria-atomic', String(element.ariaAtomic));
    }
    if (element.ariaCurrent !== undefined) {
      node.setAttribute('aria-current', String(element.ariaCurrent));
    }
    if (node instanceof HTMLDialogElement) {
      node.open = !!element.open;
      if (element.modal) node.setAttribute('aria-modal', 'true');
    }

    if (element.href && node instanceof HTMLAnchorElement) node.href = element.href;
    if (element.target && node instanceof HTMLAnchorElement) node.target = element.target;
    if (element.alt !== undefined && node instanceof HTMLImageElement) node.alt = element.alt;
    if (element.src && node instanceof HTMLImageElement) node.src = element.src;
    if (element.scope && node instanceof HTMLTableCellElement) node.scope = element.scope;
    if (element.colspan && node instanceof HTMLTableCellElement) node.colSpan = element.colspan;
    if (element.rowspan && node instanceof HTMLTableCellElement) node.rowSpan = element.rowspan;
    if (element.for && node instanceof HTMLLabelElement) node.htmlFor = this.nativeId(element.for);
    if (node instanceof HTMLInputElement) {
      node.type = element.inputType || 'text';
      if (element.placeholder !== undefined) node.placeholder = element.placeholder;
      if (element.name !== undefined) node.name = element.name;
    }
    if (node instanceof HTMLTextAreaElement) {
      if (element.placeholder !== undefined) node.placeholder = element.placeholder;
      if (element.name !== undefined) node.name = element.name;
    }
    if (node instanceof HTMLButtonElement) {
      node.type = element.inputType === 'submit' ? 'submit' :
        element.inputType === 'reset' ? 'reset' : 'button';
    }
    if (node instanceof HTMLOptionElement) node.value = String(element.value ?? '');
  }

  private applyControlState(node: HTMLElement, state: AstylarSemanticControlState): void {
    if (node instanceof HTMLInputElement) {
      if (state.value !== undefined) node.value = state.value;
      if (state.selectionStart !== undefined && state.selectionEnd !== undefined &&
          node.type !== 'button' && node.type !== 'submit' && node.type !== 'reset' &&
          node.type !== 'checkbox' && node.type !== 'radio') {
        node.setSelectionRange(state.selectionStart, state.selectionEnd, state.selectionDirection);
      }
      if (state.checked !== undefined) node.checked = state.checked;
      if (state.disabled !== undefined) node.disabled = state.disabled;
      if (state.required !== undefined) node.required = state.required;
      if (state.readonly !== undefined) node.readOnly = state.readonly;
      return;
    }
    if (node instanceof HTMLTextAreaElement) {
      if (state.value !== undefined) node.value = state.value;
      if (state.selectionStart !== undefined && state.selectionEnd !== undefined) {
        node.setSelectionRange(state.selectionStart, state.selectionEnd, state.selectionDirection);
      }
      if (state.disabled !== undefined) node.disabled = state.disabled;
      if (state.required !== undefined) node.required = state.required;
      if (state.readonly !== undefined) node.readOnly = state.readonly;
      return;
    }
    if (node instanceof HTMLSelectElement) {
      if (state.disabled !== undefined) node.disabled = state.disabled;
      if (state.required !== undefined) node.required = state.required;
      if (state.selectedIndex !== undefined) node.selectedIndex = state.selectedIndex;
      else if (state.value !== undefined) node.value = state.value;
      if (state.expanded !== undefined) {
        node.setAttribute('aria-expanded', String(state.expanded));
      }
      return;
    }
    if (node instanceof HTMLButtonElement) {
      if (state.disabled !== undefined) node.disabled = state.disabled;
      return;
    }
    if (node instanceof HTMLOptionElement) {
      if (state.disabled !== undefined) node.disabled = state.disabled;
      if (state.checked !== undefined) node.selected = state.checked;
    }
  }

  private authoredControlState(element: DOMElement): AstylarSemanticControlState {
    const state: AstylarSemanticControlState = {
      disabled: !!element.disabled,
      required: !!element.required,
      readonly: !!element.readonly,
    };
    if (element.type === 'input' || element.type === 'textarea' ||
        element.type === 'select' || element.type === 'option') {
      state.value = String(element.value ?? element.textContent ?? '');
    }
    if (element.type === 'input') state.checked = !!element.checked;
    if (element.type === 'option') state.checked = !!element.selected;
    if (element.type === 'select') {
      const options = element.options ?? [];
      const selectedIndex = element.value === undefined
        ? 0
        : options.findIndex((option) => option.value === element.value);
      state.selectedIndex = selectedIndex < 0 ? 0 : selectedIndex;
      state.expanded = false;
    }
    return state;
  }

  private semanticChildren(element: DOMElement): DOMElement[] {
    if (element.children?.length || element.type !== 'select' || !element.options) {
      return element.children ?? [];
    }
    return element.options.map((option) => ({
      type: 'option',
      value: String(option.value),
      textContent: option.label,
      disabled: option.disabled,
      selected: element.value !== undefined && option.value === element.value,
    }));
  }

  private nativeId(authoredId: string): string {
    return `${this.prefix}${authoredId}`;
  }

  private applyModalInertness(siteData: SiteData): void {
    const activeModalIds: string[] = [];
    const visit = (element: DOMElement): void => {
      if (!element.hidden && element.type === 'dialog' && element.open && element.modal && element.id) {
        activeModalIds.push(element.id);
      }
      element.children?.forEach(visit);
    };
    siteData.root.children.forEach(visit);
    const activeId = activeModalIds.at(-1);
    if (!activeId) return;
    const dialog = [...this.nodes.values()].find((node) =>
      node.dataset['astylarId'] === activeId);
    if (!dialog) return;
    this.applyModalInertnessFor(dialog);
  }

  private clearModalInertness(): void {
    for (const node of this.nodes.values()) node.inert = false;
  }

  private applyModalInertnessFor(dialog: Element): void {
    let branch: Element = dialog;
    let parent = branch.parentElement;
    while (parent && parent !== this.root) {
      for (const sibling of [...parent.children]) {
        if (sibling !== branch && sibling instanceof HTMLElement) sibling.inert = true;
      }
      branch = parent;
      parent = parent.parentElement;
    }
    if (parent === this.root) {
      for (const sibling of [...this.root.children]) {
        if (sibling !== branch && sibling instanceof HTMLElement) sibling.inert = true;
      }
    }
  }

  private nativeIdRefs(authoredIds: string): string {
    return authoredIds.trim().split(/\s+/).filter(Boolean)
      .map((authoredId) => this.nativeId(authoredId)).join(' ');
  }

  private semanticTagName(type: DOMElementType | string): string {
    // These types are all valid native semantic elements. Area is only useful
    // inside an image map and is kept generic until that subset is supported.
    return type === 'area' || type === 'canvas' ? 'div' : type;
  }

}
