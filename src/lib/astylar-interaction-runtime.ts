import {
  AbstractMesh,
  Observer,
  PointerEventTypes,
  PointerInfo,
  Scene,
} from '@babylonjs/core';
import type { SiteData } from '../app/types/site-data';
import {
  AstylarEventDispatcher,
  AstylarEventOptions,
  AstylarEventState,
  AstylarEventType,
} from './astylar-event';

export interface AstylarInteractionSnapshot {
  pointerObservers: number;
  keyboardListeners: number;
  handlers: number;
  pressedElementId?: string;
  hoveredElementId?: string;
  focusedElementId?: string;
  disposed: boolean;
}

export type AstylarInteractionStateProvider = (elementId: string) => AstylarEventState;

export interface AstylarControlActivation {
  changed: boolean;
  rollback(): void;
}

export interface AstylarInteractionControlAdapter {
  getFocusedElementId(): string | undefined;
  focus(elementId: string): boolean;
  blur(elementId: string): boolean;
  handleKeyDown(elementId: string, event: KeyboardEvent): void;
  commitsValueOnBlur(elementId: string): boolean;
  activate?(elementId: string): AstylarControlActivation | undefined;
}

/** Owns the Babylon observers for one scene and emits a small DOM-like event subset. */
export class AstylarInteractionRuntime {
  private readonly dispatcher: AstylarEventDispatcher;
  private pointerObserver: Observer<PointerInfo> | null;
  private pressedElementId?: string;
  private hoveredElementId?: string;
  private disposed = false;
  private readonly canvas: HTMLCanvasElement | null;
  private focusOrder: string[] = [];
  private focusedValueAtEntry?: string;

