import { Injectable } from '@angular/core';
import {
  TextStyleProperties,
  TextDimensions,
  TextBounds,
  TextEffects,
  TextShadowEffect,
  TextLine,
  TextLayoutMetrics,
  TextLineMetrics,
  TextCharacterMetrics
} from '../../types/text-rendering';

import { MultiLineTextRendererService } from './multi-line-text-renderer.service';
/**
 * Handles off-screen canvas rendering of text using browser's native text capabilities.
 * This service creates and manages HTML5 canvas elements for text rendering, applies
 * text styling, effects, and provides accurate text measurement capabilities.
 */
@Injectable({
  providedIn: 'root'
})
export class TextCanvasRendererService {

  constructor(private multiLineTextRenderer: MultiLineTextRendererService) { }

  /**
   * Creates a styled canvas element with proper dimensions for text rendering
   * @param text - The text content to render
   * @param style - Text styling properties
   * @param maxWidth - Optional maximum width for text wrapping
   * @returns Configured HTMLCanvasElement ready for text rendering
   */
  createStyledCanvas(text: string, style: TextStyleProperties, maxWidth?: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }

    // Calculate text dimensions first to size the canvas appropriately
    const dimensions = this.measureTextBounds(text, style, maxWidth);

    // Set canvas dimensions with device pixel ratio for crisp rendering
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(dimensions.width * devicePixelRatio);
    canvas.height = Math.ceil(dimensions.height * devicePixelRatio);

    // Scale the canvas back down using CSS for proper display
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    // Scale the drawing context to match device pixel ratio
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Apply text styling to the canvas context
    this.applyTextStylingToContext(ctx, style);

