import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import {
  TextStyleProperties,
  TextDimensions,
  TextElement,
  TextCache,
  TextCacheManager,
  TextRenderingOptions,
  TextLayoutMetrics,
  StoredTextLayoutMetrics
} from '../../types/text-rendering';
import { DOMElement } from '../../types/dom-element';
import { StyleRule } from '../../types/style-rule';
import { TextCanvasRendererService } from './text-canvas-renderer.service';
import { TextStyleParserService } from './text-style-parser.service';
import { MultiLineTextRendererService } from './multi-line-text-renderer.service';

/**
 * TextRenderingService - Main orchestration service for text rendering
 *
 * This service coordinates all text rendering operations by combining canvas rendering,
 * texture creation, and BabylonJS integration. It provides the main interface for
 * rendering text content as 3D textures and managing text-related resources.
 */
@Injectable({
  providedIn: 'root'
})
export class TextRenderingService implements TextCacheManager {
  private scene?: BABYLON.Scene;
  private textureCache = new Map<string, TextCache>();
  private textureCacheKeys = new WeakMap<BABYLON.Texture, string>();
  private options: TextRenderingOptions = {
    enableCaching: true,
    maxCacheSize: 100,
    textureQuality: 'high',
    enableAntialiasing: true,
    enableSubpixelRendering: false,
    fallbackFont: 'Arial, sans-serif'
  };

  constructor(
    private textCanvasRenderer: TextCanvasRendererService,
    private textStyleParser: TextStyleParserService,
    private multiLineTextRenderer: MultiLineTextRendererService
  ) { }

  /**
   * Initialize the text rendering service with BabylonJS scene
   * @param scene - The BabylonJS scene for texture creation
   * @param options - Optional configuration for text rendering
   */
  initialize(scene: BABYLON.Scene, options?: Partial<TextRenderingOptions>): void {
    this.scene = scene;
    if (options) {
      this.options = { ...this.options, ...options };
    }


  }

  getLogicalTextureSize(texture: BABYLON.Texture): { width: number; height: number } {
    const authoredSize = (texture.metadata as {
      astylarLogicalTextSize?: { width: number; height: number };
    } | undefined)?.astylarLogicalTextSize;
    if (authoredSize) return { ...authoredSize };
    const backingSize = texture.getSize();
    const devicePixelRatio = window.devicePixelRatio || 1;
    return {
      width: backingSize.width / devicePixelRatio,
      height: backingSize.height / devicePixelRatio,
    };
  }

  createStoredLayoutMetrics(text: string, style: TextStyleProperties, maxWidth?: number): StoredTextLayoutMetrics {
    return { css: this.textCanvasRenderer.calculateLayoutMetrics(text, style, maxWidth) };
  }

  resolveOverflowText(
    text: string,
    style: TextStyleProperties,
    maxWidth: number,
    maxHeight: number
  ): string {
    return this.textCanvasRenderer
      .handleTextOverflow(text, style, maxWidth, maxHeight)
      .map(line => line.text)
      .join('\n');
  }

  /**
   * Renders text content to a BabylonJS texture using off-screen canvas rendering
   * @param element - The DOM element containing text properties
   * @param textContent - The text content to render
   * @param styleRule - Optional style rule for text styling
   * @param maxWidth - Optional maximum width for text wrapping
   * @returns BabylonJS texture containing the rendered text
   */
  renderTextToTexture(element: DOMElement, textContent: string, styleRule?: StyleRule, maxWidth?: number): BABYLON.Texture {
    if (!this.scene) {
      throw new Error('TextRenderingService not initialized with scene');
    }

    if (!textContent || textContent.trim() === '') {
      throw new Error('Text content is required for rendering');
    }

    // Parse text style properties from element and style rule
    const textStyle = this.parseElementTextStyle(element, styleRule);

    // Generate cache key for texture reuse
    const cacheKey = this.generateCacheKey(textContent, textStyle, maxWidth);

    // Check cache first if caching is enabled
    if (this.options.enableCaching) {
      const cachedTexture = this.getTexture(cacheKey);
      if (cachedTexture) {

        return cachedTexture;
      }
    }

    try {
      // Create styled canvas for text rendering
      const canvas = this.textCanvasRenderer.createStyledCanvas(textContent, textStyle, maxWidth);

      // Render text to canvas
      this.textCanvasRenderer.renderTextToCanvas(canvas, textContent, textStyle, maxWidth);

      // Apply text effects if specified
      if (textStyle.textShadow && textStyle.textShadow.length > 0) {
        const effects = { shadows: textStyle.textShadow };
        this.textCanvasRenderer.applyTextEffects(canvas, effects, textContent, textStyle);
      }

      // Create a new texture with the same dimensions as the canvas
      const texture = new BABYLON.DynamicTexture(
        `text-texture-${Date.now()}`,
        { width: canvas.width, height: canvas.height },
        this.scene,
        false, // No mipmaps for text
        BABYLON.Texture.NEAREST_SAMPLINGMODE,
        BABYLON.Engine.TEXTUREFORMAT_RGBA,
        true // Keep canvas Y aligned with the camera-facing plane
      );
      texture.metadata = {
        ...(texture.metadata ?? {}),
        astylarLogicalTextSize: {
          width: parseFloat(canvas.style.width) || canvas.width / (window.devicePixelRatio || 1),
          height: parseFloat(canvas.style.height) || canvas.height / (window.devicePixelRatio || 1),
        },
      };

      // Get the texture context
      const textureContext = texture.getContext();

      // Clear the texture with transparent background
      textureContext.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the canvas content directly without any flipping to prevent horizontal mirroring
      textureContext.drawImage(canvas, 0, 0);

      // Update the texture
      texture.hasAlpha = true;
      texture.level = 1;
      texture.update(true);

      // Ensure proper texture wrapping
      texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
      texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

      // Cache the texture if caching is enabled
      if (this.options.enableCaching) {
        this.setTexture(cacheKey, texture);
      }



      return texture;
    } catch (error) {
      console.error('❌ Error creating text texture:', error);
      throw new Error(`Failed to render text to texture: ${error}`);
    }
  }

