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
  emitsImmediateChangeOnKeyboardMutation?(elementId: string): boolean;
  activate?(elementId: string): AstylarControlActivation | undefined;
  canActivateWithSpace?(elementId: string): boolean;
  canActivateWithEnter?(elementId: string): boolean;
  getRadioNavigationTarget?(elementId: string, direction: -1 | 1): string | undefined;
  resetFormControls?(elementIds: readonly string[]): void;
  validateFormControls?(elementIds: readonly string[]): readonly string[];
  setActiveState?(elementId: string, active: boolean): void;
  setFocusState?(elementId: string, focused: boolean): void;
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
    this.controlTypes = this.buildControlTypes(siteData);
    this.labelTargets = this.buildLabelTargets(siteData);
    this.formDefaults = this.buildFormDefaults(siteData);
    this.implicitSubmitTargets = this.buildImplicitSubmitTargets(siteData);
    this.pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
      this.handlePointer(pointerInfo);
    });
    this.canvas = canvasOverride ?? scene.getEngine().getRenderingCanvas();
    if (this.canvas) {
      if (this.canvas.tabIndex < 0) this.canvas.tabIndex = 0;
      this.canvas.addEventListener('keydown', this.handleKeyDown);
      this.canvas.addEventListener('keyup', this.handleKeyUp);
    }
  }

  get snapshot(): AstylarInteractionSnapshot {
    return {
      pointerObservers: this.pointerObserver ? 1 : 0,
      keyboardListeners: this.canvas && !this.disposed ? 2 : 0,
      handlers: this.dispatcher.handlerCount,
      pressedElementId: this.pressedElementId,
      hoveredElementId: this.hoveredElementId,
      focusedElementId: this.controls?.getFocusedElementId(),
      disposed: this.disposed,
    };
  }

  setSiteData(siteData: SiteData): void {
    const nextFocusOrder = this.buildFocusOrder(siteData);
    const nextControlTypes = this.buildControlTypes(siteData);
    const focusedElementId = this.controls?.getFocusedElementId();
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
    if (this.pressedElementId) this.controls?.setActiveState?.(this.pressedElementId, false);
    const focusedElementId = this.controls?.getFocusedElementId();
    if (focusedElementId) this.controls?.setFocusState?.(focusedElementId, false);
    this.pressedElementId = undefined;
    this.hoveredElementId = undefined;
    this.pendingSpaceActivationId = undefined;
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
    if (event.key === 'Enter' && this.controls?.canActivateWithEnter?.(targetId)) {
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

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (this.disposed) return;
    const targetId = this.controls?.getFocusedElementId();
    if (!targetId) return;
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
    if (accepted) this.performFormDefault(targetId);
    return accepted;
  }

  private moveFocus(direction: -1 | 1): void {
    if (!this.focusOrder.length) return;
    const current = this.controls?.getFocusedElementId();
    const currentIndex = current ? this.focusOrder.indexOf(current) : -1;
    const nextIndex = direction === 1
      ? (currentIndex + 1 + this.focusOrder.length) % this.focusOrder.length
      : (currentIndex <= 0 ? this.focusOrder.length - 1 : currentIndex - 1);
    this.setFocus(this.focusOrder[nextIndex]);
  }

  private radioNavigationDirection(key: string): -1 | 1 | undefined {
    if (key === 'ArrowLeft' || key === 'ArrowUp') return -1;
    if (key === 'ArrowRight' || key === 'ArrowDown') return 1;
    return undefined;
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
      this.controls.setFocusState?.(previous, false);
      this.dispatcher.dispatch({
        type: 'blur',
        targetId: previous,
        ...this.liveState(previous),
      });
    }
    if (elementId && this.controls?.focus(elementId)) {
      this.controls.setFocusState?.(elementId, true);
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
    let candidate: AbstractMesh | null | undefined = mesh;
    while (candidate) {
      const elementId = candidate.metadata?.elementId;
      if (typeof elementId === 'string' && elementId) return elementId;
      candidate = candidate.parent instanceof AbstractMesh ? candidate.parent : undefined;
    }
    return undefined;
  }
}
