import { Injectable } from '@angular/core';
import { DOMElement } from '../../../types/dom-element';
import { StackingContext } from '../../../types/positioning';
import { IStackingContextManager } from './interfaces/positioning.interfaces';
import { PositioningUtils } from './utils/positioning.utils';
import { StyleRule } from '../../../types/style-rule';

@Injectable({
  providedIn: 'root'
})
export class StackingContextManager implements IStackingContextManager {
  private stackingContexts: Map<string, StackingContext> = new Map();
  private rootStackingContext: StackingContext | null = null;

  /**
   * Creates a new stacking context for an element
   */
  createStackingContext(element: DOMElement): StackingContext {
    if (!element) {
      throw new Error('Element is required for stacking context creation');
    }

    const elementId = element.id || '';
    
    // Check if already exists
    const existing = this.stackingContexts.get(elementId);
    if (existing) {
      return existing;
    }

    const zIndex = PositioningUtils.getZIndex(element);
    const stackingContext: StackingContext = {
      element,
      zIndex,
      children: [],
      establishedBy: this.determineStackingReason(element)
    };

    // Find parent stacking context
    const parentContext = this.findParentStackingContext(element);
    if (parentContext) {
      stackingContext.parent = parentContext;
      this.insertIntoStackingOrder(stackingContext);
    } else {
      // This is a root-level stacking context
      if (!this.rootStackingContext) {
        this.rootStackingContext = stackingContext;
      }
    }

    // Cache the stacking context
    if (elementId) {
      this.stackingContexts.set(elementId, stackingContext);
    }

    return stackingContext;
  }

  /**
   * Inserts a stacking context into the proper stacking order
   */
  insertIntoStackingOrder(context: StackingContext): void {
    if (!context) {
      throw new Error('Stacking context is required for insertion');
    }

    const parent = context.parent;
    if (!parent) {
      return; // Root level context - no parent to insert into
    }

    // Remove from current position if already in parent's children
    const existingIndex = parent.children.findIndex(child => child.element.id === context.element.id);
    if (existingIndex !== -1) {
      parent.children.splice(existingIndex, 1);
    }

    // Find correct insertion point based on z-index
    let insertIndex = 0;
    for (let i = 0; i < parent.children.length; i++) {
      if (parent.children[i].zIndex <= context.zIndex) {
        insertIndex = i + 1;
      } else {
        break;
      }
    }

    // Insert at the correct position
    parent.children.splice(insertIndex, 0, context);
  }

  /**
   * Determines why an element establishes a stacking context
   */
  determineStackingReason(element: DOMElement): 'position' | 'zIndex' | 'transform' | 'opacity' {
    const style = element.style || {};
    
    // Transform creates stacking context
    if (style.transform !== undefined) {
      return 'transform';
    }
    
    // Opacity less than 1 creates stacking context
    if (style.opacity !== undefined && parseFloat(style.opacity.toString()) < 1) {
      return 'opacity';
    }
    
    // Positioned elements with z-index other than auto
    if ((style.position === 'relative' || style.position === 'absolute' || style.position === 'fixed') &&
        style.zIndex !== undefined && style.zIndex !== 'auto') {
      return 'position';
    }
    
    // Explicit z-index on any element
    if (style.zIndex !== undefined && style.zIndex !== 'auto') {
      return 'zIndex';
    }
    
    return 'zIndex';
  }

  /**
   * Updates the stacking order for a context (when z-index changes)
   */
  updateStackingOrder(context: StackingContext): void {
    // Update z-index value
    context.zIndex = PositioningUtils.getZIndex(context.element);
    
    // Re-insert into parent's stacking order
    if (context.parent) {
      this.insertIntoStackingOrder(context);
    }
    
    // Update cached version
    const elementId = context.element.id;
    if (elementId) {
      this.stackingContexts.set(elementId, context);
    }
  }

  /**
   * Gets the stacking context for an element
   */
  getStackingContext(elementId: string): StackingContext | undefined {
    return this.stackingContexts.get(elementId);
  }

