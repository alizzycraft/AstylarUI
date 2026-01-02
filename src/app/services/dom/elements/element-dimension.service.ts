import { Injectable } from '@angular/core';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { StyleRule } from '../../../types/style-rule';
import { DOMElement } from '../../../types/dom-element';
import { Mesh } from '@babylonjs/core';
import { TextRenderingService } from '../../text/text-rendering.service';
import { TextStyleParserService } from '../../text/text-style-parser.service';

/**
 * Service responsible for calculating element dimensions and positioning
 */
@Injectable({
    providedIn: 'root'
})
export class ElementDimensionService {
    constructor(
        private textRenderingService: TextRenderingService,
        private textStyleParser: TextStyleParserService
    ) { }

    /**
     * Calculate dimensions for an element based on its style and parent
     */
    calculateDimensions(
        dom: BabylonDOM,
        render: BabylonRender,
        element: DOMElement,
        style: StyleRule | undefined,
        parent: Mesh,
        styles: StyleRule[]
    ): {
        width: number;
        height: number;
        x: number;
        y: number;
        padding: { top: number; right: number; bottom: number; left: number };
        margin: { top: number; right: number; bottom: number; left: number };
    } {
        // Get parent dimensions from elementDimensions (in pixels)
        // Use parent.name since all elements are now stored by their mesh ID
        const parentDims = dom.context.elementDimensions.get(parent.name);
        if (!parentDims) {
            console.error(`[ElementDimension] Parent dimensions not found for ${parent.name}. Available keys:`, Array.from(dom.context.elementDimensions.keys()));
            throw new Error(`Parent dimensions not found for ${parent.name}`);
        }

        const parentWidth = parentDims.width;
        const parentHeight = parentDims.height;
        const parentPadding = parentDims.padding;

        // Calculate the parent's content area (excluding padding)
        const contentWidth = parentWidth - parentPadding.left - parentPadding.right;
        const contentHeight = parentHeight - parentPadding.top - parentPadding.bottom;

        // Parse padding and margin
        const padding = this.parsePadding(render, style, undefined);
        const margin = this.parseMargin(style);

        // Default dimensions - use content area, not full parent dimensions
        let width = contentWidth;
        let height = contentHeight;
        let x = 0;
        let y = 0;

        if (style) {
            // Calculate width - percentages are relative to parent's content width
            if (style.width) {
                if (typeof style.width === 'string' && style.width.endsWith('px')) {
                    width = parseFloat(style.width);
                } else if (typeof style.width === 'string' && style.width.endsWith('%')) {
                    const widthPercent = parseFloat(style.width);
                    width = (contentWidth * widthPercent) / 100;
                } else if (style.width === 'auto') {
                    // Calculate intrinsic width based on text content
                    if (element.textContent && element.textContent.trim() !== '') {
                        width = this.calculateIntrinsicWidth(render, element, style, styles);
                    } else if (element.type === 'button' || element.type === 'input') {
                        width = this.calculateIntrinsicWidth(render, element, style, styles);
                    } else {
                        width = contentWidth; // Default fallback for auto width
                    }
                } else {
                    width = parseFloat(style.width);
                }
            } else if (element.textContent && element.textContent.trim() !== '') {
                // If width is undefined but element has text content, calculate intrinsic width
                width = this.calculateIntrinsicWidth(render, element, style, styles);
            } else if (element.type === 'button' || element.type === 'input') {
                // If width is undefined, buttons/inputs should use intrinsic width
                width = this.calculateIntrinsicWidth(render, element, style, styles);
            }

            // Calculate height - percentages are relative to parent's content height
            if (style.height) {
                if (typeof style.height === 'string' && style.height.endsWith('px')) {
                    height = parseFloat(style.height);
                } else if (typeof style.height === 'string' && style.height.endsWith('%')) {
                    const heightPercent = parseFloat(style.height);
                    height = (contentHeight * heightPercent) / 100;
                } else {
                    height = parseFloat(style.height);
                }
            }

            // Calculate position - CSS uses top-left origin, BabylonJS uses center origin
            // Position is calculated relative to the content area, then offset by padding
            if (style.left !== undefined) {
                if (typeof style.left === 'string' && style.left.endsWith('px')) {
                    // Position within content area, then offset by left padding
                    x = -(parentWidth / 2) + parentPadding.left + parseFloat(style.left) + (width / 2);
                    console.log(`[ElementDimension] Calculated X (px): ${x} (parentW=${parentWidth}, contentW=${contentWidth}, paddingLeft=${parentPadding.left}, left=${style.left}, width=${width})`);
                } else if (typeof style.left === 'string' && style.left.endsWith('%')) {
                    const leftPercent = parseFloat(style.left);
                    const leftPixels = (contentWidth * leftPercent) / 100;
                    x = -(parentWidth / 2) + parentPadding.left + leftPixels + (width / 2);
                    console.log(`[ElementDimension] Calculated X (%): ${x} (parentW=${parentWidth}, contentW=${contentWidth}, paddingLeft=${parentPadding.left}, left=${style.left}, leftPx=${leftPixels}, width=${width})`);
                } else {
                    x = -(parentWidth / 2) + parentPadding.left + parseFloat(style.left) + (width / 2);
                    console.log(`[ElementDimension] Calculated X (val): ${x} (parentW=${parentWidth}, contentW=${contentWidth}, paddingLeft=${parentPadding.left}, left=${style.left}, width=${width})`);
                }
            } else {
                // No left specified, center horizontally within content area
                x = -(parentWidth / 2) + parentPadding.left + (contentWidth / 2);
                console.log(`[ElementDimension] No left style for ${style.selector}, x centered in content area: ${x}`);
            }

            if (style.top !== undefined) {
                if (typeof style.top === 'string' && style.top.endsWith('px')) {
                    // Position within content area, then offset by top padding
                    y = (parentHeight / 2) - parentPadding.top - parseFloat(style.top) - (height / 2);
                } else if (typeof style.top === 'string' && style.top.endsWith('%')) {
                    const topPercent = parseFloat(style.top);
                    const topPixels = (contentHeight * topPercent) / 100;
                    y = (parentHeight / 2) - parentPadding.top - topPixels - (height / 2);
                } else {
                    y = (parentHeight / 2) - parentPadding.top - parseFloat(style.top) - (height / 2);
                }
            } else {
                // No top specified, center vertically within content area
                y = (parentHeight / 2) - parentPadding.top - (contentHeight / 2);
            }
        }

        return { width, height, x, y, padding, margin };
    }

