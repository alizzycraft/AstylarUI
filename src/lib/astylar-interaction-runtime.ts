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
  wheelHandlers: number;
  keyboardListeners: number;
  handlers: number;
  pressedElementId?: string;
  hoveredElementId?: string;
  focusedElementId?: string;
  navigationOutcomes: readonly AstylarNavigationOutcome[];
  disposed: boolean;
}

export interface AstylarNavigationOutcome {
  sourceId: string;
  href: string;
  kind: 'fragment' | 'external';
  url: string;
  target?: string;
  fragmentId?: string;
}

export interface AstylarNavigationOptions {
  /** Observes accepted anchor defaults; hosts may route external intents here. */
  onNavigate?: (outcome: Readonly<AstylarNavigationOutcome>) => void;
}

export type AstylarInteractionStateProvider = (elementId: string) => AstylarEventState;

export interface AstylarControlActivation {
  changed: boolean;
  rollback(): void;
}

export interface AstylarExpandedSelectKeyResult {
  handled: boolean;
  changed: boolean;
  dispatchClick: boolean;
  suppressKeyUp: boolean;
}

export interface AstylarInteractionControlAdapter {
  getFocusedElementId(): string | undefined;
  focus(elementId: string): boolean;
  blur(elementId: string, preserveSelectionOnReset?: boolean): boolean;
  handleKeyDown(elementId: string, event: KeyboardEvent): void;
  scrollTextControl?(elementId: string, deltaX: number, deltaY: number): boolean;
  commitsValueOnBlur(elementId: string): boolean;
  emitsImmediateChangeOnKeyboardMutation?(elementId: string): boolean;
  handleExpandedSelectKeyDown?(
    elementId: string,
    event: KeyboardEvent,
  ): AstylarExpandedSelectKeyResult | undefined;
  hasExpandedSelectPopup?(): boolean;
  commitExpandedSelectOption?(elementId: string, optionIndex: number): boolean;
  cancelExpandedSelect?(elementId: string): boolean;
  activate?(elementId: string): AstylarControlActivation | undefined;
  canActivateWithSpace?(elementId: string): boolean;
  canActivateWithEnter?(elementId: string): boolean;
  getRadioNavigationTarget?(elementId: string, direction: -1 | 1): string | undefined;
  resetFormControls?(elementIds: readonly string[]): void;
  validateFormControls?(elementIds: readonly string[]): readonly string[];
  setActiveState?(elementId: string, active: boolean): void;
  setFocusState?(elementId: string, focused: boolean): void;
}

export interface AstylarInteractionScrollAdapter {
  scrollFrom(elementId: string, deltaX: number, deltaY: number): boolean;
  isPointVisible(elementId: string, point?: { x: number; y: number }): boolean;
  scrollIntoView?(elementId: string, alignment?: 'start' | 'nearest'): boolean;
}

interface AstylarFormDefault {
  formId: string;
  controlIds: readonly string[];
  type: 'reset' | 'submit';
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
  private controlTypes = new Map<string, string>();
  private labelTargets = new Map<string, string>();
  private formDefaults = new Map<string, AstylarFormDefault>();
  private implicitSubmitTargets = new Map<string, string>();
  private focusedValueAtEntry?: string;
  private pendingSpaceActivationId?: string;
  private readonly suppressedKeyUps = new Set<string>();
  private pressedExpandedSelectOption?: { elementId: string; optionIndex: number };
  private focusedNonControlId?: string;
  private anchors = new Map<string, { href: string; target?: string }>();
  private readonly navigationOutcomes: AstylarNavigationOutcome[] = [];

