import { Injectable } from "@angular/core";
import { BabylonDOM } from "../interfaces/dom.types";
import { BabylonRender, CameraActions } from "../interfaces/render.types";
import * as BABYLON from "@babylonjs/core";
import {
  Mesh,
  ActionManager,
  ExecuteCodeAction,
  Observer,
  PointerInfo,
  Vector3,
  Color3,
} from "@babylonjs/core";
import { PointerInteractionService } from "../interaction/pointer-interaction.service";
import { StyleDefaultsService } from "../style-defaults.service";
import { DOMElement } from "../../../types/dom-element";
import { StyleRule } from "../../../types/style-rule";
import { TransformData } from "../../../types/transform-data";
import {
  ELEMENT_BORDER_Z_OFFSET,
  SELECT_BORDER_Z_OFFSET,
} from "../render-depth.constants";
import { parseBoxShadow } from "./box-shadow";
import { cssTranslationToRenderOffset, parseCssTransform } from "./css-transform";

/**
 * Service responsible for element interaction (mouse events, hover, etc.)
 * Fully restored from old implementation with all hover functionality
 */
@Injectable({
  providedIn: "root",
})
export class ElementInteractionService {
  private pointerObserver: Observer<PointerInfo> | null = null;

  constructor(
    private pointerInteractionService: PointerInteractionService,
    private styleDefaults: StyleDefaultsService,
  ) {}

  /**
   * Ensure the global pointer observer is set up
   */
  ensurePointerObserver(render: BabylonRender): void {
    if (this.pointerObserver || !render.scene) {
      return; // Already set up or no scene
    }

    // Set up the global pointer observer to handle text selection
    this.pointerObserver = render.scene.onPointerObservable.add(
      (pointerInfo: PointerInfo) => {
        switch (pointerInfo.type) {
          case BABYLON.PointerEventTypes.POINTERDOWN:
            this.pointerInteractionService.handlePointerDown(
              pointerInfo,
              render,
            );
            break;
          case BABYLON.PointerEventTypes.POINTERMOVE:
            this.pointerInteractionService.handlePointerMove(
              pointerInfo,
              render,
            );
            break;
          case BABYLON.PointerEventTypes.POINTERUP:
            this.pointerInteractionService.handlePointerUp(pointerInfo, render);
            break;
        }

        // Handle pointer out events
        const pointerEvent = pointerInfo.event as
          | PointerEvent
          | MouseEvent
          | null
          | undefined;
        if (
          pointerEvent &&
          (pointerEvent.type === "pointerout" ||
            pointerEvent.type === "pointerleave")
        ) {
          this.pointerInteractionService.handlePointerOut();
        }
      },
    );
  }

  syncShadow(
    dom: BabylonDOM,
    render: BabylonRender,
    elementId: string,
    style: StyleRule,
    mesh: Mesh,
    parent: Mesh,
    dimensions: { width: number; height: number },
  ): void {
    this.updateShadowMesh(
      dom,
      render,
      elementId,
      style,
      parent,
      dimensions,
      mesh.position.z,
      this.parseBorderRadius(style.borderRadius),
      this.parsePolygonType(style.polygonType) || "rectangle",
      this.parseTransform(style.transform) || undefined,
    );
  }

