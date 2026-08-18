import type { StyleRule } from './style-rule';

// Table and anchor element types (clarified for type safety)
export type DOMElementType =
  | 'div' | 'section' | 'article' | 'header' | 'footer' | 'nav' | 'main' | 'aside' | 'address' | 'figure' | 'figcaption' | 'hgroup'
  | 'ul' | 'ol' | 'li' | 'dl' | 'dt' | 'dd' | 'menu'
  | 'table' | 'thead' | 'tbody' | 'tfoot' | 'tr' | 'td' | 'th' | 'caption' | 'col' | 'colgroup'
  | 'a' | 'area' // anchor types
  | 'img' | 'span' | 'input' | 'button' | 'form' | 'select' | 'textarea' | 'label' | 'option' | 'fieldset' | 'legend' | 'datalist' | 'output' | 'optgroup'
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'br' | 'wbr' | 'hr'
  | 'b' | 'strong' | 'i' | 'em' | 'cite' | 'var' | 'dfn' | 'u' | 'ins' | 's' | 'strike' | 'del' | 'code' | 'kbd' | 'samp' | 'pre'
  | 'small' | 'sub' | 'sup' | 'blockquote' | 'q' | 'abbr' | 'mark'
  | 'details' | 'summary' | 'dialog' // interactive
  | 'canvas' | 'iframe' | 'embed' | 'object' | 'video' | 'audio' | 'map' | 'param' | 'source' | 'track'; // media

export interface DOMElement {
  id?: string;
  type: DOMElementType;
  style?: Partial<Omit<StyleRule, 'selector'>>;
  children?: DOMElement[];
  textContent?: string;
  class?: string;
  src?: string;
  alt?: string;
  href?: string;
  target?: string;
  value?: string;
  placeholder?: string;
  maxLength?: number;
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
  readonly?: boolean;
  multiple?: boolean;
  selected?: boolean;
  name?: string;
  min?: string;
  max?: string;
  step?: string;
  pattern?: string;
  accept?: string;
  autocomplete?: string;
  autofocus?: boolean;
  cols?: number;
  rows?: number;
  wrap?: string;
  for?: string;
  headers?: string;
  colspan?: number;
  rowspan?: number;
  scope?: string;
  abbr?: string;
  accesskey?: string;
  contenteditable?: boolean;
  dir?: string;
  draggable?: boolean;
  hidden?: boolean;
  lang?: string;
  spellcheck?: boolean;
  tabindex?: number;
  title?: string;
  translate?: boolean;
  /** Explicit semantic role for the supported accessibility subset. */
  role?: string;
  ariaLabel?: string;
  /** Space-separated authored element IDs. */
  ariaLabelledby?: string;
  /** Space-separated authored element IDs. */
  ariaDescribedby?: string;
  ariaLive?: 'off' | 'polite' | 'assertive';
  ariaAtomic?: boolean;
  ariaCurrent?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  // Table-specific
  tableProperties?: {
    colspan?: number;
    rowspan?: number;
    borderCollapse?: 'collapse' | 'separate';
    borderSpacing?: number;
    tableLayout?: 'auto' | 'fixed';
    span?: number; // For col and colgroup elements
    width?: string; // For col elements
  };
  // Input-specific
  inputType?: string; // Type of input element (text, button, checkbox, etc.)
  inputElement?: any; // Reference to InputElement state object
  /** @deprecated Executable strings are not supported. Use AstylarRenderOptions.events. */
  onclick?: string;
  options?: Array<{ value: any; label: string; disabled?: boolean }>; // Options for select elements
  validationRules?: Array<{ type: string; value?: any; message: string }>; // Validation rules
}
