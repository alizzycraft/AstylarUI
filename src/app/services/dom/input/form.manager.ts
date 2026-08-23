import { Injectable } from '@angular/core';
import { DOMElement } from '../../../types/dom-element';
import { Form, FormValidationResult, InputElement, ValidationRule } from '../../../types/input-types';
import { FormValidatorService } from './form-validator.service';

/**
 * Service responsible for managing forms and form submission
 */
@Injectable({
    providedIn: 'root'
})
export class FormManager {
    private forms: Map<string, Form> = new Map();

    constructor(private formValidator: FormValidatorService) { }

    /**
     * Creates a form container
     */
    createForm(element: DOMElement, submitHandler?: (formData: FormData) => void): Form {
        const form: Form = {
            element,
            inputs: [],
            validationRules: new Map(),
            submitHandler,
            validationState: {
                valid: true,
                fieldErrors: new Map(),
                globalErrors: []
            }
        };

        if (element.id) {
            this.forms.set(element.id, form);
        }

        return form;
    }

    /**
     * Registers an input element with a form
     */
    registerInput(form: Form, inputElement: InputElement): void {
        if (!form.inputs.includes(inputElement)) {
            form.inputs.push(inputElement);
        }
    }

    /**
     * Unregisters an input element from a form
     */
    unregisterInput(form: Form, inputElement: InputElement): void {
        const index = form.inputs.indexOf(inputElement);
        if (index > -1) {
            form.inputs.splice(index, 1);
        }

        form.validationRules.delete(inputElement);
        form.validationState.fieldErrors.delete(inputElement);
    }

    /**
     * Adds a validation rule to an input in the form
     */
    addValidationRule(form: Form, inputElement: InputElement, rule: ValidationRule): void {
        if (!form.validationRules.has(inputElement)) {
            form.validationRules.set(inputElement, []);
        }

        const rules = form.validationRules.get(inputElement)!;
        if (!rules.includes(rule)) {
            rules.push(rule);
        }

        // Also add to input element
        this.formValidator.addValidationRule(inputElement, rule);
    }

    /**
     * Validates all inputs in the form
     */
    validateForm(form: Form): FormValidationResult {
        const fieldErrors = new Map<InputElement, string[]>();
        let allValid = true;

        // Validate each input
        for (const input of form.inputs) {
            const result = this.formValidator.validateInput(input);

            if (!result.valid) {
                allValid = false;
                fieldErrors.set(input, result.errors);
            }
        }

        form.validationState = {
            valid: allValid,
            fieldErrors,
            globalErrors: []
        };

        return form.validationState;
    }

    /**
     * Submits the form
     */
    submitForm(form: Form): boolean {
        // Validate form first
        const validationResult = this.validateForm(form);

        if (!validationResult.valid) {

            this.displayValidationErrors(form);
            return false;
        }

        // Collect form data
        const formData = this.collectFormData(form);

        // Execute submit handler
        if (form.submitHandler) {
            try {
                form.submitHandler(formData);
                return true;
            } catch (error) {
                console.error('Form submission error:', error);
                form.validationState.globalErrors.push('Form submission failed');
                return false;
            }
        }


        return true;
    }

    /**
     * Collects form data from all inputs
     */
    collectFormData(form: Form): FormData {
        const formData = new FormData();

        for (const input of form.inputs) {
            const name = input.element.name || input.element.id || '';
            if (name) {
                formData.append(name, String(input.value));
            }
        }

        return formData;
    }

    /**
     * Collects form data as a plain object
     */
    collectFormDataAsObject(form: Form): Record<string, any> {
        const data: Record<string, any> = {};

        for (const input of form.inputs) {
            const name = input.element.name || input.element.id || '';
            if (name) {
                data[name] = input.value;
            }
        }

        return data;
    }

    /**
     * Displays validation errors (would create visual error messages)
     */
    displayValidationErrors(form: Form): void {
        // In production, this would create visual error messages near inputs


        form.validationState.fieldErrors.forEach((errors, input) => {

        });

        if (form.validationState.globalErrors.length > 0) {

        }
    }

    /**
     * Clears validation errors
     */
    clearValidationErrors(form: Form): void {
        form.validationState.fieldErrors.clear();
        form.validationState.globalErrors = [];
        form.validationState.valid = true;

        // Clear errors on individual inputs
        for (const input of form.inputs) {
            input.validationState.errors = [];
            input.validationState.valid = true;
        }
    }

    /**
     * Resets form to initial state
     */
    resetForm(form: Form): void {
        // Clear validation errors
        this.clearValidationErrors(form);

        // Reset each input to default value
        for (const input of form.inputs) {
            // Reset value based on input type
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.value = false;
            } else {
                input.value = '';
            }

            // Reset validation state
            input.validationState.touched = false;
            input.validationState.dirty = false;
        }
    }

    /**
     * Gets a form by element ID
     */
    getForm(elementId: string): Form | undefined {
        return this.forms.get(elementId);
    }

    /**
     * Removes a form
     */
    removeForm(elementId: string): void {
        this.forms.delete(elementId);
    }

    /**
     * Checks if form is valid
     */
    isFormValid(form: Form): boolean {
        const validationResult = this.validateForm(form);
        return validationResult.valid;
    }

    /**
     * Checks if form has been modified
     */
    isFormDirty(form: Form): boolean {
        return form.inputs.some(input => input.validationState.dirty);
    }

    /**
     * Checks if form has been touched
     */
    isFormTouched(form: Form): boolean {
        return form.inputs.some(input => input.validationState.touched);
    }
}
