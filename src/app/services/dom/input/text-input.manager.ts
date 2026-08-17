import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { TextInput, InputType, CursorState, ValidationState, CursorDirection } from '../../../types/input-types';
import { TextCursorRenderer } from './text-cursor.renderer';
import { TextRenderingService } from '../../text/text-rendering.service';
import { TextSelectionService } from '../../text/text-selection.service';
import { TextCanvasRendererService } from '../../text/text-canvas-renderer.service';
import { StyleRule } from '../../../types/style-rule';
import { BabylonRender } from '../interfaces/render.types';
import { BabylonMeshService } from '../../babylon-mesh.service';
import { TextLayoutMetrics, TextStyleProperties, StoredTextLayoutMetrics } from '../../../types/text-rendering';
import { TextInteractionRegistryService } from '../../dom/interaction/text-interaction-registry.service';
import { TextSelectionControllerService } from '../../dom/interaction/text-selection-controller.service';
import { Subscription } from 'rxjs';
import { CONTROL_CONTENT_Z_OFFSET } from '../render-depth.constants';

/**
 * Service responsible for managing text input fields
 */
@Injectable({
    providedIn: 'root'
})
export class TextInputManager {
    private selectionSubscription: Subscription | null = null;
    private inputs: Map<string, TextInput> = new Map();
    private activeRender: BabylonRender | null = null;

    constructor(
        private cursorRenderer: TextCursorRenderer,
        private textRenderingService: TextRenderingService,
        private textSelectionService: TextSelectionService,
        private textCanvasRenderer: TextCanvasRendererService,
        private babylonMeshService: BabylonMeshService,
        private textInteractionRegistry: TextInteractionRegistryService,
        private textSelectionController: TextSelectionControllerService
    ) {
        this.setupSelectionSync();
    }

    /**
     * Creates a text input element
     */
    createTextInput(
        element: DOMElement,
        render: BabylonRender,
        parentMesh: BABYLON.Mesh,
        style: StyleRule,
        worldDimensions: { width: number; height: number }
    ): TextInput {
        // Create input field background
        const inputMesh = this.createInputBackground(element, render, style, worldDimensions);

        // Interaction is now handled by the global PointerInteractionService
        // and synchronized via setupSelectionSync.

        // Initialize cursor state
        const cursorState: CursorState = {
            position: 0,
            visible: false,
            selectionActive: false,
            selectionStart: 0,
            selectionEnd: 0
        };

        // Initialize validation state
        const validationState: ValidationState = {
            valid: true,
            errors: [],
            touched: false,
            dirty: false
        };

        // Create text input object
        const textInput: TextInput = {
            element,
            type: this.determineInputType(element),
            value: element.value || '',
            textContent: element.value || '',
            cursorPosition: 0,
            style, // Store style for text rendering

            selectionStart: 0,
            selectionEnd: 0,
            focused: false,
            disabled: element.disabled || false,
            required: element.required || false,
            validationRules: [],
            validationState,
            mesh: inputMesh,
            placeholder: element.placeholder,
            maxLength: element.maxLength,
            cursorState
        };

        // Store reference to textInput in mesh metadata for interaction handler
        inputMesh.metadata = { ...inputMesh.metadata, textInput };

        // Always create layout metrics, even for empty inputs (needed for cursor positioning)
        if (render.scene) {
            // Use placeholder or a single space for layout calculation if no content
            const layoutText = textInput.textContent || textInput.placeholder || ' ';
            const textStyleProps = this.parseTextStyle(style);
            const pixelScale = render.actions.camera.getPixelToWorldScale();
            console.log('[TextInputManager] Creating initial layout metrics for:', layoutText);

            // Use text rendering service to create consistent layout metrics
            const storedLayoutMetrics = this.textRenderingService.createStoredLayoutMetrics(
                layoutText,
                textStyleProps,
                pixelScale
            );

            // Extract CSS metrics for cursor positioning (these are in CSS pixels)
            textInput.textLayoutMetrics = storedLayoutMetrics.css;
            console.log('[TextInputManager] Initial layout metrics:', textInput.textLayoutMetrics);
        }

        // Create text mesh if there's initial content or placeholder
        if ((textInput.textContent || textInput.placeholder) && render.scene) {
            this.updateTextDisplay(textInput, render, style);
        }

        // Store in local map
        this.inputs.set(element.id!, textInput);
        this.activeRender = render;

        return textInput;
    }

