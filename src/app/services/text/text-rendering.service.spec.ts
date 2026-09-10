import { MultiLineTextRendererService } from './multi-line-text-renderer.service';
import { TextCanvasRendererService } from './text-canvas-renderer.service';
import { TextRenderingService } from './text-rendering.service';
import { TextStyleParserService } from './text-style-parser.service';
import { TextStyleProperties } from '../../types/text-rendering';

describe('TextRenderingService', () => {
  const style: TextStyleProperties = {
    fontFamily: 'Roboto', fontSize: 16, fontWeight: '500', fontStyle: 'normal',
    color: '#1d1b20', textAlign: 'left', verticalAlign: 'baseline', lineHeight: 1.5,
    letterSpacing: 0.144, wordSpacing: 0, whiteSpace: 'nowrap', wordWrap: 'normal',
    textOverflow: 'clip', textDecoration: 'none', textTransform: 'none',
  };

  it('does not reuse a baseline texture for middle-aligned text', () => {
    const multiLine = new MultiLineTextRendererService();
    const service = new TextRenderingService(
      new TextCanvasRendererService(multiLine),
      new TextStyleParserService(),
      multiLine,
    );

    expect(service.generateCacheKey('Advanced settings', style)).not.toBe(
      service.generateCacheKey('Advanced settings', { ...style, verticalAlign: 'middle' }),
    );
    expect(service.generateCacheKey('Advanced settings', style, 120)).not.toBe(
      service.generateCacheKey('Advanced settings', style, 240),
    );
  });

  it('preserves fractional CSS dimensions independently of the rounded backing store', () => {
    const multiLine = new MultiLineTextRendererService();
    const service = new TextRenderingService(
      new TextCanvasRendererService(multiLine),
      new TextStyleParserService(),
      multiLine,
    );
    const texture = {
      getSize: () => ({ width: 23, height: 17 }),
      metadata: { astylarLogicalTextSize: { width: 22.75, height: 16.1 } },
    };

    expect(service.getLogicalTextureSize(texture as never)).toEqual({
      width: 22.75,
      height: 16.1,
    });
  });

  it('retains an unused cached texture across render cycles for later reuse', () => {
    const multiLine = new MultiLineTextRendererService();
    const service = new TextRenderingService(
      new TextCanvasRendererService(multiLine),
      new TextStyleParserService(),
      multiLine,
    );
    const texture = {
      isDisposed: false,
      dispose: jasmine.createSpy('dispose'),
    };

    service.setTexture('shared-label', texture as never);
    service.beginRenderCycle();

    expect(service.getRetainedTextures()).toContain(texture as never);
    expect(service.getTexture('shared-label')).toBe(texture as never);
    expect(texture.dispose).not.toHaveBeenCalled();
  });

  it('drops disposed textures instead of returning stale cache entries', () => {
    const multiLine = new MultiLineTextRendererService();
    const service = new TextRenderingService(
      new TextCanvasRendererService(multiLine),
      new TextStyleParserService(),
      multiLine,
    );
    const texture = {
      isDisposed: true,
      dispose: jasmine.createSpy('dispose'),
    };

    service.setTexture('stale-label', texture as never);

    expect(service.getTexture('stale-label')).toBeNull();
    expect(service.getRetainedTextures()).not.toContain(texture as never);
    expect(service.getCacheStats().size).toBe(0);
  });
});
