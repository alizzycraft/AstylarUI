import { Injectable } from "@angular/core";
import { BabylonDOM } from "../interfaces/dom.types";
import { BabylonRender } from "../interfaces/render.types";
import { DOMElement } from "../../../types/dom-element";
import { StyleRule } from "../../../types/style-rule";
import { Mesh } from "@babylonjs/core";
import * as BABYLON from "@babylonjs/core";
import { StyleDefaultsService } from "../style-defaults.service";
import { StackingContextManager } from "../positioning/stacking-context.manager";
import { InputElementService } from "../input/input-element.service";
import { ElementMaterialService } from "./element-material.service";
import { ElementDimensionService } from "./element-dimension.service";
import { ElementBorderService } from "./element-border.service";
import { ElementStyleParserService } from "./element-style-parser.service";
import { ElementInteractionService } from "./element-interaction.service";
import { DOMAncestryService } from "../dom-ancestry.service";
import { ImageLayoutService } from "./image-layout.service";

/**
 * Service responsible for creating DOM elements as Babylon.js meshes
 * This is the main orchestrator that coordinates all element creation logic
 */
@Injectable({
  providedIn: "root",
})
export class ElementCreationService {
  constructor(
    private styleDefaults: StyleDefaultsService,
    private stackingContextManager: StackingContextManager,
    private inputElementService: InputElementService,
    private materialService: ElementMaterialService,
    private dimensionService: ElementDimensionService,
    private borderService: ElementBorderService,
    private styleParser: ElementStyleParserService,
    private interactionService: ElementInteractionService,
    private ancestry: DOMAncestryService,
    private imageLayout: ImageLayoutService,
  ) {}

