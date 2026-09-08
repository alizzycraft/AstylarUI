import { DOMElement } from '../../../../types/dom-element';

/**
 * Utility functions for positioning calculations
 */
export class PositioningUtils {
  
  /**
   * Gets the z-index value from element style
   */
  static getZIndex(element: DOMElement): number {
    const zIndex = element.style?.zIndex;
    
    if (zIndex === undefined || zIndex === 'auto') {
      return 0;
    }
    
    const parsed = parseInt(zIndex.toString(), 10);
    return isNaN(parsed) ? 0 : parsed;
  }

}
