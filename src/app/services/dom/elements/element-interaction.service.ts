import { Injectable } from '@angular/core';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import * as BABYLON from '@babylonjs/core';
import { Mesh, ActionManager, ExecuteCodeAction, Observer, PointerInfo, Vector3, Color3 } from '@babylonjs/core';
import { PointerInteractionService } from '../interaction/pointer-interaction.service';
import { StyleDefaultsService } from '../style-defaults.service';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { TransformData } from '../../../types/transform-data';

/**
 * Service responsible for element interaction (mouse events, hover, etc.)
 * Fully restored from old implementation with all hover functionality
 */
@Injectable({
    providedIn: 'root'
})
export class ElementInteractionService {
    private pointerObserver: Observer<PointerInfo> | null = null;

    constructor(
        private pointerInteractionService: PointerInteractionService,
        private styleDefaults: StyleDefaultsService
    ) { }

    /**
     * Ensure the global pointer observer is set up
     */
    ensurePointerObserver(render: BabylonRender): void {
        if (this.pointerObserver || !render.scene) {
            return; // Already set up or no scene
        }

        // Set up the global pointer observer to handle text selection
        this.pointerObserver = render.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    this.pointerInteractionService.handlePointerDown(pointerInfo, render);
                    break;
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    this.pointerInteractionService.handlePointerMove(pointerInfo, render);
                    break;
                case BABYLON.PointerEventTypes.POINTERUP:
                    this.pointerInteractionService.handlePointerUp(pointerInfo, render);
                    break;
            }

