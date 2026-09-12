import type { Scene } from '@babylonjs/core';
import type { SiteData } from '../app/types/site-data';
import type { StyleRule } from '../app/types/style-rule';
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

export interface AstylarFocusOptions {
  /** Paint focus-visible styling for keyboard-like programmatic focus. */
  focusVisible?: boolean;
  /** Scroll the focused element into the nearest visible position. Defaults to true. */
  scrollIntoView?: boolean;
}

/** Detached diagnostic declarations, not used layout boxes or Babylon coordinates. */
export interface AstylarResolvedStyleSnapshot {
  readonly revision: number;
  readonly elements: readonly {
    /** Stable position in the current authored tree, including anonymous nodes. */
    readonly path: string;
    readonly id?: string;
    readonly type: string;
    readonly normal: Readonly<StyleRule>;
    readonly effective: Readonly<StyleRule>;
    /** Last style retained by the core text registry, before projection.
     * Separate from cascade/pseudo declarations; not a guarantee of current
     * pseudo-state paint. Absent when no authored-ID text entry is retained.
     */
    readonly retainedText?: {
      readonly source: 'core-text-registry';
      readonly style: Readonly<StyleRule>;
    };
    /** Inputs of the currently bound core control-label texture, not inferred
     * declarations. Lengths are CSS pixels; lineHeight is a font-size multiplier.
     * Absent for unobserved/foreign textures. Does not describe clipping,
     * material effects, placement, or prove final raster visibility.
     */
    readonly paintedControlText?: {
      readonly source: 'core-control-texture';
      readonly text: string;
      readonly style: Readonly<import('../app/types/text-rendering').TextStyleProperties>;
      readonly maxWidth?: number;
    };
  }[];
}

/** An explicitly owned rendering surface returned by `Astylar.mount()`. */
export interface AstylarSurface {
  readonly scene: Scene;
  readonly disposed: boolean;
  readonly diagnostics: AstylarSurfaceDiagnostics;
  /** Inspect core declarations, including hidden descendants, after whenSettled().
   * On-demand only; never use this diagnostic snapshot to calculate layout.
   */
  inspectResolvedStyles(): AstylarResolvedStyleSnapshot;
  update(siteData: SiteData): Promise<AstylarSessionSnapshot>;
  resize(): Promise<AstylarSessionSnapshot>;
  whenSettled(): Promise<AstylarSessionSnapshot>;
  focus(elementId: string, options?: AstylarFocusOptions): boolean;
  blur(): boolean;
  dispose(): void;
}

export interface AstylarSurfaceHost {
  inspectResolvedStyles(scene: Scene): AstylarResolvedStyleSnapshot;
  update(siteData: SiteData, scene: Scene): Promise<AstylarSessionSnapshot>;
  invalidate(
    reason: AstylarInvalidationReason,
    scene: Scene,
  ): Promise<AstylarSessionSnapshot>;
  whenSettled(scene: Scene): Promise<AstylarSessionSnapshot>;
  focus(elementId: string, options: AstylarFocusOptions | undefined, scene: Scene): boolean;
  blur(scene: Scene): boolean;
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
    // The renderer owns backing-store resize and the immediately following
    // paint as one reflow transaction. Resizing here would clear the canvas a
    // frame before the rebuilt scene is ready.
    return this.host.invalidate('resize', this.scene);
  }

  whenSettled(): Promise<AstylarSessionSnapshot> {
    this.assertActive('wait for');
    return this.host.whenSettled(this.scene);
  }

  inspectResolvedStyles(): AstylarResolvedStyleSnapshot {
    this.assertActive('inspect');
    return this.host.inspectResolvedStyles(this.scene);
  }

  focus(elementId: string, options?: AstylarFocusOptions): boolean {
    this.assertActive('focus');
    return this.host.focus(elementId, options, this.scene);
  }

  blur(): boolean {
    this.assertActive('blur');
    return this.host.blur(this.scene);
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
