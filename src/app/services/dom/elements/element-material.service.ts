import { Injectable } from "@angular/core";
import { BabylonDOM } from "../interfaces/dom.types";
import { BabylonRender } from "../interfaces/render.types";
import { DOMElement } from "../../../types/dom-element";
import { StyleRule } from "../../../types/style-rule";
import { Mesh, Color3 } from "@babylonjs/core";

/**
 * Service responsible for applying materials and visual properties to elements
 */
@Injectable({
  providedIn: "root",
})
export class ElementMaterialService {
  constructor() {}

  /**
   * Apply material to an element mesh
   */
  applyElementMaterial(
    dom: BabylonDOM,
    render: BabylonRender,
    mesh: Mesh,
    element: DOMElement,
    isHovered: boolean,
    style: StyleRule,
  ): void {
    // Get opacity
    const opacity = render.actions.style.parseOpacity(style?.opacity);

    // Get background data (color or gradient + opacity)
    let backgroundData = undefined;
    if (style?.background) {
      backgroundData = render.actions.style.parseBackgroundColor(
        style.background,
      );
    }

    // Create and apply material
    if (backgroundData) {
      if (backgroundData.type === "gradient") {
        const gradient = backgroundData.gradient;
        const parentDims = dom.context.elementDimensions.get(mesh.name);
        const width = parentDims?.width ?? 0;
        const height = parentDims?.height ?? 0;
        const finalOpacity =
          backgroundData.alpha !== undefined ? backgroundData.alpha : opacity;

        const material = render.actions.mesh.createGradientMaterial(
          `${element.id || mesh.name}-gradient-material`,
          gradient,
          finalOpacity,
          width,
          height,
        );
        material.zOffset = this.getDepthOffset(style.zIndex);
        mesh.material = material;
      } else {
        const finalOpacity =
          backgroundData.alpha !== undefined ? backgroundData.alpha : opacity;
        const material = render.actions.mesh.createMaterial(
          `${element.id || mesh.name}-material`,
          backgroundData.color,
          finalOpacity,
        );
        material.zOffset = this.getDepthOffset(style.zIndex);
        mesh.material = material;
      }
    } else if (style?.background === "transparent") {
      // Explicitly handle transparent background
      const material = render.actions.mesh.createMaterial(
        `${element.id || mesh.name}-material`,
        new Color3(0, 0, 0),
        0, // Fully transparent
      );
      material.zOffset = this.getDepthOffset(style.zIndex);
      mesh.material = material;
    }
  }

  private getDepthOffset(zIndex: string | undefined): number {
    if (zIndex === undefined || zIndex === 'auto') {
      return 0;
    }
    const parsed = Number.parseInt(zIndex, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /**
   * Parse transform CSS property
   */
  parseTransform(transform: string | undefined): any {
    if (!transform) {
      return null;
    }

    // Parse various transform functions
    // This is a simplified version - full CSS transform parsing is complex
    const result: any = {};

    // Parse translate
    const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (translateMatch) {
      result.translateX = parseFloat(translateMatch[1]);
      result.translateY = parseFloat(translateMatch[2]);
    }

    // Parse rotate
    const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
    if (rotateMatch) {
      result.rotate = parseFloat(rotateMatch[1]);
    }

    // Parse scale
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
      result.scale = parseFloat(scaleMatch[1]);
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Apply transforms to a mesh
   */
  applyTransforms(mesh: Mesh, transform: any): void {
    if (
      transform.translateX !== undefined ||
      transform.translateY !== undefined
    ) {
      mesh.position.x += transform.translateX || 0;
      mesh.position.y += transform.translateY || 0;
    }

    if (transform.rotate !== undefined) {
      mesh.rotation.z = transform.rotate * (Math.PI / 180); // Convert to radians
    }

    if (transform.scale !== undefined) {
      mesh.scaling.x = transform.scale;
      mesh.scaling.y = transform.scale;
    }
  }
}