  /**
   * Create a DOM element as a Babylon.js mesh
   */
  createElement(
    dom: BabylonDOM,
    render: BabylonRender,
    element: DOMElement,
    parent: Mesh,
    styles: StyleRule[],
    flexPosition?: { x: number; y: number; z: number },
    flexSize?: { width: number; height: number },
  ): Mesh {
    console.log(
      `🔨 [ElementCreation] START creating element:`,
      element.type,
      element.id,
    );

    // Ensure pointer observer is set up
    this.interactionService.ensurePointerObserver(render);

    // Resolve effective style using cascade (Type < Class < ID)
    // This now correctly handles class-based styles and merges them with ID and type defaults
    let style = render.actions.style.findStyleForElement(
      element,
      styles,
      dom.context.elementStyles,
    ) || {
      selector: element.id ? `#${element.id}` : element.type,
      ...this.styleDefaults.getElementTypeDefaults(element.type),
    };

    // Get element styles for manual overrides and hover state
    const elementStyles = element.id
      ? dom.context.elementStyles.get(element.id)
      : undefined;

    // Inline declarations are the highest author-origin specificity and must
    // remain above renderer context and stylesheet declarations.
    if (element.style) {
      style = { ...style, ...element.style };
    }

    const isHovered = element.id
      ? dom.context.hoverStates.get(element.id) || false
      : false;

    // If element is hovered, merge in hover styles
    if (isHovered && elementStyles?.hover) {
      style = { ...style, ...elementStyles.hover };
      console.log(`[ElementCreation] Applying HOVER styles for ${element.id}`);
    }

    // Logic to fix cursor for checkboxes and radio buttons
    // They default to 'text' because they are 'input' elements, but should be 'pointer'
    if (
      element.type === "input" &&
      (element.inputType === "checkbox" || element.inputType === "radio")
    ) {
      if (style.cursor === "text" || !style.cursor) {
        style.cursor = "pointer";
      }
    }

    // Determine mesh ID
    const meshId =
      element.id ||
      dom.actions.generateElementId(
        parent?.name || "root",
        element.type,
        0,
        element.class,
      );

    const layoutParent = this.dimensionService.resolveLayoutParent(dom, style, parent);

    // Calculate dimensions
    const calculatedDimensions = this.dimensionService.calculateDimensions(
      dom,
      render,
      element,
      style,
      layoutParent,
      styles,
    );
    const dimensions = flexSize
      ? {
          ...calculatedDimensions,
          width: flexSize.width,
          height: flexSize.height,
        }
      : calculatedDimensions;

    // Parse border radius and scale
    const borderRadiusPixels = this.borderService.parseBorderRadius(
      style?.borderRadius,
    );
    const scaleFactor = render.actions.camera.getPixelToWorldScale();
    const borderRadius = borderRadiusPixels * scaleFactor;
    const worldWidth = dimensions.width * scaleFactor;
    const worldHeight = dimensions.height * scaleFactor;

    // DEBUG: Log dimensions for troubleshooting
    console.log(
      `[ElementCreation] Creating ${element.type} (${element.id}): raw dimensions=${dimensions.width}x${dimensions.height}, scale=${scaleFactor}, world=${worldWidth.toFixed(2)}x${worldHeight.toFixed(2)}`,
    );

    let mesh: Mesh;

    // Check if it's an input element and delegate creation
    const inputElement =
      render.scene &&
      (element.type === "input" ||
        element.type === "button" ||
        element.type === "select" ||
        element.type === "textarea")
        ? this.inputElementService.createInputElement(element, render, style, {
            width: worldWidth,
            height: worldHeight,
          })
        : null;

    if (inputElement) {
      dom.context.inputElements.set(
        element.id || inputElement.mesh.name,
        inputElement,
      );
      mesh = inputElement.mesh;
    } else if (element.type === "img") {
      // Create image mesh
      mesh = render.actions.mesh.createPolygon(
        meshId,
        "rectangle",
        worldWidth,
        worldHeight,
        borderRadius,
      );

      // Apply image texture if src is present (either on element or in style)
      const imageSrc = element.src || style.src;
      if (imageSrc) {
        const imageContent = render.actions.mesh.createPolygon(
          `${meshId}-image-content`,
          "rectangle",
          worldWidth,
          worldHeight,
          0,
        );
        imageContent.renderingGroupId = 1;
        imageContent.isPickable = false;
        const material = new BABYLON.StandardMaterial(
          `${meshId}-image-material`,
          render.scene,
        );
        const texture = new BABYLON.Texture(imageSrc, render.scene);
        material.diffuseTexture = texture;
        material.emissiveTexture = texture;
        material.diffuseColor = BABYLON.Color3.White();
        material.emissiveColor = BABYLON.Color3.White();
        material.specularColor = BABYLON.Color3.Black();
        material.disableLighting = true;
        material.disableDepthWrite = true;
        material.backFaceCulling = false;
        texture.hasAlpha = true;
        texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
        material.useAlphaFromDiffuseTexture = true;

        // Handle opacity
        const opacity = render.actions.style.parseOpacity(style?.opacity);
        material.alpha = opacity;

        imageContent.material = material;
        render.actions.mesh.parentTextMesh(imageContent, mesh);

        const configureImage = () => {
          const imageSize = texture.getSize();
          const insets = dimensions.padding;
          const target = this.imageLayout.resolveIntrinsicBox(
            dimensions.width,
            dimensions.height,
            insets.left + insets.right,
            insets.top + insets.bottom,
            imageSize.width,
            imageSize.height,
            style.width !== undefined && style.width !== 'auto',
            style.height !== undefined && style.height !== 'auto',
          );

          if (target.width !== dimensions.width || target.height !== dimensions.height) {
            const widthDelta = target.width - dimensions.width;
            const heightDelta = target.height - dimensions.height;
            render.actions.mesh.updateMeshWithBorderRadius(
              mesh,
              'rectangle',
              target.width * scaleFactor,
              target.height * scaleFactor,
              borderRadius,
            );
            mesh.position.x -= widthDelta * scaleFactor / 2;
            mesh.position.y -= heightDelta * scaleFactor / 2;
            dimensions.width = target.width;
            dimensions.height = target.height;
            dom.context.elementDimensions.set(meshId, dimensions);
          }

          const contentWidth = Math.max(0, target.width - insets.left - insets.right);
          const contentHeight = Math.max(0, target.height - insets.top - insets.bottom);
          const fit = this.imageLayout.calculateFit(
            contentWidth,
            contentHeight,
            imageSize.width,
            imageSize.height,
            style.objectFit,
          );
          render.actions.mesh.updateMeshWithBorderRadius(
            imageContent,
            'rectangle',
            fit.renderedWidth * scaleFactor,
            fit.renderedHeight * scaleFactor,
            0,
          );
          // The renderer's logical X axis is mirrored at the camera boundary;
          // reverse image U coordinates so replaced content keeps CSS orientation.
          texture.uScale = -fit.uScale;
          texture.vScale = fit.vScale;
          texture.uOffset = fit.uOffset + fit.uScale;
          texture.vOffset = fit.vOffset;

          const contentCenterX = -target.width / 2 + insets.left + contentWidth / 2;
          const contentCenterY = target.height / 2 - insets.top - contentHeight / 2;
          render.actions.mesh.positionTextMesh(
            imageContent,
            contentCenterX * scaleFactor,
            contentCenterY * scaleFactor,
            0.1,
          );
        };

        if (texture.isReady()) {
          configureImage();
        } else {
          texture.onLoadObservable.addOnce(configureImage);
        }
      }
    } else {
      // Default element creation
      mesh = render.actions.mesh.createPolygon(
        meshId,
        "rectangle",
        worldWidth,
        worldHeight,
        borderRadius,
      );
    }

    // Set metadata
    mesh.metadata = {
      ...(mesh.metadata || {}),
      cursor: style.cursor,
      elementId: element.id,
      element: element, // Store the element object for hover handling
    };

    // Calculate position
    const stackingZPosition =
      this.stackingContextManager.calculateZPosition(element, style);
    const zPosition = flexPosition ? flexPosition.z : stackingZPosition;

    let worldX: number, worldY: number;
    if (flexPosition) {
      worldX = flexPosition.x * scaleFactor;
      worldY = flexPosition.y * scaleFactor;
    } else {
      worldX = dimensions.x * scaleFactor;
      worldY = dimensions.y * scaleFactor;
    }

    // Position and parent the mesh
    render.actions.mesh.positionTextMesh(mesh, worldX, worldY, zPosition);
    render.actions.mesh.parentTextMesh(mesh, layoutParent);
    console.log(`[ElementCreation] Positioned mesh ${meshId}`);

    // Create borders if border width is defined
    try {
      const borderProps = this.borderService.parseBorderProperties(
        render,
        style,
      );
      console.log(`[ElementCreation] Border props for ${meshId}:`, borderProps);

      if (borderProps.width > 0) {
        // Use createPolygonBorder (not createBorderMesh) to match original implementation
        // All elements use 'rectangle' polygon type in current implementation
        const borderMeshes = render.actions.mesh.createPolygonBorder(
          `${meshId}-border`,
          "rectangle", // polygon type - all elements are rectangles
          worldWidth,
          worldHeight,
          borderProps.width,
          borderRadius,
        );

        if (borderMeshes && borderMeshes.length > 0) {
          // Create border material
          const borderMaterial = render.actions.mesh.createMaterial(
            `${meshId}-border-material`,
            borderProps.color,
          );
          borderMaterial.alpha = render.actions.style.parseOpacity(style?.opacity);
          borderMaterial.zOffset = style.zIndex && style.zIndex !== 'auto'
            ? Number.parseInt(style.zIndex, 10) || 0
            : 0;

          // Parent all border frames to main mesh FIRST
          borderMeshes.forEach((borderMesh: BABYLON.Mesh) => {
            borderMesh.material = borderMaterial;
            render.actions.mesh.parentTextMesh(borderMesh, mesh);
          });

          // Position border frames at (0,0) relative to main mesh with POSITIVE Z offset
          // Borders should be slightly in front for visibility
          // Since parented, use local Z offset, not world Z
          render.actions.mesh.positionBorderFrames(
            borderMeshes,
            0, // x relative to main mesh
            0, // y relative to main mesh
            0.05, // positive offset so borders appear in front
            worldWidth,
            worldHeight,
            borderProps.width,
          );

          // Store border meshes in context so they can be disposed/updated later (e.g. on hover)
          borderMeshes.forEach((borderMesh) => {
            dom.context.elements.set(borderMesh.name, borderMesh);
          });

          console.log(`[ElementCreation] Created borders for ${meshId}`);
        }
      }
    } catch (e) {
      console.error(
        `[ElementCreation] Error creating borders for ${meshId}:`,
        e,
      );
    }

    // Apply the element's background separately from replaced image content.
    try {
      this.materialService.applyElementMaterial(
        dom,
        render,
        mesh,
        element,
        false,
        style,
      );
      console.log(`[ElementCreation] Applied material for ${meshId}`);
    } catch (e) {
      console.error(
        `[ElementCreation] Error applying material for ${meshId}:`,
        e,
      );
    }

    // Apply transforms if present
    const transform = this.materialService.parseTransform(style?.transform);
    if (transform) {
      this.materialService.applyTransforms(mesh, transform);
    }
    console.log(`[ElementCreation] Finished transforms for ${meshId}`);

    console.log(`[Element ${element.id}] elementStyles:`, elementStyles);
    console.log(
      `[Element ${element.id}] hasHoverStyles:`,
      elementStyles?.hover !== undefined,
    );

    // Setup hover events if needed
    const hasHoverStyles = elementStyles?.hover !== undefined;
    if (element.id && hasHoverStyles) {
      console.log(`[Element ${element.id}] Setting up mouse events`);
      this.interactionService.setupMouseEvents(dom, render, mesh, element.id);
    }

    // Store element reference - use meshId so all elements are tracked
    dom.context.elements.set(meshId, mesh);
    dom.context.elementTypes.set(meshId, element.type);

    // Store dimensions for all elements (needed for child layout calculations)
    const pixelPadding = dimensions.padding;
    dom.context.elementDimensions.set(meshId, {
      width: dimensions.width,
      height: dimensions.height,
      padding: pixelPadding,
    });

    // Store hover state and handle text content only for elements with IDs
    if (element.id) {
      dom.context.hoverStates.set(element.id, false);

      // Handle text content if present
      if (element.textContent && element.textContent.trim() !== "") {
        dom.actions.handleTextContent(dom, render, element, mesh, styles);
      }
    }

    // Attach input events if it's an input element
    const foundInputElement = dom.context.inputElements.get(
      element.id || mesh.name,
    );
    if (foundInputElement && render.scene) {
      this.inputElementService.attachInputEvents(
        foundInputElement,
        render.scene,
      );
    }

    return mesh;
  }

