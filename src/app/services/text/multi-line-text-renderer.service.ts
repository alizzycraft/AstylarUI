import { Injectable } from '@angular/core';
import { 
  TextStyleProperties, 
  TextDimensions, 
  TextLine 
} from '../../types/text-rendering';

/**
 * MultiLineTextRenderer Service
 * 
 * Handles multi-line text layout calculations, text wrapping, and positioning.
 * This service provides comprehensive text layout capabilities including automatic
 * text wrapping, white-space handling, text overflow with ellipsis, and precise
 * line positioning calculations for multi-line text rendering.
 */
@Injectable({
  providedIn: 'root'
})
export class MultiLineTextRendererService {

  /**
   * Wraps text to fit within the specified maximum width bounds
   * Handles different word-wrap behaviors and white-space settings
   * @param text - The text content to wrap
   * @param maxWidth - Maximum width in pixels for text wrapping
   * @param style - Text styling properties that affect wrapping behavior
   * @returns Array of TextLine objects with wrapped text and positioning
   */
  wrapText(text: string, maxWidth: number, style: TextStyleProperties): TextLine[] {
    if (!text || maxWidth <= 0) {
      return [];
    }

    // Handle white-space behavior first
    const processedText = this.handleWhiteSpace(text, style.whiteSpace);
    
    // Create temporary canvas for text measurement
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context for text wrapping');
    }

    // Apply text styling for accurate measurement
    this.applyTextStylingToContext(ctx, style);

    // Get device pixel ratio to correctly convert measurements from device pixels to CSS pixels
    const devicePixelRatio = window.devicePixelRatio || 1;