  /**
   * Updates an existing text texture with new content
   * @param textElement - The text element to update (must be a TextElement)
   * @param newContent - The new text content
   * @param styleRule - Optional style rule for text styling
   * @param maxWidth - Optional maximum width for text wrapping
   */
  updateTextTexture(textElement: TextElement, newContent: string, styleRule?: StyleRule, maxWidth?: number): void {
    if (!textElement.textTexture) {
      throw new Error('Element does not have an existing text texture to update');
    }

    try {
      // Dispose of the old texture
      this.disposeTextTexture(textElement);

      // Create new texture with updated content
      const newTexture = this.renderTextToTexture(textElement, newContent, styleRule, maxWidth);

      // Update element reference
      textElement.textTexture = newTexture;


    } catch (error) {
      console.error('❌ Error updating text texture:', error);
      throw new Error(`Failed to update text texture: ${error}`);
    }
  }

  /**
   * Calculates text dimensions using canvas measurements
   * @param text - The text content to measure
   * @param style - Text styling properties
   * @param maxWidth - Optional maximum width for text wrapping
   * @returns Comprehensive text dimensions and layout information
   */
  calculateTextDimensions(text: string, style: TextStyleProperties, maxWidth?: number): TextDimensions {
    try {
      // Use canvas renderer for accurate text measurement
      const bounds = this.textCanvasRenderer.measureTextBounds(text, style, maxWidth);

      // Handle multi-line text layout if needed
      let lines = [];
      if (maxWidth) {
        lines = this.multiLineTextRenderer.wrapText(text, maxWidth, style);
        lines = this.multiLineTextRenderer.calculateLinePositions(lines, style);
      } else {
        // Single line text
        lines = [{
          text: text,
          width: bounds.width,
          y: style.fontSize
        }];
      }

      const dimensions: TextDimensions = {
        width: bounds.width,
        height: bounds.height,
        lineHeight: style.fontSize * style.lineHeight,
        baseline: bounds.actualBoundingBoxAscent,
        lines: lines,
        actualBounds: {
          left: bounds.actualBoundingBoxLeft,
          top: -bounds.actualBoundingBoxAscent,
          right: bounds.actualBoundingBoxRight,
          bottom: bounds.actualBoundingBoxDescent
        }
      };



      return dimensions;
    } catch (error) {
      console.error('❌ Error calculating text dimensions:', error);
      throw new Error(`Failed to calculate text dimensions: ${error}`);
    }
  }

  /**
   * Properly disposes of text texture resources
   * @param textElement - The text element containing the texture to dispose
   */
  disposeTextTexture(textElement: TextElement): void {
    if (!textElement.textTexture) {
      return;
    }

    try {
      // Find and remove from cache if present
      const textStyle = this.parseElementTextStyle(textElement);
      const cacheKey = this.textureCacheKeys.get(textElement.textTexture) ??
        this.generateCacheKey(textElement.textContent || '', textStyle);

      if (this.textureCache.has(cacheKey)) {
        const cacheEntry = this.textureCache.get(cacheKey)!;
        cacheEntry.referenceCount--;

        // Only dispose if no other references
        if (cacheEntry.referenceCount <= 0) {
          textElement.textTexture.dispose();
          this.textureCache.delete(cacheKey);

        } else {

        }
      } else {
        // Not in cache, dispose directly
        textElement.textTexture.dispose();

      }

      // Clear element reference
      textElement.textTexture = undefined;
    } catch (error) {
      console.error('❌ Error disposing text texture:', error);
    }
  }

  // TextCacheManager implementation

