import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MultiLineTextRendererService } from './multi-line-text-renderer.service';
import { TextStyleProperties } from '../../types/text-rendering';

describe('MultiLineTextRendererService', () => {
  let service: MultiLineTextRendererService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
    service = TestBed.inject(MultiLineTextRendererService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should wrap text correctly for normal white-space', () => {
    const style: TextStyleProperties = {
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      textAlign: 'left',
      verticalAlign: 'baseline',
      lineHeight: 1.2,
      letterSpacing: 0,
      wordSpacing: 0,
      whiteSpace: 'normal',
      wordWrap: 'normal',
      textOverflow: 'clip',
      textDecoration: 'none',
      textTransform: 'none'
    };

    const text = 'This is a long text that should wrap to multiple lines when the width is limited';
    const maxWidth = 100; // Small width to force wrapping
    
    const lines = service.wrapText(text, maxWidth, style);
    
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0].text).toBeTruthy();
    expect(lines[0].width).toBeGreaterThan(0);
  });

  it('uses visible hyphens as normal line-breaking opportunities', () => {
    const style: TextStyleProperties = {
      fontFamily: 'Arial', fontSize: 12, fontWeight: 'normal', fontStyle: 'normal',
      color: '#000000', textAlign: 'left', verticalAlign: 'baseline', lineHeight: 1.5,
      letterSpacing: 0, wordSpacing: 0, whiteSpace: 'normal', wordWrap: 'normal',
      textOverflow: 'clip', textDecoration: 'none', textTransform: 'none'
    };

    const lines = service.wrapText('text-to-speech.txt', 70, style);

    expect(lines.length).toBe(2);
    expect(lines.map((line) => line.text).join('')).toBe('text-to-speech.txt');
    expect(lines.every((line) => line.width <= 70)).toBeTrue();
  });

  it('preserves typographic Unicode spaces under normal white-space', () => {
    expect(service.handleWhiteSpace('  Icon　label\nnext  ', 'normal'))
      .toBe('Icon　label next');
    expect(service.handleWhiteSpace('  Icon　label\nnext  ', 'nowrap'))
      .toBe('Icon　label next');
  });

  it('should handle nowrap white-space correctly', () => {
    const style: TextStyleProperties = {
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      textAlign: 'left',
      verticalAlign: 'baseline',
      lineHeight: 1.2,
      letterSpacing: 0,
      wordSpacing: 0,
      whiteSpace: 'nowrap',
      wordWrap: 'normal',
      textOverflow: 'clip',
      textDecoration: 'none',
      textTransform: 'none'
    };

    const text = 'This is a long text that should not wrap even with limited width';
    const maxWidth = 50; // Very small width
    
    const lines = service.wrapText(text, maxWidth, style);
    
    expect(lines.length).toBe(1);
    expect(lines[0].text).toBe(text);
  });

  it('preserves blank and trailing lines for pre-wrap text', () => {
    const style: TextStyleProperties = {
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      textAlign: 'left',
      verticalAlign: 'baseline',
      lineHeight: 1.5,
      letterSpacing: 0,
      wordSpacing: 0,
      whiteSpace: 'pre-wrap',
      wordWrap: 'normal',
      textOverflow: 'clip',
      textDecoration: 'none',
      textTransform: 'none'
    };

    const lines = service.wrapText('Alpha\n\n', 300, style);

    expect(lines.map((line) => line.text)).toEqual(['Alpha', '', '']);
  });

  it('should calculate line positions correctly', () => {
    const style: TextStyleProperties = {
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      textAlign: 'left',
      verticalAlign: 'top',
      lineHeight: 1.5,
      letterSpacing: 0,
      wordSpacing: 0,
      whiteSpace: 'normal',
      wordWrap: 'normal',
      textOverflow: 'clip',
      textDecoration: 'none',
      textTransform: 'none'
    };

    const lines = [
      { text: 'Line 1', width: 50, y: 0 },
      { text: 'Line 2', width: 60, y: 0 },
      { text: 'Line 3', width: 40, y: 0 }
    ];

    const positionedLines = service.calculateLinePositions(lines, style);
    
    expect(positionedLines.length).toBe(3);
    expect(positionedLines[0].y).toBe(16); // fontSize
    expect(positionedLines[1].y).toBe(40); // fontSize + (fontSize * lineHeight)
    expect(positionedLines[2].y).toBe(64); // fontSize + 2 * (fontSize * lineHeight)
  });

  it('should truncate overflowing nowrap text with a single ellipsis glyph', () => {
    const style: TextStyleProperties = {
      fontFamily: 'Arial',
      fontSize: 18,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      textAlign: 'left',
      verticalAlign: 'baseline',
      lineHeight: 1.4,
      letterSpacing: 0,
      wordSpacing: 0,
      whiteSpace: 'nowrap',
      wordWrap: 'normal',
      textOverflow: 'ellipsis',
      textDecoration: 'none',
      textTransform: 'none'
    };

    const lines = service.wrapText('A deliberately long navigation label', 150, style);
    const visible = service.handleTextOverflow(lines, 150, 28, style);

    expect(visible.length).toBe(1);
    expect(visible[0].text.endsWith('\u2026')).toBeTrue();
    expect(visible[0].width).toBeLessThanOrEqual(150);
  });

  it('should handle white-space processing correctly', () => {
    const normalText = service.handleWhiteSpace('  Multiple   spaces  \n  and  newlines  ', 'normal');
    expect(normalText).toBe('Multiple spaces and newlines');

    const preText = service.handleWhiteSpace('  Multiple   spaces  \n  and  newlines  ', 'pre');
    expect(preText).toBe('  Multiple   spaces  \n  and  newlines  ');

    const nowrapText = service.handleWhiteSpace('  Multiple   spaces  \n  and  newlines  ', 'nowrap');
    expect(nowrapText).toBe('Multiple spaces and newlines');
  });
});
