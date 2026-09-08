import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { BabylonRender } from '../interfaces/render.types';
import { DOMElement } from '../../../types/dom-element';
import { SelectElement, SelectOption, InputType, ValidationState } from '../../../types/input-types';
import { StyleRule } from '../../../types/style-rule';
import { TextRenderingService } from '../../text/text-rendering.service';
import { BabylonMeshService } from '../../babylon-mesh.service';
import { CONTROL_CONTENT_Z_OFFSET } from '../render-depth.constants';
import type { CssPoint, CssSize, RenderPoint, RenderSize } from '../../coordinate-space.types';

interface SelectPaintProjection {
    projectCssLocalPoint(point: CssPoint, renderDepth?: number): RenderPoint;
    projectCssSize(size: CssSize): RenderSize;
}

/**
 * Service responsible for managing select dropdown elements
 */
@Injectable({
    providedIn: 'root'
})
export class SelectManager {
    private readonly projections = new WeakMap<SelectElement, SelectPaintProjection>();

    // Track click-away observers for each open dropdown
    private clickAwayObservers: Map<string, {
        observer: BABYLON.Observer<BABYLON.PointerInfo>;
        scene: BABYLON.Scene;
    }> = new Map();

    get clickAwayObserverCount(): number {
        return this.clickAwayObservers.size;
    }

    constructor(
        private textRenderingService: TextRenderingService,
        private babylonMeshService: BabylonMeshService
    ) { }

    /**
     * Creates a select dropdown element
     */
    createSelectElement(
        element: DOMElement,
        render: BabylonRender,
        style: StyleRule,
        dimensions: CssSize
    ): SelectElement {
        if (!render.scene) {
            throw new Error('Scene is required to create select element');
        }

        // Create select field mesh
        const selectMesh = this.createSelectMesh(element, render, style, dimensions);

        // Initialize validation state
        const validationState: ValidationState = {
            valid: true,
            errors: [],
            touched: false,
            dirty: false
        };

        // Parse options from element
        const options = this.parseOptions(element);
        const selectedIndex = this.findSelectedIndex(options, element);

        // Create select object
        const selectElement: SelectElement = {
            element,
            type: InputType.Select,
            style, // Store style
            value: options[selectedIndex]?.value || null,
            options,
            selectedIndex,
            activeOptionIndex: selectedIndex,
            dropdownOpen: false,
            optionMeshes: [],
            focused: false,
            disabled: element.disabled || false,
            required: element.required || false,
            validationRules: [],
            validationState,
            mesh: selectMesh,
            cssSize: { ...dimensions },
        };

        this.projections.set(selectElement, render.actions.camera);

        // Create display mesh for selected value
        selectElement.displayMesh = this.createDisplayMesh(selectElement, render, style);
        if (style.appearance !== 'none') {
            selectElement.indicatorMesh = this.createIndicatorMesh(selectElement, render, style);
        }

        // Pointer defaults are owned by the scene interaction runtime.
        if (selectElement.mesh) {
            selectElement.mesh.metadata = { ...selectElement.mesh.metadata, cursor: 'pointer' };
        }

        return selectElement;
    }

    private createIndicatorMesh(
        selectElement: SelectElement,
        render: BabylonRender,
        style: StyleRule,
    ): BABYLON.Mesh {
        const indicatorStyle: StyleRule = {
            ...style,
            selector: style.selector,
            color: style.color ?? '#e6edf3',
            fontFamily: style.fontFamily ?? 'Segoe UI, Arial, sans-serif',
            fontSize: '20px',
            fontWeight: '700',
            lineHeight: '20px',
        };
        const texture = this.textRenderingService.renderTextToTexture(
            selectElement.element,
            '▾',
            indicatorStyle,
        );
        const textureSize = this.textRenderingService.getLogicalTextureSize(texture);
        const renderedTexture = render.actions.camera.projectCssSize(textureSize);
        const indicator = this.babylonMeshService.createTextMesh(
            `selectIndicator_${selectElement.element.id}`,
            texture,
            renderedTexture.width,
            renderedTexture.height,
        );
        indicator.parent = selectElement.mesh;
        // Native selects reserve a compact UA-owned indicator gutter rather
        // than positioning the arrow at the authored text padding edge.
        const center = render.actions.camera.projectCssLocalPoint({
            x: (selectElement.cssSize?.width ?? 0) / 2 - 5 - textureSize.width / 2,
            y: -2,
        });
        indicator.position.x = center.x;
        indicator.position.y = center.y;
        indicator.position.z = CONTROL_CONTENT_Z_OFFSET;
        indicator.isPickable = false;
        return indicator;
    }