  /**
   * Process child elements
   */
  processChildren(
    dom: BabylonDOM,
    render: BabylonRender,
    children: DOMElement[],
    parent: Mesh,
    styles: StyleRule[],
    parentElement?: DOMElement,
  ): void {
    console.log(
      `[ElementCreation] processChildren: processing ${children.length} children for ${parentElement?.id || "unknown"}`,
    );

    for (const child of children) {
      this.ancestry.setParent(child, parentElement);
    }

    // Check if parent is a list container
    const isListContainer =
      parentElement?.type === "ul" || parentElement?.type === "ol";

    // Check if parent is a flex container
    const isFlex =
      parentElement &&
      dom.actions.isFlexContainer(render, parentElement, styles, dom);
    const useInlineFlow = parentElement
      ? this.shouldUseInlineFlow(render, parentElement, children, styles)
      : false;
    console.log(
      `[ElementCreation] isFlexContainer(${parentElement?.id || parentElement?.type}): ${isFlex}, isListContainer: ${isListContainer}, inlineFlow: ${useInlineFlow}`,
    );

    if (parentElement?.type === "table") {
      console.log(
        `[ElementCreation] Processing table children for ${parentElement.id}`,
      );
      dom.actions.processTable(
        dom,
        render,
        children,
        parent,
        styles,
        parentElement,
        parent,
      );
    } else if (isListContainer && parentElement) {
      console.log(
        `[ElementCreation] Processing list children for ${parentElement.type} container`,
      );
      dom.actions.processListChildren(
        dom,
        render,
        children,
        parent,
        styles,
        parentElement.type as "ul" | "ol",
      );
    } else if (isFlex && parentElement) {
      console.log(
        `[ElementCreation] Processing flex children for ${parentElement.id}`,
      );
      dom.actions.processFlexChildren(
        dom,
        render,
        children,
        parent,
        styles,
        parentElement,
      );
    } else if (useInlineFlow && parentElement) {
      console.log(
        `[ElementCreation] Processing inline flow children for ${parentElement.id ?? parentElement.type}`,
      );
      this.layoutInlineChildren(
        dom,
        render,
        children,
        parent,
        styles,
        parentElement,
      );
    } else {
      this.layoutBlockChildren(
        dom,
        render,
        children,
        parent,
        styles,
        parentElement,
      );
    }
  }

