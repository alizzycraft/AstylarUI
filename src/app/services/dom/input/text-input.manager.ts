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
import { TextSelectionControllerService, TextSelectionState } from '../../dom/interaction/text-selection-controller.service';
import { Subscription } from 'rxjs';
import { CONTROL_CONTENT_Z_OFFSET } from '../render-depth.constants';

export interface TextInputMutableState {
    value: string;
    cursorPosition: number;
    selectionStart: number;
    selectionEnd: number;
    selectionActive: boolean;
    selectionAnchor: number;
    selectionFocus: number;
    scrollOffset: number;
    scrollTop?: number;
    preserveSelectionOnReset: boolean;
}

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
    private readonly suppressSelectionScroll = new Set<string>();

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
            cursorState,
            preserveSelectionOnReset: false,
        };

        // Store reference to textInput in mesh metadata for interaction handler
        inputMesh.metadata = { ...inputMesh.metadata, textInput };

        // Always create layout metrics, even for empty inputs (needed for cursor positioning)
        if (render.scene) {
            // Use placeholder or a single space for layout calculation if no content
            const layoutText = textInput.textContent || textInput.placeholder || ' ';
            const textStyleProps = this.parseTextStyle(style);
            const pixelScale = render.actions.camera.getPixelToWorldScale();


            // Use text rendering service to create consistent layout metrics
            const storedLayoutMetrics = this.textRenderingService.createStoredLayoutMetrics(
                layoutText,
                textStyleProps,
                pixelScale
            );

            // Extract CSS metrics for cursor positioning (these are in CSS pixels)
            textInput.textLayoutMetrics = storedLayoutMetrics.css;

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

            const suppressPointerSelectionScroll =
                state.selectionSource === 'pointer' && state.hasSelection;
            if (suppressPointerSelectionScroll) {
                this.suppressSelectionScroll.add(state.elementId);
            }
            try {
                this.applyControllerState(textInput, state);

                // Update visual cursor
                this.updateCursorPosition(textInput, this.activeRender, textInput.style);
            } finally {
                if (suppressPointerSelectionScroll) {
                    this.suppressSelectionScroll.delete(state.elementId);
                }
            }
        });
    }

    /**
     * Handles focus event - hides placeholder and creates cursor
     */
    handleFocus(textInput: TextInput, render: BabylonRender, style: StyleRule): void {


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

            // Empty content intentionally has no texture; using zero keeps the
            // caret at the left edge without asking the text renderer to create
            // a texture it cannot represent.
            textInput.textureWidth = 0;
        }

        // Create cursor mesh if it doesn't exist and we have layout metrics
        if (!textInput.cursorMesh && render.scene && textInput.textLayoutMetrics && textInput.textureWidth !== undefined) {

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

    private applyControllerState(textInput: TextInput, state: TextSelectionState): void {
        if (state.range) {
            textInput.selectionStart = state.range.start;
            textInput.selectionEnd = state.range.end;
            textInput.cursorState.selectionStart = state.anchorIndex ?? state.range.start;
            textInput.cursorState.selectionEnd = state.focusIndex ?? state.range.end;
            textInput.cursorState.selectionActive = state.hasSelection;
        }
        if (state.focusIndex !== null) {
            textInput.cursorPosition = state.focusIndex;
            textInput.cursorState.position = state.focusIndex;
        }
    }

    /** Releases a mesh-local material without disposing its cache-owned text texture. */
    private disposeTextMesh(mesh: BABYLON.AbstractMesh): void {
        const material = mesh.material;
        mesh.material = null;
        mesh.dispose();
        material?.dispose(false, false);
    }

    /**
     * Updates the text display mesh
     */
    private updateTextDisplay(textInput: TextInput, render: BabylonRender, style: StyleRule): void {
        // Dispose existing text mesh
        if (textInput.textMesh) {
            this.disposeTextMesh(textInput.textMesh);
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



            // Use text rendering service to create consistent layout metrics
            const storedLayoutMetrics = this.textRenderingService.createStoredLayoutMetrics(
                textToRender,
                textStyleProps,
                pixelScale,
                maxTextWidth
            );

            // Extract CSS metrics for cursor positioning (these are in CSS pixels)
            textInput.textLayoutMetrics = storedLayoutMetrics.css;


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

            const inputHeight = textInput.mesh.getBoundingInfo().boundingBox.extendSize.y * 2;
            const verticalInsets = this.getVerticalContentInsets(textStyle, pixelScale);
            const borderSize = Math.max(0, this.parseSize(textStyle.borderWidth) || 0) * pixelScale;
            const verticalOrigin = Math.max(0, verticalInsets.top - borderSize);
            const clientHeight = Math.max(0, inputHeight - (borderSize * 2));
            const contentHeight = Math.max(
                0,
                inputHeight - verticalInsets.top - verticalInsets.bottom
            );
            const paddedTextureHeight = textureHeight + verticalOrigin
                + Math.max(0, verticalInsets.bottom - borderSize);
            const isVerticallyClipped = isTextarea && paddedTextureHeight > clientHeight;
            const visibleWidth = Math.min(textureWidth, availableWidth);
            const visibleHeight = isVerticallyClipped ? contentHeight : textureHeight;

            // A clipped plane is the control's content viewport. UV scaling
            // selects the corresponding portion of the full cached texture.
            const textMesh = this.babylonMeshService.createTextMesh(
                `text_${textInput.element.id}`,
                texture,
                visibleWidth,
                visibleHeight
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
            textInput.textureHeight = textureHeight;

            // Align text mesh based on textAlign style
            const textAlign = (textStyle.textAlign || 'left').toLowerCase();
            const insets = contentInsets;

            // Handle clipping if text exceeds available width
            if (textureWidth > availableWidth) {

                textMesh.position.x = (insets.right - insets.left) / 2;
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
            }

            textInput.textMesh = textMesh;
            if (isTextarea) {
                textInput.textMesh.position.y =
                    inputHeight / 2 - verticalInsets.top - visibleHeight / 2;
            }
            this.syncScroll(textInput, render);

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
                textInput.scrollOffset || 0,
                textInput.scrollTop || 0,
                verticalOrigin / pixelScale
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
        const borderWidth = Math.max(0, this.parseSize(textInput.style.borderWidth) || 0) * scale;
        const paddingLeft = Math.max(0, insets.left - borderWidth) / scale;
        const paddingRight = Math.max(0, insets.right - borderWidth) / scale;
        const clientWidth = Math.max(0, inputWidth - (borderWidth * 2)) / scale;
        const inputHeight = textInput.mesh.getBoundingInfo().boundingBox.extendSize.y * 2;
        const verticalInsets = this.getVerticalContentInsets(textInput.style, scale);
        const borderSize = borderWidth;
        const paddingTop = Math.max(0, verticalInsets.top - borderSize) / scale;
        const paddingBottom = Math.max(0, verticalInsets.bottom - borderSize) / scale;
        const availableHeight = Math.max(0, inputHeight - (borderSize * 2));
        const vh = availableHeight / scale;

        // Get actual texture width from stored metrics
        const fullTextureWidth = textInput.textureWidth || 1;
        const fullTextureHeight = textInput.textureHeight || 1;
        const currentMeshWidth = textInput.textMesh.getBoundingInfo().boundingBox.maximum.x - textInput.textMesh.getBoundingInfo().boundingBox.minimum.x;
        const currentMeshHeight = textInput.textMesh.getBoundingInfo().boundingBox.maximum.y - textInput.textMesh.getBoundingInfo().boundingBox.minimum.y;

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
            const horizontalScrollWidth = textInput.textLayoutMetrics.totalWidth
                + paddingLeft + paddingRight;
            const maximumScrollOffset = Math.max(
                0,
                Math.floor(horizontalScrollWidth) - Math.floor(clientWidth)
            );
            textInput.scrollOffset = Math.min(
                textInput.scrollOffset || 0,
                maximumScrollOffset
            );
        }

        // Keep the active textarea line within the vertically clipped viewport.
        const scrollHeight = (fullTextureHeight / scale) + paddingTop + paddingBottom;
        const isVerticalScrollable = textInput.type === InputType.Textarea && scrollHeight > vh;
        if (!isVerticalScrollable) {
            textInput.scrollTop = 0;
        } else {
            textInput.scrollTop = Math.max(0, textInput.scrollTop || 0);
            const cursorLine = this.findCursorLine(textInput);
            if (cursorLine && !this.suppressSelectionScroll.has(textInput.element.id!)) {
                const fontSize = this.parseSize(textInput.style.fontSize) || 16;
                const lineHeight = this.parseSize(textInput.style.lineHeight) || fontSize * 1.2;
                const halfLeading = Math.max(0, (lineHeight - fontSize) / 2);
                const cursorTop = cursorLine.top + paddingTop;
                const cursorBottom = cursorLine.bottom + paddingTop + halfLeading;
                if (cursorTop < textInput.scrollTop) {
                    textInput.scrollTop = Math.max(0, cursorTop - Math.max(1, halfLeading / 4));
                } else if (cursorBottom > textInput.scrollTop + vh) {
                    textInput.scrollTop = cursorBottom - vh;
                }
            }
            const maxScrollTop = Math.max(0, scrollHeight - vh);
            textInput.scrollTop = Math.min(textInput.scrollTop, maxScrollTop);
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

            diffTex.vScale = currentMeshHeight / fullTextureHeight;
            diffTex.vOffset = isVerticalScrollable
                ? ((textInput.scrollTop || 0) - paddingTop)
                    / Math.max(1, textInput.textLayoutMetrics.totalHeight)
                : 0;
            if (mat.emissiveTexture) {
                const emissTex = mat.emissiveTexture as BABYLON.Texture;
                emissTex.vScale = diffTex.vScale;
                emissTex.vOffset = diffTex.vOffset;
            }
        }

        // Update interaction registry
        this.textInteractionRegistry.updateScrollOffset(textInput.element.id!, textInput.scrollOffset || 0);
        this.textInteractionRegistry.updateScrollTop(textInput.element.id!, textInput.scrollTop || 0);
    }

    /** Applies wheel deltas without snapping the viewport back to the caret. */
    scrollBy(textInput: TextInput, deltaX: number, deltaY: number): boolean {
        if (!this.activeRender || textInput.type !== InputType.Textarea ||
            !textInput.textMesh || !textInput.textLayoutMetrics) return false;
        const previousLeft = textInput.scrollOffset ?? 0;
        const previousTop = textInput.scrollTop ?? 0;
        textInput.scrollOffset = Math.max(0, previousLeft + deltaX);
        textInput.scrollTop = Math.max(0, previousTop + deltaY);
        const elementId = textInput.element.id!;
        this.suppressSelectionScroll.add(elementId);
        try {
            this.syncScroll(textInput, this.activeRender);
        } finally {
            this.suppressSelectionScroll.delete(elementId);
        }
        return textInput.scrollOffset !== previousLeft || textInput.scrollTop !== previousTop;
    }

    private findCursorLine(textInput: TextInput): { top: number; bottom: number } | undefined {
        const lines = textInput.textLayoutMetrics?.lines ?? [];
        let cursorLine = lines[lines.length - 1];
        for (const line of lines) {
            if (textInput.cursorPosition <= line.endIndex) {
                cursorLine = line;
                break;
            }
        }
        return cursorLine;
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
        const hasSelection = textInput.selectionStart !== textInput.selectionEnd;

        if (direction === CursorDirection.Up || direction === CursorDirection.Down) {
            const entry = textInput.textMesh
                ? this.textInteractionRegistry?.getByMesh(textInput.textMesh)
                : undefined;
            if (!entry) return;

            const anchor = isShiftKey && textInput.cursorState.selectionActive
                ? textInput.cursorState.selectionStart
                : textInput.cursorPosition;
            const controllerState = this.textSelectionController.snapshot;
            if (controllerState.elementId !== entry.elementId ||
                controllerState.focusIndex !== textInput.cursorPosition ||
                (isShiftKey && controllerState.anchorIndex !== anchor)) {
                this.textSelectionController.setSelection(entry, anchor, textInput.cursorPosition);
            }
            const state = this.textSelectionController.moveSelectionWithKeyboard(
                entry,
                direction === CursorDirection.Up ? 'up' : 'down',
                isShiftKey
            );
            this.applyControllerState(textInput, state);
            return;
        }

        if (!isShiftKey && hasSelection) {
            newPosition = direction === CursorDirection.Left || direction === CursorDirection.Home
                ? Math.min(textInput.selectionStart, textInput.selectionEnd)
                : Math.max(textInput.selectionStart, textInput.selectionEnd);
        } else {
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
        }

        // Handle selection with shift key
        if (isShiftKey) {
            if (!textInput.cursorState.selectionActive) {
                textInput.cursorState.selectionActive = true;
                textInput.cursorState.selectionStart = textInput.cursorPosition;
            }
            textInput.cursorState.selectionEnd = newPosition;
            textInput.selectionStart = Math.min(textInput.cursorState.selectionStart, newPosition);
            textInput.selectionEnd = Math.max(textInput.cursorState.selectionStart, newPosition);
        } else {
            // Clear selection when moving without shift
            textInput.cursorState.selectionActive = false;
            textInput.cursorState.selectionStart = newPosition;
            textInput.cursorState.selectionEnd = newPosition;
            textInput.selectionStart = newPosition;
            textInput.selectionEnd = newPosition;
        }

        textInput.cursorPosition = newPosition;
        textInput.cursorState.position = newPosition;

        const entry = textInput.textMesh
            ? this.textInteractionRegistry?.getByMesh(textInput.textMesh)
            : undefined;
        if (entry) {
            this.textSelectionController.setSelection(
                entry,
                isShiftKey ? textInput.cursorState.selectionStart : newPosition,
                newPosition
            );
        }
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
        textInput.cursorState.selectionStart = textInput.cursorPosition;
        textInput.cursorState.selectionEnd = textInput.cursorPosition;
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

        this.suppressSelectionScroll.add(textInput.element.id!);
        try {
            // Sync the exact range with the global controller. Pointer coordinates
            // cannot represent the end of a multiline value on the first row.
            if (textInput.textMesh) {
                const entry = this.textInteractionRegistry.getByMesh(textInput.textMesh);
                if (entry) {
                    this.textSelectionController.setSelection(entry, 0, textLength);
                }
            }

            if (this.activeRender) {
                this.updateCursorPosition(textInput, this.activeRender, textInput.style);
            }
        } finally {
            this.suppressSelectionScroll.delete(textInput.element.id!);
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

        if (textInput.type === InputType.Textarea) {
            const cursorLine = this.findCursorLine(textInput);
            if (cursorLine) {
                const inputHeight = textInput.mesh.getBoundingInfo().boundingBox.extendSize.y * 2;
                const verticalInsets = this.getVerticalContentInsets(style, pixelScale);
                const borderSize = Math.max(0, this.parseSize(style.borderWidth) || 0) * pixelScale;
                const paddingTop = Math.max(0, verticalInsets.top - borderSize);
                const lineCenter = (cursorLine.top + cursorLine.bottom) / 2;
                textInput.cursorMesh.position.y = inputHeight / 2 - borderSize - paddingTop
                    - ((lineCenter - (textInput.scrollTop || 0)) * pixelScale);
            }
        }
    }

    /**
     * Parses size value from style
     */
    private parseSize(value: string | undefined): number | undefined {
        if (!value) return undefined;
        const num = parseFloat(value);
        return isNaN(num) ? undefined : num;
    }

    /** Restores an authored value using the native reset behavior for the last blur modality. */
    resetTextValue(textInput: TextInput, value: string): void {
        const clamp = (position: number): number =>
            Math.max(0, Math.min(value.length, position));
        const preserveSelection = textInput.preserveSelectionOnReset === true;
        textInput.value = value;
        textInput.textContent = value;
        textInput.cursorPosition = preserveSelection ? clamp(textInput.cursorPosition) : 0;
        textInput.selectionStart = preserveSelection ? clamp(textInput.selectionStart) : 0;
        textInput.selectionEnd = preserveSelection ? clamp(textInput.selectionEnd) : 0;
        textInput.cursorState.position = textInput.cursorPosition;
        textInput.cursorState.selectionStart = preserveSelection
            ? clamp(textInput.cursorState.selectionStart)
            : 0;
        textInput.cursorState.selectionEnd = preserveSelection
            ? clamp(textInput.cursorState.selectionEnd)
            : 0;
        textInput.cursorState.selectionActive = textInput.cursorState.selectionActive &&
            textInput.selectionStart !== textInput.selectionEnd;
        if (!preserveSelection) {
            textInput.scrollOffset = 0;
            textInput.scrollTop = 0;
        }
        if (this.activeRender) {
            const elementId = textInput.element.id!;
            if (preserveSelection) this.suppressSelectionScroll.add(elementId);
            try {
                this.updateTextDisplay(textInput, this.activeRender, textInput.style);
            } finally {
                if (preserveSelection) this.suppressSelectionScroll.delete(elementId);
            }
        }
    }

    /** Restores user-owned text state after a compatible full renderer rebuild. */
    restoreMutableState(textInput: TextInput, state: TextInputMutableState): void {
        const value = state.value;
        const clamp = (position: number): number =>
            Math.max(0, Math.min(value.length, position));
        textInput.value = value;
        textInput.textContent = value;
        textInput.cursorPosition = clamp(state.cursorPosition);
        textInput.selectionStart = clamp(state.selectionStart);
        textInput.selectionEnd = clamp(state.selectionEnd);
        textInput.cursorState.position = textInput.cursorPosition;
        textInput.cursorState.selectionActive = state.selectionActive &&
            textInput.selectionStart !== textInput.selectionEnd;
        textInput.cursorState.selectionStart = clamp(state.selectionAnchor);
        textInput.cursorState.selectionEnd = clamp(state.selectionFocus);
        textInput.scrollOffset = Math.max(0, state.scrollOffset);
        textInput.scrollTop = Math.max(0, state.scrollTop ?? 0);
        textInput.preserveSelectionOnReset = state.preserveSelectionOnReset;
        if (this.activeRender) {
            const elementId = textInput.element.id!;
            this.suppressSelectionScroll.add(elementId);
            try {
                this.updateTextDisplay(textInput, this.activeRender, textInput.style);
            } finally {
                this.suppressSelectionScroll.delete(elementId);
            }
        }
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