  constructor(
    private readonly scene: Scene,
    siteData: SiteData,
    options: AstylarEventOptions = {},
    private readonly getLiveState?: AstylarInteractionStateProvider,
    private readonly controls?: AstylarInteractionControlAdapter,
    canvasOverride?: HTMLCanvasElement,
    private readonly scrolling?: AstylarInteractionScrollAdapter,
    private readonly navigation: AstylarNavigationOptions = {},
  ) {
    this.dispatcher = new AstylarEventDispatcher(siteData, options);
    this.focusOrder = this.buildFocusOrder(siteData);
    this.controlTypes = this.buildControlTypes(siteData);
    this.labelTargets = this.buildLabelTargets(siteData);
    this.formDefaults = this.buildFormDefaults(siteData);
    this.implicitSubmitTargets = this.buildImplicitSubmitTargets(siteData);
    this.anchors = this.buildAnchors(siteData);
    this.pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
      this.handlePointer(pointerInfo);
    });
    this.canvas = canvasOverride ?? scene.getEngine().getRenderingCanvas();
    if (this.canvas) {
      if (this.canvas.tabIndex < 0) this.canvas.tabIndex = 0;
      this.canvas.addEventListener('keydown', this.handleKeyDown);
      this.canvas.addEventListener('keyup', this.handleKeyUp);
      if (this.scrolling) {
        this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
      }
    }
  }

  get snapshot(): AstylarInteractionSnapshot {
    return {
      pointerObservers: this.pointerObserver ? 1 : 0,
      wheelHandlers: this.scrolling && !this.disposed ? 1 : 0,
      keyboardListeners: this.canvas && !this.disposed ? 2 : 0,
      handlers: this.dispatcher.handlerCount,
      pressedElementId: this.pressedElementId,
      hoveredElementId: this.hoveredElementId,
      focusedElementId: this.getFocusedElementId(),
      navigationOutcomes: [...this.navigationOutcomes],
      disposed: this.disposed,
    };
  }

  /** Applies browser semantic focus through the same scene-owned focus path. */
  focusSemanticElement(
    elementId: string,
    preservePreviousSelectionOnReset = false,
  ): boolean {
    if (this.disposed || !this.focusOrder.includes(elementId) ||
        !this.dispatcher.hasEnabledTarget(elementId)) return false;
    this.setFocus(elementId, preservePreviousSelectionOnReset);
    this.scrolling?.scrollIntoView?.(elementId, 'nearest');
    return this.getFocusedElementId() === elementId;
  }

  /** Clears scene focus when its corresponding native semantic node blurs. */
  blurSemanticElement(elementId: string): boolean {
    if (this.disposed || this.getFocusedElementId() !== elementId) return false;
    this.setFocus(undefined);
    return this.getFocusedElementId() === undefined;
  }

  /** Routes assistive/native click activation through typed Astylar defaults. */
  activateSemanticElement(elementId: string): boolean {
    if (this.disposed || !this.dispatcher.hasEnabledTarget(elementId)) return false;
    if (this.focusOrder.includes(elementId)) this.setFocus(elementId);
    const accepted = this.activateAndClick(elementId);
    const labelTargetId = accepted ? this.labelTargets.get(elementId) : undefined;
    if (labelTargetId && this.dispatcher.hasEnabledTarget(labelTargetId)) {
      if (this.focusOrder.includes(labelTargetId)) this.setFocus(labelTargetId);
      return this.activateAndClick(labelTargetId);
    }
    return accepted;
  }

  /** Reuses the canvas keyboard/default-action pipeline for semantic focus. */
  handleSemanticKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      this.dispatchSemanticTabKey(event, 'keydown');
      return;
    }
    this.handleKeyDown(event);
  }

  /** Reuses the canvas keyboard/default-action pipeline for semantic focus. */
  handleSemanticKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      this.dispatchSemanticTabKey(event, 'keyup');
      return;
    }
    this.handleKeyUp(event);
  }

  private dispatchSemanticTabKey(event: KeyboardEvent, type: 'keydown' | 'keyup'): void {
    if (this.disposed) return;
    const targetId = this.getFocusedElementId();
    if (!targetId) return;
    const dispatched = this.dispatcher.dispatch({
      type,
      targetId,
      ...this.liveState(targetId),
      key: event.key,
      code: event.code,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    });
    if (dispatched?.propagationStopped) event.stopPropagation();
    if (dispatched?.defaultPrevented) event.preventDefault();
  }

  setSiteData(siteData: SiteData): void {
    const nextFocusOrder = this.buildFocusOrder(siteData);
    const nextControlTypes = this.buildControlTypes(siteData);
    const focusedElementId = this.getFocusedElementId();
    if (focusedElementId &&
        (!nextFocusOrder.includes(focusedElementId) ||
          this.controlTypes.get(focusedElementId) !== nextControlTypes.get(focusedElementId))) {
      // Dispatch commit/blur while the old element and event path are still live.
      this.setFocus(undefined);
    }
    this.dispatcher.setSiteData(siteData);
    this.focusOrder = nextFocusOrder;
    this.controlTypes = nextControlTypes;
    this.labelTargets = this.buildLabelTargets(siteData);
    this.formDefaults = this.buildFormDefaults(siteData);
    this.implicitSubmitTargets = this.buildImplicitSubmitTargets(siteData);
    this.anchors = this.buildAnchors(siteData);
    if (this.pressedElementId && !this.dispatcher.hasEnabledTarget(this.pressedElementId)) {
      this.controls?.setActiveState?.(this.pressedElementId, false);
      this.pressedElementId = undefined;
    }
    if (this.hoveredElementId && !this.dispatcher.hasEnabledTarget(this.hoveredElementId)) {
      this.hoveredElementId = undefined;
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
    this.canvas?.removeEventListener('keyup', this.handleKeyUp);
    this.canvas?.removeEventListener('wheel', this.handleWheel);
    if (this.pressedElementId) this.controls?.setActiveState?.(this.pressedElementId, false);
    const focusedElementId = this.getFocusedElementId();
    if (focusedElementId) this.controls?.setFocusState?.(focusedElementId, false);
    this.pressedElementId = undefined;
    this.hoveredElementId = undefined;
    this.pendingSpaceActivationId = undefined;
    this.suppressedKeyUps.clear();
    this.pressedExpandedSelectOption = undefined;
    this.focusedNonControlId = undefined;
    this.navigationOutcomes.length = 0;
  }

  private handlePointer(pointerInfo: PointerInfo): void {
    if (this.disposed) return;
    const pickedMesh = pointerInfo.pickInfo?.pickedMesh ?? undefined;
    const expandedSelectOption = this.resolveExpandedSelectOption(pointerInfo);
    if (pointerInfo.type === PointerEventTypes.POINTERDOWN && expandedSelectOption) {
      if (!this.scrolling || this.scrolling.isPointVisible(
        expandedSelectOption.elementId,
        pointerInfo.pickInfo?.pickedPoint ?? undefined,
      )) {
        this.pressedExpandedSelectOption = expandedSelectOption;
        this.canvas?.focus();
      }
      return;
    }
    if (pointerInfo.type === PointerEventTypes.POINTERUP && this.pressedExpandedSelectOption) {
      const pressed = this.pressedExpandedSelectOption;
      this.pressedExpandedSelectOption = undefined;
      if (expandedSelectOption?.elementId === pressed.elementId &&
          expandedSelectOption.optionIndex === pressed.optionIndex &&
          this.controls?.commitExpandedSelectOption?.(
            pressed.elementId,
            pressed.optionIndex,
          )) {
        const state = this.liveState(pressed.elementId);
        this.dispatcher.dispatch({ type: 'input', targetId: pressed.elementId, ...state });
        this.dispatcher.dispatch({ type: 'change', targetId: pressed.elementId, ...state });
      }
      return;
    }
    let targetId = this.resolveElementId(pickedMesh);
    if (targetId && this.scrolling &&
        !this.scrolling.isPointVisible(targetId, pointerInfo.pickInfo?.pickedPoint ?? undefined)) {
      targetId = undefined;
    }
    if (pointerInfo.type === PointerEventTypes.POINTERWHEEL) return;
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
      this.controls?.setActiveState?.(targetId, true);
      if (!dispatched?.defaultPrevented) {
        this.canvas?.focus();
        this.setFocus(this.focusOrder.includes(targetId) ? targetId : undefined);
      }
      return;
    }
    if (pointerInfo.type === PointerEventTypes.POINTERUP) {
      if (this.pressedElementId) {
        this.controls?.setActiveState?.(this.pressedElementId, false);
      }
      if (targetId) this.dispatchPointer('pointerup', targetId, pointerInfo);
      if (targetId && targetId === this.pressedElementId) {
        const accepted = this.activateAndClick(targetId, pointerInfo);
        const labelTargetId = accepted ? this.labelTargets.get(targetId) : undefined;
        if (labelTargetId && this.dispatcher.hasEnabledTarget(labelTargetId)) {
          this.setFocus(this.focusOrder.includes(labelTargetId) ? labelTargetId : undefined);
          this.activateAndClick(labelTargetId, pointerInfo);
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

  private resolveExpandedSelectOption(
    pointerInfo: PointerInfo,
  ): { elementId: string; optionIndex: number } | undefined {
    const direct = this.expandedSelectOptionFromMesh(
      pointerInfo.pickInfo?.pickedMesh ?? undefined,
    );
    if (direct) return direct;
    if (!this.controls?.hasExpandedSelectPopup?.()) return undefined;

    const nativeEvent = pointerInfo.event as PointerEvent | MouseEvent | undefined;
    const x = nativeEvent?.offsetX ?? this.scene.pointerX;
    const y = nativeEvent?.offsetY ?? this.scene.pointerY;
    const picks = this.scene.multiPick(x, y, (mesh) => mesh.isPickable);
    for (const pick of picks ?? []) {
      const option = this.expandedSelectOptionFromMesh(pick.pickedMesh ?? undefined);
      if (option) return option;
    }
    return undefined;
  }

  private expandedSelectOptionFromMesh(
    mesh: AbstractMesh | undefined,
  ): { elementId: string; optionIndex: number } | undefined {
    let current = mesh;
    while (current) {
      const optionIndex = current.metadata?.optionIndex;
      const selectElement = current.metadata?.selectElement;
      const elementId = selectElement?.element?.id;
      if (Number.isInteger(optionIndex) && elementId) {
        return { elementId, optionIndex };
      }
      current = current.parent as AbstractMesh | undefined;
    }
    return undefined;
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
    const targetId = this.getFocusedElementId();
    if (!targetId) return;
    const expandedSelectResult = this.controls?.handleExpandedSelectKeyDown?.(targetId, event);
    if (expandedSelectResult?.handled) {
      event.preventDefault();
      if (expandedSelectResult.suppressKeyUp) {
        this.suppressedKeyUps.add(this.keyUpToken(targetId, event));
      }
      const state = this.liveState(targetId);
      if (expandedSelectResult.changed) {
        this.dispatcher.dispatch({ type: 'input', targetId, ...state });
        this.dispatcher.dispatch({ type: 'change', targetId, ...state });
      }
      if (expandedSelectResult.dispatchClick) {
        this.dispatcher.dispatch({
          type: 'click', targetId, ...state, button: -1, pointerType: '',
        });
      }
      return;
    }
    if (event.key === 'Escape' && this.controls?.cancelExpandedSelect?.(targetId)) {
      event.preventDefault();
      return;
    }
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
    if (event.key === 'Enter' &&
        (this.anchors.has(targetId) || this.controls?.canActivateWithEnter?.(targetId))) {
      event.preventDefault();
      this.activateAndClick(targetId);
      return;
    }
    const implicitSubmitTarget = event.key === 'Enter'
      ? this.implicitSubmitTargets.get(targetId)
      : undefined;
    if (implicitSubmitTarget) {
      event.preventDefault();
      this.activateAndClick(implicitSubmitTarget);
      return;
    }
    if (event.key === ' ' && this.controls?.canActivateWithSpace?.(targetId)) {
      event.preventDefault();
      this.pendingSpaceActivationId = targetId;
      return;
    }
    const radioDirection = this.radioNavigationDirection(event.key);
    if (radioDirection) {
      const nextRadioId = this.controls?.getRadioNavigationTarget?.(
        targetId,
        radioDirection,
      );
      if (nextRadioId) {
        event.preventDefault();
        this.setFocus(nextRadioId);
        this.activateAndClick(nextRadioId);
        return;
      }
    }
    const before = this.liveState(targetId);
    this.controls?.handleKeyDown(targetId, event);
    const after = this.liveState(targetId);
    const changed = before.value !== after.value || before.checked !== after.checked ||
      before.selectedValue !== after.selectedValue;
    const commitsOnBlur = this.controls?.commitsValueOnBlur(targetId);
    const changesImmediately =
      this.controls?.emitsImmediateChangeOnKeyboardMutation?.(targetId);
    if (changed && (commitsOnBlur || changesImmediately)) {
      this.dispatcher.dispatch({
        type: 'input',
        targetId,
        ...after,
      });
      if (changesImmediately) {
        this.dispatcher.dispatch({
          type: 'change',
          targetId,
          ...after,
        });
      }
    }
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    if (this.disposed || !this.scrolling) return;
    const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
    const lineScale = 16;
    const pageScale = this.canvas?.clientHeight || 1;
    const factor = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? lineScale
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? pageScale : 1;
    const deltaX = event.deltaX * factor;
    const deltaY = event.deltaY * factor;
    for (const targetId of this.resolveElementIds(pick?.pickedMesh ?? undefined)) {
      if (!this.scrolling.isPointVisible(targetId, pick?.pickedPoint ?? undefined)) continue;
      if (this.controls?.scrollTextControl?.(targetId, deltaX, deltaY) ||
          this.scrolling.scrollFrom(targetId, deltaX, deltaY)) {
        event.preventDefault();
        return;
      }
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (this.disposed) return;
    const targetId = this.getFocusedElementId();
    if (!targetId) return;
    const keyUpToken = this.keyUpToken(targetId, event);
    if (this.suppressedKeyUps.delete(keyUpToken)) return;
    const state = this.liveState(targetId);
    const dispatched = this.dispatcher.dispatch({
      type: 'keyup',
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
    if (dispatched?.defaultPrevented) event.preventDefault();

    const shouldActivate = event.key === ' ' &&
      this.pendingSpaceActivationId === targetId &&
      !dispatched?.defaultPrevented;
    this.pendingSpaceActivationId = undefined;
    if (shouldActivate) this.activateAndClick(targetId);
  };

  private keyUpToken(targetId: string, event: KeyboardEvent): string {
    return `${targetId}:${event.code || event.key}`;
  }

  private activateAndClick(targetId: string, pointerInfo?: PointerInfo): boolean {
    const activation = this.controls?.activate?.(targetId);
    const click = pointerInfo
      ? this.dispatchPointer('click', targetId, pointerInfo)
      : this.dispatcher.dispatch({
          type: 'click',
          targetId,
          ...this.liveState(targetId),
          button: 0,
          pointerType: '',
        });
    if (click?.defaultPrevented) {
      activation?.rollback();
    } else if (activation?.changed) {
      const state = this.liveState(targetId);
      this.dispatcher.dispatch({ type: 'input', targetId, ...state });
      this.dispatcher.dispatch({ type: 'change', targetId, ...state });
    }
    const accepted = !!click && !click.defaultPrevented;
    if (accepted) {
      this.performFormDefault(targetId);
      this.performNavigationDefault(targetId);
    }
    return accepted;
  }

  private moveFocus(direction: -1 | 1): void {
    if (!this.focusOrder.length) return;
    const current = this.getFocusedElementId();
    const currentIndex = current ? this.focusOrder.indexOf(current) : -1;
    const nextIndex = direction === 1
      ? (currentIndex + 1 + this.focusOrder.length) % this.focusOrder.length
      : (currentIndex <= 0 ? this.focusOrder.length - 1 : currentIndex - 1);
    this.setFocus(this.focusOrder[nextIndex], true);
  }

  private radioNavigationDirection(key: string): -1 | 1 | undefined {
    if (key === 'ArrowLeft' || key === 'ArrowUp') return -1;
    if (key === 'ArrowRight' || key === 'ArrowDown') return 1;
    return undefined;
  }

  private setFocus(
    elementId: string | undefined,
    preservePreviousSelectionOnReset: boolean = false,
  ): void {
    const previous = this.getFocusedElementId();
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
    if (previous) {
      const blurred = this.controlTypes.has(previous)
        ? this.controls?.blur(previous, preservePreviousSelectionOnReset)
        : this.focusedNonControlId === previous;
      if (blurred) {
        this.focusedNonControlId = undefined;
        this.controls?.setFocusState?.(previous, false);
        this.dispatcher.dispatch({
          type: 'blur',
          targetId: previous,
          ...this.liveState(previous),
        });
      }
    }
    const focused = elementId && (this.controlTypes.has(elementId)
      ? this.controls?.focus(elementId)
      : this.focusOrder.includes(elementId));
    if (elementId && focused) {
      if (!this.controlTypes.has(elementId)) this.focusedNonControlId = elementId;
      this.controls?.setFocusState?.(elementId, true);
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

  private getFocusedElementId(): string | undefined {
    return this.focusedNonControlId ?? this.controls?.getFocusedElementId();
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

  private buildControlTypes(siteData: SiteData): Map<string, string> {
    const types = new Map<string, string>();
    const visit = (element: SiteData['root']['children'][number]): void => {
      let type: string | undefined;
      if (element.type === 'input') {
        const inputType = element.inputType?.toLowerCase() ?? 'text';
        type = inputType === 'reset' ? 'button' : inputType;
      } else if (element.type === 'button') {
        const buttonType = element.inputType?.toLowerCase();
        type = buttonType === 'submit' ? 'submit' : 'button';
      } else if (element.type === 'select' || element.type === 'textarea') {
        type = element.type;
      }
      if (element.id && type) {
        types.set(element.id, types.has(element.id) ? '#duplicate' : type);
      }
      element.children?.forEach(visit);
    };
    siteData.root.children.forEach(visit);
    return types;
  }

  private buildLabelTargets(siteData: SiteData): Map<string, string> {
    const targets = new Map<string, string>();
    const visit = (element: SiteData['root']['children'][number]): void => {
      if (element.type === 'label' && element.id && element.for && element.for !== element.id) {
        targets.set(element.id, element.for);
      }
      element.children?.forEach(visit);
    };
    siteData.root.children.forEach(visit);
    return targets;
  }

  private buildFormDefaults(siteData: SiteData): Map<string, AstylarFormDefault> {
    const defaults = new Map<string, AstylarFormDefault>();
    const visit = (
      element: SiteData['root']['children'][number],
      currentForm?: { id: string; controlIds: string[]; buttonDefaults: Map<string, 'reset' | 'submit'> },
    ): void => {
      let form = currentForm;
      if (element.type === 'form' && element.id) {
        form = { id: element.id, controlIds: [], buttonDefaults: new Map() };
      }
      if (form && element.id &&
          (element.type === 'input' || element.type === 'button' ||
            element.type === 'select' || element.type === 'textarea')) {
        form.controlIds.push(element.id);
        const buttonType = element.inputType?.toLowerCase();
        if (buttonType === 'reset' || buttonType === 'submit') {
          form.buttonDefaults.set(element.id, buttonType);
        }
      }
      element.children?.forEach((child) => visit(child, form));
      if (element.type === 'form' && form && form.id === element.id) {
        for (const [buttonId, type] of form.buttonDefaults) {
          defaults.set(buttonId, {
            formId: form.id,
            controlIds: [...form.controlIds],
            type,
          });
        }
      }
    };
    siteData.root.children.forEach((element) => visit(element));
    return defaults;
  }

  private buildImplicitSubmitTargets(siteData: SiteData): Map<string, string> {
    const targets = new Map<string, string>();
    const textTypes = new Set(['text', 'password', 'email', 'number', 'search', 'tel', 'url']);
    const visit = (
      element: SiteData['root']['children'][number],
      currentForm?: { id: string; fieldIds: string[]; submitId?: string },
    ): void => {
      let form = currentForm;
      if (element.type === 'form' && element.id) {
        form = { id: element.id, fieldIds: [] };
      }
      if (form && element.id) {
        const inputType = element.inputType?.toLowerCase();
        if (element.type === 'input' && textTypes.has(inputType ?? 'text') &&
            !element.disabled && !element.readonly) {
          form.fieldIds.push(element.id);
        }
        const isSubmit = (element.type === 'input' && inputType === 'submit') ||
          (element.type === 'button' && (!inputType || inputType === 'submit'));
        if (isSubmit && !element.disabled && !form.submitId) form.submitId = element.id;
      }
      element.children?.forEach((child) => visit(child, form));
      if (element.type === 'form' && form && form.id === element.id && form.submitId) {
        for (const fieldId of form.fieldIds) targets.set(fieldId, form.submitId);
      }
    };
    siteData.root.children.forEach((element) => visit(element));
    return targets;
  }

  private buildAnchors(siteData: SiteData): Map<string, { href: string; target?: string }> {
    const anchors = new Map<string, { href: string; target?: string }>();
    const visit = (element: SiteData['root']['children'][number]): void => {
      if (element.type === 'a' && element.id && element.href) {
        anchors.set(element.id, { href: element.href, target: element.target });
      }
      element.children?.forEach(visit);
    };
    siteData.root.children.forEach(visit);
    return anchors;
  }

  private performNavigationDefault(sourceId: string): void {
    const anchor = this.anchors.get(sourceId);
    if (!anchor) return;
    const document = this.canvas?.ownerDocument;
    const base = document?.defaultView?.location.href ?? document?.baseURI ?? 'http://localhost/';
    let resolved: URL;
    try {
      resolved = new URL(anchor.href, base);
    } catch {
      return;
    }
    const current = new URL(base);
    const sameDocumentFragment = !!resolved.hash &&
      resolved.origin === current.origin &&
      resolved.pathname === current.pathname &&
      resolved.search === current.search;
    let fragmentId: string | undefined;
    if (sameDocumentFragment) {
      try {
        fragmentId = decodeURIComponent(resolved.hash.slice(1));
      } catch {
        fragmentId = resolved.hash.slice(1);
      }
      if (fragmentId) this.scrolling?.scrollIntoView?.(fragmentId);
    }
    const outcome: AstylarNavigationOutcome = {
      sourceId,
      href: anchor.href,
      kind: sameDocumentFragment ? 'fragment' : 'external',
      url: sameDocumentFragment ? resolved.hash : resolved.href,
      target: anchor.target,
      fragmentId,
    };
    this.navigationOutcomes.push(outcome);
    this.navigation.onNavigate?.(outcome);
  }

  private performFormDefault(buttonId: string): void {
    const action = this.formDefaults.get(buttonId);
    if (!action) return;
    if (action.type === 'submit') {
      const invalidControlIds = this.controls?.validateFormControls?.(action.controlIds) ?? [];
      let focusTargetId: string | undefined;
      for (const controlId of invalidControlIds) {
        const invalid = this.dispatcher.dispatch({
          type: 'invalid',
          targetId: controlId,
          ...this.liveState(controlId),
        });
        if (!focusTargetId && invalid && !invalid.defaultPrevented) focusTargetId = controlId;
      }
      if (invalidControlIds.length) {
        if (focusTargetId) this.setFocus(focusTargetId);
        return;
      }
      this.dispatcher.dispatch({ type: 'submit', targetId: action.formId });
      return;
    }
    const reset = this.dispatcher.dispatch({ type: 'reset', targetId: action.formId });
    if (!reset?.defaultPrevented) this.controls?.resetFormControls?.(action.controlIds);
  }

  private resolveElementId(mesh: AbstractMesh | undefined): string | undefined {
    return this.resolveElementIds(mesh)[0];
  }

  private resolveElementIds(mesh: AbstractMesh | undefined): string[] {
    const elementIds: string[] = [];
    let candidate: AbstractMesh | null | undefined = mesh;
    while (candidate) {
      const elementId = candidate.metadata?.elementId;
      if (typeof elementId === 'string' && elementId && !elementIds.includes(elementId)) {
        elementIds.push(elementId);
      }
      candidate = candidate.parent instanceof AbstractMesh ? candidate.parent : undefined;
    }
    return elementIds;
  }
}
