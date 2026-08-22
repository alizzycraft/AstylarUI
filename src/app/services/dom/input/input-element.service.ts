import { Injectable } from '@angular/core';
import { BabylonRender } from '../interfaces/render.types';
import { DOMElement } from '../../../types/dom-element';
import { InputElement, InputType, CheckboxInput, RadioInput, SelectElement, ValidationRule, Button, TextInput } from '../../../types/input-types';
import * as BABYLON from '@babylonjs/core';
import { StyleRule } from '../../../types/style-rule';
import { TextInputManager, TextInputMutableState } from './text-input.manager';
import { ButtonManager } from './button.manager';
import { CheckboxManager } from './checkbox.manager';
import { SelectManager } from './select.manager';
import { KeyboardInputHandler } from './keyboard-input.handler';
import { FocusManager } from './focus.manager';
import { FormValidatorService } from './form-validator.service';
import { FormManager } from './form.manager';
import { BabylonCameraService } from '../../babylon-camera.service';

export interface TextControlStateSnapshot {
    elementId: string;
    type: InputType;
    authoredValue: string;
    focused: boolean;
    validationState: { valid: boolean; errors: string[]; touched: boolean; dirty: boolean };
    mutable: TextInputMutableState;
}

export interface NonTextControlStateSnapshot {
    elementId: string;
    type: InputType;
    focused: boolean;
    validationState: { valid: boolean; errors: string[]; touched: boolean; dirty: boolean };
    authoredChecked?: boolean;
    authoredValue?: unknown;
    authoredGroupName?: string;
    checked?: boolean;
    selectedValue?: unknown;
    dropdownOpen?: boolean;
    activeOptionValue?: unknown;
}

export interface SelectPopupLifecycleSnapshot {
    openPopups: number;
    popupObservers: number;
    popupMeshes: number;
    popupMaterials: number;
    popupTextures: number;
}

/**
 * Main orchestration service for input elements
 */
@Injectable({
    providedIn: 'root'
})
export class InputElementService {
    private inputElements: Map<string, InputElement> = new Map();
    private duplicateInputIds = new Set<string>();

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

        // Pointer focus and activation are owned by the scene interaction runtime.
        // A mesh OnPickTrigger bypasses overflow hit filtering because Babylon
        // picking is independent of material clipping, so do not install the
        // legacy parallel default-action path on rendered controls.

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
    focusInputElement(
        inputElement: InputElement,
        preservePreviousSelectionOnReset = false,
        focusVisible = true,
    ): void {
        this.focusManager.focusElement(inputElement, preservePreviousSelectionOnReset, focusVisible);
    }

    isFocusVisible(): boolean {
        return this.focusManager.isFocusVisible();
    }

    /** Configures whether Astylar should draw its fallback focus ring. */
    setDefaultFocusIndicatorEnabled(elementId: string, enabled: boolean): void {
        this.focusManager.setDefaultFocusIndicatorEnabled(elementId, enabled);
    }

    setFocusIndicatorAppearance(
        elementId: string,
        appearance?: { color: BABYLON.Color3; alpha: number; widthPx: number; offsetPx: number },
    ): void {
        this.focusManager.setFocusIndicatorAppearance(elementId, appearance);
    }

