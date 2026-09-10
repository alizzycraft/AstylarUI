import { FlexService } from './flex.service';
import { BabylonRender } from '../interfaces/render.types';
import { BabylonDOM } from '../interfaces/dom.types';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { FlexContainer, FlexItem, FlexLayoutService } from './flex-layout.service';
import { Mesh } from '@babylonjs/core';
import { ImageLayoutService } from './image-layout.service';

describe('FlexService', () => {
  it('measures a loaded natural image including padding and borders', () => {
    const service = new FlexService(
      {} as never,
      {} as never,
      {} as never,
      undefined,
      { getNaturalSize: () => ({ width: 120, height: 80 }) } as never,
      new ImageLayoutService(),
    );

    expect(service['calculateIntrinsicImageBox'](
      { type: 'img', src: 'art.svg' },
      { selector: 'img', padding: '6px', borderWidth: '2px' },
      400,
    )).toEqual({ width: 136, height: 96 });
  });

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

  it('resolves viewport units for definite flex-item dimensions', () => {
    const service = new FlexService({} as never, {} as never, {} as never);
    const viewport = { width: 1280, height: 800 };

    expect(service['resolveFlexItemLength']('100vh', 240, viewport)).toBe(800);
    expect(service['resolveFlexItemLength']('25vw', 240, viewport)).toBe(320);
    expect(service['resolveFlexItemLength']('2rem', 240, viewport)).toBe(32);
    expect(service['resolveFlexItemLength']('2em', 240, viewport, '18px')).toBe(36);
  });

  it('recognizes auto margins from shorthand and longhand declarations', () => {
    const service = new FlexService({} as never, {} as never, {} as never);

    expect(service['parseAutoMarginBox']({ selector: '#action', margin: '0 0 0 auto' }))
      .toEqual({ top: false, right: false, bottom: false, left: true });
    expect(service['parseAutoMarginBox']({ selector: '#action', margin: 'auto', marginRight: '8px' }))
      .toEqual({ top: true, right: false, bottom: true, left: true });
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

  it('content-sizes an auto-width row flex item from its in-flow descendants', () => {
    const textRendering = {
      calculateTextDimensions: (text: string) => ({ width: text.length * 6, height: 16, lineHeight: 16 }),
    };
    const textStyleParser = {
      parseTextProperties: () => ({ fontSize: 12, lineHeight: 16 / 12 }),
    };
    const service = new FlexService(
      new FlexLayoutService(), textRendering as never, textStyleParser as never,
    );
    const label: DOMElement = { type: 'span', id: 'label', textContent: 'Items per page:' };
    const value: DOMElement = { type: 'span', id: 'value', textContent: '10' };
    const group: DOMElement = { type: 'div', id: 'group', children: [label, value] };
    const resolved = new Map<string, StyleRule>([
      ['label', { selector: '#label', display: 'block', margin: '0 4px' }],
      ['value', { selector: '#value', display: 'block' }],
    ]);
    const render = {
      actions: { style: { findStyleForElement: (element: DOMElement) => resolved.get(element.id ?? '') } },
    } as unknown as BabylonRender;
    const dom = { context: { elementStyles: new Map() } } as unknown as BabylonDOM;

    const width = service['calculateIntrinsicContainerWidth'](
      group,
      { selector: '#group', display: 'flex', flexDirection: 'row', flexWrap: 'nowrap' },
      [], dom, render, 704,
    );

    expect(width).toBe(110);
  });

  it('honors a descendant min-height during intrinsic container sizing', () => {
    const service = new FlexService(new FlexLayoutService(), {} as never, {} as never);
    const child: DOMElement = { type: 'article', id: 'empty', children: [
      { type: 'div', id: 'copy' },
    ] };
    const resolved = new Map<string, StyleRule>([
      ['empty', { selector: '#empty', minHeight: '200px', margin: '8px' }],
      ['copy', { selector: '#copy', height: '42px' }],
    ]);
    const render = {
      actions: { style: { findStyleForElement: (element: DOMElement) => resolved.get(element.id ?? '') } },
    } as unknown as BabylonRender;
    const dom = { context: { elementStyles: new Map() } } as unknown as BabylonDOM;

    const height = service['calculateIntrinsicContainerHeight'](
      { type: 'div', id: 'list', children: [child] },
      { selector: '#list' }, [], dom, render, 320,
    );

    expect(height).toBe(216);
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
        camera: {
          projectCssLength: (value: number) => value * 0.01,
          projectCssSize: (size: { width: number; height: number }) => ({
            width: size.width * 0.01,
            height: size.height * 0.01,
          }),
          projectCssLocalPoint: (point: { x: number; y: number }, z = 0) => ({
            x: point.x * 0.01,
            y: -point.y * 0.01,
            z,
          }),
        },
        mesh: {
          updateMeshWithBorderRadius,
          positionTextMesh: (_mesh: Mesh, x: number, y: number, z: number) => {
            _mesh.position = { x, y, z } as never;
          },
        },
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
        elementDimensions: new Map([
          ['root-body', { width: 240, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 } }],
          ['standalone', dimensions],
        ]),
        layoutBoxes: new Map([['standalone', {
          parentId: 'root-body',
          box: {
            borderBox: { x: 0, y: 0, width: 240, height: 600 },
            contentBox: { x: 14, y: 14, width: 212, height: 572 },
            padding: { top: 14, right: 14, bottom: 14, left: 14 },
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        }]]),
      },
    } as unknown as BabylonDOM;
    const mesh = {
      name: 'standalone', position: { y: 0 }, metadata: {},
    } as unknown as Mesh;

    const height = service['resizeStandaloneAutoHeightContainer'](
      element, style, [], dom, render, mesh, 240, 600,
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

  it('preserves a cross-axis minimum and leading margin when stretch space is negative', () => {
    const service = new FlexService(new FlexLayoutService(), {} as never, {} as never);
    const item: FlexItem = {
      element: { type: 'section', id: 'minimum-box' },
      style: { selector: '#minimum-box' },
      width: 0, height: 80, baseWidth: 0, baseHeight: 80, minWidth: 50,
      margin: { top: 0, right: 16, bottom: 0, left: 16 },
      flexGrow: 0, flexShrink: 1, flexBasis: 80, alignSelf: 'auto', order: 0,
    };
    const padding = { top: 0, right: 0, bottom: 0, left: 0 };
    const flexProps = {
      flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch',
      flexWrap: 'nowrap', alignContent: 'stretch',
    };
    const container: FlexContainer = {
      width: 0, height: 100, padding, ...flexProps,
      gap: 0, rowGap: 0, columnGap: 0,
    };

    const result = service['calculateFlexLayout'](
      [item], container.width, container.height, padding,
      flexProps, {} as BabylonRender, container,
    );

    expect(result[0].size.width).toBe(50);
    expect(result[0].position.x).toBe(16);
  });

  it('derives the minimum border box from padding and per-side borders', () => {
    const service = new FlexService(new FlexLayoutService(), {} as never, {} as never);

    expect(service['minimumBorderBox']({
      selector: '#box', padding: '12px 24px', borderWidth: '1px 2px 3px 4px',
    })).toEqual({ width: 54, height: 28 });
  });

  it('uses the longest breakable segment as a text flex item automatic minimum', () => {
    const service = new FlexService(
      new FlexLayoutService(),
      { calculateTextDimensions: (text: string) => ({ width: text.length * 10 }) } as never,
      { parseTextProperties: () => ({}) } as never,
    );

    expect(service['calculateIntrinsicMinWidth'](
      { type: 'strong', textContent: 'text-to-speech.txt' },
      { selector: 'strong' },
      [],
    )).toBe(100);
  });

  it('clamps an input automatic minimum to its definite authored width', () => {
    const service = new FlexService(
      new FlexLayoutService(),
      { calculateTextDimensions: () => ({ width: 0 }) } as never,
      { parseTextProperties: () => ({}) } as never,
    );
    const viewport = { width: 800, height: 600 };

    expect(service['calculateIntrinsicMinWidth'](
      { type: 'input', inputType: 'checkbox' },
      { selector: 'input', width: '24px', borderWidth: '2px' },
      [], undefined, undefined, 472, viewport,
    )).toBe(24);
    expect(service['calculateIntrinsicMinWidth'](
      { type: 'input', inputType: 'text', value: 'Search tasks' },
      { selector: 'input', width: '110px' },
      [], undefined, undefined, 198, viewport,
    )).toBe(110);
  });

  it('measures zero-width text as constrained wrapped content', () => {
    const measuredWidths: Array<number | undefined> = [];
    const service = new FlexService(
      new FlexLayoutService(),
      {
        calculateTextDimensions: (_text: string, _style: unknown, maxWidth?: number) => {
          measuredWidths.push(maxWidth);
          return { width: 40, height: 20, lineHeight: 20, lines: [{}, {}, {}] };
        },
      } as never,
      { parseTextProperties: () => ({ fontSize: 16, lineHeight: 1.25 }) } as never,
    );

    const height = service['calculateIntrinsicTextHeight'](
      { type: 'span', textContent: 'Save to History' },
      { selector: 'span' },
      [],
      0,
    );

    expect(measuredWidths).toEqual([0.01]);
    expect(height).toBe(60);
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
    const top = (index: number) => result[index].position.y;

    expect(top(0)).toBe(6);
    expect(top(1)).toBe(6);
    expect(top(2)).toBe(44);
  });

  it('centers an overflowing min-content item with negative free space', () => {
    const service = new FlexService(new FlexLayoutService(), {} as never, {} as never);
    const item: FlexItem = {
      element: { type: 'strong', id: 'overflowing-label' },
      style: { selector: '#overflowing-label' },
      width: 60, height: 42, baseWidth: 60, baseHeight: 42, minWidth: 60,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      flexGrow: 0, flexShrink: 1, flexBasis: 'auto', alignSelf: 'auto', order: 0,
    };
    const padding = { top: 0, right: 17, bottom: 0, left: 17 };
    const flexProps = {
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      flexWrap: 'nowrap', alignContent: 'stretch',
    };
    const container: FlexContainer = {
      width: 80, height: 60, padding, ...flexProps,
      gap: 0, rowGap: 0, columnGap: 0,
    };

    const [result] = service['calculateFlexLayout'](
      [item], container.width, container.height, padding,
      flexProps, {} as BabylonRender, container,
    );

    expect(result.position.x).toBe(10);
    expect(result.size.width).toBe(60);
  });

  it('centers a single-line flex item by its cross-axis margin box', () => {
    const service = new FlexService(new FlexLayoutService(), {} as never, {} as never);
    const item: FlexItem = {
      element: { type: 'span', id: 'label' },
      style: { selector: '#label', marginBottom: '4px' },
      width: 40, height: 20, baseWidth: 40, baseHeight: 20,
      margin: { top: 0, right: 0, bottom: 4, left: 0 },
      flexGrow: 0, flexShrink: 0, flexBasis: 'auto', alignSelf: 'auto', order: 0,
    };
    const padding = { top: 0, right: 0, bottom: 0, left: 0 };
    const flexProps = {
      flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center',
      flexWrap: 'nowrap', alignContent: 'stretch',
    };
    const container: FlexContainer = {
      width: 100, height: 48, padding, ...flexProps,
      gap: 0, rowGap: 0, columnGap: 0,
    };

    const [result] = service['calculateFlexLayout'](
      [item], container.width, container.height, padding,
      flexProps, {} as BabylonRender, container,
    );

    expect(result.position.y).toBe(12);
  });
});
