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

  it('uses logical CSS dimensions when laying out a DPR-scaled canvas', () => {
    const multiLine = new MultiLineTextRendererService();
    const service = new TextCanvasRendererService(multiLine);
    const style: TextStyleProperties = {
      fontFamily: 'Arial, sans-serif', fontSize: 20, fontWeight: 'normal',
      fontStyle: 'normal', color: '#000000', textAlign: 'center',
      verticalAlign: 'middle', lineHeight: 1.5, letterSpacing: 0, wordSpacing: 0,
      whiteSpace: 'nowrap', wordWrap: 'normal', textOverflow: 'clip',
      textDecoration: 'none', textTransform: 'none',
    };
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 60;
    canvas.style.width = '100px';
    canvas.style.height = '30px';
    const linePositionSpy = spyOn(multiLine, 'calculateLinePositions').and.callThrough();
    const lineXSpy = spyOn<any>(service, 'calculateLineX').and.callThrough();

    service.renderTextToCanvas(canvas, 'DPR text', style);

    expect(linePositionSpy.calls.mostRecent().args[2]).toBe(30);
    expect(lineXSpy.calls.mostRecent().args[1]).toBe(100);
  });
});
