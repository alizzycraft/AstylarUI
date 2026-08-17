import { Injectable } from '@angular/core';
import { BabylonRender } from '../interfaces/render.types';
import { DOMElement } from '../../../types/dom-element';
import { InputElement, InputType, CheckboxInput, RadioInput, SelectElement, ValidationRule, Button, TextInput } from '../../../types/input-types';
import * as BABYLON from '@babylonjs/core';
import { StyleRule } from '../../../types/style-rule';
import { TextInputManager } from './text-input.manager';
import { ButtonManager } from './button.manager';
import { CheckboxManager } from './checkbox.manager';
import { SelectManager } from './select.manager';
import { KeyboardInputHandler } from './keyboard-input.handler';
import { FocusManager } from './focus.manager';
import { FormValidatorService } from './form-validator.service';
import { FormManager } from './form.manager';
import { BabylonCameraService } from '../../babylon-camera.service';


/**
 * Main orchestration service for input elements
 */
@Injectable({
    providedIn: 'root'
})
export class InputElementService {
    private inputElements: Map<string, InputElement> = new Map();

    constructor(
        private textInputManager: TextInputManager,
        private buttonManager: ButtonManager,
        private checkboxManager: CheckboxManager,
        private selectManager: SelectManager,
        private keyboardHandler: KeyboardInputHandler,
        private focusManager: FocusManager,
        private formValidator: FormValidatorService,
        private formManager: FormManager,
        private cameraService: BabylonCameraService
    ) { }

    /**
     * Creates an input element based on type
     */
    createInputElement(
        element: DOMElement,
        render: BabylonRender,
        style: StyleRule,
        worldDimensions: { width: number; height: number }
    ): InputElement | null {
        const inputType = this.determineInputType(element);

        if (!inputType) {
            return null;
        }

        let inputElement: InputElement;

        switch (inputType) {
            case InputType.Text:
            case InputType.Password:
            case InputType.Email:
            case InputType.Number:
            case InputType.Textarea:
                inputElement = this.textInputManager.createTextInput(element, render, null as any, style, worldDimensions);
                break;

            case InputType.Button:
            case InputType.Submit:
                inputElement = this.buttonManager.createButton(element, render, style, worldDimensions);
                break;

            case InputType.Checkbox:
                inputElement = this.checkboxManager.createCheckbox(element, render, style, worldDimensions);
                break;

            case InputType.Radio:
                inputElement = this.checkboxManager.createRadioButton(element, render, style, worldDimensions);
                break;

            case InputType.Select:
                inputElement = this.selectManager.createSelectElement(element, render, style, worldDimensions);
                break;

            default:
                return null;
        }

        // Register input element
        this.registerInput(inputElement);

        // Attach input events (click to focus, etc.)
        if (render.scene) {
            this.attachInputEvents(inputElement, render.scene);
        }

        // Add validation rules if specified
        if (element.validationRules) {
            element.validationRules.forEach(rule => {
                this.formValidator.addValidationRule(inputElement, rule as ValidationRule);
            });
        }

        // Add required validation if specified
        if (element.required) {
            this.formValidator.addValidationRule(
                inputElement,
                this.formValidator.createRequiredRule()
            );
        }

        return inputElement;
    }

    /**
     * Focuses an input element
     */
    focusInputElement(inputElement: InputElement): void {
        this.focusManager.focusElement(inputElement);
    }

    /**
     * Blurs an input element
     */
    blurInputElement(inputElement: InputElement): void {
        this.focusManager.blurElement(inputElement);
    }

    /**
     * Handles keyboard input for focused element
     */
    handleKeyboardInput(event: KeyboardEvent, render: BabylonRender, style: StyleRule): void {
        const focusedElement = this.focusManager.getFocusedElement();

        if (!focusedElement) return;

        // Handle tab navigation
        if (event.key === 'Tab') {
            this.focusManager.handleTabNavigation(!event.shiftKey);
            event.preventDefault();
            return;
        }

        // Route to appropriate handler
        this.keyboardHandler.handleKeyboardEvent(event, focusedElement, render, style);
    }

