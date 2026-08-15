import { MultiLineTextRendererService } from './multi-line-text-renderer.service';
import { TextCanvasRendererService } from './text-canvas-renderer.service';
import { TextStyleProperties } from '../../types/text-rendering';

describe('TextCanvasRendererService', () => {
  it('uses resolved line height for single-line bounds', () => {
    const service = new TextCanvasRendererService(
      new MultiLineTextRendererService(),
    );
    const style: TextStyleProperties = {
      fontFamily: 'Arial, sans-serif',
      fontSize: 20,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      textAlign: 'left',
      verticalAlign: 'baseline',
      lineHeight: 1.5,
      letterSpacing: 0,
      wordSpacing: 0,
      whiteSpace: 'normal',
      wordWrap: 'normal',
      textOverflow: 'clip',
      textDecoration: 'none',
      textTransform: 'none',
    };

    const bounds = service.measureTextBounds('Line box', style);

    expect(bounds.height).toBe(30);
  });

  it('includes letter and word spacing in measured text width', () => {
    const service = new TextCanvasRendererService(
      new MultiLineTextRendererService(),
    );
    const style: TextStyleProperties = {
      fontFamily: 'Arial, sans-serif',
      fontSize: 20,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      textAlign: 'left',
      verticalAlign: 'baseline',
      lineHeight: 1.5,
      letterSpacing: 0,
      wordSpacing: 0,
      whiteSpace: 'nowrap',
      wordWrap: 'normal',
      textOverflow: 'clip',
      textDecoration: 'none',
      textTransform: 'none',
    };

    const unspaced = service.measureTextBounds('Web parity tools', style);
    const spaced = service.measureTextBounds('Web parity tools', {
      ...style,
      letterSpacing: 2,
      wordSpacing: 7,
    });

    expect(spaced.width - unspaced.width).toBeCloseTo(46, 5);
  });
});
