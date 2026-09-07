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
});
