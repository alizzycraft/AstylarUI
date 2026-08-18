import type { DOMElement } from '../app/types/dom-element';
import type { SiteData } from '../app/types/site-data';

export type AstylarEventType =
  | 'pointerenter'
  | 'pointerleave'
  | 'pointerdown'
  | 'pointerup'
  | 'click'
  | 'focus'
  | 'blur'
  | 'keydown'
  | 'keyup'
  | 'input'
  | 'change'
  | 'invalid'
  | 'submit'
  | 'reset'
  | 'cancel'
  | 'close';

export interface AstylarEventState {
  value?: string;
  checked?: boolean;
  selectedValue?: string;
}

export interface AstylarEventInit extends AstylarEventState {
  type: AstylarEventType;
  targetId: string;
  key?: string;
  code?: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  button?: number;
  pointerType?: string;
}

export interface AstylarEventSnapshot extends AstylarEventInit {
  currentTargetId: string;
  defaultPrevented: boolean;
  propagationStopped: boolean;
}

export interface AstylarEvent extends Readonly<AstylarEventInit> {
  readonly currentTargetId: string;
  readonly defaultPrevented: boolean;
  readonly propagationStopped: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

export type AstylarEventHandler = (event: AstylarEvent) => void;
export type AstylarElementEventHandlers = Partial<
  Record<AstylarEventType, AstylarEventHandler | readonly AstylarEventHandler[]>
>;
export type AstylarEventHandlers = Readonly<Record<string, AstylarElementEventHandlers>>;

export interface AstylarEventOptions {
  /** Handlers are kept outside serializable SiteData and keyed by authored element ID. */
  handlers?: AstylarEventHandlers;
  /** Observes each completed dispatch once, after supported propagation/default cancellation. */
  onEvent?: (event: AstylarEventSnapshot) => void;
}

interface ElementEntry {
  element: DOMElement;
  parentId?: string;
}

const NON_BUBBLING_EVENTS = new Set<AstylarEventType>([
  'pointerenter',
  'pointerleave',
  'focus',
  'blur',
  'invalid',
  'cancel',
  'close',
]);

class MutableAstylarEvent implements AstylarEvent {
  currentTargetId: string;
  defaultPrevented = false;
  propagationStopped = false;

  constructor(readonly init: Readonly<AstylarEventInit>) {
    this.currentTargetId = init.targetId;
  }

  get type(): AstylarEventType { return this.init.type; }
  get targetId(): string { return this.init.targetId; }
  get value(): string | undefined { return this.init.value; }
  get checked(): boolean | undefined { return this.init.checked; }
  get selectedValue(): string | undefined { return this.init.selectedValue; }
  get key(): string | undefined { return this.init.key; }
  get code(): string | undefined { return this.init.code; }
  get shiftKey(): boolean | undefined { return this.init.shiftKey; }
  get ctrlKey(): boolean | undefined { return this.init.ctrlKey; }
  get altKey(): boolean | undefined { return this.init.altKey; }
  get metaKey(): boolean | undefined { return this.init.metaKey; }
  get button(): number | undefined { return this.init.button; }
  get pointerType(): string | undefined { return this.init.pointerType; }

  preventDefault(): void {
    this.defaultPrevented = true;
  }

  stopPropagation(): void {
    this.propagationStopped = true;
  }

  snapshot(): AstylarEventSnapshot {
    return {
      ...this.init,
      currentTargetId: this.currentTargetId,
      defaultPrevented: this.defaultPrevented,
      propagationStopped: this.propagationStopped,
    };
  }
}

/** Pure DOM-like target/bubble dispatcher used by one scene interaction runtime. */
export class AstylarEventDispatcher {
  private readonly elements = new Map<string, ElementEntry>();

  constructor(
    siteData: SiteData,
    private readonly options: AstylarEventOptions = {},
  ) {
    this.setSiteData(siteData);
  }

  get handlerCount(): number {
    let count = this.options.onEvent ? 1 : 0;
    for (const handlers of Object.values(this.options.handlers ?? {})) {
      for (const handler of Object.values(handlers)) {
        count += Array.isArray(handler) ? handler.length : handler ? 1 : 0;
      }
    }
    return count;
  }

  setSiteData(siteData: SiteData): void {
    this.elements.clear();
    const visit = (element: DOMElement, parentId?: string): void => {
      const nextParentId = element.id ?? parentId;
      if (element.id) this.elements.set(element.id, { element, parentId });
      element.children?.forEach((child) => visit(child, nextParentId));
    };
    siteData.root.children.forEach((element) => visit(element));
  }

  hasEnabledTarget(elementId: string): boolean {
    const element = this.elements.get(elementId)?.element;
    return !!element && !element.disabled && !element.hidden;
  }

  getElementState(elementId: string): AstylarEventState {
    const element = this.elements.get(elementId)?.element;
    if (!element) return {};
    const valueBearing = element.type === 'input' || element.type === 'button' ||
      element.type === 'select' || element.type === 'textarea' || element.type === 'option';
    return {
      value: valueBearing ? element.value ?? element.textContent : undefined,
      checked: element.checked,
      selectedValue: element.type === 'select' ? element.value : undefined,
    };
  }

  dispatch(init: AstylarEventInit): AstylarEventSnapshot | undefined {
    if (!this.hasEnabledTarget(init.targetId)) return undefined;
    const event = new MutableAstylarEvent(init);
    const path = this.buildPath(init.targetId, !NON_BUBBLING_EVENTS.has(init.type));
    for (const currentTargetId of path) {
      event.currentTargetId = currentTargetId;
      const registered = this.options.handlers?.[currentTargetId]?.[init.type];
      const handlers = Array.isArray(registered) ? registered : registered ? [registered] : [];
      for (const handler of handlers) {
        handler(event);
        if (event.propagationStopped) break;
      }
      if (event.propagationStopped) break;
    }
    event.currentTargetId = init.targetId;
    const snapshot = event.snapshot();
    this.options.onEvent?.(snapshot);
    return snapshot;
  }

  private buildPath(targetId: string, bubbles: boolean): string[] {
    const path = [targetId];
    if (!bubbles) return path;
    const visited = new Set(path);
    let parentId = this.elements.get(targetId)?.parentId;
    while (parentId && !visited.has(parentId)) {
      path.push(parentId);
      visited.add(parentId);
      parentId = this.elements.get(parentId)?.parentId;
    }
    return path;
  }
}