  constructor(
    private readonly scene: Scene,
    siteData: SiteData,
    options: AstylarEventOptions = {},
    private readonly getLiveState?: AstylarInteractionStateProvider,
    private readonly controls?: AstylarInteractionControlAdapter,
    canvasOverride?: HTMLCanvasElement,
  ) {
    this.dispatcher = new AstylarEventDispatcher(siteData, options);
    this.focusOrder = this.buildFocusOrder(siteData);
    this.pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
      this.handlePointer(pointerInfo);
    });
    this.canvas = canvasOverride ?? scene.getEngine().getRenderingCanvas();
    if (this.canvas) {
      if (this.canvas.tabIndex < 0) this.canvas.tabIndex = 0;
      this.canvas.addEventListener('keydown', this.handleKeyDown);
    }
  }

  get snapshot(): AstylarInteractionSnapshot {
    return {
      pointerObservers: this.pointerObserver ? 1 : 0,
      keyboardListeners: this.canvas && !this.disposed ? 1 : 0,
      handlers: this.dispatcher.handlerCount,
      pressedElementId: this.pressedElementId,
      hoveredElementId: this.hoveredElementId,
      focusedElementId: this.controls?.getFocusedElementId(),
      disposed: this.disposed,
    };
  }

  setSiteData(siteData: SiteData): void {
    this.dispatcher.setSiteData(siteData);
    this.focusOrder = this.buildFocusOrder(siteData);
    if (this.pressedElementId && !this.dispatcher.hasEnabledTarget(this.pressedElementId)) {
      this.pressedElementId = undefined;
    }
    if (this.hoveredElementId && !this.dispatcher.hasEnabledTarget(this.hoveredElementId)) {
      this.hoveredElementId = undefined;
    }
    const focusedElementId = this.controls?.getFocusedElementId();
    if (focusedElementId && !this.focusOrder.includes(focusedElementId)) {
      this.setFocus(undefined);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.pointerObserver) {
      this.scene.onPointerObservable.remove(this.pointerObserver);
      this.pointerObserver = null;
    }
    this.canvas?.removeEventListener('keydown', this.handleKeyDown);
    this.pressedElementId = undefined;
    this.hoveredElementId = undefined;
  }

  private handlePointer(pointerInfo: PointerInfo): void {
    if (this.disposed) return;
    const targetId = this.resolveElementId(pointerInfo.pickInfo?.pickedMesh ?? undefined);
    if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
      this.updateHover(targetId, pointerInfo);
      return;
    }
    if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
      if (!targetId) {
        this.pressedElementId = undefined;
        this.canvas?.focus();
        this.setFocus(undefined);
        return;
      }
      if (!this.dispatcher.hasEnabledTarget(targetId)) {
        this.pressedElementId = undefined;
        this.setFocus(undefined);
        return;
      }
      this.pressedElementId = targetId;
      const dispatched = this.dispatchPointer('pointerdown', targetId, pointerInfo);
      if (!dispatched?.defaultPrevented) {
        this.canvas?.focus();
        this.setFocus(this.focusOrder.includes(targetId) ? targetId : undefined);
      }
      return;
    }
    if (pointerInfo.type === PointerEventTypes.POINTERUP) {
      if (targetId) this.dispatchPointer('pointerup', targetId, pointerInfo);
      if (targetId && targetId === this.pressedElementId) {
        const activation = this.controls?.activate?.(targetId);
        const click = this.dispatchPointer('click', targetId, pointerInfo);
        if (click?.defaultPrevented) {
          activation?.rollback();
        } else if (activation?.changed) {
          const state = this.liveState(targetId);
          this.dispatcher.dispatch({ type: 'input', targetId, ...state });
          this.dispatcher.dispatch({ type: 'change', targetId, ...state });
        }
      }
      this.pressedElementId = undefined;
    }
  }

  private updateHover(targetId: string | undefined, pointerInfo: PointerInfo): void {
    if (targetId === this.hoveredElementId) return;
    if (this.hoveredElementId) {
      this.dispatchPointer('pointerleave', this.hoveredElementId, pointerInfo);
    }
    this.hoveredElementId = targetId && this.dispatcher.hasEnabledTarget(targetId)
      ? targetId
      : undefined;
    if (this.hoveredElementId) {
      this.dispatchPointer('pointerenter', this.hoveredElementId, pointerInfo);
    }
  }

  private dispatchPointer(
    type: AstylarEventType,
    targetId: string,
    pointerInfo: PointerInfo,
  ) {
    const nativeEvent = pointerInfo.event as PointerEvent | MouseEvent | undefined;
    const state = {
      ...this.dispatcher.getElementState(targetId),
      ...this.getLiveState?.(targetId),
    };
    return this.dispatcher.dispatch({
      type,
      targetId,
      ...state,
      button: nativeEvent?.button ?? 0,
      pointerType: nativeEvent && 'pointerType' in nativeEvent
        ? nativeEvent.pointerType || 'mouse'
        : 'mouse',
    });
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.disposed) return;
    const targetId = this.controls?.getFocusedElementId();
    if (!targetId) return;
    const state = {
      ...this.dispatcher.getElementState(targetId),
      ...this.getLiveState?.(targetId),
    };
    const dispatched = this.dispatcher.dispatch({
      type: 'keydown',
      targetId,
      ...state,
      key: event.key,
      code: event.code,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    });
    if (dispatched?.propagationStopped) event.stopPropagation();
    if (dispatched?.defaultPrevented) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      this.moveFocus(event.shiftKey ? -1 : 1);
      return;
    }
    const before = this.liveState(targetId);
    this.controls?.handleKeyDown(targetId, event);
    const after = this.liveState(targetId);
    if (this.controls?.commitsValueOnBlur(targetId) &&
        (before.value !== after.value || before.checked !== after.checked ||
          before.selectedValue !== after.selectedValue)) {
      this.dispatcher.dispatch({
        type: 'input',
        targetId,
        ...after,
      });
    }
  };

  private moveFocus(direction: -1 | 1): void {
    if (!this.focusOrder.length) return;
    const current = this.controls?.getFocusedElementId();
    const currentIndex = current ? this.focusOrder.indexOf(current) : -1;
    const nextIndex = direction === 1
      ? (currentIndex + 1 + this.focusOrder.length) % this.focusOrder.length
      : (currentIndex <= 0 ? this.focusOrder.length - 1 : currentIndex - 1);
    this.setFocus(this.focusOrder[nextIndex]);
  }

  private setFocus(elementId: string | undefined): void {
    const previous = this.controls?.getFocusedElementId();
    if (previous === elementId) return;
    if (previous) {
      const state = this.liveState(previous);
      if (this.controls?.commitsValueOnBlur(previous) && state.value !== this.focusedValueAtEntry) {
        this.dispatcher.dispatch({
          type: 'change',
          targetId: previous,
          ...state,
        });
      }
    }
    if (previous && this.controls?.blur(previous)) {
      this.dispatcher.dispatch({
        type: 'blur',
        targetId: previous,
        ...this.liveState(previous),
      });
    }
    if (elementId && this.controls?.focus(elementId)) {
      this.focusedValueAtEntry = this.liveState(elementId).value;
      this.dispatcher.dispatch({
        type: 'focus',
        targetId: elementId,
        ...this.liveState(elementId),
      });
    } else if (!elementId) {
      this.focusedValueAtEntry = undefined;
    }
  }

  private liveState(elementId: string): AstylarEventState {
    return {
      ...this.dispatcher.getElementState(elementId),
      ...this.getLiveState?.(elementId),
    };
  }

  private buildFocusOrder(siteData: SiteData): string[] {
    const entries: Array<{ id: string; tabIndex: number; order: number }> = [];
    let order = 0;
    const visit = (element: SiteData['root']['children'][number]): void => {
      const currentOrder = order++;
      const focusable = element.type === 'input' || element.type === 'button' ||
        element.type === 'select' || element.type === 'textarea' ||
        (element.type === 'a' && !!element.href);
      const tabIndex = element.tabindex ?? 0;
      if (element.id && focusable && !element.disabled && !element.hidden && tabIndex >= 0) {
        entries.push({ id: element.id, tabIndex, order: currentOrder });
      }
      element.children?.forEach(visit);
    };
    siteData.root.children.forEach(visit);
    return entries
      .sort((left, right) => {
        const leftGroup = left.tabIndex > 0 ? 0 : 1;
        const rightGroup = right.tabIndex > 0 ? 0 : 1;
        return leftGroup - rightGroup ||
          (leftGroup === 0 ? left.tabIndex - right.tabIndex : 0) ||
          left.order - right.order;
      })
      .map((entry) => entry.id);
  }

  private resolveElementId(mesh: AbstractMesh | undefined): string | undefined {
    let candidate: AbstractMesh | null | undefined = mesh;
    while (candidate) {
      const elementId = candidate.metadata?.elementId;
      if (typeof elementId === 'string' && elementId) return elementId;
      candidate = candidate.parent instanceof AbstractMesh ? candidate.parent : undefined;
    }
    return undefined;
  }
}
