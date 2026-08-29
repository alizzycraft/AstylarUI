import { Injectable } from '@angular/core';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { StyleRule } from '../../../types/style-rule';
import { DOMElement } from '../../../types/dom-element';
import { Mesh } from '@babylonjs/core';
import { TextRenderingService } from '../../text/text-rendering.service';
import { TextStyleParserService } from '../../text/text-style-parser.service';
import { DOMAncestryService } from '../dom-ancestry.service';
import { resolveComputedFontSize } from '../utils/computed-font-size.util';
import { ImageLayoutService } from './image-layout.service';
import { ImageResourceService } from './image-resource.service';

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
        private ancestry: DOMAncestryService,
        private imageResources?: ImageResourceService,
        private imageLayout?: ImageLayoutService,
    ) { }

    /**
     * Fixed-positioned elements use the viewport root as their containing block
     * and must not inherit a positioned ancestor's mesh transform.
     */
    resolveLayoutParent(dom: BabylonDOM, style: StyleRule | undefined, parent: Mesh): Mesh {
        if (style?.position !== 'fixed') {
            return parent;
        }

        return dom.context.elements.get('root-body') ?? parent;
    }

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
        const viewportDims = dom.context.elementDimensions.get('root-body') ?? parentDims;
        const elementFontSize = Math.max(0, parseFloat(`${style?.fontSize ?? '16px'}`) || 16);
        const parentPadding = parentDims.padding;
        const parentStyle = dom.context.elementStyles.get(parent.name)?.normal;
        const parentBorder = this.parseBorderWidthBox(parentStyle);
        const usesPositionedContainingBlock =
            style?.position === 'absolute' || style?.position === 'fixed';

        // Calculate the parent's content area (excluding padding)
        const contentWidth = parentWidth - parentPadding.left - parentPadding.right;
        const contentHeight = parentHeight - parentPadding.top - parentPadding.bottom;

        const debugKey = `${element.type}${element.id ? `#${element.id}` : ''}${element.class ? `.${element.class.replace(/\s+/g, '.')}` : ''}`;

        // Parse padding and margin
        const padding = this.parsePadding(render, style, undefined);
        const margin = this.parseMargin(style);
        const borderWidth = this.parseBorderWidthBox(style);
        const layoutInsets = {
            top: padding.top + borderWidth.top,
            right: padding.right + borderWidth.right,
            bottom: padding.bottom + borderWidth.bottom,
            left: padding.left + borderWidth.left,
        };

        const horizontalPadding = padding.left + padding.right;
        const verticalPadding = padding.top + padding.bottom;

        const defaultStyle = render.actions.style.getElementTypeDefaults(element.type) || {};
        const rawDisplay = style?.display ?? defaultStyle.display ?? 'block';
        const display = typeof rawDisplay === 'string' ? rawDisplay.toLowerCase() : 'block';
        const isInlineLevel = display.startsWith('inline');

        const textMetrics = this.measureTextContent(dom, render, element, style, styles);
        if (textMetrics) {

        }

        const hasTextContent = !!textMetrics;



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
                    if (isInlineLevel || element.type === 'button' || element.type === 'input') {
                        width = this.calculateIntrinsicWidth(element, textMetrics, layoutInsets);
                        widthSource = 'width:auto-intrinsic';
                    }
                } else if (widthValue.endsWith('rem')) {
                    width = parseFloat(widthValue) * 16;
                    widthSource = `width:${widthValue}`;
                } else if (widthValue.endsWith('em')) {
                    width = parseFloat(widthValue) * elementFontSize;
                    widthSource = `width:${widthValue}`;
                } else if (widthValue.endsWith('vw')) {
                    width = (viewportDims.width * parseFloat(widthValue)) / 100;
                    widthSource = `width:${widthValue}`;
                } else if (widthValue.endsWith('vh')) {
                    width = (viewportDims.height * parseFloat(widthValue)) / 100;
                    widthSource = `width:${widthValue}`;
                } else if (widthValue.endsWith('px')) {
                    width = parseFloat(widthValue);
                    widthSource = `width:${widthValue}`;
                } else if (widthValue.endsWith('%')) {
                    const widthPercent = parseFloat(widthValue);
                    const widthReference = usesPositionedContainingBlock
                        ? parentWidth - parentBorder.left - parentBorder.right
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
            width = this.calculateIntrinsicWidth(element, textMetrics, layoutInsets);
            widthSource = isInlineLevel ? 'inline-intrinsic' : 'text-intrinsic';
        }

        if (textMetrics && widthSource.includes('intrinsic')) {

        }

        // Width constraints participate in line wrapping. Resolve them before
        // measuring width-dependent text height so the line count reflects the
        // element's final used width rather than its unconstrained declaration.
        const minWidth = style?.minWidth ? this.parseLength(`${style.minWidth}`, contentWidth) : undefined;
        const maxWidth = style?.maxWidth ? this.parseLength(`${style.maxWidth}`, contentWidth) : undefined;
        if (minWidth !== undefined && !Number.isNaN(minWidth)) {
            const originalWidth = width;
            width = Math.max(width, minWidth);
            if (width !== originalWidth) {

                widthSource += '+minWidth';
            }
        }
        if (maxWidth !== undefined && !Number.isNaN(maxWidth)) {
            const originalWidth = width;
            const effectiveMaxWidth = minWidth !== undefined && !Number.isNaN(minWidth)
                ? Math.max(maxWidth, minWidth)
                : maxWidth;
            width = Math.min(width, effectiveMaxWidth);
            if (width !== originalWidth) {

                widthSource += '+maxWidth';
            }
        }

        // Text height depends on the resolved content width. The initial
        // unconstrained measurement is still needed for shrink-to-fit widths,
        // but block text must be measured again at its actual wrapping width.
        const hasExplicitContentBoxWidth = style?.boxSizing === 'content-box' &&
            widthValue !== undefined && widthValue !== 'auto';
        const textContentWidth = hasExplicitContentBoxWidth
            ? width
            : Math.max(0, width - layoutInsets.left - layoutInsets.right);
        const constrainedTextMetrics = textMetrics && textContentWidth > 0
            ? this.measureTextContent(dom, render, element, style, styles, textContentWidth)
            : textMetrics;

        // Calculate height - percentages are relative to parent's content height
        const heightValue = style?.height;
        if (heightValue !== undefined) {
            if (typeof heightValue === 'string') {
                if (heightValue === 'auto') {
                    if (isInlineLevel || hasTextContent || element.type === 'textarea') {
                        const intrinsicHeight = this.calculateIntrinsicHeight(element, constrainedTextMetrics, layoutInsets);
                        if (intrinsicHeight !== null) {
                            height = intrinsicHeight;
                            heightSource = 'height:auto-intrinsic';
                        }
                    }
                } else if (heightValue.endsWith('rem')) {
                    height = parseFloat(heightValue) * 16;
                    heightSource = `height:${heightValue}`;
                } else if (heightValue.endsWith('em')) {
                    height = parseFloat(heightValue) * elementFontSize;
                    heightSource = `height:${heightValue}`;
                } else if (heightValue.endsWith('vw')) {
                    height = (viewportDims.width * parseFloat(heightValue)) / 100;
                    heightSource = `height:${heightValue}`;
                } else if (heightValue.endsWith('vh')) {
                    height = (viewportDims.height * parseFloat(heightValue)) / 100;
                    heightSource = `height:${heightValue}`;
                } else if (heightValue.endsWith('px')) {
                    height = parseFloat(heightValue);
                    heightSource = `height:${heightValue}`;
                } else if (heightValue.endsWith('%')) {
                    const heightPercent = parseFloat(heightValue);
                    const heightReference = usesPositionedContainingBlock
                        ? parentHeight - parentBorder.top - parentBorder.bottom
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
        } else if (isInlineLevel || hasTextContent || element.type === 'textarea') {
            const intrinsicHeight = this.calculateIntrinsicHeight(element, constrainedTextMetrics, layoutInsets);
            if (intrinsicHeight !== null) {
                height = intrinsicHeight;
                heightSource = isInlineLevel
                    ? 'inline-intrinsic'
                    : 'block-text-intrinsic';
            }
        }

        if (constrainedTextMetrics && heightSource.includes('intrinsic')) {

        }

        const minHeight = style?.minHeight ? this.parseLength(`${style.minHeight}`, contentHeight) : undefined;
        const maxHeight = style?.maxHeight ? this.parseLength(`${style.maxHeight}`, contentHeight) : undefined;
        if (minHeight !== undefined && !Number.isNaN(minHeight)) {
            const originalHeight = height;
            height = Math.max(height, minHeight);
            if (height !== originalHeight) {

                heightSource += '+minHeight';
            }
        }
        if (maxHeight !== undefined && !Number.isNaN(maxHeight)) {
            const originalHeight = height;
            const effectiveMaxHeight = minHeight !== undefined && !Number.isNaN(minHeight)
                ? Math.max(maxHeight, minHeight)
                : maxHeight;
            height = Math.min(height, effectiveMaxHeight);
            if (height !== originalHeight) {

                heightSource += '+maxHeight';
            }
        }

        // Astylar historically interpreted declared dimensions as border-box sizes.
        // Preserve that behavior by default, while matching CSS when content-box is
        // requested explicitly: padding and borders then sit outside width/height.
        if (style?.boxSizing === 'content-box') {
            if (widthValue !== undefined && widthValue !== 'auto') {
                width += horizontalPadding + borderWidth.left + borderWidth.right;
                widthSource += '+content-box';
            }
            if (heightValue !== undefined && heightValue !== 'auto') {
                height += verticalPadding + borderWidth.top + borderWidth.bottom;
                heightSource += '+content-box';
            }
        }

        const naturalImageSize = element.type === 'img'
            ? this.imageResources?.getNaturalSize(element.src || style?.src)
            : undefined;
        if (naturalImageSize && this.imageLayout) {
            const target = this.imageLayout.resolveIntrinsicBox(
                width,
                height,
                layoutInsets.left + layoutInsets.right,
                layoutInsets.top + layoutInsets.bottom,
                naturalImageSize.width,
                naturalImageSize.height,
                widthValue !== undefined && widthValue !== 'auto',
                heightValue !== undefined && heightValue !== 'auto',
            );
            width = target.width;
            height = target.height;
            widthSource = widthValue !== undefined && widthValue !== 'auto'
                ? widthSource
                : 'image-natural-width';
            heightSource = heightValue !== undefined && heightValue !== 'auto'
                ? heightSource
                : 'image-natural-height';
        }

        if (style) {
            const horizontalOriginInset = usesPositionedContainingBlock
                ? parentBorder.left
                : parentPadding.left;
            const verticalOriginInset = usesPositionedContainingBlock
                ? parentBorder.top
                : parentPadding.top;
            const positionedReferenceWidth = parentWidth - parentBorder.left - parentBorder.right;
            const positionedReferenceHeight = parentHeight - parentBorder.top - parentBorder.bottom;

            if (style.left !== undefined) {
                if (typeof style.left === 'string' && style.left.endsWith('rem')) {
                    const leftPixels = parseFloat(style.left) * 16;
                    x = -(parentWidth / 2) + horizontalOriginInset + leftPixels + (width / 2);
                } else if (typeof style.left === 'string' && style.left.endsWith('em')) {
                    const leftPixels = parseFloat(style.left) * elementFontSize;
                    x = -(parentWidth / 2) + horizontalOriginInset + leftPixels + (width / 2);
                } else if (typeof style.left === 'string' && style.left.endsWith('vw')) {
                    const leftPixels = (viewportDims.width * parseFloat(style.left)) / 100;
                    x = -(parentWidth / 2) + horizontalOriginInset + leftPixels + (width / 2);
                } else if (typeof style.left === 'string' && style.left.endsWith('vh')) {
                    const leftPixels = (viewportDims.height * parseFloat(style.left)) / 100;
                    x = -(parentWidth / 2) + horizontalOriginInset + leftPixels + (width / 2);
                } else if (typeof style.left === 'string' && style.left.endsWith('px')) {
                    x = -(parentWidth / 2) + horizontalOriginInset + parseFloat(style.left) + (width / 2);

                } else if (typeof style.left === 'string' && style.left.endsWith('%')) {
                    const leftPercent = parseFloat(style.left);
                    const leftPixels = ((usesPositionedContainingBlock ? positionedReferenceWidth : contentWidth) * leftPercent) / 100;
                    x = -(parentWidth / 2) + horizontalOriginInset + leftPixels + (width / 2);

                } else {
                    x = -(parentWidth / 2) + horizontalOriginInset + parseFloat(`${style.left}`) + (width / 2);

                }
            } else if (style.right !== undefined) {
                const rightPixels = this.parsePositionLength(
                    style.right,
                    positionedReferenceWidth,
                    viewportDims,
                    elementFontSize,
                );
                x = (parentWidth / 2) - parentBorder.right - rightPixels - (width / 2);
            } else {
                x = -(parentWidth / 2) + parentPadding.left + (contentWidth / 2);

            }

            if (style.top !== undefined) {
                if (typeof style.top === 'string' && style.top.endsWith('rem')) {
                    const topPixels = parseFloat(style.top) * 16;
                    y = (parentHeight / 2) - verticalOriginInset - topPixels - (height / 2);
                } else if (typeof style.top === 'string' && style.top.endsWith('em')) {
                    const topPixels = parseFloat(style.top) * elementFontSize;
                    y = (parentHeight / 2) - verticalOriginInset - topPixels - (height / 2);
                } else if (typeof style.top === 'string' && style.top.endsWith('vw')) {
                    const topPixels = (viewportDims.width * parseFloat(style.top)) / 100;
                    y = (parentHeight / 2) - verticalOriginInset - topPixels - (height / 2);
                } else if (typeof style.top === 'string' && style.top.endsWith('vh')) {
                    const topPixels = (viewportDims.height * parseFloat(style.top)) / 100;
                    y = (parentHeight / 2) - verticalOriginInset - topPixels - (height / 2);
                } else if (typeof style.top === 'string' && style.top.endsWith('px')) {
                    y = (parentHeight / 2) - verticalOriginInset - parseFloat(style.top) - (height / 2);
                } else if (typeof style.top === 'string' && style.top.endsWith('%')) {
                    const topPercent = parseFloat(style.top);
                    const topPixels = ((usesPositionedContainingBlock ? positionedReferenceHeight : contentHeight) * topPercent) / 100;
                    y = (parentHeight / 2) - verticalOriginInset - topPixels - (height / 2);
                } else {
                    y = (parentHeight / 2) - verticalOriginInset - parseFloat(`${style.top}`) - (height / 2);
                }
            } else if (style.bottom !== undefined) {
                const bottomPixels = this.parsePositionLength(
                    style.bottom,
                    positionedReferenceHeight,
                    viewportDims,
                    elementFontSize,
                );
                y = -(parentHeight / 2) + parentBorder.bottom + bottomPixels + (height / 2);
            } else {
                y = (parentHeight / 2) - parentPadding.top - (contentHeight / 2);
            }
        }






        return { width, height, x, y, padding: layoutInsets, margin };
    }

    private parsePositionLength(
        value: string | number,
        percentageReference: number,
        viewport: { width: number; height: number },
        fontSize: number,
    ): number {
        if (typeof value === 'number') return value;
        if (value.endsWith('rem')) return parseFloat(value) * 16;
        if (value.endsWith('em')) return parseFloat(value) * fontSize;
        if (value.endsWith('vw')) return (viewport.width * parseFloat(value)) / 100;
        if (value.endsWith('vh')) return (viewport.height * parseFloat(value)) / 100;
        if (value.endsWith('%')) return (percentageReference * parseFloat(value)) / 100;
        if (value.endsWith('px')) return parseFloat(value);
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? 0 : parsed;
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

    private parseBorderWidthBox(style: StyleRule | undefined): {
        top: number;
        right: number;
        bottom: number;
        left: number;
    } {
        if (!style?.borderWidth || style.borderStyle === 'none') {
            return this.zeroBox();
        }

        const parts = `${style.borderWidth}`.trim().split(/\s+/)
            .map(value => Math.max(0, this.parseLength(value)));
        const [first = 0, second = first, third = first, fourth = second] = parts;

        if (parts.length === 1) {
            return { top: first, right: first, bottom: first, left: first };
        }
        if (parts.length === 2) {
            return { top: first, right: second, bottom: first, left: second };
        }
        if (parts.length === 3) {
            return { top: first, right: second, bottom: third, left: second };
        }
        return { top: first, right: second, bottom: third, left: fourth };
    }

    private formatBox(box: { top: number; right: number; bottom: number; left: number }): string {
        return `top:${box.top},right:${box.right},bottom:${box.bottom},left:${box.left}`;
    }

    /**
     * Calculate intrinsic width for elements with text content
     */
    private calculateIntrinsicWidth(
        element: DOMElement,
        textMetrics: IntrinsicTextMetrics | null,
        layoutInsets: { top: number; right: number; bottom: number; left: number }
    ): number {
        const totalInsets = (layoutInsets.left || 0) + (layoutInsets.right || 0);
        const isTextInput = element.type === 'input' && !this.isButtonLikeInput(element);

        let measuredWidth = textMetrics?.width ?? 0;

        if (!textMetrics && isTextInput) {
            // Ensure inputs still have a reasonable default width when no content is present
            measuredWidth = Math.max(measuredWidth, 170 - totalInsets);
        }

        let finalWidth = measuredWidth + totalInsets;

        if (isTextInput) {
            finalWidth = Math.max(finalWidth, 170);
        }

        return finalWidth;
    }

    private isButtonLikeInput(element: DOMElement): boolean {
        return element.type === 'input' &&
            ['button', 'submit', 'reset'].includes((element.inputType ?? '').toLowerCase());
    }

    private calculateIntrinsicHeight(
        element: DOMElement,
        textMetrics: IntrinsicTextMetrics | null,
        padding: { top: number; right: number; bottom: number; left: number }
    ): number | null {
        const totalPadding = (padding.top || 0) + (padding.bottom || 0);

        if (element.type === 'textarea' && textMetrics) {
            const rows = Math.max(1, element.rows ?? 2);
            return rows * textMetrics.lineHeight + totalPadding;
        }

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
        styles: StyleRule[],
        maxWidth?: number,
    ): IntrinsicTextMetrics | null {
        let textToMeasure = '';

        if (element.type === 'button') {
            textToMeasure = element.value || element.textContent || 'Button';
        } else if (element.type === 'input') {
            textToMeasure = element.value || element.placeholder || '';
        } else if (element.type === 'textarea') {
            textToMeasure = element.value || element.placeholder || ' ';
        } else if (element.textContent) {
            textToMeasure = element.textContent;
        }

        if (element.type !== 'textarea' && (!textToMeasure || textToMeasure.trim() === '')) {
            return null;
        }

        const cascadedStyle = render.actions.style.findStyleForElement(element, styles, dom.context.elementStyles);
        const textStyle = this.getInheritedTextStyle(element, styles, dom, render);
        const effectiveStyle = cascadedStyle
            ? { ...textStyle, ...cascadedStyle, ...style }
            : (style ? { ...textStyle, ...style } : textStyle);
        const textStyleProperties = this.textStyleParser.parseTextProperties(effectiveStyle);
        const dimensions = this.textRenderingService.calculateTextDimensions(
            textToMeasure,
            textStyleProperties,
            maxWidth,
        );

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
        const merged = { ...fallback, ...inherited, ...own };
        merged.fontSize = resolveComputedFontSize(
            own?.fontSize ?? inherited.fontSize ?? fallback.fontSize,
            inherited.fontSize ?? fallback.fontSize,
        );
        return merged;
    }

    private pickInheritedTextProperties(style: StyleRule): Partial<StyleRule> {
        const properties: Array<keyof StyleRule> = [
            'color', 'caretColor', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight',
            'letterSpacing', 'wordSpacing', 'textAlign', 'whiteSpace', 'wordWrap',
            'textTransform', 'cursor', 'pointerEvents'
        ];
        return Object.fromEntries(
            properties
                .filter(property => style[property] !== undefined)
                .map(property => [property, style[property]])
        ) as Partial<StyleRule>;
    }
}
