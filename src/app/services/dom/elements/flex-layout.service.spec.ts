import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  FlexContainer,
  FlexItem,
  FlexLayoutService,
} from './flex-layout.service';

describe('FlexLayoutService', () => {
  let service: FlexLayoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(FlexLayoutService);
  });

  it('reserves the main-axis gap before distributing flex growth', () => {
    const item = (id: string, flexGrow: number): FlexItem => ({
      element: { type: 'div', id },
      style: undefined,
      width: 80,
      height: 40,
      baseWidth: 80,
      baseHeight: 40,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      flexGrow,
      flexShrink: 1,
      flexBasis: 80,
      alignSelf: 'auto',
      order: 0,
    });
    const container: FlexContainer = {
      width: 500,
      height: 150,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      flexDirection: 'row',
      flexWrap: 'nowrap',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      alignContent: 'stretch',
      gap: 0,
      rowGap: 0,
      columnGap: 12,
    };

    const result = service.calculateFlexItemSizes(
      [item('one', 1), item('two', 2)],
      container,
      452,
    );

    expect(result[0].width).toBeCloseTo(173.333, 3);
    expect(result[1].width).toBeCloseTo(266.667, 3);
    expect(result[0].width + result[1].width + 12).toBeCloseTo(452, 6);
  });
});
