// Browser-compatibility default styles.
//
// This is the legacy Astylar default set extracted from StyleDefaultsService.
// It expresses the intended browser-like baseline, but it has not yet been
// audited against a browser user-agent stylesheet and includes some deliberate
// Astylar visual styling. Rendering-parity work should revise values from
// measured fixtures rather than assuming this configuration is already exact.
// Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element

import { StyleRule } from "../types/style-rule";

// Shared baseline applied before element-specific defaults.
export const globalDefaultStyle: Partial<StyleRule> = {
  display: "block",
  margin: "0",
  padding: "0",
  borderWidth: "0",
  borderStyle: "none",
  borderColor: "transparent",
  borderRadius: "0",
  background: "transparent",
  boxShadow: undefined,
  opacity: "1.0",
  lineHeight: "normal",
  flexDirection: "row",
  flexWrap: "nowrap",
  justifyContent: "flex-start",
  alignItems: "stretch",
  alignContent: "stretch",
  order: "0",
  flexGrow: "0",
  flexShrink: "1",
  flexBasis: "auto",
  alignSelf: "auto",
  cursor: "default",
};

export const elementDefaults: { [key: string]: Partial<StyleRule> } = {
  // === SECTIONS & STRUCTURE ===
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div
  div: {},
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/section
  section: { background: "#34495e" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article
  article: { background: "#27ae60" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/header
  header: { background: "#3498db" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/footer
  footer: { display: "block" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav
  nav: { display: "block" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/main
  main: { display: "block" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/aside
  aside: { display: "block" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/address
  address: {
    display: "block",
    fontStyle: "italic",
    padding: "4px 8px",
    margin: "8px 0",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure
  figure: { display: "block", margin: "1em 40px" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption
  figcaption: {
    display: "block",
    padding: "4px 8px",
    margin: "8px 0",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hgroup
  hgroup: { display: "block" },

  // === TYPOGRAPHY & TEXT ===
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements
  h1: {
    fontSize: "32px",
    fontWeight: "bold",
    display: "block",
    margin: "0.67em 0",
  },
  h2: {
    fontSize: "24px",
    fontWeight: "bold",
    display: "block",
    margin: "0.83em 0",
  },
  h3: {
    fontSize: "18.72px",
    fontWeight: "bold",
    display: "block",
    margin: "1em 0",
  },
  h4: {
    fontSize: "16px",
    fontWeight: "bold",
    display: "block",
    margin: "1.33em 0",
  },
  h5: {
    fontSize: "13.28px",
    fontWeight: "bold",
    display: "block",
    margin: "1.67em 0",
  },
  h6: {
    fontSize: "10.72px",
    fontWeight: "bold",
    display: "block",
    margin: "2.33em 0",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/p
  p: { display: "block", margin: "1em 0" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/span
  span: { display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/b
  b: { fontWeight: "bold", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/strong
  strong: { fontWeight: "bold", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/i
  i: { fontStyle: "italic", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/em
  em: { fontStyle: "italic", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/cite
  cite: { fontStyle: "italic", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/u
  u: { textDecoration: "underline", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ins
  ins: { textDecoration: "underline", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/s
  s: { textDecoration: "line-through", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/strike
  strike: { textDecoration: "line-through", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/del
  del: { textDecoration: "line-through", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/code
  code: { fontFamily: "monospace", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/kbd
  kbd: { fontFamily: "monospace", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/samp
  samp: { fontFamily: "monospace", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/var
  var: { fontFamily: "monospace", fontStyle: "italic", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dfn
  dfn: { fontStyle: "italic", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/pre
  pre: {
    display: "block",
    fontFamily: "monospace",
    whiteSpace: "pre",
    margin: "1em 0",
    padding: "8px",
    width: "auto",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/small
  small: { fontSize: "0.83em", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sub
  sub: { verticalAlign: "sub", fontSize: "0.83em", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sup
  sup: { verticalAlign: "super", fontSize: "0.83em", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote
  blockquote: {
    display: "block",
    margin: "1em 40px",
    fontStyle: "italic",
    padding: "8px",
    width: "auto",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/q
  q: { display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/abbr
  abbr: { textDecoration: "underline dotted", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/mark
  mark: { background: "yellow", color: "black", display: "inline" },

  br: {},
  wbr: {},

  // === LISTS ===
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ul
  ul: {
    display: "block",
    listStyleType: "disc",
    paddingLeft: "40px",
    marginTop: "16px",
    marginBottom: "16px",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol
  ol: {
    display: "block",
    listStyleType: "decimal",
    paddingLeft: "40px",
    marginTop: "16px",
    marginBottom: "16px",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/li
  li: { display: "list-item" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl
  dl: { display: "block", marginTop: "1em", marginBottom: "1em" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dt
  dt: {
    display: "block",
    fontWeight: "bold",
    padding: "4px 8px",
    margin: "8px 0",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dd
  dd: {
    display: "block",
    marginLeft: "40px",
    padding: "4px 8px",
    margin: "8px 0",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/menu
  menu: {
    display: "block",
    listStyleType: "disc",
    marginTop: "1em",
    marginBottom: "1em",
  },

  // === TABLES ===
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table
  table: { display: "table", width: "auto" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/thead
  thead: { display: "table-header-group" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tbody
  tbody: { display: "table-row-group" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tfoot
  tfoot: { display: "table-footer-group" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tr
  tr: { display: "table-row" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th
  th: {
    display: "table-cell",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#888",
    fontWeight: "bold",
    textAlign: "center",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/td
  td: {
    display: "table-cell",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#bbb",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/caption
  caption: {
    display: "table-caption",
    background: "#f9e6ff",
    textAlign: "center",
    padding: "4px",
    height: "24px",
    width: "auto",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/col
  col: { display: "table-column" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/colgroup
  colgroup: { display: "table-column-group" },

  // === FORMS ===
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form
  form: { display: "block" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label
  label: { cursor: "pointer", display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset
  fieldset: {
    display: "block",
    margin: "0 2px",
    padding: "0.35em 0.75em 0.625em",
    borderWidth: "2px",
    borderStyle: "groove",
    borderColor: "#e5e7eb",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/legend
  legend: {
    display: "block",
    fontWeight: "bold",
    padding: "0 2px",
    margin: "0",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist
  datalist: { display: "none" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output
  output: { display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/optgroup
  optgroup: { display: "block" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option
  option: { display: "block" },

  // Inputs (Merged existing defaults)
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
  input: {
    fontSize: "16px",
    fontFamily: "Arial",
    color: "#2c3e50",
    background: "#ffffff",
    borderRadius: "4px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#bdc3c7",
    padding: "8px",
    width: "auto",
    height: "40px",
    cursor: "text",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button
  button: {
    fontSize: "16px",
    fontFamily: "Arial",
    color: "#ffffff",
    background: "#3498db",
    borderRadius: "4px",
    borderWidth: "0px",
    padding: "10px 20px",
    width: "auto",
    height: "40px",
    cursor: "pointer",
    textAlign: "center",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select
  select: {
    fontSize: "16px",
    fontFamily: "Arial",
    color: "#2c3e50",
    background: "#ffffff",
    borderRadius: "4px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#bdc3c7",
    padding: "8px",
    height: "40px",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea
  textarea: {
    fontSize: "16px",
    fontFamily: "Arial",
    color: "#2c3e50",
    background: "#ffffff",
    borderRadius: "4px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#bdc3c7",
    padding: "8px",
    cursor: "text",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox
  checkbox: {
    display: "inline-block",
    background: "#ffffff",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "#666666",
    borderRadius: "4px",
    width: "20px",
    height: "20px",
    cursor: "pointer",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/radio
  radio: {
    display: "inline-block",
    background: "#ffffff",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "#666666",
    borderRadius: "50%",
    width: "20px",
    height: "20px",
    cursor: "pointer",
  },

  // === MEDIA & EMBEDDED ===
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img
  img: {
    display: "inline-block",
    borderStyle: "none",
    objectFit: "fill",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas
  canvas: { display: "inline-block" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
  iframe: { display: "inline-block", borderWidth: "2px", borderStyle: "solid" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/embed
  embed: { display: "inline-block" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object
  object: { display: "inline-block" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video
  video: { display: "inline-block", background: "#000" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio
  audio: { display: "none" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/map
  map: { display: "inline" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area
  area: { display: "none" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/param
  param: { display: "none" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source
  source: { display: "none" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track
  track: { display: "none" },

  // === DIVIDERS ===
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr
  hr: {
    display: "block",
    height: "1px",
    borderStyle: "inset",
    borderWidth: "1px",
    margin: "0.5em auto",
    width: "100%",
  },

  // === LINKS ===
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a
  a: {
    display: "inline-block",
    background: "#1976d2",
    borderRadius: "4px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#1976d2",
    cursor: "pointer",
    textDecoration: "underline",
    color: "#ffffff",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/CSS/:visited
  "a:visited": {
    background: "#6a1b9a",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/CSS/:hover
  "a:hover": {
    background: "#1565c0",
    textDecoration: "none",
  },

  // === INTERACTIVE ===
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details
  details: { display: "block", padding: "4px", width: "auto" },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary
  summary: {
    display: "block",
    cursor: "pointer",
    padding: "0.2em 0",
    margin: "0",
  },
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
  dialog: { display: "none" },
};