    return canvas;
  }

  /**
   * Renders text content to the provided canvas using fillText and strokeText APIs
   * @param canvas - The canvas element to render to
   * @param text - The text content to render
   * @param style - Text styling properties
   * @param maxWidth - Optional maximum width for text wrapping
   */
  renderTextToCanvas(canvas: HTMLCanvasElement, text: string, style: TextStyleProperties, maxWidth?: number): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }

    // Get device pixel ratio for consistent measurements
    const devicePixelRatio = window.devicePixelRatio || 1;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Re-apply styling (in case context was reset)
    this.applyTextStylingToContext(ctx, style);

    // Handle text transformation
    const transformedText = this.applyTextTransform(text, style.textTransform);

    // Handle multi-line text or single line using MultiLineTextRenderer
    const lines = maxWidth ?
      this.multiLineTextRenderer.wrapText(transformedText, maxWidth, style) :
      [{ text: transformedText, width: ctx.measureText(transformedText).width, y: 0 }];

    // Calculate proper line positions using MultiLineTextRenderer
    const positionedLines = this.multiLineTextRenderer.calculateLinePositions(
      lines,
      style,
      canvas.height
    );

    // Render each line of text
    positionedLines.forEach((line) => {
      const x = this.calculateLineX(line.width, canvas.width, style.textAlign);

      // Render text stroke (outline) first if specified
      if (style.textStroke && style.textStroke.width > 0) {
        ctx.strokeStyle = style.textStroke.color;
        ctx.lineWidth = style.textStroke.width;
        ctx.strokeText(line.text, x, line.y);
      }

      // Render the main text
      ctx.fillText(line.text, x, line.y);
    });
  }

  calculateLayoutMetrics(text: string, style: TextStyleProperties, maxWidth?: number): TextLayoutMetrics {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get 2D rendering context for layout metrics');
    }

    this.applyTextStylingToContext(ctx, style);

    const transformedText = this.applyTextTransform(text, style.textTransform);

    // Get device pixel ratio to correctly convert measurements from device pixels to CSS pixels
    // Note: We intentionally DO NOT scale the context here to match how measureTextBounds works.
    // measureTextBounds determines the canvas size (and thus texture size) using unscaled metrics.
    // If we scale here, sub-pixel rendering might result in slightly different metrics than the
    // integer-snapped unscaled metrics, causing cursor drift.
    // const devicePixelRatio = window.devicePixelRatio || 1;
    // ctx.scale(devicePixelRatio, devicePixelRatio);

    const wrappedLines = maxWidth
      ? this.multiLineTextRenderer.wrapText(transformedText, maxWidth, style)
      : [{ text: transformedText, width: ctx.measureText(transformedText).width, y: 0 }];

    const linesWithPositions = this.multiLineTextRenderer.calculateLinePositions([...wrappedLines], style, undefined);

    if (!linesWithPositions.length) {
      linesWithPositions.push({ text: '', width: 0, y: style.fontSize });
    }

    const letterSpacing = style.letterSpacing ?? 0;
    const wordSpacing = style.wordSpacing ?? 0;
    const approxAscent = style.fontSize * 0.8;
    const approxDescent = style.fontSize * 0.2;

    const lineMetrics: TextLineMetrics[] = [];
    const characterMetrics: TextCharacterMetrics[] = [];

    let globalIndex = 0;
    let minTop = Number.POSITIVE_INFINITY;
    let maxBottom = Number.NEGATIVE_INFINITY;
    let maxLineWidth = 0;
    let maxWidthWithSpacing = 0;
    let maxAscent = 0;
    let maxDescent = 0;
    const renderedLines: string[] = [];

    linesWithPositions.forEach((line, lineIndex) => {
      renderedLines.push(line.text);

      const lineStartIndex = globalIndex;
      let cursorX = 0;

      // Measure line dimensions initially
      const lineMeasure = ctx.measureText(line.text);
      let lineAscent = lineMeasure.actualBoundingBoxAscent ?? approxAscent;
      let lineDescent = lineMeasure.actualBoundingBoxDescent ?? approxDescent;

      const characters = Array.from(line.text);
      let previousCharEndX = 0;

      characters.forEach((char, charIndex) => {
        // Calculate cumulative width up to this character
        // This automatically accounts for kerning since we're measuring the full substring
        const substring = line.text.substring(0, charIndex + 1);
        const metrics = ctx.measureText(substring);
        const currentEndX = metrics.width;

        // The character width is the difference between current cumulative width and previous
        // This effectively "assigns" the kerning adjustment to the character itself
        const charWidth = currentEndX - previousCharEndX;

        // Since fillText ignores manual letterSpacing/wordSpacing on the canvas unless manually handled,
        // and we are rendering full lines, we should NOT add extra spacing here to match the render.
        const advanceSpacing = 0;

        // For height metrics, we still might want individual character metrics if possible,
        // but usually line metrics are sufficient. Let's try to get specific char metrics if needed
        // but usually using the line's max or the char's own measureText for height is okay.
        // However, measuring single char for height is safer than substring for height
        const singleCharMetrics = ctx.measureText(char);
        const charAscent = singleCharMetrics.actualBoundingBoxAscent ?? approxAscent;
        const charDescent = singleCharMetrics.actualBoundingBoxDescent ?? approxDescent;

        lineAscent = Math.max(lineAscent, charAscent);
        lineDescent = Math.max(lineDescent, charDescent);

        characterMetrics.push({
          index: globalIndex,
          char,
          lineIndex,
          column: charIndex,
          x: previousCharEndX, // Start at previous end
          width: charWidth,
          advance: charWidth + advanceSpacing,
          isLineBreak: false
        });

        previousCharEndX = currentEndX + advanceSpacing;

        // Note: cursorX isn't strictly needed variable since we track previousCharEndX, 
        // but we can keep it for parity if we want to track total width with manual spacing
        cursorX = previousCharEndX;

        globalIndex += 1;
      });

      const lineEndIndex = globalIndex;

      // Total width is the end of the last character
      const widthWithoutSpacing = characters.length
        ? characterMetrics[characterMetrics.length - 1].x + characterMetrics[characterMetrics.length - 1].width
        : 0;

      const widthWithSpacing = characters.length ? cursorX : 0;

      const baseline = line.y;
      const top = baseline - lineAscent;
      const bottom = baseline + lineDescent;

      minTop = Math.min(minTop, top);
      maxBottom = Math.max(maxBottom, bottom);
      maxLineWidth = Math.max(maxLineWidth, widthWithoutSpacing);
      maxWidthWithSpacing = Math.max(maxWidthWithSpacing, widthWithSpacing);
      maxAscent = Math.max(maxAscent, lineAscent);
      maxDescent = Math.max(maxDescent, lineDescent);

      lineMetrics.push({
        index: lineIndex,
        text: line.text,
        startIndex: lineStartIndex,
        endIndex: lineEndIndex,
        width: widthWithoutSpacing,
        widthWithSpacing,
        height: style.fontSize * style.lineHeight,
        baseline,
        ascent: lineAscent,
        descent: lineDescent,
        top,
        bottom,
        x: 0,
        y: baseline,
        actualLeft: lineMeasure.actualBoundingBoxLeft ?? 0,
        actualRight: lineMeasure.actualBoundingBoxRight ?? widthWithoutSpacing
      });

      if (lineIndex < linesWithPositions.length - 1) {
        characterMetrics.push({
          index: globalIndex,
          char: '\n',
          lineIndex,
          column: characters.length,
          x: widthWithSpacing,
          width: 0,
          advance: 0,
          isLineBreak: true
        });
        globalIndex += 1;
      }
    });

    const totalHeight = (isFinite(minTop) && isFinite(maxBottom)) ? (maxBottom - minTop) : style.fontSize * style.lineHeight;

    return {
      text,
      transformedText: renderedLines.join('\n'),
      totalWidth: Math.max(maxLineWidth, maxWidthWithSpacing),
      totalHeight,
      lineHeight: style.fontSize * style.lineHeight,
      ascent: maxAscent,
      descent: maxDescent,
      lines: lineMetrics,
      characters: characterMetrics
    };
  }

  /**
   * Measures text bounds for accurate dimension calculation
   * @param text - The text content to measure
   * @param style - Text styling properties
   * @param maxWidth - Optional maximum width for text wrapping
   * @returns TextBounds with comprehensive measurement data
   */
  measureTextBounds(text: string, style: TextStyleProperties, maxWidth?: number): TextBounds {
    // Create a temporary canvas for measurement
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get 2D rendering context for text measurement');
    }

    // Apply text styling for accurate measurement
    this.applyTextStylingToContext(ctx, style);

    // Transform text according to style
    const transformedText = this.applyTextTransform(text, style.textTransform);

    // Handle multi-line text measurement using MultiLineTextRenderer
    const lines = maxWidth ?
      this.multiLineTextRenderer.wrapText(transformedText, maxWidth, style) :
      [{ text: transformedText, width: ctx.measureText(transformedText).width, y: 0 }];

    let totalWidth = 0;
    let totalHeight = 0;
    let actualBoundingBoxLeft = 0;
    let actualBoundingBoxRight = 0;
    let actualBoundingBoxAscent = 0;
    let actualBoundingBoxDescent = 0;

    // Calculate proper line positions using MultiLineTextRenderer
    const positionedLines = this.multiLineTextRenderer.calculateLinePositions(lines, style);

    // Measure each line and accumulate bounds
    positionedLines.forEach((line, index) => {
      const metrics = ctx.measureText(line.text);

      // Update line width in the lines array
      line.width = metrics.width;

      // Track maximum width
      totalWidth = Math.max(totalWidth, metrics.width);

      // Accumulate bounding box information
      if (index === 0) {
        actualBoundingBoxLeft = metrics.actualBoundingBoxLeft || 0;
        actualBoundingBoxAscent = metrics.actualBoundingBoxAscent || style.fontSize * 0.8;
      }

      actualBoundingBoxRight = Math.max(actualBoundingBoxRight, metrics.actualBoundingBoxRight || metrics.width);
      actualBoundingBoxDescent = Math.max(actualBoundingBoxDescent, metrics.actualBoundingBoxDescent || style.fontSize * 0.2);
    });

    // Calculate total height based on positioned lines
    totalHeight = positionedLines.length > 0 ?
      (positionedLines[positionedLines.length - 1].y +
        style.fontSize * Math.max(0, style.lineHeight - 1)) :
      style.fontSize * style.lineHeight;

    // Get font bounding box information
    const fontBoundingBoxAscent = style.fontSize; // Approximate ascent
    const fontBoundingBoxDescent = style.fontSize; // Approximate descent

    return {
      width: totalWidth,
      height: totalHeight,
      actualBoundingBoxLeft,
      actualBoundingBoxRight,
      actualBoundingBoxAscent,
      actualBoundingBoxDescent,
      fontBoundingBoxAscent,
      fontBoundingBoxDescent
    };
  }

  /**
   * Handles text overflow with ellipsis support using MultiLineTextRenderer
   * @param text - The text content to check for overflow
   * @param style - Text styling properties
   * @param maxWidth - Maximum width allowed
   * @param maxHeight - Maximum height allowed
   * @returns Modified text lines with overflow handling applied
   */
  handleTextOverflow(
    text: string,
    style: TextStyleProperties,
    maxWidth: number,
    maxHeight: number
  ): TextLine[] {
    const lines = this.multiLineTextRenderer.wrapText(text, maxWidth, style);
    return this.multiLineTextRenderer.handleTextOverflow(lines, maxWidth, maxHeight, style);
  }

  /**
   * Applies text effects like shadows and decorations to the canvas
   * @param canvas - The canvas element to apply effects to
   * @param effects - Text effects configuration
   * @param text - The text content (needed for decoration positioning)
   * @param style - Text styling properties
   */
  applyTextEffects(canvas: HTMLCanvasElement, effects: TextEffects, text: string, style: TextStyleProperties): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context for text effects');
    }

    // Apply text shadows
    if (effects.shadows && effects.shadows.length > 0) {
      this.applyTextShadows(ctx, effects.shadows, text, style);
    }

    // Apply text decorations (underline, overline, line-through)
    if (effects.decorations) {
      this.applyTextDecorations(ctx, effects.decorations, text, style);
    }
  }

  /**
   * Applies text styling properties to the canvas 2D context
   * @param ctx - The 2D rendering context
   * @param style - Text styling properties
   */
  private applyTextStylingToContext(ctx: CanvasRenderingContext2D, style: TextStyleProperties): void {
    // Set font properties
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;

    // Set text appearance
    ctx.fillStyle = style.color;
    ctx.textAlign = this.mapTextAlign(style.textAlign);
    ctx.textBaseline = this.mapVerticalAlign(style.verticalAlign);

    // Note: Text antialiasing is handled automatically by the browser
  }

  /**
   * Applies text transformation (uppercase, lowercase, capitalize)
   * @param text - The original text
   * @param transform - Text transformation type
   * @returns Transformed text
   */
  private applyTextTransform(text: string, transform: TextStyleProperties['textTransform']): string {
    switch (transform) {
      case 'uppercase':
        return text.toUpperCase();
      case 'lowercase':
        return text.toLowerCase();
      case 'capitalize':
        return text.replace(/\b\w/g, char => char.toUpperCase());
      case 'none':
      default:
        return text;
    }
  }



  /**
   * Calculates the Y position for a text line
   * @param lineIndex - The index of the line (0-based)
   * @param fontSize - Font size in pixels
   * @param lineHeight - Line height multiplier
   * @returns Y position in pixels
   */
  private calculateLineY(lineIndex: number, fontSize: number, lineHeight: number): number {
    return (lineIndex + 1) * fontSize * lineHeight;
  }

  /**
   * Calculates the X position for a text line based on alignment
   * @param lineWidth - Width of the text line
   * @param canvasWidth - Total canvas width
   * @param textAlign - Text alignment setting
   * @returns X position in pixels
   */
  private calculateLineX(lineWidth: number, canvasWidth: number, textAlign: TextStyleProperties['textAlign']): number {
    switch (textAlign) {
      case 'center':
        return canvasWidth / 2;
      case 'right':
        return canvasWidth;
      case 'left':
      case 'justify': // For now, treat justify as left-aligned
      default:
        return 0;
    }
  }

  /**
   * Maps TextStyleProperties textAlign to CanvasRenderingContext2D textAlign
   * @param textAlign - Text alignment from style properties
   * @returns Canvas text align value
   */
  private mapTextAlign(textAlign: TextStyleProperties['textAlign']): CanvasTextAlign {
    switch (textAlign) {
      case 'center':
        return 'center';
      case 'right':
        return 'right';
      case 'justify':
        return 'left'; // Canvas doesn't support justify, use left
      case 'left':
      default:
        return 'left';
    }
  }

  /**
   * Maps TextStyleProperties verticalAlign to CanvasRenderingContext2D textBaseline
   * @param verticalAlign - Vertical alignment from style properties
   * @returns Canvas text baseline value
   */
  private mapVerticalAlign(verticalAlign: TextStyleProperties['verticalAlign']): CanvasTextBaseline {
    switch (verticalAlign) {
      case 'top':
        return 'top';
      case 'middle':
        return 'middle';
      case 'bottom':
        return 'bottom';
      case 'baseline':
      default:
        return 'alphabetic';
    }
  }

  /**
   * Applies text shadows to the canvas context
   * @param ctx - The 2D rendering context
   * @param shadows - Array of text shadow effects
   * @param text - The text content
   * @param style - Text styling properties
   */
  private applyTextShadows(ctx: CanvasRenderingContext2D, shadows: TextShadowEffect[], text: string, style: TextStyleProperties): void {
    // Save the current context state
    ctx.save();

    // Apply each shadow effect
    shadows.forEach(shadow => {
      ctx.shadowOffsetX = shadow.offsetX;
      ctx.shadowOffsetY = shadow.offsetY;
      ctx.shadowBlur = shadow.blurRadius;
      ctx.shadowColor = shadow.color;

      // Render the text with shadow
      ctx.fillText(text, 0, style.fontSize);
    });

    // Restore the context state
    ctx.restore();
  }

  /**
   * Applies text decorations (underline, overline, line-through)
   * @param ctx - The 2D rendering context
   * @param decorations - Text decoration configuration
   * @param text - The text content
   * @param style - Text styling properties
   */
  private applyTextDecorations(
    ctx: CanvasRenderingContext2D,
    decorations: NonNullable<TextEffects['decorations']>,
    text: string,
    style: TextStyleProperties
  ): void {
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const fontSize = style.fontSize;
    const thickness = decorations.thickness || 1;
    const color = decorations.color || style.color;

    // Save current context state
    ctx.save();

    // Set decoration styling
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;

    // Draw underline
    if (decorations.underline) {
      const underlineY = fontSize + (fontSize * 0.1); // Slightly below baseline
      ctx.beginPath();
      ctx.moveTo(0, underlineY);
      ctx.lineTo(textWidth, underlineY);
      ctx.stroke();
    }

    // Draw overline
    if (decorations.overline) {
      const overlineY = fontSize * 0.1; // Above the text
      ctx.beginPath();
      ctx.moveTo(0, overlineY);
      ctx.lineTo(textWidth, overlineY);
      ctx.stroke();
    }

    // Draw line-through
    if (decorations.lineThrough) {
      const lineThroughY = fontSize * 0.5; // Middle of the text
      ctx.beginPath();
      ctx.moveTo(0, lineThroughY);
      ctx.lineTo(textWidth, lineThroughY);
      ctx.stroke();
    }

    // Restore context state
    ctx.restore();
  }
}
