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
import { PositioningIntegrationService } from "./positioning/positioning-integration.service";
import { TextRenderingService } from "../text/text-rendering.service";
import { StoredTextLayoutMetrics } from "../../types/text-rendering";
import { TextInteractionRegistryService } from "./interaction/text-interaction-registry.service";
import { TextHighlightMeshFactory } from "./interaction/text-highlight-mesh.factory";
import { BabylonMeshService } from "../babylon-mesh.service";
import { BabylonElementManagerService } from "./element-manager.service";
import { BabylonInteractionService } from "./interaction.service";
import { DOMAncestryService } from "./dom-ancestry.service";

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
    private positioningIntegration: PositioningIntegrationService,
    private textRenderingService: TextRenderingService,
    private textInteractionRegistry: TextInteractionRegistryService,
    private textHighlightFactory: TextHighlightMeshFactory,
    private babylonMeshService: BabylonMeshService,
    private elementManager: BabylonElementManagerService,
    private interactionService: BabylonInteractionService,
    private ancestry: DOMAncestryService,
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
        // Positioning delegates
        calculateElementPosition:
          this.positioningIntegration.calculateElementPosition.bind(
            this.positioningIntegration,
          ),
        applyPositioning: this.positioningIntegration.applyPositioning.bind(
          this.positioningIntegration,
        ),
        updateElementPosition: this.updateElementPosition.bind(this),
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

    // Update viewport service with actual dimensions
    this.positioningIntegration.updateViewport({
      width: viewportWidth,
      height: viewportHeight,
    });
  }

  createSiteFromData(siteData: SiteData): void {
    if (!this.scene) {
      console.error("BabylonDOMRendererService: Scene not initialized");
      return;
    }

    console.log("🏗️ Creating site from data:", siteData);

    // Clear existing elements and state. Cached text textures reference the
    // meshes being replaced and must not survive into the next full rebuild.
    this.textRenderingService.clearCache();
    this.elementManager.clearAll();
    this.interactionService.clearAllInteractions();
    this.ancestry.clear();

    // Parse and organize styles
    console.log("📝 Parsing styles...");
    this.styleService.parseStyles(this.dom, this.render!, siteData.styles);
    console.log(
      "📝 Parsed styles. ElementStyles map:",
      this.elementManager.elementStylesMap,
    );

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
      console.log("👨‍👩‍👧‍👦 Processing root children:", siteData.root.children);
      console.log("👨‍👩‍👧‍👦 Root children count:", siteData.root.children.length);
      console.log(
        "👨‍👩‍👧‍👦 Root children details:",
        siteData.root.children.map((c) => `${c.type}#${c.id}`),
      );
      this.elementService.processChildren(
        this.dom,
        this.render!,
        siteData.root.children,
        rootBodyMesh,
        siteData.styles,
        rootElement,
      );
    } else {
      console.log("⚠️ No root children found in siteData");
    }

    console.log(
      "✅ Site creation complete. Elements:",
      this.elementManager.elementsMap.size,
    );
    console.log(
      "🗺️ All elements created:",
      Array.from(this.elementManager.elementsMap.keys()),
    );
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
   * Updates element position using positioning system
   * Integrates with existing mesh management
   */
  private updateElementPosition(
    elementId: string,
    newPosition: { x: number; y: number; z: number },
  ): void {
    if (!elementId) {
      throw new Error("Element ID is required for position update");
    }

    const mesh = this.elementManager.elementsMap.get(elementId);
    if (!mesh) {
      throw new Error(`No mesh found for element: ${elementId}`);
    }

    if (!this.render) {
      throw new Error("Render context is required for position updates");
    }

    // Use positioning integration service to update position
    this.positioningIntegration.updateElementPosition(
      elementId,
      mesh,
      this.render,
    );
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
      console.log(
        `📝 Processing text content for element ${element.id}: "${element.textContent.substring(0, 50)}..."`,
      );

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

      // Fallback to parent mesh bounding box if we don't have stored dimensions yet
      let fallbackDims:
        | {
            width: number;
            height: number;
            padding: {
              top: number;
              right: number;
              bottom: number;
              left: number;
            };
          }
        | undefined;
      if (!storedDims && render) {
        const scale = render.actions.camera.getPixelToWorldScale();
        const bounds = mesh.getBoundingInfo().boundingBox;
        const worldWidth = bounds.maximum.x - bounds.minimum.x;
        const worldHeight = bounds.maximum.y - bounds.minimum.y;
        const widthPx = worldWidth / scale;
        const heightPx = worldHeight / scale;
        fallbackDims = {
          width: widthPx,
          height: heightPx,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        };
        console.log(
          `[TEXT DEBUG] ${element.id}: using fallback element dimensions from mesh bounds: ${widthPx.toFixed(2)}x${heightPx.toFixed(2)}px`,
        );
      }

      const resolvedDims = storedDims ??
        fallbackDims ?? {
          width: 0,
          height: 0,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        };

      if (storedDims) {
        console.log(
          `[TEXT DEBUG] ${element.id}: using stored element dimensions: ${storedDims.width.toFixed(2)}x${storedDims.height.toFixed(2)}px with padding`,
          storedDims.padding,
        );
      } else if (!fallbackDims) {
        console.warn(
          `[TEXT DEBUG] ${element.id}: no stored or fallback dimensions available; proceeding with zeros`,
        );
      }

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

      console.log(
        `[TEXT DEBUG] ${element.id}: available content box ${availableWidthPx ?? -1}x${availableHeightPx ?? -1}px (padding L:${paddingPx.left}, R:${paddingPx.right}, T:${paddingPx.top}, B:${paddingPx.bottom})`,
      );

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

      console.log(
        `[TEXT DEBUG] ${element.id}: measured text dimensions ${measuredDimensions.width.toFixed(2)}x${measuredDimensions.height.toFixed(2)}px`,
      );

      // Convert text dimensions from CSS pixels to world units
      const textScaleFactor = render.actions.camera.getPixelToWorldScale();
      const textureDimensions = {
        width: measuredDimensions.width * textScaleFactor,
        height: measuredDimensions.height * textScaleFactor,
      };

      // Determine layout dimensions for positioning within the parent box
      const layoutDimensions = {
        width:
          availableWidthPx !== undefined
            ? Math.min(measuredDimensions.width, availableWidthPx)
            : measuredDimensions.width,
        height:
          availableHeightPx !== undefined
            ? Math.min(measuredDimensions.height, availableHeightPx)
            : measuredDimensions.height,
        rawWidth: measuredDimensions.width,
        rawHeight: measuredDimensions.height,
      };

      console.log(
        `[TEXT DEBUG] ${element.id}: layout dimensions ${layoutDimensions.width.toFixed(2)}x${layoutDimensions.height.toFixed(2)}px (raw ${layoutDimensions.rawWidth.toFixed(2)}x${layoutDimensions.rawHeight.toFixed(2)}px)`,
      );

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
        textScaleFactor,
        availableWidthPx,
      );
      this.elementManager.registerTextElement(
        element.id ?? mesh.name,
        textMesh,
        textTexture,
        element.textContent,
        storedMetrics,
      );

      console.log(
        `✅ Text rendering complete for ${element.id}: ${layoutDimensions.width.toFixed(2)}x${layoutDimensions.height.toFixed(2)} (raw: ${layoutDimensions.rawWidth.toFixed(2)}x${layoutDimensions.rawHeight.toFixed(2)})`,
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
      console.log(
        `🔄 Updating text content for ${elementId}: "${newContent.substring(0, 50)}..."`,
      );

      // Get existing text mesh and texture
      const existingTextMesh = dom.context.textMeshes.get(elementId);
      const existingTexture = dom.context.textTextures.get(elementId);

      if (!existingTextMesh || !existingTexture) {
        console.warn(
          `⚠️ No existing text mesh/texture found for ${elementId}, cannot update`,
        );
        return;
      }

      // Dispose old texture
      existingTexture.dispose();
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
      const pixelToWorldScale = render.actions.camera.getPixelToWorldScale();
      const storedMetrics = this.textRenderingService.createStoredLayoutMetrics(
        newContent,
        textStyleProperties,
        pixelToWorldScale,
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

      console.log(`✅ Text content updated for ${elementId}`);
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

    return { ...fallbackTextStyles, ...inheritedStyle, ...ownStyle };
  }

  private pickInheritedTextProperties(style: StyleRule): Partial<StyleRule> {
    const properties: Array<keyof StyleRule> = [
      'color', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight',
      'letterSpacing', 'wordSpacing', 'textAlign', 'whiteSpace', 'wordWrap',
      'textTransform', 'cursor'
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

    // Rotate the text mesh 180 degrees around the Z axis to fix horizontal flipping without affecting vertical orientation
    textMesh.rotation.z = Math.PI;

    // Make text mesh pickable for text selection
    textMesh.isPickable = true;
    textMesh.metadata = {
      ...(textMesh.metadata || {}),
      isTextMesh: true,
      elementId,
      textDimensions: dimensions,
    };

    console.log(
      `🎨 Created text mesh: ${textMesh.name} (${dimensions.width.toFixed(3)}x${dimensions.height.toFixed(3)} world units)`,
    );

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

    const scale = render?.actions.camera.getPixelToWorldScale() || 1;

    const parentBounds = parentMesh.getBoundingInfo().boundingBox;
    const parentWidthWorld = parentBounds.maximum.x - parentBounds.minimum.x;
    const parentHeightWorld = parentBounds.maximum.y - parentBounds.minimum.y;

    const parentWidthPx = elementDims?.width ?? parentWidthWorld / scale;
    const parentHeightPx = elementDims?.height ?? parentHeightWorld / scale;

    console.log(
      `[TEXT POS DEBUG] Parent mesh bounds for ${parentMesh.name}: world ${parentWidthWorld.toFixed(3)}x${parentHeightWorld.toFixed(3)}, px ${parentWidthPx.toFixed(2)}x${parentHeightPx.toFixed(2)} (scale ${scale.toFixed(6)})`,
    );

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

    console.log(
      `[TEXT POS DEBUG] Content box: ${contentWidthPx.toFixed(2)}x${contentHeightPx.toFixed(2)}px, text ${textWidthPx.toFixed(2)}x${textHeightPx.toFixed(2)}px, padding`,
      effectivePadding,
    );

    const textAlign = (style?.textAlign ?? "left").toLowerCase();
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

    // FLIP X-AXIS FIX: The project uses a flipped coordinate system where Left is Positive
    // So we negate the calculated standard offset
    offsetXPx = -offsetXPx;

    // Clamp horizontal offset so text stays within content box
    const halfParentWidthPx = parentWidthPx / 2;
    offsetXPx = Math.max(
      -halfParentWidthPx + effectivePadding.left + textWidthPx / 2,
      Math.min(
        halfParentWidthPx - effectivePadding.right - textWidthPx / 2,
        offsetXPx,
      ),
    );

    const verticalAlign = (style?.verticalAlign ?? "top").toLowerCase();
    let offsetYPx: number;
    switch (verticalAlign) {
      case "bottom":
        offsetYPx =
          -parentHeightPx / 2 + effectivePadding.bottom + textHeightPx / 2;
        break;
      case "middle":
      case "center":
        offsetYPx =
          parentHeightPx / 2 - effectivePadding.top - contentHeightPx / 2;
        break;
      case "baseline":
        // Approximate baseline as bottom alignment for now
        offsetYPx =
          -parentHeightPx / 2 + effectivePadding.bottom + textHeightPx / 2;
        break;
      default: // top alignment
        offsetYPx =
          parentHeightPx / 2 - effectivePadding.top - textHeightPx / 2;
        break;
    }

    // Clamp vertical offset so text stays within content box
    const halfParentHeightPx = parentHeightPx / 2;
    offsetYPx = Math.max(
      -halfParentHeightPx + effectivePadding.bottom + textHeightPx / 2,
      Math.min(
        halfParentHeightPx - effectivePadding.top - textHeightPx / 2,
        offsetYPx,
      ),
    );

    // Position text mesh relative to parent (slightly in front to avoid z-fighting)
    const baselineInsetPx = this.getTextBaselineInsetPx(style);
    textMesh.position.x = offsetXPx * scale;
    textMesh.position.y = (offsetYPx - baselineInsetPx) * scale;
    textMesh.position.z = 0.001; // Slightly in front of parent element - TODO: TECH-DEBT

    console.log(
      `📍 Positioned text mesh at offset (${textMesh.position.x.toFixed(3)}, ${textMesh.position.y.toFixed(3)}, 0.001) with alignment: ${textAlign}/${verticalAlign}`,
    );
  }

  cleanup(): void {
    this.elementManager.clearAll();
    this.interactionService.clearAllInteractions();
    this.scene = undefined;
    this.render = undefined;
  }

  private getTextBaselineInsetPx(style?: StyleRule): number {
    const fontSizePx = Number.parseFloat(style?.fontSize ?? '16');
    const declaredWeight = style?.fontWeight ?? '400';
    const fontWeight = declaredWeight === 'bold'
      ? 700
      : Number.parseInt(declaredWeight, 10);
    if (fontSizePx <= 13 && fontWeight >= 600) {
      return 4;
    }
    return fontSizePx <= 20 ? 2 : 1;
  }
}
