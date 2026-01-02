import { Injectable } from '@angular/core';
import { StyleRule } from '../../types/style-rule';

// CSS default styles after a typical reset (e.g., Normalize.css)
const globalDefaultStyle: Partial<StyleRule> = {
    display: 'block',
    margin: '0',
    padding: '0',
    borderWidth: '0',
    borderStyle: 'none',
    borderColor: 'transparent',
    borderRadius: '0',
    background: 'transparent',
    boxShadow: undefined,
    opacity: '1.0',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    alignContent: 'stretch',
    order: '0',
    flexGrow: '0',
    flexShrink: '1',
    flexBasis: 'auto',
    alignSelf: 'auto',
    cursor: 'default',
};

const defaults: { [key: string]: Partial<StyleRule> } = {
    // === SECTIONS & STRUCTURE ===
    div: {}, // Generic container
    section: { background: '#34495e' }, // Default section background (dark blue-gray)
    article: { background: '#27ae60' }, // Default article background (green)
    header: { background: '#3498db' }, // Default header background (blue)
    footer: { display: 'block' },
    nav: { display: 'block' },
    main: { display: 'block' },
    aside: { display: 'block' },
    address: { display: 'block', fontStyle: 'italic', padding: '4px', width: 'auto' },
    figure: { display: 'block', margin: '1em 40px' },
    figcaption: { display: 'block', padding: '4px 8px', height: '24px', width: 'auto' },
    hgroup: { display: 'block' },

    // === TYPOGRAPHY & TEXT ===
    h1: { fontSize: '32px', fontWeight: 'bold', display: 'block', margin: '0.67em 0' },
    h2: { fontSize: '24px', fontWeight: 'bold', display: 'block', margin: '0.83em 0' },
    h3: { fontSize: '18.72px', fontWeight: 'bold', display: 'block', margin: '1em 0' },
    h4: { fontSize: '16px', fontWeight: 'bold', display: 'block', margin: '1.33em 0' },
    h5: { fontSize: '13.28px', fontWeight: 'bold', display: 'block', margin: '1.67em 0' },
    h6: { fontSize: '10.72px', fontWeight: 'bold', display: 'block', margin: '2.33em 0' },
    p: { display: 'block', margin: '1em 0' },
    span: { display: 'inline' },
    b: { fontWeight: 'bold', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    strong: { fontWeight: 'bold', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    i: { fontStyle: 'italic', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    em: { fontStyle: 'italic', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    cite: { fontStyle: 'italic', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    var: { fontStyle: 'italic', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px', fontFamily: 'monospace' },
    dfn: { fontStyle: 'italic', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    u: { textDecoration: 'underline', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    ins: { textDecoration: 'underline', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    s: { textDecoration: 'line-through', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    strike: { textDecoration: 'line-through', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    del: { textDecoration: 'line-through', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    code: { fontFamily: 'monospace', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    kbd: { fontFamily: 'monospace', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    samp: { fontFamily: 'monospace', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    pre: { display: 'block', fontFamily: 'monospace', whiteSpace: 'pre', margin: '1em 0', padding: '8px', width: 'auto' },
    small: { fontSize: '0.83em', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    sub: { verticalAlign: 'sub', fontSize: '0.83em', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    sup: { verticalAlign: 'super', fontSize: '0.83em', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    blockquote: { display: 'block', margin: '1em 40px', fontStyle: 'italic', padding: '8px', width: 'auto' },
    q: { display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    abbr: { textDecoration: 'underline dotted', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    mark: { background: 'yellow', color: 'black', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto', margin: '4px' },
    br: {},
    wbr: {},

    // === LISTS ===
    ul: {
        display: 'block',
        listStyleType: 'disc',
        paddingLeft: '40px',
        marginTop: '16px',
        marginBottom: '16px',
    },
    ol: {
        display: 'block',
        listStyleType: 'decimal',
        paddingLeft: '40px',
        marginTop: '16px',
        marginBottom: '16px',
    },
    li: { display: 'list-item' },
    dl: { display: 'block', marginTop: '1em', marginBottom: '1em' },
    dt: { display: 'block', fontWeight: 'bold', padding: '4px 8px', height: '24px', width: 'auto' },
    dd: { display: 'block', marginLeft: '40px', padding: '4px 8px', height: '24px', width: 'auto' },
    menu: { display: 'block', listStyleType: 'disc', marginTop: '1em', marginBottom: '1em' },

    // === TABLES ===
    table: { display: 'table', width: 'auto' },
    thead: { display: 'table-header-group' },
    tbody: { display: 'table-row-group' },
    tfoot: { display: 'table-footer-group' },
    tr: { display: 'table-row' },
    th: {
        display: 'table-cell',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#888',
        fontWeight: 'bold',
        textAlign: 'center'
    },
    td: {
        display: 'table-cell',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#bbb',
    },
    caption: { display: 'table-caption', background: '#f9e6ff', textAlign: 'center', padding: '4px', height: '24px', width: 'auto' },
    col: { display: 'table-column' },
    colgroup: { display: 'table-column-group' },

    // === FORMS ===
    form: { display: 'block' },
    label: { cursor: 'pointer', display: 'inline-block', padding: '4px 8px', height: '24px', width: 'auto' },
    fieldset: {
        display: 'block',
        margin: '0 2px',
        padding: '0.35em 0.75em 0.625em',
        borderWidth: '2px',
        borderStyle: 'groove',
        borderColor: '#e5e7eb'
    },
    legend: { display: 'block', padding: '4px 8px', fontWeight: 'bold', height: '24px', width: 'auto' },
    datalist: { display: 'none' },
    output: { display: 'inline' },
    optgroup: { display: 'block' },
    option: { display: 'block' },

    // Inputs (Merged existing defaults)
    input: {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#2c3e50',
        background: '#ffffff',
        borderRadius: '4px',
        borderWidth: '1px',
        borderColor: '#bdc3c7',
        borderStyle: 'solid',
        padding: '8px',
        width: 'auto',
        height: '40px',
        cursor: 'text'
    },
    button: {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#ffffff',
        background: '#3498db',
        borderRadius: '4px',
        borderWidth: '0px',
        padding: '10px 20px',
        width: 'auto',
        height: '40px',
        cursor: 'pointer',
        textAlign: 'center'
    },
    select: {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#2c3e50',
        background: '#ffffff',
        borderRadius: '4px',
        borderWidth: '1px',
        borderColor: '#bdc3c7',
        borderStyle: 'solid',
        padding: '8px',
        height: '40px'
    },
    textarea: {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#2c3e50',
        background: '#ffffff',
        borderRadius: '4px',
        borderWidth: '1px',
        borderColor: '#bdc3c7',
        borderStyle: 'solid',
        padding: '8px',
        cursor: 'text'
    },
    // Checkbox & Radio
    checkbox: {
        display: 'inline-block',
        background: '#ffffff',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: '#666666',
        borderRadius: '4px',
        width: '20px',
        height: '20px',
        cursor: 'pointer',
    },
    radio: {
        display: 'inline-block',
        background: '#ffffff',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: '#666666',
        borderRadius: '50%',
        width: '20px',
        height: '20px',
        cursor: 'pointer',
    },

    // === MEDIA & EMBEDDED ===
    img: {
        display: 'inline-block',
        borderStyle: 'none',
        objectFit: 'fill',
    },
    canvas: { display: 'inline-block' },
    iframe: { display: 'inline-block', borderWidth: '2px', borderStyle: 'solid' },
    embed: { display: 'inline-block' },
    object: { display: 'inline-block' },
    video: { display: 'inline-block', background: '#000' }, // Placeholder visual
    audio: { display: 'none' },
    map: { display: 'inline' },
    area: { display: 'none' },
    param: { display: 'none' },
    source: { display: 'none' },
    track: { display: 'none' },

    // === LINKS ===
    a: {
        display: 'inline-block',
        background: '#1976d2', // Blue for normal anchor
        borderRadius: '4px',
        borderWidth: '1px',
        borderStyle: 'solid', // Was solid
        borderColor: '#1976d2',
        cursor: 'pointer',
        textDecoration: 'underline', // Added standard link decoration
        color: '#ffffff' // Ensure text is visible on blue background
    },
    'a:visited': {
        background: '#6a1b9a',
    },
    'a:hover': {
        background: '#1565c0',
        textDecoration: 'none'
    },

    // === DIVIDERS ===
    hr: {
        display: 'block',
        height: '1px',
        borderStyle: 'inset',
        borderWidth: '1px',
        margin: '0.5em auto',
        width: '100%'
    },

    // === INTERACTIVE ===
    details: { display: 'block', padding: '4px', width: 'auto' },
    summary: { display: 'list-item', cursor: 'pointer', padding: '4px 8px', height: '24px', width: 'auto' },
    dialog: { display: 'none' }
};

@Injectable({
    providedIn: 'root'
})
export class StyleDefaultsService {
    static mergeStyles(base: Partial<StyleRule>, override: Partial<StyleRule>): Partial<StyleRule> {
        const merged = { ...base, ...override };
        // Handle padding
        if (override?.padding) {
            ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(side => {
                if (!(side in override)) {
                    delete merged[side as keyof StyleRule];
                }
            });
        }
        // Handle margin
        if (override?.margin) {
            ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].forEach(side => {
                if (!(side in override)) {
                    delete merged[side as keyof StyleRule];
                }
            });
        }
        return merged;
    }

    getGlobalDefaultStyle(): Partial<StyleRule> {
        return globalDefaultStyle;
    }

    getElementTypeDefaults(elementType: string): Partial<StyleRule> {
        // Merge global defaults with element-specific defaults (element-specific takes precedence)
        return { ...globalDefaultStyle, ...(defaults[elementType] || {}) };
    }
} 