    /**
     * Sets up synchronization with global selection state
     */
    private setupSelectionSync(): void {
        this.selectionSubscription = this.textSelectionController.selection$.subscribe(state => {
            if (!state.elementId) return;

            const textInput = this.inputs.get(state.elementId);
            if (!textInput || !this.activeRender) return;

            // Only sync if focused
            if (!textInput.focused) return;

            // Sync indices
            if (state.range) {
                textInput.selectionStart = state.range.start;
                textInput.selectionEnd = state.range.end;
                textInput.cursorState.selectionStart = state.range.start;
                textInput.cursorState.selectionEnd = state.range.end;
                textInput.cursorState.selectionActive = state.hasSelection;
            }

            if (state.focusIndex !== null) {
                textInput.cursorPosition = state.focusIndex;
                textInput.cursorState.position = state.focusIndex;
            }

            // Update visual cursor
            this.updateCursorPosition(textInput, this.activeRender, textInput.style);
        });
    }

    /**
     * Handles focus event - hides placeholder and creates cursor
     */
    handleFocus(textInput: TextInput, render: BabylonRender, style: StyleRule): void {
        console.log('[TextInputManager] handleFocus called for:', textInput.element.id);

        // If showing placeholder (no actual value), hide the text mesh
        if (!textInput.textContent && textInput.placeholder && textInput.textMesh) {
            textInput.textMesh.isVisible = false;
        }

        // If the input is empty and a placeholder was shown, recalculate layout
        // metrics for an empty string so the cursor starts at the left (0)
        if (!textInput.textContent && textInput.placeholder && render.scene) {
            const textStyleProps = this.parseTextStyle(style);
            const pixelScale = render.actions.camera.getPixelToWorldScale();

            // Use text rendering service to create consistent layout metrics
            const storedLayoutMetrics = this.textRenderingService.createStoredLayoutMetrics('', textStyleProps, pixelScale);

            // Extract CSS metrics for cursor positioning (these are in CSS pixels)
            textInput.textLayoutMetrics = storedLayoutMetrics.css;
            console.log('[TextInputManager] Recalculated empty layout metrics for focus');
            // Also compute a texture width that matches the empty layout so cursor
            // positioning uses consistent units (avoid using the placeholder texture width)
            try {
                const emptyTexture = this.textRenderingService.renderTextToTexture(
                    textInput.element,
                    '',
                    style
                );
                const size = emptyTexture.getSize();
                const scale = render.actions.camera.getPixelToWorldScale();
                const devicePixelRatio = window.devicePixelRatio || 1;
                textInput.textureWidth = (size.width / devicePixelRatio) * scale;
                // We intentionally do not create a visible text mesh for empty content
                console.log('[TextInputManager] Computed empty texture width for cursor positioning:', textInput.textureWidth);
            } catch (err) {
                console.warn('[TextInputManager] Failed to compute empty texture width:', err);
                // Fallback to 0 so left-edge calculations behave reasonably
                textInput.textureWidth = 0;
            }
        }

        // Create cursor mesh if it doesn't exist and we have layout metrics
        if (!textInput.cursorMesh && render.scene && textInput.textLayoutMetrics && textInput.textureWidth !== undefined) {
            console.log('[TextInputManager] Creating cursor mesh with scale:', render.actions.camera.getPixelToWorldScale());
            const textStyle = this.parseTextStyle(style);
            textInput.cursorMesh = this.textSelectionService.createTextCursor(
                textInput.cursorPosition,
                textInput.textLayoutMetrics,
                textInput.mesh,
                render.scene,
                render.actions.camera.getPixelToWorldScale(),
                textStyle,
                textInput.textureWidth,
                // Pass width correction ratio to calibrate cursor position to actual texture width
                textInput.textLayoutMetrics.totalWidth > 0 ?
                    (textInput.textureWidth / render.actions.camera.getPixelToWorldScale()) / textInput.textLayoutMetrics.totalWidth : 1.0
            );
        }

        // Show cursor
        if (textInput.cursorMesh) {
            textInput.cursorMesh.isVisible = true;
            textInput.cursorState.visible = true;
            console.log('[TextInputManager] Cursor made visible');
        }
    }

    /**
     * Handles blur event - shows placeholder if empty and hides cursor
     */
    handleBlur(textInput: TextInput): void {
        // If no content, show placeholder again
        if (!textInput.textContent && textInput.placeholder) {
            // Force update display to re-render placeholder text
            // This ensures textMesh is recreated with placeholder content if it was disposed
            // or if it was just hidden, invisible.
            if (this.activeRender) {
                this.updateTextDisplay(textInput, this.activeRender, textInput.style);
            }
            if (textInput.textMesh) {
                textInput.textMesh.isVisible = true;
            }
        }

        // Hide cursor
        if (textInput.cursorMesh) {
            textInput.cursorMesh.isVisible = false;
            textInput.cursorState.visible = false;
        }
    }

