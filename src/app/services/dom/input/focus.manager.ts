import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { InputElement, TextInput, InputType } from '../../../types/input-types';
import { TextCursorRenderer } from './text-cursor.renderer';
import { TextInputManager } from './text-input.manager';
import { BabylonCameraService } from '../../babylon-camera.service';

/**
 * Service responsible for managing focus state and tab navigation
 */
@Injectable({
    providedIn: 'root'
})
export class FocusManager {
    private focusedElement: InputElement | null = null;
    private tabOrder: InputElement[] = [];
    private focusIndicators: Map<string, BABYLON.Mesh[]> = new Map();
    private defaultFocusIndicatorEnabled: Map<string, boolean> = new Map();

    constructor(
        private cursorRenderer: TextCursorRenderer,
        private textInputManager: TextInputManager,
        private cameraService: BabylonCameraService
    ) { }

    /**
     * Focuses an input element
     */
    focusElement(inputElement: InputElement): void {
        // Blur previously focused element
        if (this.focusedElement && this.focusedElement !== inputElement) {
            this.blurElement(this.focusedElement);
        }

        this.focusedElement = inputElement;
        inputElement.focused = true;

        // Authored :focus paint can replace Astylar's fallback indicator.
        if (this.defaultFocusIndicatorEnabled.get(inputElement.element.id || '') !== false) {
            this.showFocusIndicator(inputElement);
        } else {
            this.hideFocusIndicator(inputElement);
        }

        // Handle text input focus (hide placeholder, start cursor blinking)
        if (this.isTextInput(inputElement)) {
            // Create a minimal render object for cursor creation
            const scene = inputElement.mesh.getScene();
            
            const render = {
                scene: scene,
                actions: {
                    camera: this.cameraService
                }
            } as any;
            
            // Use stored style from input element
            const style = inputElement.style;
            
            this.textInputManager.handleFocus(inputElement as TextInput, render, style);
            this.cursorRenderer.startBlinking(inputElement as TextInput);
        }

        // Mark as touched
        inputElement.validationState.touched = true;
    }

    /**
     * Removes focus from an input element
     */
    blurElement(inputElement: InputElement): void {
        inputElement.focused = false;

        // Hide focus indicator
        this.hideFocusIndicator(inputElement);

        // Handle text input blur (show placeholder if empty, stop cursor blinking)
        if (this.isTextInput(inputElement)) {
            this.textInputManager.handleBlur(inputElement as TextInput);
            this.cursorRenderer.stopBlinking(inputElement as TextInput);
        }

        if (this.focusedElement === inputElement) {
            this.focusedElement = null;
        }
    }

    /**
     * Handles tab navigation
     */
    handleTabNavigation(forward: boolean = true): void {
        if (this.tabOrder.length === 0) return;

        const currentIndex = this.focusedElement
            ? this.tabOrder.indexOf(this.focusedElement)
            : -1;

        let nextIndex: number;
        if (forward) {
            nextIndex = (currentIndex + 1) % this.tabOrder.length;
        } else {
            nextIndex = currentIndex <= 0 ? this.tabOrder.length - 1 : currentIndex - 1;
        }

        // Skip disabled elements
        let attempts = 0;
        while (this.tabOrder[nextIndex].disabled && attempts < this.tabOrder.length) {
            if (forward) {
                nextIndex = (nextIndex + 1) % this.tabOrder.length;
            } else {
                nextIndex = nextIndex <= 0 ? this.tabOrder.length - 1 : nextIndex - 1;
            }
            attempts++;
        }

        if (!this.tabOrder[nextIndex].disabled) {
            this.focusElement(this.tabOrder[nextIndex]);
        }
    }

    /**
     * Builds the tab order from input elements
     */
    buildTabOrder(inputElements: InputElement[]): void {
        // Sort by tabindex if specified, otherwise by DOM order
        this.tabOrder = inputElements.sort((a, b) => {
            const aTabIndex = a.element.tabindex ?? 0;
            const bTabIndex = b.element.tabindex ?? 0;

            if (aTabIndex !== bTabIndex) {
                return aTabIndex - bTabIndex;
            }

            // Maintain DOM order for same tabindex
            return 0;
        });
    }

    /**
     * Adds an input element to the tab order
     */
    addToTabOrder(inputElement: InputElement): void {
        if (!this.tabOrder.includes(inputElement)) {
            this.tabOrder.push(inputElement);
            this.buildTabOrder(this.tabOrder);
        }
    }

    /**
     * Removes an input element from the tab order
     */
    removeFromTabOrder(inputElement: InputElement): void {
        const index = this.tabOrder.indexOf(inputElement);
        if (index > -1) {
            this.tabOrder.splice(index, 1);
        }

        // Remove focus indicator
        this.disposeFocusIndicator(inputElement);
        this.defaultFocusIndicatorEnabled.delete(inputElement.element.id || '');
    }

