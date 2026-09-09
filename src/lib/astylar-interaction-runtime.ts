import {
  AbstractMesh,
  Observer,
  PointerEventTypes,
  PointerInfo,
  Scene,
} from '@babylonjs/core';
import type { SiteData } from '../app/types/site-data';
import type { CssPoint } from '../app/services/coordinate-space.types';
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
  focusVisible: boolean;
  modalDialogId?: string;
  navigationOutcomes: readonly AstylarNavigationOutcome[];
  disposed: boolean;
}

export interface AstylarInteractionDialogAdapter {
  setTopLayer(elementIds: readonly string[], active: boolean): void;
  setOpen?(dialogId: string, elementIds: readonly string[], open: boolean): void;
  restoreFocus?(elementId: string): void;
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

/** Selects the authored element plane rather than a renderer-owned descendant. */
export function selectElementProjectionMesh(
  meshes: readonly AbstractMesh[],
  elementId: string,
): AbstractMesh | undefined {
  const candidates = meshes.filter((candidate) =>
    candidate.metadata?.elementId === elementId &&
    candidate.metadata?.element?.id === elementId,
  );
  return candidates.find((candidate) => candidate.name === elementId) ??
    candidates.find((candidate) => candidate.metadata?.isTextMesh === false) ??
    candidates[0];
}

/** Resolves pointer X in canvas CSS pixels even when offsetX is target-relative. */
export function resolveCanvasPointerX(
  event: Pick<PointerEvent, 'clientX' | 'offsetX'> | undefined,
  canvasRect: Pick<DOMRect, 'left'> | undefined,
): number | undefined {
  if (event && canvasRect && Number.isFinite(event.clientX)) return event.clientX - canvasRect.left;
  return event?.offsetX;
}

/** Resolves a pointer in canvas CSS pixels, independent of the picked mesh. */
export function resolveCanvasPointerPoint(
  event: Pick<PointerEvent, 'clientX' | 'clientY' | 'offsetX' | 'offsetY'> | undefined,
  canvasRect: Pick<DOMRect, 'left' | 'top'> | undefined,
): CssPoint | undefined {
  if (!event) return undefined;
  const x = canvasRect && Number.isFinite(event.clientX)
    ? event.clientX - canvasRect.left
    : event.offsetX;
  const y = canvasRect && Number.isFinite(event.clientY)
    ? event.clientY - canvasRect.top
    : event.offsetY;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined;
}

export interface AstylarInteractionFocusOptions {
  focusVisible?: boolean;
  scrollIntoView?: boolean;
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
  focus(elementId: string, focusVisible?: boolean): boolean;
  blur(elementId: string, preserveSelectionOnReset?: boolean): boolean;
  handleKeyDown(elementId: string, event: KeyboardEvent): void;
  scrollTextControl?(elementId: string, deltaX: number, deltaY: number): boolean;
  commitsValueOnBlur(elementId: string): boolean;
  emitsImmediateChangeOnKeyboardMutation?(elementId: string): boolean;
  setRangeFromPointer?(elementId: string, localX: number, width: number): boolean;
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
  setHoverState?(elementId: string, hovered: boolean): void;
  setActiveState?(elementId: string, active: boolean): void;
  setFocusState?(elementId: string, focused: boolean): void;
}

export interface AstylarInteractionScrollAdapter {
  scrollFrom(elementId: string, deltaX: number, deltaY: number): boolean;
  isPointVisible(elementId: string, point?: CssPoint): boolean;
  scrollIntoView?(elementId: string, alignment?: 'start' | 'nearest'): boolean;
  getViewportRect?(
    elementId: string,
  ): { x: number; y: number; width: number; height: number } | undefined;
}

interface AstylarFormDefault {
  formId: string;
  controlIds: readonly string[];
  type: 'reset' | 'submit';
}

interface AstylarModalDialogState {
  id: string;
  elementIds: ReadonlySet<string>;
  focusOrder: readonly string[];
  initialFocusId?: string;
}

/** Owns the Babylon observers for one scene and emits a small DOM-like event subset. */
export class AstylarInteractionRuntime {
  private readonly dispatcher: AstylarEventDispatcher;
  private pointerObserver: Observer<PointerInfo> | null;
  private pressedElementId?: string;
  private pressedElementPath: string[] = [];
  private rangePointerChanged = false;
  private hoveredElementId?: string;
  private hoveredElementPath: string[] = [];
  private disposed = false;
  private readonly canvas: HTMLCanvasElement | null;
  private focusOrder: string[] = [];
  private focusableElementIds = new Set<string>();
  private controlTypes = new Map<string, string>();
  private labelTargets = new Map<string, string>();
  private formDefaults = new Map<string, AstylarFormDefault>();
  private implicitSubmitTargets = new Map<string, string>();
  private focusedValueAtEntry?: string;
  private pendingSpaceActivationId?: string;
  private readonly suppressedKeyUps = new Set<string>();
  private pressedExpandedSelectOption?: { elementId: string; optionIndex: number };
  private focusedNonControlId?: string;
  private focusVisible = false;
  private anchors = new Map<string, { href: string; target?: string }>();
  private readonly navigationOutcomes: AstylarNavigationOutcome[] = [];
  private modalDialog?: AstylarModalDialogState;
  private presentedModalDialog?: AstylarModalDialogState;
  private pendingModalInitialFocus = false;
  private modalInvokerId?: string;