    /**
     * Parse padding values from style
     */
    parsePadding(
        render: BabylonRender,
        style: StyleRule | undefined,
        parentDimensions: { width: number; height: number } | undefined
    ): { top: number; right: number; bottom: number; left: number } {
        if (!style?.padding) {
            return { top: 0, right: 0, bottom: 0, left: 0 };
        }

        // Parse padding shorthand (supports: "10px", "10px 20px", "10px 20px 30px", "10px 20px 30px 40px")
        const parts = style.padding.split(' ');
        let top = 0, right = 0, bottom = 0, left = 0;

        if (parts.length === 1) {
            top = right = bottom = left = this.parseLength(parts[0], parentDimensions?.height);
        } else if (parts.length === 2) {
            top = bottom = this.parseLength(parts[0], parentDimensions?.height);
            right = left = this.parseLength(parts[1], parentDimensions?.width);
        } else if (parts.length === 3) {
            top = this.parseLength(parts[0], parentDimensions?.height);
            right = left = this.parseLength(parts[1], parentDimensions?.width);
            bottom = this.parseLength(parts[2], parentDimensions?.height);
        } else if (parts.length === 4) {
            top = this.parseLength(parts[0], parentDimensions?.height);
            right = this.parseLength(parts[1], parentDimensions?.width);
            bottom = this.parseLength(parts[2], parentDimensions?.height);
            left = this.parseLength(parts[3], parentDimensions?.width);
        }

        return { top, right, bottom, left };
    }

