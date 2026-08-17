import { FlexService } from './flex.service';
import { BabylonRender } from '../interfaces/render.types';
import { BabylonDOM } from '../interfaces/dom.types';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { FlexContainer, FlexItem, FlexLayoutService } from './flex-layout.service';
import { Mesh } from '@babylonjs/core';

describe('FlexService', () => {
  it('expands three-value padding and margin shorthand', () => {
    const service = new FlexService({} as never, {} as never, {} as never);

    expect(service['parsePadding']('24px 12px 8px')).toEqual({
      top: 24, right: 12, bottom: 8, left: 12,
    });
    expect(service['parseMargin']('6px 4px 10px')).toEqual({
      top: 6, right: 4, bottom: 10, left: 4,
    });
  });

  it('resolves a flex item percentage width against the container content box', () => {
    const service = new FlexService({} as never, {} as never, {} as never);

    expect(service['resolvePercentageFlexItemSize']('50%', 300, 22, 22))
      .toBe(128);
  });

  it('recognizes both block-level and inline-level flex containers', () => {
    const service = new FlexService({} as never, {} as never, {} as never);
    const render = {
      actions: {
        style: {
          findStyleForElement: (element: { id?: string }) => ({
            display: element.id,
          }),
        },
      },
    } as unknown as BabylonRender;

    expect(service.isFlexContainer(render, { type: 'div', id: 'flex' }, []))
      .toBeTrue();
    expect(service.isFlexContainer(render, { type: 'div', id: 'inline-flex' }, []))
      .toBeTrue();
    expect(service.isFlexContainer(render, { type: 'div', id: 'block' }, []))
      .toBeFalse();
  });

  it('applies longhand margins over the flex item margin shorthand', () => {
    const service = new FlexService({} as never, {} as never, {} as never);

    const margin = service['parseMarginBox']({
      selector: '#item',
      margin: '1px 2px 3px 4px',
      marginTop: '8px',
    });

    expect(margin).toEqual({ top: 8, right: 2, bottom: 3, left: 4 });
  });

  it('expands the flex shorthand and lets longhands override it', () => {
    const service = new FlexService({} as never, {} as never, {} as never);
    const render = {
      actions: {
        style: {
          parseFlexShorthand: () => ({ flexGrow: 0, flexShrink: 0, flexBasis: '88px' }),
          parseFlexGrow: (value: string) => Number(value),
          parseFlexShrink: (value: string) => Number(value),
          parseFlexBasis: (value: string) => value,
        },
      },
    } as unknown as BabylonRender;

    expect(service['resolveFlexProperties'](render, {
      selector: '#item',
      flex: '0 0 88px',
      flexGrow: '2',
    })).toEqual({ flexGrow: 2, flexShrink: 0, flexBasis: '88px' });
  });

  it('keeps positioned and hidden children out of flex sizing', () => {
    const service = new FlexService({} as never, {} as never, {} as never);

    expect(service['classifyFlexChild']({ selector: '#normal' })).toBe('flow');
    expect(service['classifyFlexChild']({ selector: '#legend', position: 'absolute' }))
      .toBe('positioned');
    expect(service['classifyFlexChild']({ selector: '#overlay', position: 'fixed' }))
      .toBe('positioned');
    expect(service['classifyFlexChild']({ selector: '#omitted', display: 'none' }))
      .toBe('hidden');
  });

  it('uses wrapped line height for a height-auto text flex item', () => {
    const textRendering = {
      calculateTextDimensions: (_text: string, _style: unknown, maxWidth?: number) => ({
        width: 70, height: 20, lineHeight: 20, maxWidth,
      }),
    };
    const textStyleParser = {
      parseTextProperties: () => ({ fontSize: 12, lineHeight: 20 / 12 }),
    };
    const service = new FlexService(
      new FlexLayoutService(),
      textRendering as never,
      textStyleParser as never,
    );

    const height = service['calculateIntrinsicTextHeight'](
      { type: 'span', id: 'label', textContent: 'Completed' },
      { selector: '#label', width: '160px', fontSize: '12px', lineHeight: '20px' },
      [],
      160,
    );

    expect(height).toBe(20);
  });

  it('content-sizes a button-like input while preserving text-input minimum width', () => {
    const textRendering = {
      calculateTextDimensions: () => ({ width: 76, height: 20, lineHeight: 20 }),
    };
    const textStyleParser = {
      parseTextProperties: () => ({ fontSize: 14, lineHeight: 20 / 14 }),
    };
    const service = new FlexService(
      new FlexLayoutService(),
      textRendering as never,
      textStyleParser as never,
    );
    const style = { selector: '#control', padding: '10px 16px', borderWidth: '2px' };

    expect(service['calculateIntrinsicWidth'](
      { type: 'input', inputType: 'button', id: 'control', value: 'Create item' },
      style,
      [style],
    )).toBe(112);
    expect(service['calculateIntrinsicWidth'](
      { type: 'input', inputType: 'text', id: 'control', value: 'Create item' },
      style,
      [style],
    )).toBe(170);
  });

  it('measures a non-text flex item from its in-flow descendants', () => {
    const service = new FlexService(new FlexLayoutService(), {} as never, {} as never);
    const first: DOMElement = { type: 'div', id: 'first' };
    const second: DOMElement = { type: 'div', id: 'second' };
    const card: DOMElement = { type: 'article', id: 'card', children: [first, second] };
    const resolved = new Map([
      ['first', { selector: '#first', height: '32px', margin: '0' }],
      ['second', { selector: '#second', height: '44px', marginTop: '8px' }],
    ]);
    const render = {
      actions: {
        style: {
          findStyleForElement: (element: { id?: string }) => resolved.get(element.id ?? ''),
        },
      },
    } as unknown as BabylonRender;
    const dom = {
      context: { elementStyles: new Map() },
    } as unknown as BabylonDOM;

    const height = service['calculateIntrinsicContainerHeight'](
      card,
      { selector: '#card', width: '240px', padding: '12px', borderWidth: '2px' },
      [],
      dom,
      render,
      240,
    );

    expect(height).toBe(112);
  });

  it('measures wrapped grid content against its resolved column width', () => {
    const measuredWidths: Array<number | undefined> = [];
    const textRendering = {
      calculateTextDimensions: (_text: string, _style: unknown, maxWidth?: number) => {
        measuredWidths.push(maxWidth);
        return { width: maxWidth ?? 0, height: (maxWidth ?? 0) <= 100 ? 60 : 20, lineHeight: 20 };
      },
    };
    const textStyleParser = {
      parseTextProperties: () => ({ fontSize: 14, lineHeight: 20 / 14 }),
    };
    const service = new FlexService(
      new FlexLayoutService(), textRendering as never, textStyleParser as never,
    );
    const card: DOMElement = {
      type: 'article', id: 'card', textContent: 'Text that wraps in a narrow grid track.',
    };
    const resolved = new Map<string, StyleRule>([
      ['card', { selector: '#card', height: 'auto', padding: '10px', borderWidth: '2px' }],
    ]);
    const render = {
      actions: { style: { findStyleForElement: (element: DOMElement) => resolved.get(element.id ?? '') } },
    } as unknown as BabylonRender;
    const dom = {
      context: { elementStyles: new Map() },
    } as unknown as BabylonDOM;

    const height = service['calculateIntrinsicContainerHeight'](
      { type: 'section', id: 'grid', children: [card] },
      {
        selector: '#grid', display: 'grid', gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'auto', columnGap: '16px', padding: '10px', borderWidth: '2px',
      },
      [],
      dom,
      render,
      280,
    );

    expect(measuredWidths).toEqual([96]);
    expect(height).toBe(108);
  });

  it('uses the largest outer cross size for a nowrap row flex container', () => {
    const textRendering = {
      calculateTextDimensions: () => ({ width: 100, height: 24, lineHeight: 24 }),
    };
    const textStyleParser = {
      parseTextProperties: () => ({ fontSize: 12, lineHeight: 2 }),
    };
    const service = new FlexService(
      new FlexLayoutService(), textRendering as never, textStyleParser as never,
    );
    const label: DOMElement = { type: 'label', id: 'label', textContent: 'Bio' };
    const textarea: DOMElement = { type: 'textarea', id: 'bio', rows: 2, value: '' };
    const resolved = new Map<string, StyleRule>([
      ['label', { selector: '#label', width: '72px', height: '59px', marginTop: '2px' }],
      ['bio', { selector: '#bio', width: '176px', height: 'auto', padding: '5px 9px', borderWidth: '1px' }],
    ]);
    const render = {
      actions: { style: { findStyleForElement: (element: DOMElement) => resolved.get(element.id ?? '') } },
    } as unknown as BabylonRender;
    const dom = {
      context: { elementStyles: new Map() },
    } as unknown as BabylonDOM;

    const height = service['calculateIntrinsicContainerHeight'](
      { type: 'div', id: 'row', children: [label, textarea] },
      {
        selector: '#row', display: 'flex', flexDirection: 'row', flexWrap: 'nowrap',
        width: '280px', height: 'auto', padding: '8px', borderWidth: '2px',
      },
      [],
      dom,
      render,
      280,
    );

    expect(height).toBe(81);
  });

  it('sums flex line cross sizes and row gaps for a wrapped row container', () => {
    const service = new FlexService(new FlexLayoutService(), {} as never, {} as never);
    const children: DOMElement[] = [
      { type: 'div', id: 'first' },
      { type: 'div', id: 'second' },
      { type: 'div', id: 'third' },
    ];
    const resolved = new Map<string, StyleRule>([
      ['first', { selector: '#first', flex: '0 0 100px', width: '100px', height: '36px' }],
      ['second', { selector: '#second', flex: '0 0 100px', width: '100px', height: '28px' }],
      ['third', { selector: '#third', flex: '0 0 100px', width: '100px', height: '44px' }],
    ]);
    const render = {
      actions: { style: { findStyleForElement: (element: DOMElement) => resolved.get(element.id ?? '') } },
    } as unknown as BabylonRender;
    const dom = {
      context: { elementStyles: new Map() },
    } as unknown as BabylonDOM;

    const height = service['calculateIntrinsicContainerHeight'](
      { type: 'section', id: 'wrapped', children },
      {
        selector: '#wrapped', display: 'flex', flexDirection: 'row', flexWrap: 'wrap',
        width: '260px', height: 'auto', columnGap: '8px', rowGap: '12px',
        padding: '10px', borderWidth: '2px',
      },
      [],
      dom,
      render,
      260,
    );

    expect(height).toBe(116);
  });

  it('sums margins and gaps for a nowrap column flex container', () => {
    const service = new FlexService(new FlexLayoutService(), {} as never, {} as never);
    const first: DOMElement = { type: 'div', id: 'first' };
    const second: DOMElement = { type: 'div', id: 'second' };
    const resolved = new Map<string, StyleRule>([
      ['first', { selector: '#first', height: '32px', marginBottom: '5px' }],
      ['second', { selector: '#second', height: '44px', marginTop: '7px' }],
    ]);
    const render = {
      actions: { style: { findStyleForElement: (element: DOMElement) => resolved.get(element.id ?? '') } },
    } as unknown as BabylonRender;
    const dom = {
      context: { elementStyles: new Map() },
    } as unknown as BabylonDOM;

    const height = service['calculateIntrinsicContainerHeight'](
      { type: 'div', id: 'column', children: [first, second] },
      {
        selector: '#column', display: 'flex', flexDirection: 'column', flexWrap: 'nowrap',
        width: '240px', height: 'auto', gap: '10px', padding: '12px', borderWidth: '2px',
      },
      [],
      dom,
      render,
      240,
    );

    expect(height).toBe(126);
  });

  it('resizes a standalone height-auto flex container before child layout', () => {
    const service = new FlexService(new FlexLayoutService(), {} as never, {} as never);
    const first: DOMElement = { type: 'div', id: 'first' };
    const second: DOMElement = { type: 'div', id: 'second' };
    const element: DOMElement = {
      type: 'section', id: 'standalone', children: [first, second],
    };
    const style: StyleRule = {
      selector: '#standalone', display: 'flex', flexDirection: 'column',
      height: 'auto', padding: '12px', borderWidth: '2px', gap: '8px',
    };
    const resolved = new Map<string, StyleRule>([
      ['first', { selector: '#first', height: '32px' }],
      ['second', { selector: '#second', height: '44px' }],
    ]);
    const updateMeshWithBorderRadius = jasmine.createSpy('updateMeshWithBorderRadius');
    const render = {
      actions: {
        camera: { getPixelToWorldScale: () => 0.01 },
        mesh: { updateMeshWithBorderRadius },
        style: { findStyleForElement: (child: DOMElement) => resolved.get(child.id ?? '') },
      },
    } as unknown as BabylonRender;
    const dimensions = {
      width: 240, height: 600,
      padding: { top: 14, right: 14, bottom: 14, left: 14 },
    };
    const dom = {
      context: {
        elementStyles: new Map(),
        elementDimensions: new Map([['standalone', dimensions]]),
      },
    } as unknown as BabylonDOM;
    const mesh = {
      name: 'standalone', position: { y: 0 }, metadata: {},
    } as unknown as Mesh;

    const height = service['resizeStandaloneAutoHeightContainer'](
      element, style, [], dom, render, mesh, 240, 600, 0.01,
    );

    expect(height).toBe(112);
    expect(dom.context.elementDimensions.get('standalone')?.height).toBe(112);
    expect(mesh.position.y).toBeCloseTo(2.44, 8);
    expect(updateMeshWithBorderRadius).toHaveBeenCalledWith(
      mesh, 'rectangle', 2.4, 1.12, 0, 0.02,
    );
  });

  it('stretches a height-auto item through a padded row flex container', () => {
    const service = new FlexService(new FlexLayoutService(), {} as never, {} as never);
    const item: FlexItem = {
      element: { type: 'article', id: 'panel' },
      style: { selector: '#panel', width: '140px', height: 'auto' },
      width: 140,
      height: 284,
      baseWidth: 140,
      baseHeight: 284,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      flexGrow: 0,
      flexShrink: 1,
      flexBasis: 'auto',
      alignSelf: 'auto',
      order: 0,
    };
    const padding = { top: 12, right: 12, bottom: 12, left: 12 };
    const flexProps = {
      flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'stretch',
      flexWrap: 'nowrap', alignContent: 'stretch',
    };
    const container: FlexContainer = {
      width: 360, height: 240, padding, ...flexProps,
      gap: 12, rowGap: 12, columnGap: 12,
    };

    const result = service['calculateFlexLayout'](
      [item], container.width, container.height, padding,
      flexProps, {} as BabylonRender, container,
    );

    expect(result[0].size.height).toBe(216);
  });

  it('measures a height-auto grid from fixed row tracks and gaps', () => {
    const service = new FlexService(new FlexLayoutService(), {} as never, {} as never);
    const render = {
      actions: { style: { findStyleForElement: () => undefined } },
    } as unknown as BabylonRender;
    const dom = {
      context: { elementStyles: new Map() },
    } as unknown as BabylonDOM;

    const height = service['calculateIntrinsicContainerHeight'](
      { type: 'div', id: 'grid', children: [{ type: 'div', id: 'cell' }] },
      {
        selector: '#grid', display: 'grid', width: '248px', height: 'auto',
        gridTemplateRows: '40px 60px', rowGap: '10px',
        padding: '12px', borderWidth: '2px',
      },
      [],
      dom,
      render,
      248,
    );

    expect(height).toBe(138);
  });

  it('measures height-auto grid rows from item contributions and gaps', () => {
    const service = new FlexService(new FlexLayoutService(), {} as never, {} as never);
    const first: DOMElement = { type: 'div', id: 'first' };
    const second: DOMElement = { type: 'div', id: 'second' };
    const resolved = new Map<string, StyleRule>([
      ['first', { selector: '#first', height: '36px' }],
      ['second', { selector: '#second', height: '52px' }],
    ]);
    const render = {
      actions: { style: { findStyleForElement: (element: DOMElement) => resolved.get(element.id ?? '') } },
    } as unknown as BabylonRender;
    const dom = {
      context: { elementStyles: new Map() },
    } as unknown as BabylonDOM;

    const height = service['calculateIntrinsicContainerHeight'](
      { type: 'div', id: 'grid', children: [first, second] },
      {
        selector: '#grid', display: 'grid', width: '248px', height: 'auto',
        gridTemplateColumns: '220px', gridTemplateRows: 'auto auto', rowGap: '10px',
        padding: '12px', borderWidth: '2px',
      },
      [],
      dom,
      render,
      248,
    );

    expect(height).toBe(126);
  });

  it('derives textarea flex-item height from its row count', () => {
    const textRendering = {
      calculateTextDimensions: () => ({ width: 100, height: 24, lineHeight: 24 }),
    };
    const textStyleParser = {
      parseTextProperties: () => ({ fontSize: 12, lineHeight: 2 }),
    };
    const service = new FlexService(
      new FlexLayoutService(), textRendering as never, textStyleParser as never,
    );

    const height = service['calculateIntrinsicTextHeight'](
      { type: 'textarea', id: 'bio', rows: 2, value: '' },
      { selector: '#bio', width: '260px', height: 'auto', padding: '5px 9px', borderWidth: '1px' },
      [],
      260,
    );

    expect(height).toBe(60);
  });

  it('positions the first wrapped line at the cross-axis start', () => {
    const service = new FlexService(new FlexLayoutService(), {} as never, {} as never);
    const item = (id: string, width: number, height: number): FlexItem => ({
      element: { type: 'input', id },
      style: { selector: `#${id}`, width: `${width}px`, height: `${height}px` },
      width,
      height,
      baseWidth: width,
      baseHeight: height,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: width,
      alignSelf: 'auto',
      order: 0,
    });
    const padding = { top: 6, right: 6, bottom: 6, left: 6 };
    const flexProps = {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      flexWrap: 'wrap',
      alignContent: 'stretch',
    };
    const container: FlexContainer = {
      width: 350,
      height: 78,
      padding,
      ...flexProps,
      gap: 6,
      rowGap: 6,
      columnGap: 6,
    };

    const result = service['calculateFlexLayout'](
      [item('search', 206, 32), item('filter', 126, 32), item('export', 90, 28)],
      container.width,
      container.height,
      padding,
      flexProps,
      {} as BabylonRender,
      container,
    );
    const top = (index: number) =>
      container.height / 2 - result[index].position.y - result[index].size.height / 2;

    expect(top(0)).toBe(6);
    expect(top(1)).toBe(6);
    expect(top(2)).toBe(44);
  });
});