    /**
     * Updates the text display mesh
     */
    private updateTextDisplay(textInput: TextInput, render: BabylonRender, style: StyleRule): void {
        // Dispose existing text mesh
        if (textInput.textMesh) {
            textInput.textMesh.dispose();
            textInput.textMesh = undefined;
        }

        const textToRender = textInput.value || textInput.placeholder || '';
        if (!textToRender) return;

        // Determine style (placeholder vs normal)
        const textStyle = { ...style };
        if (!textStyle.color) textStyle.color = '#000000'; // Default to black

        if (!textInput.value && textInput.placeholder) {
            textStyle.color = '#888888'; // Placeholder color
            // Ensure font style is present
            if (!textStyle.fontSize) textStyle.fontSize = '16px';
            if (!textStyle.fontFamily) textStyle.fontFamily = 'Arial';
        }

        try {
            // Calculate layout metrics for cursor and selection positioning
            // Use the same service method as text rendering to ensure consistency
            const textStyleProps = this.parseTextStyle(textStyle);
            const pixelScale = render.actions.camera.getPixelToWorldScale();
            const isTextarea = textInput.type === InputType.Textarea;
            const inputWidth = textInput.mesh.getBoundingInfo().boundingBox.extendSize.x * 2;
            const contentInsets = this.getHorizontalContentInsets(textStyle, pixelScale);
            const availableWidth = Math.max(0, inputWidth - contentInsets.left - contentInsets.right);
            const maxTextWidth = isTextarea ? availableWidth / pixelScale : undefined;
            console.log('[TextInputManager] Calculating layout metrics for text:', textToRender);
            console.log('[TextInputManager] Text style props:', textStyleProps);

            // Use text rendering service to create consistent layout metrics
            const storedLayoutMetrics = this.textRenderingService.createStoredLayoutMetrics(
                textToRender,
                textStyleProps,
                pixelScale,
                maxTextWidth
            );

            // Extract CSS metrics for cursor positioning (these are in CSS pixels)
            textInput.textLayoutMetrics = storedLayoutMetrics.css;
            console.log('[TextInputManager] Layout metrics calculated:', textInput.textLayoutMetrics);

            // Get texture from service
            const texture = this.textRenderingService.renderTextToTexture(
                textInput.element,
                textToRender,
                textStyle,
                maxTextWidth
            );

            // Get texture dimensions
            const textureSize = texture.getSize();
            const textureWidthPx = textureSize.width;
            const textureHeightPx = textureSize.height;

            // Convert to world units using camera's pixel-to-world scale
            const devicePixelRatio = window.devicePixelRatio || 1;
            // Normalize by DPR to ensure we use logical CSS pixels for world sizing
            const textureWidth = (textureWidthPx / devicePixelRatio) * pixelScale;
            const textureHeight = (textureHeightPx / devicePixelRatio) * pixelScale;

            // Create text mesh using BabylonMeshService
            const textMesh = this.babylonMeshService.createTextMesh(
                `text_${textInput.element.id}`,
                texture,
                textureWidth,
                textureHeight
            );

            textMesh.parent = textInput.mesh;
            textMesh.position.y = -2 * pixelScale;
            textMesh.position.z = CONTROL_CONTENT_Z_OFFSET;
            textMesh.isPickable = true;
            textMesh.renderingGroupId = 0;

            // Rotate the text mesh 180 degrees around the Z axis to fix horizontal flipping without affecting vertical orientation
            // Only apply this rotation to text input meshes
            textMesh.rotation.z = Math.PI;

            // Store world-space texture width for cursor positioning
            textInput.textureWidth = textureWidth;

            // Align text mesh based on textAlign style
            const textAlign = (textStyle.textAlign || 'left').toLowerCase();
            const insets = contentInsets;

            // Handle clipping if text exceeds available width
            if (textureWidth > availableWidth) {
                console.log(`[TextInputManager] Clipping text mesh: ${textureWidth.toFixed(3)} > ${availableWidth.toFixed(3)}`);

                // Re-create mesh with clipped width or just scale it?
                // Re-creating is safer to ensure bounding info is correct for interactions
                textMesh.dispose();
                const clippedTextMesh = this.babylonMeshService.createTextMesh(
                    `text_${textInput.element.id}`,
                    texture,
                    availableWidth,
                    textureHeight
                );

                clippedTextMesh.parent = textInput.mesh;
                clippedTextMesh.position.y = -2 * pixelScale;
                clippedTextMesh.position.z = CONTROL_CONTENT_Z_OFFSET;
                clippedTextMesh.isPickable = true;
                clippedTextMesh.renderingGroupId = 0;
                clippedTextMesh.rotation.z = Math.PI;

                textInput.textMesh = clippedTextMesh;
                clippedTextMesh.position.x = (insets.right - insets.left) / 2;

                // Sync scroll and UVs
                this.syncScroll(textInput, render);
            } else {
                // No clipping needed
                textInput.scrollOffset = 0;
                if (textAlign === 'right') {
                    textMesh.position.x = -(inputWidth / 2) + (textureWidth / 2) + insets.right;
                } else if (textAlign === 'center' || textAlign === 'middle') {
                    textMesh.position.x = (insets.right - insets.left) / 2;
                } else {
                    textMesh.position.x = (inputWidth / 2) - (textureWidth / 2) - insets.left;
                }
                textInput.textMesh = textMesh;

                // If not clipped, ensure UVs are reset
                const mat = textMesh.material as BABYLON.StandardMaterial;
                if (mat && mat.diffuseTexture) {
                    (mat.diffuseTexture as BABYLON.Texture).uScale = 1.0;
                    (mat.diffuseTexture as BABYLON.Texture).uOffset = 0.0;
                    if (mat.emissiveTexture) {
                        (mat.emissiveTexture as BABYLON.Texture).uScale = 1.0;
                        (mat.emissiveTexture as BABYLON.Texture).uOffset = 0.0;
                    }
                }
            }

            if (isTextarea && textInput.textMesh) {
                const inputHeight = textInput.mesh.getBoundingInfo().boundingBox.extendSize.y * 2;
                const verticalInsets = this.getVerticalContentInsets(textStyle, pixelScale);
                textInput.textMesh.position.y = inputHeight / 2 - verticalInsets.top - textureHeight / 2;
            }

            // Register with text interaction registry for drag selection
            const storedMetrics: StoredTextLayoutMetrics = {
                scale: pixelScale,
                css: textInput.textLayoutMetrics,
                world: {
                    totalWidth: textureWidth,
                    totalHeight: textureHeight,
                    lineHeight: textInput.textLayoutMetrics.lineHeight * (textureHeight / textInput.textLayoutMetrics.totalHeight),
                    ascent: textInput.textLayoutMetrics.ascent * (textureHeight / textInput.textLayoutMetrics.totalHeight),
                    descent: textInput.textLayoutMetrics.descent * (textureHeight / textInput.textLayoutMetrics.totalHeight),
                    lines: textInput.textLayoutMetrics.lines.map((line: any) => ({
                        ...line,
                        top: line.top * (textureHeight / textInput.textLayoutMetrics.totalHeight),
                        bottom: line.bottom * (textureHeight / textInput.textLayoutMetrics.totalHeight),
                        width: line.width * (textureWidth / textInput.textLayoutMetrics.totalWidth),
                        height: line.height * (textureHeight / textInput.textLayoutMetrics.totalHeight)
                    })),
                    characters: textInput.textLayoutMetrics.characters.map((char: any) => ({
                        ...char,
                        x: char.x * (textureWidth / textInput.textLayoutMetrics.totalWidth),
                        width: char.width * (textureWidth / textInput.textLayoutMetrics.totalWidth),
                        advance: char.advance * (textureWidth / textInput.textLayoutMetrics.totalWidth)
                    }))
                }
            };

            this.textInteractionRegistry.register(
                textInput.element.id!,
                textInput.textMesh!,
                style,
                storedMetrics,
                textToRender,
                textInput.scrollOffset || 0
            );

        } catch (error) {
            console.error('Error creating text input mesh:', error);
        }
    }

