import type { DOMElementType } from '../app/types/dom-element';

export const ASTYLAR_CORE_ELEMENT_TYPES = Object.freeze([
  'div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside',
  'address', 'figure', 'figcaption', 'hgroup', 'ul', 'ol', 'li', 'dl', 'dt',
  'dd', 'menu', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
  'caption', 'col', 'colgroup', 'a', 'area', 'img', 'span', 'input', 'button',
  'form', 'select', 'textarea', 'label', 'option', 'fieldset', 'legend',
  'datalist', 'output', 'optgroup', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p',
  'br', 'wbr', 'hr', 'b', 'strong', 'i', 'em', 'cite', 'var', 'dfn', 'u',
  'ins', 's', 'strike', 'del', 'code', 'kbd', 'samp', 'pre', 'small', 'sub',
  'sup', 'blockquote', 'q', 'abbr', 'mark', 'details', 'summary', 'dialog',
  'canvas', 'iframe', 'embed', 'object', 'video', 'audio', 'map', 'param',
  'source', 'track',
] satisfies readonly DOMElementType[]);

