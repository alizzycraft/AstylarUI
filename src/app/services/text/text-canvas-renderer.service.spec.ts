import { MultiLineTextRendererService } from './multi-line-text-renderer.service';
import { TextCanvasRendererService } from './text-canvas-renderer.service';
import { TextStyleProperties } from '../../types/text-rendering';
import { TextStyleParserService } from './text-style-parser.service';

describe('TextCanvasRendererService', () => {
  it('renders explicit normal/400 and bold/700 aliases identically through core parsing and canvas paint', () => {
    const parser = new TextStyleParserService();
    const service = new TextCanvasRendererService(new MultiLineTextRendererService());
    const render = (fontWeight: string) => {
      const style = parser.parseTextProperties({ selector: '#weight-proof', fontFamily: 'Arial, sans-serif',
        fontSize: '20px', lineHeight: '28px', fontWeight });
      const canvas = service.createStyledCanvas('Weight proof', style);
      service.renderTextToCanvas(canvas, 'Weight proof', style);
      const pixels = Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data);
      expect(pixels.some((value, index) => index % 4 === 3 && value > 0)).toBeTrue();
      return { width: canvas.width, height: canvas.height, pixels };
    };
    expect(render('normal')).toEqual(render('400'));
    expect(render('bold')).toEqual(render('700'));
    expect(render('400')).not.toEqual(render('700'));
  });

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

  it('measures unconstrained pre-line content as separate intrinsic lines', () => {
    const service = new TextCanvasRendererService(new MultiLineTextRendererService());
    const style: TextStyleProperties = {
      fontFamily: 'Arial, sans-serif', fontSize: 20, fontWeight: 'normal',
      fontStyle: 'normal', color: '#000000', textAlign: 'left',
      verticalAlign: 'baseline', lineHeight: 1.5, letterSpacing: 0, wordSpacing: 0,
      whiteSpace: 'pre-line', wordWrap: 'normal', textOverflow: 'clip',
      textDecoration: 'none', textTransform: 'none',
    };

    const first = service.measureTextBounds('Longest line', style);
    const multiline = service.measureTextBounds('Longest line\nshort', style);

    expect(multiline.width).toBeCloseTo(first.width, 5);
    expect(multiline.height).toBe(60);
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

  it('matches browser integer half-leading for middle-aligned line boxes', () => {
    const service = new TextCanvasRendererService(
      new MultiLineTextRendererService(),
    );
    for (const sample of [
      { fontSize: 14, lineHeight: 20, text: 'Automatic updates' },
      { fontSize: 16, lineHeight: 24, text: 'Advanced settings' },
    ]) {
      const style: TextStyleProperties = {
        fontFamily: 'Roboto, Arial, sans-serif', fontSize: sample.fontSize, fontWeight: '500',
        fontStyle: 'normal', color: '#000000', textAlign: 'left',
        verticalAlign: 'middle', lineHeight: sample.lineHeight / sample.fontSize, letterSpacing: 0,
        wordSpacing: 0, whiteSpace: 'nowrap', wordWrap: 'normal',
        textOverflow: 'clip', textDecoration: 'none', textTransform: 'none',
      };
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = sample.lineHeight;
      canvas.style.width = '200px';
      canvas.style.height = `${sample.lineHeight}px`;
      const context = canvas.getContext('2d')!;
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
      const metrics = context.measureText('Mg');
      const expectedBaseline = Math.floor((
        sample.lineHeight - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent
      ) / 2) + metrics.fontBoundingBoxAscent;
      const fillText = spyOn(context, 'fillText');

      service.renderTextToCanvas(canvas, sample.text, style);

      expect(context.textBaseline).toBe('alphabetic');
      expect(fillText.calls.mostRecent().args[2]).withContext(sample.text).toBe(expectedBaseline);
    }
  });

  it('uses the browser line-box alphabetic baseline for normally aligned text', () => {
    const service = new TextCanvasRendererService(
      new MultiLineTextRendererService(),
    );
    const style: TextStyleProperties = {
      fontFamily: 'Roboto, Arial, sans-serif', fontSize: 14, fontWeight: '500',
      fontStyle: 'normal', color: '#000000', textAlign: 'left',
      verticalAlign: 'baseline', lineHeight: 17 / 14, letterSpacing: 0,
      wordSpacing: 0, whiteSpace: 'nowrap', wordWrap: 'normal',
      textOverflow: 'clip', textDecoration: 'none', textTransform: 'none',
    };
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 17;
    canvas.style.width = '200px';
    canvas.style.height = '17px';
    const context = canvas.getContext('2d')!;
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
    const metrics = context.measureText('Mg');
    const expectedBaseline = Math.floor((
      17 - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent
    ) / 2) + metrics.fontBoundingBoxAscent;
    const fillText = spyOn(context, 'fillText');

    service.renderTextToCanvas(canvas, 'Primary action', style);

    expect(context.textBaseline).toBe('alphabetic');
    expect(fillText.calls.mostRecent().args[2]).toBe(expectedBaseline);
  });

  it('matches the DOM baseline when a line box has odd half-leading', () => {
    const service = new TextCanvasRendererService(
      new MultiLineTextRendererService(),
    );
    const style: TextStyleProperties = {
      fontFamily: 'Roboto, Arial, sans-serif', fontSize: 14, fontWeight: '400',
      fontStyle: 'normal', color: '#000000', textAlign: 'left',
      verticalAlign: 'baseline', lineHeight: 20 / 14, letterSpacing: 0,
      wordSpacing: 0, whiteSpace: 'nowrap', wordWrap: 'normal',
      textOverflow: 'clip', textDecoration: 'none', textTransform: 'none',
    };
    const host = document.createElement('div');
    host.style.cssText = [
      'position:absolute', 'left:0', 'top:0', 'margin:0', 'padding:0',
      'width:200px', 'height:20px', 'font:normal 400 14px/20px Roboto,Arial,sans-serif',
    ].join(';');
    const marker = document.createElement('span');
    marker.style.cssText = 'display:inline-block;width:0;height:0;margin:0;padding:0';
    host.append('Mg', marker);
    document.body.append(host);
    const domBaseline = marker.getBoundingClientRect().top - host.getBoundingClientRect().top;

    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 20;
    canvas.style.width = '200px';
    canvas.style.height = '20px';
    const context = canvas.getContext('2d')!;
    const fillText = spyOn(context, 'fillText');

    service.renderTextToCanvas(canvas, 'Save Project Atlas?', style);

    expect(fillText.calls.mostRecent().args[2]).toBe(domBaseline);
    host.remove();
  });
});
