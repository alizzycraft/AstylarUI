import { Injectable } from "@angular/core";
import { Scene, Mesh } from "@babylonjs/core";
import * as BABYLON from "@babylonjs/core";
import { StyleRule } from "../../types/style-rule";
import { SiteData } from "../../types/site-data";
import { FlexService } from "./elements/flex.service";
import { BabylonDOM } from "./interfaces/dom.types";
import { RootService } from "./elements/root.service";
import { ListService } from "./elements/list.service";
import { ElementService } from "./elements/element.service";
import { StyleService } from "./style.service";
import { StyleDefaultsService } from "./style-defaults.service";
import { BabylonRender } from "./interfaces/render.types";
import { TableService } from "./elements/table.service";
import { DOMElement } from "../../types/dom-element";
import { generateElementId } from "./utils/element-id.util";
import { ViewportService } from "./positioning/viewport.service";
import { TextRenderingService } from "../text/text-rendering.service";
import { StoredTextLayoutMetrics } from "../../types/text-rendering";
import { TextInteractionRegistryService } from "./interaction/text-interaction-registry.service";
import { TextHighlightMeshFactory } from "./interaction/text-highlight-mesh.factory";
import { BabylonMeshService } from "../babylon-mesh.service";
import { BabylonElementManagerService } from "./element-manager.service";
import { BabylonInteractionService } from "./interaction.service";
import { DOMAncestryService } from "./dom-ancestry.service";
import { InputElementService } from "./input/input-element.service";
import { resolveComputedFontSize } from "./utils/computed-font-size.util";
import { projectCssSize } from "../css-render-boundary";

@Injectable({
  providedIn: "root",
})
export class BabylonDOMRendererService {
  private scene?: Scene;
  private sceneWidth: number = 1920; // Default viewport width - TODO: TECH-DEBT
  private sceneHeight: number = 1080; // Default viewport height - TODO: TECH-DEBT
  public render?: BabylonRender;

  constructor(
    private flexService: FlexService,
    private rootService: RootService,
    private listService: ListService,
    private elementService: ElementService,
    private styleService: StyleService,
    private tableService: TableService,
    private styleDefaults: StyleDefaultsService,
    private viewportService: ViewportService,
    private textRenderingService: TextRenderingService,
    private textInteractionRegistry: TextInteractionRegistryService,
    private textHighlightFactory: TextHighlightMeshFactory,
    private babylonMeshService: BabylonMeshService,
    private elementManager: BabylonElementManagerService,
    private interactionService: BabylonInteractionService,
    private ancestry: DOMAncestryService,
    private inputElementService: InputElementService,
  ) {}

  public get dom(): BabylonDOM {
    return {
      actions: {
        processChildren: this.elementService.processChildren.bind(
          this.elementService,
        ),
        createElement: this.elementService.createElement.bind(
          this.elementService,
        ),
        isFlexContainer: this.flexService.isFlexContainer.bind(
          this.flexService,
        ),
        processListChildren: this.listService.processListChildren.bind(
          this.listService,
        ),
        processFlexChildren: this.flexService.processFlexChildren.bind(
          this.flexService,
        ),
        requestElementRecreation:
          this.elementService.requestElementRecreation.bind(
            this.elementService,
          ),
        processTable: this.tableService.processTable.bind(this.tableService),
        generateElementId,
        // Text rendering delegates
        handleTextContent: this.handleTextContent.bind(this),
        updateTextContent: this.updateTextContent.bind(this),
        validateTextElement: this.validateTextElement.bind(this),
      },
      context: {
        elements: this.elementManager.elementsMap,
        hoverStates: this.elementManager.hoverStatesMap,
        elementStyles: this.elementManager.elementStylesMap,
        elementTypes: this.elementManager.elementTypesMap,
        elementDimensions: this.elementManager.elementDimensionsMap,
        layoutBoxes: this.elementManager.layoutBoxesMap,
        // Text rendering context
        textMeshes: this.elementManager.textMeshesMap,
        textTextures: this.elementManager.textTexturesMap,
        textContent: this.elementManager.textContentMap,
        textMetrics: this.elementManager.textMetricsMap,
        // Input element context
        inputElements: this.elementManager.inputElementsMap,
        focusedInputId: this.elementManager.focusedInput,
      },
    };
  }

