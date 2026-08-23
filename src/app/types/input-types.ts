import { DOMElement } from './dom-element';
import * as BABYLON from '@babylonjs/core';
import { StyleRule } from './style-rule';

/**
 * Enum defining all supported input element types
 */
export enum InputType {
    Text = 'text',
    Password = 'password',
    Email = 'email',
    Number = 'number',
    Range = 'range',
    Button = 'button',
    Submit = 'submit',
    Checkbox = 'checkbox',
    Radio = 'radio',
    Select = 'select',
    Textarea = 'textarea'
}

/**
 * Enum defining button visual states
 */
export enum ButtonState {
    Normal = 'normal',
    Hover = 'hover',
    Pressed = 'pressed',
    Disabled = 'disabled',
    Focused = 'focused'
}

/**
 * Validation rule types
 */
export type ValidationRuleType =
    | 'required'
    | 'minLength'
    | 'maxLength'
    | 'pattern'
    | 'email'
    | 'number'
    | 'custom';

/**
 * Validation rule configuration
 */
export interface ValidationRule {
    type: ValidationRuleType;
    value?: any;
    message: string;
    validator?: (value: any) => boolean;
}

/**
 * Result of input validation
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Validation state for an input element
 */
export interface ValidationState {
    valid: boolean;
    errors: string[];
    touched: boolean;
    dirty: boolean;
}

/**
 * Cursor state for text input
 */
export interface CursorState {
    position: number;
    visible: boolean;
    blinkTimer?: number;
    selectionActive: boolean;
    selectionStart: number;
    selectionEnd: number;
}

/**
 * Base interface for all input elements
 */
export interface InputElement {
    element: DOMElement;
    type: InputType;
    value: any;
    focused: boolean;
    disabled: boolean;
    required: boolean;
    validationRules: ValidationRule[];
    validationState: ValidationState;
    mesh: BABYLON.Mesh;
    style: StyleRule;
    interactionHandler?: InputInteractionHandler;
}

/**
 * Text input element with cursor and selection support
 */
export interface TextInput extends InputElement {
    textContent: string;
    cursorPosition: number;
    selectionStart: number;
    selectionEnd: number;
    textMesh?: BABYLON.Mesh;
    cursorMesh?: BABYLON.Mesh;
    selectionMeshes?: BABYLON.Mesh[]; // Changed to array for multi-line support
    placeholder?: string;
    maxLength?: number;
    cursorState: CursorState;
    textLayoutMetrics?: any; // Will store TextLayoutMetrics from text rendering service
    textureWidth?: number; // Store world-space texture width for cursor positioning
    textureHeight?: number; // Store world-space texture height for multiline clipping
    scrollOffset?: number; // Horizontal scroll offset in CSS pixels
    scrollTop?: number; // Vertical scroll offset in CSS pixels for textareas
    /** Native reset keeps a tab-blurred caret but clears a pointer-blurred caret. */
    preserveSelectionOnReset?: boolean;
}

/**
 * Button element with state management
 */
export interface Button extends InputElement {
    label: string;
    state: ButtonState;
    action?: () => void;
    buttonType: 'button' | 'submit' | 'reset';
    labelMesh?: BABYLON.Mesh;
}

/**
 * Checkbox input element
 */
export interface CheckboxInput extends InputElement {
    checked: boolean;
    label?: string;
    checkIndicatorMesh?: BABYLON.Mesh;
    labelMesh?: BABYLON.Mesh;
}

/**
 * Radio button input element
 */
export interface RadioInput extends InputElement {
    checked: boolean;
    groupName: string;
    label?: string;
    selectionIndicatorMesh?: BABYLON.Mesh;
    labelMesh?: BABYLON.Mesh;
}

export interface RangeInput extends InputElement {
    value: number;
    min: number;
    max: number;
    step: number;
    trackMesh?: BABYLON.Mesh;
    activeTrackMesh?: BABYLON.Mesh;
    thumbMesh?: BABYLON.Mesh;
}

/**
 * Select option data
 */
export interface SelectOption {
    value: any;
    label: string;
    disabled?: boolean;
}

/**
 * Select dropdown element
 */
export interface SelectElement extends InputElement {
    options: SelectOption[];
    selectedIndex: number;
    /** Highlighted popup option; it is only committed to selectedIndex on acceptance. */
    activeOptionIndex: number;
    dropdownOpen: boolean;
    dropdownMesh?: BABYLON.Mesh;
    optionMeshes: BABYLON.Mesh[];
    displayMesh?: BABYLON.Mesh;
    indicatorMesh?: BABYLON.Mesh;
    cameraScale?: number; // Store camera scale for consistent text sizing
}

/**
 * Form container and management
 */
export interface Form {
    element: DOMElement;
    inputs: InputElement[];
    validationRules: Map<InputElement, ValidationRule[]>;
    submitHandler?: (formData: FormData) => void;
    validationState: FormValidationResult;
}

/**
 * Form validation result
 */
export interface FormValidationResult {
    valid: boolean;
    fieldErrors: Map<InputElement, string[]>;
    globalErrors: string[];
}

/**
 * Input interaction handler interface
 */
export interface InputInteractionHandler {
    handleClick?(inputElement: InputElement, event: any): void;
    handleKeyDown?(inputElement: InputElement, event: KeyboardEvent): void;
    handleKeyUp?(inputElement: InputElement, event: KeyboardEvent): void;
    handleFocus?(inputElement: InputElement): void;
    handleBlur?(inputElement: InputElement): void;
}

/**
 * Cursor movement direction
 */
export enum CursorDirection {
    Left = 'left',
    Right = 'right',
    Up = 'up',
    Down = 'down',
    Home = 'home',
    End = 'end'
}

/**
 * Button interaction types
 */
export enum ButtonInteraction {
    Click = 'click',
    Hover = 'hover',
    Press = 'press',
    Release = 'release'
}
