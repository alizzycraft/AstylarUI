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
  disposed: boolean;
}

export type AstylarInteractionStateProvider = (elementId: string) => AstylarEventState;

/** Owns the Babylon observers for one scene and emits a small DOM-like event subset. */
export class AstylarInteractionRuntime {
  private readonly dispatcher: AstylarEventDispatcher;
  private pointerObserver: Observer<PointerInfo> | null;
  private pressedElementId?: string;
  private hoveredElementId?: string;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    siteData: SiteData,
    options: AstylarEventOptions = {},
    private readonly getLiveState?: AstylarInteractionStateProvider,
  ) {
    this.dispatcher = new AstylarEventDispatcher(siteData, options);
    this.pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
      this.handlePointer(pointerInfo);
    });
  }

  get snapshot(): AstylarInteractionSnapshot {
    return {
      pointerObservers: this.pointerObserver ? 1 : 0,
      keyboardListeners: 0,
      handlers: this.dispatcher.handlerCount,
      pressedElementId: this.pressedElementId,
      hoveredElementId: this.hoveredElementId,
      disposed: this.disposed,
    };
  }

  setSiteData(siteData: SiteData): void {
    this.dispatcher.setSiteData(siteData);
    if (this.pressedElementId && !this.dispatcher.hasEnabledTarget(this.pressedElementId)) {
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
      if (!targetId || !this.dispatcher.hasEnabledTarget(targetId)) {
        this.pressedElementId = undefined;
        return;
      }
      this.pressedElementId = targetId;
      this.dispatchPointer('pointerdown', targetId, pointerInfo);
      return;
    }
    if (pointerInfo.type === PointerEventTypes.POINTERUP) {
      if (targetId) this.dispatchPointer('pointerup', targetId, pointerInfo);
      if (targetId && targetId === this.pressedElementId) {
        this.dispatchPointer('click', targetId, pointerInfo);
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
  ): void {
    const nativeEvent = pointerInfo.event as PointerEvent | MouseEvent | undefined;
    const state = {
      ...this.dispatcher.getElementState(targetId),
      ...this.getLiveState?.(targetId),
    };
    this.dispatcher.dispatch({
      type,
      targetId,
      ...state,
      button: nativeEvent?.button ?? 0,
      pointerType: nativeEvent && 'pointerType' in nativeEvent
        ? nativeEvent.pointerType || 'mouse'
        : 'mouse',
    });
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
