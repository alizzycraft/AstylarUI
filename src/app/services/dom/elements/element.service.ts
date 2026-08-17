import { Injectable } from '@angular/core';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { Mesh } from '@babylonjs/core';
import { ElementCreationService } from './element-creation.service';
import { ElementInteractionService } from './element-interaction.service';

/**
 * Main ElementService - acts as a facade/coordinator for element operations
 * Delegates actual work to specialized services
 */
@Injectable({
  providedIn: 'root'
})
export class ElementService {
  constructor(
    private creationService: ElementCreationService,
    private interactionService: ElementInteractionService
  ) { }

  /**
   * Process child elements
   * Delegates to ElementCreationService
   */
  public processChildren(
    dom: BabylonDOM,
    render: BabylonRender,
    children: DOMElement[],
    parent: Mesh,
    styles: StyleRule[],
    parentElement?: DOMElement
  ): void {
    console.log(`[ElementService] processChildren called for ${parentElement?.id || 'unknown'}`);
    return this.creationService.processChildren(dom, render, children, parent, styles, parentElement);
  }

  /**
   * Create an element
   * Delegates to ElementCreationService
   */
  public createElement(
    dom: BabylonDOM,
    render: BabylonRender,
    element: DOMElement,
    parent: Mesh,
    styles: StyleRule[],
    flexPosition?: { x: number; y: number; z: number },
    flexSize?: { width?: number; height?: number }
  ): Mesh {
    return this.creationService.createElement(dom, render, element, parent, styles, flexPosition, flexSize);
  }

  /**
   * Setup mouse events for an element
   * Delegates to ElementInteractionService
   */
  public setupMouseEvents(
    dom: BabylonDOM,
    render: BabylonRender,
    mesh: Mesh,
    elementId: string
  ): void {
    return this.interactionService.setupMouseEvents(dom, render, mesh, elementId);
  }

  /**
   * Ensure pointer observer is set up
   * Delegates to ElementInteractionService
   */
  private ensurePointerObserver(render: BabylonRender): void {
    return this.interactionService.ensurePointerObserver(render);
  }

  /**
   * Request recreation of an element (for hover state changes)
   * This recreates the ENTIRE element mesh plus borders
   */
  public requestElementRecreation(
    dom: BabylonDOM,
    render: BabylonRender,
    elementId: string,
    styleType: 'normal' | 'hover'
  ): void {
    const elementType = dom.context.elementTypes.get(elementId) || 'div';
    const element = { id: elementId, type: elementType } as DOMElement;

    // Set hover state BEFORE recreating so createElement uses the right styles
    dom.context.hoverStates.set(elementId, styleType === 'hover');

    // Remove old border meshes
    // Handle single polygon border
    const singleBorderMesh = dom.context.elements.get(`${elementId}-border_border_frame`);
    if (singleBorderMesh) {
      singleBorderMesh.dispose();
      dom.context.elements.delete(`${elementId}-border_border_frame`);
    }

    // Remove up to 4 rectangular borders
    for (let i = 0; i < 4; i++) {
      const borderMesh = dom.context.elements.get(`${elementId}-border-${i}`);
      if (borderMesh) {
        borderMesh.dispose();
        dom.context.elements.delete(`${elementId}-border-${i}`);
      }

      // Also check for named rectangular borders
      const borderNames = ['-top', '-bottom', '-left', '-right'];
      if (i < borderNames.length) {
        const namedBorderMesh = dom.context.elements.get(`${elementId}-border${borderNames[i]}`);
        if (namedBorderMesh) {
          namedBorderMesh.dispose();
          dom.context.elements.delete(`${elementId}-border${borderNames[i]}`);
        }
      }
    }

    // Remove old main mesh
    const mainMesh = dom.context.elements.get(elementId);
    let parent: Mesh | undefined = undefined;
    if (mainMesh) {
      if (mainMesh.parent && mainMesh.parent instanceof Mesh) {
        parent = mainMesh.parent;
      }
      mainMesh.dispose();
      dom.context.elements.delete(elementId);
    }

    // Recreate the element (main mesh and borders)
    const dimensions = dom.context.elementDimensions.get(elementId);
    if (parent && dimensions) {
      const newMesh = this.createElement(dom, render, element, parent, [], undefined, { width: dimensions.width, height: dimensions.height });
      dom.context.elements.set(elementId, newMesh);
      // No need to reattach event handlers here; createElement does it
    }
  }
}