  private shouldUseInlineFlow(
    render: BabylonRender,
    parentElement: DOMElement,
    children: DOMElement[],
    styles: StyleRule[],
  ): boolean {
    if (!children || children.length === 0) {
      return false;
    }

    const parentStyle = render.actions.style.findStyleForElement(
      parentElement,
      styles,
      undefined,
    );
    const defaultParentDisplay =
      this.styleDefaults.getElementTypeDefaults(parentElement.type)?.display ??
      "block";
    const parentDisplay = (
      parentStyle?.display ??
      defaultParentDisplay ??
      "block"
    )
      .toString()
      .toLowerCase();

    // If parent is explicitly flex or block-level formatting context that shouldn't be treated as inline flow, bail
    if (parentDisplay.includes("flex") && !parentDisplay.startsWith("inline")) {
      return false;
    }

    let inlineChildren = 0;
    let nonInlineChildren = 0;

    for (const child of children) {
      if (!child) {
        continue;
      }
      const childStyle = render.actions.style.findStyleForElement(
        child,
        styles,
        undefined,
      );
      const defaultDisplay =
        this.styleDefaults.getElementTypeDefaults(child.type)?.display ??
        "block";
      const display = (childStyle?.display ?? defaultDisplay ?? "block")
        .toString()
        .toLowerCase();

      if (display.startsWith("inline")) {
        inlineChildren++;
      } else if (display === "none") {
        continue;
      } else {
        nonInlineChildren++;
      }
    }

    return inlineChildren > 0 && nonInlineChildren === 0;
  }