    /**
     * Synchronizes the scroll offset and UV mapping for the text mesh
     */
    private syncScroll(textInput: TextInput, render: BabylonRender): void {
        if (!textInput.textMesh || !textInput.textLayoutMetrics) return;

        const inputWidth = textInput.mesh.getBoundingInfo().boundingBox.extendSize.x * 2;
        const scale = render.actions.camera.getPixelToWorldScale();
        const insets = this.getHorizontalContentInsets(textInput.style, scale);
        const availableWidth = Math.max(0, inputWidth - insets.left - insets.right);
        const vw = availableWidth / scale; // Visible width in CSS pixels

        // Get actual texture width from stored metrics
        const fullTextureWidth = textInput.textureWidth || 1;
        const currentMeshWidth = textInput.textMesh.getBoundingInfo().boundingBox.maximum.x - textInput.textMesh.getBoundingInfo().boundingBox.minimum.x;

        // Only scroll if text is wider than available area
        if (fullTextureWidth <= availableWidth) {
            textInput.scrollOffset = 0;
        } else {
            // Calculate scroll offset to keep cursor in view
            if (!textInput.scrollOffset) textInput.scrollOffset = 0;

            if (textInput.cursorPosition >= 0) {
                // Find cursor X position in CSS pixels
                let cursorX = 0;
                const characters = textInput.textLayoutMetrics.characters;
                if (textInput.cursorPosition < characters.length) {
                    cursorX = characters[textInput.cursorPosition].x;
                } else {
                    // Position at end of text
                    const lastChar = characters[characters.length - 1];
                    cursorX = lastChar ? lastChar.x + lastChar.width : 0;
                }

                // Keep cursor in view: [scrollOffset, scrollOffset + vw]
                const buffer = 10;
                if (cursorX < textInput.scrollOffset) {
                    textInput.scrollOffset = Math.max(0, cursorX - buffer);
                } else if (cursorX > textInput.scrollOffset + vw) {
                    textInput.scrollOffset = cursorX - vw + buffer;
                }
            }
        }

        // Apply UV offset to show the scrolled portion
        const mat = textInput.textMesh.material as BABYLON.StandardMaterial;
        if (mat && mat.diffuseTexture) {
            const diffTex = mat.diffuseTexture as BABYLON.Texture;

            // Calculate uScale based on current mesh width relative to full texture width
            // This ensures 1.0 scale when not clipped and correct clipping when it is.
            diffTex.uScale = currentMeshWidth / fullTextureWidth;

            const totalPixelWidth = textInput.textLayoutMetrics.totalWidth;
            if (totalPixelWidth > 0) {
                diffTex.uOffset = (textInput.scrollOffset || 0) / totalPixelWidth;
            }

            if (mat.emissiveTexture) {
                const emissTex = mat.emissiveTexture as BABYLON.Texture;
                emissTex.uScale = diffTex.uScale;
                emissTex.uOffset = diffTex.uOffset;
            }
        }

        // Update interaction registry
        this.textInteractionRegistry.updateScrollOffset(textInput.element.id!, textInput.scrollOffset || 0);
    }

