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
        color: Color3;
        style: string;
    } {
        if (!style) {
            return { width: 0, color: new Color3(0, 0, 0), style: 'solid' };
        }

        // Parse border width
        const borderWidth = style.borderWidth;
        let width = 0;
        if (borderWidth) {
            if (typeof borderWidth === 'string' && borderWidth.endsWith('px')) {
                width = parseFloat(borderWidth);
            } else {
                width = parseFloat(borderWidth);
            }
            // Scale border width to world coordinates
            const scaleFactor = render.actions.camera.getPixelToWorldScale();
            width = width * scaleFactor;
        }

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

        return { width, color, style: borderStyle };
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