  /**
   * Gets all stacking contexts in paint order (back to front)
   */
  getStackingContextsInPaintOrder(): StackingContext[] {
    const contexts: StackingContext[] = [];
    
    if (this.rootStackingContext) {
      this.collectContextsInPaintOrder(this.rootStackingContext, contexts);
    }
    
    return contexts;
  }

  /**
   * Calculates the effective z-index for an element considering its stacking context hierarchy
   */
  calculateEffectiveZIndex(element: DOMElement): number {
    const elementId = element.id || '';
    const context = this.stackingContexts.get(elementId);
    
    if (!context) {
      return PositioningUtils.getZIndex(element);
    }
    
    // Calculate cumulative z-index through the stacking context hierarchy
    let effectiveZIndex = 0;
    let currentContext: StackingContext | undefined = context;
    
    while (currentContext) {
      effectiveZIndex += currentContext.zIndex * this.getStackingContextMultiplier(currentContext);
      currentContext = currentContext.parent;
    }
    
    return effectiveZIndex;
  }

  /**
   * Gets the 3D Z position for an element based on its stacking context
   * This integrates with the existing z-index positioning logic
   */
  calculateZPosition(element: DOMElement, resolvedStyle?: StyleRule): number {
    const effectiveZIndex = resolvedStyle
      ? this.parseResolvedZIndex(resolvedStyle.zIndex)
      : this.calculateEffectiveZIndex(element);
    const normalizedZIndex = Math.atan(effectiveZIndex) * (20 / Math.PI);
    
    // Use the same calculation as the existing system
    const baseZ = 0.01;
    // Keep enough bounded world-space separation to survive depth-buffer
    // precision at the UI camera distance. atan preserves ordering without
    // allowing common large CSS z-index values to cross the camera plane.
    const zScale = 0.1;
    
    return baseZ + (normalizedZIndex * zScale);
  }

  private parseResolvedZIndex(value: string | undefined): number {
    if (value === undefined || value === 'auto') {
      return 0;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /**
   * Removes a stacking context and cleans up references
   */
  removeStackingContext(elementId: string): void {
    const context = this.stackingContexts.get(elementId);
    if (!context) {
      return;
    }
    
    // Remove from parent's children
    if (context.parent) {
      const index = context.parent.children.indexOf(context);
      if (index !== -1) {
        context.parent.children.splice(index, 1);
      }
    }
    
    // Move children to parent context
    context.children.forEach(child => {
      child.parent = context.parent;
      if (context.parent) {
        this.insertIntoStackingOrder(child);
      }
    });
    
    // Remove from cache
    this.stackingContexts.delete(elementId);
    
    // Update root if this was the root context
    if (this.rootStackingContext === context) {
      this.rootStackingContext = context.children.length > 0 ? context.children[0] : null;
    }
  }

  /**
   * Clears all stacking contexts
   */
  clearAll(): void {
    this.stackingContexts.clear();
    this.rootStackingContext = null;
  }

  /**
   * Finds the parent stacking context for an element
   */
  private findParentStackingContext(element: DOMElement): StackingContext | null {
    // This would traverse the DOM tree to find the nearest ancestor that establishes a stacking context
    // For now, return null (elements will be root-level contexts)
    // TODO: Integrate with actual DOM tree traversal
    return null;
  }

  /**
   * Recursively collects stacking contexts in paint order
   */
  private collectContextsInPaintOrder(context: StackingContext, result: StackingContext[]): void {
    result.push(context);
    
    // Add children in their stacking order
    context.children.forEach(child => {
      this.collectContextsInPaintOrder(child, result);
    });
  }

  /**
   * Gets the multiplier for a stacking context level
   */
  private getStackingContextMultiplier(context: StackingContext): number {
    // Higher level contexts get higher multipliers to ensure proper layering
    let level = 0;
    let current = context.parent;
    
    while (current) {
      level++;
      current = current.parent;
    }
    
    // Each level gets 1000x multiplier to ensure separation
    return Math.pow(1000, level);
  }
}
