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
    ) {
        this.setupGlobalKeyboardListener();
    }

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
            this.ensureGlobalBlurListener(render.scene);
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
     * Sets up global keyboard listener
     */
    private setupGlobalKeyboardListener(): void {
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', (event) => {
                const focusedElement = this.focusManager.getFocusedElement();
                if (focusedElement) {
                    // Prevent default browser behavior for input elements
                    this.keyboardHandler.preventEventPropagation(event);

                    // Construct proper BabylonRender object
                    const scene = focusedElement.mesh.getScene();
                    const render: BabylonRender = {
                        scene: scene,
                        actions: {
                            camera: this.cameraService
                        },
                        engine: scene.getEngine(),
                        canvas: scene.getEngine().getRenderingCanvas()
                    } as any;

                    // Handle keyboard input
                    this.handleKeyboardInput(
                        event,
                        render,
                        focusedElement.style
                    );
                }
            });
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

        // Add hover effects for buttons
        if (inputElement.type === InputType.Button || inputElement.type === InputType.Submit) {
            inputElement.mesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPointerOverTrigger,
                    () => {
                        if (!inputElement.disabled) {
                            this.buttonManager.handleButtonHover(inputElement as Button, true);
                        }
                    }
                )
            );

            inputElement.mesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPointerOutTrigger,
                    () => {
                        if (!inputElement.disabled) {
                            this.buttonManager.handleButtonHover(inputElement as Button, false);
                        }
                    }
                )
            );
        }
    }

    private globalBlurListenerAttached = false;

    /**
     * Ensures a global listener is attached to handle blur on click-outside
     */
    private ensureGlobalBlurListener(scene: BABYLON.Scene): void {
        if (this.globalBlurListenerAttached) return;

        scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                const focusedElement = this.focusManager.getFocusedElement();

                // If nothing is focused, nothing to do
                if (!focusedElement) return;

                const pickedMesh = pointerInfo.pickInfo?.pickedMesh;

                // Check if we clicked on the focused element or any of its descendants
                let isClickOnFocusedElement = false;

                if (pickedMesh) {
                    // Check direct match
                    if (pickedMesh === focusedElement.mesh) {
                        isClickOnFocusedElement = true;
                    }
                    // Check if it's the text mesh or cursor mesh associated with the input
                    // Using metadata or parent hierarchy
                    else if (pickedMesh.isDescendantOf(focusedElement.mesh)) {
                        isClickOnFocusedElement = true;
                    }
                    // Check specific components referencing the input (like text mesh which is parented)
                    else if (focusedElement.type === InputType.Text ||
                        focusedElement.type === InputType.Password ||
                        focusedElement.type === InputType.Email ||
                        focusedElement.type === InputType.Number ||
                        focusedElement.type === InputType.Textarea) {
                        const textInput = focusedElement as TextInput;
                        if (pickedMesh === textInput.textMesh || pickedMesh === textInput.cursorMesh) {
                            isClickOnFocusedElement = true;
                        }
                    }
                }

                // If click was NOT on the focused element, blur it
                if (!isClickOnFocusedElement) {
                    // console.log('[GlobalBlur] Click outside focused element detected. Blurring:', focusedElement.element.id);
                    this.blurInputElement(focusedElement);
                }
            }
        });

        this.globalBlurListenerAttached = true;
    }

    /**
     * Cleanup all resources
     */
    cleanup(): void {
        this.inputElements.forEach(input => this.disposeInputElement(input));
        this.inputElements.clear();
        this.focusManager.cleanup();
        this.globalBlurListenerAttached = false;
    }
}