    /**
     * Shows visual focus indicator
     */
    private showFocusIndicator(inputElement: InputElement): void {
        const elementId = inputElement.element.id || '';
        let indicator = this.focusIndicators.get(elementId);

        if (!indicator) {
            indicator = this.createFocusIndicator(inputElement);
            this.focusIndicators.set(elementId, indicator);
        }

        indicator.forEach(mesh => mesh.isVisible = true);
    }

    /**
     * Hides visual focus indicator
     */
    private hideFocusIndicator(inputElement: InputElement): void {
        const elementId = inputElement.element.id || '';
        const indicator = this.focusIndicators.get(elementId);

        if (indicator) {
            indicator.forEach(mesh => mesh.isVisible = false);
        }
    }

    /**
     * Creates a focus indicator mesh
     */
    private createFocusIndicator(inputElement: InputElement): BABYLON.Mesh[] {
        const scene = inputElement.mesh.getScene();
        const bounds = inputElement.mesh.getBoundingInfo().boundingBox;
        const width = bounds.extendSize.x * 2;
        const height = bounds.extendSize.y * 2;

        const pixelScale = this.cameraService.getPixelToWorldScale();
        const outlineOffset = 2 * pixelScale;
        const outlineWidth = 3 * pixelScale;
        const outerWidth = width + 2 * (outlineOffset + outlineWidth);
        const outerHeight = height + 2 * (outlineOffset + outlineWidth);
        const elementId = inputElement.element.id;
        const createBar = (suffix: string, barWidth: number, barHeight: number): BABYLON.Mesh =>
            BABYLON.MeshBuilder.CreatePlane(`focusIndicator_${elementId}_${suffix}`, {
                width: barWidth,
                height: barHeight,
            }, scene);
        const top = createBar('top', outerWidth, outlineWidth);
        const bottom = createBar('bottom', outerWidth, outlineWidth);
        const left = createBar('left', outlineWidth, outerHeight - 2 * outlineWidth);
        const right = createBar('right', outlineWidth, outerHeight - 2 * outlineWidth);
        top.position.y = height / 2 + outlineOffset + outlineWidth / 2;
        bottom.position.y = -top.position.y;
        left.position.x = width / 2 + outlineOffset + outlineWidth / 2;
        right.position.x = -left.position.x;
        const indicators = [top, bottom, left, right];
        const material = new BABYLON.StandardMaterial(`focusIndicatorMaterial_${inputElement.element.id}`, scene);
        material.diffuseColor = BABYLON.Color3.FromHexString('#60A5FA');
        material.emissiveColor = BABYLON.Color3.FromHexString('#60A5FA');
        material.specularColor = BABYLON.Color3.Black();
        material.disableLighting = true;
        material.backFaceCulling = false;
        indicators.forEach(indicator => {
            indicator.parent = inputElement.mesh;
            indicator.position.z = -0.02;
            indicator.material = material;
            indicator.isPickable = false;
            indicator.isVisible = false;
        });
        return indicators;
    }

    /**
     * Disposes focus indicator
     */
    private disposeFocusIndicator(inputElement: InputElement): void {
        const elementId = inputElement.element.id || '';
        const indicator = this.focusIndicators.get(elementId);

        if (indicator) {
            const materials = new Set(indicator.map(mesh => mesh.material).filter(Boolean));
            indicator.forEach(mesh => mesh.dispose());
            materials.forEach(material => material?.dispose());
            this.focusIndicators.delete(elementId);
        }
    }

    /**
     * Gets the currently focused element
     */
    getFocusedElement(): InputElement | null {
        return this.focusedElement;
    }

    /**
     * Checks if an element is focused
     */
    isFocused(inputElement: InputElement): boolean {
        return this.focusedElement === inputElement;
    }

    /** Enables or suppresses the fallback ring for one authored element. */
    setDefaultFocusIndicatorEnabled(elementId: string, enabled: boolean): void {
        this.defaultFocusIndicatorEnabled.set(elementId, enabled);
        if (!enabled && this.focusedElement?.element.id === elementId) {
            this.hideFocusIndicator(this.focusedElement);
        }
    }

    /**
     * Helper to check if input is a text input
     */
    private isTextInput(inputElement: InputElement): boolean {
        return inputElement.type === InputType.Text ||
            inputElement.type === InputType.Password ||
            inputElement.type === InputType.Email ||
            inputElement.type === InputType.Number ||
            inputElement.type === InputType.Textarea;
    }

    /**
     * Cleanup all focus resources
     */
    cleanup(): void {
        this.focusIndicators.forEach(indicator => {
            const materials = new Set(indicator.map(mesh => mesh.material).filter(Boolean));
            indicator.forEach(mesh => mesh.dispose());
            materials.forEach(material => material?.dispose());
        });
        this.focusIndicators.clear();
        this.defaultFocusIndicatorEnabled.clear();
        this.tabOrder = [];
        this.focusedElement = null;
    }
}