  constructor(
    private readonly scene: Scene,
    siteData: SiteData,
    options: AstylarEventOptions = {},
    private readonly getLiveState?: AstylarInteractionStateProvider,
    private readonly controls?: AstylarInteractionControlAdapter,
    canvasOverride?: HTMLCanvasElement,
    private readonly scrolling?: AstylarInteractionScrollAdapter,
    private readonly navigation: AstylarNavigationOptions = {},
    private readonly dialogs?: AstylarInteractionDialogAdapter,
  ) {
    this.dispatcher = new AstylarEventDispatcher(siteData, options);
    this.focusOrder = this.buildFocusOrder(siteData);
    this.focusableElementIds = this.buildFocusableElementIds(siteData);
    this.controlTypes = this.buildControlTypes(siteData);
    this.labelTargets = this.buildLabelTargets(siteData);
    this.formDefaults = this.buildFormDefaults(siteData);
    this.implicitSubmitTargets = this.buildImplicitSubmitTargets(siteData);
    this.anchors = this.buildAnchors(siteData);
    this.modalDialog = this.buildActiveModalDialog(siteData, this.focusOrder);
    this.pendingModalInitialFocus = !!this.modalDialog;
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
      focusVisible: this.focusVisible,
      modalDialogId: this.modalDialog?.id,
      navigationOutcomes: [...this.navigationOutcomes],
      disposed: this.disposed,
    };
  }

  /** Applies browser semantic focus through the same scene-owned focus path. */
  focusElement(
    elementId: string,
    options: AstylarInteractionFocusOptions = {},
    preservePreviousSelectionOnReset = false,
  ): boolean {
    if (this.disposed || !this.focusableElementIds.has(elementId) ||
        !this.isAllowedByModal(elementId) ||
        !this.dispatcher.hasEnabledTarget(elementId)) return false;
    this.setFocus(
      elementId,
      preservePreviousSelectionOnReset,
      options.focusVisible ?? true,
    );
    if (options.scrollIntoView !== false) {
      this.scrolling?.scrollIntoView?.(elementId, 'nearest');
    }
    return this.getFocusedElementId() === elementId;
  }

  blurElement(): boolean {
    if (this.disposed || !this.getFocusedElementId()) return false;
    this.setFocus(undefined);
    return this.getFocusedElementId() === undefined;
  }

  /** Applies browser semantic focus through the same scene-owned focus path. */
  focusSemanticElement(
    elementId: string,
    preservePreviousSelectionOnReset = false,
    focusVisible = true,
  ): boolean {
    return this.focusElement(
      elementId,
      { focusVisible },
      preservePreviousSelectionOnReset,
    );
  }

  /** Clears scene focus when its corresponding native semantic node blurs. */
  blurSemanticElement(elementId: string): boolean {
    if (this.getFocusedElementId() !== elementId) return false;
    return this.blurElement();
  }

