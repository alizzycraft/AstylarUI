import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { BabylonRender } from '../interfaces/render.types';
import { DOMElement } from '../../../types/dom-element';
import { SelectElement, SelectOption, InputType, ValidationState } from '../../../types/input-types';
import { StyleRule } from '../../../types/style-rule';
import { TextRenderingService } from '../../text/text-rendering.service';
import { BabylonMeshService } from '../../babylon-mesh.service';
import { CONTROL_CONTENT_Z_OFFSET } from '../render-depth.constants';

/**
 * Service responsible for managing select dropdown elements
 */
@Injectable({
    providedIn: 'root'
})
export class SelectManager {
    private readonly SELECT_HEIGHT = 0.5;
    private readonly OPTION_HEIGHT = 0.4;
    private readonly DROPDOWN_MAX_HEIGHT = 2.0;

    // Track click-away observers for each open dropdown
    private clickAwayObservers: Map<string, BABYLON.Observer<BABYLON.PointerInfo>> = new Map();

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
        worldDimensions: { width: number; height: number }
    ): SelectElement {
        if (!render.scene) {
            throw new Error('Scene is required to create select element');
        }

        // Create select field mesh
        const selectMesh = this.createSelectMesh(element, render, style, worldDimensions);

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
            mesh: selectMesh
        };

        // Create display mesh for selected value
        selectElement.displayMesh = this.createDisplayMesh(selectElement, render, style);

        // Store camera scale for consistent text sizing across select and dropdown
        selectElement.cameraScale = render.actions.camera.getPixelToWorldScale();

        // Pointer defaults are owned by the scene interaction runtime.
        if (selectElement.mesh) {
            selectElement.mesh.metadata = { ...selectElement.mesh.metadata, cursor: 'pointer' };
        }

        return selectElement;
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
            this.clickAwayObservers.set(elementId, observer);
        }
    }

    /**
     * Removes click-away listener for dropdown
     */
    private removeClickAwayListener(selectElement: SelectElement): void {
        const elementId = selectElement.element.id || '';
        const observer = this.clickAwayObservers.get(elementId);

        if (observer) {
            const scene = selectElement.mesh.getScene();
            scene.onPointerObservable.remove(observer);
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
    private createSelectMesh(element: DOMElement, render: BabylonRender, style: StyleRule, worldDimensions: { width: number; height: number }): BABYLON.Mesh {
        const width = worldDimensions.width;
        const height = worldDimensions.height;

        // Use plane instead of box for 2D consistency
        const selectMesh = BABYLON.MeshBuilder.CreatePlane(`select_${element.id}`, {
            width,
            height,
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
            const textureSize = texture.getSize();
            const textureWidthPx = textureSize.width;
            const textureHeightPx = textureSize.height;

            // Use stored camera scale for consistency
            const scale = selectElement.cameraScale || 0.001;
            const textureWidth = textureWidthPx * scale;
            const textureHeight = textureHeightPx * scale;

            // Create text mesh using BabylonMeshService
            const displayPlane = this.babylonMeshService.createTextMesh(
                `selectDisplay_${selectElement.element.id}`,
                texture,
                textureWidth,
                textureHeight
            );

            displayPlane.parent = selectElement.mesh;
            // Rotate the text mesh 180 degrees around the Z axis to fix horizontal flipping
            displayPlane.rotation.z = Math.PI;

            // Ensure display text sits IN FRONT of the Select Mesh (Positive Z, assuming Front is Positive)
            displayPlane.position.z = CONTROL_CONTENT_Z_OFFSET;
            displayPlane.isPickable = false;

            // Align text to the CSS content edge.
            const selectWidth = selectElement.mesh.getBoundingInfo().boundingBox.extendSize.x * 2;
            const insets = this.getHorizontalContentInsets(style, scale);
            displayPlane.position.x = (selectWidth / 2) - (textureWidth / 2) - insets.left;

            return displayPlane;

        } catch (error) {
            console.error('Error creating select display:', error);
            // Fallback
            const scene = selectElement.mesh.getScene();
            return BABYLON.MeshBuilder.CreatePlane(`selectDisplay_${selectElement.element.id}_fallback`, {
                width: 1.8,
                height: 0.3
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
            const textureSize = texture.getSize();
            const textureWidthPx = textureSize.width;
            const textureHeightPx = textureSize.height;

            // Convert to world units using camera's pixel-to-world scale (same as button)
            const scale = render.actions.camera.getPixelToWorldScale();
            const textureWidth = textureWidthPx * scale;
            const textureHeight = textureHeightPx * scale;

            // Create text mesh using BabylonMeshService
            const displayPlane = this.babylonMeshService.createTextMesh(
                `selectDisplay_${selectElement.element.id}`,
                texture,
                textureWidth,
                textureHeight
            );

            // Rotate the text mesh 180 degrees around the Z axis to fix horizontal flipping without affecting vertical orientation
            displayPlane.rotation.z = Math.PI;

            displayPlane.parent = selectElement.mesh;
            // Ensure display text sits IN FRONT of the Select Mesh (Positive Z, assuming Front is Positive)
            displayPlane.position.z = CONTROL_CONTENT_Z_OFFSET;
            displayPlane.isPickable = false;

            // Align text to the CSS content edge.
            const selectWidth = selectElement.mesh.getBoundingInfo().boundingBox.extendSize.x * 2;
            const insets = this.getHorizontalContentInsets(style, scale);
            displayPlane.position.x = (selectWidth / 2) - (textureWidth / 2) - insets.left;

            return displayPlane;

        } catch (error) {
            console.error('Error creating select display:', error);
            // Fallback
            return BABYLON.MeshBuilder.CreatePlane(`selectDisplay_${selectElement.element.id}_fallback`, {
                width: 1.8,
                height: 0.3
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

    private getHorizontalContentInsets(
        style: StyleRule,
        scale: number
    ): { left: number; right: number } {
        const padding = this.parseHorizontalBoxShorthand(style.padding);
        const border = Math.max(0, this.parseSize(style.borderWidth) || 0);
        const left = Math.max(0, this.parseSize(style.paddingLeft) ?? padding.left);
        const right = Math.max(0, this.parseSize(style.paddingRight) ?? padding.right);

        return {
            left: (border + left) * scale,
            right: (border + right) * scale
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
        // Use proper world width from parent select mesh to match dimensions exactly
        const bounds = selectElement.mesh.getBoundingInfo().boundingBox.extendSize;
        const width = bounds.x * 2;

        const optionHeight = this.getPopupOptionHeight(selectElement, style);

        const optionsCount = selectElement.options.length;
        // Limit max height to e.g. 5 items
        const maxHeight = optionHeight * 5;
        const height = Math.min(optionsCount * optionHeight, maxHeight);

        // Use plane instead of box for better 2D rendering
        const dropdownMesh = BABYLON.MeshBuilder.CreatePlane(`dropdown_${selectElement.element.id}`, {
            width: width,
            height: height,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, scene);

        // Create material with white background and subtle border
        const material = new BABYLON.StandardMaterial(`dropdownMaterial_${selectElement.element.id}`, scene);
        material.diffuseColor = BABYLON.Color3.White(); // Pure white like HTML select
        material.emissiveColor = BABYLON.Color3.White(); // Ensure visibility without light
        material.disableLighting = true;
        material.backFaceCulling = false; // Prevent culling issues
        dropdownMesh.material = material;

        dropdownMesh.parent = selectElement.mesh;
        dropdownMesh.isPickable = true; // Must be pickable to block clicks to the underlying select button
        dropdownMesh.metadata = { isTextMesh: false, cursor: 'default' }; // Ensure no text cursor
        dropdownMesh.renderingGroupId = 2; // Ensure UI layer visibility

        return dropdownMesh;
    }

    /**
     * Creates meshes for each option
     */
    private createOptionMeshes(selectElement: SelectElement, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh[] {
        // Use proper world width from parent select mesh
        const bounds = selectElement.mesh.getBoundingInfo().boundingBox.extendSize;
        const width = bounds.x * 2;
        const optionHeight = this.getPopupOptionHeight(selectElement, style);

        const optionMeshes: BABYLON.Mesh[] = [];

        if (!selectElement.dropdownMesh) return [];

        // Scale not needed if we use bounds

        selectElement.options.forEach((option, index) => {
            // Background for option - minimal margin for tighter spacing
            const optionMesh = BABYLON.MeshBuilder.CreatePlane(`option_${selectElement.element.id}_${index}`, {
                width,
                height: optionHeight
            }, scene);

            // Position relative to dropdown
            if (selectElement.dropdownMesh) {
                optionMesh.parent = selectElement.dropdownMesh;
            }
            // Position from top down with no extra spacing
            optionMesh.position.y = (selectElement.options.length * optionHeight / 2) - (index * optionHeight) - (optionHeight / 2);
            optionMesh.position.z = 0.05; // Slightly in front of dropdown background (assuming positive Z is front)
            optionMesh.renderingGroupId = 2; // Ensure UI layer visibility

            // Create material
            const material = new BABYLON.StandardMaterial(`optionMaterial_${selectElement.element.id}_${index}`, scene);
            const baseColor = index === selectElement.activeOptionIndex
                ? BABYLON.Color3.FromHexString('#1967d2')
                : BABYLON.Color3.White();

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
                cursor: option.disabled ? 'default' : 'pointer'
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
                                    : BABYLON.Color3.White();
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
                : index === selectElement.activeOptionIndex ? '#ffffff' : '#000000';
            if (!textStyle.fontFamily) textStyle.fontFamily = 'Arial';

            try {
                const texture = this.textRenderingService.renderTextToTexture(
                    selectElement.element,
                    option.label,
                    textStyle
                );

                const textureSize = texture.getSize();

                // Use the same camera scale as the select display for consistency
                const cameraScale = selectElement.cameraScale || 0.001;

                const textureWidth = textureSize.width * cameraScale;
                const textureHeight = textureSize.height * cameraScale;

                const textMesh = this.babylonMeshService.createTextMesh(
                    `optionText_${selectElement.element.id}_${index}`,
                    texture,
                    textureWidth,
                    textureHeight
                );

                // Rotate the text mesh 180 degrees around the Z axis to fix horizontal flipping without affecting vertical orientation
                textMesh.rotation.z = Math.PI;

                textMesh.parent = optionMesh;
                textMesh.isPickable = false;
                // Increase z-position to ensure text is in front of option background
                textMesh.position.z = 0.1;
                textMesh.renderingGroupId = 3; // Higher rendering group to ensure it's on top

                // Align text to left edge - match text-input positioning logic
                const insets = this.getHorizontalContentInsets(style, cameraScale);
                textMesh.position.x = (width / 2) - (textureWidth / 2) - insets.left;

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

        // Position dropdown below select field
        // Use actual mesh height instead of hardcoded constant to prevent overlap
        const selectHeight = selectElement.mesh.getBoundingInfo().boundingBox.extendSize.y * 2;
        const dropdownHeight = selectElement.dropdownMesh.getBoundingInfo().boundingBox.extendSize.y * 2;

        const nativePopupGap = selectElement.cameraScale || 0.001;
        const popupOffset = selectHeight / 2 + dropdownHeight / 2 + nativePopupGap;
        selectElement.dropdownMesh.position.y = this.shouldPlacePopupAbove(
            selectElement,
            dropdownHeight
        ) ? popupOffset : -popupOffset;
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
        const scale = selectElement.cameraScale || 0.001;
        const selectHeight = selectElement.mesh.getBoundingInfo().boundingBox.extendSize.y * 2;
        const selectHeightPx = selectHeight / scale;
        const popupHeightPx = dropdownHeight / scale;
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
        const bounds = selectElement.dropdownMesh.getBoundingInfo().boundingBox.extendSize;
        const width = bounds.x * 2;
        const height = bounds.y * 2;
        const borderWidth = selectElement.cameraScale || 0.001;

        // Create border as a slightly larger plane behind the dropdown
        const borderMesh = BABYLON.MeshBuilder.CreatePlane(`dropdownBorder_${selectElement.element.id}`, {
            width: width + borderWidth * 2,
            height: height + borderWidth * 2,
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

    private getPopupOptionHeight(selectElement: SelectElement, style: StyleRule): number {
        const scale = selectElement.cameraScale || 0.001;
        const fontSize = Math.max(1, this.parseSize(style.fontSize) || 16);
        return Math.max(18, fontSize + 10) * scale;
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
    }
}
