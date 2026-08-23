import { Mesh } from '@babylonjs/core';

import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { ElementDimensionService } from './element-dimension.service';
import { DOMAncestryService } from '../dom-ancestry.service';
import { ImageLayoutService } from './image-layout.service';

describe('ElementDimensionService', () => {
  it('uses loaded image metadata for an un-sized image border box', () => {
    const service = new ElementDimensionService(
      {} as never,
      {} as never,
      new DOMAncestryService(),
      { getNaturalSize: () => ({ width: 120, height: 80 }) } as never,
      new ImageLayoutService(),
    );
    const parent = { name: 'root-body' } as Mesh;
    const style: StyleRule = {
      selector: '#image',
      display: 'block',
      boxSizing: 'border-box',
      padding: '6px',
      borderWidth: '2px',
    };
    const dom = {
      context: {
        elementDimensions: new Map([['root-body', {
          width: 800,
          height: 600,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        }]]),
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: {
        style: { getElementTypeDefaults: () => ({ display: 'block' }) },
      },
    } as unknown as BabylonRender;

    const result = service.calculateDimensions(
      dom,
      render,
      { type: 'img', id: 'image', src: 'art.svg' },
      style,
      parent,
      [],
    );

    expect(result.width).toBe(136);
    expect(result.height).toBe(96);
  });

  it('applies CSS border-width shorthand per side in the box model', () => {
    const service = new ElementDimensionService({} as never, {} as never, new DOMAncestryService());
    const parent = { name: 'root-body' } as Mesh;
    const style: StyleRule = {
      selector: '#asymmetric-border', display: 'block', boxSizing: 'content-box',
      width: '100px', height: '50px', padding: '10px',
      borderStyle: 'solid', borderWidth: '1px 2px 3px 4px',
    };
    const dom = {
      context: {
        elementDimensions: new Map([['root-body', {
          width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 },
        }]]),
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: { style: { getElementTypeDefaults: () => ({ display: 'block' }) } },
    } as unknown as BabylonRender;

    const result = service.calculateDimensions(
      dom, render, { id: 'asymmetric-border', type: 'div' }, style, parent, [style],
    );

    expect(result.width).toBe(126);
    expect(result.height).toBe(74);
    expect(result.padding).toEqual({ top: 11, right: 12, bottom: 13, left: 14 });
  });

  it('uses the viewport root as the layout parent for fixed elements', () => {
    const service = new ElementDimensionService({} as never, {} as never, new DOMAncestryService());
    const root = { name: 'root-body' } as Mesh;
    const nestedParent = { name: 'nested-parent' } as Mesh;
    const dom = {
      context: { elements: new Map([['root-body', root]]) },
    } as unknown as BabylonDOM;

    expect(service.resolveLayoutParent(dom, { selector: '#fixed', position: 'fixed' }, nestedParent)).toBe(root);
    expect(service.resolveLayoutParent(dom, { selector: '#absolute', position: 'absolute' }, nestedParent)).toBe(nestedParent);
  });

  it('positions fixed elements from right and bottom viewport edges', () => {
    const service = new ElementDimensionService({} as never, {} as never, new DOMAncestryService());
    const parent = { name: 'root-body' } as Mesh;
    const dom = {
      context: {
        elementDimensions: new Map([['root-body', {
          width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 },
        }]]),
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: { style: { getElementTypeDefaults: () => ({ display: 'block' }) } },
    } as unknown as BabylonRender;
    const style: StyleRule = {
      selector: '#fixed', position: 'fixed', right: '-38px', bottom: '26px',
      width: '150px', height: '34px',
    };

    const result = service.calculateDimensions(
      dom, render, { id: 'fixed', type: 'div' }, style, parent, [style],
    );

    expect(result.x).toBe(363);
    expect(result.y).toBe(-257);
  });

  it('fills block width and uses intrinsic text height for auto dimensions', () => {
    const textRendering = {
      calculateTextDimensions: () => ({
        width: 240,
        height: 37,
        lineHeight: 37,
      }),
    };
    const textStyleParser = {
      parseTextProperties: () => ({ fontSize: 32, lineHeight: 1.2 }),
    };
    const service = new ElementDimensionService(
      textRendering as never,
      textStyleParser as never,
      new DOMAncestryService(),
    );
    const parent = { name: 'semantic-card' } as Mesh;
    const style: StyleRule = {
      selector: 'h1',
      display: 'block',
      width: 'auto',
      fontSize: '32px',
      lineHeight: 'normal',
    };
    const dom = {
      context: {
        elementDimensions: new Map([
          ['semantic-card', {
            width: 520,
            height: 300,
            padding: { top: 27, right: 27, bottom: 27, left: 27 },
          }],
        ]),
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: {
        style: {
          getElementTypeDefaults: () => ({ display: 'block' }),
          findStyleForElement: () => style,
        },
      },
    } as unknown as BabylonRender;

    const result = service.calculateDimensions(
      dom,
      render,
      { id: 'heading', type: 'h1', textContent: 'Default heading' },
      style,
      parent,
      [],
    );

    expect(result.width).toBe(466);
    expect(result.height).toBe(37);
  });

  it('measures auto text height at the resolved content width', () => {
    const measuredWidths: Array<number | undefined> = [];
    const textRendering = {
      calculateTextDimensions: (_text: string, _style: unknown, maxWidth?: number) => {
        measuredWidths.push(maxWidth);
        return {
          width: maxWidth ?? 640,
          height: maxWidth === 238 ? 108 : 27,
          lineHeight: 27,
        };
      },
    };
    const textStyleParser = {
      parseTextProperties: () => ({ fontSize: 18, lineHeight: 1.5 }),
    };
    const service = new ElementDimensionService(
      textRendering as never,
      textStyleParser as never,
      new DOMAncestryService(),
    );
    const parent = { name: 'root-body' } as Mesh;
    const style: StyleRule = {
      selector: '#wrapped',
      display: 'block',
      boxSizing: 'border-box',
      width: '280px',
      height: 'auto',
      padding: '18px',
      borderWidth: '3px',
      fontSize: '18px',
      lineHeight: '27px',
    };
    const dom = {
      context: {
        elementDimensions: new Map([
          ['root-body', {
            width: 800,
            height: 600,
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
          }],
        ]),
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: {
        style: {
          getElementTypeDefaults: () => ({ display: 'block' }),
          findStyleForElement: () => style,
        },
      },
    } as unknown as BabylonRender;

    const result = service.calculateDimensions(
      dom,
      render,
      { id: 'wrapped', type: 'p', textContent: 'Text that wraps onto four lines.' },
      style,
      parent,
      [style],
    );

    expect(measuredWidths).toEqual([undefined, 238]);
    expect(result.width).toBe(280);
    expect(result.height).toBe(150);
  });

  it('measures auto text height after applying max-width', () => {
    const measuredWidths: Array<number | undefined> = [];
    const textRendering = {
      calculateTextDimensions: (_text: string, _style: unknown, maxWidth?: number) => {
        measuredWidths.push(maxWidth);
        return {
          width: maxWidth ?? 640,
          height: maxWidth === 186 ? 108 : 27,
          lineHeight: 27,
        };
      },
    };
    const textStyleParser = {
      parseTextProperties: () => ({ fontSize: 18, lineHeight: 1.5 }),
    };
    const service = new ElementDimensionService(
      textRendering as never,
      textStyleParser as never,
      new DOMAncestryService(),
    );
    const parent = { name: 'root-body' } as Mesh;
    const style: StyleRule = {
      selector: '#constrained', display: 'block', boxSizing: 'border-box',
      width: '420px', maxWidth: '220px', height: 'auto', padding: '14px',
      borderWidth: '3px', fontSize: '18px', lineHeight: '27px',
    };
    const dom = {
      context: {
        elementDimensions: new Map([
          ['root-body', { width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 } }],
        ]),
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: {
        style: {
          getElementTypeDefaults: () => ({ display: 'block' }),
          findStyleForElement: () => style,
        },
      },
    } as unknown as BabylonRender;

    const result = service.calculateDimensions(
      dom,
      render,
      { id: 'constrained', type: 'p', textContent: 'Text wrapping at the constrained width.' },
      style,
      parent,
      [style],
    );

    expect(measuredWidths).toEqual([undefined, 186]);
    expect(result.width).toBe(220);
    expect(result.height).toBe(142);
  });

  it('content-sizes an input button without the text-input minimum width', () => {
    const textRendering = {
      calculateTextDimensions: () => ({ width: 76.265625, height: 20, lineHeight: 20 }),
    };
    const textStyleParser = {
      parseTextProperties: () => ({ fontSize: 14, lineHeight: 20 / 14 }),
    };
    const service = new ElementDimensionService(
      textRendering as never,
      textStyleParser as never,
      new DOMAncestryService(),
    );
    const parent = { name: 'root-body' } as Mesh;
    const style: StyleRule = {
      selector: '#action', display: 'block', boxSizing: 'border-box',
      width: 'auto', height: 'auto', padding: '10px 16px', borderWidth: '2px',
      fontSize: '14px', lineHeight: '20px',
    };
    const dom = {
      context: {
        elementDimensions: new Map([
          ['root-body', { width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 } }],
        ]),
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: {
        style: {
          getElementTypeDefaults: () => ({ display: 'block' }),
          findStyleForElement: () => style,
        },
      },
    } as unknown as BabylonRender;

    const result = service.calculateDimensions(
      dom,
      render,
      { id: 'action', type: 'input', inputType: 'button', value: 'Create item' },
      style,
      parent,
      [style],
    );

    expect(result.width).toBe(112.265625);
    expect(result.height).toBe(44);
  });

  it('does not impose a legacy minimum on short inline text', () => {
    const style: StyleRule = {
      selector: '#short-inline', display: 'inline', fontSize: '14px', lineHeight: '21px',
    };
    const service = new ElementDimensionService(
      { calculateTextDimensions: () => ({ width: 32.53125, height: 21, lineHeight: 21 }) } as never,
      { parseTextProperties: () => ({ fontSize: 14, lineHeight: 1.5 }) } as never,
      new DOMAncestryService(),
    );
    const parent = { name: 'root-body' } as Mesh;
    const dom = {
      context: {
        elementDimensions: new Map([['root-body', {
          width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 },
        }]]),
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: { style: {
        getElementTypeDefaults: () => ({ display: 'inline' }),
        findStyleForElement: () => style,
      } },
    } as unknown as BabylonRender;

    const result = service.calculateDimensions(
      dom,
      render,
      { id: 'short-inline', type: 'strong', textContent: 'hello' },
      style,
      parent,
      [style],
    );

    expect(result.width).toBe(32.53125);
  });

  it('derives textarea auto height from rows and line height', () => {
    const textRendering = {
      calculateTextDimensions: () => ({ width: 100, height: 24, lineHeight: 24 }),
    };
    const textStyleParser = {
      parseTextProperties: () => ({ fontSize: 12, lineHeight: 2 }),
    };
    const service = new ElementDimensionService(
      textRendering as never,
      textStyleParser as never,
      new DOMAncestryService(),
    );
    const parent = { name: 'root-body' } as Mesh;
    const style: StyleRule = {
      selector: '#bio', display: 'block', boxSizing: 'border-box',
      width: '260px', height: 'auto', padding: '5px 9px', borderWidth: '1px',
      fontSize: '12px', lineHeight: '24px',
    };
    const dom = {
      context: {
        elementDimensions: new Map([
          ['root-body', { width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 } }],
        ]),
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: {
        style: {
          getElementTypeDefaults: () => ({ display: 'block' }),
          findStyleForElement: () => style,
        },
      },
    } as unknown as BabylonRender;

    const result = service.calculateDimensions(
      dom,
      render,
      { id: 'bio', type: 'textarea', rows: 2, value: '' },
      style,
      parent,
      [style],
    );

    expect(result.width).toBe(260);
    expect(result.height).toBe(60);
  });

  it('adds padding and borders outside explicit content-box dimensions', () => {
    const service = new ElementDimensionService({} as never, {} as never, new DOMAncestryService());
    const parent = { name: 'root-body' } as Mesh;
    const dom = {
      context: {
        elementDimensions: new Map([
          [
            'root-body',
            {
              width: 800,
              height: 600,
              padding: { top: 0, right: 0, bottom: 0, left: 0 },
            },
          ],
        ]),
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: {
        style: {
          getElementTypeDefaults: () => ({ display: 'block' }),
        },
      },
    } as unknown as BabylonRender;
    const element = { id: 'box', type: 'div' } as DOMElement;
    const style: StyleRule = {
      selector: '#box',
      boxSizing: 'content-box',
      left: '100px',
      top: '80px',
      width: '240px',
      height: '120px',
      padding: '20px',
      borderWidth: '4px',
    };

    const result = service.calculateDimensions(
      dom,
      render,
      element,
      style,
      parent,
      [style],
    );

    expect(result.width).toBe(288);
    expect(result.height).toBe(168);
    expect(result.padding).toEqual({ top: 24, right: 24, bottom: 24, left: 24 });
    expect(result.x).toBe(-156);
    expect(result.y).toBe(136);
  });

  it('positions an absolute child from its parent padding-box edge', () => {
    const service = new ElementDimensionService({} as never, {} as never, new DOMAncestryService());
    const parent = { name: 'parent' } as Mesh;
    const dom = {
      context: {
        elementDimensions: new Map([
          ['parent', { width: 420, height: 300, padding: { top: 28, right: 28, bottom: 28, left: 28 } }],
        ]),
        elementStyles: new Map([
          ['parent', { normal: { selector: '#parent', padding: '24px', borderWidth: '4px' } }],
        ]),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: { style: { getElementTypeDefaults: () => ({ display: 'block' }) } },
    } as unknown as BabylonRender;
    const element = { id: 'child', type: 'div' } as DOMElement;
    const style: StyleRule = {
      selector: '#child', position: 'absolute', left: '36px', top: '42px',
      width: '180px', height: '90px', boxSizing: 'border-box'
    };

    const result = service.calculateDimensions(dom, render, element, style, parent, [style]);

    expect(result.x).toBe(-80);
    expect(result.y).toBe(59);
  });

  it('applies maximum width and height constraints', () => {
    const service = new ElementDimensionService({} as never, {} as never, new DOMAncestryService());
    const parent = { name: 'root-body' } as Mesh;
    const dom = {
      context: {
        elementDimensions: new Map([
          ['root-body', { width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 } }],
        ]),
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: { style: { getElementTypeDefaults: () => ({ display: 'block' }) } },
    } as unknown as BabylonRender;
    const style: StyleRule = {
      selector: '#limited', width: '260px', height: '180px',
      maxWidth: '150px', maxHeight: '80px', boxSizing: 'border-box'
    };

    const result = service.calculateDimensions(
      dom,
      render,
      { id: 'limited', type: 'div' },
      style,
      parent,
      [style],
    );

    expect(result.width).toBe(150);
    expect(result.height).toBe(80);
  });

  it('resolves viewport units for dimensions and offsets', () => {
    const service = new ElementDimensionService({} as never, {} as never, new DOMAncestryService());
    const parent = { name: 'root-body' } as Mesh;
    const dom = {
      context: {
        elementDimensions: new Map([
          ['root-body', { width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 } }],
        ]),
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: { style: { getElementTypeDefaults: () => ({ display: 'block' }) } },
    } as unknown as BabylonRender;
    const style: StyleRule = {
      selector: '#viewport-box', position: 'absolute', boxSizing: 'border-box',
      left: '10vw', top: '12vh', width: '30vw', height: '20vh',
    };

    const result = service.calculateDimensions(
      dom,
      render,
      { id: 'viewport-box', type: 'div' },
      style,
      parent,
      [style],
    );

    expect(result.width).toBe(240);
    expect(result.height).toBe(120);
    expect(result.x).toBe(-200);
    expect(result.y).toBe(168);
  });

  it('resolves em and rem dimensions and offsets from their font bases', () => {
    const service = new ElementDimensionService({} as never, {} as never, new DOMAncestryService());
    const parent = { name: 'root-body' } as Mesh;
    const dom = {
      context: {
        elementDimensions: new Map([
          ['root-body', { width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 } }],
        ]),
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: { style: { getElementTypeDefaults: () => ({ display: 'block' }) } },
    } as unknown as BabylonRender;
    const emStyle: StyleRule = {
      selector: '#em-box', position: 'absolute', fontSize: '20px',
      left: '2em', top: '1.5em', width: '12em', height: '5em',
    };
    const remStyle: StyleRule = {
      selector: '#rem-box', position: 'absolute', fontSize: '24px',
      left: '26rem', top: '12rem', width: '14rem', height: '5rem',
    };

    const em = service.calculateDimensions(dom, render, { id: 'em-box', type: 'div' }, emStyle, parent, [emStyle]);
    const rem = service.calculateDimensions(dom, render, { id: 'rem-box', type: 'div' }, remStyle, parent, [remStyle]);

    expect(em.width).toBe(240);
    expect(em.height).toBe(100);
    expect(em.x).toBe(-240);
    expect(em.y).toBe(220);
    expect(rem.width).toBe(224);
    expect(rem.height).toBe(80);
    expect(rem.x).toBe(128);
    expect(rem.y).toBe(68);
  });
});
