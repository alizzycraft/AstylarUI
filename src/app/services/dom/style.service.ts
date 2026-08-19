import { Injectable } from '@angular/core';
import { StyleRule } from '../../types/style-rule';
import { BabylonDOM } from './interfaces/dom.types';
import { Color3 } from '@babylonjs/core';
import { DOMElement } from '../../types/dom-element';
import { BabylonRender, ParsedBackground, LinearGradientDefinition, GradientStop } from './interfaces/render.types';
import { StyleDefaultsService } from './style-defaults.service';
import { DOMAncestryService } from './dom-ancestry.service';
import { ViewportService } from './positioning/viewport.service';

@Injectable({
    providedIn: 'root'
})
export class StyleService {
    private readonly parsedAuthorStyles = new WeakSet<StyleRule>();

    constructor(
        private styleDefaults: StyleDefaultsService,
        private ancestry: DOMAncestryService,
        private viewportService: ViewportService,
    ) { }

    /**
     * Parses the align-content property for flex containers
     * @param value The align-content value to parse
     * @returns The normalized align-content value
     */
    public parseAlignContent(value: string | undefined): string {
        if (!value) {
            return 'stretch'; // Default value per CSS spec
        }

        const validValues = [
            'flex-start',
            'flex-end',
            'center',
            'space-between',
            'space-around',
            'space-evenly',
            'stretch'
        ];

        const normalizedValue = value.trim().toLowerCase();

        // Check if the value is valid
        if (validValues.includes(normalizedValue)) {
            return normalizedValue;
        }

        console.warn(`Invalid align-content value: "${value}". Using default "stretch" instead.`);
        return 'stretch'; // Default to stretch for invalid values
    }

    /**
     * Parses the flex-grow property for flex items
     * @param value The flex-grow value to parse
     * @returns The normalized flex-grow value
     */
    public parseFlexGrow(value: string | undefined): number {
        if (!value) {
            return 0; // Default value per CSS spec
        }

        const parsedValue = parseFloat(value.trim());

        // Check if the value is a valid number
        if (!isNaN(parsedValue) && parsedValue >= 0) {
            return parsedValue;
        }

        console.warn(`Invalid flex-grow value: "${value}". Using default "0" instead.`);
        return 0; // Default to 0 for invalid values
    }

    /**
     * Parses the flex-shrink property for flex items
     * @param value The flex-shrink value to parse
     * @returns The normalized flex-shrink value
     */
    public parseFlexShrink(value: string | undefined): number {
        if (!value) {
            return 1; // Default value per CSS spec
        }

        const parsedValue = parseFloat(value.trim());

        // Check if the value is a valid number
        if (!isNaN(parsedValue) && parsedValue >= 0) {
            return parsedValue;
        }

        console.warn(`Invalid flex-shrink value: "${value}". Using default "1" instead.`);
        return 1; // Default to 1 for invalid values
    }

    /**
     * Parses the flex-basis property for flex items
     * @param value The flex-basis value to parse
     * @returns The normalized flex-basis value
     */
    public parseFlexBasis(value: string | undefined): string {
        if (!value) {
            return 'auto'; // Default value per CSS spec
        }

        const normalizedValue = value.trim().toLowerCase();

        // Check if the value is 'auto' or 'content'
        if (normalizedValue === 'auto' || normalizedValue === 'content') {
            return normalizedValue;
        }

        // Check if the value is a valid CSS dimension (e.g., 10px, 50%, 2em)
        const dimensionRegex = /^(0|[1-9]\d*)(px|%|em|rem|vh|vw)$/;
        if (dimensionRegex.test(normalizedValue)) {
            return normalizedValue;
        }

        // Check if the value is just a number (interpreted as pixels)
        const numberRegex = /^(0|[1-9]\d*)$/;
        if (numberRegex.test(normalizedValue)) {
            return `${normalizedValue}px`;
        }

        console.warn(`Invalid flex-basis value: "${value}". Using default "auto" instead.`);
        return 'auto'; // Default to auto for invalid values
    }