  private layoutInlineChildren(
    dom: BabylonDOM,
    render: BabylonRender,
    children: DOMElement[],
    parent: Mesh,
    styles: StyleRule[],
    parentElement: DOMElement,
  ): void {
    const parentDims = dom.context.elementDimensions.get(parent.name);
    if (!parentDims) {
      console.warn(
        `[InlineLayout] Missing parent dimensions for ${parent.name}, falling back to standard flow.`,
      );
      this.layoutBlockChildren(
        dom,
        render,
        children,
        parent,
        styles,
        parentElement,
      );
      return;
    }

    const padding = parentDims.padding;
    const scaleFactor = render.actions.camera.getPixelToWorldScale();
    const parentStyle = render.actions.style.findStyleForElement(
      parentElement,
      styles,
      dom.context.elementStyles,
    ) || {
      selector: parentElement.id ? `#${parentElement.id}` : parentElement.type,
      ...this.styleDefaults.getElementTypeDefaults(parentElement.type),
    };
    const hasExplicitHeight = !!(
      parentStyle?.height && parentStyle.height !== "auto"
    );
    const parentBorder = this.borderService.parseBorderProperties(
      render,
      parentStyle,
    );

    const contentWidth = Math.max(
      0,
      parentDims.width - padding.left - padding.right,
    );
    const contentLeftX = padding.left;
    const contentRightX = contentLeftX + contentWidth;

    type InlinePlacement = {
      mesh: Mesh;
      child: DOMElement;
      width: number;
      height: number;
      margin: { top: number; right: number; bottom: number; left: number };
      x: number;
      y: number;
    };

    const placements: InlinePlacement[] = [];

    let cursorX = contentLeftX;
    let cursorY = padding.top;
    let currentLineHeight = 0;
    let hasContent = false;

    for (let index = 0; index < children.length; index++) {
      const child = children[index];
      if (!child) {
        continue;
      }

      const childStyle = render.actions.style.findStyleForElement(
        child,
        styles,
        dom.context.elementStyles,
      );
      if (childStyle?.display?.toLowerCase() === 'none') {
        console.log(
          `[InlineLayout] Skipping display:none child ${child.id ?? child.type}`,
        );
        continue;
      }

      console.log(
        `[InlineLayout] Creating inline child ${child.id ?? child.type} at index ${index}`,
      );
      const childMesh = this.createElement(dom, render, child, parent, styles);

      const hasExplicitPositioning =
        childStyle?.top !== undefined || childStyle?.left !== undefined;
      if (hasExplicitPositioning) {
        console.log(
          `[InlineLayout] Child ${child.id ?? child.type} has explicit positioning. Skipping inline positioning.`,
        );
        if (child.children?.length) {
          this.processChildren(
            dom,
            render,
            child.children,
            childMesh,
            styles,
            child,
          );
        }
        continue;
      }

      const defaultDisplay =
        this.styleDefaults.getElementTypeDefaults(child.type)?.display ??
        "inline";
      const display = (childStyle?.display ?? defaultDisplay ?? "inline")
        .toString()
        .toLowerCase();
      if (!display.startsWith("inline")) {
        console.log(
          `[InlineLayout] Encountered non-inline child ${child.id ?? child.type} (display=${display}). Falling back to block layout.`,
        );
        dom.context.elements.delete(childMesh.name);
        childMesh.dispose();
        const remainingChildren = children.slice(index);
        this.layoutBlockChildren(
          dom,
          render,
          remainingChildren,
          parent,
          styles,
          parentElement,
        );
        return;
      }

      const childDims = dom.context.elementDimensions.get(childMesh.name);
      let childWidth = childDims?.width ?? 0;
      let childHeight = childDims?.height ?? 0;

      if (!childDims) {
        const bounds = childMesh.getBoundingInfo().boundingBox;
        childWidth = (bounds.maximum.x - bounds.minimum.x) / scaleFactor;
        childHeight = (bounds.maximum.y - bounds.minimum.y) / scaleFactor;
      }

      const marginBox = this.parseMarginBox(childStyle);

      const requiredWidth = marginBox.left + childWidth + marginBox.right;
      if (hasContent && cursorX + requiredWidth > contentRightX + 0.1) {
        console.log(
          `[InlineLayout] Wrapping to new line before placing ${child.id ?? child.type}`,
        );
        cursorX = contentLeftX;
        cursorY += currentLineHeight;
        currentLineHeight = 0;
        hasContent = false;
      }

      const placementX = cursorX + marginBox.left;
      const placementY = cursorY + marginBox.top;

      placements.push({
        mesh: childMesh,
        child,
        width: childWidth,
        height: childHeight,
        margin: marginBox,
        x: placementX,
        y: placementY,
      });

      cursorX = placementX + childWidth + marginBox.right;
      currentLineHeight = Math.max(
        currentLineHeight,
        marginBox.top + childHeight + marginBox.bottom,
      );
      hasContent = true;
    }

    const contentBottom = hasContent
      ? cursorY + currentLineHeight
      : padding.top;
    const computedHeightPx = Math.max(
      padding.top + padding.bottom,
      contentBottom + padding.bottom,
    );
    const oldHeightPx = parentDims.height;

    if (
      placements.length > 0 &&
      !hasExplicitHeight &&
      Math.abs(computedHeightPx - oldHeightPx) > 0.1
    ) {
      const borderRadiusPx = this.borderService.parseBorderRadius(
        parentStyle?.borderRadius,
      );
      const borderRadiusWorld = borderRadiusPx * scaleFactor;
      const worldWidth = parentDims.width * scaleFactor;
      const worldHeight = computedHeightPx * scaleFactor;

      try {
        render.actions.mesh.updateMeshWithBorderRadius(
          parent,
          "rectangle",
          worldWidth,
          worldHeight,
          borderRadiusWorld,
          parentBorder.width,
        );
      } catch (error) {
        console.error(
          `[InlineLayout] Failed to update parent mesh geometry for ${parentElement.id}:`,
          error,
        );
      }

      const heightDeltaPx = oldHeightPx - computedHeightPx;
      if (Math.abs(heightDeltaPx) > 0.1) {
        const deltaWorld = (heightDeltaPx / 2) * scaleFactor;
        parent.position.y += deltaWorld;
      }

      parentDims.height = computedHeightPx;
      dom.context.elementDimensions.set(parent.name, {
        ...parentDims,
        height: computedHeightPx,
      });
    }

    const finalParentHeight =
      dom.context.elementDimensions.get(parent.name)?.height ??
      parentDims.height;
    const halfParentWidth = parentDims.width / 2;
    const halfParentHeight = finalParentHeight / 2;

    placements.forEach((placement) => {
      const { mesh: childMesh, width, height, x, y, margin, child } = placement;
      const childCenterX = -halfParentWidth + x + width / 2;
      const childCenterY = halfParentHeight - y - height / 2;

      render.actions.mesh.positionTextMesh(
        childMesh,
        childCenterX * scaleFactor,
        childCenterY * scaleFactor,
        childMesh.position.z,
      );

      if (child.children && child.children.length > 0) {
        this.processChildren(
          dom,
          render,
          child.children,
          childMesh,
          styles,
          child,
        );
      }
    });
  }