  initialize(
    render: BabylonRender,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    this.render = render;
    this.scene = render.scene;

    // Initialize text rendering service with scene
    if (render.scene) {
      this.textRenderingService.initialize(render.scene);
    }

    // Keep CSS viewport units aligned with the mounted surface dimensions.
    this.viewportService.updateViewport({
      width: viewportWidth,
      height: viewportHeight,
    });
  }

  createSiteFromData(siteData: SiteData): void {
    if (!this.scene) {
      console.error("BabylonDOMRendererService: Scene not initialized");
      return;
    }



    this.inputElementService.cleanup();
    // Textures are surface-scoped cache resources, not mesh-owned resources.
    // Scene replacement retains them while the old element tree is released.
    this.elementManager.clearAll({ disposeTextTextures: false });
    this.interactionService.clearAllInteractions();
    this.ancestry.clear();

    // Parse and organize styles

    this.styleService.parseStyles(this.dom, this.render!, siteData.styles);


    // Create root body element that represents the full viewport/document
    const rootBodyMesh = this.rootService.createRootBodyElement(
      this.dom,
      this.render!,
      siteData.styles,
    );
    const rootElement: DOMElement = { id: "root-body", type: "div" };

    // Process children recursively - these will be positioned relative to the body
    if (siteData.root.children) {
      // Intrinsic pre-layout can inspect grandchildren before their parent is
      // created. Register the complete tree first so selector resolution is
      // identical during measurement and final element creation.
      this.registerAncestry(siteData.root.children, rootElement);



      this.elementService.processChildren(
        this.dom,
        this.render!,
        siteData.root.children,
        rootBodyMesh,
        siteData.styles,
        rootElement,
      );
    } else {

    }



  }

  private registerAncestry(children: DOMElement[], parent: DOMElement): void {
    for (const child of children) {
      this.ancestry.setParent(child, parent);
      if (child.children?.length) {
        this.registerAncestry(child.children, child);
      }
    }
  }

