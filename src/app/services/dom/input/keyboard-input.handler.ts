import { Injectable } from '@angular/core';
import { BabylonRender } from '../interfaces/render.types';
import { InputElement, TextInput, Button, CheckboxInput, RadioInput, SelectElement, RangeInput, InputType, CursorDirection } from '../../../types/input-types';
import { TextInputManager } from './text-input.manager';
import { ButtonManager } from './button.manager';
import { CheckboxManager } from './checkbox.manager';
import { SelectManager } from './select.manager';
import * as BABYLON from '@babylonjs/core';
import { StyleRule } from '../../../types/style-rule';
import { RangeManager } from './range.manager';

/**
 * Service responsible for handling keyboard input for input elements
 */
@Injectable({
    providedIn: 'root'
})
export class KeyboardInputHandler {
    constructor(
        private textInputManager: TextInputManager,
        private buttonManager: ButtonManager,
        private checkboxManager: CheckboxManager,
        private selectManager: SelectManager,
        private rangeManager: RangeManager,
    ) { }

    /**
     * Handles keyboard events for input elements
     */
    handleKeyboardEvent(
        event: KeyboardEvent,
        inputElement: InputElement,
        render: BabylonRender,
        style: StyleRule
    ): void {
        if (!inputElement.focused) return;

        switch (inputElement.type) {
            case InputType.Text:
            case InputType.Password:
            case InputType.Email:
            case InputType.Number:
            case InputType.Textarea:
                this.handleTextInput(event, inputElement as TextInput, render, style);
                break;

            case InputType.Button:
            case InputType.Submit:
                this.handleButtonKeyboard(event, inputElement as Button);
                break;

            case InputType.Checkbox:
                this.handleCheckboxKeyboard(event, inputElement as CheckboxInput);
                break;

            case InputType.Radio:
                this.handleRadioKeyboard(event, inputElement as RadioInput);
                break;

            case InputType.Select:
                this.handleSelectKeyboard(event, inputElement as SelectElement, render, style);
                break;

            case InputType.Range:
                this.rangeManager.handleKey(inputElement as RangeInput, event);
                break;
        }
    }

    /**
     * Handles keyboard input for text fields
     */
    private handleTextInput(event: KeyboardEvent, textInput: TextInput, render: BabylonRender, style: StyleRule): void {

        switch (event.key) {
            case 'ArrowLeft':
                this.textInputManager.moveCursor(textInput, CursorDirection.Left, event.shiftKey);
                this.textInputManager.updateCursorAfterMovement(textInput, render, style);
                event.preventDefault();
                break;

            case 'ArrowRight':
                this.textInputManager.moveCursor(textInput, CursorDirection.Right, event.shiftKey);
                this.textInputManager.updateCursorAfterMovement(textInput, render, style);
                event.preventDefault();
                break;

            case 'ArrowUp':
                if (textInput.type === InputType.Textarea) {
                    this.textInputManager.moveCursor(textInput, CursorDirection.Up, event.shiftKey);
                    this.textInputManager.updateCursorAfterMovement(textInput, render, style);
                    event.preventDefault();
                }
                break;

            case 'ArrowDown':
                if (textInput.type === InputType.Textarea) {
                    this.textInputManager.moveCursor(textInput, CursorDirection.Down, event.shiftKey);
                    this.textInputManager.updateCursorAfterMovement(textInput, render, style);
                    event.preventDefault();
                }
                break;

            case 'Home':
                this.textInputManager.moveCursor(textInput, CursorDirection.Home, event.shiftKey);
                this.textInputManager.updateCursorAfterMovement(textInput, render, style);
                event.preventDefault();
                break;

            case 'End':
                this.textInputManager.moveCursor(textInput, CursorDirection.End, event.shiftKey);
                this.textInputManager.updateCursorAfterMovement(textInput, render, style);
                event.preventDefault();
                break;

            case 'Backspace':
                this.textInputManager.deleteCharacter(textInput, -1, render, style);
                event.preventDefault();
                break;

            case 'Delete':
                this.textInputManager.deleteCharacter(textInput, 1, render, style);
                event.preventDefault();
                break;

            case 'Enter':
                if (textInput.type === InputType.Textarea) {
                    this.textInputManager.insertTextAtCursor(textInput, '\n', render, style);
                }
                event.preventDefault();
                break;

            case 'Tab':
                // Tab navigation handled by FocusManager
                break;

            default:
                // Handle Ctrl/Cmd shortcuts
                if (event.ctrlKey || event.metaKey) {
                    const key = event.key.toLowerCase();
                    switch (key) {
                        case 'c':
                            this.textInputManager.copy(textInput);
                            event.preventDefault();
                            break;
                        case 'v':
                            this.textInputManager.paste(textInput, render, style);
                            event.preventDefault();
                            break;
                        case 'x':
                            this.textInputManager.cut(textInput, render, style);
                            event.preventDefault();
                            break;
                        case 'a':
                            this.textInputManager.selectAll(textInput);
                            event.preventDefault();
                            break;
                    }
                    break;
                }

                // Insert printable characters
                if (event.key.length === 1 && !event.altKey) {
                    this.textInputManager.insertTextAtCursor(textInput, event.key, render, style);
                    event.preventDefault();
                }
                break;
        }
    }

    /**
     * Handles keyboard input for buttons
     */
    private handleButtonKeyboard(event: KeyboardEvent, button: Button): void {
        if (event.key === 'Enter' || event.key === ' ') {
            this.buttonManager.handleButtonClick(button);
            event.preventDefault();
        }
    }

    /**
     * Handles keyboard input for checkboxes
     */
    private handleCheckboxKeyboard(event: KeyboardEvent, checkbox: CheckboxInput): void {
        if (event.key === ' ') {
            this.checkboxManager.toggleCheckbox(checkbox);
            event.preventDefault();
        }
    }

    /**
     * Handles keyboard input for radio buttons
     */
    private handleRadioKeyboard(event: KeyboardEvent, radio: RadioInput): void {
        if (event.key === ' ') {
            this.checkboxManager.selectRadioButton(radio);
            event.preventDefault();
        }
    }

    /**
     * Handles keyboard input for select dropdowns
     */
    private handleSelectKeyboard(event: KeyboardEvent, selectElement: SelectElement, render: BabylonRender, style: StyleRule): void {
        switch (event.key) {
            case 'ArrowUp':
                this.selectManager.navigateOptions(selectElement, 'up');
                event.preventDefault();
                break;

            case 'ArrowDown':
                this.selectManager.navigateOptions(selectElement, 'down');
                event.preventDefault();
                break;

            case 'Enter':
                if (selectElement.dropdownOpen) {
                    // Commit the popup highlight and close.
                    this.selectManager.selectOption(selectElement, selectElement.activeOptionIndex);
                } else {
                    // Open dropdown
                    this.selectManager.openDropdown(selectElement, selectElement.mesh.getScene(), style);
                }
                event.preventDefault();
                break;

            case ' ':
                if (!selectElement.dropdownOpen) {
                    this.selectManager.openDropdown(selectElement, selectElement.mesh.getScene(), style);
                }
                event.preventDefault();
                break;

            case 'Escape':
                if (selectElement.dropdownOpen) {
                    this.selectManager.closeDropdown(selectElement);
                }
                event.preventDefault();
                break;
        }
    }

    /**
     * Prevents event propagation to other handlers
     */
    preventEventPropagation(event: KeyboardEvent): void {
        event.stopPropagation();
        event.stopImmediatePropagation();
    }
}
