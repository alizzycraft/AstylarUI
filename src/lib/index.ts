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

/**
 * Functional API wrapper for the Astylar library.
 * This can be used in Angular components to render 3D scenes
 * using a more direct functional style.
 */
import { inject } from "@angular/core";
import { Astylar } from "./astylar";
import type { SiteData } from "../app/types/site-data";
import type { AstylarRenderOptions } from "./astylar";

export const astylar = {
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
  update(siteData: SiteData) {
    const service = inject(Astylar);
    const babylonDOMRenderer = (service as any).babylonDOMRenderer;
    if (babylonDOMRenderer) {
      babylonDOMRenderer.createSiteFromData(siteData);
    }
  },
};

// Component exports
export { SiteComponent } from "../app/components/site.component";

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