    /**
     * Opens the dropdown menu
     */
    openDropdown(selectElement: SelectElement, scene: BABYLON.Scene, style: StyleRule): void {
        if (selectElement.disabled || selectElement.dropdownOpen) return;

        selectElement.activeOptionIndex = selectElement.selectedIndex;
        selectElement.dropdownOpen = true;

        // Create dropdown mesh
        selectElement.dropdownMesh = this.createDropdownMesh(selectElement, scene, style);

        // Create option meshes
        selectElement.optionMeshes = this.createOptionMeshes(selectElement, scene, style);

        // Position dropdown
        this.positionDropdown(selectElement);

        // Add click-away listener to close dropdown when clicking outside
        this.setupClickAwayListener(selectElement, scene);
    }

    /**
     * Closes the dropdown menu
     */
    closeDropdown(selectElement: SelectElement): void {
        if (!selectElement.dropdownOpen) return;

        selectElement.dropdownOpen = false;
        const hadUncommittedPreview = selectElement.activeOptionIndex !== selectElement.selectedIndex;
        selectElement.activeOptionIndex = selectElement.selectedIndex;
        if (hadUncommittedPreview) {
            this.redrawDisplay(selectElement, selectElement.selectedIndex);
        }

        // Remove click-away listener
        this.removeClickAwayListener(selectElement);

        this.disposeOptionMeshes(selectElement);
        this.disposeDropdownMesh(selectElement);
    }

    /**
     * Sets up click-away listener for dropdown
     */
    private setupClickAwayListener(selectElement: SelectElement, scene: BABYLON.Scene): void {
        const elementId = selectElement.element.id || '';

        // Remove any existing observer
        this.removeClickAwayListener(selectElement);

        // Add pointer down observer
        const observer = scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type !== BABYLON.PointerEventTypes.POINTERDOWN) return;
            if (!selectElement.dropdownOpen) return;

            const pickedMesh = pointerInfo.pickInfo?.pickedMesh;

            // Check if clicked on dropdown, options, select itself, or any descendant
            // We use safe navigation because pickedMesh might be null
            const isSelectMesh = pickedMesh && (pickedMesh === selectElement.mesh || pickedMesh.isDescendantOf(selectElement.mesh));
            const isDropdownMesh = this.isPopupPointerTarget(
                selectElement,
                scene,
                pointerInfo,
            );

            // Allow clicking display mesh
            const isDisplayMesh = pickedMesh && (pickedMesh === selectElement.displayMesh || (selectElement.displayMesh && pickedMesh.isDescendantOf(selectElement.displayMesh)));