    /**
     * Updates input value programmatically
     */
    updateInputValue(inputElement: InputElement, value: any): void {
        inputElement.value = value;

        // Update specific input type
        switch (inputElement.type) {
            case InputType.Text:
            case InputType.Password:
            case InputType.Email:
            case InputType.Number:
            case InputType.Textarea:
                (inputElement as TextInput).textContent = String(value);
                break;

            case InputType.Checkbox:
                (inputElement as CheckboxInput).checked = Boolean(value);
                break;

            case InputType.Radio:
                if (value) {
                    this.checkboxManager.selectRadioButton(inputElement as RadioInput);
                }
                break;

            case InputType.Select:
                const selectElement = inputElement as SelectElement;
                const optionIndex = selectElement.options.findIndex(opt => opt.value === value);
                if (optionIndex >= 0) {
                    selectElement.selectedIndex = optionIndex;
                    selectElement.value = selectElement.options[optionIndex].value;
                }
                break;
        }

        // Mark as dirty
        inputElement.validationState.dirty = true;
    }

    /**
     * Validates an input element
     */
    validateInput(inputElement: InputElement): boolean {
        const result = this.formValidator.validateInput(inputElement);
        return result.valid;
    }

    /**
     * Registers an input element
     */
    registerInput(inputElement: InputElement): void {
        const elementId = inputElement.element.id || `input_${Date.now()}`;
        this.inputElements.set(elementId, inputElement);

        // Add to tab order
        this.focusManager.addToTabOrder(inputElement);
    }

    /**
     * Unregisters an input element
     */
    unregisterInput(inputElement: InputElement): void {
        const elementId = inputElement.element.id || '';
        this.inputElements.delete(elementId);

        // Remove from tab order
        this.focusManager.removeFromTabOrder(inputElement);

        // Dispose resources
        this.disposeInputElement(inputElement);
    }

    /**
     * Gets an input element by ID
     */
    getInputElement(elementId: string): InputElement | undefined {
        return this.inputElements.get(elementId);
    }

    /**
     * Gets all input elements
     */
    getAllInputElements(): InputElement[] {
        return Array.from(this.inputElements.values());
    }

    /** Gets the authored ID of the currently focused input, if any. */
    getFocusedElementId(): string | undefined {
        return this.focusManager.getFocusedElement()?.element.id;
    }

    /** Applies the native keyboard default action after public event dispatch. */
    handleFocusedKeyDown(elementId: string, event: KeyboardEvent): void {
        const focusedElement = this.focusManager.getFocusedElement();
        if (!focusedElement || focusedElement.element.id !== elementId) return;

        const scene = focusedElement.mesh.getScene();
        const render: BabylonRender = {
            scene,
            actions: { camera: this.cameraService },
            engine: scene.getEngine(),
            canvas: scene.getEngine().getRenderingCanvas()
        } as any;
        this.handleKeyboardInput(event, render, focusedElement.style);
    }

    /** Text-entry controls commit their edited value when focus leaves. */
    commitsValueOnBlur(elementId: string): boolean {
        const input = this.inputElements.get(elementId);
        return !!input && (input.type === InputType.Text ||
            input.type === InputType.Password ||
            input.type === InputType.Email ||
            input.type === InputType.Number ||
            input.type === InputType.Textarea);
    }

    /** Applies a control's click activation and returns a cancellation rollback. */
    activateInputElement(elementId: string): { changed: boolean; rollback: () => void } | undefined {
        const input = this.inputElements.get(elementId);
        if (!input || input.disabled) return undefined;

        if (input.type === InputType.Checkbox) {
            const checkbox = input as CheckboxInput;
            const checkedBefore = checkbox.checked;
            this.checkboxManager.setCheckboxChecked(checkbox, !checkedBefore);
            return {
                changed: checkbox.checked !== checkedBefore,
                rollback: () => this.checkboxManager.setCheckboxChecked(checkbox, checkedBefore),
            };
        }

        if (input.type === InputType.Radio) {
            const radio = input as RadioInput;
            const groupBefore = this.checkboxManager.getRadioGroup(radio.groupName)
                .map((member) => ({ member, checked: member.checked }));
            this.checkboxManager.selectRadioButton(radio);
            return {
                changed: groupBefore.some(({ member, checked }) => member.checked !== checked),
                rollback: () => groupBefore.forEach(({ member, checked }) =>
                    this.checkboxManager.setRadioChecked(member, checked)),
            };
        }

        return undefined;
    }