    // Handle different white-space modes
    switch (style.whiteSpace) {
      case 'nowrap':
        return this.wrapNoWrap(processedText, ctx, style);
      case 'pre':
        return this.wrapPreserved(processedText, ctx, style, false, undefined);
      case 'pre-wrap':
        return this.wrapPreserved(processedText, ctx, style, true, maxWidth);
      case 'pre-line':
        return this.wrapPreLine(processedText, ctx, style, maxWidth);
      case 'normal':
      default:
        return this.wrapNormal(processedText, ctx, style, maxWidth);
    }
  }

  /**
   * Calculates precise line positions for multi-line text layout
   * Takes into account line height, vertical alignment, and text bounds
   * @param lines - Array of text lines to position
   * @param style - Text styling properties affecting positioning
   * @param containerHeight - Optional container height for vertical alignment
   * @returns Updated lines array with calculated Y positions
   */
  calculateLinePositions(
    lines: TextLine[], 
    style: TextStyleProperties, 
    containerHeight?: number
  ): TextLine[] {
    if (!lines.length) {
      return lines;
    }

    const lineHeight = style.fontSize * style.lineHeight;
    const totalTextHeight = lines.length * lineHeight;
    
    // Calculate starting Y position based on vertical alignment
    let startY = 0;
    if (containerHeight && containerHeight > totalTextHeight) {
      switch (style.verticalAlign) {
        case 'middle':
          startY = (containerHeight - totalTextHeight) / 2;
          break;
        case 'bottom':
          startY = containerHeight - totalTextHeight;
          break;
        case 'top':
        case 'baseline':
        default:
          startY = 0;
          break;
      }
    }

    // Update each line's Y position
    return lines.map((line, index) => ({
      ...line,
      y: startY + (index * lineHeight) + style.fontSize // Add fontSize for baseline positioning
    }));
  }

  /**
   * Handles different white-space property behaviors for text processing
   * Processes text according to CSS white-space rules before wrapping
   * @param text - The original text content
   * @param whiteSpace - The white-space CSS property value
   * @returns Processed text ready for wrapping calculations
   */
  handleWhiteSpace(text: string, whiteSpace: TextStyleProperties['whiteSpace']): string {
    switch (whiteSpace) {
      case 'normal':
        // Collapse whitespace sequences and normalize line breaks
        return text.replace(/\s+/g, ' ').trim();
        
      case 'nowrap':
        // Collapse whitespace and remove line breaks
        return text.replace(/\s+/g, ' ').replace(/\n/g, ' ').trim();
        
      case 'pre':
        // Preserve all whitespace and line breaks exactly as-is
        return text;
        
      case 'pre-wrap':
        // Preserve whitespace sequences but allow wrapping
        return text;
        
      case 'pre-line':
        // Collapse whitespace sequences but preserve line breaks
        return text.replace(/[ \t]+/g, ' ').replace(/[ \t]*\n[ \t]*/g, '\n').trim();
        
      default:
        return text.replace(/\s+/g, ' ').trim();
    }
  }

  /**
   * Implements text overflow handling with ellipsis support
   * Truncates text that exceeds container bounds and adds ellipsis
   * @param lines - Array of text lines to check for overflow
   * @param maxWidth - Maximum width allowed for text
   * @param maxHeight - Maximum height allowed for text
   * @param style - Text styling properties
   * @returns Modified lines array with overflow handling applied
   */
  handleTextOverflow(
    lines: TextLine[], 
    maxWidth: number, 
    maxHeight: number, 
    style: TextStyleProperties
  ): TextLine[] {
    if (!lines.length || style.textOverflow === 'clip') {
      // For 'clip', just return lines that fit within bounds
      const lineHeight = style.fontSize * style.lineHeight;
      const maxLines = Math.floor(maxHeight / lineHeight);
      return lines.slice(0, maxLines);
    }

    if (style.textOverflow === 'ellipsis') {
      return this.applyEllipsis(lines, maxWidth, maxHeight, style);
    }

    return lines;
  }

  /**
   * Applies text styling to canvas context for accurate measurement
   * @param ctx - The 2D rendering context
   * @param style - Text styling properties
   */
  private applyTextStylingToContext(ctx: CanvasRenderingContext2D, style: TextStyleProperties): void {
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
    ctx.textAlign = 'left'; // Always use left for measurement
    ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = `${style.letterSpacing ?? 0}px`;
    ctx.wordSpacing = `${style.wordSpacing ?? 0}px`;
  }

  /**
   * Handles normal text wrapping (white-space: normal)
   * @param text - Processed text content
   * @param ctx - Canvas rendering context for measurement
   * @param style - Text styling properties
   * @param maxWidth - Maximum width for wrapping
   * @returns Array of wrapped text lines
   */
  private wrapNormal(
    text: string, 
    ctx: CanvasRenderingContext2D, 
    style: TextStyleProperties, 
    maxWidth: number
  ): TextLine[] {
    const lines: TextLine[] = [];
    const words = text.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      const width = metrics.width;

      if (width > maxWidth && currentLine) {
        // Current line exceeds max width, push current line and start new one
        const lineMetrics = ctx.measureText(currentLine);
        const lineWidth = lineMetrics.width;
        lines.push({
          text: currentLine,
          width: lineWidth,
          y: 0 // Will be calculated later
        });
        currentLine = word;

        // Handle word breaking if single word is too long
        if (style.wordWrap === 'break-word' || style.wordWrap === 'anywhere') {
          const brokenWords = this.breakLongWord(word, maxWidth, ctx);
          if (brokenWords.length > 1) {
            // Add all but the last broken word as complete lines
            for (let i = 0; i < brokenWords.length - 1; i++) {
              const brokenMetrics = ctx.measureText(brokenWords[i]);
              const brokenWidth = brokenMetrics.width;
              lines.push({
                text: brokenWords[i],
                width: brokenWidth,
                y: 0
              });
            }
            // Set the last broken word as the current line
            currentLine = brokenWords[brokenWords.length - 1];
          }
        }
      } else {
        currentLine = testLine;
      }
    }

    // Add the last line if it exists
    if (currentLine) {
      const lineMetrics = ctx.measureText(currentLine);
      const lineWidth = lineMetrics.width;
      lines.push({
        text: currentLine,
        width: lineWidth,
        y: 0
      });
    }

    return lines;
  }

  /**
   * Handles no-wrap text (white-space: nowrap)
   * @param text - Processed text content
   * @param ctx - Canvas rendering context for measurement
   * @param style - Text styling properties
   * @returns Single line array (no wrapping)
   */
  private wrapNoWrap(
    text: string, 
    ctx: CanvasRenderingContext2D, 
    style: TextStyleProperties
  ): TextLine[] {
    const metrics = ctx.measureText(text);
    const width = metrics.width;
    return [{
      text: text,
      width: width,
      y: 0
    }];
  }

  /**
   * Handles preserved whitespace text (white-space: pre, pre-wrap)
   * @param text - Processed text content
   * @param ctx - Canvas rendering context for measurement
   * @param style - Text styling properties
   * @param allowWrap - Whether to allow wrapping (pre-wrap vs pre)
   * @param maxWidth - Maximum width for wrapping (if allowWrap is true)
   * @returns Array of text lines preserving whitespace
   */
  private wrapPreserved(
    text: string, 
    ctx: CanvasRenderingContext2D, 
    style: TextStyleProperties, 
    allowWrap: boolean, 
    maxWidth?: number
  ): TextLine[] {
    const lines: TextLine[] = [];
    const textLines = text.split('\n');

    for (const textLine of textLines) {
      if (!allowWrap || !maxWidth) {
        // No wrapping - preserve line as-is
        const metrics = ctx.measureText(textLine);
        const width = metrics.width;
        lines.push({
          text: textLine,
          width: width,
          y: 0
        });
      } else {
        // Allow wrapping within preserved lines
        const wrappedLines = this.wrapPreservedLine(textLine, maxWidth, ctx, style);
        lines.push(...wrappedLines);
      }
    }

    return lines;
  }

  /**
   * Handles pre-line text wrapping (white-space: pre-line)
   * @param text - Processed text content
   * @param ctx - Canvas rendering context for measurement
   * @param style - Text styling properties
   * @param maxWidth - Maximum width for wrapping
   * @returns Array of wrapped text lines
   */
  private wrapPreLine(
    text: string, 
    ctx: CanvasRenderingContext2D, 
    style: TextStyleProperties, 
    maxWidth: number
  ): TextLine[] {
    const lines: TextLine[] = [];
    const textLines = text.split('\n');

    for (const textLine of textLines) {
      // Wrap each line normally (whitespace is already collapsed)
      const wrappedLines = this.wrapNormal(textLine, ctx, style, maxWidth);
      lines.push(...wrappedLines);
    }

    return lines;
  }

  /**
   * Wraps a single preserved line with whitespace intact
   * @param line - The line to wrap
   * @param maxWidth - Maximum width for wrapping
   * @param ctx - Canvas rendering context
   * @param style - Text styling properties
   * @returns Array of wrapped line segments
   */
  private wrapPreservedLine(
    line: string, 
    maxWidth: number, 
    ctx: CanvasRenderingContext2D, 
    style: TextStyleProperties
  ): TextLine[] {
    const lines: TextLine[] = [];
    let currentLine = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      const width = metrics.width;

      if (width > maxWidth && currentLine) {
        // Line exceeds width, push current line and start new one
        const lineMetrics = ctx.measureText(currentLine);
        const lineWidth = lineMetrics.width;
        lines.push({
          text: currentLine,
          width: lineWidth,
          y: 0
        });
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }

    // Add the last line
    if (currentLine) {
      const lineMetrics = ctx.measureText(currentLine);
      const lineWidth = lineMetrics.width;
      lines.push({
        text: currentLine,
        width: lineWidth,
        y: 0
      });
    }

    return lines;
  }

  /**
   * Breaks a long word that exceeds the maximum width
   * @param word - The word to break
   * @param maxWidth - Maximum width allowed
   * @param ctx - Canvas rendering context for measurement
   * @returns Array of word segments that fit within maxWidth
   */
  private breakLongWord(word: string, maxWidth: number, ctx: CanvasRenderingContext2D): string[] {
    const segments: string[] = [];
    let currentSegment = '';

    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const testSegment = currentSegment + char;
      const metrics = ctx.measureText(testSegment);
      const width = metrics.width;

      if (width > maxWidth && currentSegment) {
        // Segment exceeds width, push current segment and start new one
        segments.push(currentSegment);
        currentSegment = char;
      } else {
        currentSegment = testSegment;
      }
    }

    // Add the last segment
    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments.length > 0 ? segments : [word];
  }

  /**
   * Applies ellipsis to text that overflows the container
   * @param lines - Array of text lines
   * @param maxWidth - Maximum width allowed
   * @param maxHeight - Maximum height allowed
   * @param style - Text styling properties
   * @returns Modified lines with ellipsis applied
   */
  private applyEllipsis(
    lines: TextLine[], 
    maxWidth: number, 
    maxHeight: number, 
    style: TextStyleProperties
  ): TextLine[] {
    const lineHeight = style.fontSize * style.lineHeight;
    const maxLines = Math.floor(maxHeight / lineHeight);
    
    if (lines.length <= maxLines) {
      // No vertical overflow, check horizontal overflow
      return this.applyHorizontalEllipsis(lines, maxWidth, style);
    }

    // Vertical overflow - truncate lines and add ellipsis to last visible line
    const visibleLines = lines.slice(0, maxLines);
    
    if (visibleLines.length > 0) {
      // Apply ellipsis to the last visible line
      const lastLineIndex = visibleLines.length - 1;
      visibleLines[lastLineIndex] = this.addEllipsisToLine(
        visibleLines[lastLineIndex], 
        maxWidth, 
        style
      );
    }

    return visibleLines;
  }

  /**
   * Applies horizontal ellipsis to lines that exceed width
   * @param lines - Array of text lines
   * @param maxWidth - Maximum width allowed
   * @param style - Text styling properties
   * @returns Modified lines with horizontal ellipsis
   */
  private applyHorizontalEllipsis(
    lines: TextLine[], 
    maxWidth: number, 
    style: TextStyleProperties
  ): TextLine[] {
    return lines.map(line => {
      if (line.width > maxWidth) {
        return this.addEllipsisToLine(line, maxWidth, style);
      }
      return line;
    });
  }

  /**
   * Adds ellipsis to a single line that exceeds the maximum width
   * @param line - The text line to modify
   * @param maxWidth - Maximum width allowed
   * @param style - Text styling properties
   * @returns Modified line with ellipsis
   */
  private addEllipsisToLine(
    line: TextLine, 
    maxWidth: number, 
    style: TextStyleProperties
  ): TextLine {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return line; // Return original line if canvas context fails
    }

    this.applyTextStylingToContext(ctx, style);
    
    const ellipsis = '\u2026';
    const ellipsisWidth = ctx.measureText(ellipsis).width;
    const availableWidth = maxWidth - ellipsisWidth;

    if (availableWidth <= 0) {
      // Not enough space even for ellipsis
      return {
        text: ellipsis,
        width: ellipsisWidth,
        y: line.y
      };
    }

    // Binary search to find the longest text that fits
    let left = 0;
    let right = line.text.length;
    let bestFit = '';

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const testText = line.text.substring(0, mid);
      const testWidth = ctx.measureText(testText).width;

      if (testWidth <= availableWidth) {
        bestFit = testText;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    const finalText = bestFit + ellipsis;
    const finalWidth = ctx.measureText(finalText).width;

    return {
      text: finalText,
      width: finalWidth,
      y: line.y
    };
  }
}