  /** Routes assistive/native click activation through typed Astylar defaults. */
  activateSemanticElement(elementId: string): boolean {
    if (this.disposed || !this.isAllowedByModal(elementId) ||
        !this.dispatcher.hasEnabledTarget(elementId)) return false;
    if (this.focusableElementIds.has(elementId)) this.setFocus(elementId);
    const accepted = this.activateAndClick(elementId);
    const labelTargetId = accepted ? this.labelTargets.get(elementId) : undefined;
    if (labelTargetId && this.dispatcher.hasEnabledTarget(labelTargetId)) {
      if (this.focusableElementIds.has(labelTargetId)) this.setFocus(labelTargetId);
      return this.activateAndClick(labelTargetId);
    }
    return accepted;
  }

  /** Reuses the canvas keyboard/default-action pipeline for semantic focus. */
  handleSemanticKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      if (this.modalDialog) {
        this.handleKeyDown(event);
        return;
      }
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
    const nextFocusableElementIds = this.buildFocusableElementIds(siteData);
    const nextControlTypes = this.buildControlTypes(siteData);
    const nextModalDialog = this.buildActiveModalDialog(siteData, nextFocusOrder);
    const modalChanged = this.modalDialog?.id !== nextModalDialog?.id;
    const focusedElementId = this.getFocusedElementId();
    if (modalChanged) {
      this.modalInvokerId = nextModalDialog && focusedElementId &&
          !nextModalDialog.elementIds.has(focusedElementId)
        ? focusedElementId
        : undefined;
    }
    const modalNeedsFocus = !!nextModalDialog &&
      (!focusedElementId || !nextModalDialog.elementIds.has(focusedElementId));
    if (focusedElementId &&
        (!nextFocusableElementIds.has(focusedElementId) ||
          this.controlTypes.get(focusedElementId) !== nextControlTypes.get(focusedElementId))) {
      // Dispatch commit/blur while the old element and event path are still live.
      this.setFocus(undefined);
    }
    this.dispatcher.setSiteData(siteData);
    this.focusOrder = nextFocusOrder;
    this.focusableElementIds = nextFocusableElementIds;
    this.controlTypes = nextControlTypes;
    this.labelTargets = this.buildLabelTargets(siteData);
    this.formDefaults = this.buildFormDefaults(siteData);
    this.implicitSubmitTargets = this.buildImplicitSubmitTargets(siteData);
    this.anchors = this.buildAnchors(siteData);
    this.modalDialog = nextModalDialog;
    if ((modalChanged || modalNeedsFocus) && nextModalDialog) {
      this.pendingModalInitialFocus = true;
    }
    if (this.pressedElementId && !this.dispatcher.hasEnabledTarget(this.pressedElementId)) {
      this.clearPressedActiveState();
      this.pressedElementId = undefined;
    } else if (this.pressedElementId) {
      const nextPath = [...this.dispatcher.getElementPath(this.pressedElementId)];
      for (const elementId of this.pressedElementPath) {
        if (!nextPath.includes(elementId)) this.controls?.setActiveState?.(elementId, false);
      }
      this.pressedElementPath = nextPath;
    }
    if (this.hoveredElementId && !this.dispatcher.hasEnabledTarget(this.hoveredElementId)) {
      for (const elementId of this.hoveredElementPath) {
        this.controls?.setHoverState?.(elementId, false);
      }
      this.hoveredElementId = undefined;
      this.hoveredElementPath = [];
    } else if (this.hoveredElementId) {
      const nextPath = [...this.dispatcher.getElementPath(this.hoveredElementId)];
      for (const elementId of this.hoveredElementPath) {
        if (!nextPath.includes(elementId)) this.controls?.setHoverState?.(elementId, false);
      }
      this.hoveredElementPath = nextPath;
    }
  }

  /** Applies modal presentation and deterministic initial focus after a scene rebuild. */
  reconcileModalState(): void {
    if (this.disposed) return;
    // A visual rebuild replaces the meshes while the logical pointer state is
    // intentionally preserved. Reapply that state to the replacement meshes
    // even when the pointer has not moved, so :hover/:active paint does not
    // disappear until the next native pointer event.
    if (this.hoveredElementId && this.dispatcher.hasEnabledTarget(this.hoveredElementId)) {
      for (const elementId of [...this.hoveredElementPath].reverse()) {
        this.controls?.setHoverState?.(elementId, true);
      }
    }
    if (this.pressedElementId && this.dispatcher.hasEnabledTarget(this.pressedElementId)) {
      for (const elementId of [...this.pressedElementPath].reverse()) {
        this.controls?.setActiveState?.(elementId, true);
      }
    }
    const focusedElementId = this.getFocusedElementId();
    if (focusedElementId && this.dispatcher.hasEnabledTarget(focusedElementId)) {
      // Reconciliation replaces the painted mesh while logical focus remains
      // on the same control. Reapply :focus to that replacement just as we do
      // for retained hover and active state; otherwise a state-driven rebuild
      // silently drops authored focus paint until focus changes again.
      this.controls?.setFocusState?.(focusedElementId, true);
    }
    if (this.presentedModalDialog?.id !== this.modalDialog?.id) {
      if (this.presentedModalDialog) {
        this.dialogs?.setTopLayer([...this.presentedModalDialog.elementIds], false);
        this.dialogs?.setOpen?.(
          this.presentedModalDialog.id,
          [...this.presentedModalDialog.elementIds],
          false,
        );
      }
    }
    this.presentedModalDialog = this.modalDialog;
    if (this.modalDialog) {
      this.dialogs?.setOpen?.(
        this.modalDialog.id,
        [...this.modalDialog.elementIds],
        true,
      );
      this.dialogs?.setTopLayer([...this.modalDialog.elementIds], true);
    }
    if (!this.pendingModalInitialFocus || !this.modalDialog) return;
    this.pendingModalInitialFocus = false;
    const current = this.getFocusedElementId();
    if (current && this.modalDialog.elementIds.has(current)) return;
    if (this.modalDialog.initialFocusId) this.setFocus(this.modalDialog.initialFocusId);
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
    this.clearPressedActiveState();
    const focusedElementId = this.getFocusedElementId();
    if (focusedElementId) this.controls?.setFocusState?.(focusedElementId, false);
    this.pressedElementId = undefined;
    for (const elementId of this.hoveredElementPath) {
      this.controls?.setHoverState?.(elementId, false);
    }
    this.hoveredElementId = undefined;
    this.hoveredElementPath = [];
    this.pendingSpaceActivationId = undefined;
    this.suppressedKeyUps.clear();
    this.pressedExpandedSelectOption = undefined;
    this.focusedNonControlId = undefined;
    this.navigationOutcomes.length = 0;
    if (this.presentedModalDialog) {
      this.dialogs?.setTopLayer([...this.presentedModalDialog.elementIds], false);
      this.dialogs?.setOpen?.(
        this.presentedModalDialog.id,
        [...this.presentedModalDialog.elementIds],
        false,
      );
    }
    this.modalDialog = undefined;
    this.presentedModalDialog = undefined;
    this.pendingModalInitialFocus = false;
    this.modalInvokerId = undefined;
  }

  private handlePointer(pointerInfo: PointerInfo): void {
    if (this.disposed) return;
    const expandedSelectOption = this.resolveExpandedSelectOption(pointerInfo);
    if (pointerInfo.type === PointerEventTypes.POINTERDOWN && expandedSelectOption) {
      if (!this.scrolling || this.scrolling.isPointVisible(
        expandedSelectOption.elementId,
        this.pointerCssPoint(pointerInfo),
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
    const targetId = this.resolvePointerTarget(pointerInfo);
    if (pointerInfo.type === PointerEventTypes.POINTERWHEEL) return;
    if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
      this.updateHover(targetId, pointerInfo);
      const movementTargetId = this.pressedElementId ?? targetId;
      if (movementTargetId && this.dispatcher.hasEnabledTarget(movementTargetId)) {
        this.dispatchPointer('pointermove', movementTargetId, pointerInfo);
        if (this.pressedElementId && this.updateRangeFromPointer(movementTargetId, pointerInfo)) {
          this.rangePointerChanged = true;
          this.dispatcher.dispatch({
            type: 'input', targetId: movementTargetId, ...this.liveState(movementTargetId),
          });
        }
      }
      return;
    }
    if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
      if (!targetId) {
        this.clearPressedActiveState();
        this.pressedElementId = undefined;
        if (!this.modalDialog) {
          this.canvas?.focus();
          this.setFocus(undefined);
        } else {
          pointerInfo.event?.preventDefault();
          const focusedElementId = this.getFocusedElementId();
          if (focusedElementId) {
            setTimeout(() => this.dialogs?.restoreFocus?.(focusedElementId), 0);
          }
        }
        return;
      }
      if (!this.dispatcher.hasEnabledTarget(targetId)) {
        this.clearPressedActiveState();
        this.pressedElementId = undefined;
        this.setFocus(undefined);
        return;
      }
      this.clearPressedActiveState();
      this.pressedElementId = targetId;
      this.pressedElementPath = [...this.dispatcher.getElementPath(targetId)];
      this.rangePointerChanged = false;
      const dispatched = this.dispatchPointer('pointerdown', targetId, pointerInfo);
      for (const elementId of [...this.pressedElementPath].reverse()) {
        this.controls?.setActiveState?.(elementId, true);
      }
      if (!dispatched?.defaultPrevented) {
        this.canvas?.focus();
        this.setFocus(this.nearestFocusableElementId(targetId), false, false);
        const nativeEvent = pointerInfo.event as PointerEvent | undefined;
        if (nativeEvent?.pointerId !== undefined) {
          try {
            this.canvas?.setPointerCapture?.(nativeEvent.pointerId);
          } catch {
            // Synthetic events and detached canvases do not own a native pointer.
          }
        }
        if (this.updateRangeFromPointer(targetId, pointerInfo)) {
          this.rangePointerChanged = true;
          this.dispatcher.dispatch({
            type: 'input', targetId, ...this.liveState(targetId),
          });
        }
      }
      return;
    }
    if (pointerInfo.type === PointerEventTypes.POINTERUP) {
      const pressedElementId = this.pressedElementId;
      if (pressedElementId && this.updateRangeFromPointer(pressedElementId, pointerInfo)) {
        this.rangePointerChanged = true;
        this.dispatcher.dispatch({
          type: 'input', targetId: pressedElementId, ...this.liveState(pressedElementId),
        });
      }
      this.clearPressedActiveState();
      if (targetId) this.dispatchPointer('pointerup', targetId, pointerInfo);
      if (pressedElementId && this.rangePointerChanged) {
        this.dispatcher.dispatch({
          type: 'change', targetId: pressedElementId, ...this.liveState(pressedElementId),
        });
      }
      if (targetId && targetId === this.pressedElementId) {
        const accepted = this.activateAndClick(targetId, pointerInfo);
        const labelTargetId = accepted ? this.labelTargets.get(targetId) : undefined;
        if (labelTargetId && this.dispatcher.hasEnabledTarget(labelTargetId)) {
          this.setFocus(this.focusableElementIds.has(labelTargetId) ? labelTargetId : undefined, false, false);
          this.activateAndClick(labelTargetId, pointerInfo);
        }
      }
      this.pressedElementId = undefined;
      this.rangePointerChanged = false;
      const nativeEvent = pointerInfo.event as PointerEvent | undefined;
      if (nativeEvent?.pointerId !== undefined &&
          this.canvas?.hasPointerCapture?.(nativeEvent.pointerId)) {
        try {
          this.canvas.releasePointerCapture(nativeEvent.pointerId);
        } catch {
          // The browser may already have released capture during cancellation.
        }
      }
    }
  }

  private clearPressedActiveState(): void {
    for (const elementId of this.pressedElementPath) {
      this.controls?.setActiveState?.(elementId, false);
    }
    this.pressedElementPath = [];
  }

  private nearestFocusableElementId(targetId: string): string | undefined {
    return this.dispatcher.getElementPath(targetId)
      .find((elementId) => this.focusableElementIds.has(elementId));
  }

  private updateHover(targetId: string | undefined, pointerInfo: PointerInfo): void {
    if (targetId === this.hoveredElementId) return;
    const nextTargetId = targetId && this.dispatcher.hasEnabledTarget(targetId)
      ? targetId
      : undefined;
    const nextPath = nextTargetId
      ? [...this.dispatcher.getElementPath(nextTargetId)]
      : [];
    const nextIds = new Set(nextPath);
    const previousIds = new Set(this.hoveredElementPath);
    for (const elementId of this.hoveredElementPath) {
      if (nextIds.has(elementId)) continue;
      this.dispatchPointer('pointerleave', elementId, pointerInfo);
      this.controls?.setHoverState?.(elementId, false);
    }
    for (const elementId of [...nextPath].reverse()) {
      if (previousIds.has(elementId)) continue;
      this.controls?.setHoverState?.(elementId, true);
      this.dispatchPointer('pointerenter', elementId, pointerInfo);
    }
    this.hoveredElementId = nextTargetId;
    this.hoveredElementPath = nextPath;
  }

  private resolvePointerTarget(pointerInfo: PointerInfo): string | undefined {
    const directPoint = this.pointerCssPoint(pointerInfo);
    const directMesh = pointerInfo.pickInfo?.pickedMesh ?? undefined;
    const direct = this.firstEligiblePointerTarget(
      directMesh,
      directPoint,
    );
    if (direct) {
      const descendant = this.dispatcher.hasEnabledDescendant(direct)
        ? this.findPickedDescendantTarget(direct, pointerInfo)
        : undefined;
      return descendant ?? direct;
    }

    // A direct hit on a visible authored but non-interactive element is still
    // authoritative pointer ownership. Returning it lets hover leave/blur
    // defaults run and prevents the fallback multi-pick from selecting a stale
    // or visually obscured interactive mesh behind it.
    const directBlocker = this.firstVisiblePointerElement(directMesh, directPoint);
    if (directBlocker) return directBlocker;

    const nativeEvent = pointerInfo.event as PointerEvent | MouseEvent | undefined;
    if (!nativeEvent) return undefined;
    // The native event carries the current movement coordinates. Babylon's
    // scene pointer fields can still describe the previous pick when pointer
    // move picking was skipped, which would make hover appear to stick.
    const x = Number.isFinite(nativeEvent.offsetX) ? nativeEvent.offsetX : this.scene.pointerX;
    const y = Number.isFinite(nativeEvent.offsetY) ? nativeEvent.offsetY : this.scene.pointerY;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    const picks = this.scene.multiPick(x, y, (mesh) => mesh.isPickable) ?? [];
    for (const pick of [...picks].sort((left, right) => left.distance - right.distance)) {
      const target = this.firstEligiblePointerTarget(
        pick.pickedMesh ?? undefined,
        this.pointerCssPoint(pointerInfo),
      );
      if (target) return target;
    }
    return undefined;
  }

  private findPickedDescendantTarget(
    ancestorId: string,
    pointerInfo: PointerInfo,
  ): string | undefined {
    const nativeEvent = pointerInfo.event as PointerEvent | MouseEvent | undefined;
    if (!nativeEvent) return undefined;
    const x = Number.isFinite(nativeEvent.offsetX) ? nativeEvent.offsetX : this.scene.pointerX;
    const y = Number.isFinite(nativeEvent.offsetY) ? nativeEvent.offsetY : this.scene.pointerY;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    const picks = this.scene.multiPick(x, y, (mesh) => mesh.isPickable) ?? [];
    const cssPoint = this.pointerCssPoint(pointerInfo);
    let deepest: { id: string; depth: number } | undefined;
    for (const pick of picks) {
      const target = this.firstEligiblePointerTarget(
        pick.pickedMesh ?? undefined,
        cssPoint,
      );
      if (!target || target === ancestorId) continue;
      const path = this.dispatcher.getElementPath(target);
      const ancestorIndex = path.indexOf(ancestorId);
      if (ancestorIndex < 1) continue;
      if (!deepest || ancestorIndex > deepest.depth) {
        deepest = { id: target, depth: ancestorIndex };
      }
    }
    return deepest?.id;
  }

  private firstVisiblePointerElement(
    mesh: AbstractMesh | undefined,
    point?: CssPoint,
  ): string | undefined {
    for (const elementId of this.resolveElementIds(mesh)) {
      if (!this.isAllowedByModal(elementId)) continue;
      if (this.scrolling && !this.scrolling.isPointVisible(elementId, point)) continue;
      return elementId;
    }
    return undefined;
  }

  private firstEligiblePointerTarget(
    mesh: AbstractMesh | undefined,
    point?: CssPoint,
  ): string | undefined {
    for (const elementId of this.resolveElementIds(mesh)) {
      if (!this.isAllowedByModal(elementId) || !this.dispatcher.hasEnabledTarget(elementId)) continue;
      if (this.scrolling && !this.scrolling.isPointVisible(elementId, point)) continue;
      return elementId;
    }
    return undefined;
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
    const canvasPoint = this.pointerCssPoint(pointerInfo);
    const canvasX = canvasPoint?.x;
    const canvasY = canvasPoint?.y;
    const targetRect = this.resolveElementRect(targetId);
    return this.dispatcher.dispatch({
      type,
      targetId,
      ...state,
      button: nativeEvent?.button ?? 0,
      buttons: nativeEvent?.buttons ?? 0,
      pointerId: nativeEvent && 'pointerId' in nativeEvent
        ? nativeEvent.pointerId
        : 1,
      pointerType: nativeEvent && 'pointerType' in nativeEvent
        ? nativeEvent.pointerType || 'mouse'
        : 'mouse',
      isPrimary: nativeEvent && 'isPrimary' in nativeEvent
        ? nativeEvent.isPrimary
        : true,
      clientX: nativeEvent?.clientX,
      clientY: nativeEvent?.clientY,
      canvasX,
      canvasY,
      localX: canvasX !== undefined && targetRect ? canvasX - targetRect.x : undefined,
      localY: canvasY !== undefined && targetRect ? canvasY - targetRect.y : undefined,
    });
  }

  private pointerCssPoint(pointerInfo: PointerInfo): CssPoint | undefined {
    return resolveCanvasPointerPoint(
      pointerInfo.event as PointerEvent | MouseEvent | undefined,
      this.canvas?.getBoundingClientRect(),
    );
  }

  private updateRangeFromPointer(elementId: string, pointerInfo: PointerInfo): boolean {
    const point = this.pointerCssPoint(pointerInfo);
    const rect = this.resolveElementRect(elementId);
    if (!point || !rect) return false;
    return this.controls?.setRangeFromPointer?.(
      elementId,
      point.x - rect.x,
      rect.width,
    ) ?? false;
  }

  private resolveElementRect(
    elementId: string,
  ): { x: number; y: number; width: number; height: number } | undefined {
    return this.scrolling?.getViewportRect?.(elementId);
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
    if (event.key === 'Escape' && this.modalDialog) {
      event.preventDefault();
      const cancel = this.dispatcher.dispatch({
        type: 'cancel',
        targetId: this.modalDialog.id,
      });
      if (!cancel?.defaultPrevented) this.dismissActiveModal();
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
    // Chromium reports trusted pixel-wheel deltas in backing-store units at high
    // DPR while its native scroll action advances CSS pixels. Normalize at the
    // canvas input boundary so the scroll runtime only ever receives CSS units.
    const pixelScale = window.devicePixelRatio || 1;
    const factor = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? lineScale
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? pageScale : pixelScale;
    const deltaX = event.deltaX * factor;
    const deltaY = event.deltaY * factor;
    const pointer = resolveCanvasPointerPoint(event, this.canvas?.getBoundingClientRect());
    for (const targetId of this.resolveElementIds(pick?.pickedMesh ?? undefined)) {
      if (!this.isAllowedByModal(targetId)) continue;
      if (!this.scrolling.isPointVisible(targetId, pointer)) continue;
      if (this.controls?.scrollTextControl?.(targetId, deltaX, deltaY) ||
          this.scrolling.scrollFrom(targetId, deltaX, deltaY)) {
        event.preventDefault();
        const hoverPick = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        const hoverPointerInfo = {
          type: PointerEventTypes.POINTERMOVE,
          event,
          pickInfo: hoverPick,
        } as unknown as PointerInfo;
        this.updateHover(this.resolvePointerTarget(hoverPointerInfo), hoverPointerInfo);
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

  private dismissActiveModal(): void {
    const dialog = this.modalDialog;
    if (!dialog) return;
    const invokerId = this.modalInvokerId;
    this.setFocus(undefined);
    this.dialogs?.setTopLayer([...dialog.elementIds], false);
    this.dialogs?.setOpen?.(dialog.id, [...dialog.elementIds], false);
    this.modalDialog = undefined;
    this.presentedModalDialog = undefined;
    this.pendingModalInitialFocus = false;
    this.modalInvokerId = undefined;
    if (invokerId && this.focusableElementIds.has(invokerId) &&
        this.dispatcher.hasEnabledTarget(invokerId)) {
      this.setFocus(invokerId);
      this.dialogs?.restoreFocus?.(invokerId);
    }
    setTimeout(() => {
      if (!this.disposed) this.dispatcher.dispatch({ type: 'close', targetId: dialog.id });
    }, 0);
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
    const focusOrder = this.modalDialog?.focusOrder ?? this.focusOrder;
    if (!focusOrder.length) return;
    const current = this.getFocusedElementId();
    const currentIndex = current ? focusOrder.indexOf(current) : -1;
    const nextIndex = direction === 1
      ? (currentIndex + 1 + focusOrder.length) % focusOrder.length
      : (currentIndex <= 0 ? focusOrder.length - 1 : currentIndex - 1);
    this.setFocus(focusOrder[nextIndex], true, true);
  }

  private radioNavigationDirection(key: string): -1 | 1 | undefined {
    if (key === 'ArrowLeft' || key === 'ArrowUp') return -1;
    if (key === 'ArrowRight' || key === 'ArrowDown') return 1;
    return undefined;
  }

  private setFocus(
    elementId: string | undefined,
    preservePreviousSelectionOnReset: boolean = false,
    focusVisible?: boolean,
  ): void {
    if (elementId && !this.isAllowedByModal(elementId)) return;
    const previous = this.getFocusedElementId();
    if (previous === elementId) {
      if (elementId && typeof focusVisible === 'boolean') {
        if (this.controlTypes.has(elementId)) this.controls?.focus(elementId, focusVisible);
        this.focusVisible = focusVisible;
      }
      return;
    }
    const nextFocusVisible = focusVisible ?? true;
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
      ? this.controls?.focus(elementId, nextFocusVisible)
      : this.focusableElementIds.has(elementId));
    if (elementId && focused) {
      this.focusVisible = nextFocusVisible;
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
      this.focusVisible = false;
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

  private buildFocusableElementIds(siteData: SiteData): Set<string> {
    const ids = new Set<string>();
    const visit = (element: SiteData['root']['children'][number]): void => {
      if (element.hidden) return;
      const focusable = element.tabindex !== undefined ||
        element.type === 'input' || element.type === 'button' ||
        element.type === 'select' || element.type === 'textarea' ||
        (element.type === 'a' && !!element.href);
      if (element.id && focusable && !element.disabled) ids.add(element.id);
      element.children?.forEach(visit);
    };
    siteData.root.children.forEach(visit);
    return ids;
  }

  private buildFocusOrder(siteData: SiteData): string[] {
    const entries: Array<{ id: string; tabIndex: number; order: number }> = [];
    let order = 0;
    const visit = (element: SiteData['root']['children'][number]): void => {
      const currentOrder = order++;
      if (element.hidden) return;
      const focusable = element.tabindex !== undefined ||
        element.type === 'input' || element.type === 'button' ||
        element.type === 'select' || element.type === 'textarea' ||
        (element.type === 'a' && !!element.href);
      const tabIndex = element.tabindex ?? 0;
      if (element.id && focusable && !element.disabled && tabIndex >= 0) {
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

  private buildActiveModalDialog(
    siteData: SiteData,
    focusOrder: readonly string[],
  ): AstylarModalDialogState | undefined {
    const dialogs: AstylarModalDialogState[] = [];
    const collectIds = (
      element: SiteData['root']['children'][number],
      ids: Set<string>,
      autofocusIds: string[],
    ): void => {
      if (element.hidden) return;
      if (element.id) {
        ids.add(element.id);
        if (element.autofocus) autofocusIds.push(element.id);
      }
      element.children?.forEach((child) => collectIds(child, ids, autofocusIds));
    };
    const visit = (element: SiteData['root']['children'][number]): void => {
      if (element.hidden) return;
      if (element.type === 'dialog' && element.open && element.modal && element.id) {
        const elementIds = new Set<string>();
        const autofocusIds: string[] = [];
        collectIds(element, elementIds, autofocusIds);
        const dialogFocusOrder = focusOrder.filter((id) => elementIds.has(id));
        dialogs.push({
          id: element.id,
          elementIds,
          focusOrder: dialogFocusOrder,
          initialFocusId: autofocusIds.find((id) => dialogFocusOrder.includes(id)) ??
            dialogFocusOrder[0],
        });
      }
      element.children?.forEach(visit);
    };
    siteData.root.children.forEach(visit);
    return dialogs.at(-1);
  }

  private isAllowedByModal(elementId: string | undefined): boolean {
    return !this.modalDialog || (!!elementId && this.modalDialog.elementIds.has(elementId));
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
