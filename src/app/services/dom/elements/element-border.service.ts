import { Injectable } from '@angular/core';
import { BabylonRender } from '../interfaces/render.types';
import { StyleRule } from '../../../types/style-rule';
import { Color3 } from '@babylonjs/core';

/**
 * Service responsible for creating and managing element borders
 */
@Injectable({
    providedIn: 'root'
})
export class ElementBorderService {
    constructor() { }

    /**
     * Parse border properties from style
     */
    parseBorderProperties(
        render: BabylonRender,
        style: StyleRule | undefined
    ): {
        width: number;
        widths: { top: number; right: number; bottom: number; left: number };
        color: Color3;
        style: string;
    } {
        if (!style) {
            return {
                width: 0,
                widths: { top: 0, right: 0, bottom: 0, left: 0 },
                color: new Color3(0, 0, 0),
                style: 'solid',
            };
        }

        // Parse border width
        const borderWidth = style.borderWidth;
        let widths = { top: 0, right: 0, bottom: 0, left: 0 };
        if (borderWidth) {
            const parts = `${borderWidth}`.trim().split(/\s+/)
                .map(value => Math.max(0, Number.parseFloat(value) || 0));
            const [first = 0, second = first, third = first, fourth = second] = parts;
            if (parts.length === 1) {
                widths = { top: first, right: first, bottom: first, left: first };
            } else if (parts.length === 2) {
                widths = { top: first, right: second, bottom: first, left: second };
            } else if (parts.length === 3) {
                widths = { top: first, right: second, bottom: third, left: second };
            } else {
                widths = { top: first, right: second, bottom: third, left: fourth };
            }
            widths = {
                top: render.actions.camera.projectCssLength(widths.top),
                right: render.actions.camera.projectCssLength(widths.right),
                bottom: render.actions.camera.projectCssLength(widths.bottom),
                left: render.actions.camera.projectCssLength(widths.left),
            };
        }
        const width = Math.max(widths.top, widths.right, widths.bottom, widths.left);

        // Parse border color
        let color = new Color3(0, 0, 0);
        if (style.borderColor) {
            const colorData = render.actions.style.parseBackgroundColor(style.borderColor);
            if (colorData?.type === 'color') {
                color = colorData.color;
            }
        }

        // Parse border style
        const borderStyle = style.borderStyle || 'solid';

        return { width, widths, color, style: borderStyle };
    }

    /**
     * Parse border radius from CSS borderRadius property
     * Returns value in pixels
     */
    parseBorderRadius(borderRadius: string | undefined): number {
        if (!borderRadius) {
            return 0;
        }

        // Handle pixel values
        if (typeof borderRadius === 'string' && borderRadius.endsWith('px')) {
            return parseFloat(borderRadius);
        }

        // Handle percentage values (will need parent context for proper calculation)
        if (typeof borderRadius === 'string' && borderRadius.endsWith('%')) {
            // For now, return 0 - percentage border radius needs parent dimensions
            return 0;
        }

        // Handle numeric values
        return parseFloat(borderRadius) || 0;
    }
}