    /**
     * Creates the input field background mesh
     */
    private createInputBackground(
        element: DOMElement,
        render: BabylonRender,
        style: StyleRule,
        worldDimensions: { width: number; height: number }
    ): BABYLON.Mesh {
        // Use calculated world dimensions directly
        const width = worldDimensions.width;
        const height = worldDimensions.height;

        const inputMesh = BABYLON.MeshBuilder.CreatePlane(`input_${element.id}`, {
            width,
            height,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE // Ensure visibility from both sides
        }, render.scene);

        // Create material with CSS background color
        const material = new BABYLON.StandardMaterial(`inputMaterial_${element.id}`, render.scene);

        // Apply CSS background color instead of hard-coded white
        const bgColor = this.parseColor(style?.background);
        material.diffuseColor = bgColor;
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.backFaceCulling = false; // Ensure visibility

        inputMesh.material = material;
        inputMesh.isPickable = true; // Enable clicking

        // Add cursor style metadata locally as well to ensure it persists
        inputMesh.metadata = {
            ...(inputMesh.metadata || {}),
            cursor: 'text',
            textInput: undefined // Will be set in createTextInput
        };

        return inputMesh;
    }

    /**
     * Determines the input type from element
     */
    private determineInputType(element: DOMElement): InputType {
        if (element.type === 'textarea') {
            return InputType.Textarea;
        }

        const inputType = element.inputType?.toLowerCase();

        switch (inputType) {
            case 'password': return InputType.Password;
            case 'email': return InputType.Email;
            case 'number': return InputType.Number;
            case 'textarea': return InputType.Textarea;
            default: return InputType.Text;
        }
    }

    /**
     * Calculates cursor height based on font size
     */
    private calculateCursorHeight(style: StyleRule, render: BabylonRender): number {
        const fontSizePx = this.parseSize(style.fontSize) || 16;
        const scale = render.actions.camera.getPixelToWorldScale();
        return fontSizePx * scale * 1.2; // Slightly taller than font
    }

