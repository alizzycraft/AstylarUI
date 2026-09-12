import * as BABYLON from '@babylonjs/core';
import { OverflowClipService } from './overflow-clip.service';
import type { StyleRule } from '../../../types/style-rule';
import { createCssLayoutBox } from '../../css-layout-geometry';
import { StyleDefaultsService } from '../style-defaults.service';
import type { CssLayoutNode, CssPoint } from '../../coordinate-space.types';

describe('OverflowClipService', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let service: OverflowClipService;
  let layoutBoxes: Map<string, CssLayoutNode>;
  const projectViewportPoint = (point: CssPoint) => ({
    x: point.x - 5,
    y: 6 - point.y,
    z: 0,
  });

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    service = new OverflowClipService();
    layoutBoxes = new Map();
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('adds four world-space clipping planes to descendant materials', () => {
    const parent = BABYLON.MeshBuilder.CreatePlane('parent', { width: 4, height: 2 }, scene);
    parent.position.set(3, 5, 0);
    const child = BABYLON.MeshBuilder.CreatePlane('child', { width: 8, height: 8 }, scene);
    child.parent = parent;
    child.material = new BABYLON.StandardMaterial('child-material', scene);
    layoutBoxes.set('parent', {
      parentId: null,
      box: createCssLayoutBox({ x: 6, y: 0, width: 4, height: 2 }),
    });
    spyOn(parent, 'getBoundingInfo').and.throwError('layout must not read mesh bounds');

    service.apply(parent, { selector: '#parent', overflow: 'hidden' }, layoutBoxes, projectViewportPoint);

    expect(child.material.clipPlane?.asArray()).toEqual([-1, 0, 0, 1]);
    expect(child.material.clipPlane2?.asArray()).toEqual([1, 0, 0, -5]);
    expect(child.material.clipPlane3?.asArray()).toEqual([0, -1, 0, 4]);
    expect(child.material.clipPlane4?.asArray()).toEqual([0, 1, 0, -6]);
  });

  it('retains a rounded overflow boundary for descendant fragment clipping', () => {
    const parent = BABYLON.MeshBuilder.CreatePlane('parent', { width: 4, height: 2 }, scene);
    parent.position.set(3, 5, 0);
    parent.metadata = { astylarBorderRadiusWorld: 0.5 };
    const child = BABYLON.MeshBuilder.CreatePlane('child', { width: 8, height: 8 }, scene);
    child.parent = parent;
    child.material = new BABYLON.StandardMaterial('child-material', scene);
    layoutBoxes.set('parent', {
      parentId: null,
      box: createCssLayoutBox({ x: 6, y: 0, width: 4, height: 2 }),
    });

    service.apply(
      parent,
      { selector: '#parent', overflow: 'hidden', borderRadius: '10px' },
      layoutBoxes,
      projectViewportPoint,
    );

    expect(child.metadata?.['astylarOverflowClipRegions']).toEqual([{
      minX: 1,
      maxX: 5,
      minY: 4,
      maxY: 6,
      radius: 0.5,
    }]);
    expect(child.material.pluginManager?.getPlugin('AstylarRoundedOverflowClip')).toBeTruthy();
  });

  it('leaves descendants unclipped for visible overflow', () => {
    const parent = BABYLON.MeshBuilder.CreatePlane('parent', { width: 4, height: 2 }, scene);
    const child = BABYLON.MeshBuilder.CreatePlane('child', { width: 8, height: 8 }, scene);
    child.parent = parent;
    child.material = new BABYLON.StandardMaterial('child-material', scene);

    service.apply(parent, { selector: '#parent', overflow: 'visible' }, layoutBoxes, projectViewportPoint);

    expect(child.material.clipPlane).toBeUndefined();
  });

  it('omitted and visible overflow take the same unclipped branch without projecting geometry', () => {
    const defaults = new StyleDefaultsService();
    for (const type of ['div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'span', 'p', 'label']) {
      expect(defaults.getElementTypeDefaults(type).overflow).toBeUndefined();
    }
    for (const overflow of [undefined, 'visible'] as const) {
      const parent = BABYLON.MeshBuilder.CreatePlane(`parent-${overflow}`, { width: 4, height: 2 }, scene);
      const child = BABYLON.MeshBuilder.CreatePlane(`child-${overflow}`, { width: 8, height: 8 }, scene);
      child.parent = parent;
      child.material = new BABYLON.StandardMaterial(`material-${overflow}`, scene);
      const project = jasmine.createSpy('project').and.throwError('visible overflow must not project a clipping boundary');
      const style: StyleRule = { ...defaults.getElementTypeDefaults('div'), selector: '#parent',
        ...(overflow ? { overflow } : {}) };
      service.apply(parent, style, layoutBoxes, project);
      expect(project).not.toHaveBeenCalled();
      expect(child.material.clipPlane).toBeUndefined();
      expect(child.material.clipPlane2).toBeUndefined();
      expect(child.material.clipPlane3).toBeUndefined();
      expect(child.material.clipPlane4).toBeUndefined();
      expect(child.metadata?.['astylarOverflowClipRegions']).toBeUndefined();
    }
  });

  it('clips scroll-container descendants to the stable viewport bounds', () => {
    const parent = BABYLON.MeshBuilder.CreatePlane('parent', { width: 4, height: 2 }, scene);
    const child = BABYLON.MeshBuilder.CreatePlane('child', { width: 4, height: 6 }, scene);
    child.parent = parent;
    child.material = new BABYLON.StandardMaterial('child-material', scene);
    layoutBoxes.set('parent', {
      parentId: null,
      box: createCssLayoutBox({ x: 3, y: 5, width: 4, height: 2 }),
    });

    service.apply(parent, { selector: '#parent', overflow: 'auto' }, layoutBoxes, projectViewportPoint);

    expect(child.material.clipPlane?.asArray()).toEqual([-1, 0, 0, -2]);
    expect(child.material.clipPlane2?.asArray()).toEqual([1, 0, 0, -2]);
    expect(child.material.clipPlane3?.asArray()).toEqual([0, -1, 0, -1]);
    expect(child.material.clipPlane4?.asArray()).toEqual([0, 1, 0, -1]);
  });

  it('refreshes nested clip intersections after normal-flow layout moves a container', () => {
    const outer = BABYLON.MeshBuilder.CreatePlane('outer', { width: 10, height: 10 }, scene);
    const inner = BABYLON.MeshBuilder.CreatePlane('inner', { width: 6, height: 4 }, scene);
    inner.parent = outer;
    inner.material = new BABYLON.StandardMaterial('inner-material', scene);
    const child = BABYLON.MeshBuilder.CreatePlane('child', { width: 8, height: 8 }, scene);
    child.parent = inner;
    child.material = new BABYLON.StandardMaterial('child-material', scene);
    const outerStyle: StyleRule = { selector: '#outer', overflow: 'auto' };
    const innerStyle: StyleRule = { selector: '#inner', overflow: 'auto' };
    layoutBoxes.set('outer', {
      parentId: null,
      box: createCssLayoutBox({ x: 0, y: 1, width: 10, height: 10 }),
    });
    layoutBoxes.set('inner', {
      parentId: 'outer',
      box: createCssLayoutBox({ x: 2, y: 3, width: 6, height: 4 }),
    });

    service.apply(outer, outerStyle, layoutBoxes, projectViewportPoint);
    service.apply(inner, innerStyle, layoutBoxes, projectViewportPoint);
    layoutBoxes.set('inner', {
      parentId: 'outer',
      box: createCssLayoutBox({ x: 2, y: 0, width: 6, height: 4 }),
    });
    service.refresh([
      { mesh: outer, style: outerStyle },
      { mesh: inner, style: innerStyle },
    ], layoutBoxes, projectViewportPoint);

    expect(child.material.clipPlane3?.asArray()).toEqual([0, -1, 0, 1]);
    expect(child.material.clipPlane4?.asArray()).toEqual([0, 1, 0, -5]);
  });
});
