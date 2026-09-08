import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { Button, ButtonState, InputType, ValidationState, ButtonInteraction } from '../../../types/input-types';
import { StyleRule } from '../../../types/style-rule';
import { BabylonRender } from '../interfaces/render.types';
import { TextRenderingService } from '../../text/text-rendering.service';
import { ElementBorderService } from '../elements/element-border.service';
import { BabylonMeshService } from '../../babylon-mesh.service';
import { CONTROL_CONTENT_Z_OFFSET } from '../render-depth.constants';
import type { CssSize } from '../../coordinate-space.types';

/**
 * Service responsible for managing button elements
 */
@Injectable({
    providedIn: 'root'
})
export class ButtonManager {
    constructor(
        private textRenderingService: TextRenderingService,
        private borderService: ElementBorderService,
        private babylonMeshService: BabylonMeshService
    ) { }

    /**
     * Creates a button element
     */
    createButton(
        element: DOMElement,
        render: BabylonRender,
        style: StyleRule,
        dimensions: CssSize
    ): Button {
        if (!render.scene) {
            throw new Error('Scene is required to create button');
        }

        // Create button mesh
        const buttonMesh = this.createButtonMesh(element, render, style, dimensions);

        // Initialize validation state
        const validationState: ValidationState = {
            valid: true,
            errors: [],
            touched: false,
            dirty: false
        };

        // Determine button type
        const buttonType = this.determineButtonType(element);

        // Create button object
        const button: Button = {
            element,
            type: InputType.Button,
            style, // Store style
            value: element.value ?? element.textContent ?? '',
            label: element.value ?? element.textContent ?? '',
            state: ButtonState.Normal,
            buttonType,
            focused: false,
            disabled: element.disabled || false,
            required: false,
            validationRules: [],
            validationState,
            mesh: buttonMesh,
            cssSize: { ...dimensions },
        };

        // Create label mesh
        if (button.label) {
            button.labelMesh = this.createLabelMesh(button, render, style);
        }

        // Apply initial state styling
        this.updateButtonState(button, ButtonState.Normal);

        return button;
    }

    /**
     * Handles button click interaction
     */
    handleButtonClick(button: Button): void {
        if (button.disabled) return;
        this.executeButtonAction(button);
    }

    /**
     * Handles button hover interaction
     */
    handleButtonHover(button: Button, isHovering: boolean): void {
        if (button.disabled) return;

        if (isHovering) {
            if (button.state !== ButtonState.Pressed) {
                this.updateButtonState(button, ButtonState.Hover);
            }
        } else {
            if (button.state === ButtonState.Hover) {
                this.updateButtonState(button, button.focused ? ButtonState.Focused : ButtonState.Normal);
            }
        }
    }

    /**
     * Handles button interaction
     */
    handleButtonInteraction(button: Button, interaction: ButtonInteraction): void {
        if (button.disabled) return;

        switch (interaction) {
            case ButtonInteraction.Click:
                this.handleButtonClick(button);
                break;
            case ButtonInteraction.Hover:
                this.handleButtonHover(button, true);
                break;
            case ButtonInteraction.Press:
                this.updateButtonState(button, ButtonState.Pressed);
                break;
            case ButtonInteraction.Release:
                this.updateButtonState(button, ButtonState.Normal);
                break;
        }
    }

