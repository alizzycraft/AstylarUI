import { Mesh } from '@babylonjs/core';

import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { ElementDimensionService } from './element-dimension.service';
import { DOMAncestryService } from '../dom-ancestry.service';

describe('ElementDimensionService', () => {
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
});