    /**
     * Moves the cursor in the specified direction
     */
    moveCursor(textInput: TextInput, direction: CursorDirection, isShiftKey: boolean = false): void {
        const textLength = textInput.textContent.length;
        let newPosition = textInput.cursorPosition;

        switch (direction) {
            case CursorDirection.Left:
                newPosition = Math.max(0, textInput.cursorPosition - 1);
                break;
            case CursorDirection.Right:
                newPosition = Math.min(textLength, textInput.cursorPosition + 1);
                break;
            case CursorDirection.Home:
                newPosition = 0;
                break;
            case CursorDirection.End:
                newPosition = textLength;
                break;
        }

        // Handle selection with shift key
        if (isShiftKey) {
            if (!textInput.cursorState.selectionActive) {
                textInput.cursorState.selectionActive = true;
                textInput.selectionStart = textInput.cursorPosition;
            }
            textInput.selectionEnd = newPosition;
        } else {
            // Clear selection when moving without shift
            textInput.cursorState.selectionActive = false;
            textInput.selectionStart = newPosition;
            textInput.selectionEnd = newPosition;
        }

        textInput.cursorPosition = newPosition;
        textInput.cursorState.position = newPosition;
    }

    /**
     * Updates cursor position after movement (without render/style parameters)
     */
    updateCursorAfterMovement(textInput: TextInput, render: BabylonRender, style: StyleRule): void {
        if (!textInput.cursorMesh) return;

        // Use the provided render to compute correct pixel-to-world scale
        this.updateCursorPosition(textInput, render, style);
    }



    /**
     * Inserts text at the current cursor position
     */
    insertTextAtCursor(textInput: TextInput, text: string, render: BabylonRender, style: StyleRule): void {
        // Check max length
        if (textInput.maxLength && textInput.textContent.length + text.length > textInput.maxLength) {
            const allowedLength = textInput.maxLength - textInput.textContent.length;
            if (allowedLength <= 0) return;
            text = text.substring(0, allowedLength);
        }

        // Handle selection replacement
        let start = textInput.cursorPosition;
        let end = textInput.cursorPosition;

        if (textInput.cursorState.selectionActive) {
            start = Math.min(textInput.selectionStart, textInput.selectionEnd);
            end = Math.max(textInput.selectionStart, textInput.selectionEnd);
        }

        // Insert text
        const before = textInput.textContent.substring(0, start);
        const after = textInput.textContent.substring(end);
        textInput.textContent = before + text + after;
        textInput.value = textInput.textContent;

        // Move cursor after inserted text
        textInput.cursorPosition = start + text.length;
        textInput.cursorState.position = textInput.cursorPosition;

        // Clear selection
        textInput.cursorState.selectionActive = false;
        textInput.selectionStart = textInput.cursorPosition;
        textInput.selectionEnd = textInput.cursorPosition;

        // Mark as dirty
        textInput.validationState.dirty = true;

        // Update display
        this.updateTextDisplay(textInput, render, style);

        // Update cursor position
        this.updateCursorPosition(textInput, render, style);

        // Clear global selection state
        this.textSelectionController.clearSelection();
    }

    /**
     * Selects all text in the input
     */
    selectAll(textInput: TextInput): void {
        const textLength = textInput.textContent.length;
        textInput.selectionStart = 0;
        textInput.selectionEnd = textLength;
        textInput.cursorPosition = textLength;
        textInput.cursorState.selectionActive = true;
        textInput.cursorState.selectionStart = 0;
        textInput.cursorState.selectionEnd = textLength;
        textInput.cursorState.position = textLength;

        // Sync with global controller
        if (textInput.textMesh) {
            const entry = this.textInteractionRegistry.getByMesh(textInput.textMesh);
            if (entry) {
                // Approximate a select-all by moving from start to end
                this.textSelectionController.beginSelection(entry, { x: 0, y: 0 });
                this.textSelectionController.updateSelection(entry, { x: 999999, y: 0 }); // Far right
                this.textSelectionController.finalizeSelection();
            }
        }

        if (this.activeRender) {
            this.updateCursorPosition(textInput, this.activeRender, textInput.style);
        }
    }

    /**
     * Copies selected text to clipboard
     */
    async copy(textInput: TextInput): Promise<void> {
        if (!textInput.cursorState.selectionActive || textInput.selectionStart === textInput.selectionEnd) {
            return;
        }

        const start = Math.min(textInput.selectionStart, textInput.selectionEnd);
        const end = Math.max(textInput.selectionStart, textInput.selectionEnd);
        const selectedText = textInput.textContent.substring(start, end);

        try {
            await navigator.clipboard.writeText(selectedText);
            console.log('[TextInputManager] Copied to clipboard:', selectedText);
        } catch (err) {
            console.error('[TextInputManager] Clipboard copy failed:', err);
        }
    }