  private layoutBlockChildren(
    dom: BabylonDOM,
    render: BabylonRender,
    children: DOMElement[],
    parent: Mesh,
    styles: StyleRule[],
    parentElement?: DOMElement,
  ): void {
    console.log(
      `[ElementCreation] Processing standard children for ${parentElement?.id}`,
    );
    console.log(
      `[ElementCreation] Children array check: isArray=${Array.isArray(children)}, length=${children.length}`,
    );

    try {
      console.log(
        `[ElementCreation] Starting standard layout loop. Children: ${children.length}`,
      );

      let parentHeight = 0;
      let parentWidth = 0;
      let paddingTop = 0;
      let paddingLeft = 0;

      if (dom.context.elementDimensions.has(parent.name)) {
        const dims = dom.context.elementDimensions.get(parent.name)!;
        parentHeight = dims.height;
        parentWidth = dims.width;
        paddingTop = dims.padding.top;
        paddingLeft = dims.padding.left;
      } else {
        const scale = render.actions.camera.getPixelToWorldScale();
        const bounds = parent.getBoundingInfo().boundingBox;
        parentHeight = (bounds.maximum.y - bounds.minimum.y) / scale;
        parentWidth = (bounds.maximum.x - bounds.minimum.x) / scale;
        paddingTop = 0;
        paddingLeft = 0;
      }

      let cursorY = parentHeight / 2 - paddingTop;
      let previousMarginBottom = 0;
      const scaleFactor = render.actions.camera.getPixelToWorldScale();

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        console.log(
          `[ElementCreation] Loop index ${i}: child=${child ? child.id : "undefined"}`,
        );

        if (!child) {
          continue;
        }

        const resolvedStyle = render.actions.style.findStyleForElement(
          child,
          styles,
          dom.context.elementStyles,
        );
        if (resolvedStyle?.display?.toLowerCase() === 'none') {
          console.log(
            `[BlockLayout] Skipping display:none child ${child.id ?? child.type}`,
          );
          continue;
        }

        console.log(
          `[ElementCreation] Creating child ${child.type}#${child.id}`,
        );
        const childMesh = this.createElement(
          dom,
          render,
          child,
          parent,
          styles,
        );

        const isRemovedFromFlow =
          resolvedStyle?.position === "absolute" || resolvedStyle?.position === "fixed";

        if (isRemovedFromFlow) {
          console.log(
            `[ElementCreation] Skipping stacking for out-of-flow element: ${child.id || child.type}`,
          );

          if (child.children && child.children.length > 0) {
            this.processChildren(
              dom,
              render,
              child.children,
              childMesh,
              styles,
              child,
            );
          }
          continue;
        }

        let childWidth = 0;
        let childHeight = 0;
        if (dom.context.elementDimensions.has(childMesh.name)) {
          const childDimensions = dom.context.elementDimensions.get(
            childMesh.name,
          )!;
          childWidth = childDimensions.width;
          childHeight = childDimensions.height;
        } else {
          const bounds = childMesh.getBoundingInfo().boundingBox;
          childWidth = (bounds.maximum.x - bounds.minimum.x) / scaleFactor;
          childHeight = (bounds.maximum.y - bounds.minimum.y) / scaleFactor;
        }

        const childResolvedStyle = render.actions.style.findStyleForElement(
          child,
          styles,
          dom.context.elementStyles,
        );
        const marginBox = this.parseMarginBox(childResolvedStyle);
        const marginTop = marginBox.top;
        const marginBottom = marginBox.bottom;
        let childCenterX =
          -parentWidth / 2 + paddingLeft + marginBox.left + childWidth / 2;

        cursorY -= this.collapseVerticalMargins(
          previousMarginBottom,
          marginTop,
        );

        let childCenterY = cursorY - childHeight / 2;

        if (resolvedStyle?.position === "relative") {
          const fontSize = this.parseFontSize(resolvedStyle.fontSize);
          if (resolvedStyle.left !== undefined) {
            childCenterX += this.parseLengthValue(resolvedStyle.left, fontSize);
          } else if (resolvedStyle.right !== undefined) {
            childCenterX -= this.parseLengthValue(resolvedStyle.right, fontSize);
          }
          if (resolvedStyle.top !== undefined) {
            childCenterY -= this.parseLengthValue(resolvedStyle.top, fontSize);
          } else if (resolvedStyle.bottom !== undefined) {
            childCenterY += this.parseLengthValue(resolvedStyle.bottom, fontSize);
          }
        }

        render.actions.mesh.positionTextMesh(
          childMesh,
          childCenterX * scaleFactor,
          childCenterY * scaleFactor,
          childMesh.position.z,
        );

        console.log(
          `[Layout] Stacked ${child.id} at Y=${childCenterY} (Height: ${childHeight}, Margins: ${marginTop}/${marginBottom})`,
        );

        cursorY -= childHeight;
        previousMarginBottom = marginBottom;

        if (child.children && child.children.length > 0) {
          this.processChildren(
            dom,
            render,
            child.children,
            childMesh,
            styles,
            child,
          );
        }
      }
      console.log(
        `[ElementCreation] Finished processing children for ${parentElement?.id}`,
      );
    } catch (error) {
      console.error(
        `[ElementCreation] Error in children loop for ${parentElement?.id}:`,
        error,
      );
    }
  }

  private parseMarginBox(style: StyleRule | undefined): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } {
    const margin = { top: 0, right: 0, bottom: 0, left: 0 };
    const fontSize = this.parseFontSize(style?.fontSize);

    const parsedMargin = (style?.margin || "").toString().trim();
    if (parsedMargin) {
      const parts = parsedMargin.split(/\s+/);
      const [m1, m2, m3, m4] = parts;
      switch (parts.length) {
        case 1:
          margin.top =
            margin.right =
            margin.bottom =
            margin.left =
              this.parseLengthValue(m1, fontSize);
          break;
        case 2:
          margin.top = margin.bottom = this.parseLengthValue(m1, fontSize);
          margin.right = margin.left = this.parseLengthValue(m2, fontSize);
          break;
        case 3:
          margin.top = this.parseLengthValue(m1, fontSize);
          margin.right = margin.left = this.parseLengthValue(m2, fontSize);
          margin.bottom = this.parseLengthValue(m3, fontSize);
          break;
        case 4:
        default:
          margin.top = this.parseLengthValue(m1, fontSize);
          margin.right = this.parseLengthValue(m2, fontSize);
          margin.bottom = this.parseLengthValue(m3, fontSize);
          margin.left = this.parseLengthValue(m4, fontSize);
          break;
      }
    }

    if (style?.marginTop !== undefined) {
      margin.top = this.parseLengthValue(style.marginTop, fontSize);
    }
    if (style?.marginRight !== undefined) {
      margin.right = this.parseLengthValue(style.marginRight, fontSize);
    }
    if (style?.marginBottom !== undefined) {
      margin.bottom = this.parseLengthValue(style.marginBottom, fontSize);
    }
    if (style?.marginLeft !== undefined) {
      margin.left = this.parseLengthValue(style.marginLeft, fontSize);
    }

    return margin;
  }

  private collapseVerticalMargins(previous: number, current: number): number {
    if (previous >= 0 && current >= 0) {
      return Math.max(previous, current);
    }
    if (previous <= 0 && current <= 0) {
      return Math.min(previous, current);
    }
    return previous + current;
  }

  private parseFontSize(value: string | number | undefined): number {
    if (typeof value === "number") {
      return value;
    }
    const parsed = Number.parseFloat(value ?? "");
    return Number.isFinite(parsed) ? parsed : 16;
  }

  private parseLengthValue(
    value: string | number | undefined,
    fontSize = 16,
  ): number {
    if (value === undefined || value === null) {
      return 0;
    }
    if (typeof value === "number") {
      return value;
    }

    const trimmed = value.trim();
    if (trimmed.endsWith("px")) {
      return parseFloat(trimmed);
    }
    if (trimmed.endsWith("rem")) {
      return parseFloat(trimmed) * 16;
    }
    if (trimmed.endsWith("em")) {
      return parseFloat(trimmed) * fontSize;
    }
    if (trimmed.endsWith("%")) {
      // Percentages for inline margin are relative to parent's width; we can't easily evaluate here so default to 0
      return 0;
    }

    const parsed = parseFloat(trimmed);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