            // If clicked outside all related meshes, close dropdown
            if (!isSelectMesh && !isDropdownMesh && !isDisplayMesh) {
                this.closeDropdown(selectElement);
            }
        });

        if (observer) {
            this.clickAwayObservers.set(elementId, { observer, scene });
        }
    }

    /**
     * Removes click-away listener for dropdown
     */
    private removeClickAwayListener(selectElement: SelectElement): void {
        const elementId = selectElement.element.id || '';
        const registration = this.clickAwayObservers.get(elementId);

        if (registration) {
            registration.scene.onPointerObservable.remove(registration.observer);
            this.clickAwayObservers.delete(elementId);
        }
    }

    /**
     * Navigates between options using keyboard
     */
    navigateOptions(selectElement: SelectElement, direction: 'up' | 'down'): void {
        if (selectElement.options.length === 0) return;

        const currentIndex = selectElement.dropdownOpen
            ? selectElement.activeOptionIndex
            : selectElement.selectedIndex;
        let newIndex = currentIndex;

        if (direction === 'up') {
            newIndex = Math.max(0, currentIndex - 1);
        } else {
            newIndex = Math.min(selectElement.options.length - 1, currentIndex + 1);
        }

        // Skip disabled options
        while (selectElement.options[newIndex]?.disabled) {
            if (direction === 'up') {
                newIndex--;
                if (newIndex < 0) {
                    newIndex = currentIndex; // Stay on current
                    break;
                }
            } else {
                newIndex++;
                if (newIndex >= selectElement.options.length) {
                    newIndex = currentIndex; // Stay on current
                    break;
                }
            }
        }

        if (newIndex !== currentIndex) {
            if (selectElement.dropdownOpen) {
                this.updateOptionHighlight(selectElement, newIndex);
            } else {
                // Native closed selects commit an arrow-key choice immediately.
                this.selectOption(selectElement, newIndex);
            }
        }
    }

    /**
     * Selects an option by index
     */
    selectOption(selectElement: SelectElement, index: number, render?: any, style?: StyleRule): void {
        if (index < 0 || index >= selectElement.options.length) return;
        if (selectElement.options[index].disabled) return;

        selectElement.selectedIndex = index;
        selectElement.activeOptionIndex = index;
        selectElement.value = selectElement.options[index].value;
        selectElement.validationState.dirty = true;

        // Always update display mesh when selection changes
        this.redrawDisplay(selectElement, index);

        // Close dropdown
        this.closeDropdown(selectElement);
    }

    /**
     * Updates the visual highlight on options during keyboard navigation
     */
    private updateOptionHighlight(selectElement: SelectElement, newIndex: number): void {
        selectElement.activeOptionIndex = newIndex;
        this.redrawDisplay(selectElement, newIndex);
        const scene = selectElement.mesh.getScene();
        this.disposeOptionMeshes(selectElement);
        selectElement.optionMeshes = this.createOptionMeshes(selectElement, scene, selectElement.style);
    }

    /**
     * Creates the main select field mesh
     */
    private createSelectMesh(element: DOMElement, render: BabylonRender, style: StyleRule, dimensions: CssSize): BABYLON.Mesh {
        const size = render.actions.camera.projectCssSize(dimensions);

        // Use plane instead of box for 2D consistency
        const selectMesh = BABYLON.MeshBuilder.CreatePlane(`select_${element.id}`, {
            width: size.width,
            height: size.height,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, render.scene);

        // Create material with CSS colors
        const material = new BABYLON.StandardMaterial(`selectMaterial_${element.id}`, render.scene);

        // Apply CSS background color
        const bgColor = this.parseColor(style?.background);
        material.diffuseColor = bgColor;
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.backFaceCulling = false;

        selectMesh.material = material;
        selectMesh.isPickable = true;

        return selectMesh;
    }

    /**
     * Creates the display mesh for showing selected value using stored camera scale
     */
    private createDisplayMeshWithStoredScale(
        selectElement: SelectElement,
        style: StyleRule,
        displayIndex: number = selectElement.selectedIndex
    ): BABYLON.Mesh {
        const options = selectElement.options;
        const selectedOption = options[displayIndex];
        const textContent = selectedOption ? selectedOption.label : 'Select...';

        // Use style as-is, matching text-input behavior
        const textStyle = { ...style };
        // Use 16px to match other input elements (don't override)
        if (!textStyle.fontSize) {
            textStyle.fontSize = '16px';
        }
        // Ensure basic properties are set
        if (!textStyle.fontFamily) textStyle.fontFamily = 'Arial';
        if (!textStyle.color) textStyle.color = '#000000';

        try {
            const texture = this.textRenderingService.renderTextToTexture(
                selectElement.element,
                textContent,
                textStyle
            );

            // Get texture dimensions
            const textureSize = this.textRenderingService.getLogicalTextureSize(texture);
            const textureWidthPx = textureSize.width;
            const textureHeightPx = textureSize.height;

            const projection = this.requireProjection(selectElement);
            const renderedTexture = projection.projectCssSize(textureSize);

            // Create text mesh using BabylonMeshService
            const displayPlane = this.babylonMeshService.createTextMesh(
                `selectDisplay_${selectElement.element.id}`,
                texture,
                renderedTexture.width,
                renderedTexture.height,
            );

            displayPlane.parent = selectElement.mesh;
            // Ensure display text sits IN FRONT of the Select Mesh (Positive Z, assuming Front is Positive)
            displayPlane.position.z = CONTROL_CONTENT_Z_OFFSET;
            displayPlane.isPickable = false;

            // Align text to the CSS content edge.
            const insets = this.getHorizontalContentInsets(style);
            const center = projection.projectCssLocalPoint({
                x: -(selectElement.cssSize?.width ?? 0) / 2 + insets.left + 4 + textureWidthPx / 2,
                y: 2,
            });
            displayPlane.position.x = center.x;
            displayPlane.position.y = center.y;

            return displayPlane;

        } catch (error) {
            console.error('Error creating select display:', error);
            const scene = selectElement.mesh.getScene();
            const fallbackSize = this.requireProjection(selectElement)
                .projectCssSize({ width: 180, height: 30 });
            return BABYLON.MeshBuilder.CreatePlane(`selectDisplay_${selectElement.element.id}_fallback`, {
                width: fallbackSize.width,
                height: fallbackSize.height,
            }, scene);
        }
    }

    /**
     * Creates the display mesh for showing selected value
     */
    private createDisplayMesh(selectElement: SelectElement, render: BabylonRender, style: StyleRule): BABYLON.Mesh {
        const options = selectElement.options;
        const selectedIndex = selectElement.selectedIndex;
        const selectedOption = options[selectedIndex];
        const textContent = selectedOption ? selectedOption.label : 'Select...';

        // Use style as-is, matching text-input behavior
        const textStyle = { ...style };
        // Use 16px to match other input elements (don't override)
        if (!textStyle.fontSize) {
            textStyle.fontSize = '16px';
        }
        // Ensure basic properties are set
        if (!textStyle.fontFamily) textStyle.fontFamily = 'Arial';
        if (!textStyle.color) textStyle.color = '#000000';

        try {
            const texture = this.textRenderingService.renderTextToTexture(
                selectElement.element,
                textContent,
                textStyle
            );

            // Get texture dimensions
            const textureSize = this.textRenderingService.getLogicalTextureSize(texture);
            const textureWidthPx = textureSize.width;
            const textureHeightPx = textureSize.height;

            const renderedTexture = render.actions.camera.projectCssSize(textureSize);

            // Create text mesh using BabylonMeshService
            const displayPlane = this.babylonMeshService.createTextMesh(
                `selectDisplay_${selectElement.element.id}`,
                texture,
                renderedTexture.width,
                renderedTexture.height,
            );

            displayPlane.parent = selectElement.mesh;
            // Ensure display text sits IN FRONT of the Select Mesh (Positive Z, assuming Front is Positive)
            displayPlane.position.z = CONTROL_CONTENT_Z_OFFSET;
            displayPlane.isPickable = false;

            // Align text to the CSS content edge.
            const insets = this.getHorizontalContentInsets(style);
            const center = render.actions.camera.projectCssLocalPoint({
                x: -(selectElement.cssSize?.width ?? 0) / 2 + insets.left + 4 + textureWidthPx / 2,
                y: 2,
            });
            displayPlane.position.x = center.x;
            displayPlane.position.y = center.y;

            return displayPlane;

        } catch (error) {
            console.error('Error creating select display:', error);
            const fallbackSize = render.actions.camera.projectCssSize({ width: 180, height: 30 });
            return BABYLON.MeshBuilder.CreatePlane(`selectDisplay_${selectElement.element.id}_fallback`, {
                width: fallbackSize.width,
                height: fallbackSize.height,
            }, render.scene);
        }
    }

    /** Reopens a compatible live select and restores its uncommitted active option. */
    restoreExpandedState(selectElement: SelectElement, activeOptionIndex: number): void {
        if (activeOptionIndex < 0 || activeOptionIndex >= selectElement.options.length ||
            selectElement.options[activeOptionIndex].disabled) return;
        this.openDropdown(selectElement, selectElement.mesh.getScene(), selectElement.style);
        if (selectElement.dropdownOpen && activeOptionIndex !== selectElement.activeOptionIndex) {
            this.updateOptionHighlight(selectElement, activeOptionIndex);
        }
    }

    /** Native select popups remain the pointer target above authored page layers. */
    private isPopupPointerTarget(
        selectElement: SelectElement,
        scene: BABYLON.Scene,
        pointerInfo: BABYLON.PointerInfo,
    ): boolean {
        const isPopupMesh = (mesh: BABYLON.AbstractMesh | null | undefined): boolean =>
            !!mesh && !!selectElement.dropdownMesh &&
            (mesh === selectElement.dropdownMesh || mesh.isDescendantOf(selectElement.dropdownMesh));
        if (isPopupMesh(pointerInfo.pickInfo?.pickedMesh)) return true;

        const nativeEvent = pointerInfo.event as PointerEvent | MouseEvent | undefined;
        const x = nativeEvent?.offsetX ?? scene.pointerX;
        const y = nativeEvent?.offsetY ?? scene.pointerY;
        return scene.multiPick(x, y, (mesh) => mesh.isPickable)
            ?.some((pick) => isPopupMesh(pick.pickedMesh)) ?? false;
    }

    private getHorizontalContentInsets(style: StyleRule): { left: number; right: number } {
        const padding = this.parseHorizontalBoxShorthand(style.padding);
        const border = Math.max(0, this.parseSize(style.borderWidth) || 0);
        const left = Math.max(0, this.parseSize(style.paddingLeft) ?? padding.left);
        const right = Math.max(0, this.parseSize(style.paddingRight) ?? padding.right);

        return {
            left: border + left,
            right: border + right,
        };
    }

    private parseHorizontalBoxShorthand(value: string | undefined): { left: number; right: number } {
        const values = value
            ?.trim()
            .split(/\s+/)
            .map((part) => Math.max(0, this.parseSize(part) || 0)) ?? [];

        if (values.length === 0) return { left: 0, right: 0 };
        if (values.length === 1) return { left: values[0], right: values[0] };
        if (values.length === 2 || values.length === 3) {
            return { left: values[1], right: values[1] };
        }
        return { left: values[3], right: values[1] };
    }

    /**
     * Creates the dropdown background mesh
     */
    private createDropdownMesh(selectElement: SelectElement, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh {
        // Keep the popup border inside the select's border-box, as native
        // dropdowns do, instead of adding a pixel beyond each control edge.
        const width = this.getPopupInteriorWidthCss(selectElement);

        const optionHeight = this.getPopupOptionHeightCss(style);

        const optionsCount = selectElement.options.length;
        // Limit max height to e.g. 5 items
        const maxHeight = optionHeight * 5;
        const height = Math.min(optionsCount * optionHeight, maxHeight);
        selectElement.popupCssSize = { width, height };
        const renderedSize = this.requireProjection(selectElement).projectCssSize({ width, height });

        // Use plane instead of box for better 2D rendering
        const dropdownMesh = BABYLON.MeshBuilder.CreatePlane(`dropdown_${selectElement.element.id}`, {
            width: renderedSize.width,
            height: renderedSize.height,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, scene);

        // Unstyled option rows inherit the resolved select surface colors.
        const material = new BABYLON.StandardMaterial(`dropdownMaterial_${selectElement.element.id}`, scene);
        const backgroundColor = this.parseColor(style.background);
        material.diffuseColor = backgroundColor;
        material.emissiveColor = backgroundColor;
        material.disableLighting = true;
        material.backFaceCulling = false; // Prevent culling issues
        dropdownMesh.material = material;

        dropdownMesh.parent = selectElement.mesh;
        dropdownMesh.isPickable = true; // Must be pickable to block clicks to the underlying select button
        dropdownMesh.metadata = {
            isTextMesh: false,
            cursor: 'default',
            popupBackground: style.background || '#ffffff'
        }; // Ensure no text cursor
        dropdownMesh.renderingGroupId = 2; // Ensure UI layer visibility

        return dropdownMesh;
    }

    /**
     * Creates meshes for each option
     */
    private createOptionMeshes(selectElement: SelectElement, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh[] {
        const width = this.getPopupInteriorWidthCss(selectElement);
        const optionHeight = this.getPopupOptionHeightCss(style);
        const projection = this.requireProjection(selectElement);
        const renderedOptionSize = projection.projectCssSize({ width, height: optionHeight });
        const inheritedBackground = this.parseColor(style.background);

        const optionMeshes: BABYLON.Mesh[] = [];

        if (!selectElement.dropdownMesh) return [];

        // Scale not needed if we use bounds

        selectElement.options.forEach((option, index) => {
            // Background for option - minimal margin for tighter spacing
            const optionMesh = BABYLON.MeshBuilder.CreatePlane(`option_${selectElement.element.id}_${index}`, {
                width: renderedOptionSize.width,
                height: renderedOptionSize.height,
            }, scene);

            // Position relative to dropdown
            if (selectElement.dropdownMesh) {
                optionMesh.parent = selectElement.dropdownMesh;
            }
            // Position from top down with no extra spacing
            const optionCenter = projection.projectCssLocalPoint({
                x: 0,
                y: -(selectElement.popupCssSize?.height ?? 0) / 2 + index * optionHeight + optionHeight / 2,
            });
            optionMesh.position.y = optionCenter.y;
            optionMesh.position.z = 0.05; // Slightly in front of dropdown background (assuming positive Z is front)
            optionMesh.renderingGroupId = 2; // Ensure UI layer visibility

            // Create material
            const material = new BABYLON.StandardMaterial(`optionMaterial_${selectElement.element.id}_${index}`, scene);
            const baseColor = index === selectElement.activeOptionIndex
                ? BABYLON.Color3.FromHexString('#1967d2')
                : inheritedBackground;

            material.diffuseColor = baseColor;
            material.emissiveColor = baseColor; // Ensure visibility
            material.disableLighting = true;
            material.backFaceCulling = false;

            optionMesh.material = material;
            optionMesh.isPickable = !option.disabled;

            // Store option index in metadata for click handling and set cursor
            optionMesh.metadata = {
                optionIndex: index,
                selectElement: selectElement,
                cursor: option.disabled ? 'default' : 'pointer',
                popupBackground: baseColor.toHexString().toLowerCase(),
                popupActive: index === selectElement.activeOptionIndex,
                popupDisabled: !!option.disabled
            };

            // Add click handler for option selection
            if (!option.disabled) {
                optionMesh.actionManager = new BABYLON.ActionManager(scene);
                // Add hover effect - light blue like HTML select
                optionMesh.actionManager.registerAction(
                    new BABYLON.ExecuteCodeAction(
                        BABYLON.ActionManager.OnPointerOverTrigger,
                        () => {
                            const mat = optionMesh.material as BABYLON.StandardMaterial;
                            if (mat) {
                                // Light blue hover like HTML select
                                mat.diffuseColor = new BABYLON.Color3(0.7, 0.85, 1.0);
                                mat.emissiveColor = new BABYLON.Color3(0.7, 0.85, 1.0);
                            }
                        }
                    )
                );

                optionMesh.actionManager.registerAction(
                    new BABYLON.ExecuteCodeAction(
                        BABYLON.ActionManager.OnPointerOutTrigger,
                        () => {
                            const mat = optionMesh.material as BABYLON.StandardMaterial;
                            if (mat) {
                                const color = index === selectElement.activeOptionIndex
                                    ? BABYLON.Color3.FromHexString('#1967d2')
                                    : inheritedBackground;
                                mat.diffuseColor = color;
                                mat.emissiveColor = color;
                            }
                        }
                    )
                );
            }

            // Use style as-is, matching text-input behavior
            const textStyle = { ...style };
            // Use 16px to match other input elements
            textStyle.fontSize = style.fontSize || '16px';
            textStyle.color = option.disabled
                ? '#6b7280'
                : index === selectElement.activeOptionIndex ? '#ffffff' : (style.color || '#000000');
            optionMesh.metadata.popupForeground = textStyle.color;
            if (!textStyle.fontFamily) textStyle.fontFamily = 'Arial';

            try {
                const texture = this.textRenderingService.renderTextToTexture(
                    selectElement.element,
                    option.label,
                    textStyle
                );

                const textureSize = this.textRenderingService.getLogicalTextureSize(texture);

                const renderedTexture = projection.projectCssSize(textureSize);

                const textMesh = this.babylonMeshService.createTextMesh(
                    `optionText_${selectElement.element.id}_${index}`,
                    texture,
                    renderedTexture.width,
                    renderedTexture.height,
                );

                textMesh.parent = optionMesh;
                textMesh.isPickable = false;
                // Increase z-position to ensure text is in front of option background
                textMesh.position.z = 0.1;
                textMesh.renderingGroupId = 3; // Higher rendering group to ensure it's on top

                // Align text to left edge - match text-input positioning logic
                const insets = this.getHorizontalContentInsets(style);
                const textCenter = projection.projectCssLocalPoint({
                    x: -width / 2 + insets.left + textureSize.width / 2,
                    y: 0,
                });
                textMesh.position.x = textCenter.x;

            } catch (e) {
                console.error('Failed to create option text', e);
            }

            optionMeshes.push(optionMesh);
        });

        return optionMeshes;
    }

    /**
     * Positions the dropdown menu
     */
    private positionDropdown(selectElement: SelectElement): void {
        if (!selectElement.dropdownMesh) return;

        const selectHeight = selectElement.cssSize?.height ?? 0;
        const dropdownHeight = selectElement.popupCssSize?.height ?? 0;
        const popupOffset = selectHeight / 2 + dropdownHeight / 2 + 1;
        const above = this.shouldPlacePopupAbove(
            selectElement,
            dropdownHeight
        );
        const center = this.requireProjection(selectElement).projectCssLocalPoint({
            x: 0,
            y: above ? -popupOffset : popupOffset,
        });
        selectElement.dropdownMesh.position.y = center.y;
        selectElement.dropdownMesh.position.z = 0.15; // Move forward (Positive Z) to avoid Z-fighting/hiding

        // Add border to dropdown for HTML-like appearance
        this.addDropdownBorder(selectElement);
    }

    private shouldPlacePopupAbove(
        selectElement: SelectElement,
        dropdownHeight: number
    ): boolean {
        const scene = selectElement.mesh.getScene();
        const camera = scene.activeCamera;
        if (!camera) return false;

        const canvas = scene.getEngine().getRenderingCanvas();
        const viewportWidth = canvas?.clientWidth || scene.getEngine().getRenderWidth();
        const viewportHeight = canvas?.clientHeight || scene.getEngine().getRenderHeight();
        const viewport = camera.viewport.toGlobal(viewportWidth, viewportHeight);
        const projectedCenter = BABYLON.Vector3.Project(
            selectElement.mesh.getAbsolutePosition(),
            BABYLON.Matrix.IdentityReadOnly,
            scene.getTransformMatrix(),
            viewport
        );
        const selectHeightPx = selectElement.cssSize?.height ?? 0;
        const popupHeightPx = dropdownHeight;
        const gapPx = 1;
        const spaceAbove = projectedCenter.y - selectHeightPx / 2;
        const spaceBelow = viewportHeight - (projectedCenter.y + selectHeightPx / 2);
        return this.choosePopupDirection(spaceAbove, spaceBelow, popupHeightPx + gapPx) === 'above';
    }

    private choosePopupDirection(
        spaceAbove: number,
        spaceBelow: number,
        requiredSpace: number
    ): 'above' | 'below' {
        return spaceBelow < requiredSpace && spaceAbove > spaceBelow ? 'above' : 'below';
    }

    /**
     * Adds a border around the dropdown for HTML-like styling
     */
    private addDropdownBorder(selectElement: SelectElement): void {
        if (!selectElement.dropdownMesh) return;

        const scene = selectElement.dropdownMesh.getScene();
        const popupSize = selectElement.popupCssSize ?? { width: 0, height: 0 };
        const borderWidth = this.getPopupBorderWidthCss();
        const renderedSize = this.requireProjection(selectElement).projectCssSize({
            width: popupSize.width + borderWidth * 2,
            height: popupSize.height + borderWidth * 2,
        });

        // Create border as a slightly larger plane behind the dropdown
        const borderMesh = BABYLON.MeshBuilder.CreatePlane(`dropdownBorder_${selectElement.element.id}`, {
            width: renderedSize.width,
            height: renderedSize.height,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, scene);

        const borderMaterial = new BABYLON.StandardMaterial(`dropdownBorderMaterial_${selectElement.element.id}`, scene);
        borderMaterial.diffuseColor = BABYLON.Color3.FromHexString('#767676');
        borderMaterial.emissiveColor = BABYLON.Color3.FromHexString('#767676');
        borderMaterial.disableLighting = true;
        borderMaterial.backFaceCulling = false;
        borderMesh.material = borderMaterial;

        borderMesh.parent = selectElement.dropdownMesh;
        borderMesh.position.z = -0.01; // Behind the dropdown
        borderMesh.isPickable = false;
        borderMesh.renderingGroupId = 2;
    }

    private getPopupInteriorWidthCss(selectElement: SelectElement): number {
        return Math.max(0, (selectElement.cssSize?.width ?? 0) - this.getPopupBorderWidthCss() * 2);
    }

    private getPopupBorderWidthCss(): number {
        return 1;
    }

    /**
     * Updates the display with selected option
     */
    private updateDisplay(selectElement: SelectElement): void {
        // This would update the text on the display mesh
        // In production, would use TextRenderingService
        const selectedOption = selectElement.options[selectElement.selectedIndex];

    }

    /**
     * Parses options from element
     */
    private parseOptions(element: DOMElement): SelectOption[] {
        if (element.options && Array.isArray(element.options)) {
            return element.options;
        }

        // Default option if none provided
        return [{ value: '', label: 'Select an option', disabled: false }];
    }

    /**
     * Finds the initially selected index
     */
    private findSelectedIndex(options: SelectOption[], element: DOMElement): number {
        if (element.value) {
            const index = options.findIndex(o => o.value === element.value);
            if (index > -1) return index;
        }
        return 0;
    }

    /**
     * Parses size value from style
     */
    private parseSize(value: string | undefined): number | undefined {
        if (!value) return undefined;
        const num = parseFloat(value);
        return isNaN(num) ? undefined : num;
    }

    /**
     * Parses CSS color to Babylon Color3
     */
    private parseColor(color: string | undefined): BABYLON.Color3 {
        if (!color) return BABYLON.Color3.White();

        // Handle hex colors
        if (color.startsWith('#')) {
            const hex = color.substring(1);
            const r = parseInt(hex.substring(0, 2), 16) / 255;
            const g = parseInt(hex.substring(2, 4), 16) / 255;
            const b = parseInt(hex.substring(4, 6), 16) / 255;
            return new BABYLON.Color3(r, g, b);
        }

        // Handle rgb/rgba
        if (color.startsWith('rgb')) {
            const match = color.match(/\d+/g);
            if (match && match.length >= 3) {
                return new BABYLON.Color3(
                    parseInt(match[0]) / 255,
                    parseInt(match[1]) / 255,
                    parseInt(match[2]) / 255
                );
            }
        }

        // Default fallback
        return BABYLON.Color3.White();
    }

    private getPopupOptionHeightCss(style: StyleRule): number {
        const fontSize = Math.max(1, this.parseSize(style.fontSize) || 16);
        return Math.max(18, fontSize + 10);
    }

    /** Releases a mesh-local material without disposing its cache-owned text texture. */
    private disposeDisplayMesh(mesh: BABYLON.AbstractMesh): void {
        const material = mesh.material;
        mesh.material = null;
        mesh.dispose();
        material?.dispose(false, false);
    }

    private redrawDisplay(selectElement: SelectElement, displayIndex: number): void {
        if (!selectElement.displayMesh) return;
        this.disposeDisplayMesh(selectElement.displayMesh);
        selectElement.displayMesh = this.createDisplayMeshWithStoredScale(
            selectElement,
            selectElement.style,
            displayIndex
        );
    }

    private disposeOptionMeshes(selectElement: SelectElement): void {
        for (const optionMesh of selectElement.optionMeshes) {
            const meshes = [...optionMesh.getChildMeshes(false), optionMesh];
            for (const mesh of meshes) {
                const material = mesh.material;
                mesh.material = null;
                mesh.dispose();
                material?.dispose(false, false);
            }
        }
        selectElement.optionMeshes = [];
    }

    private disposeDropdownMesh(selectElement: SelectElement): void {
        const dropdown = selectElement.dropdownMesh;
        if (!dropdown) return;
        const meshes = [...dropdown.getChildMeshes(false), dropdown];
        for (const mesh of meshes) {
            if (mesh.isDisposed()) continue;
            const material = mesh.material;
            mesh.material = null;
            mesh.dispose(false, false);
            material?.dispose(false, false);
        }
        selectElement.dropdownMesh = undefined;
    }

    /**
     * Cleanup select resources
     */
    disposeSelect(selectElement: SelectElement): void {
        if (selectElement.dropdownOpen) {
            this.closeDropdown(selectElement);
        } else {
            // A rebuilt control can inherit the ID of an observer owned by the
            // removed popup lifetime. Disposal must clear that registration too.
            this.removeClickAwayListener(selectElement);
            this.disposeOptionMeshes(selectElement);
            this.disposeDropdownMesh(selectElement);
        }

        if (selectElement.displayMesh) {
            this.disposeDisplayMesh(selectElement.displayMesh);
            selectElement.displayMesh = undefined;
        }

        if (selectElement.mesh) {
            selectElement.mesh.dispose();
        }
        this.projections.delete(selectElement);
    }

    private requireProjection(selectElement: SelectElement): SelectPaintProjection {
        const projection = this.projections.get(selectElement);
        if (!projection) {
            throw new Error(`Missing CSS paint projection for select ${selectElement.element.id || '<anonymous>'}`);
        }
        return projection;
    }
}
