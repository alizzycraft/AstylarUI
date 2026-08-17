import { Scene } from '@babylonjs/core';
import { SiteData } from '../app/types/site-data';

export type AstylarInvalidationReason =
  | 'initial'
  | 'update'
  | 'resize'
  | 'asset'
  | 'manual'
  | (string & {});

export interface AstylarSessionSnapshot {
  revision: number;
  status: 'idle' | 'scheduled' | 'rendering' | 'disposed';
  pendingReasons: readonly AstylarInvalidationReason[];
}

export interface AstylarRenderSessionOptions {
  requestFrame?: (callback: () => void) => number;
  cancelFrame?: (handle: number) => void;
}

export type AstylarReflow = (
  siteData: SiteData,
  reasons: readonly AstylarInvalidationReason[],
) => void | Promise<void>;

interface SettlementWaiter {
  resolve: (snapshot: AstylarSessionSnapshot) => void;
  reject: (error: unknown) => void;
}

/**
 * Owns the mutable layout lifecycle for one Babylon scene.
 *
 * Invalidations are coalesced to an animation frame. An invalidation raised
 * during a reflow is deferred to a follow-up frame, so reflows never overlap.
 */
export class AstylarRenderSession {
  private readonly requestFrame: (callback: () => void) => number;
  private readonly cancelFrame: (handle: number) => void;
  private readonly pendingReasons = new Set<AstylarInvalidationReason>();
  private readonly settlementWaiters: SettlementWaiter[] = [];
  private scheduledFrame: number | null = null;
  private rendering = false;
  private disposed = false;
  private revision = 0;
  private currentSiteData: SiteData;

  constructor(
    readonly scene: Scene,
    initialSiteData: SiteData,
    private readonly reflow: AstylarReflow,
    options: AstylarRenderSessionOptions = {},
  ) {
    this.currentSiteData = initialSiteData;
    this.requestFrame = options.requestFrame ?? ((callback) => requestAnimationFrame(callback));
    this.cancelFrame = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));
  }

  get siteData(): SiteData {
    return this.currentSiteData;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  get snapshot(): AstylarSessionSnapshot {
    return {
      revision: this.revision,
      status: this.disposed
        ? 'disposed'
        : this.rendering
          ? 'rendering'
          : this.scheduledFrame !== null
            ? 'scheduled'
            : 'idle',
      pendingReasons: [...this.pendingReasons],
    };
  }

  update(siteData: SiteData): Promise<AstylarSessionSnapshot> {
    this.ensureActive();
    this.currentSiteData = siteData;
    return this.invalidate('update');
  }

  invalidate(reason: AstylarInvalidationReason = 'manual'): Promise<AstylarSessionSnapshot> {
    this.ensureActive();
    this.pendingReasons.add(reason);
    this.scheduleIfNeeded();
    return this.whenSettled();
  }

  whenSettled(): Promise<AstylarSessionSnapshot> {
    this.ensureActive();
    if (!this.rendering && this.scheduledFrame === null && this.pendingReasons.size === 0) {
      return Promise.resolve(this.snapshot);
    }
    return new Promise((resolve, reject) => {
      this.settlementWaiters.push({ resolve, reject });
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.scheduledFrame !== null) {
      this.cancelFrame(this.scheduledFrame);
      this.scheduledFrame = null;
    }
    this.pendingReasons.clear();
    this.rejectWaiters(new Error('Astylar render session was disposed before settling.'));
  }

  private scheduleIfNeeded(): void {
    if (this.disposed || this.rendering || this.scheduledFrame !== null) return;
    this.scheduledFrame = this.requestFrame(() => {
      this.scheduledFrame = null;
      void this.performReflow();
    });
  }

  private async performReflow(): Promise<void> {
    if (this.disposed || this.rendering || this.pendingReasons.size === 0) return;
    const reasons = [...this.pendingReasons];
    this.pendingReasons.clear();
    this.rendering = true;

    try {
      await this.reflow(this.currentSiteData, reasons);
      this.revision += 1;
    } catch (error) {
      this.pendingReasons.clear();
      this.rendering = false;
      this.rejectWaiters(error);
      return;
    }

    this.rendering = false;
    if (this.disposed) return;
    if (this.pendingReasons.size > 0) {
      this.scheduleIfNeeded();
      return;
    }
    this.resolveWaiters();
  }

  private resolveWaiters(): void {
    const waiters = this.settlementWaiters.splice(0);
    const snapshot = this.snapshot;
    waiters.forEach(({ resolve }) => resolve(snapshot));
  }

  private rejectWaiters(error: unknown): void {
    const waiters = this.settlementWaiters.splice(0);
    waiters.forEach(({ reject }) => reject(error));
  }

  private ensureActive(): void {
    if (this.disposed) {
      throw new Error('Astylar render session is disposed.');
    }
  }
}