  /**
   * Setup mouse events (hover) for an element
   * FULLY RESTORED from old implementation with all hover logic
   */
  setupMouseEvents(
    dom: BabylonDOM,
    render: BabylonRender,
    mesh: Mesh,
    elementId: string,
  ): void {
    if (!render.scene) {
      throw new Error("Scene not initialized");
    }

    mesh.actionManager = new ActionManager(render.scene);

    mesh.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        // Always get the latest mesh reference
        const mainMesh = dom.context.elements.get(elementId);
        if (!mainMesh) return;
        const elementType = dom.context.elementTypes.get(elementId) || "div";
        const element = { id: elementId, type: elementType } as DOMElement;

        // Create base merged style (without hover) for applyElementMaterial to handle hover merging
        const baseMergedStyle = this.createHoverMergedStyle(
          dom,
          elementId,
          false,
        );

        // Get the hover-merged style for geometry properties
        const elementStyles = dom.context.elementStyles.get(elementId);
        const hoverMergedStyle = elementStyles?.hover
          ? { ...baseMergedStyle, ...elementStyles.hover }
          : baseMergedStyle;





        // Check if we need to recreate geometry (border radius or polygon type changes)
        const normalRadius = this.parseBorderRadius(
          baseMergedStyle?.borderRadius,
        );
        const hoverRadius = this.parseBorderRadius(
          hoverMergedStyle?.borderRadius,
        );
        const normalPolygonType =
          this.parsePolygonType(baseMergedStyle?.polygonType) || "rectangle";
        const hoverPolygonType =
          this.parsePolygonType(hoverMergedStyle?.polygonType) || "rectangle";

        const needsGeometryUpdate =
          normalRadius !== hoverRadius ||
          normalPolygonType !== hoverPolygonType;






        const safeHoverRadius = isNaN(hoverRadius) ? 0 : hoverRadius;
        const dimensions = dom.context.elementDimensions.get(elementId);
        const renderedSize = render.actions.camera.projectCssSize({
          width: dimensions?.width ?? 0,
          height: dimensions?.height ?? 0,
        });
        const worldWidth = renderedSize.width;
        const worldHeight = renderedSize.height;
        const worldBorderRadius = render.actions.camera.projectCssLength(safeHoverRadius);
        const polygonType = hoverPolygonType;

        if (dimensions && needsGeometryUpdate) {
          // Update mesh geometry for hover border radius
          const vertexData = render.actions.mesh.generatePolygonVertexData(
            polygonType,
            worldWidth,
            worldHeight,
            worldBorderRadius,
          );
          vertexData.applyToMesh(mainMesh, true);

          // Update the main mesh's bounding info to ensure proper rendering
          mainMesh.refreshBoundingInfo();

          const singleBorderMesh = dom.context.elements.get(
            `${elementId}-border_border_frame`,
          );
          if (singleBorderMesh) {
            singleBorderMesh.dispose();
            dom.context.elements.delete(`${elementId}-border_border_frame`);

          }

          // Remove up to 4 rectangular border meshes
          for (let i = 0; i < 4; i++) {
            const borderMesh = dom.context.elements.get(
              `${elementId}-border-${i}`,
            );
            if (borderMesh) {
              borderMesh.dispose();
              dom.context.elements.delete(`${elementId}-border-${i}`);

            }

            // Also check for named rectangular borders
            const borderNames = ["-top", "-bottom", "-left", "-right"];
            if (i < borderNames.length) {
              const namedBorderMesh = dom.context.elements.get(
                `${elementId}-border${borderNames[i]}`,
              );
              if (namedBorderMesh) {
                namedBorderMesh.dispose();
                dom.context.elements.delete(
                  `${elementId}-border${borderNames[i]}`,
                );

              }
            }
          }

          // Create new border meshes for hover




          const borderWidth = this.parseBorderWidth(
            render,
            hoverMergedStyle?.borderWidth,
          );
          const colorData = render.actions.style.parseBackgroundColor(
            hoverMergedStyle?.borderColor ?? "#000000",
          );
          const borderColor =
            colorData?.type === "color" ? colorData.color : undefined;





          // Use polygon border for proper rounded corner support
          const borderMeshes = render.actions.mesh.createPolygonBorder(
            `${elementId}-border`,
            polygonType,
            worldWidth,
            worldHeight,
            borderWidth,
            worldBorderRadius,
          );

          // Parent all border frames to main mesh BEFORE positioning for correct transform inheritance
          const borderParent =
            mainMesh.parent && mainMesh.parent instanceof Mesh
              ? mainMesh.parent
              : mainMesh;
          borderMeshes.forEach((borderMesh) => {
            render.actions.mesh.parentTextMesh(borderMesh, borderParent);
          });

          // Position borders at the same world position as mainMesh
          // Since borders are now parented to the same parent as mainMesh, they need absolute positioning
          const worldPos = mainMesh.position;
          render.actions.mesh.positionBorderFrames(
            borderMeshes,
            worldPos.x, // Use mainMesh's position X
            worldPos.y, // Use mainMesh's position Y
            worldPos.z + 1.0, // Z position above the element
            worldWidth,
            worldHeight,
            borderWidth,
          );

          const borderOpacity = render.actions.style.parseOpacity(
            hoverMergedStyle.opacity,
          );
          // ALWAYS create a NEW material for hover to ensure color updates
          const materialName = `${elementId}-hover-border-material-${Date.now()}`;
          let borderMaterial;
          if (!borderColor) {
            borderMaterial = render.actions.mesh.createMaterial(
              materialName,
              new Color3(0, 0, 0),
              0,
            );
          } else {
            borderMaterial = render.actions.mesh.createMaterial(
              materialName,
              borderColor,
              colorData &&
                colorData.type === "color" &&
                colorData.alpha !== undefined
                ? colorData.alpha
                : borderOpacity,
            );
          }

          borderMeshes.forEach((borderMesh, index) => {
            borderMesh.material = borderMaterial;


            // Geometry replacement invalidates Babylon's cached paint bounds.
            borderMesh.refreshBoundingInfo();
            // Interaction borders are transient paint and should not disappear
            // because of a stale renderer-side frustum bound.
            borderMesh.alwaysSelectAsActiveMesh = true;
            // Removed zOffset to rely on physical separation
            // Store border meshes with their actual names
            if (borderMeshes.length === 1) {
              // Single polygon border - store with actual mesh name
              dom.context.elements.set(
                `${elementId}-border_border_frame`,
                borderMesh,
              );

            } else {
              // Multiple rectangular borders
              dom.context.elements.set(
                `${elementId}-border-${index}`,
                borderMesh,
              );

            }
          });

          // Calculate worldBorderRadius and polygonType for shadow
          const shadowBorderRadius = safeHoverRadius;
          const shadowPolygonType = hoverPolygonType;
          // Ensure parent is a Mesh
          const shadowParent =
            mainMesh.parent && mainMesh.parent instanceof Mesh
              ? mainMesh.parent
              : mesh;
          // Add or update shadow mesh for hover
          this.updateShadowMesh(
            dom,
            render,
            elementId,
            hoverMergedStyle,
            shadowParent,
            dimensions,
            mainMesh.position.z,
            shadowBorderRadius,
            shadowPolygonType,
            this.parseTransform(hoverMergedStyle.transform) || undefined,
          );
        }

        dom.context.hoverStates.set(elementId, true);
        mainMesh.metadata = {
          ...(mainMesh.metadata || {}),
          cursor: hoverMergedStyle.cursor,
        };
        const hoverCanvas = render.scene?.getEngine().getRenderingCanvas();
        if (hoverCanvas) {
          hoverCanvas.style.cursor = hoverMergedStyle.cursor ?? 'default';
        }
        this.applyElementMaterial(
          dom,
          render,
          mainMesh,
          element,
          true,
          hoverMergedStyle,
        );

        // Apply transforms smoothly without recreating geometry
        const transform = this.parseTransform(hoverMergedStyle?.transform);
        if (transform) {
          this.applyTransformsSmooth(mainMesh, transform, 150, render.actions.camera); // 150ms smooth animation

          // For borders, we want them to inherit position but not scaling
          // Handle single polygon border
          const singleBorderMesh = dom.context.elements.get(
            `${elementId}-border_border_frame`,
          );
          if (singleBorderMesh) {
            // Apply only translation and rotation, not scaling
            const borderTransform = { ...transform };
            borderTransform.scale = { x: 1, y: 1, z: 1 }; // Reset scaling for borders
            this.applyTransformsSmooth(singleBorderMesh, borderTransform, 150, render.actions.camera);
          }

          // Handle up to 4 rectangular borders
          for (let i = 0; i < 4; i++) {
            const borderMesh = dom.context.elements.get(
              `${elementId}-border-${i}`,
            );
            if (borderMesh) {
              // Apply only translation and rotation, not scaling
              const borderTransform = { ...transform };
              borderTransform.scale = { x: 1, y: 1, z: 1 }; // Reset scaling for borders
              this.applyTransformsSmooth(borderMesh, borderTransform, 150, render.actions.camera);
            }

            // Also check for named rectangular borders
            const borderNames = ["-top", "-bottom", "-left", "-right"];
            if (i < borderNames.length) {
              const namedBorderMesh = dom.context.elements.get(
                `${elementId}-border${borderNames[i]}`,
              );
              if (namedBorderMesh) {
                // Apply only translation and rotation, not scaling
                const borderTransform = { ...transform };
                borderTransform.scale = { x: 1, y: 1, z: 1 }; // Reset scaling for borders
                this.applyTransformsSmooth(
                  namedBorderMesh,
                  borderTransform,
                  150,
                  render.actions.camera,
                );
              }
            }
          }

          // Shadow automatically inherits transforms through parenting - no manual intervention needed
          const shadowMesh = dom.context.elements.get(`${elementId}-shadow`);
          if (shadowMesh) {


          }
        }

        // Update shadow for hover state even if geometry doesn't change
        if (dimensions && !needsGeometryUpdate) {
          const shadowBorderRadius = safeHoverRadius;
          const shadowPolygonType = hoverPolygonType;
          const shadowParent =
            mainMesh.parent && mainMesh.parent instanceof Mesh
              ? mainMesh.parent
              : mesh;
          this.updateShadowMesh(
            dom,
            render,
            elementId,
            hoverMergedStyle,
            shadowParent,
            dimensions,
            mainMesh.position.z,
            shadowBorderRadius,
            shadowPolygonType,
            this.parseTransform(hoverMergedStyle.transform) || undefined,
          );
        }

        // After all style/geometry updates, log the mesh rotation and transform
        if (hoverMergedStyle.transform) {

        }

      }),
    );

    mesh.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {

        // Always get the latest mesh reference
        const mainMesh = dom.context.elements.get(elementId);
        if (!mainMesh) {

          return;
        }
        const elementType = dom.context.elementTypes.get(elementId) || "div";
        const element = { id: elementId, type: elementType } as DOMElement;
        const elementStyles = dom.context.elementStyles.get(elementId);
        const typeDefaults = this.styleDefaults.getElementTypeDefaults(
          element.type,
        );
        const normalStyle = (elementStyles?.normal || {}) as StyleRule;
        const mergedStyle: StyleRule = {
          ...typeDefaults,
          ...normalStyle,
          selector: `#${elementId}`,
        };




        // Check if we need to recreate geometry (border radius or polygon type changes)
        const hoverMergedStyle = elementStyles?.hover
          ? { ...mergedStyle, ...elementStyles.hover }
          : mergedStyle;
        const normalRadius = this.parseBorderRadius(mergedStyle?.borderRadius);
        const hoverRadius = this.parseBorderRadius(
          hoverMergedStyle?.borderRadius,
        );
        const normalPolygonType =
          this.parsePolygonType(mergedStyle?.polygonType) || "rectangle";
        const hoverPolygonType =
          this.parsePolygonType(hoverMergedStyle?.polygonType) || "rectangle";

        const needsGeometryUpdate =
          normalRadius !== hoverRadius ||
          normalPolygonType !== hoverPolygonType;

        const safeNormalRadius = isNaN(normalRadius) ? 0 : normalRadius;
        const dimensions = dom.context.elementDimensions.get(elementId);
        if (dimensions && needsGeometryUpdate) {
          const worldBorderRadius = render.actions.camera.projectCssLength(safeNormalRadius);
          const renderedSize = render.actions.camera.projectCssSize(dimensions);
          const worldWidth = renderedSize.width;
          const worldHeight = renderedSize.height;
          const polygonType = normalPolygonType;

          // Update mesh geometry for normal border radius
          const vertexData = render.actions.mesh.generatePolygonVertexData(
            polygonType,
            worldWidth,
            worldHeight,
            worldBorderRadius,
          );
          vertexData.applyToMesh(mainMesh, true);

          // Update the main mesh's bounding info to ensure proper rendering
          mainMesh.refreshBoundingInfo();

          // Remove old border meshes
          // Handle both single polygon border and 4 rectangular borders
          const singleBorderMesh = dom.context.elements.get(
            `${elementId}-border_border_frame`,
          );
          if (singleBorderMesh) {
            singleBorderMesh.dispose();
            dom.context.elements.delete(`${elementId}-border_border_frame`);

          }

          // Remove up to 4 rectangular border meshes
          for (let i = 0; i < 4; i++) {
            const borderMesh = dom.context.elements.get(
              `${elementId}-border-${i}`,
            );
            if (borderMesh) {
              borderMesh.dispose();
              dom.context.elements.delete(`${elementId}-border-${i}`);

            }

            // Also check for named rectangular borders
            const borderNames = ["-top", "-bottom", "-left", "-right"];
            if (i < borderNames.length) {
              const namedBorderMesh = dom.context.elements.get(
                `${elementId}-border${borderNames[i]}`,
              );
              if (namedBorderMesh) {
                namedBorderMesh.dispose();
                dom.context.elements.delete(
                  `${elementId}-border${borderNames[i]}`,
                );

              }
            }
          }

          // Create new border meshes for normal
          const borderWidth = this.parseBorderWidth(
            render,
            mergedStyle.borderWidth,
          );
          const colorData = render.actions.style.parseBackgroundColor(
            mergedStyle.borderColor ?? "#000000",
          );
          const borderColor =
            colorData?.type === "color" ? colorData.color : undefined;


          // Use polygon border for proper rounded corner support
          const borderMeshes = render.actions.mesh.createPolygonBorder(
            `${elementId}-border`,
            polygonType,
            worldWidth,
            worldHeight,
            borderWidth,
            worldBorderRadius,
          );

          // Parent all border frames to main mesh BEFORE positioning for correct transform inheritance
          borderMeshes.forEach((borderMesh) => {
            render.actions.mesh.parentTextMesh(borderMesh, mainMesh);
          });

          // Position borders correctly relative to the main mesh (local coordinates)
          // Since borders are parented to mainMesh, position should be 0,0
          render.actions.mesh.positionBorderFrames(
            borderMeshes,
            0, // Center X (local)
            0, // Center Y (local)
            element.type === "select"
              ? SELECT_BORDER_Z_OFFSET
              : ELEMENT_BORDER_Z_OFFSET,
            worldWidth,
            worldHeight,
            borderWidth,
          );
          const borderOpacity = render.actions.style.parseOpacity(
            mergedStyle.opacity,
          );
          let borderMaterial;
          if (!borderColor) {
            // Transparent: create a fully transparent material, do not set color
            borderMaterial = render.actions.mesh.createMaterial(
              `${elementId}-border-material`,
              new Color3(0, 0, 0),
              0, // fully transparent
            );
          } else {
            borderMaterial = render.actions.mesh.createMaterial(
              `${elementId}-border-material`,
              borderColor,
              colorData &&
                colorData.type === "color" &&
                colorData.alpha !== undefined
                ? colorData.alpha
                : borderOpacity,
            );
          }

          borderMeshes.forEach((borderMesh, index) => {
            borderMesh.material = borderMaterial;
            // Geometry replacement invalidates Babylon's cached paint bounds.
            borderMesh.refreshBoundingInfo();
            // Interaction borders are transient paint and should not disappear
            // because of a stale renderer-side frustum bound.
            borderMesh.alwaysSelectAsActiveMesh = true;
            // Removed zOffset to rely on physical separation
            // Store border meshes with their actual names
            if (borderMeshes.length === 1) {
              // Single polygon border - store with actual mesh name
              dom.context.elements.set(
                `${elementId}-border_border_frame`,
                borderMesh,
              );

            } else {
              // Multiple rectangular borders
              dom.context.elements.set(
                `${elementId}-border-${index}`,
                borderMesh,
              );

            }
          });

          // Calculate worldBorderRadius and polygonType for shadow
          const shadowBorderRadius = safeNormalRadius;
          const shadowPolygonType = normalPolygonType;
          // Ensure parent is a Mesh
          const shadowParent =
            mainMesh.parent && mainMesh.parent instanceof Mesh
              ? mainMesh.parent
              : mesh;
          // Add or update shadow mesh for normal
          this.updateShadowMesh(
            dom,
            render,
            elementId,
            mergedStyle,
            shadowParent,
            dimensions,
            mainMesh.position.z,
            shadowBorderRadius,
            shadowPolygonType,
            this.parseTransform(mergedStyle.transform) || undefined,
          );
        }

        dom.context.hoverStates.set(elementId, false);
        mainMesh.metadata = {
          ...(mainMesh.metadata || {}),
          cursor: mergedStyle.cursor,
        };
        const normalCanvas = render.scene?.getEngine().getRenderingCanvas();
        if (normalCanvas) {
          normalCanvas.style.cursor = mergedStyle.cursor ?? 'default';
        }
        this.applyElementMaterial(
          dom,
          render,
          mainMesh,
          element,
          false,
          mergedStyle,
        );

        // Apply transforms smoothly without recreating geometry
        const transform = this.parseTransform(mergedStyle?.transform);
        if (transform) {
          this.applyTransformsSmooth(mainMesh, transform, 150, render.actions.camera); // 150ms smooth animation
          // Also apply to all border meshes and parent them to the main mesh
          // Handle single polygon border
          const singleBorderMesh = dom.context.elements.get(
            `${elementId}-border_border_frame`,
          );
          if (singleBorderMesh) {
            this.applyTransformsSmooth(singleBorderMesh, transform, 150, render.actions.camera);
            // Parent border mesh to main mesh for transform inheritance
            render.actions.mesh.parentTextMesh(singleBorderMesh, mainMesh);
          }

          // Handle up to 4 rectangular borders
          for (let i = 0; i < 4; i++) {
            const borderMesh = dom.context.elements.get(
              `${elementId}-border-${i}`,
            );
            if (borderMesh) {
              this.applyTransformsSmooth(borderMesh, transform, 150, render.actions.camera);
              // Parent border mesh to main mesh for transform inheritance
              render.actions.mesh.parentTextMesh(borderMesh, mainMesh);
            }

            // Also check for named rectangular borders
            const borderNames = ["-top", "-bottom", "-left", "-right"];
            if (i < borderNames.length) {
              const namedBorderMesh = dom.context.elements.get(
                `${elementId}-border${borderNames[i]}`,
              );
              if (namedBorderMesh) {
                this.applyTransformsSmooth(namedBorderMesh, transform, 150, render.actions.camera);
                // Parent border mesh to main mesh for transform inheritance
                render.actions.mesh.parentTextMesh(namedBorderMesh, mainMesh);
              }
            }
          }

          // Shadow automatically inherits transforms through parenting - no manual intervention needed
          const shadowMesh = dom.context.elements.get(`${elementId}-shadow`);
          if (shadowMesh) {


          }
        } else {
          // Smoothly reset transforms to default values
          const resetTransform: TransformData = {
            translate: { x: 0, y: 0, z: 0 },
            rotate: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          };

          this.applyTransformsSmooth(mainMesh, resetTransform, 150, render.actions.camera);

          // Handle single polygon border
          const singleBorderMesh = dom.context.elements.get(
            `${elementId}-border_border_frame`,
          );
          if (singleBorderMesh) {
            this.applyTransformsSmooth(singleBorderMesh, resetTransform, 150, render.actions.camera);
          }

          // Handle up to 4 rectangular borders
          for (let i = 0; i < 4; i++) {
            const borderMesh = dom.context.elements.get(
              `${elementId}-border-${i}`,
            );
            if (borderMesh) {
              this.applyTransformsSmooth(borderMesh, resetTransform, 150, render.actions.camera);
            }

            // Also check for named rectangular borders
            const borderNames = ["-top", "-bottom", "-left", "-right"];
            if (i < borderNames.length) {
              const namedBorderMesh = dom.context.elements.get(
                `${elementId}-border${borderNames[i]}`,
              );
              if (namedBorderMesh) {
                this.applyTransformsSmooth(
                  namedBorderMesh,
                  resetTransform,
                  150,
                  render.actions.camera,
                );
              }
            }
          }

          // Shadow automatically resets transforms through parenting - no manual intervention needed
          const shadowMesh = dom.context.elements.get(`${elementId}-shadow`);
          if (shadowMesh) {




          }
        }

        // Update shadow for normal state even if geometry doesn't change
        if (dimensions && !needsGeometryUpdate) {
          const shadowBorderRadius = safeNormalRadius;
          const shadowPolygonType = normalPolygonType;
          const shadowParent =
            mainMesh.parent && mainMesh.parent instanceof Mesh
              ? mainMesh.parent
              : mesh;
          this.updateShadowMesh(
            dom,
            render,
            elementId,
            mergedStyle,
            shadowParent,
            dimensions,
            mainMesh.position.z,
            shadowBorderRadius,
            shadowPolygonType,
            this.parseTransform(mergedStyle.transform) || undefined,
          );
        }
      }),
    );
  }

  // ============================================================
  // HELPER METHODS - All restored from old implementation
  // ============================================================

  /**
   * Create hover merged style
   * Merges type defaults, normal styles, and optionally hover styles
   */
  private createHoverMergedStyle(
    dom: BabylonDOM,
    elementId: string,
    isHovered: boolean,
  ): StyleRule {
    const elementType = dom.context.elementTypes.get(elementId) || "div";
    const elementStyles = dom.context.elementStyles.get(elementId);
    const typeDefaults = this.styleDefaults.getElementTypeDefaults(elementType);
    const normalStyle = (elementStyles?.normal || {}) as StyleRule;

    // Create base merged style using the same method as initial element creation
    const baseMergedStyle: StyleRule = StyleDefaultsService.mergeStyles(
      { selector: `#${elementId}`, ...typeDefaults },
      normalStyle,
    ) as StyleRule;

    // If hovering, merge hover styles on top
    if (isHovered && elementStyles?.hover) {
      return { ...baseMergedStyle, ...elementStyles.hover };
    }

    return baseMergedStyle;
  }

  /**
   * Apply element material based on styles and hover state
   */
  private applyElementMaterial(
    dom: BabylonDOM,
    render: BabylonRender,
    mesh: Mesh,
    element: DOMElement,
    isHovered: boolean,
    style: StyleRule,
  ): void {
    // Get opacity
    const opacity = render.actions.style.parseOpacity(style?.opacity);

    if (style?.background) {
      const backgroundData = render.actions.style.parseBackgroundColor(
        style.background,
      );

      if (backgroundData?.type === "gradient") {
        const dims = dom.context.elementDimensions.get(mesh.name);
        const width = dims?.width ?? 0;
        const height = dims?.height ?? 0;
        const material = render.actions.mesh.createGradientMaterial(
          `${element.id || mesh.name}-hover-gradient`,
          backgroundData.gradient,
          opacity,
          width,
          height,
        );
        mesh.material = material;
      } else if (backgroundData?.type === "color") {
        const finalOpacity =
          backgroundData.alpha !== undefined ? backgroundData.alpha : opacity;
        const material = render.actions.mesh.createMaterial(
          `${element.id || mesh.name}-material`,
          backgroundData.color,
          finalOpacity,
        );
        mesh.material = material;
      }
    }
  }

  /**
   * Apply transforms smoothly using animations
   * Duration in milliseconds (default 200ms)
   */
  private applyTransformsSmooth(
    mesh: Mesh,
    transforms: TransformData,
    duration: number = 200,
    projection: CameraActions,
  ): void {


    // Store initial values
    const initialPosition = mesh.position.clone();
    const initialRotation = mesh.rotation.clone();
    const initialScaling = mesh.scaling.clone();

    // Store the mesh's original position (before any transforms) if not already stored
    if (!mesh.metadata) {
      mesh.metadata = {};
    }
    if (!mesh.metadata.originalPosition) {
      mesh.metadata.originalPosition = initialPosition.clone();
    }
    if (!mesh.metadata.originalRotation) {
      mesh.metadata.originalRotation = new Vector3(0, 0, 0);
    }
    if (!mesh.metadata.originalScaling) {
      mesh.metadata.originalScaling = new Vector3(1, 1, 1);
    }

    // Calculate target values based on original position + transform
    const offset = cssTranslationToRenderOffset(transforms, projection);
    const targetPosition = new Vector3(
      mesh.metadata.originalPosition.x + offset.x,
      mesh.metadata.originalPosition.y + offset.y,
      mesh.metadata.originalPosition.z + offset.z,
    );
    const targetRotation = new Vector3(
      transforms.rotate.x,
      transforms.rotate.y,
      transforms.rotate.z,
    );
    const targetScaling = new Vector3(
      transforms.scale.x,
      transforms.scale.y,
      transforms.scale.z,
    );

    // Simple linear interpolation animation
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out function for smoother animation
      const easeOut = 1 - Math.pow(1 - progress, 3);

      // Interpolate position
      mesh.position = Vector3.Lerp(initialPosition, targetPosition, easeOut);

      // Interpolate rotation
      mesh.rotation = Vector3.Lerp(initialRotation, targetRotation, easeOut);

      // Interpolate scaling
      mesh.scaling = Vector3.Lerp(initialScaling, targetScaling, easeOut);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {

      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Parse border radius from CSS borderRadius property
   */
  private parseBorderRadius(borderRadius: string | undefined): number {
    if (!borderRadius) {
      return 0;
    }

    // Handle pixel values
    if (typeof borderRadius === "string" && borderRadius.endsWith("px")) {
      return parseFloat(borderRadius);
    }

    // Handle percentage values (will need parent context for proper calculation)
    if (typeof borderRadius === "string" && borderRadius.endsWith("%")) {
      // For now, return 0 - percentage border radius needs parent dimensions
      return 0;
    }

    // Handle numeric values
    return parseFloat(borderRadius) || 0;
  }

  /**
   * Parse polygon type from CSS polygonType property
   */
  private parsePolygonType(polygonType: string | undefined): string {
    if (!polygonType) {
      return "rectangle";
    }

    const validTypes = [
      "rectangle",
      "circle",
      "triangle",
      "pentagon",
      "hexagon",
      "octagon",
    ];
    return validTypes.includes(polygonType) ? polygonType : "rectangle";
  }

  /**
   * Parse border width and convert to world units
   */
  private parseBorderWidth(render: BabylonRender, width?: string): number {
    if (!width) return 0;
    // Handle "2px", "0.1", etc. - convert to world units
    const numericValue = parseFloat(width.replace("px", ""));
    // Use camera-calculated scaling factor for accurate conversion
    return render.actions.camera.projectCssLength(numericValue);
  }

  /**
   * Parse CSS transform property into TransformData
   */
  private parseTransform(
    transformString: string | undefined,
  ): TransformData | null {
    return parseCssTransform(transformString);
  }

  /**
   * Helper to parse RGBA color and multiply alpha
   */
  private getBoxShadowColorWithOpacity(
    color: string,
    styleOpacity: number,
  ): string {
    // Try to parse rgba/hsla or hex
    const rgbaRegex = /rgba?\(([^)]+)\)/;
    const match = color.match(rgbaRegex);
    if (match) {
      const parts = match[1].split(",").map((p) => p.trim());
      let r = parseFloat(parts[0]);
      let g = parseFloat(parts[1]);
      let b = parseFloat(parts[2]);
      let a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
      a = Math.max(0, Math.min(1, a * styleOpacity));
      return `rgba(${r},${g},${b},${a})`;
    }
    // Hex or named color fallback: just return as is (no alpha multiplication)
    return color;
  }

  /**
   * Helper to create or update the shadow mesh for an element
   * Intelligently only recreates when parameters change
   */
  private updateShadowMesh(
    dom: BabylonDOM,
    render: BabylonRender,
    elementId: string,
    style: StyleRule,
    parent: Mesh,
    dimensions: any,
    zPosition: number,
    borderRadius: number,
    polygonType: string,
    transform?: TransformData,
  ) {


    const boxShadow = parseBoxShadow(style?.boxShadow);
    const existingShadow = dom.context.elements.get(`${elementId}-shadow`);



    // Check if this is initial creation or hover update
    const isHoverState = dom.context.hoverStates.get(elementId) || false;


    // If no box shadow is needed, remove existing shadow
    if (boxShadow.length === 0) {
      if (existingShadow) {
        existingShadow.dispose();
        dom.context.elements.delete(`${elementId}-shadow`);

      } else {

      }
      return;
    }

    const renderedSize = render.actions.camera.projectCssSize(dimensions);
    const worldWidth = renderedSize.width;
    const worldHeight = renderedSize.height;
    const worldBorderRadius = render.actions.camera.projectCssLength(borderRadius);
    const styleOpacity = render.actions.style.parseOpacity(style.opacity);
    const scaledLayers = boxShadow.map((layer) => ({
      offsetX: render.actions.camera.projectCssLength(layer.offsetX),
      offsetY: render.actions.camera.projectCssLength(layer.offsetY),
      blur: render.actions.camera.projectCssLength(layer.blur),
      spread: render.actions.camera.projectCssLength(layer.spread),
      color: this.getBoxShadowColorWithOpacity(layer.color, styleOpacity),
    }));
    const layerSignature = JSON.stringify(scaledLayers);



    // Check if we can reuse existing shadow
    let needsRecreation = !existingShadow;

    if (
      existingShadow &&
      existingShadow.metadata &&
      existingShadow.metadata.shadowParams
    ) {
      const lastParams = existingShadow.metadata.shadowParams;

      // More precise parameter comparison
      const widthChanged = Math.abs(lastParams.width - worldWidth) > 0.001;
      const heightChanged = Math.abs(lastParams.height - worldHeight) > 0.001;
      const layersChanged = lastParams.layerSignature !== layerSignature;
      const radiusChanged =
        Math.abs(lastParams.borderRadius - worldBorderRadius) > 0.001;
      const typeChanged = lastParams.polygonType !== polygonType;

      const paramChanged =
        widthChanged ||
        heightChanged ||
        layersChanged ||
        radiusChanged ||
        typeChanged;
      needsRecreation = paramChanged;

      if (!paramChanged) {

      } else {

      }
    } else {

    }

    // Remove old shadow if recreating
    if (needsRecreation && existingShadow) {
      existingShadow.dispose();
      dom.context.elements.delete(`${elementId}-shadow`);

    }

    // Get the element mesh for parenting and positioning
    const elementMesh = dom.context.elements.get(elementId);
    if (!elementMesh) {
      console.warn(
        `RYPT Could not find element mesh for shadow positioning: ${elementId}`,
      );
      return;
    }

    let shadowMesh: Mesh;

    if (needsRecreation) {
      // Create new shadow
      shadowMesh = render.actions.mesh.createShadow(
        `${elementId}-shadow`,
        worldWidth,
        worldHeight,
        scaledLayers,
        polygonType,
        worldBorderRadius,
      );

      // Store shadow parameters for future comparison
      shadowMesh.metadata = {
        shadowParams: {
          width: worldWidth,
          height: worldHeight,
          layerSignature,
          borderRadius: worldBorderRadius,
          polygonType: polygonType,
        },
      };

      // Shadow paint belongs to the element's local coordinate system. Keeping
      // it attached to the owner means later flex/block/positioning passes move
      // both together instead of leaving the shadow at the provisional
      // creation position.
      render.actions.mesh.parentTextMesh(shadowMesh, elementMesh);
      dom.context.elements.set(`${elementId}-shadow`, shadowMesh);


    } else {
      shadowMesh = existingShadow!;
    }

    // Layer offsets are already local to the shadow root. The root itself must
    // stay at the owner's origin; copying the owner's local position here would
    // apply that placement twice once parented.
    if (needsRecreation) {
      shadowMesh.position.set(0, 0, ELEMENT_BORDER_Z_OFFSET / 2);
    }

    // Parenting keeps subsequent layout placement and transforms synchronized.

  }
}
