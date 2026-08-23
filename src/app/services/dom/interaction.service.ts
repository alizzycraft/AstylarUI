import { Injectable } from '@angular/core';
import { Mesh } from '@babylonjs/core';
import { StyleRule } from '../../types/style-rule';
import { BabylonElementManagerService } from './element-manager.service';

@Injectable({
  providedIn: 'root'
})
export class BabylonInteractionService {

  constructor(
    private elementManager: BabylonElementManagerService
  ) {}

  /**
   * Sets the hover state for an element and returns the appropriate styles
   */
  setHoverState(elementId: string, isHovering: boolean): void {
    this.elementManager.setHoverState(elementId, isHovering);
  }

  /**
   * Gets the hover state for an element
   */
  getHoverState(elementId: string): boolean {
    return this.elementManager.getHoverState(elementId);
  }

  /**
   * Gets the effective style for an element (hover or normal)
   */
  getEffectiveStyle(elementId: string): StyleRule | undefined {
    const styles = this.elementManager.elementStylesMap.get(elementId);
    if (!styles) {
      return undefined;
    }

    const isHovering = this.elementManager.getHoverState(elementId);
    return isHovering && styles.hover ? styles.hover : styles.normal;
  }

  /**
   * Handles pointer enter on an element
   */
  handlePointerEnter(elementId: string, mesh?: Mesh): void {
    this.setHoverState(elementId, true);
    this.applyHoverStyle(elementId, mesh);
  }

  /**
   * Handles pointer leave on an element
   */
  handlePointerLeave(elementId: string, mesh?: Mesh): void {
    this.setHoverState(elementId, false);
    this.applyNormalStyle(elementId, mesh);
  }

  /**
   * Applies hover style to mesh if available
   */
  private applyHoverStyle(elementId: string, mesh?: Mesh): void {
    const styles = this.elementManager.elementStylesMap.get(elementId);
    if (!styles?.hover || !mesh) {
      return;
    }

    // Apply hover style changes to mesh material
    // This would integrate with the existing style application logic

  }

  /**
   * Applies normal style to mesh if available
   */
  private applyNormalStyle(elementId: string, mesh?: Mesh): void {
    const styles = this.elementManager.elementStylesMap.get(elementId);
    if (!styles?.normal || !mesh) {
      return;
    }

    // Apply normal style changes to mesh material
    // This would integrate with the existing style application logic

  }

  /**
   * Sets focus on an input element
   */
  setFocusedInput(elementId: string | null): void {
    const previousFocused = this.elementManager.focusedInput;

    if (previousFocused && previousFocused !== elementId) {
      // Blur previous input
      const prevInput = this.elementManager.inputElementsMap.get(previousFocused);
      if (prevInput && prevInput.onBlur) {
        prevInput.onBlur();
      }
    }

    this.elementManager.focusedInput = elementId;

    if (elementId) {
      const input = this.elementManager.inputElementsMap.get(elementId);
      if (input && input.onFocus) {
        input.onFocus();
      }
    }
  }

  /**
   * Gets the currently focused input element ID
   */
  getFocusedInput(): string | null {
    return this.elementManager.focusedInput;
  }

  /**
   * Handles click on an element (for inputs, links, etc.)
   */
  handleElementClick(elementId: string, mesh?: Mesh): void {
    const elementType = this.elementManager.elementTypesMap.get(elementId);

    if (elementType === 'input' || elementType === 'textarea' || elementType === 'select') {
      this.setFocusedInput(elementId);

    } else if (elementType === 'a') {

      // Handle link navigation if needed
    }
  }

  /**
   * Clears all interaction states
   */
  clearAllInteractions(): void {
    // Clear hover states
    const hoverStates = this.elementManager.hoverStatesMap;
    hoverStates.forEach((_, key) => {
      hoverStates.set(key, false);
    });

    // Clear focus
    this.elementManager.focusedInput = null;
  }
}
