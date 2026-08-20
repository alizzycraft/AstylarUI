import type { Scene } from '@babylonjs/core';
import type { SiteData } from '../app/types/site-data';
import type { AstylarInteractionSnapshot } from './astylar-interaction-runtime';
import type { AstylarSceneResourceSnapshot } from './astylar-scene-resources';
import type { AstylarScrollSnapshot } from './astylar-scroll-runtime';
import type { AstylarSemanticSnapshot } from './astylar-semantic-bridge';
import type {
  AstylarInvalidationReason,
  AstylarSessionSnapshot,
} from './astylar-render-session';
import type { AstylarVisualReconciliationSnapshot } from './astylar-visual-reconciler';
import type {
  AstylarCapabilityRegistrySnapshot,
  AstylarPluginResourceSnapshot,
} from './astylar-plugin';
import {
  AstylarDiagnosticError,
  type AstylarDiagnostic,
} from './astylar-diagnostics';

export interface AstylarSurfaceDiagnostics {
  readonly messages: readonly AstylarDiagnostic[];
  readonly session?: AstylarSessionSnapshot;
  readonly resources?: AstylarSceneResourceSnapshot;
  readonly interaction?: AstylarInteractionSnapshot;
  readonly scrolling?: AstylarScrollSnapshot;
  readonly semantics?: AstylarSemanticSnapshot;
  readonly reconciliation?: AstylarVisualReconciliationSnapshot;
  readonly plugins: AstylarCapabilityRegistrySnapshot;
  readonly pluginResources: AstylarPluginResourceSnapshot;
}

/** An explicitly owned rendering surface returned by `Astylar.mount()`. */
export interface AstylarSurface {
  readonly scene: Scene;
  readonly disposed: boolean;
  readonly diagnostics: AstylarSurfaceDiagnostics;
  update(siteData: SiteData): Promise<AstylarSessionSnapshot>;
  resize(): Promise<AstylarSessionSnapshot>;
  whenSettled(): Promise<AstylarSessionSnapshot>;
  dispose(): void;
}

export interface AstylarSurfaceHost {
  update(siteData: SiteData, scene: Scene): Promise<AstylarSessionSnapshot>;
  invalidate(
    reason: AstylarInvalidationReason,
    scene: Scene,
  ): Promise<AstylarSessionSnapshot>;
  whenSettled(scene: Scene): Promise<AstylarSessionSnapshot>;
  getSession(scene: Scene): { snapshot: AstylarSessionSnapshot } | undefined;
  getResourceSnapshot(scene: Scene): AstylarSceneResourceSnapshot | undefined;
  getInteractionSnapshot(scene: Scene): AstylarInteractionSnapshot | undefined;
  getScrollSnapshot(scene: Scene): AstylarScrollSnapshot | undefined;
  getSemanticSnapshot(scene: Scene): AstylarSemanticSnapshot | undefined;
  getVisualReconciliationSnapshot(
    scene: Scene,
  ): AstylarVisualReconciliationSnapshot | undefined;
  getDiagnosticSnapshot(): readonly AstylarDiagnostic[];
  getPluginSnapshot(): AstylarCapabilityRegistrySnapshot;
  getPluginResourceSnapshot(): AstylarPluginResourceSnapshot;
  reportDiagnostic(diagnostic: AstylarDiagnostic): void;
}

export class AstylarSurfaceHandle implements AstylarSurface {
  private disposeRequested = false;
  private disposeMisuseReported = false;

  constructor(
    readonly scene: Scene,
    private readonly host: AstylarSurfaceHost,
  ) {}

  get disposed(): boolean {
    return this.disposeRequested || this.scene.isDisposed;
  }

  get diagnostics(): AstylarSurfaceDiagnostics {
    return {
      messages: this.host.getDiagnosticSnapshot(),
      session: this.host.getSession(this.scene)?.snapshot,
      resources: this.host.getResourceSnapshot(this.scene),
      interaction: this.host.getInteractionSnapshot(this.scene),
      scrolling: this.host.getScrollSnapshot(this.scene),
      semantics: this.host.getSemanticSnapshot(this.scene),
      reconciliation: this.host.getVisualReconciliationSnapshot(this.scene),
      plugins: this.host.getPluginSnapshot(),
      pluginResources: this.host.getPluginResourceSnapshot(),
    };
  }

  update(siteData: SiteData): Promise<AstylarSessionSnapshot> {
    this.assertActive('update');
    return this.host.update(siteData, this.scene);
  }

  resize(): Promise<AstylarSessionSnapshot> {
    this.assertActive('resize');
    this.scene.getEngine().resize(true);
    return this.host.invalidate('resize', this.scene);
  }

  whenSettled(): Promise<AstylarSessionSnapshot> {
    this.assertActive('wait for');
    return this.host.whenSettled(this.scene);
  }

  dispose(): void {
    if (this.disposed) {
      if (!this.disposeMisuseReported) {
        this.disposeMisuseReported = true;
        this.host.reportDiagnostic({
          code: 'surface-disposed',
          severity: 'info',
          message: 'dispose() was called on an already disposed Astylar surface.',
        });
      }
      return;
    }
    this.disposeRequested = true;
    const engine = this.scene.getEngine();
    this.scene.dispose();
    if (!engine.isDisposed) engine.dispose();
  }

  private assertActive(operation: string): void {
    if (this.disposed) {
      const diagnostic: AstylarDiagnostic = {
        code: 'surface-disposed',
        severity: 'error',
        message: `Cannot ${operation} a disposed Astylar surface.`,
      };
      this.host.reportDiagnostic(diagnostic);
      throw new AstylarDiagnosticError(diagnostic);
    }
  }
}