    /**
     * Pastes text from clipboard at cursor/selection
     */
    async paste(textInput: TextInput, render: BabylonRender, style: StyleRule): Promise<void> {
        try {
            const pastedText = await navigator.clipboard.readText();
            if (pastedText) {
                this.insertTextAtCursor(textInput, pastedText, render, style);
                console.log('[TextInputManager] Pasted from clipboard:', pastedText);
            }
        } catch (err) {
            console.error('[TextInputManager] Clipboard paste failed:', err);
        }
    }

    /**
     * Cuts selected text to clipboard
     */
    async cut(textInput: TextInput, render: BabylonRender, style: StyleRule): Promise<void> {
        await this.copy(textInput);
        this.deleteCharacter(textInput, 0, render, style); // direction 0 handles selection deletion
    }

    /**
     * Deletes character(s) at or around cursor
     * @param direction -1 for backspace (delete before), 1 for delete (delete after)
     */
    deleteCharacter(textInput: TextInput, direction: number, render: BabylonRender, style: StyleRule): void {
        // Handle selection deletion
        if (textInput.cursorState.selectionActive) {
            const start = Math.min(textInput.selectionStart, textInput.selectionEnd);
            const end = Math.max(textInput.selectionStart, textInput.selectionEnd);

            const before = textInput.textContent.substring(0, start);
            const after = textInput.textContent.substring(end);
            textInput.textContent = before + after;
            textInput.value = textInput.textContent;

            textInput.cursorPosition = start;
            textInput.cursorState.position = start;
            textInput.cursorState.selectionActive = false;
            textInput.selectionStart = start;
            textInput.selectionEnd = start;
        } else {
            // Single character deletion
            if (direction < 0 && textInput.cursorPosition > 0) {
                // Backspace
                const before = textInput.textContent.substring(0, textInput.cursorPosition - 1);
                const after = textInput.textContent.substring(textInput.cursorPosition);
                textInput.textContent = before + after;
                textInput.value = textInput.textContent;
                textInput.cursorPosition--;
                textInput.cursorState.position = textInput.cursorPosition;
            } else if (direction > 0 && textInput.cursorPosition < textInput.textContent.length) {
                // Delete
                const before = textInput.textContent.substring(0, textInput.cursorPosition);
                const after = textInput.textContent.substring(textInput.cursorPosition + 1);
                textInput.textContent = before + after;
                textInput.value = textInput.textContent;
            }
        }

        textInput.selectionStart = textInput.cursorPosition;
        textInput.selectionEnd = textInput.cursorPosition;
        textInput.cursorState.selectionStart = textInput.cursorPosition;
        textInput.cursorState.selectionEnd = textInput.cursorPosition;

        // Mark as dirty
        textInput.validationState.dirty = true;

        // Update display
        this.updateTextDisplay(textInput, render, style);

        // Update cursor position
        this.updateCursorPosition(textInput, render, style);

        // Clear global selection state
        this.textSelectionController.clearSelection();
    }