  /**
   * Handles text content for DOM elements by creating text meshes and textures
   * @param dom - BabylonDOM interface
   * @param render - BabylonRender interface
   * @param element - DOM element containing text content
   * @param mesh - The parent mesh to attach text to
   * @param styles - Style rules for text styling
   */
  private handleTextContent(
    dom: BabylonDOM,
    render: BabylonRender,
    element: DOMElement,
    mesh: Mesh,
    styles: StyleRule[],
  ): void {
    if (!element.textContent || element.textContent.trim() === "") {
      return; // No text content to render
    }

    try {


      // Validate text element
      const validation = this.validateTextElement(element);
      if (!validation.isValid) {
        console.error(
          `❌ Text element validation failed for ${element.id}:`,
          validation.errors,
        );
        return;
      }

      // Get merged style for text properties (including inheritance)
      const textStyle = this.getInheritedTextStyle(element, styles);

      // Use mesh name to look up dimensions (all elements stored by mesh ID now)
      const storedDims = this.elementManager.getElementDimensions(mesh.name);

      if (!storedDims) {
        throw new Error(
          `Text layout requires retained CSS dimensions for ${mesh.name}.`,
        );
      }
      const resolvedDims = storedDims;

      const paddingPx = resolvedDims.padding ?? {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      };
      const availableWidthPx =
        resolvedDims.width > 0
          ? Math.max(0, resolvedDims.width - (paddingPx.left + paddingPx.right))
          : undefined;
      const availableHeightPx =
        resolvedDims.height > 0
          ? Math.max(
              0,
              resolvedDims.height - (paddingPx.top + paddingPx.bottom),
            )
          : undefined;



      const textStyleProperties = this.textRenderingService[
        "parseElementTextStyle"
      ](element, textStyle);
      const renderedText =
        textStyleProperties.textOverflow === "ellipsis" &&
        availableWidthPx !== undefined &&
        availableHeightPx !== undefined
          ? this.textRenderingService.resolveOverflowText(
              element.textContent,
              textStyleProperties,
              availableWidthPx,
              availableHeightPx,
            )
          : element.textContent;

      // Render text to texture using available width for wrapping
      const textTexture = this.textRenderingService.renderTextToTexture(
        element,
        renderedText,
        textStyle,
        availableWidthPx,
      );

      // Measure text dimensions (CSS px)
      const measuredDimensions =
        this.textRenderingService.calculateTextDimensions(
          renderedText,
          textStyleProperties,
          availableWidthPx,
        );



      // Convert text dimensions from CSS pixels to world units
      const textureSize = this.textRenderingService.getLogicalTextureSize(textTexture);
      const textureWidthPx = textureSize.width;
      const textureHeightPx = textureSize.height;
      const textureDimensions = projectCssSize(render, textureSize);

      // Determine layout dimensions for positioning within the parent box
      const layoutDimensions = {
        width:
          availableWidthPx !== undefined
            ? Math.min(textureWidthPx, availableWidthPx)
            : textureWidthPx,
        height:
          availableHeightPx !== undefined
            ? Math.min(textureHeightPx, availableHeightPx)
            : textureHeightPx,
        rawWidth: measuredDimensions.width,
        rawHeight: measuredDimensions.height,
      };



      // Create text mesh using BabylonMeshService (texture size)
      const textMesh = this.createTextMesh(
        element.id ?? mesh.name,
        textTexture,
        textureDimensions,
        render,
      );

      // Position text mesh relative to parent element using layout dimensions
      this.positionTextMesh(
        textMesh,
        mesh,
        layoutDimensions,
        textStyle,
        paddingPx,
        resolvedDims,
        render,
      );

      // Store text rendering context using element manager
      const storedMetrics = this.textRenderingService.createStoredLayoutMetrics(
        element.textContent,
        textStyleProperties,
        availableWidthPx,
      );
      this.elementManager.registerTextElement(
        element.id ?? mesh.name,
        textMesh,
        textTexture,
        element.textContent,
        storedMetrics,
        textStyle,
        layoutDimensions,
      );


    } catch (error) {
      console.error(`❌ Error handling text content for ${element.id}:`, error);
    }
  }

