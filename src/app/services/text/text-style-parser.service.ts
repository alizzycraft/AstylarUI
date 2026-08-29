import { Injectable } from '@angular/core';
import { StyleRule } from '../../types/style-rule';
import { TextStyleProperties, TextShadowEffect } from '../../types/text-rendering';

/**
 * TextStyleParser Service
 * 
 * Handles parsing and conversion of CSS-like text properties from StyleRule objects
 * to TextStyleProperties interfaces. This service provides comprehensive text style
 * parsing with proper fallback handling, font resolution, and CSS property normalization.
 */
@Injectable({
  providedIn: 'root'
})
export class TextStyleParserService {

  /**
   * Default font families for fallback handling
   */
  private readonly DEFAULT_FONT_FAMILIES = [
    'Arial',
    'Helvetica',
    'sans-serif'
  ];

  /**
   * Default text style properties
   */
  private readonly DEFAULT_TEXT_STYLE: TextStyleProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#000000',
    caretColor: 'auto',
    textAlign: 'left',
    verticalAlign: 'baseline',
    lineHeight: 1.15,
    letterSpacing: 0,
    wordSpacing: 0,
    whiteSpace: 'normal',
    wordWrap: 'normal',
    textOverflow: 'clip',
    textDecoration: 'none',
    textTransform: 'none'
  };

  /**
   * Converts StyleRule text properties to TextStyleProperties interface
   * @param styleRule - The CSS-like style rule containing text properties
   * @param containerSize - Optional container size for relative font size calculations
   * @returns Parsed and normalized TextStyleProperties
   */
  parseTextProperties(styleRule: StyleRule, containerSize?: number): TextStyleProperties {
    const textStyle: TextStyleProperties = { ...this.DEFAULT_TEXT_STYLE };

    // Parse font properties
    if (styleRule.fontFamily) {
      textStyle.fontFamily = this.resolveFontFamily(styleRule.fontFamily);
    }

    if (styleRule.fontSize) {
      textStyle.fontSize = this.calculateFontSize(styleRule.fontSize, containerSize);
    }

    if (styleRule.fontWeight) {
      textStyle.fontWeight = this.parseFontWeight(styleRule.fontWeight);
    }

    if (styleRule.fontStyle) {
      textStyle.fontStyle = this.parseFontStyle(styleRule.fontStyle);
    }

    // Parse text appearance properties
    if (styleRule.color) {
      textStyle.color = this.parseColor(styleRule.color);
    }

    if (styleRule.caretColor) {
      textStyle.caretColor = styleRule.caretColor.trim();
    }

    if (styleRule.textAlign) {
      textStyle.textAlign = this.parseTextAlign(styleRule.textAlign);
    }

    if (styleRule.verticalAlign) {
      textStyle.verticalAlign = this.parseVerticalAlign(styleRule.verticalAlign);
    }

    if (styleRule.lineHeight) {
      textStyle.lineHeight = this.parseLineHeight(
        styleRule.lineHeight,
        textStyle.fontSize,
      );
    }

    if (styleRule.letterSpacing) {
      textStyle.letterSpacing = this.parseSpacing(styleRule.letterSpacing);
    }

    if (styleRule.wordSpacing) {
      textStyle.wordSpacing = this.parseSpacing(styleRule.wordSpacing);
    }

    // Parse text behavior properties
    if (styleRule.whiteSpace) {
      textStyle.whiteSpace = this.parseWhiteSpace(styleRule.whiteSpace);
    }

    if (styleRule.wordWrap) {
      textStyle.wordWrap = this.parseWordWrap(styleRule.wordWrap);
    }

    if (styleRule.textOverflow) {
      textStyle.textOverflow = this.parseTextOverflow(styleRule.textOverflow);
    }

    // Parse text effects
    if (styleRule.textShadow) {
      textStyle.textShadow = this.parseTextShadow(styleRule.textShadow);
    }

    if (styleRule.textDecoration) {
      textStyle.textDecoration = this.parseTextDecoration(styleRule.textDecoration);
    }

    if (styleRule.textTransform) {
      textStyle.textTransform = this.parseTextTransform(styleRule.textTransform);
    }

    // Parse text stroke (outline) if available
    if (styleRule.textStroke) {
      textStyle.textStroke = this.parseTextStroke(styleRule.textStroke);
    }

    return textStyle;
  }

  /**
   * Resolves font family with proper fallback handling
   * @param fontFamily - The font family string from CSS
   * @returns Resolved font family string with fallbacks
   */
  resolveFontFamily(fontFamily: string): string {
    if (!fontFamily || fontFamily.trim() === '') {
      return this.DEFAULT_FONT_FAMILIES.join(', ');
    }

    // Clean up the font family string
    const cleanedFontFamily = fontFamily.trim();
    
    // Split by comma to get individual font families
    const fontFamilies = cleanedFontFamily.split(',').map(font => font.trim());
    
    // Remove quotes from font names
    const processedFonts = fontFamilies.map(font => {
      // Remove surrounding quotes if present
      if ((font.startsWith('"') && font.endsWith('"')) || 
          (font.startsWith("'") && font.endsWith("'"))) {
        return font.slice(1, -1);
      }
      return font;
    });

    // Check if we have generic fallbacks
    const hasGenericFallback = processedFonts.some(font => 
      ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'].includes(font.toLowerCase())
    );

    // Add default fallbacks if none exist
    if (!hasGenericFallback) {
      processedFonts.push(...this.DEFAULT_FONT_FAMILIES);
    }

    return processedFonts.join(', ');
  }

  /**
   * Calculates font size with support for relative units
   * @param fontSize - The font size string from CSS
   * @param containerSize - Optional container size for relative calculations
   * @returns Font size in pixels
   */
  calculateFontSize(fontSize: string, containerSize?: number): number {
    if (!fontSize || fontSize.trim() === '') {
      return this.DEFAULT_TEXT_STYLE.fontSize;
    }

    const cleanedSize = fontSize.trim().toLowerCase();

    // Handle pixel values
    if (cleanedSize.endsWith('px')) {
      const pixelValue = parseFloat(cleanedSize.replace('px', ''));
      return isNaN(pixelValue) ? this.DEFAULT_TEXT_STYLE.fontSize : Math.max(1, pixelValue);
    }

    // Handle em values (relative to container or default)
    if (cleanedSize.endsWith('em')) {
      const emValue = parseFloat(cleanedSize.replace('em', ''));
      const baseSize = containerSize || this.DEFAULT_TEXT_STYLE.fontSize;
      return isNaN(emValue) ? this.DEFAULT_TEXT_STYLE.fontSize : Math.max(1, emValue * baseSize);
    }

    // Handle rem values (relative to root font size, assume 16px)
    if (cleanedSize.endsWith('rem')) {
      const remValue = parseFloat(cleanedSize.replace('rem', ''));
      const rootSize = 16; // Standard root font size
      return isNaN(remValue) ? this.DEFAULT_TEXT_STYLE.fontSize : Math.max(1, remValue * rootSize);
    }

    // Handle percentage values
    if (cleanedSize.endsWith('%')) {
      const percentValue = parseFloat(cleanedSize.replace('%', ''));
      const baseSize = containerSize || this.DEFAULT_TEXT_STYLE.fontSize;
      return isNaN(percentValue) ? this.DEFAULT_TEXT_STYLE.fontSize : Math.max(1, (percentValue / 100) * baseSize);
    }

    // Handle named font sizes
    const namedSizes: { [key: string]: number } = {
      'xx-small': 9,
      'x-small': 10,
      'small': 13,
      'medium': 16,
      'large': 18,
      'x-large': 24,
      'xx-large': 32,
      'smaller': (containerSize || this.DEFAULT_TEXT_STYLE.fontSize) * 0.83,
      'larger': (containerSize || this.DEFAULT_TEXT_STYLE.fontSize) * 1.2
    };

    if (namedSizes[cleanedSize]) {
      return Math.max(1, namedSizes[cleanedSize]);
    }

    // Handle numeric values (assume pixels)
    const numericValue = parseFloat(cleanedSize);
    if (!isNaN(numericValue)) {
      return Math.max(1, numericValue);
    }

    // Fallback to default
    console.warn(`Invalid font size value: "${fontSize}". Using default size.`);
    return this.DEFAULT_TEXT_STYLE.fontSize;
  }

  /**
   * Parses text shadow effects from CSS text-shadow property
   * @param textShadow - The text-shadow CSS property value
   * @returns Array of TextShadowEffect objects
   */
  parseTextShadow(textShadow: string): TextShadowEffect[] {
    if (!textShadow || textShadow.trim() === '' || textShadow.toLowerCase() === 'none') {
      return [];
    }

    const shadows: TextShadowEffect[] = [];
    
    // Split multiple shadows by comma (but not commas inside color functions)
    const shadowStrings = this.splitShadowString(textShadow);

    for (const shadowString of shadowStrings) {
      const shadow = this.parseSingleTextShadow(shadowString.trim());
      if (shadow) {
        shadows.push(shadow);
      }
    }

    return shadows;
  }

  /**
   * Parses font weight values
   * @param fontWeight - The font weight CSS value
   * @returns Normalized font weight value
   */
  private parseFontWeight(fontWeight: string): TextStyleProperties['fontWeight'] {
    const cleanedWeight = fontWeight.trim().toLowerCase();

    // Handle named weights
    const namedWeights: { [key: string]: TextStyleProperties['fontWeight'] } = {
      'normal': 'normal',
      'bold': 'bold',
      'bolder': 'bolder',
      'lighter': 'lighter'
    };

    if (namedWeights[cleanedWeight]) {
      return namedWeights[cleanedWeight];
    }

    // Handle numeric weights
    const numericWeight = parseInt(cleanedWeight, 10);
    if (!isNaN(numericWeight) && numericWeight >= 100 && numericWeight <= 900) {
      return numericWeight as TextStyleProperties['fontWeight'];
    }

    console.warn(`Invalid font weight value: "${fontWeight}". Using default "normal".`);
    return 'normal';
  }

  /**
   * Parses font style values
   * @param fontStyle - The font style CSS value
   * @returns Normalized font style value
   */
  private parseFontStyle(fontStyle: string): TextStyleProperties['fontStyle'] {
    const cleanedStyle = fontStyle.trim().toLowerCase();
    
    const validStyles: TextStyleProperties['fontStyle'][] = ['normal', 'italic', 'oblique'];
    
    if (validStyles.includes(cleanedStyle as TextStyleProperties['fontStyle'])) {
      return cleanedStyle as TextStyleProperties['fontStyle'];
    }

    console.warn(`Invalid font style value: "${fontStyle}". Using default "normal".`);
    return 'normal';
  }

  /**
   * Parses color values (simplified version)
   * @param color - The color CSS value
   * @returns Normalized color string
   */
  private parseColor(color: string): string {
    if (!color || color.trim() === '') {
      return this.DEFAULT_TEXT_STYLE.color;
    }

    // For now, return the color as-is since the canvas renderer will handle color parsing
    // In a more complete implementation, we could normalize colors to a standard format
    return color.trim();
  }

  /**
   * Parses text alignment values
   * @param textAlign - The text-align CSS value
   * @returns Normalized text alignment value
   */
  private parseTextAlign(textAlign: string): TextStyleProperties['textAlign'] {
    const cleanedAlign = textAlign.trim().toLowerCase();
    
    const validAlignments: TextStyleProperties['textAlign'][] = ['left', 'center', 'right', 'justify'];
    
    if (validAlignments.includes(cleanedAlign as TextStyleProperties['textAlign'])) {
      return cleanedAlign as TextStyleProperties['textAlign'];
    }

    console.warn(`Invalid text-align value: "${textAlign}". Using default "left".`);
    return 'left';
  }

  /**
   * Parses vertical alignment values
   * @param verticalAlign - The vertical-align CSS value
   * @returns Normalized vertical alignment value
   */
  private parseVerticalAlign(verticalAlign: string): TextStyleProperties['verticalAlign'] {
    const cleanedAlign = verticalAlign.trim().toLowerCase();
    
    const validAlignments: TextStyleProperties['verticalAlign'][] = ['top', 'middle', 'bottom', 'baseline'];
    
    if (validAlignments.includes(cleanedAlign as TextStyleProperties['verticalAlign'])) {
      return cleanedAlign as TextStyleProperties['verticalAlign'];
    }

    console.warn(`Invalid vertical-align value: "${verticalAlign}". Using default "baseline".`);
    return 'baseline';
  }

  /**
   * Parses line height values
   * @param lineHeight - The line-height CSS value
   * @returns Normalized line height as a multiplier
   */
  private parseLineHeight(lineHeight: string, fontSize: number): number {
    const cleanedHeight = lineHeight.trim().toLowerCase();

    // Handle 'normal' keyword
    if (cleanedHeight === 'normal') {
      return this.DEFAULT_TEXT_STYLE.lineHeight; // Align with default CSS normal behavior approximation
    }

    // Handle numeric values (unitless multiplier)
    const numericValue = parseFloat(cleanedHeight);
    if (!isNaN(numericValue) && !cleanedHeight.includes('px') && !cleanedHeight.includes('em') && !cleanedHeight.includes('%')) {
      return Math.max(0.1, numericValue);
    }

    // Handle pixel values (convert to multiplier based on font size)
    if (cleanedHeight.endsWith('px')) {
      const pixelValue = parseFloat(cleanedHeight.replace('px', ''));
      if (!isNaN(pixelValue)) {
        return Math.max(0.1, pixelValue / fontSize);
      }
    }

    // Handle percentage values
    if (cleanedHeight.endsWith('%')) {
      const percentValue = parseFloat(cleanedHeight.replace('%', ''));
      if (!isNaN(percentValue)) {
        return Math.max(0.1, percentValue / 100);
      }
    }

    console.warn(`Invalid line-height value: "${lineHeight}". Using default ${this.DEFAULT_TEXT_STYLE.lineHeight}.`);
    return this.DEFAULT_TEXT_STYLE.lineHeight;
  }

  /**
   * Parses spacing values (letter-spacing, word-spacing)
   * @param spacing - The spacing CSS value
   * @returns Spacing value in pixels
   */
  private parseSpacing(spacing: string): number {
    const cleanedSpacing = spacing.trim().toLowerCase();

    // Handle 'normal' keyword
    if (cleanedSpacing === 'normal') {
      return 0;
    }

    // Handle pixel values
    if (cleanedSpacing.endsWith('px')) {
      const pixelValue = parseFloat(cleanedSpacing.replace('px', ''));
      return isNaN(pixelValue) ? 0 : pixelValue;
    }

    // Handle em values (approximate conversion)
    if (cleanedSpacing.endsWith('em')) {
      const emValue = parseFloat(cleanedSpacing.replace('em', ''));
      return isNaN(emValue) ? 0 : emValue * this.DEFAULT_TEXT_STYLE.fontSize;
    }

    // Handle numeric values (assume pixels)
    const numericValue = parseFloat(cleanedSpacing);
    if (!isNaN(numericValue)) {
      return numericValue;
    }

    console.warn(`Invalid spacing value: "${spacing}". Using default 0.`);
    return 0;
  }

  /**
   * Parses white-space values
   * @param whiteSpace - The white-space CSS value
   * @returns Normalized white-space value
   */
  private parseWhiteSpace(whiteSpace: string): TextStyleProperties['whiteSpace'] {
    const cleanedWhiteSpace = whiteSpace.trim().toLowerCase();
    
    const validValues: TextStyleProperties['whiteSpace'][] = ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line'];
    
    if (validValues.includes(cleanedWhiteSpace as TextStyleProperties['whiteSpace'])) {
      return cleanedWhiteSpace as TextStyleProperties['whiteSpace'];
    }

    console.warn(`Invalid white-space value: "${whiteSpace}". Using default "normal".`);
    return 'normal';
  }

  /**
   * Parses word-wrap values
   * @param wordWrap - The word-wrap CSS value
   * @returns Normalized word-wrap value
   */
  private parseWordWrap(wordWrap: string): TextStyleProperties['wordWrap'] {
    const cleanedWordWrap = wordWrap.trim().toLowerCase();
    
    const validValues: TextStyleProperties['wordWrap'][] = ['normal', 'break-word', 'anywhere'];
    
    if (validValues.includes(cleanedWordWrap as TextStyleProperties['wordWrap'])) {
      return cleanedWordWrap as TextStyleProperties['wordWrap'];
    }

    console.warn(`Invalid word-wrap value: "${wordWrap}". Using default "normal".`);
    return 'normal';
  }

  /**
   * Parses text-overflow values
   * @param textOverflow - The text-overflow CSS value
   * @returns Normalized text-overflow value
   */
  private parseTextOverflow(textOverflow: string): TextStyleProperties['textOverflow'] {
    const cleanedOverflow = textOverflow.trim().toLowerCase();
    
    const validValues: TextStyleProperties['textOverflow'][] = ['clip', 'ellipsis'];
    
    if (validValues.includes(cleanedOverflow as TextStyleProperties['textOverflow'])) {
      return cleanedOverflow as TextStyleProperties['textOverflow'];
    }

    console.warn(`Invalid text-overflow value: "${textOverflow}". Using default "clip".`);
    return 'clip';
  }

  /**
   * Parses text-decoration values
   * @param textDecoration - The text-decoration CSS value
   * @returns Normalized text-decoration value
   */
  private parseTextDecoration(textDecoration: string): TextStyleProperties['textDecoration'] {
    const cleanedDecoration = textDecoration.trim().toLowerCase();
    
    const validValues: TextStyleProperties['textDecoration'][] = ['none', 'underline', 'overline', 'line-through'];
    
    if (validValues.includes(cleanedDecoration as TextStyleProperties['textDecoration'])) {
      return cleanedDecoration as TextStyleProperties['textDecoration'];
    }

    console.warn(`Invalid text-decoration value: "${textDecoration}". Using default "none".`);
    return 'none';
  }

  /**
   * Parses text-transform values
   * @param textTransform - The text-transform CSS value
   * @returns Normalized text-transform value
   */
  private parseTextTransform(textTransform: string): TextStyleProperties['textTransform'] {
    const cleanedTransform = textTransform.trim().toLowerCase();
    
    const validValues: TextStyleProperties['textTransform'][] = ['none', 'uppercase', 'lowercase', 'capitalize'];
    
    if (validValues.includes(cleanedTransform as TextStyleProperties['textTransform'])) {
      return cleanedTransform as TextStyleProperties['textTransform'];
    }

    console.warn(`Invalid text-transform value: "${textTransform}". Using default "none".`);
    return 'none';
  }

  /**
   * Parses text-stroke values
   * @param textStroke - The text-stroke CSS value
   * @returns Parsed text stroke configuration
   */
  private parseTextStroke(textStroke: string): TextStyleProperties['textStroke'] {
    if (!textStroke || textStroke.trim() === '' || textStroke.toLowerCase() === 'none') {
      return undefined;
    }

    // Simple parsing for "width color" format
    const parts = textStroke.trim().split(/\s+/);
    
    if (parts.length >= 2) {
      const width = parseFloat(parts[0].replace('px', ''));
      const color = parts.slice(1).join(' ');
      
      if (!isNaN(width) && width > 0) {
        return {
          width,
          color: color || '#000000'
        };
      }
    }

    console.warn(`Invalid text-stroke value: "${textStroke}". Ignoring text stroke.`);
    return undefined;
  }

  /**
   * Splits text shadow string by commas, respecting color functions
   * @param shadowString - The complete text-shadow CSS value
   * @returns Array of individual shadow strings
   */
  private splitShadowString(shadowString: string): string[] {
    const shadows: string[] = [];
    let currentShadow = '';
    let parenDepth = 0;
    
    for (let i = 0; i < shadowString.length; i++) {
      const char = shadowString[i];
      
      if (char === '(') {
        parenDepth++;
      } else if (char === ')') {
        parenDepth--;
      } else if (char === ',' && parenDepth === 0) {
        shadows.push(currentShadow.trim());
        currentShadow = '';
        continue;
      }
      
      currentShadow += char;
    }
    
    if (currentShadow.trim()) {
      shadows.push(currentShadow.trim());
    }
    
    return shadows;
  }

  /**
   * Parses a single text shadow definition
   * @param shadowString - A single text shadow CSS value
   * @returns TextShadowEffect object or null if invalid
   */
  private parseSingleTextShadow(shadowString: string): TextShadowEffect | null {
    if (!shadowString || shadowString === 'none') {
      return null;
    }

    // Regular expression to match text shadow components
    // Format: [offset-x] [offset-y] [blur-radius] [color]
    const shadowRegex = /^([+-]?\d*\.?\d+px?)\s+([+-]?\d*\.?\d+px?)\s*(?:([+-]?\d*\.?\d+px?)\s*)?(.*)$/;
    const match = shadowString.match(shadowRegex);

    if (!match) {
      console.warn(`Invalid text shadow format: "${shadowString}"`);
      return null;
    }

    const offsetX = parseFloat(match[1].replace('px', '')) || 0;
    const offsetY = parseFloat(match[2].replace('px', '')) || 0;
    const blurRadius = match[3] ? parseFloat(match[3].replace('px', '')) || 0 : 0;
    const color = match[4] ? match[4].trim() : '#000000';

    return {
      offsetX,
      offsetY,
      blurRadius,
      color: color || '#000000'
    };
  }
}