    /**
     * Updates the cursor mesh position based on current cursor position
     */
    updateCursorPosition(textInput: TextInput, render: BabylonRender, style: StyleRule): void {
        if (!textInput.textLayoutMetrics) return;

        // Sync scroll and UVs before positioning cursor
        this.syncScroll(textInput, render);

        const pixelScale = render.actions.camera.getPixelToWorldScale();
        // Calculate width correction ratio
        // textureWidth is in world units (already scaled by pixelToWorldScale)
        // totalWidth is in CSS pixels (unscaled)
        // We need to compare them in the same unit (logical CSS pixels) to find any discrepancy
        const widthCorrectionRatio = (textInput.textLayoutMetrics.totalWidth > 0 && textInput.textureWidth !== undefined)
            ? (textInput.textureWidth / pixelScale) / textInput.textLayoutMetrics.totalWidth
            : 1.0;

        // Create cursor if it doesn't exist yet and textureWidth is available
        if (!textInput.cursorMesh && render.scene && textInput.textLayoutMetrics) {
            const textStyle = this.parseTextStyle(style);
            textInput.cursorMesh = this.textSelectionService.createTextCursor(
                textInput.cursorPosition,
                textInput.textLayoutMetrics,
                textInput.mesh,
                render.scene,
                pixelScale,
                textStyle,
                textInput.textureWidth,
                widthCorrectionRatio,
                textInput.scrollOffset || 0
            );
        }

        if (!textInput.cursorMesh) return;

        console.log('[TextInputManager] Width correction ratio:', widthCorrectionRatio);

        // Use text selection service for accurate cursor positioning
        this.textSelectionService.updateCursorPosition(
            textInput.cursorMesh,
            textInput.cursorPosition,
            textInput.textLayoutMetrics,
            pixelScale,
            textInput.textureWidth,
            widthCorrectionRatio,
            textInput.scrollOffset || 0
        );
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
     * Resolve the CSS content edges used by single-line controls. Babylon's
     * local X axis is mirrored by the parity camera, so callers use these
     * physical insets when positioning text from the projected left/right.
     */
    private getHorizontalContentInsets(
        style: StyleRule,
        scale: number
    ): { left: number; right: number } {
        const padding = this.parseBoxShorthand(style.padding);
        const border = Math.max(0, this.parseSize(style.borderWidth) || 0);
        const left = Math.max(0, this.parseSize(style.paddingLeft) ?? padding.left);
        const right = Math.max(0, this.parseSize(style.paddingRight) ?? padding.right);

        return {
            left: (border + left) * scale,
            right: (border + right) * scale
        };
    }

    private getVerticalContentInsets(
        style: StyleRule,
        scale: number
    ): { top: number; bottom: number } {
        const values = style.padding
            ?.trim()
            .split(/\s+/)
            .map((part) => Math.max(0, this.parseSize(part) || 0)) ?? [];
        const border = Math.max(0, this.parseSize(style.borderWidth) || 0);
        const shorthandTop = values[0] ?? 0;
        const shorthandBottom = values.length === 3 || values.length === 4
            ? values[2]
            : shorthandTop;
        const top = Math.max(0, this.parseSize(style.paddingTop) ?? shorthandTop);
        const bottom = Math.max(0, this.parseSize(style.paddingBottom) ?? shorthandBottom);

        return {
            top: (border + top) * scale,
            bottom: (border + bottom) * scale
        };
    }

    private parseBoxShorthand(value: string | undefined): { left: number; right: number } {
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
     * Converts StyleRule to TextStyleProperties
     */
    private parseTextStyle(style: StyleRule): TextStyleProperties {
        const fontSize = this.parseSize(style.fontSize) || 16;
        const parsedLineHeight = parseFloat(style.lineHeight as string);
        const lineHeight = style.lineHeight?.endsWith('px')
            ? parsedLineHeight / fontSize
            : parsedLineHeight || 1.2;
        const supportedWhiteSpace = ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line'];
        const whiteSpace = supportedWhiteSpace.includes(style.whiteSpace || '')
            ? style.whiteSpace as TextStyleProperties['whiteSpace']
            : 'normal';

        // Helper function to safely cast font weight
        const parseFontWeight = (weight: string | undefined): TextStyleProperties['fontWeight'] => {
            if (!weight) return 'normal';
            const numWeight = parseInt(weight);
            if (!isNaN(numWeight)) return numWeight as any;
            return weight as TextStyleProperties['fontWeight'];
        };

        // Helper function to safely cast font style
        const parseFontStyle = (fontStyle: string | undefined): TextStyleProperties['fontStyle'] => {
            if (!fontStyle) return 'normal';
            if (['normal', 'italic', 'oblique'].includes(fontStyle)) {
                return fontStyle as TextStyleProperties['fontStyle'];
            }
            return 'normal';
        };

        // Helper function to safely cast text decoration
        const parseTextDecoration = (decoration: string | undefined): TextStyleProperties['textDecoration'] => {
            if (!decoration) return 'none';
            if (['none', 'underline', 'overline', 'line-through'].includes(decoration)) {
                return decoration as TextStyleProperties['textDecoration'];
            }
            return 'none';
        };

        return {
            fontFamily: style.fontFamily || 'Arial',
            fontSize,
            fontWeight: parseFontWeight(style.fontWeight),
            fontStyle: parseFontStyle(style.fontStyle),
            color: style.color || '#000000',
            textAlign: (style.textAlign as any) || 'left',
            verticalAlign: 'baseline',
            lineHeight,
            letterSpacing: this.parseSize(style.letterSpacing) || 0,
            wordSpacing: this.parseSize(style.wordSpacing) || 0,
            whiteSpace,
            wordWrap: 'normal',
            textOverflow: 'clip',
            textDecoration: parseTextDecoration(style.textDecoration),
            textTransform: (style.textTransform as any) || 'none'
        };
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

    /**
     * Cleanup text input resources
     */
    disposeTextInput(textInput: TextInput): void {
        this.cursorRenderer.disposeCursor(textInput);

        if (textInput.textMesh) {
            textInput.textMesh.dispose();
        }

        if (textInput.selectionMeshes) {
            this.textSelectionService.disposeSelectionMeshes(textInput.selectionMeshes);
        }

        if (textInput.cursorMesh) {
            textInput.cursorMesh.dispose();
        }

        if (textInput.mesh) {
            textInput.mesh.dispose();
        }
    }
}
