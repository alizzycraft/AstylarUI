import { GridService } from './grid.service';
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
});
