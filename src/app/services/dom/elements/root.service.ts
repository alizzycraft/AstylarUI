import { Injectable } from "@angular/core";
import { StyleRule } from "../../../types/style-rule";
import { Color3, Mesh } from "@babylonjs/core";
import { BabylonDOM } from "../interfaces/dom.types";
import { BabylonRender } from "../interfaces/render.types";

@Injectable({
  providedIn: "root",
})
export class RootService {
  public createRootBodyElement(
    dom: BabylonDOM,
    render: BabylonRender,
    styles: StyleRule[],
  ): Mesh {
    // Store root-body dimensions in elementDimensions in PIXELS (not world units)
    const scene = render.scene;
    const canvas = scene?.getEngine().getRenderingCanvas();
    if (!canvas) {
      throw new Error(
        "Canvas not found when setting root-body elementDimensions",
      );
    }

    const cssWidth = canvas.clientWidth || 1920;
    const cssHeight = canvas.clientHeight || 1080;

    // Get viewport dimensions from camera service (in world units)
    const { width: visibleWidth, height: visibleHeight } =
      render.actions.camera.calculateViewportDimensions();

    // Create the root plane matching the visible world dimensions
    const rootBody = render.actions.mesh.createPlane(
      "root-body",
      visibleWidth,
      visibleHeight,
    );

    // Position at origin in the XY plane
    render.actions.mesh.positionTextMesh(rootBody, 0, 0, 0);

    // No rotation needed since camera is now at positive Z looking toward origin

    // Create material - this should be fully visible as it represents the document body
    let material;

    // Find root style and apply background color
    const rootStyle = render.actions.style.findStyleBySelector("root", styles);
    if (rootStyle?.background) {
      const backgroundData = render.actions.style.parseBackgroundColor(
        rootStyle.background,
      );
      const opacity = render.actions.style.parseOpacity(rootStyle.opacity);

      if (backgroundData?.type === "gradient") {
        material = render.actions.mesh.createGradientMaterial(
          "root-body-material-gradient",
          backgroundData.gradient,
          opacity,
          cssWidth,
          cssHeight,
        );
      } else {
        const finalOpacity =
          backgroundData?.alpha !== undefined ? backgroundData.alpha : opacity;
        material = render.actions.mesh.createMaterial(
          "root-body-material",
          backgroundData?.color || new Color3(0.2, 0.2, 0.3),
          finalOpacity,
        );
      }
    } else {
      material = render.actions.mesh.createMaterial(
        "root-body-material",
        new Color3(0.8, 0.1, 0.1),
      );

    }

    rootBody.material = material;



    dom.context.elements.set("root-body", rootBody);

    // Parse padding from root style using CSS pixels
    const rootPadding = this.parsePadding(
      rootStyle?.padding,
      cssWidth,
      cssHeight,
    );

    dom.context.elementDimensions.set("root-body", {
      width: cssWidth, // pixels
      height: cssHeight, // pixels
      padding: rootPadding, // pixels
    });

    return rootBody;
  }

  /**
   * Parse padding value from root style
   * Supports both pixel values and percentages
   * @param padding The padding style value (e.g., "10px", "10%", "10px 20px")
   * @param viewportWidth The viewport width in pixels (for percentage calculations)
   * @param viewportHeight The viewport height in pixels (for percentage calculations)
   */
  private parsePadding(
    padding: string | undefined,
    viewportWidth: number,
    viewportHeight: number,
  ): { top: number; right: number; bottom: number; left: number } {
    if (!padding) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    // Split into parts
    const parts = padding.split(/\s+/);

    // Helper to parse a single value (handles both px and %)
    const parseValue = (value: string, referenceSize: number): number => {
      if (value.endsWith("%")) {
        const percent = parseFloat(value);
        return (percent / 100) * referenceSize;
      } else if (value.endsWith("px")) {
        return parseFloat(value);
      } else {
        return parseFloat(value) || 0;
      }
    };

    if (parts.length === 1) {
      // padding: 10px (all sides) - use width for horizontal, height for vertical
      // For symmetric padding, we need to be consistent. CSS uses width reference for all sides
      // when percentage is used, but for simplicity, we'll use width for left/right, height for top/bottom
      const topBottom = parseValue(parts[0], viewportHeight);
      const leftRight = parseValue(parts[0], viewportWidth);
      return {
        top: topBottom,
        right: leftRight,
        bottom: topBottom,
        left: leftRight,
      };
    } else if (parts.length === 2) {
      // padding: 10px 20px (vertical horizontal)
      const vertical = parseValue(parts[0], viewportHeight);
      const horizontal = parseValue(parts[1], viewportWidth);
      return {
        top: vertical,
        right: horizontal,
        bottom: vertical,
        left: horizontal,
      };
    } else if (parts.length === 4) {
      // padding: 10px 20px 30px 40px (top right bottom left)
      return {
        top: parseValue(parts[0], viewportHeight),
        right: parseValue(parts[1], viewportWidth),
        bottom: parseValue(parts[2], viewportHeight),
        left: parseValue(parts[3], viewportWidth),
      };
    }

    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
}