    /**
     * Parse margin values from style
     */
    parseMargin(style: StyleRule | undefined): { top: number; right: number; bottom: number; left: number } {
        if (!style?.margin) {
            return { top: 0, right: 0, bottom: 0, left: 0 };
        }

        // Similar logic to parsePadding
        const parts = style.margin.split(' ');
        let top = 0, right = 0, bottom = 0, left = 0;

        if (parts.length === 1) {
            top = right = bottom = left = this.parseLength(parts[0]);
        } else if (parts.length === 2) {
            top = bottom = this.parseLength(parts[0]);
            right = left = this.parseLength(parts[1]);
        } else if (parts.length === 3) {
            top = this.parseLength(parts[0]);
            right = left = this.parseLength(parts[1]);
            bottom = this.parseLength(parts[2]);
        } else if (parts.length === 4) {
            top = this.parseLength(parts[0]);
            right = this.parseLength(parts[1]);
            bottom = this.parseLength(parts[2]);
            left = this.parseLength(parts[3]);
        }

        return { top, right, bottom, left };
    }

    /**
     * Parse a CSS length value (px, %, etc.)
     */
    private parseLength(value: string, referenceValue?: number): number {
        if (value.endsWith('px')) {
            return parseFloat(value);
        }
        if (value.endsWith('%') && referenceValue !== undefined) {
            return (parseFloat(value) * referenceValue) / 100;
        }
        return parseFloat(value) || 0;
    }

    /**
     * Calculate intrinsic width for elements with text content
     */
    private calculateIntrinsicWidth(render: BabylonRender, element: DOMElement, style: StyleRule | undefined, styles: StyleRule[]): number {
        const textStyle = this.getInheritedTextStyle(element, styles);
        const textStyleProperties = this.textStyleParser.parseTextProperties(textStyle);

        // Determine the relevant text for measurement
        let textToMeasure = '';
        if (element.type === 'button') {
            textToMeasure = element.value || element.textContent || 'Button';
        } else if (element.type === 'input') {
            textToMeasure = element.value || element.placeholder || '';
        } else if (element.textContent) {
            // For all other elements, use textContent
            textToMeasure = element.textContent;
        }

        // Measure text dimensions
        let measuredWidth = 0;
        if (textToMeasure) {
            const dimensions = this.textRenderingService.calculateTextDimensions(textToMeasure, textStyleProperties);
            measuredWidth = dimensions.width;
        }

        // Parse padding
        const padding = this.parsePadding(render, style, undefined);
        const totalPadding = padding.left + padding.right;

        let finalWidth = measuredWidth + totalPadding;

        // Apply minimum width for text inputs
        if (element.type === 'input') {
            finalWidth = Math.max(finalWidth, 170);
        }

        // Apply a reasonable minimum width for other elements to prevent too-small boxes
        if (element.type !== 'input' && element.type !== 'button') {
            finalWidth = Math.max(finalWidth, 40); // Minimum 40px for inline elements
        }

        console.log(`[DIMENSION-INTRINSIC] ${element.type}#${element.id}: text="${textToMeasure}", measured=${measuredWidth}px, padding=${totalPadding}px, final=${finalWidth}px`);

        return finalWidth;
    }

    /**
     * Helper to get inherited text style
     */
    private getInheritedTextStyle(element: DOMElement, styles: StyleRule[]): StyleRule {
        let inheritedStyle: StyleRule = {
            selector: element.id ? `#${element.id}` : element.type,
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            fontWeight: 'normal',
            color: '#000000'
        };

        // Apply element type defaults (simplified)
        if (element.type === 'button') {
            inheritedStyle.fontWeight = 'bold';
        }

        // Apply class styles
        if (element.class) {
            const classNames = element.class.split(' ').filter(c => c.trim());
            for (const className of classNames) {
                const classStyle = styles.find(s => s.selector === `.${className}` || s.selector === className);
                if (classStyle) {
                    inheritedStyle = { ...inheritedStyle, ...classStyle };
                }
            }
        }

        // Apply ID styles
        if (element.id) {
            const idStyle = styles.find(s => s.selector === `#${element.id}`);
            if (idStyle) {
                inheritedStyle = { ...inheritedStyle, ...idStyle };
            }
        }

        return inheritedStyle;
    }
}
