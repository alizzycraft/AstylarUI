import { GridService } from './grid.service';
import { resolveIntrinsicGridRows } from './grid-track-sizing';
import { FlexService } from './flex.service';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { Mesh } from '@babylonjs/core';
import { StyleRule } from '../../../types/style-rule';

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

  it('expands fixed-count repeat patterns containing complete track functions', () => {
    expect(service.resolveTracks('repeat(2, minmax(100px, 1fr)) 80px', 424, 12, 3))
      .toEqual([160, 160, 80]);
    expect(service.resolveTracks('repeat(2, 54px)', 118, 10, 2))
      .toEqual([54, 54]);
  });

  it('explicitly rejects automatic repeat counts', () => {
    expect(() => service.resolveTracks('repeat(auto-fit, 100px)', 320, 10, 1))
      .toThrowError(/only positive fixed counts are supported/);
  });

  it('explicitly rejects intrinsic minmax bounds without measurable row content', () => {
    expect(() => service.resolveTracks('minmax(min-content, 1fr)', 320, 0, 1))
      .toThrowError(/require measurable, indefinite row sizing/);
  });

  it('sizes auto rows from the largest item contribution in each row', () => {
    expect(resolveIntrinsicGridRows('auto auto', 1, [36, 52]))
      .toEqual([36, 52]);
    expect(resolveIntrinsicGridRows('auto', 2, [24, 40]))
      .toEqual([40]);
  });

  it('sizes non-spanning intrinsic keyword rows from measurable contributions', () => {
    expect(resolveIntrinsicGridRows('min-content max-content', 2, [36, 56, 40, 76]))
      .toEqual([56, 76]);
  });

  it('content-sizes proportional fr rows when the grid block size is indefinite', () => {
    expect(resolveIntrinsicGridRows(
      '40px auto min-content max-content 1fr 2fr',
      1,
      [24, 32, 36, 44, 30, 50],
      { sizeIndefiniteFlexibleTracks: true },
    )).toEqual([40, 32, 36, 44, 30, 60]);
    expect(resolveIntrinsicGridRows('1fr', 1, [30])).toBeNull();
  });

  it('content-sizes intrinsic minmax rows with proportional flexible maxima', () => {
    expect(resolveIntrinsicGridRows(
      'minmax(min-content, 1fr) minmax(auto, 2fr)',
      1,
      [40, 60],
      { sizeIndefiniteFlexibleTracks: true },
    )).toEqual([40, 80]);
  });

  it('stretches auto rows equally after their content bases in a definite size', () => {
    expect(resolveIntrinsicGridRows(
      undefined,
      2,
      [40, 60, 40, 60],
      { availableSize: 182, gap: 10, stretchAutoTracks: true },
    )).toEqual([86, 86]);
  });

  it('creates content-sized implicit auto rows beyond the explicit columns', () => {
    expect(resolveIntrinsicGridRows(undefined, 2, [28, 44, 36, 52, 40]))
      .toEqual([44, 52, 40]);
  });

  it('creates equal implicit tracks when no template is supplied', () => {
    expect(service.resolveTracks(undefined, 220, 10, 2)).toEqual([105, 105]);
  });

  it('honors an authored grid-column span during auto placement', () => {
    const dimensions = new Map<string, any>([['grid', {
      width: 280, height: 80,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    }]]);
    const createElement = jasmine.createSpy('createElement').and.callFake(
      (_dom: unknown, _render: unknown, child: { id?: string }) => {
        const mesh = { name: child.id, metadata: {} } as Mesh;
        dimensions.set(child.id!, { width: 40, height: 40 });
        return mesh;
      },
    );
    const styles = new Map<string, StyleRule>([
      ['grid', { selector: '#grid', display: 'grid', gridTemplateColumns: 'repeat(7, 40px)', gridTemplateRows: 'repeat(2, 40px)', width: '280px', height: '80px' }],
      ['marker', { selector: '#marker', width: '40px', height: '40px', gridColumn: '1 / -1' }],
      ['day', { selector: '#day', width: '40px', height: '40px' }],
    ]);
    const dom = {
      context: { elementStyles: new Map(), elementDimensions: dimensions },
      actions: { createElement, processChildren: jasmine.createSpy('processChildren') },
    } as unknown as BabylonDOM;
    const render = {
      actions: {
        style: { findStyleForElement: (element: { id?: string }) => styles.get(element.id ?? '') },
        camera: { getPixelToWorldScale: () => 1 },
        mesh: { positionTextMesh: jasmine.createSpy('positionTextMesh') },
      },
    } as unknown as BabylonRender;

    service.processGridChildren(
      dom,
      render,
      [{ type: 'span', id: 'marker' }, { type: 'button', id: 'day' }],
      { name: 'grid' } as Mesh,
      [],
      { type: 'div', id: 'grid' },
    );

    expect(createElement.calls.argsFor(0)[5]).toEqual({ x: 0, y: 0, z: 0.1 });
    expect(createElement.calls.argsFor(1)[5]).toEqual({ x: 0, y: 40, z: 0.11 });
  });

  it('honors explicit grid-row and grid-column line placement', () => {
    const dimensions = new Map<string, any>([['grid', {
      width: 120, height: 80,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    }]]);
    const createElement = jasmine.createSpy('createElement').and.callFake(
      (_dom: unknown, _render: unknown, child: { id?: string }) => {
        const mesh = { name: child.id, metadata: {} } as Mesh;
        dimensions.set(child.id!, { width: 80, height: 40 });
        return mesh;
      },
    );
    const styles = new Map<string, StyleRule>([
      ['grid', { selector: '#grid', display: 'grid', gridTemplateColumns: 'repeat(3, 40px)', gridTemplateRows: 'repeat(2, 40px)', width: '120px', height: '80px' }],
      ['item', { selector: '#item', width: '80px', height: '40px', gridColumn: '2 / span 2', gridRow: '2' }],
    ]);
    const dom = {
      context: { elementStyles: new Map(), elementDimensions: dimensions },
      actions: { createElement, processChildren: jasmine.createSpy('processChildren') },
    } as unknown as BabylonDOM;
    const render = {
      actions: {
        style: { findStyleForElement: (element: { id?: string }) => styles.get(element.id ?? '') },
        camera: { getPixelToWorldScale: () => 1 },
        mesh: { positionTextMesh: jasmine.createSpy('positionTextMesh') },
      },
    } as unknown as BabylonRender;

    service.processGridChildren(
      dom,
      render,
      [{ type: 'div', id: 'item' }],
      { name: 'grid' } as Mesh,
      [],
      { type: 'div', id: 'grid' },
    );

    expect(createElement.calls.argsFor(0)[5]).toEqual({ x: 40, y: 40, z: 0.1 });
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

  it('resizes an unassigned height-auto grid to its intrinsic rows', () => {
    const measuredService = new GridService({
      measureIntrinsicFlowChildOuterHeight: () => 74,
    } as unknown as FlexService);
    const updateMesh = jasmine.createSpy('updateMeshWithBorderRadius');
    const parent = { name: 'grid', metadata: {}, position: { y: 0 } } as Mesh;
    const dimensions = {
      width: 280,
      height: 400,
      padding: { top: 14, right: 14, bottom: 14, left: 14 },
    };
    const childMesh = { name: 'card', metadata: {} } as Mesh;
    const dom = {
      context: {
        elementStyles: new Map(),
        elementDimensions: new Map<string, any>([
          ['grid', dimensions],
          ['card', { width: 252, height: 74 }],
        ]),
      },
      actions: {
        createElement: () => childMesh,
        processChildren: jasmine.createSpy('processChildren'),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: {
        style: {
          findStyleForElement: (element: { id?: string }) => element.id === 'grid'
            ? { selector: '#grid', display: 'grid', gridTemplateColumns: '252px', gridTemplateRows: 'auto', height: 'auto' }
            : { selector: '#card', height: 'auto' },
        },
        camera: { getPixelToWorldScale: () => 1 },
        mesh: {
          updateMeshWithBorderRadius: updateMesh,
          positionTextMesh: jasmine.createSpy('positionTextMesh'),
        },
      },
    } as unknown as BabylonRender;

    measuredService.processGridChildren(
      dom,
      render,
      [{ type: 'article', id: 'card' }],
      parent,
      [],
      { type: 'section', id: 'grid' },
    );

    expect(dimensions.height).toBe(102);
    expect(parent.position.y).toBe(149);
    expect(updateMesh).toHaveBeenCalled();
  });

  it('preserves a definite item height and aligns it at the start of a taller row', () => {
    const firstMesh = { name: 'first', metadata: {} } as Mesh;
    const secondMesh = { name: 'second', metadata: {} } as Mesh;
    const dimensions = new Map<string, unknown>([
      ['grid', {
        width: 372, height: 72,
        padding: { top: 12, right: 12, bottom: 12, left: 12 },
      }],
    ]);
    const createElement = jasmine.createSpy('createElement').and.callFake(
      (_dom: unknown, _render: unknown, child: { id?: string }) => {
        const height = child.id === 'first' ? 28 : 44;
        dimensions.set(child.id!, {
          width: child.id === 'first' ? 150 : 180,
          height,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        });
        return child.id === 'first' ? firstMesh : secondMesh;
      },
    );
    const positionTextMesh = jasmine.createSpy('positionTextMesh');
    const dom = {
      context: { elementStyles: new Map(), elementDimensions: dimensions },
      actions: { createElement, processChildren: jasmine.createSpy('processChildren') },
    } as unknown as BabylonDOM;
    const resolved = new Map([
      ['grid', {
        selector: '#grid', display: 'grid', gridTemplateColumns: '150px 180px',
        columnGap: '14px', gridTemplateRows: 'auto', height: '72px',
      }],
      ['first', { selector: '#first', width: 'auto', height: '28px' }],
      ['second', { selector: '#second', width: 'auto', height: '44px' }],
    ]);
    const render = {
      actions: {
        style: { findStyleForElement: (element: { id?: string }) => resolved.get(element.id ?? '') },
        camera: { getPixelToWorldScale: () => 1 },
        mesh: { positionTextMesh },
      },
    } as unknown as BabylonRender;

    service.processGridChildren(
      dom,
      render,
      [{ type: 'div', id: 'first' }, { type: 'div', id: 'second' }],
      { name: 'grid' } as Mesh,
      [],
      { type: 'section', id: 'grid' },
    );

    expect(createElement.calls.argsFor(0)[6]).toEqual({ width: 150, height: undefined });
    expect(firstMesh.metadata.astylarGridAssignedSize).toEqual({ width: 150, height: 28 });
    expect(positionTextMesh.calls.argsFor(0).slice(1, 3)).toEqual([-99, 10]);
  });
});
