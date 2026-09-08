import { Injectable } from "@angular/core";
import { BabylonDOM } from "../interfaces/dom.types";
import { BabylonRender, CameraActions } from "../interfaces/render.types";
import { DOMElement } from "../../../types/dom-element";
import { StyleRule } from "../../../types/style-rule";
import { Mesh, Color3 } from "@babylonjs/core";
import { TransformData } from "../../../types/transform-data";
import { cssTranslationToRenderOffset, parseCssTransform } from "./css-transform";

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
        mesh.material = material;
      } else {
        const finalOpacity =
          backgroundData.alpha !== undefined ? backgroundData.alpha : opacity;
        const material = render.actions.mesh.createMaterial(
          `${element.id || mesh.name}-material`,
          backgroundData.color,
          finalOpacity,
        );
        mesh.material = material;
      }
    } else if (style?.background === "transparent") {
      // Explicitly handle transparent background
      const material = render.actions.mesh.createMaterial(
        `${element.id || mesh.name}-material`,
        new Color3(0, 0, 0),
        0, // Fully transparent
      );
      mesh.material = material;
    }
  }

  /**
   * Parse transform CSS property
   */
  parseTransform(transform: string | undefined): TransformData | null {
    return parseCssTransform(transform);
  }

  /**
   * Apply transforms to a mesh
   */
  applyTransforms(mesh: Mesh, transform: TransformData, projection: CameraActions): void {
    mesh.metadata ||= {};
    mesh.metadata.originalPosition ||= mesh.position.clone();
    mesh.metadata.originalRotation ||= mesh.rotation.clone();
    mesh.metadata.originalScaling ||= mesh.scaling.clone();

    const offset = cssTranslationToRenderOffset(transform, projection);
    mesh.position.set(
      mesh.metadata.originalPosition.x + offset.x,
      mesh.metadata.originalPosition.y + offset.y,
      mesh.metadata.originalPosition.z + offset.z,
    );
    mesh.rotation.set(
      mesh.metadata.originalRotation.x + transform.rotate.x,
      mesh.metadata.originalRotation.y + transform.rotate.y,
      mesh.metadata.originalRotation.z + transform.rotate.z,
    );
    mesh.scaling.set(
      mesh.metadata.originalScaling.x * transform.scale.x,
      mesh.metadata.originalScaling.y * transform.scale.y,
      mesh.metadata.originalScaling.z * transform.scale.z,
    );
  }
}