  /**
   * Updates text content for an existing element
   * @param dom - BabylonDOM interface
   * @param render - BabylonRender interface
   * @param elementId - ID of the element to update
   * @param newContent - New text content
   */
  private updateTextContent(
    dom: BabylonDOM,
    render: BabylonRender,
    elementId: string,
    newContent: string,
  ): void {
    try {


      // Get existing text mesh and texture
      const existingTextMesh = dom.context.textMeshes.get(elementId);
      const existingTexture = dom.context.textTextures.get(elementId);

      if (!existingTextMesh || !existingTexture) {
        console.warn(
          `⚠️ No existing text mesh/texture found for ${elementId}, cannot update`,
        );
        return;
      }

      // Release this rendered use while allowing the surface cache to reuse it.
      this.textRenderingService.releaseTexture(existingTexture);
      dom.context.textTextures.delete(elementId);

      // Get element and parent mesh
      const parentMesh = dom.context.elements.get(elementId);
      if (!parentMesh) {
        console.error(`❌ Parent mesh not found for ${elementId}`);
        return;
      }

      // Create mock element for text rendering (we need the element structure)
      const elementType = dom.context.elementTypes.get(elementId) || "div";
      const mockElement: DOMElement = {
        id: elementId,
        type: elementType as any,
        textContent: newContent,
      };

      // Get style for text properties
      const elementStyles = dom.context.elementStyles.get(elementId);
      const textStyle = elementStyles?.normal;

      // Calculate maximum width for text wrapping
      const elementDims = dom.context.elementDimensions.get(elementId);
      const maxWidth = elementDims
        ? elementDims.width -
          (elementDims.padding.left + elementDims.padding.right)
        : undefined;

      // Render new text to texture
      const newTextTexture = this.textRenderingService.renderTextToTexture(
        mockElement,
        newContent,
        textStyle,
        maxWidth,
      );

      // Update text mesh material with new texture
      if (existingTextMesh.material) {
        const material = existingTextMesh.material as BABYLON.StandardMaterial;
        material.diffuseTexture = newTextTexture;
      }

      // Update stored context
      dom.context.textTextures.set(elementId, newTextTexture);
      dom.context.textContent.set(elementId, newContent);
      const textStyleProperties = this.textRenderingService[
        "parseElementTextStyle"
      ](mockElement, textStyle);
      const storedMetrics = this.textRenderingService.createStoredLayoutMetrics(
        newContent,
        textStyleProperties,
        maxWidth,
      );
      this.elementManager.textMetricsMap.set(elementId, storedMetrics);
      this.textInteractionRegistry.updateMetrics(elementId, storedMetrics);
      this.textInteractionRegistry.updateStyle(elementId, textStyle);
      existingTextMesh.metadata = {
        ...(existingTextMesh.metadata || {}),
        textDimensions: {
          width: storedMetrics.css.totalWidth,
          height: storedMetrics.css.totalHeight,
        },
      };


    } catch (error) {
      console.error(`❌ Error updating text content for ${elementId}:`, error);
    }
  }

