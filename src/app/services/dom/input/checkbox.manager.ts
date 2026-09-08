import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { BabylonRender } from '../interfaces/render.types';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { CheckboxInput, RadioInput, InputType, ValidationState } from '../../../types/input-types';
import { TextRenderingService } from '../../text/text-rendering.service';
import { BabylonMeshService } from '../../babylon-mesh.service';
import { CONTROL_CONTENT_Z_OFFSET } from '../render-depth.constants';
import type { CssSize } from '../../coordinate-space.types';

@Injectable({
    providedIn: 'root'
})
export class CheckboxManager {
    private readonly CHECKBOX_SIZE_PX = 50;
    private radioGroups: Map<string, RadioInput[]> = new Map();

    constructor(
        private textRenderingService: TextRenderingService,
        private babylonMeshService: BabylonMeshService
    ) { }

    /**
     * Creates a checkbox input
     */
    createCheckbox(element: DOMElement, render: BabylonRender, style: StyleRule, dimensions: CssSize): CheckboxInput {
        if (!render.scene) {
            throw new Error('Scene is required to create checkbox');
        }

        const mesh = this.createCheckboxMesh(element, render, style, dimensions);

        const checkbox: CheckboxInput = {
            type: InputType.Checkbox,
            element: element,
            mesh: mesh,
            style: style,
            value: element.value ?? 'on',
            focused: false,
            disabled: element.disabled || false,
            required: element.required || false,
            validationRules: [],
            validationState: {
                valid: true,
                errors: [],
                touched: false,
                dirty: false
            },
            checked: element.checked || false,
            checkIndicatorMesh: undefined, // Will be created
            labelMesh: undefined, // Will be created
            cssSize: { ...dimensions },
        };

        if (style.appearance !== 'none') {
            checkbox.checkIndicatorMesh = this.createCheckIndicator(checkbox, render);
        }
        if (element.value || element.textContent) {
            checkbox.labelMesh = this.createLabelMesh(checkbox, render, style);
        }

        // Set cursor metadata; scene-owned interaction applies activation.
        if (checkbox.mesh) {
            checkbox.mesh.metadata = { ...checkbox.mesh.metadata, cursor: 'pointer', isTextMesh: false };
        }

        return checkbox;
    }

    /**
     * Creates a radio button input
     */
    createRadioButton(element: DOMElement, render: BabylonRender, style: StyleRule, dimensions: CssSize): RadioInput {
        if (!render.scene) {
            throw new Error('Scene is required to create radio button');
        }

        const mesh = this.createRadioMesh(element, render, dimensions);

        const radio: RadioInput = {
            type: InputType.Radio,
            element: element,
            mesh: mesh,
            style: style, // Store style
            value: element.value ?? 'on',
            focused: false,
            disabled: element.disabled || false,
            required: element.required || false,
            validationRules: [],
            validationState: {
                valid: true,
                errors: [],
                touched: false,
                dirty: false
            },
            checked: element.checked || false,
            groupName: element.name || 'default',
            selectionIndicatorMesh: undefined, // Will be created
            labelMesh: undefined, // Will be created
            cssSize: { ...dimensions },
        };

        radio.selectionIndicatorMesh = this.createSelectionIndicator(radio, render);
        if (element.value || element.textContent) {
            radio.labelMesh = this.createLabelMesh(radio, render, style);
        }

        // Set cursor metadata; scene-owned interaction applies activation.
        if (radio.mesh) {
            radio.mesh.metadata = { ...radio.mesh.metadata, cursor: 'pointer', isTextMesh: false };
        }

        this.registerRadioButton(radio);

        return radio;
    }

    /**
     * Toggles checkbox state
     */
    toggleCheckbox(checkbox: CheckboxInput): void {
        if (checkbox.disabled) return;

        this.setCheckboxChecked(checkbox, !checkbox.checked);
    }

    setCheckboxChecked(checkbox: CheckboxInput, checked: boolean): void {
        checkbox.checked = checked;
        this.updateCheckIndicator(checkbox);
    }

    /**
     * Selects a radio button
     */
    selectRadioButton(radio: RadioInput): void {
        if (radio.disabled || radio.checked) return;

        // Uncheck all others in group
        const group = this.radioGroups.get(radio.groupName);
        if (group) {
            group.forEach(r => {
                this.setRadioChecked(r, false);
            });
        }

        // Check this one
        this.setRadioChecked(radio, true);
    }

    setRadioChecked(radio: RadioInput, checked: boolean): void {
        radio.checked = checked;
        this.updateSelectionIndicator(radio);
    }

