/**
 * Astylar UI Library
 *
 * A 3D UI rendering library that renders HTML-like structures in BabylonJS scenes.
 *
 * @packageDocumentation
 */

// Main service and types
import { Scene } from "@babylonjs/core";
export { Astylar } from "./astylar";
export type { AstylarRenderOptions } from "./astylar";
export type { AstylarSurface, AstylarSurfaceDiagnostics } from './astylar-surface';
export { AstylarRenderSession } from "./astylar-render-session";
export { AstylarSceneResources } from './astylar-scene-resources';
export type { AstylarSceneResourceSnapshot } from './astylar-scene-resources';
export { AstylarEventDispatcher } from './astylar-event';
export { AstylarInteractionRuntime } from './astylar-interaction-runtime';
export type {
  AstylarEvent,
  AstylarEventHandler,
  AstylarEventHandlers,
  AstylarEventInit,
  AstylarEventOptions,
  AstylarEventSnapshot,
  AstylarEventState,
  AstylarEventType,
} from './astylar-event';
export type {
  AstylarInteractionSnapshot,
  AstylarNavigationOptions,
  AstylarNavigationOutcome,
} from './astylar-interaction-runtime';
export { AstylarSemanticBridge } from './astylar-semantic-bridge';
export type {
  AstylarSemanticBridgeOptions,
  AstylarSemanticControlState,
  AstylarSemanticReconciliationSnapshot,
  AstylarSemanticSnapshot,
} from './astylar-semantic-bridge';
export {
  areAstylarReconciliationNodesCompatible,
  AstylarReconciliationIdentityIndex,
  astylarChildReconciliationPath,
  astylarInputReconciliationKind,
} from './astylar-reconciliation-identity';
export type { AstylarReconciliationIdentitySnapshot } from './astylar-reconciliation-identity';
export { AstylarVisualReconciler } from './astylar-visual-reconciler';
export type {
  AstylarVisualReconciliationCounts,
  AstylarVisualReconciliationPlan,
  AstylarVisualReconciliationSnapshot,
} from './astylar-visual-reconciler';
export { AstylarVisualResourceReconciler } from './astylar-visual-resource-reconciler';
export type { AstylarVisualResourceReconciliationResult } from './astylar-visual-resource-reconciler';
export type {
  AstylarInvalidationReason,
  AstylarSessionSnapshot,
} from "./astylar-render-session";

/**
 * Functional API wrapper for the Astylar library.
 * This can be used in Angular components to render 3D scenes
 * using a more direct functional style.
 */
import { inject } from "@angular/core";
import { Astylar } from "./astylar";
import type { SiteData } from "../app/types/site-data";
import type { AstylarRenderOptions } from "./astylar";
import type { AstylarSessionSnapshot } from "./astylar-render-session";

export const astylar = {
  /** Creates an explicitly owned rendering surface. */
  get mount(): (
    canvas: HTMLCanvasElement,
    siteData: SiteData,
    options?: AstylarRenderOptions,
  ) => import('./astylar-surface').AstylarSurface {
    const service = inject(Astylar);
    return service.mount.bind(service);
  },

  /**
   * Renders a 3D UI scene using the Astylar library.
   * Note: This must be captured during component construction or field initialization.
   */
  get render(): (
    canvas: HTMLCanvasElement,
    siteData: SiteData,
    options?: AstylarRenderOptions,
  ) => Scene {
    const service = inject(Astylar);
    return service.render.bind(service);
  },

  /**
   * Updates an existing 3D UI scene with new site data.
   */
  get update(): (
    siteData: SiteData,
    scene?: Scene,
  ) => Promise<AstylarSessionSnapshot> {
    const service = inject(Astylar);
    return service.update.bind(service);
  },
};

// Angular integration
export { AstylarSurfaceComponent } from './astylar-surface.component';

// Types for consumers
export type { SiteData } from "../app/types/site-data";
export type { StyleRule } from "../app/types/style-rule";
export type { DOMElement, DOMElementType } from "../app/types/dom-element";
export type {
  BabylonRender,
  BabylonRenderActions,
  MeshActions,
  StyleActions,
  CameraActions,
  TextureActions,
} from "../app/services/dom/interfaces/render.types";