  /**
   * Retrieves a cached texture by key
   * @param key - The cache key
   * @returns Cached texture or null if not found
   */
  getTexture(key: string): BABYLON.Texture | null {
    const cacheEntry = this.textureCache.get(key);
    if (cacheEntry) {
      cacheEntry.lastUsed = Date.now();
      cacheEntry.referenceCount++;
      return cacheEntry.texture;
    }
    return null;
  }

  /**
   * Stores a texture in the cache
   * @param key - The cache key
   * @param texture - The texture to cache
   */
  setTexture(key: string, texture: BABYLON.Texture): void {
    // Check cache size limit
    if (this.textureCache.size >= this.options.maxCacheSize!) {
      this.evictOldestTexture();
    }

    const cacheEntry: TextCache = {
      key,
      texture,
      lastUsed: Date.now(),
      referenceCount: 1
    };

    this.textureCache.set(key, cacheEntry);
    this.textureCacheKeys.set(texture, key);

  }

  /**
   * Removes a texture from the cache
   * @param key - The cache key to remove
   */
  removeTexture(key: string): void {
    const cacheEntry = this.textureCache.get(key);
    if (cacheEntry) {
      cacheEntry.texture.dispose();
      this.textureCache.delete(key);

    }
  }

  /**
   * Cleans up unused textures from the cache
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    let removedCount = 0;

    for (const [key, cacheEntry] of this.textureCache.entries()) {
      // Remove textures that are old and have no references
      if (cacheEntry.referenceCount <= 0 && (now - cacheEntry.lastUsed) > maxAge) {
        cacheEntry.texture.dispose();
        this.textureCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {

    }
  }

  /**
   * Generates a cache key based on text content and style properties
   * @param text - The text content
   * @param style - Text styling properties
   * @returns Unique cache key string
   */
  generateCacheKey(text: string, style: TextStyleProperties, maxWidth?: number): string {
    // Create a hash-like key from text and critical style properties
    const styleKey = [
      style.fontFamily,
      style.fontSize,
      style.fontWeight,
      style.fontStyle,
      style.color,
      style.textAlign,
      style.verticalAlign,
      style.lineHeight,
      style.letterSpacing,
      style.wordSpacing,
      style.whiteSpace,
      style.wordWrap,
      style.textOverflow,
      style.textTransform,
      style.textDecoration,
      maxWidth ?? 'intrinsic',
      JSON.stringify(style.textShadow || []),
      JSON.stringify(style.textStroke || {})
    ].join('|');

    // Simple hash function for the combined string
    let hash = 0;
    const combined = text + '::' + styleKey;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `text_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Parses text style properties from a DOM element and style rule
   * @param element - The DOM element to parse styles from
   * @param styleRule - Optional style rule to parse text properties from
   * @returns Parsed text style properties
   */
  private parseElementTextStyle(element: DOMElement, styleRule?: StyleRule): TextStyleProperties {
    // If element is a TextElement and already has parsed text style, use it
    const textElement = element as TextElement;
    if (textElement.textStyle) {
      return textElement.textStyle;
    }

    // Parse from provided style rule
    if (styleRule) {
      return this.textStyleParser.parseTextProperties(styleRule);
    }

    // Parse from element's style property if it contains text properties
    if (element.style) {
      // Try to parse the style object as a StyleRule
      try {
        return this.textStyleParser.parseTextProperties(element.style as StyleRule);
      } catch (error) {
        console.warn('Failed to parse element style as text properties:', error);
      }
    }

    // Fallback to default text style
    return this.textStyleParser.parseTextProperties({
      selector: '__astylar-default-text',
      fontFamily: this.options.fallbackFont || 'Arial, sans-serif',
    });
  }

  /**
   * Evicts the oldest texture from the cache to make room for new ones
   */
  private evictOldestTexture(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, cacheEntry] of this.textureCache.entries()) {
      if (cacheEntry.lastUsed < oldestTime && cacheEntry.referenceCount <= 0) {
        oldestTime = cacheEntry.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.removeTexture(oldestKey);

    }
  }

  /**
   * Gets current cache statistics for debugging
   * @returns Cache statistics object
   */
  getCacheStats(): { size: number; maxSize: number; entries: Array<{ key: string; lastUsed: number; referenceCount: number }> } {
    const entries = Array.from(this.textureCache.entries()).map(([key, cache]) => ({
      key,
      lastUsed: cache.lastUsed,
      referenceCount: cache.referenceCount
    }));

    return {
      size: this.textureCache.size,
      maxSize: this.options.maxCacheSize!,
      entries
    };
  }

  /** Clears cached textures before a full rendered-DOM replacement. */
  clearCache(): void {
    for (const cacheEntry of this.textureCache.values()) {
      cacheEntry.texture.dispose();
    }
    this.textureCache.clear();
    this.textureCacheKeys = new WeakMap<BABYLON.Texture, string>();
  }

  /**
   * Cleanup method for service disposal
   */
  dispose(): void {
    this.clearCache();
    this.scene = undefined;

  }
}
