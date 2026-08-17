import { Injectable } from "@angular/core";
import { Scene, Mesh } from "@babylonjs/core";
import { StyleRule } from "../../types/style-rule";
import { SiteData } from "../../types/site-data";
import { BabylonDOM } from "./interfaces/dom.types";
import { BabylonRender } from "./interfaces/render.types";
import { DOMElement } from "../../types/dom-element";
import { BabylonDOMRendererService } from "./renderer.service";
import { BabylonElementManagerService } from "./element-manager.service";
import { BabylonInteractionService } from "./interaction.service";

/**
 * @deprecated Use BabylonDOMRendererService, BabylonElementManagerService, and BabylonInteractionService instead.
 * This class is maintained for backward compatibility and will delegate to the new services.
 */
@Injectable({
  providedIn: "root",
})
export class BabylonDOMService {
  private renderer: BabylonDOMRendererService;
  private elementManager: BabylonElementManagerService;
  private interactionService: BabylonInteractionService;

  constructor(
    renderer: BabylonDOMRendererService,
    elementManager: BabylonElementManagerService,
    interactionService: BabylonInteractionService,
  ) {
    this.renderer = renderer;
    this.elementManager = elementManager;
    this.interactionService = interactionService;
  }

  /**
   * Delegates to BabylonDOMRendererService.initialize()
   */
  initialize(
    render: BabylonRender,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    this.renderer.initialize(render, viewportWidth, viewportHeight);
  }

  /**
   * Delegates to BabylonDOMRendererService.createSiteFromData()
   */
  createSiteFromData(siteData: SiteData): void {
    this.renderer.createSiteFromData(siteData);
  }

  /**
   * Delegates to BabylonDOMRendererService.dom getter
   */
  get dom(): BabylonDOM {
    return this.renderer.dom;
  }

  /**
   * Delegates to BabylonElementManagerService.clearAll() and BabylonInteractionService.clearAllInteractions()
   */
  cleanup(): void {
    this.renderer.cleanup();
  }

  // === Passthrough methods for backward compatibility ===

  /**
   * @deprecated Use BabylonElementManagerService directly
   */
  get elements(): Map<string, Mesh> {
    return this.elementManager.elementsMap;
  }

  /**
   * @deprecated Use BabylonElementManagerService directly
   */
  get hoverStates(): Map<string, boolean> {
    return this.elementManager.hoverStatesMap;
  }

  /**
   * @deprecated Use BabylonElementManagerService directly
   */
  get elementStyles(): Map<string, { normal: StyleRule; hover?: StyleRule; active?: StyleRule }> {
    return this.elementManager.elementStylesMap;
  }

  /**
   * @deprecated Use BabylonElementManagerService directly
   */
  get elementTypes(): Map<string, string> {
    return this.elementManager.elementTypesMap;
  }

  /**
   * @deprecated Use BabylonElementManagerService directly
   */
  get elementDimensions(): Map<
    string,
    {
      width: number;
      height: number;
      padding: { top: number; right: number; bottom: number; left: number };
    }
  > {
    return this.elementManager.elementDimensionsMap;
  }

  /**
   * @deprecated Use BabylonElementManagerService directly
   */
  get textMeshes(): Map<string, Mesh> {
    return this.elementManager.textMeshesMap;
  }

  /**
   * @deprecated Use BabylonElementManagerService directly
   */
  get textTextures(): Map<string, any> {
    return this.elementManager.textTexturesMap;
  }

  /**
   * @deprecated Use BabylonElementManagerService directly
   */
  get textContent(): Map<string, string> {
    return this.elementManager.textContentMap;
  }

  /**
   * @deprecated Use BabylonElementManagerService directly
   */
  get textMetrics(): Map<string, any> {
    return this.elementManager.textMetricsMap;
  }

  /**
   * @deprecated Use BabylonElementManagerService directly
   */
  get inputElements(): Map<string, any> {
    return this.elementManager.inputElementsMap;
  }

  /**
   * @deprecated Use BabylonElementManagerService directly
   */
  get focusedInputId(): string | null {
    return this.elementManager.focusedInput;
  }

  // === Interaction methods for backward compatibility ===

  /**
   * @deprecated Use BabylonInteractionService directly
   */
  setHoverState(elementId: string, isHovering: boolean): void {
    this.interactionService.setHoverState(elementId, isHovering);
  }

  /**
   * @deprecated Use BabylonInteractionService directly
   */
  handlePointerEnter(elementId: string, mesh?: Mesh): void {
    this.interactionService.handlePointerEnter(elementId, mesh);
  }

  /**
   * @deprecated Use BabylonInteractionService directly
   */
  handlePointerLeave(elementId: string, mesh?: Mesh): void {
    this.interactionService.handlePointerLeave(elementId, mesh);
  }

  /**
   * @deprecated Use BabylonInteractionService directly
   */
  setFocusedInput(elementId: string | null): void {
    this.interactionService.setFocusedInput(elementId);
  }
}
