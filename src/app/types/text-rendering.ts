import { DOMElement } from './dom-element';
import * as BABYLON from '@babylonjs/core';

/**
 * Comprehensive text styling properties interface
 * Supports CSS-like text properties for 3D text rendering
 */
export interface TextStyleProperties {
  // Font properties
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | number;
  fontStyle: 'normal' | 'italic' | 'oblique';
  
  // Text appearance
  color: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  verticalAlign: 'top' | 'middle' | 'bottom' | 'baseline';
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  
  // Text behavior
  whiteSpace: 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line';
  wordWrap: 'normal' | 'break-word' | 'anywhere';
  textOverflow: 'clip' | 'ellipsis';
  
  // Text effects
  textShadow?: TextShadowEffect[];
  textDecoration: 'none' | 'underline' | 'overline' | 'line-through';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  
  // Text stroke (outline)
  textStroke?: {
    width: number;
    color: string;
  };
}

/**
 * Text shadow effect definition
 * Supports multiple shadows with offset, blur, and color
 */
export interface TextShadowEffect {
  offsetX: number;
  offsetY: number;
  blurRadius: number;
  color: string;
}

/**
 * Individual text line information for multi-line text layout
 */
export interface TextLine {
  text: string;
  width: number;
  y: number;
  startIndex?: number;
  endIndex?: number;
}

/**
 * Comprehensive text dimensions and layout information
 * Used for accurate text positioning and canvas sizing
 */
export interface TextDimensions {
  width: number;
  height: number;
  lineHeight: number;
  baseline: number;
  lines: TextLine[];
  actualBounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

export interface TextLineMetrics {
  index: number;
  text: string;
  startIndex: number;
  endIndex: number;
  width: number;
  widthWithSpacing: number;
  height: number;
  baseline: number;
  ascent: number;
  descent: number;
  top: number;
  bottom: number;
  x: number;
  y: number;
  actualLeft: number;
  actualRight: number;
}

export interface TextCharacterMetrics {
  index: number;
  char: string;
  lineIndex: number;
  column: number;
  x: number;
  width: number;
  advance: number;
  isLineBreak?: boolean;
}

export interface TextLayoutMetrics {
  text: string;
  transformedText: string;
  totalWidth: number;
  totalHeight: number;
  lineHeight: number;
  ascent: number;
  descent: number;
  lines: TextLineMetrics[];
  characters: TextCharacterMetrics[];
}

export interface TextLayoutWorldMetrics {
  totalWidth: number;
  totalHeight: number;
  lineHeight: number;
  ascent: number;
  descent: number;
  lines: Array<Omit<TextLineMetrics, 'width' | 'widthWithSpacing' | 'height' | 'baseline' | 'ascent' | 'descent' | 'top' | 'bottom' | 'x' | 'y'> & {
    width: number;
    widthWithSpacing: number;
    height: number;
    baseline: number;
    ascent: number;
    descent: number;
    top: number;
    bottom: number;
    x: number;
    y: number;
    actualLeft: number;
    actualRight: number;
  }>;
  characters: Array<Omit<TextCharacterMetrics, 'x' | 'width' | 'advance'> & {
    x: number;
    width: number;
    advance: number;
  }>;
}

export interface StoredTextLayoutMetrics {
  scale: number;
  css: TextLayoutMetrics;
  world: TextLayoutWorldMetrics;
}

/**
 * Extended DOM element interface with text-specific properties
 * Integrates text rendering capabilities with existing DOM system
 */
export interface TextElement extends DOMElement {
  textContent: string;
  textStyle?: TextStyleProperties;
  textTexture?: BABYLON.Texture;
  textMesh?: BABYLON.Mesh;
  textDimensions?: TextDimensions;
}

/**
 * Text texture cache entry for performance optimization
 * Tracks usage and reference counting for proper memory management
 */
export interface TextCache {
  key: string; // Hash of text content + style properties
  texture: BABYLON.Texture;
  lastUsed: number;
  referenceCount: number;
}

/**
 * Text cache manager interface for texture caching and cleanup
 * Provides efficient texture reuse and memory management
 */
export interface TextCacheManager {
  getTexture(key: string): BABYLON.Texture | null;
  setTexture(key: string, texture: BABYLON.Texture): void;
  removeTexture(key: string): void;
  cleanup(): void; // Remove unused textures
  generateCacheKey(text: string, style: TextStyleProperties): string;
}

/**
 * Text bounds information for precise text measurement
 * Used for accurate positioning and layout calculations
 */
export interface TextBounds {
  width: number;
  height: number;
  actualBoundingBoxLeft: number;
  actualBoundingBoxRight: number;
  actualBoundingBoxAscent: number;
  actualBoundingBoxDescent: number;
  fontBoundingBoxAscent: number;
  fontBoundingBoxDescent: number;
}

/**
 * Text effects configuration for advanced text rendering
 * Combines shadows, decorations, and transformations
 */
export interface TextEffects {
  shadows?: TextShadowEffect[];
  decorations?: {
    underline?: boolean;
    overline?: boolean;
    lineThrough?: boolean;
    color?: string;
    thickness?: number;
  };
  stroke?: {
    width: number;
    color: string;
  };
}

/**
 * Text rendering configuration options
 * Controls quality, performance, and feature settings
 */
export interface TextRenderingOptions {
  enableCaching?: boolean;
  maxCacheSize?: number;
  textureQuality?: 'low' | 'medium' | 'high';
  enableAntialiasing?: boolean;
  enableSubpixelRendering?: boolean;
  fallbackFont?: string;
}