    canActivateWithSpace(elementId: string): boolean {
        const input = this.inputElements.get(elementId);
        return !!input && !input.disabled &&
            (input.type === InputType.Checkbox || input.type === InputType.Radio);
    }

    /**
     * Determines input type from element
     */
    private determineInputType(element: DOMElement): InputType | null {
        // Check explicit inputType property
        if (element.inputType) {
            const type = element.inputType.toLowerCase();
            return this.mapStringToInputType(type);
        }

        // Check element type
        if (element.type === 'input') {
            return InputType.Text; // Default for input elements
        }

        if (element.type === 'button') {
            return InputType.Button;
        }

        if (element.type === 'select') {
            return InputType.Select;
        }

        if (element.type === 'textarea') {
            return InputType.Textarea;
        }

        return null;
    }

    /**
     * Maps string to InputType enum
     */
    private mapStringToInputType(type: string): InputType | null {
        switch (type) {
            case 'text': return InputType.Text;
            case 'password': return InputType.Password;
            case 'email': return InputType.Email;
            case 'number': return InputType.Number;
            case 'button': return InputType.Button;
            case 'submit': return InputType.Submit;
            case 'checkbox': return InputType.Checkbox;
            case 'radio': return InputType.Radio;
            case 'select': return InputType.Select;
            case 'textarea': return InputType.Textarea;
            default: return null;
        }
    }

    /**
     * Disposes input element resources
     */
    private disposeInputElement(inputElement: InputElement): void {
        switch (inputElement.type) {
            case InputType.Text:
            case InputType.Password:
            case InputType.Email:
            case InputType.Number:
            case InputType.Textarea:
                this.textInputManager.disposeTextInput(inputElement as TextInput);
                break;

            case InputType.Button:
            case InputType.Submit:
                this.buttonManager.disposeButton(inputElement as Button);
                break;

            case InputType.Checkbox:
                this.checkboxManager.disposeCheckbox(inputElement as CheckboxInput);
                break;

            case InputType.Radio:
                this.checkboxManager.disposeRadioButton(inputElement as RadioInput);
                break;

            case InputType.Select:
                this.selectManager.disposeSelect(inputElement as SelectElement);
                break;
        }
    }

    /**
     * Attaches input events (click, etc.) to the input element
     */
    attachInputEvents(inputElement: InputElement, scene: BABYLON.Scene): void {
        if (!inputElement.mesh.actionManager) {
            inputElement.mesh.actionManager = new BABYLON.ActionManager(scene);
        }

        // Handle click based on input type
        inputElement.mesh.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPickTrigger,
                () => {
                    if (inputElement.disabled) return;

                    switch (inputElement.type) {
                        case InputType.Button:
                        case InputType.Submit:
                            // Focus and trigger button click
                            this.focusInputElement(inputElement);
                            this.buttonManager.handleButtonClick(inputElement as Button);
                            break;

                        case InputType.Checkbox:
                            // Focus only - toggle handled by CheckboxManager
                            this.focusInputElement(inputElement);
                            break;

                        case InputType.Radio:
                            // Focus only - selection handled by CheckboxManager
                            this.focusInputElement(inputElement);
                            break;

                        case InputType.Select:
                            // Focus and toggle dropdown
                            this.focusInputElement(inputElement);
                            const selectElement = inputElement as SelectElement;
                            if (selectElement.dropdownOpen) {
                                this.selectManager.closeDropdown(selectElement);
                            } else {
                                this.selectManager.openDropdown(selectElement, scene, inputElement.style);
                            }
                            break;

                        default:
                            // Text inputs and others just focus
                            this.focusInputElement(inputElement);
                            break;
                    }
                }
            )
        );

    }

    /**
     * Cleanup all resources
     */
    cleanup(): void {
        this.focusManager.cleanup();
        this.inputElements.forEach(input => this.disposeInputElement(input));
        this.inputElements.clear();
    }
}
