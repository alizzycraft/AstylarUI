import { Injectable } from '@angular/core';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { StyleRule } from '../../../types/style-rule';
import { DOMElement } from '../../../types/dom-element';
import { Mesh } from '@babylonjs/core';
import { TextRenderingService } from '../../text/text-rendering.service';
import { TextStyleParserService } from '../../text/text-style-parser.service';
import { DOMAncestryService } from '../dom-ancestry.service';

interface IntrinsicTextMetrics {
    text: string;
    width: number;
    height: number;
    lineHeight: number;
}

/**
 * Service responsible for calculating element dimensions and positioning
 */
@Injectable({
    providedIn: 'root'
})
export class ElementDimensionService {
    constructor(
        private textRenderingService: TextRenderingService,
        private textStyleParser: TextStyleParserService,
        private ancestry: DOMAncestryService
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
        const parentStyle = dom.context.elementStyles.get(parent.name)?.normal;
        const parentBorderWidth = parentStyle?.borderWidth
            ? Math.max(0, parseFloat(parentStyle.borderWidth) || 0)
            : 0;
        const usesPositionedContainingBlock =
            style?.position === 'absolute' || style?.position === 'fixed';

        // Calculate the parent's content area (excluding padding)
        const contentWidth = parentWidth - parentPadding.left - parentPadding.right;
        const contentHeight = parentHeight - parentPadding.top - parentPadding.bottom;

        const debugKey = `${element.type}${element.id ? `#${element.id}` : ''}${element.class ? `.${element.class.replace(/\s+/g, '.')}` : ''}`;

        // Parse padding and margin
        const padding = this.parsePadding(render, style, undefined);
        const margin = this.parseMargin(style);
        const borderWidth = style?.borderWidth
            ? Math.max(0, parseFloat(style.borderWidth) || 0)
            : 0;
        const layoutInsets = {
            top: padding.top + borderWidth,
            right: padding.right + borderWidth,
            bottom: padding.bottom + borderWidth,
            left: padding.left + borderWidth,
        };

        const horizontalPadding = padding.left + padding.right;
        const verticalPadding = padding.top + padding.bottom;

        const defaultStyle = render.actions.style.getElementTypeDefaults(element.type) || {};
        const rawDisplay = style?.display ?? defaultStyle.display ?? 'block';
        const display = typeof rawDisplay === 'string' ? rawDisplay.toLowerCase() : 'block';
        const isInlineLevel = display.startsWith('inline');

        const textMetrics = this.measureTextContent(dom, render, element, style, styles);
        if (textMetrics) {
            console.log(`[DIMENSION] ${debugKey} intrinsicText width=${textMetrics.width.toFixed(2)} height=${textMetrics.height.toFixed(2)} lineHeight=${textMetrics.lineHeight.toFixed(2)}`);
        }

        const hasTextContent = !!textMetrics;

        console.log(`[DIMENSION] ${debugKey} parentContent=${contentWidth}x${contentHeight} padding=${this.formatBox(padding)} margin=${this.formatBox(margin)} display=${display}`);

        // Default dimensions - use content area, not full parent dimensions
        let width = contentWidth;
        let height = contentHeight;
        let x = 0;
        let y = 0;

        let widthSource = 'parent-content';
        let heightSource = 'parent-content';

        const widthValue = style?.width;
        if (widthValue !== undefined) {
            if (typeof widthValue === 'string') {
                if (widthValue === 'auto') {
                    if (isInlineLevel || hasTextContent || element.type === 'button' || element.type === 'input') {
                        width = this.calculateIntrinsicWidth(element, style, textMetrics, padding);
                        widthSource = 'width:auto-intrinsic';
                    }
                } else if (widthValue.endsWith('px')) {
                    width = parseFloat(widthValue);
                    widthSource = `width:${widthValue}`;
                } else if (widthValue.endsWith('%')) {
                    const widthPercent = parseFloat(widthValue);
                    const widthReference = usesPositionedContainingBlock
                        ? parentWidth - parentBorderWidth * 2
                        : contentWidth;
                    width = (widthReference * widthPercent) / 100;
                    widthSource = `width:${widthValue}`;
                } else {
                    const parsedWidth = parseFloat(widthValue);
                    if (!Number.isNaN(parsedWidth)) {
                        width = parsedWidth;
                        widthSource = `width:${widthValue}`;
                    }
                }
            } else if (typeof widthValue === 'number' && !Number.isNaN(widthValue)) {
                width = widthValue;
                widthSource = `width:${widthValue}`;
            }
        } else if (isInlineLevel || element.type === 'button' || element.type === 'input') {
            width = this.calculateIntrinsicWidth(element, style, textMetrics, padding);
            widthSource = isInlineLevel ? 'inline-intrinsic' : 'text-intrinsic';
        }

        if (textMetrics && widthSource.includes('intrinsic')) {
            console.log(`[DIMENSION-INTRINSIC] ${debugKey} text="${textMetrics.text.trim()}" measuredWidth=${textMetrics.width.toFixed(2)} paddingH=${horizontalPadding} finalWidth=${width.toFixed(2)} source=${widthSource}`);
        }

        // Calculate height - percentages are relative to parent's content height
        const heightValue = style?.height;
        if (heightValue !== undefined) {
            if (typeof heightValue === 'string') {
                if (heightValue === 'auto') {
                    if (isInlineLevel) {
                        const intrinsicHeight = this.calculateIntrinsicHeight(element, textMetrics, padding);
                        if (intrinsicHeight !== null) {
                            height = intrinsicHeight;
                            heightSource = 'height:auto-intrinsic';
                        }
                    }
                } else if (heightValue.endsWith('px')) {
                    height = parseFloat(heightValue);
                    heightSource = `height:${heightValue}`;
                } else if (heightValue.endsWith('%')) {
                    const heightPercent = parseFloat(heightValue);
                    const heightReference = usesPositionedContainingBlock
                        ? parentHeight - parentBorderWidth * 2
                        : contentHeight;
                    height = (heightReference * heightPercent) / 100;
                    heightSource = `height:${heightValue}`;
                } else {
                    const parsedHeight = parseFloat(heightValue);
                    if (!Number.isNaN(parsedHeight)) {
                        height = parsedHeight;
                        heightSource = `height:${heightValue}`;
                    }
                }
            } else if (typeof heightValue === 'number' && !Number.isNaN(heightValue)) {
                height = heightValue;
                heightSource = `height:${heightValue}`;
            }
        } else if (isInlineLevel || hasTextContent) {
            const intrinsicHeight = this.calculateIntrinsicHeight(element, textMetrics, padding);
            if (intrinsicHeight !== null) {
                height = intrinsicHeight;
                heightSource = isInlineLevel
                    ? 'inline-intrinsic'
                    : 'block-text-intrinsic';
            }
        }

        if (textMetrics && heightSource.includes('intrinsic')) {
            console.log(`[DIMENSION-INTRINSIC] ${debugKey} text="${textMetrics.text.trim()}" measuredHeight=${textMetrics.height.toFixed(2)} paddingV=${verticalPadding} finalHeight=${height.toFixed(2)} source=${heightSource}`);
        }

        const minWidth = style?.minWidth ? this.parseLength(`${style.minWidth}`, contentWidth) : undefined;
        const minHeight = style?.minHeight ? this.parseLength(`${style.minHeight}`, contentHeight) : undefined;
        if (minWidth !== undefined && !Number.isNaN(minWidth)) {
            const originalWidth = width;
            width = Math.max(width, minWidth);
            if (width !== originalWidth) {
                console.log(`[DIMENSION] ${debugKey} applied minWidth=${minWidth}, adjusted width ${originalWidth}→${width}`);
                widthSource += '+minWidth';
            }
        }
        if (minHeight !== undefined && !Number.isNaN(minHeight)) {
            const originalHeight = height;
            height = Math.max(height, minHeight);
            if (height !== originalHeight) {
                console.log(`[DIMENSION] ${debugKey} applied minHeight=${minHeight}, adjusted height ${originalHeight}→${height}`);
                heightSource += '+minHeight';
            }
        }

        // Astylar historically interpreted declared dimensions as border-box sizes.
        // Preserve that behavior by default, while matching CSS when content-box is
        // requested explicitly: padding and borders then sit outside width/height.
        if (style?.boxSizing === 'content-box') {
            if (widthValue !== undefined && widthValue !== 'auto') {
                width += horizontalPadding + borderWidth * 2;
                widthSource += '+content-box';
            }
            if (heightValue !== undefined && heightValue !== 'auto') {
                height += verticalPadding + borderWidth * 2;
                heightSource += '+content-box';
            }
        }

        if (style) {
            const horizontalOriginInset = usesPositionedContainingBlock
                ? parentBorderWidth
                : parentPadding.left;
            const verticalOriginInset = usesPositionedContainingBlock
                ? parentBorderWidth
                : parentPadding.top;
            const positionedReferenceWidth = parentWidth - parentBorderWidth * 2;
            const positionedReferenceHeight = parentHeight - parentBorderWidth * 2;

            if (style.left !== undefined) {
                if (typeof style.left === 'string' && style.left.endsWith('px')) {
                    x = -(parentWidth / 2) + horizontalOriginInset + parseFloat(style.left) + (width / 2);
                    console.log(`[ElementDimension] Calculated X (px): ${x} (parentW=${parentWidth}, contentW=${contentWidth}, paddingLeft=${parentPadding.left}, left=${style.left}, width=${width})`);
                } else if (typeof style.left === 'string' && style.left.endsWith('%')) {
                    const leftPercent = parseFloat(style.left);
                    const leftPixels = ((usesPositionedContainingBlock ? positionedReferenceWidth : contentWidth) * leftPercent) / 100;
                    x = -(parentWidth / 2) + horizontalOriginInset + leftPixels + (width / 2);
                    console.log(`[ElementDimension] Calculated X (%): ${x} (parentW=${parentWidth}, contentW=${contentWidth}, paddingLeft=${parentPadding.left}, left=${style.left}, leftPx=${leftPixels}, width=${width})`);
                } else {
                    x = -(parentWidth / 2) + horizontalOriginInset + parseFloat(`${style.left}`) + (width / 2);
                    console.log(`[ElementDimension] Calculated X (val): ${x} (parentW=${parentWidth}, contentW=${contentWidth}, paddingLeft=${parentPadding.left}, left=${style.left}, width=${width})`);
                }
            } else {
                x = -(parentWidth / 2) + parentPadding.left + (contentWidth / 2);
                console.log(`[ElementDimension] No left style for ${style.selector}, x centered in content area: ${x}`);
            }

            if (style.top !== undefined) {
                if (typeof style.top === 'string' && style.top.endsWith('px')) {
                    y = (parentHeight / 2) - verticalOriginInset - parseFloat(style.top) - (height / 2);
                } else if (typeof style.top === 'string' && style.top.endsWith('%')) {
                    const topPercent = parseFloat(style.top);
                    const topPixels = ((usesPositionedContainingBlock ? positionedReferenceHeight : contentHeight) * topPercent) / 100;
                    y = (parentHeight / 2) - verticalOriginInset - topPixels - (height / 2);
                } else {
                    y = (parentHeight / 2) - verticalOriginInset - parseFloat(`${style.top}`) - (height / 2);
                }
            } else {
                y = (parentHeight / 2) - parentPadding.top - (contentHeight / 2);
            }
        }

        console.log(`[DIMENSION] ${debugKey} widthResolved=${width} [source=${widthSource}]`);
        console.log(`[DIMENSION] ${debugKey} heightResolved=${height} [source=${heightSource}]`);

        console.log(`[DIMENSION] ${debugKey} final width=${width} height=${height} position=(${x}, ${y})`);

        return { width, height, x, y, padding: layoutInsets, margin };
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
            return this.zeroBox();
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
            return this.zeroBox();
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

    private zeroBox() {
        return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    private formatBox(box: { top: number; right: number; bottom: number; left: number }): string {
        return `top:${box.top},right:${box.right},bottom:${box.bottom},left:${box.left}`;
    }

    /**
     * Calculate intrinsic width for elements with text content
     */
    private calculateIntrinsicWidth(
        element: DOMElement,
        style: StyleRule | undefined,
        textMetrics: IntrinsicTextMetrics | null,
        padding: { top: number; right: number; bottom: number; left: number }
    ): number {
        const totalPadding = (padding.left || 0) + (padding.right || 0);

        let measuredWidth = textMetrics?.width ?? 0;

        if (!textMetrics && element.type === 'input') {
            // Ensure inputs still have a reasonable default width when no content is present
            measuredWidth = Math.max(measuredWidth, 170 - totalPadding);
        }

        let finalWidth = measuredWidth + totalPadding;

        if (element.type === 'input') {
            finalWidth = Math.max(finalWidth, 170);
        }

        if (element.type !== 'input' && element.type !== 'button') {
            finalWidth = Math.max(finalWidth, 40);
        }

        return finalWidth;
    }

    private calculateIntrinsicHeight(
        element: DOMElement,
        textMetrics: IntrinsicTextMetrics | null,
        padding: { top: number; right: number; bottom: number; left: number }
    ): number | null {
        const totalPadding = (padding.top || 0) + (padding.bottom || 0);

        if (!textMetrics) {
            if (element.type === 'input' || element.type === 'button') {
                return Math.max(totalPadding, 40);
            }
            return totalPadding > 0 ? totalPadding : null;
        }

        let finalHeight = textMetrics.height + totalPadding;

        if (element.type === 'input' || element.type === 'button') {
            finalHeight = Math.max(finalHeight, 40);
        }

        return finalHeight;
    }

    private measureTextContent(
        dom: BabylonDOM,
        render: BabylonRender,
        element: DOMElement,
        style: StyleRule | undefined,
        styles: StyleRule[]
    ): IntrinsicTextMetrics | null {
        let textToMeasure = '';

        if (element.type === 'button') {
            textToMeasure = element.value || element.textContent || 'Button';
        } else if (element.type === 'input') {
            textToMeasure = element.value || element.placeholder || '';
        } else if (element.textContent) {
            textToMeasure = element.textContent;
        }

        if (!textToMeasure || textToMeasure.trim() === '') {
            return null;
        }

        const cascadedStyle = render.actions.style.findStyleForElement(element, styles, dom.context.elementStyles);
        const textStyle = this.getInheritedTextStyle(element, styles, dom, render);
        const effectiveStyle = cascadedStyle
            ? { ...textStyle, ...cascadedStyle, ...style }
            : (style ? { ...textStyle, ...style } : textStyle);
        const textStyleProperties = this.textStyleParser.parseTextProperties(effectiveStyle);
        const dimensions = this.textRenderingService.calculateTextDimensions(textToMeasure, textStyleProperties);

        const measuredLineHeight = dimensions.lineHeight ?? (textStyleProperties.fontSize * textStyleProperties.lineHeight);
        const measuredHeight = Math.max(dimensions.height, measuredLineHeight);

        return {
            text: textToMeasure,
            width: dimensions.width,
            height: measuredHeight,
            lineHeight: measuredLineHeight
        };
    }

    /**
     * Helper to get inherited text style
     */
    private getInheritedTextStyle(
        element: DOMElement,
        styles: StyleRule[],
        dom: BabylonDOM,
        render: BabylonRender
    ): StyleRule {
        const fallback: StyleRule = {
            selector: element.id ? `#${element.id}` : element.type,
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            fontWeight: 'normal',
            fontStyle: 'normal',
            lineHeight: 'normal',
            color: '#000000',
            textAlign: 'left',
            whiteSpace: 'normal'
        };
        const parent = this.ancestry.getParent(element);
        const inherited = parent
            ? this.pickInheritedTextProperties(
                this.getInheritedTextStyle(parent, styles, dom, render)
              )
            : {};
        const own = render.actions.style.findStyleForElement(
            element,
            styles,
            dom.context.elementStyles
        );
        return { ...fallback, ...inherited, ...own };
    }

    private pickInheritedTextProperties(style: StyleRule): Partial<StyleRule> {
        const properties: Array<keyof StyleRule> = [
            'color', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight',
            'letterSpacing', 'wordSpacing', 'textAlign', 'whiteSpace', 'wordWrap',
            'textTransform', 'cursor'
        ];
        return Object.fromEntries(
            properties
                .filter(property => style[property] !== undefined)
                .map(property => [property, style[property]])
        ) as Partial<StyleRule>;
    }
}
