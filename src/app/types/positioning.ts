import { DOMElement } from './dom-element';

/**
 * Manages z-index layering for positioned elements
 */
export interface StackingContext {
  element: DOMElement;
  zIndex: number;
  children: StackingContext[];
  parent?: StackingContext;
  establishedBy: 'position' | 'zIndex' | 'transform' | 'opacity';
}

/**
 * CSS viewport dimensions used to resolve viewport-relative units.
 */
export interface ViewportData {
  width: number;
  height: number;
}
