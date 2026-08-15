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
});
