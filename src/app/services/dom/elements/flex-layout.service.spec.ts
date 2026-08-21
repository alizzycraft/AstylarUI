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

  it('scales flex shrink by each item flex base size', () => {
    const item = (id: string, basis: number): FlexItem => ({
      element: { type: 'div', id },
      style: undefined,
      width: basis,
      height: 80,
      baseWidth: basis,
      baseHeight: 80,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      flexGrow: 0,
      flexShrink: 1,
      flexBasis: basis,
      alignSelf: 'auto',
      order: 0,
    });
    const container: FlexContainer = {
      width: 300,
      height: 100,
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      flexDirection: 'row',
      flexWrap: 'nowrap',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      alignContent: 'stretch',
      gap: 10,
      rowGap: 10,
      columnGap: 10,
    };

    const result = service.calculateFlexItemSizes(
      [item('large', 200), item('small', 150)],
      container,
      280,
    );

    expect(result[0].width).toBeCloseTo(154.286, 3);
    expect(result[1].width).toBeCloseTo(115.714, 3);
    expect(result[0].width + result[1].width + 10).toBeCloseTo(280, 6);
  });

  it('freezes flex items at their authored main-axis minimum', () => {
    const item = (id: string, minWidth?: number): FlexItem => ({
      element: { type: 'div', id }, style: undefined,
      width: 180, height: 40, baseWidth: 180, baseHeight: 40, minWidth,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      flexGrow: 0, flexShrink: 1, flexBasis: 180, alignSelf: 'auto', order: 0,
    });
    const container: FlexContainer = {
      width: 260, height: 80,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'flex-start',
      alignItems: 'stretch', alignContent: 'stretch', gap: 0, rowGap: 0, columnGap: 0,
    };

    const result = service.calculateFlexItemSizes(
      [item('fixed-minimum', 160), item('remaining')], container, 260,
    );

    expect(result[0].width).toBe(160);
    expect(result[1].width).toBe(100);
  });

  it('redistributes overflow created by a grown item minimum', () => {
    const item = (
      id: string,
      basis: number,
      flexGrow: number,
      minWidth: number,
    ): FlexItem => ({
      element: { type: 'div', id }, style: undefined,
      width: basis, height: 40, baseWidth: basis, baseHeight: 40, minWidth,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      flexGrow, flexShrink: 1, flexBasis: basis, alignSelf: 'auto', order: 0,
    });
    const container: FlexContainer = {
      width: 76, height: 80,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'flex-start',
      alignItems: 'stretch', alignContent: 'stretch', gap: 0, rowGap: 0, columnGap: 0,
    };

    const result = service.calculateFlexItemSizes([
      item('gutter', 50, 0, 26),
      item('padded-control', 0, 1, 34),
    ], container, 76);

    expect(result[0].width).toBe(42);
    expect(result[1].width).toBe(34);
  });
});
