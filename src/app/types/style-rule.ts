export interface StyleRule {
  selector: string;
  // Optional media bounds for conditionally applying this JSON style rule.
  mediaMinWidth?: string;
  mediaMaxWidth?: string;
  mediaMinHeight?: string;
  mediaMaxHeight?: string;
  // Positioning
  position?: 'static' | 'relative' | 'absolute' | 'fixed';
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  width?: string;
  height?: string;
  boxSizing?: 'content-box' | 'border-box';
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  
  // Background and border
  background?: string;
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: string;
  borderRadius?: string;
  boxShadow?: string;
  polygonType?: string;

  // Padding (all variations)
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;

  // Margin (all variations)
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;

  // Z-index
  zIndex?: string;

  // Opacity
  opacity?: string;

  // Transform
  transform?: string;
  perspective?: string;

  // List
  listStyleType?: string;
  listItemSpacing?: string;

  // Image
  src?: string;
  objectFit?: string;

  // Anchor/Link
  href?: string;
  target?: string;
  onclick?: string;

  // Text properties
  color?: string;
  /** CSS-like caret color for editable text controls. `auto` follows `color`. */
  caretColor?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  verticalAlign?: string;
  lineHeight?: string;
  letterSpacing?: string;
  wordSpacing?: string;
  whiteSpace?: string;
  wordWrap?: string;
  textOverflow?: string;
  overflow?: 'visible' | 'hidden' | 'clip' | 'auto' | 'scroll';
  textShadow?: string;
  textDecoration?: string;
  textTransform?: string;
  textStroke?: string;
  cursor?: string;
  pointerEvents?: 'auto' | 'none';

  // Flexbox
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  alignContent?: string;
  flexWrap?: string;
  gap?: string;
  rowGap?: string;
  columnGap?: string;
  flexGrow?: string;
  flexShrink?: string;
  flexBasis?: string;
  flex?: string;
  alignSelf?: string;
  order?: string;

  // Grid
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridColumn?: string;
  gridRow?: string;
  /** Unknown-safe declarations resolved through the plugin property registry. */
  extensions?: Readonly<Record<string, unknown>>;
}
