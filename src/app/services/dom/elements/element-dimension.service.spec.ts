import { Mesh } from '@babylonjs/core';

import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { ElementDimensionService } from './element-dimension.service';

describe('ElementDimensionService', () => {
  it('adds padding and borders outside explicit content-box dimensions', () => {
    const service = new ElementDimensionService({} as never, {} as never);
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
});
