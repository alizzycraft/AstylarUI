import { Injectable } from '@angular/core';
import { ViewportData } from '../../../types/positioning';

/**
 * CSS viewport dimensions used by layout and unit resolution.
 */
@Injectable({
  providedIn: 'root'
})
export class ViewportService {
  private currentViewport: ViewportData | null = null;

  /**
   * Gets current viewport data
   */
  getCurrentViewport(): ViewportData {
    if (!this.currentViewport) {
      this.currentViewport = {
        width: 1920,
        height: 1080,
      };
    }
    
    return this.currentViewport;
  }

  /**
   * Updates viewport data (called when camera moves or viewport resizes)
   */
  updateViewport(viewport: Partial<ViewportData>): void {
    if (!this.currentViewport) {
      this.currentViewport = this.getCurrentViewport();
    }

    // Update only provided properties
    if (viewport.width !== undefined) {
      this.currentViewport.width = viewport.width;
    }
    if (viewport.height !== undefined) {
      this.currentViewport.height = viewport.height;
    }
  }

  /**
   * Converts viewport units (vw, vh) to pixels
   */
  convertViewportUnit(value: number, unit: 'vw' | 'vh'): number {
    const viewport = this.getCurrentViewport();
    
    switch (unit) {
      case 'vw':
        return (value / 100) * viewport.width;
      case 'vh':
        return (value / 100) * viewport.height;
      default:
        throw new Error(`Invalid viewport unit: ${unit}`);
    }
  }

  /**
   * Gets viewport dimensions for percentage calculations
   */
  getViewportDimensions(): { width: number; height: number } {
    const viewport = this.getCurrentViewport();
    return {
      width: viewport.width,
      height: viewport.height
    };
  }

  /**
   * Checks if viewport data is available
   */
  isViewportAvailable(): boolean {
    return this.currentViewport !== null;
  }
}
