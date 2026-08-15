import { Injectable } from '@angular/core';
import { DOMElement } from '../../../types/dom-element';
import { StackingContext } from '../../../types/positioning';
import { IStackingContextManager } from './interfaces/positioning.interfaces';
import { PositioningUtils } from './utils/positioning.utils';
import { StyleRule } from '../../../types/style-rule';
import { DOMAncestryService } from '../dom-ancestry.service';

@Injectable({
  providedIn: 'root'
})
export class StackingContextManager implements IStackingContextManager {
  private readonly rootContextStep = 0.25;
  private readonly positionedDescendantStep = 0.15;
  private stackingContexts: Map<string, StackingContext> = new Map();
  private rootStackingContext: StackingContext | null = null;
  private resolvedStyles = new WeakMap<DOMElement, Partial<StyleRule>>();
  private worldDepths = new WeakMap<DOMElement, number>();

  constructor(private ancestry: DOMAncestryService = new DOMAncestryService()) {}

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
    const style = resolvedStyle ?? element.style ?? ({ selector: element.type } as StyleRule);
    this.resolvedStyles.set(element, style);

    const parent = this.ancestry.getParent(element);
    const parentWorldDepth = parent ? (this.worldDepths.get(parent) ?? 0.01) : 0;
    const stackingAncestor = this.findNearestStackingAncestor(parent);
    const zIndex = this.parseResolvedZIndex(style.zIndex);
    let worldDepth: number;

    if (stackingAncestor) {
      const contextDepth = this.worldDepths.get(stackingAncestor) ?? parentWorldDepth;
      const normalizedWithinContext = Math.atan(zIndex) * (2 / Math.PI);
      // Reserve a bounded depth band inside the ancestor context. The band is
      // large enough for stable depth-buffer separation but remains below the
      // spacing between ordinary adjacent root z-index levels.
      worldDepth = contextDepth + 0.02 + normalizedWithinContext * 0.08;
    } else if (parent && style.zIndex !== undefined && style.zIndex !== 'auto') {
      // Positioned descendants without a containing stacking context
      // participate in the root context.
      worldDepth = this.rootContextDepth(zIndex);
    } else if (parent) {
      const isNestedPositioned =
        this.ancestry.getParent(parent) !== undefined &&
        style.position !== undefined && style.position !== 'static';
      worldDepth = parentWorldDepth +
        (isNestedPositioned ? this.positionedDescendantStep : 0.001);
    } else {
      worldDepth = this.rootContextDepth(zIndex);
    }

    this.worldDepths.set(element, worldDepth);
    return parent ? worldDepth - parentWorldDepth : worldDepth;
  }

  private rootContextDepth(zIndex: number): number {
    // Root contexts need enough physical separation to contain their local
    // descendant paint bands. Compressing large adjacent z-index values with
    // atan made values such as 20 and 21 effectively coplanar at the camera.
    return 0.01 + zIndex * this.rootContextStep;
  }

  private findNearestStackingAncestor(element: DOMElement | undefined): DOMElement | undefined {
    let current = element;
    while (current) {
      const style = this.resolvedStyles.get(current) ?? current.style;
      if (style && this.establishesStackingContext(style)) {
        return current;
      }
      current = this.ancestry.getParent(current);
    }
    return undefined;
  }

  private establishesStackingContext(style: Partial<StyleRule>): boolean {
    if (style.transform && style.transform !== 'none') return true;
    if (style.opacity !== undefined && Number.parseFloat(style.opacity) < 1) return true;
    return style.position !== undefined && style.position !== 'static' &&
      style.zIndex !== undefined && style.zIndex !== 'auto';
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
    this.resolvedStyles = new WeakMap<DOMElement, Partial<StyleRule>>();
    this.worldDepths = new WeakMap<DOMElement, number>();
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