    /**
     * Handles label click for checkbox or radio button
     */
    handleLabelClick(input: CheckboxInput | RadioInput): void {
        if (input.type === InputType.Checkbox) {
            this.toggleCheckbox(input as CheckboxInput);
        } else if (input.type === InputType.Radio) {
            this.selectRadioButton(input as RadioInput);
        }
    }

    /**
     * Updates the check indicator visibility
     */
    private updateCheckIndicator(checkbox: CheckboxInput): void {
        if (checkbox.checkIndicatorMesh) {
            checkbox.checkIndicatorMesh.isVisible = checkbox.checked;
        }
    }

    /**
     * Updates the selection indicator visibility
     */
    private updateSelectionIndicator(radio: RadioInput): void {
        if (radio.selectionIndicatorMesh) {
            radio.selectionIndicatorMesh.isVisible = radio.checked;
        }
    }

    /**
     * Creates the checkbox mesh (square box)
     */
    private createCheckboxMesh(element: DOMElement, render: BabylonRender, style: StyleRule, dimensions: CssSize): BABYLON.Mesh {
        const cssSize = {
            width: dimensions.width > 0 ? dimensions.width : this.CHECKBOX_SIZE_PX,
            height: dimensions.height > 0 ? dimensions.height :
                dimensions.width > 0 ? dimensions.width : this.CHECKBOX_SIZE_PX,
        };
        const size = render.actions.camera.projectCssSize(cssSize);
        const borderRadius = render.actions.camera.projectCssSize({
            width: Math.max(0, parseFloat(style.borderRadius || '0')),
            height: Math.max(0, parseFloat(style.borderRadius || '0')),
        }).width;

        const checkboxMesh = render.actions.mesh.createPolygon(
            `checkbox_${element.id}`,
            'rectangle',
            size.width,
            size.height,
            borderRadius
        );

        // Create material
        const material = new BABYLON.StandardMaterial(`checkboxMaterial_${element.id}`, render.scene);
        material.diffuseColor = BABYLON.Color3.White();
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        checkboxMesh.material = material;

        checkboxMesh.isPickable = true;

        // Return mesh


        // We will move the interaction attachment to createCheckbox and createRadioButton to allow access to the wrapper object.
        // So for now, just return mesh.
        return checkboxMesh;
    }

    /**
     * Creates the radio button mesh (circular)
     */
    private createRadioMesh(element: DOMElement, render: BabylonRender, dimensions: CssSize): BABYLON.Mesh {
        const diameter = dimensions.width > 0 ? dimensions.width : this.CHECKBOX_SIZE_PX;
        const size = render.actions.camera.projectCssSize({ width: diameter, height: diameter });
        const radioMesh = render.actions.mesh.createPolygon(
            `radio_${element.id}`,
            'circle',
            size.width,
            size.height,
            0,
        );

        // Create material
        const material = new BABYLON.StandardMaterial(`radioMaterial_${element.id}`, render.scene);
        material.diffuseColor = BABYLON.Color3.White();
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        radioMesh.material = material;

        radioMesh.isPickable = true;

        return radioMesh;
    }

    /**
     * Creates the check mark indicator for checkbox
     */
    private createCheckIndicator(checkbox: CheckboxInput, render: BabylonRender): BABYLON.Mesh {
        const scene = render.scene!;
        const cssSize = checkbox.cssSize ?? { width: this.CHECKBOX_SIZE_PX, height: this.CHECKBOX_SIZE_PX };
        const size = render.actions.camera.projectCssSize({
            width: cssSize.width * 0.6,
            height: cssSize.height * 0.7,
        });
        const checkMark = BABYLON.MeshBuilder.CreatePlane(`checkMark_${checkbox.element.id}`, {
            width: size.width,
            height: size.height,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, scene);

        checkMark.parent = checkbox.mesh;
        checkMark.position.z = CONTROL_CONTENT_Z_OFFSET;

        // Create material
        const material = new BABYLON.StandardMaterial(`checkMarkMaterial_${checkbox.element.id}`, scene);
        material.diffuseColor = BABYLON.Color3.White();
        material.emissiveColor = BABYLON.Color3.White();
        material.specularColor = BABYLON.Color3.Black();
        material.disableLighting = true;
        material.backFaceCulling = false;
        checkMark.material = material;

        checkMark.isPickable = true;
        checkMark.isVisible = checkbox.checked;
        checkMark.renderingGroupId = 0;

        // Defensive: Force cursor pointer and disable text mesh inference
        checkMark.metadata = { cursor: 'pointer', isTextMesh: false };

        return checkMark;
    }

    /**
     * Creates the selection indicator for radio button
     */
    private createSelectionIndicator(radio: RadioInput, render: BabylonRender): BABYLON.Mesh {
        const scene = render.scene!;
        const diameter = (radio.cssSize?.width ?? this.CHECKBOX_SIZE_PX) * 0.6;
        const size = render.actions.camera.projectCssSize({ width: diameter, height: diameter });
        const indicator = render.actions.mesh.createPolygon(
            `radioIndicator_${radio.element.id}`,
            'circle',
            size.width,
            size.height,
            0,
        );
        indicator.parent = radio.mesh;
        indicator.position.z = CONTROL_CONTENT_Z_OFFSET;

        // Create material
        const material = new BABYLON.StandardMaterial(`radioIndicatorMaterial_${radio.element.id}`, scene);
        material.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8); // Blue
        material.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.4);
        indicator.material = material;