    /**
     * Updates button visual state
     */
    updateButtonState(button: Button, state: ButtonState): void {
        button.state = state;

        const material = button.mesh.material as BABYLON.StandardMaterial;
        if (!material) return;

        switch (state) {
            case ButtonState.Normal:
                material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
                material.emissiveColor = BABYLON.Color3.Black();
                break;

            case ButtonState.Hover:
                material.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
                material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                break;

            case ButtonState.Pressed:
                material.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
                material.emissiveColor = BABYLON.Color3.Black();
                break;

            case ButtonState.Disabled:
                material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                material.emissiveColor = BABYLON.Color3.Black();
                material.alpha = 0.5;
                break;

            case ButtonState.Focused:
                material.diffuseColor = new BABYLON.Color3(0.85, 0.85, 0.85);
                material.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.8);
                break;
        }
    }

    /**
     * Executes the button's associated action
     */
    executeButtonAction(button: Button): void {
        // Execute custom action if provided
        if (button.action) {
            button.action();
        }

        // Handle form submission for submit buttons
        if (button.buttonType === 'submit') {
            // This would trigger form submission
            // Will be handled by FormManager

        }

        // Handle reset for reset buttons
        if (button.buttonType === 'reset') {

        }

    }

    /**
     * Creates the button mesh
     */
    private createButtonMesh(
        element: DOMElement,
        render: BabylonRender,
        style: StyleRule,
        dimensions: CssSize
    ): BABYLON.Mesh {
        const size = render.actions.camera.projectCssSize(dimensions);

        // Parse border radius
        const borderRadiusPixels = this.borderService.parseBorderRadius(style?.borderRadius);
        const borderRadius = render.actions.camera.projectCssSize({
            width: borderRadiusPixels,
            height: borderRadiusPixels,
        }).width;

        const buttonMesh = render.actions.mesh.createPolygon(
            `button_${element.id}`,
            'rectangle',
            size.width,
            size.height,
            borderRadius,
        );

        const material = new BABYLON.StandardMaterial(`buttonMaterial_${element.id}`, render.scene);
        material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        buttonMesh.material = material;
        buttonMesh.isPickable = true;

        return buttonMesh;
    }

    /**
     * Creates the button label mesh
     */
    private createLabelMesh(button: Button, render: BabylonRender, style: StyleRule): BABYLON.Mesh {
        const textContent = button.label;

        const textStyle = { ...style };
        if (!textStyle.fontSize) textStyle.fontSize = '16px';
        if (!textStyle.fontFamily) textStyle.fontFamily = 'Arial';
        if (!textStyle.color) textStyle.color = '#000000';

        try {
            const texture = this.textRenderingService.renderTextToTexture(
                button.element,
                textContent,
                textStyle
            );

            // Get texture dimensions
            const textureSize = this.textRenderingService.getLogicalTextureSize(texture);
            const textureWidthPx = textureSize.width;
            const textureHeightPx = textureSize.height;

            const textureSizeWorld = render.actions.camera.projectCssSize({
                width: textureWidthPx,
                height: textureHeightPx,
            });
            const textureWidth = textureSizeWorld.width;
            const textureHeight = textureSizeWorld.height;

            // Use BabylonMeshService to create text mesh (same as working text elements)
            const labelPlane = this.babylonMeshService.createTextMesh(
                `buttonLabel_${button.element.id}`,
                texture,
                textureWidth,
                textureHeight
            );

            labelPlane.parent = button.mesh;
            // The texture contains a browser-aligned CSS line box. Keep that
            // box geometrically centered; glyph-dependent optical offsets
            // move every button label away from its authored alignment.
            labelPlane.position.y = 0;
            labelPlane.position.z = CONTROL_CONTENT_Z_OFFSET;
            labelPlane.isPickable = false;
            const textAlign = style.textAlign?.toLowerCase();
            const buttonWidth = button.cssSize?.width ?? 0;
            if (textAlign === 'left' || textAlign === 'start') {
                const point = render.actions.camera.projectCssLocalPoint({
                    x: -buttonWidth / 2 + this.parsePaddingSide(style, 'left') + textureWidthPx / 2,
                    y: 0,
                });
                labelPlane.position.x = point.x;
            } else if (textAlign === 'right' || textAlign === 'end') {
                const point = render.actions.camera.projectCssLocalPoint({
                    x: buttonWidth / 2 - this.parsePaddingSide(style, 'right') - textureWidthPx / 2,
                    y: 0,
                });
                labelPlane.position.x = point.x;
            }
            if (labelPlane.material) {
                labelPlane.material.alpha = render.actions.style.parseOpacity(style.opacity);
            }

            return labelPlane;
        } catch (error) {
            console.error('Error creating button label:', error);
            const fallbackSize = render.actions.camera.projectCssSize({
                width: 120,
                height: 30,
            });
            const labelPlane = BABYLON.MeshBuilder.CreatePlane(`buttonLabel_${button.element.id}_fallback`, {
                width: fallbackSize.width,
                height: fallbackSize.height,
            }, render.scene);

            labelPlane.parent = button.mesh;
            labelPlane.position.z = CONTROL_CONTENT_Z_OFFSET;

            const material = new BABYLON.StandardMaterial(`labelMaterial_${button.element.id}`, render.scene);
            material.diffuseColor = BABYLON.Color3.Black();
            labelPlane.material = material;

            return labelPlane;
        }
    }

    /**
     * Determines button type from element
     */
    private determineButtonType(element: DOMElement): 'button' | 'submit' | 'reset' {
        const type = element.inputType?.toLowerCase();
        if (type === 'submit') return 'submit';
        if (type === 'reset') return 'reset';
        return 'button';
    }

    private parsePaddingSide(style: StyleRule, side: 'left' | 'right'): number {
        const explicit = side === 'left' ? style.paddingLeft : style.paddingRight;
        if (explicit !== undefined) return Number.parseFloat(explicit) || 0;
        const parts = style.padding?.trim().split(/\s+/).map(value => Number.parseFloat(value) || 0) ?? [];
        if (parts.length === 1) return parts[0];
        if (parts.length === 2 || parts.length === 3) return parts[1];
        if (parts.length >= 4) return side === 'right' ? parts[1] : parts[3];
        return 0;
    }

    /**
     * Sets button action callback
     */
    setButtonAction(button: Button, action: () => void): void {
        button.action = action;
    }

    /**
     * Enables or disables button
     */
    setButtonDisabled(button: Button, disabled: boolean): void {
        button.disabled = disabled;
        this.updateButtonState(button, disabled ? ButtonState.Disabled : ButtonState.Normal);
    }

    /**
     * Cleanup button resources
     */
    disposeButton(button: Button): void {
        if (button.labelMesh) {
            button.labelMesh.dispose();
        }

        if (button.mesh) {
            button.mesh.dispose();
        }
    }
}
