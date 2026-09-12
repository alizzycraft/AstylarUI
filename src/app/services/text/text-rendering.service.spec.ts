import { MultiLineTextRendererService } from './multi-line-text-renderer.service';
import { TextCanvasRendererService } from './text-canvas-renderer.service';
import { TextRenderingService } from './text-rendering.service';
import { TextStyleParserService } from './text-style-parser.service';
import { TextStyleProperties } from '../../types/text-rendering';
import { NullEngine, Scene, Texture } from '@babylonjs/core';

describe('TextRenderingService', () => {
  const style: TextStyleProperties = {
    fontFamily: 'Roboto', fontSize: 16, fontWeight: '500', fontStyle: 'normal',
    color: '#1d1b20', textAlign: 'left', verticalAlign: 'baseline', lineHeight: 1.5,
    letterSpacing: 0.144, wordSpacing: 0, whiteSpace: 'nowrap', wordWrap: 'normal',
    textOverflow: 'clip', textDecoration: 'none', textTransform: 'none',
  };

  it('inspects actual parsed texture inputs through cache reuse without aliasing authored or paint state', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const multiLine = new MultiLineTextRendererService();
    const canvasRenderer = new TextCanvasRendererService(multiLine);
    const paint = spyOn(canvasRenderer, 'renderTextToCanvas').and.callThrough();
    const service = new TextRenderingService(canvasRenderer, new TextStyleParserService(), multiLine);
    service.initialize(scene);
    const element = { type: 'button', id: 'action', value: 'Action' };
    const rule = { selector: '#action', fontSize: '16px', lineHeight: '24px', letterSpacing: '0.5px', color: '#123456', textShadow: '1px 2px 3px #112233' };
    const before = structuredClone(rule);
    try {
      const texture = service.renderTextToTexture(element, 'Action', rule, 120);
      const captured = service.inspectTexturePaintInputs(texture)!;
      expect(captured.text).toBe('Action');
      expect(captured.maxWidth).toBe(120);
      expect(captured.style).toEqual(paint.calls.mostRecent().args[2]);
      expect(captured.style.fontSize).toBe(16);
      expect(captured.style.lineHeight).toBe(1.5);
      expect(captured.style.letterSpacing).toBe(.5);
      expect(captured.style.textShadow?.length).toBe(1);
      captured.style.fontSize = 999;
      captured.style.textShadow![0].offsetX = 999;
      expect(service.inspectTexturePaintInputs(texture)?.style.fontSize).toBe(16);
      expect(service.inspectTexturePaintInputs(texture)?.style.textShadow?.[0].offsetX).toBe(1);
      expect(rule).toEqual(before);

      service.beginRenderCycle();
      const shared = service.renderTextToTexture({ ...element, id: 'other-action' }, 'Action', rule, 120);
      expect(shared).toBe(texture);
      expect(paint).toHaveBeenCalledTimes(1);
      expect(service.inspectTexturePaintInputs(shared)?.style).toEqual(paint.calls.first().args[2]);
      const changed = service.renderTextToTexture(element, 'Action', { ...rule, color: '#abcdef' }, 120);
      expect(changed).not.toBe(texture);
      expect(service.inspectTexturePaintInputs(changed)?.style.color).toBe('#abcdef');
      expect(service.inspectTexturePaintInputs(texture)?.style.color).toBe('#123456');
      expect(paint).toHaveBeenCalledTimes(2);

      const foreign = new Texture(null, scene);
      expect(service.inspectTexturePaintInputs(foreign)).toBeUndefined();
      foreign.dispose();
      texture.dispose();
      expect(service.inspectTexturePaintInputs(texture)).toBeUndefined();
      service.dispose();
      expect(service.inspectTexturePaintInputs(changed)).toBeUndefined();
    } finally {
      service.dispose();
      scene.dispose();
      engine.dispose();
    }
  });

  it('keeps uncached paint evidence surface-owned and inspection allocation-free', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const makeService = () => {
      const multiLine = new MultiLineTextRendererService();
      const service = new TextRenderingService(new TextCanvasRendererService(multiLine), new TextStyleParserService(), multiLine);
      service.initialize(scene, { enableCaching: false });
      return service;
    };
    const first = makeService(), second = makeService();
    try {
      const texture = first.renderTextToTexture({ type: 'button' }, 'Uncached', { selector: 'button', fontSize: '20px' });
      const textures = [...scene.textures];
      const observers = texture.onDisposeObservable.observers.length;
      expect(first.inspectTexturePaintInputs(texture)?.style.fontSize).toBe(20);
      expect(second.inspectTexturePaintInputs(texture)).toBeUndefined();
      expect(scene.textures).toEqual(textures);
      expect(texture.onDisposeObservable.observers.length).toBe(observers);
      first.dispose();
      expect(first.inspectTexturePaintInputs(texture)).toBeUndefined();
      texture.dispose();
    } finally {
      first.dispose();
      second.dispose();
      scene.dispose();
      engine.dispose();
    }
  });

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

  it('does not reuse a text raster across device pixel ratios', () => {
    const multiLine = new MultiLineTextRendererService();
    const service = new TextRenderingService(
      new TextCanvasRendererService(multiLine),
      new TextStyleParserService(),
      multiLine,
    );

    expect(service.generateCacheKey('Material workspace', style, 240, 1)).not.toBe(
      service.generateCacheKey('Material workspace', style, 240, 2),
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