            // Handle pointer out events
            const pointerEvent = pointerInfo.event as PointerEvent | MouseEvent | null | undefined;
            if (pointerEvent && (pointerEvent.type === 'pointerout' || pointerEvent.type === 'pointerleave')) {
                this.pointerInteractionService.handlePointerOut();
            }
        });
    }

    /**
     * Setup mouse events (hover) for an element
     * FULLY RESTORED from old implementation with all hover logic
     */
    setupMouseEvents(
        dom: BabylonDOM,
        render: BabylonRender,
        mesh: Mesh,
        elementId: string
    ): void {
        if (!render.scene) {
            throw new Error('Scene not initialized');
        }

        mesh.actionManager = new ActionManager(render.scene);

        mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
            // Always get the latest mesh reference
            const mainMesh = dom.context.elements.get(elementId);
            if (!mainMesh) return;
            const elementType = dom.context.elementTypes.get(elementId) || 'div';
            const element = { id: elementId, type: elementType } as DOMElement;

            // Create base merged style (without hover) for applyElementMaterial to handle hover merging
            const baseMergedStyle = this.createHoverMergedStyle(dom, elementId, false);

            // Get the hover-merged style for geometry properties
            const elementStyles = dom.context.elementStyles.get(elementId);
            const hoverMergedStyle = elementStyles?.hover ? { ...baseMergedStyle, ...elementStyles.hover } : baseMergedStyle;

            console.log(`RYPT Mouse over for ${elementId} - boxShadow in base style:`, baseMergedStyle.boxShadow);
            console.log(`RYPT Mouse over for ${elementId} - boxShadow in hover style:`, elementStyles?.hover?.boxShadow);
            console.log(`RYPT Mouse over for ${elementId} - boxShadow in merged hover style:`, hoverMergedStyle.boxShadow);

            // Check if we need to recreate geometry (border radius or polygon type changes)
            const normalRadius = this.parseBorderRadius(baseMergedStyle?.borderRadius);
            const hoverRadius = this.parseBorderRadius(hoverMergedStyle?.borderRadius);
            const normalPolygonType = this.parsePolygonType(baseMergedStyle?.polygonType) || 'rectangle';
            const hoverPolygonType = this.parsePolygonType(hoverMergedStyle?.polygonType) || 'rectangle';

            const needsGeometryUpdate = (normalRadius !== hoverRadius) || (normalPolygonType !== hoverPolygonType);
            console.log(`[HOVER DEBUG] Element: ${elementId}`);
            console.log(`[HOVER DEBUG] Normal Radius: ${normalRadius}, Hover Radius: ${hoverRadius}`);
            console.log(`[HOVER DEBUG] Normal Type: ${normalPolygonType}, Hover Type: ${hoverPolygonType}`);
            console.log(`[HOVER DEBUG] Needs Geometry Update: ${needsGeometryUpdate}`);
            console.log(`[HOVER DEBUG] Dimensions found: ${!!dom.context.elementDimensions.get(elementId)}`);

            const safeHoverRadius = isNaN(hoverRadius) ? 0 : hoverRadius;
            const dimensions = dom.context.elementDimensions.get(elementId);
            const pixelToWorldScale = render.actions.camera.getPixelToWorldScale();
            const worldWidth = dimensions ? dimensions.width * pixelToWorldScale : 0;
            const worldHeight = dimensions ? dimensions.height * pixelToWorldScale : 0;
            const worldBorderRadius = safeHoverRadius * pixelToWorldScale;
            const polygonType = hoverPolygonType;

            if (dimensions && needsGeometryUpdate) {
                // Update mesh geometry for hover border radius
                const vertexData = render.actions.mesh.generatePolygonVertexData(
                    polygonType,
                    worldWidth,
                    worldHeight,
                    worldBorderRadius
                );
                vertexData.applyToMesh(mainMesh, true);

                // Update the main mesh's bounding info to ensure proper rendering
                mainMesh.refreshBoundingInfo();

                const singleBorderMesh = dom.context.elements.get(`${elementId}-border_polygon_border_frame`);
                if (singleBorderMesh) {
                    singleBorderMesh.dispose();
                    dom.context.elements.delete(`${elementId}-border_polygon_border_frame`);
                    console.log(`[ELEMENT HOVER DEBUG] Disposed old single border mesh for hover: ${elementId}-border_polygon_border_frame`);
                }

                // Remove up to 4 rectangular border meshes
                for (let i = 0; i < 4; i++) {
                    const borderMesh = dom.context.elements.get(`${elementId}-border-${i}`);
                    if (borderMesh) {
                        borderMesh.dispose();
                        dom.context.elements.delete(`${elementId}-border-${i}`);
                        console.log(`[ELEMENT HOVER DEBUG] Disposed old border mesh for hover: ${elementId}-border-${i}`);
                    }

                    // Also check for named rectangular borders
                    const borderNames = ['-top', '-bottom', '-left', '-right'];
                    if (i < borderNames.length) {
                        const namedBorderMesh = dom.context.elements.get(`${elementId}-border${borderNames[i]}`);
                        if (namedBorderMesh) {
                            namedBorderMesh.dispose();
                            dom.context.elements.delete(`${elementId}-border${borderNames[i]}`);
                            console.log(`[ELEMENT HOVER DEBUG] Disposed old named border mesh for hover: ${elementId}-border${borderNames[i]}`);
                        }
                    }
                }

                // Create new border meshes for hover
                console.log(`[BORDER DEBUG] ${elementId} - hoverMergedStyle.borderWidth RAW: "${hoverMergedStyle?.borderWidth}"`);
                console.log(`[BORDER DEBUG] ${elementId} - hoverMergedStyle.borderColor RAW: "${hoverMergedStyle?.borderColor}"`);
                console.log(`[BORDER DEBUG] ${elementId} - hoverMergedStyle.borderStyle RAW: "${hoverMergedStyle?.borderStyle}"`);

                const borderWidth = this.parseBorderWidth(render, hoverMergedStyle?.borderWidth);
                const colorData = render.actions.style.parseBackgroundColor(hoverMergedStyle?.borderColor ?? '#000000');
                const borderColor = colorData?.type === 'color' ? colorData.color : undefined;

                console.log(`[BORDER DEBUG] ${elementId} hover - PARSED borderWidth: ${borderWidth} (world units)`);
                console.log(`[BORDER DEBUG] ${elementId} hover - PARSED borderColor: ${JSON.stringify(colorData)}`);
                console.log(`[BORDER DEBUG] ${elementId} hover - borderStyle: ${hoverMergedStyle?.borderStyle}`);

                // Use polygon border for proper rounded corner support
                const borderMeshes = render.actions.mesh.createPolygonBorder(
                    `${elementId}-border`,
                    polygonType,
                    worldWidth,
                    worldHeight,
                    borderWidth,
                    worldBorderRadius
                );

                // Parent all border frames to main mesh BEFORE positioning for correct transform inheritance
                const borderParent = (mainMesh.parent && mainMesh.parent instanceof Mesh) ? mainMesh.parent : mainMesh;
                borderMeshes.forEach(borderMesh => {
                    render.actions.mesh.parentMesh(borderMesh, borderParent);
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
                    borderWidth
                );

                const borderOpacity = render.actions.style.parseOpacity(hoverMergedStyle.opacity);
                // ALWAYS create a NEW material for hover to ensure color updates
                const materialName = `${elementId}-hover-border-material-${Date.now()}`;
                let borderMaterial;
                if (!borderColor) {
                    borderMaterial = render.actions.mesh.createMaterial(
                        materialName,
                        new Color3(0, 0, 0),
                        undefined,
                        0
                    );
                } else {
                    borderMaterial = render.actions.mesh.createMaterial(
                        materialName,
                        borderColor,
                        undefined,
                        colorData && colorData.type === 'color' && colorData.alpha !== undefined ? colorData.alpha : borderOpacity
                    );
                }

                borderMeshes.forEach((borderMesh, index) => {
                    borderMesh.material = borderMaterial;
                    console.log(`[BORDER MATERIAL DEBUG] Applied material:`, {
                        meshName: borderMesh.name,
                        materialName: borderMaterial.name,
                        diffuseColor: (borderMaterial as any).diffuseColor,
                        expectedColor: borderColor
                    });

                    // Refresh bounding info to ensure proper rendering of rounded corners
                    borderMesh.refreshBoundingInfo();
                    // Force bounding box update for rounded corners to prevent clipping
                    if (worldBorderRadius > 0 && borderMeshes.length === 1) {
                        // For rounded border meshes, we need to ensure the bounding box encompasses the rounded corners
                        // The rounded corners extend beyond the basic rectangular bounds
                        // Update the bounding info with extended bounds to prevent clipping
                        const boundingInfo = borderMesh.getBoundingInfo();
                        if (boundingInfo) {
                            // Extend the bounding box to fully encompass the rounded corners by updating the mesh's bounding vectors
                            // We need to extend by both the border radius and a small buffer to ensure no clipping
                            const extendAmount = worldBorderRadius + 0.1; // Adding a small buffer
                            const min = boundingInfo.boundingBox.minimum.clone();
                            const max = boundingInfo.boundingBox.maximum.clone();
                            min.x -= extendAmount;
                            min.y -= extendAmount;
                            max.x += extendAmount;
                            max.y += extendAmount;

                            // Update the bounding info with extended bounds
                            borderMesh.setBoundingInfo(new BABYLON.BoundingInfo(min, max));
                        }
                    }
                    // Disable frustum culling for border meshes to prevent clipping issues
                    borderMesh.alwaysSelectAsActiveMesh = true;
                    // Removed zOffset to rely on physical separation
                    // Store border meshes with their actual names
                    if (borderMeshes.length === 1) {
                        // Single polygon border - store with actual mesh name
                        dom.context.elements.set(`${elementId}-border_polygon_border_frame`, borderMesh);
                        console.log(`[ELEMENT HOVER DEBUG] Created hover border mesh: ${elementId}-border_polygon_border_frame`);
                    } else {
                        // Multiple rectangular borders
                        dom.context.elements.set(`${elementId}-border-${index}`, borderMesh);
                        console.log(`[ELEMENT HOVER DEBUG] Created hover border mesh: ${elementId}-border-${index}`);
                    }
                });

                // Calculate worldBorderRadius and polygonType for shadow
                const shadowBorderRadius = safeHoverRadius * pixelToWorldScale;
                const shadowPolygonType = hoverPolygonType;
                // Ensure parent is a Mesh
                const shadowParent = (mainMesh.parent && mainMesh.parent instanceof Mesh) ? mainMesh.parent : mesh;
                // Add or update shadow mesh for hover
                this.updateShadowMesh(dom, render, elementId, hoverMergedStyle, shadowParent, dimensions, mainMesh.position.z, shadowBorderRadius, shadowPolygonType, this.parseTransform(hoverMergedStyle.transform) || undefined);
            }

            dom.context.hoverStates.set(elementId, true);
            this.applyElementMaterial(dom, render, mainMesh, element, true, hoverMergedStyle);

            // Apply transforms smoothly without recreating geometry
            const transform = this.parseTransform(hoverMergedStyle?.transform);
            if (transform) {
                this.applyTransformsSmooth(mainMesh, transform, 150); // 150ms smooth animation

                // For borders, we want them to inherit position but not scaling
                // Handle single polygon border
                const singleBorderMesh = dom.context.elements.get(`${elementId}_polygon_border_frame`);
                if (singleBorderMesh) {
                    // Apply only translation and rotation, not scaling
                    const borderTransform = { ...transform };
                    borderTransform.scale = { x: 1, y: 1, z: 1 }; // Reset scaling for borders
                    this.applyTransformsSmooth(singleBorderMesh, borderTransform, 150);
                }

                // Handle up to 4 rectangular borders
                for (let i = 0; i < 4; i++) {
                    const borderMesh = dom.context.elements.get(`${elementId}-border-${i}`);
                    if (borderMesh) {
                        // Apply only translation and rotation, not scaling
                        const borderTransform = { ...transform };
                        borderTransform.scale = { x: 1, y: 1, z: 1 }; // Reset scaling for borders
                        this.applyTransformsSmooth(borderMesh, borderTransform, 150);
                    }

                    // Also check for named rectangular borders
                    const borderNames = ['-top', '-bottom', '-left', '-right'];
                    if (i < borderNames.length) {
                        const namedBorderMesh = dom.context.elements.get(`${elementId}-border${borderNames[i]}`);
                        if (namedBorderMesh) {
                            // Apply only translation and rotation, not scaling
                            const borderTransform = { ...transform };
                            borderTransform.scale = { x: 1, y: 1, z: 1 }; // Reset scaling for borders
                            this.applyTransformsSmooth(namedBorderMesh, borderTransform, 150);
                        }
                    }
                }

                // Shadow automatically inherits transforms through parenting - no manual intervention needed
                const shadowMesh = dom.context.elements.get(`${elementId}-shadow`);
                if (shadowMesh) {
                    console.log(`RYPT HOVER: Shadow for ${elementId} will automatically inherit element transforms via parenting`);
                    console.log(`RYPT Element transform: scale=(${transform.scale.x}, ${transform.scale.y}), rotation=(${transform.rotate.x}, ${transform.rotate.y}, ${transform.rotate.z})`);
                }
            }

            // Update shadow for hover state even if geometry doesn't change
            if (dimensions && !needsGeometryUpdate) {
                const shadowBorderRadius = safeHoverRadius * pixelToWorldScale;
                const shadowPolygonType = hoverPolygonType;
                const shadowParent = (mainMesh.parent && mainMesh.parent instanceof Mesh) ? mainMesh.parent : mesh;
                this.updateShadowMesh(dom, render, elementId, hoverMergedStyle, shadowParent, dimensions, mainMesh.position.z, shadowBorderRadius, shadowPolygonType, this.parseTransform(hoverMergedStyle.transform) || undefined);
            }

            // After all style/geometry updates, log the mesh rotation and transform
            if (hoverMergedStyle.transform) {
                console.log(`[HOVER DEBUG] ${elementId} transform string:`, hoverMergedStyle.transform);
            }
            console.log(`[HOVER DEBUG] ${elementId} mesh.rotation after hover:`, mainMesh.rotation);
        }));

        mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
            console.log(`[DEBUG] Mouse out event fired for element: ${elementId}`);
            // Always get the latest mesh reference
            const mainMesh = dom.context.elements.get(elementId);
            if (!mainMesh) {
                console.log(`[DEBUG] Mouse out event: mainMesh not found for element: ${elementId}`);
                return;
            }
            const elementType = dom.context.elementTypes.get(elementId) || 'div';
            const element = { id: elementId, type: elementType } as DOMElement;
            const elementStyles = dom.context.elementStyles.get(elementId);
            const typeDefaults = this.styleDefaults.getElementTypeDefaults(element.type);
            const normalStyle = (elementStyles?.normal || {}) as StyleRule;
            const mergedStyle: StyleRule = { ...typeDefaults, ...normalStyle, selector: `#${elementId}` };

            console.log(`RYPT Mouse out for ${elementId} - boxShadow in normal style:`, normalStyle.boxShadow);
            console.log(`RYPT Mouse out for ${elementId} - boxShadow in merged style:`, mergedStyle.boxShadow);

            // Check if we need to recreate geometry (border radius or polygon type changes)
            const hoverMergedStyle = elementStyles?.hover ? { ...mergedStyle, ...elementStyles.hover } : mergedStyle;
            const normalRadius = this.parseBorderRadius(mergedStyle?.borderRadius);
            const hoverRadius = this.parseBorderRadius(hoverMergedStyle?.borderRadius);
            const normalPolygonType = this.parsePolygonType(mergedStyle?.polygonType) || 'rectangle';
            const hoverPolygonType = this.parsePolygonType(hoverMergedStyle?.polygonType) || 'rectangle';

            const needsGeometryUpdate = (normalRadius !== hoverRadius) || (normalPolygonType !== hoverPolygonType);

            const safeNormalRadius = isNaN(normalRadius) ? 0 : normalRadius;
            const dimensions = dom.context.elementDimensions.get(elementId);
            const pixelToWorldScale = render.actions.camera.getPixelToWorldScale();

            if (dimensions && needsGeometryUpdate) {
                const worldBorderRadius = safeNormalRadius * pixelToWorldScale;
                const worldWidth = dimensions.width * pixelToWorldScale;
                const worldHeight = dimensions.height * pixelToWorldScale;
                const polygonType = normalPolygonType;

                // Update mesh geometry for normal border radius
                const vertexData = render.actions.mesh.generatePolygonVertexData(
                    polygonType,
                    worldWidth,
                    worldHeight,
                    worldBorderRadius
                );
                vertexData.applyToMesh(mainMesh, true);

                // Update the main mesh's bounding info to ensure proper rendering
                mainMesh.refreshBoundingInfo();

                // Remove old border meshes
                // Handle both single polygon border and 4 rectangular borders
                const singleBorderMesh = dom.context.elements.get(`${elementId}-border_polygon_border_frame`);
                if (singleBorderMesh) {
                    singleBorderMesh.dispose();
                    dom.context.elements.delete(`${elementId}-border_polygon_border_frame`);
                    console.log(`[ELEMENT HOVER DEBUG] Disposed old single border mesh for normal: ${elementId}-border_polygon_border_frame`);
                }

                // Remove up to 4 rectangular border meshes
                for (let i = 0; i < 4; i++) {
                    const borderMesh = dom.context.elements.get(`${elementId}-border-${i}`);
                    if (borderMesh) {
                        borderMesh.dispose();
                        dom.context.elements.delete(`${elementId}-border-${i}`);
                        console.log(`[ELEMENT HOVER DEBUG] Disposed old border mesh for normal: ${elementId}-border-${i}`);
                    }

                    // Also check for named rectangular borders
                    const borderNames = ['-top', '-bottom', '-left', '-right'];
                    if (i < borderNames.length) {
                        const namedBorderMesh = dom.context.elements.get(`${elementId}-border${borderNames[i]}`);
                        if (namedBorderMesh) {
                            namedBorderMesh.dispose();
                            dom.context.elements.delete(`${elementId}-border${borderNames[i]}`);
                            console.log(`[ELEMENT HOVER DEBUG] Disposed old named border mesh for normal: ${elementId}-border${borderNames[i]}`);
                        }
                    }
                }

                // Create new border meshes for normal
                const borderWidth = this.parseBorderWidth(render, mergedStyle.borderWidth);
                const colorData = render.actions.style.parseBackgroundColor(mergedStyle.borderColor ?? '#000000');
                const borderColor = colorData?.type === 'color' ? colorData.color : undefined;
                console.log(`[BORDER DEBUG] ${elementId} normal - borderWidth: ${borderWidth}, borderColor: ${JSON.stringify(colorData)}, borderStyle: ${mergedStyle?.borderStyle}`);

                // Use polygon border for proper rounded corner support
                const borderMeshes = render.actions.mesh.createPolygonBorder(
                    `${elementId}-border`,
                    polygonType,
                    worldWidth,
                    worldHeight,
                    borderWidth,
                    worldBorderRadius
                );

                // Parent all border frames to main mesh BEFORE positioning for correct transform inheritance
                borderMeshes.forEach(borderMesh => {
                    render.actions.mesh.parentMesh(borderMesh, mainMesh);
                });

                // Position borders correctly relative to the main mesh (local coordinates)
                // Since borders are parented to mainMesh, position should be 0,0
                render.actions.mesh.positionBorderFrames(
                    borderMeshes,
                    0, // Center X (local)
                    0, // Center Y (local)
                    0.05, // Z position (local offset) - increased to ensure visibility
                    worldWidth,
                    worldHeight,
                    borderWidth
                );
                const borderOpacity = render.actions.style.parseOpacity(mergedStyle.opacity);
                let borderMaterial;
                if (!borderColor) {
                    // Transparent: create a fully transparent material, do not set color
                    borderMaterial = render.actions.mesh.createMaterial(
                        `${elementId}-border-material`,
                        new Color3(0, 0, 0),
                        undefined,
                        0 // fully transparent
                    );
                } else {
                    borderMaterial = render.actions.mesh.createMaterial(
                        `${elementId}-border-material`,
                        borderColor,
                        undefined,
                        colorData && colorData.type === 'color' && colorData.alpha !== undefined ? colorData.alpha : borderOpacity
                    );
                }

                borderMeshes.forEach((borderMesh, index) => {
                    borderMesh.material = borderMaterial;
                    // Refresh bounding info to ensure proper rendering of rounded corners
                    borderMesh.refreshBoundingInfo();
                    // Force bounding box update for rounded corners to prevent clipping
                    if (worldBorderRadius > 0 && borderMeshes.length === 1) {
                        // For rounded border meshes, we need to ensure the bounding box encompasses the rounded corners
                        // The rounded corners extend beyond the basic rectangular bounds
                        // Update the bounding info with extended bounds to prevent clipping
                        const boundingInfo = borderMesh.getBoundingInfo();
                        if (boundingInfo) {
                            // Extend the bounding box to fully encompass the rounded corners by updating the mesh's bounding vectors
                            // We need to extend by both the border radius and a small buffer to ensure no clipping
                            const extendAmount = worldBorderRadius + 0.1; // Adding a small buffer
                            const min = boundingInfo.boundingBox.minimum.clone();
                            const max = boundingInfo.boundingBox.maximum.clone();
                            min.x -= extendAmount;
                            min.y -= extendAmount;
                            max.x += extendAmount;
                            max.y += extendAmount;

                            // Update the bounding info with extended bounds
                            borderMesh.setBoundingInfo(new BABYLON.BoundingInfo(min, max));
                        }
                    }
                    // Disable frustum culling for border meshes to prevent clipping issues
                    borderMesh.alwaysSelectAsActiveMesh = true;
                    // Removed zOffset to rely on physical separation
                    // Store border meshes with their actual names
                    if (borderMeshes.length === 1) {
                        // Single polygon border - store with actual mesh name
                        dom.context.elements.set(`${elementId}-border_polygon_border_frame`, borderMesh);
                        console.log(`[ELEMENT HOVER DEBUG] Created normal border mesh: ${elementId}-border_polygon_border_frame`);
                    } else {
                        // Multiple rectangular borders
                        dom.context.elements.set(`${elementId}-border-${index}`, borderMesh);
                        console.log(`[ELEMENT HOVER DEBUG] Created normal border mesh: ${elementId}-border-${index}`);
                    }
                });

                // Calculate worldBorderRadius and polygonType for shadow
                const shadowBorderRadius = safeNormalRadius * pixelToWorldScale;
                const shadowPolygonType = normalPolygonType;
                // Ensure parent is a Mesh
                const shadowParent = (mainMesh.parent && mainMesh.parent instanceof Mesh) ? mainMesh.parent : mesh;
                // Add or update shadow mesh for normal
                this.updateShadowMesh(dom, render, elementId, mergedStyle, shadowParent, dimensions, mainMesh.position.z, shadowBorderRadius, shadowPolygonType, this.parseTransform(mergedStyle.transform) || undefined);
            }

            dom.context.hoverStates.set(elementId, false);
            this.applyElementMaterial(dom, render, mainMesh, element, false, mergedStyle);

            // Apply transforms smoothly without recreating geometry
            const transform = this.parseTransform(mergedStyle?.transform);
            if (transform) {
                this.applyTransformsSmooth(mainMesh, transform, 150); // 150ms smooth animation
                // Also apply to all border meshes and parent them to the main mesh
                // Handle single polygon border
                const singleBorderMesh = dom.context.elements.get(`${elementId}_polygon_border_frame`);
                if (singleBorderMesh) {
                    this.applyTransformsSmooth(singleBorderMesh, transform, 150);
                    // Parent border mesh to main mesh for transform inheritance
                    render.actions.mesh.parentMesh(singleBorderMesh, mainMesh);
                }

                // Handle up to 4 rectangular borders
                for (let i = 0; i < 4; i++) {
                    const borderMesh = dom.context.elements.get(`${elementId}-border-${i}`);
                    if (borderMesh) {
                        this.applyTransformsSmooth(borderMesh, transform, 150);
                        // Parent border mesh to main mesh for transform inheritance
                        render.actions.mesh.parentMesh(borderMesh, mainMesh);
                    }

                    // Also check for named rectangular borders
                    const borderNames = ['-top', '-bottom', '-left', '-right'];
                    if (i < borderNames.length) {
                        const namedBorderMesh = dom.context.elements.get(`${elementId}-border${borderNames[i]}`);
                        if (namedBorderMesh) {
                            this.applyTransformsSmooth(namedBorderMesh, transform, 150);
                            // Parent border mesh to main mesh for transform inheritance
                            render.actions.mesh.parentMesh(namedBorderMesh, mainMesh);
                        }
                    }
                }

                // Shadow automatically inherits transforms through parenting - no manual intervention needed
                const shadowMesh = dom.context.elements.get(`${elementId}-shadow`);
                if (shadowMesh) {
                    console.log(`RYPT NORMAL: Shadow for ${elementId} will automatically inherit element transforms via parenting`);
                    console.log(`RYPT Element transform: scale=(${transform.scale.x}, ${transform.scale.y}), rotation=(${transform.rotate.x}, ${transform.rotate.y}, ${transform.rotate.z})`);
                }
            } else {
                // Smoothly reset transforms to default values
                const resetTransform: TransformData = {
                    translate: { x: 0, y: 0, z: 0 },
                    rotate: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 }
                };

                this.applyTransformsSmooth(mainMesh, resetTransform, 150);

                // Handle single polygon border
                const singleBorderMesh = dom.context.elements.get(`${elementId}_polygon_border_frame`);
                if (singleBorderMesh) {
                    this.applyTransformsSmooth(singleBorderMesh, resetTransform, 150);
                }

                // Handle up to 4 rectangular borders
                for (let i = 0; i < 4; i++) {
                    const borderMesh = dom.context.elements.get(`${elementId}-border-${i}`);
                    if (borderMesh) {
                        this.applyTransformsSmooth(borderMesh, resetTransform, 150);
                    }

                    // Also check for named rectangular borders
                    const borderNames = ['-top', '-bottom', '-left', '-right'];
                    if (i < borderNames.length) {
                        const namedBorderMesh = dom.context.elements.get(`${elementId}-border${borderNames[i]}`);
                        if (namedBorderMesh) {
                            this.applyTransformsSmooth(namedBorderMesh, resetTransform, 150);
                        }
                    }
                }

                // Shadow automatically resets transforms through parenting - no manual intervention needed
                const shadowMesh = dom.context.elements.get(`${elementId}-shadow`);
                if (shadowMesh) {
                    console.log(`RYPT RESET: Shadow for ${elementId} will automatically reset transforms via parenting`);
                    console.log(`RYPT RESET: Reset shadow transforms and shader uniforms for ${elementId}`);
                    console.log(`RYPT Element position: (${mainMesh.position.x.toFixed(3)}, ${mainMesh.position.y.toFixed(3)}, ${mainMesh.position.z.toFixed(3)})`);
                    console.log(`RYPT Shadow position: (${shadowMesh.position.x.toFixed(3)}, ${shadowMesh.position.y.toFixed(3)}, ${shadowMesh.position.z.toFixed(3)})`);
                }
            }

            // Update shadow for normal state even if geometry doesn't change
            if (dimensions && !needsGeometryUpdate) {
                const shadowBorderRadius = safeNormalRadius * pixelToWorldScale;
                const shadowPolygonType = normalPolygonType;
                const shadowParent = (mainMesh.parent && mainMesh.parent instanceof Mesh) ? mainMesh.parent : mesh;
                this.updateShadowMesh(dom, render, elementId, mergedStyle, shadowParent, dimensions, mainMesh.position.z, shadowBorderRadius, shadowPolygonType, this.parseTransform(mergedStyle.transform) || undefined);
            }
        }));
    }

    // ============================================================
    // HELPER METHODS - All restored from old implementation
    // ============================================================

    /**
     * Create hover merged style  
     * Merges type defaults, normal styles, and optionally hover styles
     */
    private createHoverMergedStyle(dom: BabylonDOM, elementId: string, isHovered: boolean): StyleRule {
        const elementType = dom.context.elementTypes.get(elementId) || 'div';
        const elementStyles = dom.context.elementStyles.get(elementId);
        const typeDefaults = this.styleDefaults.getElementTypeDefaults(elementType);
        const normalStyle = (elementStyles?.normal || {}) as StyleRule;

        // Create base merged style using the same method as initial element creation
        const baseMergedStyle: StyleRule = StyleDefaultsService.mergeStyles(
            { selector: `#${elementId}`, ...typeDefaults },
            normalStyle
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
        style: StyleRule
    ): void {
        // Get opacity
        const opacity = render.actions.style.parseOpacity(style?.opacity);

        if (style?.background) {
            const backgroundData = render.actions.style.parseBackgroundColor(style.background);

            if (backgroundData?.type === 'gradient') {
                const dims = dom.context.elementDimensions.get(mesh.name);
                const width = dims?.width ?? 0;
                const height = dims?.height ?? 0;
                const material = render.actions.mesh.createGradientMaterial(
                    `${element.id || mesh.name}-hover-gradient`,
                    backgroundData.gradient,
                    opacity,
                    width,
                    height
                );
                mesh.material = material;
            } else if (backgroundData?.type === 'color') {
                const finalOpacity = backgroundData.alpha !== undefined ? backgroundData.alpha : opacity;
                const material = render.actions.mesh.createMaterial(
                    `${element.id || mesh.name}-material`,
                    backgroundData.color,
                    undefined,
                    finalOpacity
                );
                mesh.material = material;
            }
        }
    }

    /**
     * Apply transforms smoothly using animations
     * Duration in milliseconds (default 200ms)
     */
    private applyTransformsSmooth(mesh: Mesh, transforms: TransformData, duration: number = 200): void {
        console.log(`🔄 Applying smooth transforms to ${mesh.name}:`, transforms);

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
        const targetPosition = new Vector3(
            mesh.metadata.originalPosition.x + transforms.translate.x,
            mesh.metadata.originalPosition.y - transforms.translate.y, // Y is inverted in BabylonJS
            mesh.metadata.originalPosition.z + transforms.translate.z
        );
        const targetRotation = new Vector3(
            transforms.rotate.x,
            transforms.rotate.y,
            transforms.rotate.z
        );
        const targetScaling = new Vector3(
            transforms.scale.x,
            transforms.scale.y,
            transforms.scale.z
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
                console.log(`✅ Smooth transform animation completed for ${mesh.name}`);
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
        if (typeof borderRadius === 'string' && borderRadius.endsWith('px')) {
            return parseFloat(borderRadius);
        }

        // Handle percentage values (will need parent context for proper calculation)
        if (typeof borderRadius === 'string' && borderRadius.endsWith('%')) {
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
            return 'rectangle';
        }

        const validTypes = ['rectangle', 'circle', 'triangle', 'pentagon', 'hexagon', 'octagon'];
        return validTypes.includes(polygonType) ? polygonType : 'rectangle';
    }

    /**
     * Parse border width and convert to world units
     */
    private parseBorderWidth(render: BabylonRender, width?: string): number {
        if (!width) return 0;
        // Handle "2px", "0.1", etc. - convert to world units
        const numericValue = parseFloat(width.replace('px', ''));
        // Use camera-calculated scaling factor for accurate conversion
        const scaleFactor = render.actions.camera.getPixelToWorldScale();
        return numericValue * scaleFactor;
    }

    /**
     * Parse CSS transform property into TransformData
     */
    private parseTransform(transformString: string | undefined): TransformData | null {
        if (!transformString) {
            return null;
        }

        // Default transform values
        const result: TransformData = {
            translate: { x: 0, y: 0, z: 0 },
            rotate: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
        };

        // Parse translate
        const translateMatch = transformString.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (translateMatch) {
            result.translate.x = parseFloat(translateMatch[1]);
            result.translate.y = parseFloat(translateMatch[2]);
        }

        // Parse rotate
        const rotateMatch = transformString.match(/rotate\(([^)]+)\)/);
        if (rotateMatch) {
            const degrees = parseFloat(rotateMatch[1]);
            result.rotate.z = degrees * (Math.PI / 180); // Convert to radians
        }

        // Parse scale
        const scaleMatch = transformString.match(/scale\(([^)]+)\)/);
        if (scaleMatch) {
            const scale = parseFloat(scaleMatch[1]);
            result.scale.x = scale;
            result.scale.y = scale;
            result.scale.z = scale;
        }

        return result;
    }

    /**
     * Parse box-shadow CSS property
     */
    private parseBoxShadow(boxShadowValue: string | undefined): { offsetX: number, offsetY: number, blur: number, color: string } | null {
        if (!boxShadowValue || boxShadowValue === 'none') return null;

        // Parse box-shadow: offset-x offset-y blur-radius color
        // Example: "2px 2px 4px rgba(0,0,0,0.5)" or "1px 1px 2px #000000"
        const trimmed = boxShadowValue.trim();

        // Simple regex to match common box-shadow patterns
        const boxShadowRegex = /^(-?\d+(?:\.\d+)?(?:px)?)\s+(-?\d+(?:\.\d+)?(?:px)?)\s+(\d+(?:\.\d+)?(?:px)?)\s+(.+)$/;
        const match = trimmed.match(boxShadowRegex);

        if (!match) {
            console.warn(`⚠️ Unable to parse box-shadow: "${boxShadowValue}"`);
            return null;
        }

        const offsetX = parseFloat(match[1].replace('px', ''));
        const offsetY = parseFloat(match[2].replace('px', ''));
        const blur = parseFloat(match[3].replace('px', ''));
        const color = match[4].trim();

        console.log(`🎯 Parsed box shadow: offsetX=${offsetX}, offsetY=${offsetY}, blur=${blur}, color="${color}"`);
        return { offsetX, offsetY, blur, color };
    }

    /**
     * Helper to parse RGBA color and multiply alpha
     */
    private getBoxShadowColorWithOpacity(color: string, styleOpacity: number): string {
        // Try to parse rgba/hsla or hex
        const rgbaRegex = /rgba?\(([^)]+)\)/;
        const match = color.match(rgbaRegex);
        if (match) {
            const parts = match[1].split(',').map(p => p.trim());
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
    private updateShadowMesh(dom: BabylonDOM, render: BabylonRender, elementId: string, style: StyleRule, parent: Mesh, dimensions: any, zPosition: number, borderRadius: number, polygonType: string, transform?: TransformData) {
        console.log(`RYPT updateShadowMesh called for ${elementId} with boxShadow: "${style?.boxShadow}"`);

        const boxShadow = this.parseBoxShadow(style?.boxShadow);
        const existingShadow = dom.context.elements.get(`${elementId}-shadow`);

        console.log(`RYPT Parsed boxShadow for ${elementId}:`, boxShadow);

        // Check if this is initial creation or hover update
        const isHoverState = dom.context.hoverStates.get(elementId) || false;
        console.log(`RYPT Shadow update context for ${elementId}: ${isHoverState ? 'HOVER' : 'NORMAL'} state`);

        // If no box shadow is needed, remove existing shadow
        if (!boxShadow) {
            if (existingShadow) {
                existingShadow.dispose();
                dom.context.elements.delete(`${elementId}-shadow`);
                console.log(`RYPT Removed shadow for ${elementId} (no box-shadow style)`);
            } else {
                console.log(`RYPT No shadow to remove for ${elementId} (no box-shadow style and no existing shadow)`);
            }
            return;
        }

        const scaleFactor = render.actions.camera.getPixelToWorldScale();
        const worldWidth = dimensions.width * scaleFactor;
        const worldHeight = dimensions.height * scaleFactor;
        const scaledOffsetX = boxShadow.offsetX * scaleFactor;
        const scaledOffsetY = boxShadow.offsetY * scaleFactor;
        const scaledBlur = boxShadow.blur * scaleFactor;

        // Multiply color alpha by style opacity
        const styleOpacity = render.actions.style.parseOpacity(style.opacity);
        const shadowColor = this.getBoxShadowColorWithOpacity(boxShadow.color, styleOpacity);

        console.log(`RYPT Shadow parameters for ${elementId}:`, {
            originalBlur: boxShadow.blur,
            scaledBlur: scaledBlur,
            originalColor: boxShadow.color,
            finalColor: shadowColor,
            styleOpacity: styleOpacity,
            worldSize: `${worldWidth.toFixed(1)}x${worldHeight.toFixed(1)}`
        });

        // Check if we can reuse existing shadow
        let needsRecreation = !existingShadow;

        if (existingShadow && existingShadow.metadata && existingShadow.metadata.shadowParams) {
            const lastParams = existingShadow.metadata.shadowParams;

            // More precise parameter comparison
            const widthChanged = Math.abs(lastParams.width - worldWidth) > 0.001;
            const heightChanged = Math.abs(lastParams.height - worldHeight) > 0.001;
            const blurChanged = Math.abs(lastParams.blur - scaledBlur) > 0.001;
            const colorChanged = lastParams.color !== shadowColor;
            const radiusChanged = Math.abs(lastParams.borderRadius - borderRadius) > 0.001;
            const typeChanged = lastParams.polygonType !== polygonType;

            const paramChanged = widthChanged || heightChanged || blurChanged || colorChanged || radiusChanged || typeChanged;
            needsRecreation = paramChanged;

            if (!paramChanged) {
                console.log(`RYPT ✅ Reusing existing shadow for ${elementId} (all parameters identical)`);
            } else {
                console.log(`RYPT ❌ Shadow parameters changed for ${elementId}:`, {
                    widthChanged: widthChanged ? `${lastParams.width} → ${worldWidth}` : 'unchanged',
                    heightChanged: heightChanged ? `${lastParams.height} → ${worldHeight}` : 'unchanged',
                    blurChanged: blurChanged ? `${lastParams.blur} → ${scaledBlur}` : 'unchanged',
                    colorChanged: colorChanged ? `${lastParams.color} → ${shadowColor}` : 'unchanged',
                    radiusChanged: radiusChanged ? `${lastParams.borderRadius} → ${borderRadius}` : 'unchanged',
                    typeChanged: typeChanged ? `${lastParams.polygonType} → ${polygonType}` : 'unchanged'
                });
            }
        } else {
            console.log(`RYPT 🆕 No existing shadow metadata for ${elementId}, creating new shadow`);
        }

        // Remove old shadow if recreating
        if (needsRecreation && existingShadow) {
            existingShadow.dispose();
            dom.context.elements.delete(`${elementId}-shadow`);
            console.log(`RYPT Disposed existing shadow for ${elementId}`);
        }

        // Get the element mesh for parenting and positioning
        const elementMesh = dom.context.elements.get(elementId);
        if (!elementMesh) {
            console.warn(`RYPT Could not find element mesh for shadow positioning: ${elementId}`);
            return;
        }

        let shadowMesh: Mesh;

        if (needsRecreation) {
            // Create new shadow
            shadowMesh = render.actions.mesh.createShadow(
                `${elementId}-shadow`,
                worldWidth,
                worldHeight,
                scaledOffsetX,
                scaledOffsetY,
                scaledBlur,
                shadowColor,
                polygonType,
                borderRadius
            );

            // Store shadow parameters for future comparison
            shadowMesh.metadata = {
                shadowParams: {
                    width: worldWidth,
                    height: worldHeight,
                    blur: scaledBlur,
                    color: shadowColor,
                    borderRadius: borderRadius,
                    polygonType: polygonType
                }
            };

            // Parent shadow to the element itself so it follows the element's position and transforms
            render.actions.mesh.parentMesh(shadowMesh, elementMesh);
            dom.context.elements.set(`${elementId}-shadow`, shadowMesh);

            console.log(`RYPT Created shadow for ${elementId} (${worldWidth.toFixed(1)}x${worldHeight.toFixed(1)}) blur=${scaledBlur.toFixed(1)} color=${shadowColor}`);
        } else {
            shadowMesh = existingShadow!;
        }

        // Set shadow position relative to parent element (only once during creation)
        if (needsRecreation) {
            const shadowX = scaledOffsetX; // Offset from element position
            const shadowY = -scaledOffsetY; // Negative because CSS Y is inverted

            // Position shadow relative to element (parenting will handle world positioning)
            shadowMesh.position.set(shadowX, shadowY, -0.01); // Behind element in local space

            console.log(`RYPT Set initial shadow offset for ${elementId}: (${shadowX.toFixed(3)}, ${shadowY.toFixed(3)}, -0.01)`);
        }

        // Since shadow is parented to element, it will automatically inherit all transforms and position changes
        // No need to manually apply transforms - parenting handles this automatically
        console.log(`RYPT Shadow will automatically follow element ${elementId} via parenting`);
    }
}