    /**
     * Parses the flex shorthand property for flex items
     * @param value The flex shorthand value to parse
     * @returns An object containing the parsed flex-grow, flex-shrink, and flex-basis values
     */
    public parseFlexShorthand(value: string | undefined): { flexGrow: number; flexShrink: number; flexBasis: string } {
        if (!value) {
            return { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' }; // Default values per CSS spec
        }

        const normalizedValue = value.trim().toLowerCase();

        // Handle keyword values
        if (normalizedValue === 'initial') {
            return { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' };
        }

        if (normalizedValue === 'auto') {
            return { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' };
        }

        if (normalizedValue === 'none') {
            return { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' };
        }

        // Split the value by spaces to handle different syntaxes
        const parts = normalizedValue.split(/\s+/).filter(part => part.length > 0);

        // Handle single-value syntax (flex: 1)
        if (parts.length === 1) {
            const flexGrow = parseFloat(parts[0]);
            if (!isNaN(flexGrow) && flexGrow >= 0) {
                return { flexGrow, flexShrink: 1, flexBasis: '0%' };
            }
        }

        // Handle two-value syntax (flex: 1 2)
        if (parts.length === 2) {
            const flexGrow = parseFloat(parts[0]);

            // Check if the second part is a number (flex-shrink) or a dimension (flex-basis)
            if (!isNaN(parseFloat(parts[1]))) {
                const flexShrink = parseFloat(parts[1]);
                if (!isNaN(flexGrow) && !isNaN(flexShrink) && flexGrow >= 0 && flexShrink >= 0) {
                    return { flexGrow, flexShrink, flexBasis: '0%' };
                }
            } else {
                // Second part is a flex-basis value
                const flexBasis = this.parseFlexBasis(parts[1]);
                if (!isNaN(flexGrow) && flexGrow >= 0) {
                    return { flexGrow, flexShrink: 1, flexBasis };
                }
            }
        }

        // Handle three-value syntax (flex: 1 2 10px)
        if (parts.length === 3) {
            const flexGrow = parseFloat(parts[0]);
            const flexShrink = parseFloat(parts[1]);
            const flexBasis = this.parseFlexBasis(parts[2]);

            if (!isNaN(flexGrow) && !isNaN(flexShrink) && flexGrow >= 0 && flexShrink >= 0) {
                return { flexGrow, flexShrink, flexBasis };
            }
        }

        console.warn(`Invalid flex shorthand value: "${value}". Using default values instead.`);
        return { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' }; // Default to initial values for invalid input
    }

    /**
     * Parses the align-self property for flex items
     * @param value The align-self value to parse
     * @returns The normalized align-self value
     */
    public parseAlignSelf(value: string | undefined): string {
        if (!value) {
            return 'auto'; // Default value per CSS spec
        }

        const validValues = [
            'auto',
            'flex-start',
            'flex-end',
            'center',
            'baseline',
            'stretch'
        ];

        const normalizedValue = value.trim().toLowerCase();

        // Check if the value is valid
        if (validValues.includes(normalizedValue)) {
            return normalizedValue;
        }

        console.warn(`Invalid align-self value: "${value}". Using default "auto" instead.`);
        return 'auto'; // Default to auto for invalid values
    }

    /**
     * Parses the order property for flex items
     * @param value The order value to parse
     * @returns The normalized order value
     */
    public parseOrder(value: string | undefined): number {
        if (!value) {
            return 0; // Default value per CSS spec
        }

        const parsedValue = parseInt(value.trim(), 10);

        // Check if the value is a valid integer
        if (!isNaN(parsedValue)) {
            return parsedValue;
        }

        console.warn(`Invalid order value: "${value}". Using default "0" instead.`);
        return 0; // Default to 0 for invalid values
    }

    public parseStyles(dom: BabylonDOM, render: BabylonRender, styles: StyleRule[]): void {

        styles.forEach((style, index) => {
            if (!this.matchesMediaConditions(style)) return;

            const selectors = style.selector.split(',').map(s => s.trim());

            selectors.forEach(selector => {
                if (selector.includes(':hover')) {
                    // This is a hover style
                    const baseSelector = selector.replace(':hover', '');
                    const elementId = baseSelector.replace('#', '');
                    if (!dom.context.elementStyles.has(elementId)) {
                        dom.context.elementStyles.set(elementId, { normal: {} as StyleRule });
                    }
                    dom.context.elementStyles.get(elementId)!.hover = style;

                } else if (selector.includes(':active')) {
                    const baseSelector = selector.replace(':active', '');
                    const elementId = baseSelector.replace('#', '');
                    if (!dom.context.elementStyles.has(elementId)) {
                        dom.context.elementStyles.set(elementId, { normal: {} as StyleRule });
                    }
                    dom.context.elementStyles.get(elementId)!.active = style;

                } else if (selector.includes(':focus')) {
                    const baseSelector = selector.replace(':focus', '');
                    const elementId = baseSelector.replace('#', '');
                    if (!dom.context.elementStyles.has(elementId)) {
                        dom.context.elementStyles.set(elementId, { normal: {} as StyleRule });
                    }
                    dom.context.elementStyles.get(elementId)!.focus = style;

                } else if (selector.startsWith('#')) {
                    // This is a normal element style
                    const elementId = selector.replace('#', '');
                    if (!dom.context.elementStyles.has(elementId)) {
                        dom.context.elementStyles.set(elementId, { normal: style });
                    } else {
                        const existingStyle = dom.context.elementStyles.get(elementId)!.normal;
                        dom.context.elementStyles.get(elementId)!.normal = { ...existingStyle, ...style };
                    }
                } else if (selector.startsWith('.')) {
                    // This is a class selector
                    const className = selector.replace('.', '');
                    if (!dom.context.elementStyles.has(selector)) {
                        dom.context.elementStyles.set(selector, { normal: style });
                    } else {
                        const existingStyle = dom.context.elementStyles.get(selector)!.normal;
                        dom.context.elementStyles.get(selector)!.normal = { ...existingStyle, ...style };
                    }
                    // Also store without dot for convenience
                    if (!dom.context.elementStyles.has(className)) {
                        dom.context.elementStyles.set(className, { normal: style });
                    }
                } else {
                    // This is likely a type selector (div, table, etc.)
                    if (!dom.context.elementStyles.has(selector)) {
                        dom.context.elementStyles.set(selector, { normal: style });
                    } else {
                        const existingStyle = dom.context.elementStyles.get(selector)!.normal;
                        dom.context.elementStyles.get(selector)!.normal = { ...existingStyle, ...style };
                    }
                }
            });
        });
        for (const entry of dom.context.elementStyles.values()) {
            this.parsedAuthorStyles.add(entry.normal);
        }

    }

    public findStyleForElement(element: DOMElement, styles: StyleRule[], elementStylesOverride?: Map<string, { normal: StyleRule; hover?: StyleRule; active?: StyleRule; focus?: StyleRule }>): StyleRule | undefined {
        const typeDefaults = this.styleDefaults.getElementTypeDefaults(element.type);

        let mergedStyle: StyleRule = {
            selector: element.id ? `#${element.id}` : element.type,
            ...typeDefaults,
            // The browser UA stylesheet hides a dialog only while its `open`
            // attribute is absent. Model that state here so authored display
            // declarations can still override the default in the cascade.
            ...(element.type === 'dialog' && element.open ? { display: 'block' as const } : {}),
        };

        const winners = new Map<keyof StyleRule, { specificity: number; sourceOrder: number; value: unknown }>();
        const extensionWinners = new Map<string, { specificity: number; sourceOrder: number; value: unknown }>();
        const debugSegments: string[] = [];

        const recordWinner = (
            property: keyof StyleRule,
            value: unknown,
            specificity: number,
            sourceOrder: number,
        ): void => {
            const current = winners.get(property);
            if (!current || specificity > current.specificity ||
                (specificity === current.specificity && sourceOrder >= current.sourceOrder)) {
                winners.set(property, { specificity, sourceOrder, value });
            }
        };

        styles.forEach((rule, sourceOrder) => {
            if (!this.matchesMediaConditions(rule)) return;

            rule.selector.split(',').map(selector => selector.trim()).forEach(selector => {
                const specificity = this.getMatchingSpecificity(element, selector);
                if (specificity === null) {
                    return;
                }

                debugSegments.push(`${selector}[${specificity}]`);
                for (const [property, value] of Object.entries(rule)) {
                    if (property === 'selector' || property.startsWith('media') || value === undefined) {
                        continue;
                    }
                    if (property === 'extensions' && value && typeof value === 'object' && !Array.isArray(value)) {
                        for (const [identity, extensionValue] of Object.entries(value)) {
                            const current = extensionWinners.get(identity);
                            if (!current || specificity > current.specificity ||
                                (specificity === current.specificity && sourceOrder >= current.sourceOrder)) {
                                extensionWinners.set(identity, {
                                    specificity,
                                    sourceOrder,
                                    value: extensionValue,
                                });
                            }
                        }
                        continue;
                    }
                    const key = property as keyof StyleRule;
                    recordWinner(key, value, specificity, sourceOrder);
                    if (key === 'flex') {
                        const expanded = this.parseFlexShorthand(String(value));
                        recordWinner('flexGrow', String(expanded.flexGrow), specificity, sourceOrder);
                        recordWinner('flexShrink', String(expanded.flexShrink), specificity, sourceOrder);
                        recordWinner('flexBasis', expanded.flexBasis, specificity, sourceOrder);
                    }
                }
            });
        });

        for (const [property, winner] of winners) {
            (mergedStyle as unknown as Record<string, unknown>)[property] = winner.value;
        }
        if (extensionWinners.size > 0) {
            mergedStyle.extensions = Object.fromEntries(
                [...extensionWinners].map(([identity, winner]) => [identity, winner.value]),
            );
        }

        // Context overrides are renderer-authored declarations (for example table
        // layout adjustments), so they sit above stylesheet rules but below inline style.
        if (element.id) {
            const contextOverride = elementStylesOverride?.get(element.id)?.normal;
            if (contextOverride && !this.parsedAuthorStyles.has(contextOverride)) {
                mergedStyle = {
                    ...mergedStyle,
                    ...contextOverride,
                    extensions: {
                        ...mergedStyle.extensions,
                        ...contextOverride.extensions,
                    },
                };
            }
        }

        if (element.style) {
            for (const [property, value] of Object.entries(element.style)) {
                if (value === undefined) continue;
                if (property === 'extensions' && value && typeof value === 'object' && !Array.isArray(value)) {
                    mergedStyle.extensions = {
                        ...mergedStyle.extensions,
                        ...(value as Record<string, unknown>),
                    };
                    continue;
                }
                (mergedStyle as unknown as Record<string, unknown>)[property] = value;
                if (property === 'flex') {
                    const expanded = this.parseFlexShorthand(String(value));
                    mergedStyle.flexGrow = String(expanded.flexGrow);
                    mergedStyle.flexShrink = String(expanded.flexShrink);
                    mergedStyle.flexBasis = expanded.flexBasis;
                }
            }
            debugSegments.push('inline');
        }

        this.logStyleResolution(element, mergedStyle, debugSegments);

        return mergedStyle;
    }

    private matchesMediaConditions(rule: StyleRule): boolean {
        const { width, height } = this.viewportService.getViewportDimensions();
        const conditions: Array<[string | undefined, number, 'min' | 'max']> = [
            [rule.mediaMinWidth, width, 'min'],
            [rule.mediaMaxWidth, width, 'max'],
            [rule.mediaMinHeight, height, 'min'],
            [rule.mediaMaxHeight, height, 'max'],
        ];

        return conditions.every(([value, actual, bound]) => {
            if (value === undefined) return true;
            const threshold = this.parseMediaLength(value);
            if (threshold === null) return false;
            return bound === 'min' ? actual >= threshold : actual <= threshold;
        });
    }

    private parseMediaLength(value: string): number | null {
        const normalized = value.trim().toLowerCase();
        const match = normalized.match(/^(-?(?:\d+\.?\d*|\.\d+))(px|em|rem)?$/);
        if (!match) return null;
        const amount = Number.parseFloat(match[1]);
        return match[2] === 'em' || match[2] === 'rem' ? amount * 16 : amount;
    }

    private getMatchingSpecificity(element: DOMElement, selector: string): number | null {
        const normalizedSelector = selector.trim();
        if (!normalizedSelector) {
            return null;
        }
        // Namespaced plugin element identities contain a colon, which otherwise
        // looks like an unsupported pseudo-class to the compact selector parser.
        if (normalizedSelector === element.type) return 1;

        const parsedSelector = this.parseRelationalSelector(normalizedSelector);
        if (!parsedSelector) return null;

        const { compounds, combinators } = parsedSelector;
        let matchedElement: DOMElement | undefined = element;
        let specificity = this.getCompoundSpecificity(matchedElement, compounds[compounds.length - 1]);
        if (specificity === null) return null;

        for (let index = compounds.length - 2; index >= 0; index--) {
            const combinator = combinators[index];
            let relatedElement: DOMElement | undefined;
            let relatedSpecificity: number | null = null;

            if (combinator === 'child') {
                relatedElement = this.ancestry.getParent(matchedElement);
                if (relatedElement) {
                    relatedSpecificity = this.getCompoundSpecificity(relatedElement, compounds[index]);
                }
            } else if (combinator === 'adjacent') {
                relatedElement = this.getPreviousSibling(matchedElement);
                if (relatedElement) {
                    relatedSpecificity = this.getCompoundSpecificity(relatedElement, compounds[index]);
                }
            } else if (combinator === 'general-sibling') {
                for (const sibling of this.getPreviousSiblings(matchedElement)) {
                    const siblingSpecificity = this.getCompoundSpecificity(sibling, compounds[index]);
                    if (siblingSpecificity !== null) {
                        relatedElement = sibling;
                        relatedSpecificity = siblingSpecificity;
                        break;
                    }
                }
            } else {
                relatedElement = this.ancestry.getParent(matchedElement);
                while (relatedElement) {
                    relatedSpecificity = this.getCompoundSpecificity(relatedElement, compounds[index]);
                    if (relatedSpecificity !== null) break;
                    relatedElement = this.ancestry.getParent(relatedElement);
                }
            }

            if (!relatedElement || relatedSpecificity === null) return null;
            specificity += relatedSpecificity;
            matchedElement = relatedElement;
        }

        return specificity;
    }

    private parseRelationalSelector(selector: string): {
        compounds: string[];
        combinators: Array<'descendant' | 'child' | 'adjacent' | 'general-sibling'>;
    } | null {
        const normalized = selector.replace(/\s*([>+~])\s*/g, '$1');
        const compounds = normalized.split(/[>+~]|\s+/);
        const combinators = Array.from(normalized.matchAll(/[>+~]|\s+/g), match => {
            if (match[0] === '>') return 'child' as const;
            if (match[0] === '+') return 'adjacent' as const;
            if (match[0] === '~') return 'general-sibling' as const;
            return 'descendant' as const;
        });

        if (compounds.some(compound => !compound) || combinators.length !== compounds.length - 1) {
            return null;
        }

        return { compounds, combinators };
    }

    private getPreviousSibling(element: DOMElement): DOMElement | undefined {
        const siblings = this.ancestry.getParent(element)?.children;
        if (!siblings) return undefined;

        const index = siblings.indexOf(element);
        return index > 0 ? siblings[index - 1] : undefined;
    }

    private getPreviousSiblings(element: DOMElement): DOMElement[] {
        const siblings = this.ancestry.getParent(element)?.children;
        if (!siblings) return [];

        const index = siblings.indexOf(element);
        return index > 0 ? siblings.slice(0, index).reverse() : [];
    }

    private getCompoundSpecificity(element: DOMElement, selector: string): number | null {
        const pseudoPattern = /:(first-child|last-child|disabled|enabled|checked|required|optional|read-only|read-write)/g;
        const pseudos = Array.from(selector.matchAll(pseudoPattern), match => match[1]);
        const baseSelector = selector.replace(pseudoPattern, '');
        if (baseSelector.includes(':')) return null;

        if (pseudos.includes('first-child') || pseudos.includes('last-child')) {
            const siblings = this.ancestry.getParent(element)?.children;
            if (!siblings) return null;
            const index = siblings.indexOf(element);
            if (index < 0) return null;
            if (pseudos.includes('first-child') && index !== 0) return null;
            if (pseudos.includes('last-child') && index !== siblings.length - 1) return null;
        }

        const disableable = ['button', 'input', 'select', 'textarea', 'option', 'optgroup', 'fieldset'].includes(element.type);
        if (pseudos.includes('disabled') && (!disableable || !element.disabled)) return null;
        if (pseudos.includes('enabled') && (!disableable || element.disabled === true)) return null;
        if (pseudos.includes('checked') && element.checked !== true && element.selected !== true) return null;
        const requirementAware = ['input', 'select', 'textarea'].includes(element.type);
        if (pseudos.includes('required') && (!requirementAware || element.required !== true)) return null;
        if (pseudos.includes('optional') && (!requirementAware || element.required === true)) return null;
        const textEditable = element.type === 'input' || element.type === 'textarea';
        if (pseudos.includes('read-only') && (!textEditable || element.readonly !== true)) return null;
        if (pseudos.includes('read-write') && (!textEditable || element.readonly === true || element.disabled === true)) return null;

        const pseudoSpecificity = pseudos.length * 10;
        if (!baseSelector || baseSelector === '*') return pseudoSpecificity;

        const tokens = Array.from(baseSelector.matchAll(/([.#]?)([\w-]+)/g));
        if (!tokens.length || tokens.map(token => token[0]).join('') !== baseSelector) {
            return null;
        }

        const classes = new Set((element.class ?? '').split(/\s+/).filter(Boolean));
        let ids = 0;
        let classCount = 0;
        let typeCount = 0;

        for (const token of tokens) {
            const prefix = token[1];
            const value = token[2];
            if (prefix === '#') {
                if (element.id !== value) return null;
                ids += 1;
            } else if (prefix === '.') {
                if (!classes.has(value)) return null;
                classCount += 1;
            } else if (value === element.type) {
                typeCount += 1;
            } else if (element.id === value) {
                // Preserve Astylar's historical bare-ID selector support.
                ids += 1;
            } else if (classes.has(value)) {
                // Preserve Astylar's historical bare-class selector support.
                classCount += 1;
            } else {
                return null;
            }
        }

        return ids * 100 + classCount * 10 + typeCount + pseudoSpecificity;
    }

    private logStyleResolution(element: DOMElement, style: StyleRule, segments: string[]): void {
        const path = segments.length ? segments.join(' -> ') : 'defaults';
        const identifier = element.id ? `#${element.id}` : element.type;

        const keyProps: Array<keyof StyleRule> = [
            'display',
            'flexDirection',
            'justifyContent',
            'alignItems',
            'minWidth',
            'minHeight',
            'padding',
            'margin'
        ];

        const propSummary = keyProps
            .map(prop => `${prop}=${style[prop] ?? '∅'}`)
            .join(', ');


    }

    /**
     * Determines if the provided element matches a CSS-like selector. Limited support (ID, class, type).
     */
    public matchesSelector(element: DOMElement, selector: string): boolean {
        return this.getMatchingSpecificity(element, selector) !== null;
    }

    public findStyleBySelector(selector: string, styles: StyleRule[]): StyleRule | undefined {
        // Try exact match first
        let style = styles.find(s => s.selector === selector);
        if (style) return style;

        // If selector is an ID but style.selector doesn't have #
        if (selector.startsWith('#')) {
            const id = selector.substring(1);
            style = styles.find(s => s.selector === id);
            if (style) return style;
        } else {
            // If selector doesn't have # but style does
            style = styles.find(s => s.selector === `#${selector}`);
            if (style) return style;
        }

        return undefined;
    }

    public parseBackgroundColor(background?: string): ParsedBackground | null {
        if (!background) {

            return {
                type: 'color',
                color: new Color3(0.2, 0.2, 0.3)
            };
        }


        const trimmedBackground = background.trim();
        const colorLower = trimmedBackground.toLowerCase();

        const gradient = this.tryParseLinearGradient(trimmedBackground);
        if (gradient) {

            return {
                type: 'gradient',
                gradient,
                alpha: gradient.stops.some(stop => stop.alpha < 1) ? undefined : undefined
            };
        }

        // Handle transparent backgrounds
        if (colorLower === 'transparent') {

            return null;
        }

        // Handle hex colors (#ff0000, #f00)
        if (colorLower.startsWith('#')) {

            const result = this.parseHexColor(colorLower);

            return {
                type: 'color',
                color: result
            };
        }

        // Handle named colors - expanded list
        const namedColors: { [key: string]: Color3 } = {
            // Basic colors
            'red': new Color3(1, 0, 0),
            'green': new Color3(0, 1, 0),
            'blue': new Color3(0, 0, 1),
            'yellow': new Color3(1, 1, 0),
            'purple': new Color3(0.5, 0, 0.5),
            'orange': new Color3(1, 0.5, 0),
            'pink': new Color3(1, 0.75, 0.8),
            'cyan': new Color3(0, 1, 1),
            'magenta': new Color3(1, 0, 1),
            'white': new Color3(1, 1, 1),
            'black': new Color3(0, 0, 0),
            'gray': new Color3(0.5, 0.5, 0.5),
            'grey': new Color3(0.5, 0.5, 0.5),

            // Extended colors
            'lightblue': new Color3(0.68, 0.85, 0.9),
            'lightgreen': new Color3(0.56, 0.93, 0.56),
            'lightgray': new Color3(0.83, 0.83, 0.83),
            'lightgrey': new Color3(0.83, 0.83, 0.83),
            'darkblue': new Color3(0, 0, 0.55),
            'darkgreen': new Color3(0, 0.39, 0),
            'darkgray': new Color3(0.66, 0.66, 0.66),
            'darkgrey': new Color3(0.66, 0.66, 0.66),
            'darkred': new Color3(0.55, 0, 0),
            'darkorange': new Color3(1, 0.55, 0),
            'mistyrose': new Color3(1, 0.89, 0.88),
            'lightyellow': new Color3(1, 1, 0.88),
            'lavender': new Color3(0.9, 0.9, 0.98),
            'cornflowerblue': new Color3(0.39, 0.58, 0.93),
            'skyblue': new Color3(0.53, 0.81, 0.92),
            'steelblue': new Color3(0.27, 0.51, 0.71),
            'teal': new Color3(0, 0.5, 0.5),
            'navy': new Color3(0, 0, 0.5),
            'maroon': new Color3(0.5, 0, 0),
            'olive': new Color3(0.5, 0.5, 0),
            'aqua': new Color3(0, 1, 1),
            'lime': new Color3(0, 1, 0),
            'silver': new Color3(0.75, 0.75, 0.75),
            'gold': new Color3(1, 0.84, 0),
            'brown': new Color3(0.65, 0.16, 0.16),
            'tan': new Color3(0.82, 0.71, 0.55),
            'beige': new Color3(0.96, 0.96, 0.86),
            'ivory': new Color3(1, 1, 0.94),
            'azure': new Color3(0.94, 1, 1),
            'wheat': new Color3(0.96, 0.87, 0.7),
            'violet': new Color3(0.93, 0.51, 0.93),
            'plum': new Color3(0.87, 0.63, 0.87),
            'orchid': new Color3(0.85, 0.44, 0.84),
            'salmon': new Color3(0.98, 0.5, 0.45),
            'coral': new Color3(1, 0.5, 0.31),
            'tomato': new Color3(1, 0.39, 0.28),
            'crimson': new Color3(0.86, 0.08, 0.24),
            'indigo': new Color3(0.29, 0, 0.51),
            'turquoise': new Color3(0.25, 0.88, 0.82),
            'chocolate': new Color3(0.82, 0.41, 0.12),
            'firebrick': new Color3(0.7, 0.13, 0.13),
            'forestgreen': new Color3(0.13, 0.55, 0.13),
            'seagreen': new Color3(0.18, 0.55, 0.34),
            'limegreen': new Color3(0.2, 0.8, 0.2),
            'slateblue': new Color3(0.42, 0.35, 0.8),
            'royalblue': new Color3(0.25, 0.41, 0.88),
            'midnightblue': new Color3(0.1, 0.1, 0.44),
            'dodgerblue': new Color3(0.12, 0.56, 1),
            'aquamarine': new Color3(0.5, 1, 0.83),
            'cadetblue': new Color3(0.37, 0.62, 0.63),
            'powderblue': new Color3(0.69, 0.88, 0.9),
            'thistle': new Color3(0.85, 0.75, 0.85),
            'goldenrod': new Color3(0.85, 0.65, 0.13),
            'peru': new Color3(0.8, 0.52, 0.25),
            'sienna': new Color3(0.63, 0.32, 0.18),
            'rosybrown': new Color3(0.74, 0.56, 0.56),
            'sandybrown': new Color3(0.96, 0.64, 0.38),
            'khaki': new Color3(0.94, 0.9, 0.55),
            'linen': new Color3(0.98, 0.94, 0.9),
            'snow': new Color3(1, 0.98, 0.98),
            'honeydew': new Color3(0.94, 1, 0.94),
            'mintcream': new Color3(0.96, 1, 0.98),
            'aliceblue': new Color3(0.94, 0.97, 1),
            'ghostwhite': new Color3(0.97, 0.97, 1),
            'whitesmoke': new Color3(0.96, 0.96, 0.96),
            'seashell': new Color3(1, 0.96, 0.93),
            'oldlace': new Color3(0.99, 0.96, 0.9),
            'floralwhite': new Color3(1, 0.98, 0.94),
            'antiquewhite': new Color3(0.98, 0.92, 0.84),
            'papayawhip': new Color3(1, 0.94, 0.84),
            'blanchedalmond': new Color3(1, 0.92, 0.8),
            'moccasin': new Color3(1, 0.89, 0.71),
            'navajowhite': new Color3(1, 0.87, 0.68),
            'peachpuff': new Color3(1, 0.85, 0.73),
            'bisque': new Color3(1, 0.89, 0.77),
            'lemonchiffon': new Color3(1, 0.98, 0.8),
            'cornsilk': new Color3(1, 0.97, 0.86),
            'lightsalmon': new Color3(1, 0.63, 0.48),
            'darksalmon': new Color3(0.91, 0.59, 0.48),
            'lightcoral': new Color3(0.94, 0.5, 0.5),
            'indianred': new Color3(0.8, 0.36, 0.36),
            'palevioletred': new Color3(0.86, 0.44, 0.58),
            'deeppink': new Color3(1, 0.08, 0.58),
            'hotpink': new Color3(1, 0.41, 0.71),
            'lightpink': new Color3(1, 0.71, 0.76),
            'mediumvioletred': new Color3(0.78, 0.08, 0.52),
            'blueviolet': new Color3(0.54, 0.17, 0.89),
            'darkviolet': new Color3(0.58, 0, 0.83),
            'darkmagenta': new Color3(0.55, 0, 0.55),
            'darkslateblue': new Color3(0.28, 0.24, 0.55),
            'darkslategray': new Color3(0.18, 0.31, 0.31),
            'darkslategrey': new Color3(0.18, 0.31, 0.31),
            'dimgray': new Color3(0.41, 0.41, 0.41),
            'dimgrey': new Color3(0.41, 0.41, 0.41),
            'slategray': new Color3(0.44, 0.5, 0.56),
            'slategrey': new Color3(0.44, 0.5, 0.56),
            'lightslategray': new Color3(0.47, 0.53, 0.6),
            'lightslategrey': new Color3(0.47, 0.53, 0.6),
            'gainsboro': new Color3(0.86, 0.86, 0.86),
            'springgreen': new Color3(0, 1, 0.5),
            'mediumspringgreen': new Color3(0, 0.98, 0.6),
            'mediumseagreen': new Color3(0.24, 0.7, 0.44),
            'lightseagreen': new Color3(0.13, 0.7, 0.67),
            'palegreen': new Color3(0.6, 0.98, 0.6),
            'darkseagreen': new Color3(0.56, 0.74, 0.56),
            'mediumaquamarine': new Color3(0.4, 0.8, 0.67),
            'darkcyan': new Color3(0, 0.55, 0.55),
            'palegoldenrod': new Color3(0.93, 0.91, 0.67),
            'darkgoldenrod': new Color3(0.72, 0.53, 0.04),
            'burlywood': new Color3(0.87, 0.72, 0.53),
            'saddlebrown': new Color3(0.55, 0.27, 0.07),
            'darkkhaki': new Color3(0.74, 0.72, 0.42),
            'yellowgreen': new Color3(0.6, 0.8, 0.2),
            'olivedrab': new Color3(0.42, 0.56, 0.14),
            'greenyellow': new Color3(0.68, 1, 0.18),
            'chartreuse': new Color3(0.5, 1, 0),
            'lawngreen': new Color3(0.49, 0.99, 0),
            'darkturquoise': new Color3(0, 0.81, 0.82),
            'paleturquoise': new Color3(0.69, 0.93, 0.93),
            'mediumturquoise': new Color3(0.28, 0.82, 0.8),
            'deepskyblue': new Color3(0, 0.75, 1),
            'lightskyblue': new Color3(0.53, 0.81, 0.98),
            'mediumblue': new Color3(0, 0, 0.8),
            'mediumslateblue': new Color3(0.48, 0.41, 0.93),
            'mediumpurple': new Color3(0.58, 0.44, 0.86),
            'rebeccapurple': new Color3(0.4, 0.2, 0.6),
            'darkorchid': new Color3(0.6, 0.2, 0.8),
            'mediumorchid': new Color3(0.73, 0.33, 0.83),
            'lavenderblush': new Color3(1, 0.94, 0.96),

            // CSS4 colors
            'darkpurple': new Color3(0.3, 0, 0.3),
            'darkteal': new Color3(0, 0.3, 0.3),
            'darknavy': new Color3(0, 0, 0.3),
            'darkmaroon': new Color3(0.3, 0, 0),
            'darkolive': new Color3(0.3, 0.3, 0),

            // Special colors for the flexbox test
            'f94144': new Color3(0.976, 0.255, 0.267),
            'f3722c': new Color3(0.953, 0.447, 0.173),
            'f8961e': new Color3(0.973, 0.588, 0.118),
            '90be6d': new Color3(0.565, 0.745, 0.427),
            '43aa8b': new Color3(0.263, 0.667, 0.545),
            '4d908e': new Color3(0.302, 0.565, 0.557),
            '577590': new Color3(0.341, 0.459, 0.565),
            '277da1': new Color3(0.153, 0.49, 0.631),
            'f9c74f': new Color3(0.976, 0.78, 0.31),
            'f9844a': new Color3(0.976, 0.518, 0.29),
            '22223b': new Color3(0.133, 0.133, 0.231),
            '1a1a2e': new Color3(0.102, 0.102, 0.18),
            'c1121f': new Color3(0.757, 0.071, 0.122),
            '4a5568': new Color3(0.29, 0.333, 0.408)
        };

        if (namedColors[colorLower]) {

            const result = namedColors[colorLower];

            return {
                type: 'color',
                color: result
            };
        }

        // Handle rgb() and rgba() formats
        if (colorLower.startsWith('rgb(') || colorLower.startsWith('rgba(')) {

            const result = this.parseRgbColor(colorLower);

            return {
                type: 'color',
                color: result.color,
                alpha: result.alpha
            };
        }

        // Fallback to default

        return {
            type: 'color',
            color: new Color3(0.2, 0.2, 0.3)
        };
    }

    private tryParseLinearGradient(background: string): LinearGradientDefinition | null {
        const gradientMatch = background.match(/^linear-gradient\((.*)\)$/i);
        if (!gradientMatch) {
            return null;
        }

        const inner = gradientMatch[1].trim();
        if (!inner) {
            return null;
        }

        const segments: string[] = [];
        let current = '';
        let depth = 0;

        for (let i = 0; i < inner.length; i++) {
            const char = inner[i];
            if (char === '(') {
                depth++;
                current += char;
                continue;
            }
            if (char === ')') {
                depth--;
                current += char;
                continue;
            }
            if (char === ',' && depth === 0) {
                segments.push(current.trim());
                current = '';
                continue;
            }
            current += char;
        }

        if (current.trim().length > 0) {
            segments.push(current.trim());
        }

        if (segments.length < 2) {
            console.warn(`🎨 COLOR DEBUG: linear-gradient requires at least two color stops: ${background}`);
            return null;
        }

        let angle = 180; // default CSS angle (to bottom)
        let startIndex = 0;
        const possibleDirection = segments[0].toLowerCase();
        if (this.isAngleSegment(possibleDirection) || this.isDirectionKeyword(possibleDirection)) {
            angle = this.parseGradientAngle(possibleDirection);
            startIndex = 1;
        }

        const stops: GradientStop[] = [];
        for (let i = startIndex; i < segments.length; i++) {
            const stop = this.parseGradientStop(segments[i]);
            if (stop) {
                stops.push(stop);
            }
        }

        if (stops.length < 2) {
            console.warn(`🎨 COLOR DEBUG: Failed to parse enough gradient stops from: ${background}`);
            return null;
        }

        this.normaliseGradientStops(stops);

        return {
            type: 'linear',
            angle,
            stops
        };
    }

    private isAngleSegment(segment: string): boolean {
        return /(deg|rad|turn|grad)$/i.test(segment.trim());
    }

    private isDirectionKeyword(segment: string): boolean {
        return segment.startsWith('to ');
    }

    private parseGradientAngle(segment: string): number {
        const lower = segment.toLowerCase().trim();

        if (lower.startsWith('to ')) {
            const parts = lower.replace('to ', '').trim().split(/\s+/);
            let angle = 0; // to right
            const hasLeft = parts.includes('left');
            const hasRight = parts.includes('right');
            const hasTop = parts.includes('top');
            const hasBottom = parts.includes('bottom');

            if (hasTop && hasRight) {
                angle = 315;
            } else if (hasTop && hasLeft) {
                angle = 225;
            } else if (hasBottom && hasRight) {
                angle = 45;
            } else if (hasBottom && hasLeft) {
                angle = 135;
            } else if (hasTop) {
                angle = 270;
            } else if (hasBottom) {
                angle = 90;
            } else if (hasLeft) {
                angle = 180;
            } else {
                angle = 0;
            }

            return angle;
        }

        if (lower.endsWith('deg')) {
            return parseFloat(lower.replace('deg', ''));
        }

        if (lower.endsWith('rad')) {
            const radians = parseFloat(lower.replace('rad', ''));
            return radians * (180 / Math.PI);
        }

        if (lower.endsWith('turn')) {
            return parseFloat(lower.replace('turn', '')) * 360;
        }

        if (lower.endsWith('grad')) {
            return parseFloat(lower.replace('grad', '')) * 0.9;
        }

        const numeric = parseFloat(lower);
        if (!Number.isNaN(numeric)) {
            return numeric;
        }

        return 180;
    }

    private parseGradientStop(stop: string): GradientStop | null {
        const parts = stop.split(/\s+/).filter(Boolean);
        if (!parts.length) {
            return null;
        }

        const colorValue = parts.shift()!;
        const parsedColor = this.parseBackgroundColor(colorValue);
        if (!parsedColor || parsedColor.type !== 'color') {
            console.warn(`🎨 COLOR DEBUG: Gradient stop color could not be parsed: ${stop}`);
            return null;
        }

        let offset: number | undefined;
        let absolutePixelOffset: number | undefined;
        let alpha = parsedColor.alpha ?? 1;

        if (parts.length) {
            const offsetToken = parts.shift()!;
            if (offsetToken.endsWith('%')) {
                offset = Math.min(Math.max(parseFloat(offsetToken) / 100, 0), 1);
            } else if (offsetToken.endsWith('px')) {
                absolutePixelOffset = parseFloat(offsetToken);
            } else {
                const numeric = parseFloat(offsetToken);
                if (!Number.isNaN(numeric)) {
                    offset = numeric > 1 ? numeric / 100 : numeric;
                }
            }
        }

        return {
            color: parsedColor.color,
            offset: offset ?? Number.NaN,
            alpha
        };
    }

    private normaliseGradientStops(stops: GradientStop[]): void {
        // If no offsets defined, distribute evenly
        const hasAnyDefinedOffset = stops.some(stop => !Number.isNaN(stop.offset));
        if (!hasAnyDefinedOffset) {
            const step = stops.length > 1 ? 1 / (stops.length - 1) : 0;
            stops.forEach((stop, index) => {
                stop.offset = step * index;
            });
            return;
        }

        // Ensure first and last offsets defined
        if (Number.isNaN(stops[0].offset)) {
            stops[0].offset = 0;
        }
        if (Number.isNaN(stops[stops.length - 1].offset)) {
            stops[stops.length - 1].offset = 1;
        }

        let lastDefinedIndex = 0;
        for (let i = 1; i < stops.length; i++) {
            if (Number.isNaN(stops[i].offset)) {
                continue;
            }

            const gap = i - lastDefinedIndex;
            if (gap > 1) {
                const startOffset = stops[lastDefinedIndex].offset;
                const endOffset = stops[i].offset;
                const increment = (endOffset - startOffset) / gap;
                for (let j = 1; j < gap; j++) {
                    stops[lastDefinedIndex + j].offset = startOffset + increment * j;
                }
            }

            lastDefinedIndex = i;
        }

        // Fill any remaining NaNs with previous offset
        for (let i = 1; i < stops.length; i++) {
            if (Number.isNaN(stops[i].offset)) {
                stops[i].offset = stops[i - 1].offset;
            }
        }

        // Clamp to [0,1]
        stops.forEach(stop => {
            if (stop.offset > 1) {
                stop.offset = 1;
            }
            if (stop.offset < 0) {
                stop.offset = 0;
            }
        });

        // Sort stops by offset to ensure correct order
        stops.sort((a, b) => a.offset - b.offset);
    }

    private parseRgbColor(rgb: string): { color: Color3; alpha?: number } {
        // Extract the RGB values from the string - handle both comma and space separators
        // and handle the / alpha separator in CSS4 format
        const cleaned = rgb.replace(/rgba?\(|\)/g, '').replace(/\//g, ',');
        const values = cleaned.split(/[\s,]+/).filter(v => v.trim() !== '');

        if (values.length < 3) {
            return { color: new Color3(0.2, 0.2, 0.3) }; // Default for invalid format
        }

        // Convert RGB values (0-255) to normalized values (0-1)
        const r = parseInt(values[0], 10) / 255;
        const g = parseInt(values[1], 10) / 255;
        const b = parseInt(values[2], 10) / 255;
        const a = values.length >= 4 ? parseFloat(values[3]) : undefined;


        return { color: new Color3(r, g, b), alpha: a };
    }

    private parseHexColor(hex: string): Color3 {
        hex = hex.substring(1); // Remove #

        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }

        if (hex.length !== 6) {
            return new Color3(0.2, 0.2, 0.3);
        }

        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        return new Color3(r, g, b);
    }

    public parseOpacity(opacityValue: string | undefined): number {
        if (!opacityValue) return 1.0;

        const opacity = parseFloat(opacityValue);
        // Clamp opacity between 0.0 and 1.0
        return Math.max(0.0, Math.min(1.0, opacity));
    }

    public getElementTypeDefaults(elementType: string): Partial<StyleRule> {
        return this.styleDefaults.getElementTypeDefaults(elementType);
    }
}
