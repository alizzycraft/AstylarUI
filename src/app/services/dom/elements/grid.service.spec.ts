import { GridService } from './grid.service';
import { resolveIntrinsicGridRows } from './grid-track-sizing';
import { FlexService } from './flex.service';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { Mesh } from '@babylonjs/core';

describe('GridService', () => {
  const service = new GridService();

  it('allocates remaining track space across fr units after fixed tracks and gaps', () => {
    expect(service.resolveTracks('160px 1fr', 460, 20, 2)).toEqual([160, 280]);
    expect(service.resolveTracks('1fr 2fr', 320, 20, 2)).toEqual([100, 200]);
  });

  it('resolves percentage tracks against the content box before subtracting gaps', () => {
    expect(service.resolveTracks('40% 1fr', 460, 20, 2)).toEqual([184, 256]);
  });

  it('keeps a flexible minmax track above its definite minimum', () => {
    expect(service.resolveTracks('minmax(260px, 1fr) 1fr', 460, 20, 2))
      .toEqual([260, 180]);
  });

  it('sizes auto rows from the largest item contribution in each row', () => {
    expect(resolveIntrinsicGridRows('auto auto', 1, [36, 52]))
      .toEqual([36, 52]);
    expect(resolveIntrinsicGridRows('auto', 2, [24, 40]))
      .toEqual([40]);
  });

  it('creates equal implicit tracks when no template is supplied', () => {
    expect(service.resolveTracks(undefined, 220, 10, 2)).toEqual([105, 105]);
  });

  it('marks a grid item track size as definite before nested layout', () => {
    const childMesh = { metadata: {} } as Mesh;
    const processChildren = jasmine.createSpy('processChildren').and.callFake(() => {
      expect(childMesh.metadata.astylarGridAssignedSize).toEqual({ width: 200, height: 120 });
    });
    const dom = {
      context: {
        elementStyles: new Map(),
        elementDimensions: new Map([['grid', {
          width: 200, height: 120,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        }]]),
      },
      actions: {
        createElement: () => childMesh,
        processChildren,
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: {
        style: {
          findStyleForElement: (element: { id?: string }) => element.id === 'grid'
            ? { selector: '#grid', display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: '120px' }
            : { selector: '#item', display: 'flex' },
        },
      },
    } as unknown as BabylonRender;

    service.processGridChildren(
      dom,
      render,
      [{ type: 'article', id: 'item', children: [{ type: 'span', id: 'label' }] }],
      { name: 'grid' } as Mesh,
      [],
      { type: 'section', id: 'grid' },
    );

    expect(processChildren).toHaveBeenCalled();
  });

  it('uses recursive flex measurement for a nested auto-row contribution', () => {
    const intrinsic = jasmine.createSpy('measureIntrinsicFlowChildOuterHeight').and.returnValue(74);
    const measuredService = new GridService({
      measureIntrinsicFlowChildOuterHeight: intrinsic,
    } as unknown as FlexService);
    const childMesh = { metadata: {} } as Mesh;
    const createElement = jasmine.createSpy('createElement').and.returnValue(childMesh);
    const dom = {
      context: {
        elementStyles: new Map(),
        elementDimensions: new Map([['grid', {
          width: 280, height: 102,
          padding: { top: 14, right: 14, bottom: 14, left: 14 },
        }]]),
      },
      actions: { createElement, processChildren: jasmine.createSpy('processChildren') },
    } as unknown as BabylonDOM;
    const render = {
      actions: {
        style: {
          findStyleForElement: (element: { id?: string }) => element.id === 'grid'
            ? { selector: '#grid', display: 'grid', gridTemplateColumns: '252px', gridTemplateRows: 'auto' }
            : { selector: '#card', display: 'flex', height: 'auto' },
        },
      },
    } as unknown as BabylonRender;

    measuredService.processGridChildren(
      dom,
      render,
      [{ type: 'article', id: 'card' }],
      { name: 'grid' } as Mesh,
      [],
      { type: 'section', id: 'grid' },
    );

    expect(intrinsic).toHaveBeenCalled();
    expect(createElement.calls.mostRecent().args[6]).toEqual({ width: 252, height: 74 });
  });
});
