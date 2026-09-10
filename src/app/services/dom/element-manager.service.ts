import { Injectable, OnDestroy } from '@angular/core';
import { Mesh } from '@babylonjs/core';
import { StyleRule } from '../../types/style-rule';
import { StoredTextLayoutMetrics } from '../../types/text-rendering';
import type { CssSize } from '../coordinate-space.types';
import { DOMElement } from '../../types/dom-element';
import { TextInteractionRegistryService } from './interaction/text-interaction-registry.service';
import { TextHighlightMeshFactory } from './interaction/text-highlight-mesh.factory';
import { BabylonRender } from './interfaces/render.types';
import { CssLayoutNode } from '../coordinate-space.types';

@Injectable({
  providedIn: 'root'
})
export class BabylonElementManagerService implements OnDestroy {
  // Element lifecycle maps
  private elements: Map<string, Mesh> = new Map();
  private hoverStates: Map<string, boolean> = new Map();
  private elementStyles: Map<string, { normal: StyleRule, hover?: StyleRule, active?: StyleRule, focus?: StyleRule }> = new Map();
  private elementTypes: Map<string, string> = new Map();
  private elementDimensions: Map<string, {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number }
  }> = new Map();
  private layoutBoxes: Map<string, CssLayoutNode> = new Map();

  // Text rendering context
  private textMeshes: Map<string, Mesh> = new Map();
  private textTextures: Map<string, any> = new Map();
  private textContent: Map<string, string> = new Map();
  private textMetrics: Map<string, StoredTextLayoutMetrics> = new Map();

  // Input element context
  private inputElements: Map<string, any> = new Map();
  private focusedInputId: string | null = null;

  constructor(
    private textInteractionRegistry: TextInteractionRegistryService,
    private textHighlightFactory: TextHighlightMeshFactory
  ) {}

  // === Element Management ===

  get elementsMap(): Map<string, Mesh> {
    return this.elements;
  }

  get hoverStatesMap(): Map<string, boolean> {
    return this.hoverStates;
  }

  get elementStylesMap(): Map<string, { normal: StyleRule, hover?: StyleRule, active?: StyleRule, focus?: StyleRule }> {
    return this.elementStyles;
  }

  get elementTypesMap(): Map<string, string> {
    return this.elementTypes;
  }

  get elementDimensionsMap(): Map<string, {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number }
  }> {
    return this.elementDimensions;
  }

  get layoutBoxesMap(): Map<string, CssLayoutNode> {
    return this.layoutBoxes;
  }

  get textMeshesMap(): Map<string, Mesh> {
    return this.textMeshes;
  }

  get textTexturesMap(): Map<string, any> {
    return this.textTextures;
  }

  get textContentMap(): Map<string, string> {
    return this.textContent;
  }

  get textMetricsMap(): Map<string, StoredTextLayoutMetrics> {
    return this.textMetrics;
  }

  get inputElementsMap(): Map<string, any> {
    return this.inputElements;
  }

  get focusedInput(): string | null {
    return this.focusedInputId;
  }

  set focusedInput(value: string | null) {
    this.focusedInputId = value;
  }

  registerElement(id: string, mesh: Mesh, type: string, styles: { normal: StyleRule, hover?: StyleRule, active?: StyleRule }): void {
    this.elements.set(id, mesh);
    this.elementTypes.set(id, type);
    this.elementStyles.set(id, styles);
    this.hoverStates.set(id, false);
  }

  unregisterElement(id: string): void {
    const mesh = this.elements.get(id);
    if (mesh && !mesh.isDisposed) {
      mesh.dispose();
    }
    this.elements.delete(id);
    this.elementTypes.delete(id);
    this.elementStyles.delete(id);
    this.hoverStates.delete(id);
    this.elementDimensions.delete(id);
    this.layoutBoxes.delete(id);
  }

  registerTextElement(
    elementId: string,
    textMesh: Mesh,
    texture: any,
    content: string,
    metrics: StoredTextLayoutMetrics,
    style?: StyleRule,
    viewportCssSize?: CssSize,
  ): void {
    this.textMeshes.set(elementId, textMesh);
    this.textTextures.set(elementId, texture);
    this.textContent.set(elementId, content);
    this.textMetrics.set(elementId, metrics);
    this.textInteractionRegistry.register(
      elementId, textMesh, style, metrics, content,
      undefined, undefined, undefined, viewportCssSize,
    );
  }

  unregisterTextElement(elementId: string): void {
    const textMesh = this.textMeshes.get(elementId);
    this.textInteractionRegistry.unregisterByElementId(elementId);
    if (textMesh && !textMesh.isDisposed) {
      textMesh.dispose();
    }
    const texture = this.textTextures.get(elementId);
    if (texture && !texture.isDisposed) {
      texture.dispose();
    }
    this.textMeshes.delete(elementId);
    this.textTextures.delete(elementId);
    this.textContent.delete(elementId);
    this.textMetrics.delete(elementId);
  }

  registerInputElement(id: string, inputElement: any): void {
    this.inputElements.set(id, inputElement);
  }

  unregisterInputElement(id: string): void {
    this.inputElements.delete(id);
    if (this.focusedInputId === id) {
      this.focusedInputId = null;
    }
  }

  clearAll(options: { disposeTextTextures?: boolean } = {}): void {
    // Clear elements
    this.elements.forEach(mesh => {
      if (mesh && !mesh.isDisposed) {
        mesh.dispose();
      }
    });
    this.elements.clear();
    this.hoverStates.clear();
    this.elementStyles.clear();
    this.elementTypes.clear();
    this.elementDimensions.clear();
    this.layoutBoxes.clear();

    // Clear text rendering context
    this.textMeshes.forEach(mesh => {
      if (mesh && !mesh.isDisposed) {
        mesh.dispose();
      }
    });
    this.textMeshes.clear();
    if (options.disposeTextTextures !== false) {
      this.textTextures.forEach(texture => {
        if (texture && !texture.isDisposed) {
          texture.dispose();
        }
      });
    }
    this.textTextures.clear();
    this.textContent.clear();
    this.textMetrics.clear();
    this.textInteractionRegistry.clear();
    this.textHighlightFactory.clearAllHighlights();

    // Clear input element context
    this.inputElements.clear();
    this.focusedInputId = null;
  }

  setElementDimensions(id: string, dims: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number }
  }): void {
    this.elementDimensions.set(id, dims);
  }

  getElementDimensions(id: string): {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number }
  } | undefined {
    return this.elementDimensions.get(id);
  }

  setLayoutBox(id: string, node: CssLayoutNode): void {
    this.layoutBoxes.set(id, node);
  }

  getLayoutBox(id: string): CssLayoutNode | undefined {
    return this.layoutBoxes.get(id);
  }

  setHoverState(id: string, isHovering: boolean): void {
    this.hoverStates.set(id, isHovering);
  }

  getHoverState(id: string): boolean {
    return this.hoverStates.get(id) || false;
  }

  ngOnDestroy(): void {
    this.clearAll();
  }
}
