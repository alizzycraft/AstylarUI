import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TextStyleParserService } from './text-style-parser.service';

describe('TextStyleParserService', () => {
  let service: TextStyleParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(TextStyleParserService);
  });

  it('resolves pixel line-height against the element font size', () => {
    const style = service.parseTextProperties({
      selector: '#text',
      fontSize: '20px',
      lineHeight: '30px',
    });

    expect(style.fontSize).toBe(20);
    expect(style.lineHeight).toBe(1.5);
  });

  it('resolves normal line-height from the active font box', () => {
    spyOn(CanvasRenderingContext2D.prototype, 'measureText').and.returnValue({
      fontBoundingBoxAscent: 13,
      fontBoundingBoxDescent: 4,
    } as TextMetrics);

    const style = service.parseTextProperties({
      selector: '#text',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
    });

    expect(style.fontSize * style.lineHeight).toBe(17);
  });

  it('preserves an authored caret color independently of text color', () => {
    const style = service.parseTextProperties({
      selector: '#readonly-picker',
      color: '#1d1b20',
      caretColor: 'transparent',
    });

    expect(style.color).toBe('#1d1b20');
    expect(style.caretColor).toBe('transparent');
  });
});