    /**
     * Blurs an input element
     */
    blurInputElement(inputElement: InputElement, preserveSelectionOnReset: boolean = false): void {
        this.focusManager.blurElement(inputElement, preserveSelectionOnReset);
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
        if (inputElement.element.id && this.inputElements.has(elementId)) {
            this.duplicateInputIds.add(elementId);
        }
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
     * Releases a uniquely addressed control's primary mesh for visual-owner
     * reconciliation while disposing the old manager's private subresources.
     */
    releaseInputMesh(elementId: string): BABYLON.Mesh | undefined {
        const input = this.inputElements.get(elementId);
        if (!input || this.duplicateInputIds.has(elementId)) return undefined;
        this.inputElements.delete(elementId);
        this.duplicateInputIds.delete(elementId);
        this.focusManager.removeFromTabOrder(input);
        this.formValidator.clearValidationRules(input);
        const mesh = input.mesh;
        input.mesh = undefined as unknown as BABYLON.Mesh;
        this.disposeInputElement(input);
        input.mesh = mesh;
        return mesh;
    }

    /** Gets the authored ID of the currently focused input, if any. */
    getFocusedElementId(): string | undefined {
        return this.focusManager.getFocusedElement()?.element.id;
    }

    /** Captures mutable state for uniquely identified text-entry controls. */
    captureTextControlStates(): readonly TextControlStateSnapshot[] {
        const snapshots: TextControlStateSnapshot[] = [];
        for (const [elementId, input] of this.inputElements) {
            if (!input.element.id || this.duplicateInputIds.has(elementId) || !this.isTextEntry(input)) {
                continue;
            }
            const text = input as TextInput;
            snapshots.push({
                elementId,
                type: text.type,
                authoredValue: String(text.element.value ?? ''),
                focused: text.focused,
                validationState: {
                    valid: text.validationState.valid,
                    errors: [...text.validationState.errors],
                    touched: text.validationState.touched,
                    dirty: text.validationState.dirty,
                },
                mutable: {
                    value: String(text.value ?? ''),
                    cursorPosition: text.cursorPosition,
                    selectionStart: text.selectionStart,
                    selectionEnd: text.selectionEnd,
                    selectionActive: text.cursorState.selectionActive,
                    selectionAnchor: text.cursorState.selectionStart,
                    selectionFocus: text.cursorState.selectionEnd,
                    scrollOffset: text.scrollOffset ?? 0,
                    scrollTop: text.scrollTop ?? 0,
                    preserveSelectionOnReset: text.preserveSelectionOnReset === true,
                },
            });
        }
        return snapshots;
    }

    /** Restores compatible text state and returns the control that should regain focus. */
    restoreTextControlStates(snapshots: readonly TextControlStateSnapshot[]): string | undefined {
        let focusedElementId: string | undefined;
        for (const snapshot of snapshots) {
            const input = this.inputElements.get(snapshot.elementId);
            const rebuiltAuthoredValue = String(input?.element.value ?? '');
            if (!input || this.duplicateInputIds.has(snapshot.elementId) ||
                input.type !== snapshot.type || !this.isTextEntry(input) ||
                (rebuiltAuthoredValue !== snapshot.authoredValue &&
                    rebuiltAuthoredValue !== snapshot.mutable.value)) {
                continue;
            }
            const text = input as TextInput;
            this.textInputManager.restoreMutableState(text, snapshot.mutable);
            text.validationState = {
                valid: snapshot.validationState.valid,
                errors: [...snapshot.validationState.errors],
                touched: snapshot.validationState.touched,
                dirty: snapshot.validationState.dirty,
            };
            if (snapshot.focused) focusedElementId = snapshot.elementId;
        }
        return focusedElementId;
    }

    /** Captures choice state and focus for uniquely identified non-text controls. */
    captureNonTextControlStates(): readonly NonTextControlStateSnapshot[] {
        const snapshots: NonTextControlStateSnapshot[] = [];
        for (const [elementId, input] of this.inputElements) {
            if (!input.element.id || this.duplicateInputIds.has(elementId) || this.isTextEntry(input)) {
                continue;
            }
            const snapshot: NonTextControlStateSnapshot = {
                elementId,
                type: input.type,
                focused: input.focused,
                validationState: {
                    valid: input.validationState.valid,
                    errors: [...input.validationState.errors],
                    touched: input.validationState.touched,
                    dirty: input.validationState.dirty,
                },
            };
            if (input.type === InputType.Checkbox) {
                snapshot.authoredChecked = !!input.element.checked;
                snapshot.checked = (input as CheckboxInput).checked;
            } else if (input.type === InputType.Radio) {
                snapshot.authoredChecked = !!input.element.checked;
                snapshot.authoredGroupName = (input as RadioInput).groupName;
                snapshot.checked = (input as RadioInput).checked;
            } else if (input.type === InputType.Select) {
                const select = input as SelectElement;
                snapshot.authoredValue = input.element.value;
                snapshot.selectedValue = select.options[select.selectedIndex]?.value;
                snapshot.dropdownOpen = select.dropdownOpen;
                snapshot.activeOptionValue = select.options[select.activeOptionIndex]?.value;
            }
            snapshots.push(snapshot);
        }
        return snapshots;
    }

    /** Restores compatible choice state and returns the non-text control that should regain focus. */
    restoreNonTextControlStates(snapshots: readonly NonTextControlStateSnapshot[]): string | undefined {
        let focusedElementId: string | undefined;
        for (const snapshot of snapshots) {
            const input = this.inputElements.get(snapshot.elementId);
            if (!input || this.duplicateInputIds.has(snapshot.elementId) ||
                input.type !== snapshot.type || this.isTextEntry(input)) {
                continue;
            }
            // A controlled choice may legitimately author its just-committed
            // value into the next tree. Preserve browser focus by stable
            // identity even when the old mutable value must not be restored.
            if (snapshot.focused && !input.disabled) focusedElementId = snapshot.elementId;
            if (!this.isCompatibleNonTextSnapshot(input, snapshot)) continue;

            if (input.type === InputType.Checkbox) {
                this.checkboxManager.setCheckboxChecked(input as CheckboxInput, !!snapshot.checked);
            } else if (input.type === InputType.Radio) {
                this.checkboxManager.setRadioChecked(input as RadioInput, !!snapshot.checked);
            } else if (input.type === InputType.Select) {
                const select = input as SelectElement;
                const selectedIndex = select.options.findIndex((option) =>
                    Object.is(option.value, snapshot.selectedValue) && !option.disabled);
                if (selectedIndex < 0) continue;
                this.selectManager.selectOption(select, selectedIndex);
                if (snapshot.dropdownOpen) {
                    const activeIndex = select.options.findIndex((option) =>
                        Object.is(option.value, snapshot.activeOptionValue) && !option.disabled);
                    if (activeIndex >= 0) {
                        this.selectManager.restoreExpandedState(select, activeIndex);
                    }
                }
            }

            input.validationState = {
                valid: snapshot.validationState.valid,
                errors: [...snapshot.validationState.errors],
                touched: snapshot.validationState.touched,
                dirty: snapshot.validationState.dirty,
            };
        }
        return focusedElementId;
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

    /** Scrolls a native-like text-control viewport beneath the pointer. */
    scrollTextControl(elementId: string, deltaX: number, deltaY: number): boolean {
        const input = this.inputElements.get(elementId);
        if (!input || input.disabled || !this.isTextEntry(input)) return false;
        return this.textInputManager.scrollBy(input as TextInput, deltaX, deltaY);
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

    /** Select keyboard choices commit immediately rather than waiting for blur. */
    emitsImmediateChangeOnKeyboardMutation(elementId: string): boolean {
        return this.inputElements.get(elementId)?.type === InputType.Select;
    }

    /** Native expanded selects consume Escape before page keydown listeners observe it. */
    cancelExpandedSelect(elementId: string): boolean {
        const input = this.inputElements.get(elementId);
        if (!input || input.type !== InputType.Select) return false;
        const select = input as SelectElement;
        if (!select.dropdownOpen) return false;
        this.selectManager.closeDropdown(select);
        return true;
    }

    /** Applies native popup-owned keyboard behavior before page key listeners run. */
    handleExpandedSelectKeyDown(
        elementId: string,
        event: KeyboardEvent,
    ): { handled: boolean; changed: boolean; dispatchClick: boolean; suppressKeyUp: boolean } | undefined {
        const input = this.inputElements.get(elementId);
        if (!input || input.type !== InputType.Select) return undefined;
        const select = input as SelectElement;
        if (!select.dropdownOpen) return undefined;

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            const valueBefore = select.value;
            this.selectManager.navigateOptions(select, event.key === 'ArrowUp' ? 'up' : 'down');
            this.selectManager.selectOption(select, select.activeOptionIndex);
            return {
                handled: true,
                changed: !Object.is(valueBefore, select.value),
                dispatchClick: false,
                suppressKeyUp: true,
            };
        }
        if (event.key === 'Enter') {
            const valueBefore = select.value;
            this.selectManager.selectOption(select, select.activeOptionIndex);
            return {
                handled: true,
                changed: !Object.is(valueBefore, select.value),
                dispatchClick: true,
                suppressKeyUp: false,
            };
        }
        if (event.key === 'Escape') {
            this.selectManager.closeDropdown(select);
            return { handled: true, changed: false, dispatchClick: false, suppressKeyUp: false };
        }
        return undefined;
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

        if (input.type === InputType.Select) {
            const select = input as SelectElement;
            const wasOpen = select.dropdownOpen;
            if (wasOpen) {
                this.selectManager.closeDropdown(select);
            } else {
                this.selectManager.openDropdown(select, select.mesh.getScene(), select.style);
            }
            return {
                changed: false,
                rollback: () => {
                    if (wasOpen && !select.dropdownOpen) {
                        this.selectManager.openDropdown(select, select.mesh.getScene(), select.style);
                    } else if (!wasOpen && select.dropdownOpen) {
                        this.selectManager.closeDropdown(select);
                    }
                },
            };
        }

        return undefined;
    }

    /** Lets the pointer runtime avoid an all-mesh pick when no popup is open. */
    hasExpandedSelectPopup(): boolean {
        for (const input of this.inputElements.values()) {
            if (input.type === InputType.Select && (input as SelectElement).dropdownOpen) {
                return true;
            }
        }
        return false;
    }

    getSelectPopupLifecycleSnapshot(): SelectPopupLifecycleSnapshot {
        const meshes = new Set<BABYLON.AbstractMesh>();
        const materials = new Set<BABYLON.Material>();
        const textures = new Set<BABYLON.BaseTexture>();
        let openPopups = 0;

        for (const input of this.inputElements.values()) {
            if (input.type !== InputType.Select) continue;
            const select = input as SelectElement;
            if (!select.dropdownOpen) continue;
            openPopups += 1;
            if (select.dropdownMesh && !select.dropdownMesh.isDisposed()) {
                meshes.add(select.dropdownMesh);
                select.dropdownMesh.getChildMeshes(false).forEach((mesh) => meshes.add(mesh));
            }
            select.optionMeshes.forEach((mesh) => {
                if (!mesh.isDisposed()) meshes.add(mesh);
            });
        }

        for (const mesh of meshes) {
            if (mesh.material) materials.add(mesh.material);
        }
        for (const material of materials) {
            material.getActiveTextures().forEach((texture) => textures.add(texture));
        }

        return {
            openPopups,
            popupObservers: this.selectManager.clickAwayObserverCount,
            popupMeshes: meshes.size,
            popupMaterials: materials.size,
            popupTextures: textures.size,
        };
    }

    /** Commits a popup row selected by the scene-owned pointer runtime. */
    commitExpandedSelectOption(elementId: string, optionIndex: number): boolean {
        const input = this.inputElements.get(elementId);
        if (!input || input.type !== InputType.Select) return false;
        const select = input as SelectElement;
        if (!select.dropdownOpen || select.options[optionIndex]?.disabled) return false;
        const valueBefore = select.value;
        this.selectManager.selectOption(select, optionIndex);
        return !Object.is(valueBefore, select.value);
    }

    canActivateWithSpace(elementId: string): boolean {
        const input = this.inputElements.get(elementId);
        return !!input && !input.disabled &&
            (input.type === InputType.Checkbox || input.type === InputType.Radio ||
                input.type === InputType.Button || input.type === InputType.Submit);
    }

    canActivateWithEnter(elementId: string): boolean {
        const input = this.inputElements.get(elementId);
        return !!input && !input.disabled &&
            (input.type === InputType.Button || input.type === InputType.Submit);
    }

    /** Finds the next enabled member for native-style radio arrow navigation. */
    getRadioNavigationTarget(elementId: string, direction: -1 | 1): string | undefined {
        const input = this.inputElements.get(elementId);
        if (!input || input.type !== InputType.Radio || input.disabled) return undefined;

        const radio = input as RadioInput;
        if (!radio.groupName) return undefined;
        const enabledGroup = this.checkboxManager.getRadioGroup(radio.groupName)
            .filter((member) => !member.disabled && !!member.element.id);
        if (enabledGroup.length < 2) return undefined;

        const currentIndex = enabledGroup.indexOf(radio);
        if (currentIndex < 0) return undefined;
        const nextIndex = (currentIndex + direction + enabledGroup.length) % enabledGroup.length;
        return enabledGroup[nextIndex].element.id;
    }

    /** Restores authored form defaults without emitting control mutation events. */
    resetFormControls(elementIds: readonly string[]): void {
        const inputs = elementIds
            .map((elementId) => this.inputElements.get(elementId))
            .filter((input): input is InputElement => !!input);

        for (const input of inputs) {
            if (input.type === InputType.Text || input.type === InputType.Password ||
                input.type === InputType.Email || input.type === InputType.Number ||
                input.type === InputType.Textarea) {
                this.textInputManager.resetTextValue(
                    input as TextInput,
                    String(input.element.value ?? ''),
                );
            } else if (input.type === InputType.Checkbox) {
                this.checkboxManager.setCheckboxChecked(
                    input as CheckboxInput,
                    !!input.element.checked,
                );
            } else if (input.type === InputType.Radio) {
                this.checkboxManager.setRadioChecked(
                    input as RadioInput,
                    !!input.element.checked,
                );
            } else if (input.type === InputType.Select) {
                const select = input as SelectElement;
                const authoredIndex = select.options.findIndex((option) =>
                    option.value === select.element.value && !option.disabled);
                const fallbackIndex = select.options.findIndex((option) => !option.disabled);
                const index = authoredIndex >= 0 ? authoredIndex : fallbackIndex;
                if (index >= 0) this.selectManager.selectOption(select, index);
            }

            input.validationState.touched = false;
            input.validationState.dirty = false;
            input.validationState.valid = true;
            input.validationState.errors = [];
        }
    }

    /** Validates form-associated controls and returns invalid IDs in authored order. */
    validateFormControls(elementIds: readonly string[]): readonly string[] {
        const invalidIds: string[] = [];
        for (const elementId of elementIds) {
            const input = this.inputElements.get(elementId);
            if (!input || input.disabled || input.element.readonly ||
                input.type === InputType.Button || input.type === InputType.Submit) continue;
            if (!this.validateInput(input)) invalidIds.push(elementId);
        }
        return invalidIds;
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
            case 'reset': return InputType.Button;
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

    private isTextEntry(input: InputElement): boolean {
        return input.type === InputType.Text || input.type === InputType.Password ||
            input.type === InputType.Email || input.type === InputType.Number ||
            input.type === InputType.Textarea;
    }

    private isCompatibleNonTextSnapshot(
        input: InputElement,
        snapshot: NonTextControlStateSnapshot,
    ): boolean {
        if (input.type === InputType.Checkbox) {
            return !!input.element.checked === snapshot.authoredChecked;
        }
        if (input.type === InputType.Radio) {
            return !!input.element.checked === snapshot.authoredChecked &&
                (input as RadioInput).groupName === snapshot.authoredGroupName;
        }
        if (input.type === InputType.Select) {
            return Object.is(input.element.value, snapshot.authoredValue) &&
                (input as SelectElement).options.some((option) =>
                    Object.is(option.value, snapshot.selectedValue) && !option.disabled);
        }
        return input.type === InputType.Button || input.type === InputType.Submit;
    }

    /**
     * Cleanup all resources
     */
    cleanup(): void {
        this.focusManager.cleanup();
        this.inputElements.forEach(input => this.disposeInputElement(input));
        this.inputElements.clear();
        this.duplicateInputIds.clear();
    }
}
