import { Injectable } from "@angular/core";
import { Mesh, Vector3 } from "@babylonjs/core";
import { DOMElement } from "../../../types/dom-element";
import { BabylonRender } from "../interfaces/render.types";
import { PositioningService } from "./positioning.service";
import { PositioningUtils } from "./utils/positioning.utils";
import { PositionMode } from "../../../types/positioning";
import { ViewportService } from "./viewport.service";

/**
 * Integration service that connects positioning system with existing ASTYLARUI patterns
 * Follows the same coordinate transformation and mesh positioning patterns as existing code
 */
@Injectable({
  providedIn: "root",
})
export class PositioningIntegrationService {
  constructor(
    private positioningService: PositioningService,
    private viewportService: ViewportService,
  ) {}

  /**
   * Calculates element position using positioning system
   * Returns position in logical coordinates (before coordinate transformation)
   */
  calculateElementPosition(element: DOMElement): {
    x: number;
    y: number;
    z: number;
  } {
    if (!element) {
      throw new Error("Element is required for position calculation");
    }

    const positionMode = PositioningUtils.getPositionMode(element);

    if (positionMode === PositionMode.Static) {
      // Static positioning uses normal flow - delegate to existing layout system
      return this.getNormalFlowPosition(element);
    }

    // Use positioning system for positioned elements
    const positionData = this.positioningService.calculatePosition(
      element,
      positionMode,
    );

    return {
      x: positionData.resolvedPosition.x,
      y: positionData.resolvedPosition.y,
      z: positionData.resolvedPosition.z,
    };
  }

  /**
   * Applies positioning to a mesh using existing positionMesh pattern
   * Integrates with coordinate transformation system
   */
  applyPositioning(
    element: DOMElement,
    mesh: Mesh,
    render: BabylonRender,
  ): void {
    if (!element) {
      throw new Error("Element is required for positioning");
    }
    if (!mesh) {
      throw new Error("Mesh is required for positioning");
    }
    if (!render?.actions?.mesh?.positionTextMesh) {
      throw new Error("Render actions with positionTextMesh are required");
    }

    const position = this.calculateElementPosition(element);

    // Use existing positionTextMesh method which handles coordinate transformation
    render.actions.mesh.positionTextMesh(
      mesh,
      position.x,
      position.y,
      position.z,
    );

    // Update stacking context if element creates one
    if (PositioningUtils.createsStackingContext(element)) {
      this.positioningService.getStackingContext(element);
    }
  }

  /**
   * Updates element position dynamically
   * Follows existing pattern of mesh updates
   */
  updateElementPosition(
    elementId: string,
    mesh: Mesh,
    render: BabylonRender,
  ): void {
    if (!elementId) {
      throw new Error("Element ID is required for position update");
    }
    if (!mesh) {
      throw new Error("Mesh is required for position update");
    }

    // Get cached position data
    const positionData = this.positioningService.getPositionData(elementId);
    if (!positionData) {
      throw new Error(`No position data found for element: ${elementId}`);
    }

    // Apply updated position using existing positionTextMesh pattern
    render.actions.mesh.positionTextMesh(
      mesh,
      positionData.resolvedPosition.x,
      positionData.resolvedPosition.y,
      positionData.resolvedPosition.z,
    );
  }

  /**
   * Checks if element needs positioning (not static)
   */
  needsPositioning(element: DOMElement): boolean {
    if (!element) {
      return false;
    }

    const positionMode = PositioningUtils.getPositionMode(element);
    return positionMode !== PositionMode.Static;
  }

  /**
   * Gets the effective z-position for an element using stacking context
   * Integrates with existing z-index patterns
   */
  getElementZPosition(element: DOMElement): number {
    if (!element) {
      throw new Error("Element is required for z-position calculation");
    }

    return this.positioningService.getElementZPosition(element);
  }

  /**
   * Updates viewport data for positioning calculations
   */
  updateViewport(viewportData: {
    width?: number;
    height?: number;
    position?: Vector3;
  }): void {
    // Update the ViewportService with new dimensions
    this.viewportService.updateViewport(viewportData);
    console.log("[POSITIONING] Viewport updated:", viewportData);
  }

  /**
   * Handles viewport changes for fixed positioned elements
   */
  handleViewportChange(viewportData: {
    width: number;
    height: number;
    position: Vector3;
  }): void {
    // Update all fixed positioned elements
    // This would be called when camera moves or viewport resizes
    // Implementation would iterate through fixed elements and update their positions
  }

  /**
   * Gets normal flow position from existing layout system
   * TODO: Integrate with actual layout calculations
   */
  private getNormalFlowPosition(element: DOMElement): {
    x: number;
    y: number;
    z: number;
  } {
    // This should integrate with existing layout system
    // For now, return default position that matches existing behavior
    return { x: 0, y: 0, z: 0.01 }; // Base z-position matches existing pattern
  }
}