  /**
   * Validates a text element for proper text rendering
   * @param element - DOM element to validate
   * @returns Validation result with errors if any
   */
  private validateTextElement(element: DOMElement): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!element.textContent) {
      errors.push("Element must have textContent property");
    }

    // Check for valid text content
    if (element.textContent && typeof element.textContent !== "string") {
      errors.push("textContent must be a string");
    }

    // Check for extremely long text that might cause performance issues
    if (element.textContent && element.textContent.length > 10000) {
      errors.push(
        "Text content is too long (>10000 characters), consider splitting into multiple elements",
      );
    }

    // Validate element type supports text content
    const textSupportedTypes = [
      "div",
      "span",
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "li",
      "td",
      "th",
      "a",
      "button",
      "b",
      "strong",
      "i",
      "em",
      "u",
      "small",
      "sub",
      "sup",
      "code",
      "pre",
      "blockquote",
      "label",
      "figcaption",
      "cite",
      "abbr",
      "mark",
      "q",
      "del",
      "ins",
      "s",
      "strike",
      "kbd",
      "samp",
      "var",
      "dfn",
      "address",
      "dt",
      "dd",
      "caption",
      "legend",
      "summary",
      "details",
    ];
    if (!textSupportedTypes.includes(element.type)) {
      console.warn(
        `⚠️ Element type '${element.type}' may not be optimal for text content`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Gets inherited text style properties from element and parent styles
   * @param element - DOM element to get styles for
   * @param styles - Available style rules
   * @returns Merged style rule with text properties
   */
  private getInheritedTextStyle(
    element: DOMElement,
    styles: StyleRule[],
  ): StyleRule {
    const fallbackTextStyles: StyleRule = {
      selector: element.id ? `#${element.id}` : element.type,
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      fontWeight: "normal",
      fontStyle: "normal",
      color: "#000000",
      textAlign: "left",
      lineHeight: "normal",
      letterSpacing: "0px",
      wordSpacing: "0px",
      textDecoration: "none",
      textTransform: "none",
    };
    const parent = this.ancestry.getParent(element);
    const inheritedStyle = parent
      ? this.pickInheritedTextProperties(
          this.getInheritedTextStyle(parent, styles),
        )
      : {};
    const ownStyle = this.styleService.findStyleForElement(
      element,
      styles,
      this.elementManager.elementStylesMap,
    );

    const merged = { ...fallbackTextStyles, ...inheritedStyle, ...ownStyle };
    merged.fontSize = resolveComputedFontSize(
      ownStyle?.fontSize ?? inheritedStyle.fontSize ?? fallbackTextStyles.fontSize,
      inheritedStyle.fontSize ?? fallbackTextStyles.fontSize,
    );
    return merged;
  }

  private pickInheritedTextProperties(style: StyleRule): Partial<StyleRule> {
    const properties: Array<keyof StyleRule> = [
      'color', 'caretColor', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight',
      'letterSpacing', 'wordSpacing', 'textAlign', 'whiteSpace', 'wordWrap',
      'textTransform', 'cursor', 'pointerEvents'
    ];
    return Object.fromEntries(
      properties
        .filter((property) => style[property] !== undefined)
        .map((property) => [property, style[property]]),
    ) as Partial<StyleRule>;
  }

  /**
   * Creates a text mesh using BabylonJS plane geometry
   * @param elementId - ID of the element
   * @param texture - Text texture to apply
   * @param dimensions - Text dimensions for mesh sizing
   * @param render - BabylonRender interface
   * @returns Created text mesh
   */
  private createTextMesh(
    elementId: string,
    texture: BABYLON.Texture,
    dimensions: { width: number; height: number },
    render: BabylonRender,
  ): Mesh {
    const scene = render.scene;
    if (!scene) {
      throw new Error("Scene not initialized");
    }

    // Create text mesh with proper material using BabylonMeshService
    const textMesh = this.babylonMeshService.createTextMesh(
      `${elementId}_text`,
      texture,
      dimensions.width,
      dimensions.height,
    );

    // Make text mesh pickable for text selection
    textMesh.isPickable = true;
    textMesh.metadata = {
      ...(textMesh.metadata || {}),
      isTextMesh: true,
      elementId,
      textDimensions: dimensions,
    };



    return textMesh;
  }

  /**
   * Positions text mesh relative to parent element based on text alignment
   * @param textMesh - Text mesh to position
   * @param parentMesh - Parent element mesh
   * @param dimensions - Text dimensions
   * @param style - Text style for alignment
   */
  private positionTextMesh(
    textMesh: Mesh,
    parentMesh: Mesh,
    dimensions: { width: number; height: number },
    style?: StyleRule,
    paddingPx: { top: number; right: number; bottom: number; left: number } = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    elementDims?: {
      width: number;
      height: number;
      padding: { top: number; right: number; bottom: number; left: number };
    },
    render?: BabylonRender,
  ): void {
    // Parent text mesh to element mesh
    textMesh.parent = parentMesh;

    if (!elementDims || !render) {
      throw new Error(
        `Text positioning requires retained CSS dimensions for ${parentMesh.name}.`,
      );
    }
    const parentWidthPx = elementDims.width;
    const parentHeightPx = elementDims.height;



    const effectivePadding = {
      top: paddingPx.top ?? 0,
      right: paddingPx.right ?? 0,
      bottom: paddingPx.bottom ?? 0,
      left: paddingPx.left ?? 0,
    };

    const contentWidthPx = Math.max(
      0,
      parentWidthPx - (effectivePadding.left + effectivePadding.right),
    );
    const contentHeightPx = Math.max(
      0,
      parentHeightPx - (effectivePadding.top + effectivePadding.bottom),
    );

    const textWidthPx = dimensions.width;
    const textHeightPx = dimensions.height;



    const anonymousFlexAlignment = this.resolveAnonymousFlexTextAlignment(style);
    const textAlign = anonymousFlexAlignment.horizontal ??
      (style?.textAlign ?? "left").toLowerCase();
    let offsetXPx: number;
    switch (textAlign) {
      case "right":
        offsetXPx =
          parentWidthPx / 2 - effectivePadding.right - textWidthPx / 2;
        break;
      case "center":
        offsetXPx =
          -parentWidthPx / 2 + effectivePadding.left + contentWidthPx / 2;
        break;
      default: // left alignment
        offsetXPx =
          -parentWidthPx / 2 + effectivePadding.left + textWidthPx / 2;
        break;
    }

    // Clamp horizontal offset so text stays within content box
    const halfParentWidthPx = parentWidthPx / 2;
    offsetXPx = Math.max(
      -halfParentWidthPx + effectivePadding.left + textWidthPx / 2,
      Math.min(
        halfParentWidthPx - effectivePadding.right - textWidthPx / 2,
        offsetXPx,
      ),
    );

    const verticalAlign = anonymousFlexAlignment.vertical ??
      (style?.verticalAlign ?? "top").toLowerCase();
    let offsetYCssPx: number;
    switch (verticalAlign) {
      case "bottom":
        offsetYCssPx =
          parentHeightPx / 2 - effectivePadding.bottom - textHeightPx / 2;
        break;
      case "middle":
      case "center":
        offsetYCssPx =
          -parentHeightPx / 2 + effectivePadding.top + contentHeightPx / 2;
        break;
      case "baseline":
        // Approximate baseline as bottom alignment for now
        offsetYCssPx =
          parentHeightPx / 2 - effectivePadding.bottom - textHeightPx / 2;
        break;
      default: // top alignment
        offsetYCssPx =
          -parentHeightPx / 2 + effectivePadding.top + textHeightPx / 2;
        break;
    }

    // Clamp vertical offset so text stays within content box
    const halfParentHeightPx = parentHeightPx / 2;
    offsetYCssPx = Math.max(
      -halfParentHeightPx + effectivePadding.top + textHeightPx / 2,
      Math.min(
        halfParentHeightPx - effectivePadding.bottom - textHeightPx / 2,
        offsetYCssPx,
      ),
    );

    // Position text mesh relative to parent (slightly in front to avoid z-fighting)
    const renderedPosition = render.actions.camera.projectCssLocalPoint(
      { x: offsetXPx, y: offsetYCssPx },
      0.001,
    );
    textMesh.position.x = renderedPosition.x;
    // The text texture already contains the browser-style line box and its
    // alphabetic baseline. Position the line box itself here; applying a
    // second font-size/weight-dependent inset shifts the rendered glyph ink
    // away from the element's authored vertical alignment.
    textMesh.position.y = renderedPosition.y;
    textMesh.position.z = renderedPosition.z; // Slightly in front of parent element - TODO: TECH-DEBT


  }

  /**
   * Browser flex layout wraps direct text in an anonymous flex item. AstylarUI
   * paints direct text on the element mesh instead, so reproduce the anonymous
   * item's main/cross-axis placement before the final CSS-to-Babylon projection.
   */
  private resolveAnonymousFlexTextAlignment(style?: StyleRule): {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
  } {
    const display = style?.display?.toLowerCase();
    if (display !== 'flex' && display !== 'inline-flex') return {};

    const direction = style?.flexDirection?.toLowerCase() ?? 'row';
    const isRow = direction === 'row' || direction === 'row-reverse';
    const main = style?.justifyContent?.toLowerCase() ?? 'flex-start';
    const cross = style?.alignItems?.toLowerCase() ?? 'stretch';
    const horizontalValue = isRow ? main : cross;
    const verticalValue = isRow ? cross : main;

    return {
      horizontal: horizontalValue === 'flex-end' || horizontalValue === 'end'
        ? 'right'
        : ['center', 'space-around', 'space-evenly'].includes(horizontalValue)
          ? 'center'
          : 'left',
      vertical: verticalValue === 'flex-end' || verticalValue === 'end'
        ? 'bottom'
        : ['center', 'space-around', 'space-evenly'].includes(verticalValue)
          ? 'middle'
          : 'top',
    };
  }

  cleanup(): void {
    this.inputElementService.cleanup();
    this.elementManager.clearAll({ disposeTextTextures: false });
    this.textRenderingService.dispose();
    this.interactionService.clearAllInteractions();
    this.scene = undefined;
    this.render = undefined;
  }

}