        indicator.isPickable = true;
        indicator.isVisible = radio.checked;
        indicator.renderingGroupId = 0;

        // Defensive: Force cursor pointer and disable text mesh inference
        indicator.metadata = { cursor: 'pointer', isTextMesh: false };

        return indicator;
    }

    /**
     * Creates label mesh for checkbox or radio button
     */
    private createLabelMesh(input: CheckboxInput | RadioInput, render: BabylonRender, style: StyleRule): BABYLON.Mesh {
        const textContent = input.value || 'Option'; // Use value as label

        const textStyle = { ...style };
        if (!textStyle.fontSize) textStyle.fontSize = '22px'; // Aggressively increased
        if (!textStyle.fontFamily) textStyle.fontFamily = 'Arial';
        if (!textStyle.color) textStyle.color = '#FFFFFF'; // Default to white for labels
        textStyle.textAlign = 'left';

        try {
            const texture = this.textRenderingService.renderTextToTexture(
                input.element,
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

            // Create text mesh using BabylonMeshService
            const labelPlane = this.babylonMeshService.createTextMesh(
                `label_${input.element.id}`,
                texture,
                textureWidth,
                textureHeight
            );

            labelPlane.parent = input.mesh;
            labelPlane.isPickable = true; // Ensure label handles clicks

            const inputHalfWidth = (input.cssSize?.width ?? this.CHECKBOX_SIZE_PX) / 2;
            const center = render.actions.camera.projectCssLocalPoint({
                x: inputHalfWidth + 8 + textureWidthPx / 2,
                y: 0,
            });
            labelPlane.position.x = center.x;
            labelPlane.position.z = 0.0; // Same plane

            labelPlane.isPickable = true; // Allow clicking label

            // Hover cursor for labels via metadata
            labelPlane.metadata = { ...labelPlane.metadata, cursor: 'pointer' };

            return labelPlane;

        } catch (error) {
            console.error('Error creating label mesh:', error);
            const fallbackSize = render.actions.camera.projectCssSize({ width: 50, height: 50 });
            return BABYLON.MeshBuilder.CreatePlane('fallback_label', {
                width: fallbackSize.width,
                height: fallbackSize.height,
            }, render.scene);
        }
    }


    /**
     * Registers a radio button in its group
     */
    private registerRadioButton(radio: RadioInput): void {
        if (!this.radioGroups.has(radio.groupName)) {
            this.radioGroups.set(radio.groupName, []);
        }

        const group = this.radioGroups.get(radio.groupName)!;
        group.push(radio);
    }

    /**
     * Gets all radio buttons in a group
     */
    getRadioGroup(groupName: string): RadioInput[] {
        return this.radioGroups.get(groupName) || [];
    }

    /**
     * Gets the selected radio button in a group
     */
    getSelectedRadio(groupName: string): RadioInput | undefined {
        const group = this.radioGroups.get(groupName);
        return group?.find(r => r.checked);
    }

    /**
     * Cleanup checkbox resources
     */
    disposeCheckbox(checkbox: CheckboxInput): void {
        if (checkbox.checkIndicatorMesh) {
            checkbox.checkIndicatorMesh.dispose();
        }

        if (checkbox.labelMesh) {
            checkbox.labelMesh.dispose();
        }

        if (checkbox.mesh) {
            checkbox.mesh.dispose();
        }
    }

    /**
     * Cleanup radio button resources
     */
    disposeRadioButton(radio: RadioInput): void {
        // Remove from group
        const group = this.radioGroups.get(radio.groupName);
        if (group) {
            const index = group.indexOf(radio);
            if (index > -1) {
                group.splice(index, 1);
            }
        }

        if (radio.selectionIndicatorMesh) {
            radio.selectionIndicatorMesh.dispose();
        }

        if (radio.labelMesh) {
            radio.labelMesh.dispose();
        }

        if (radio.mesh) {
            radio.mesh.dispose();
        }
    }
}
