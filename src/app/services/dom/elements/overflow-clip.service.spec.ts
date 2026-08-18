import * as BABYLON from '@babylonjs/core';
import { OverflowClipService } from './overflow-clip.service';

describe('OverflowClipService', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let service: OverflowClipService;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    service = new OverflowClipService();
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

    service.apply(parent, { selector: '#parent', overflow: 'hidden' });

    expect(child.material.clipPlane?.asArray()).toEqual([-1, 0, 0, 1]);
    expect(child.material.clipPlane2?.asArray()).toEqual([1, 0, 0, -5]);
    expect(child.material.clipPlane3?.asArray()).toEqual([0, -1, 0, 4]);
    expect(child.material.clipPlane4?.asArray()).toEqual([0, 1, 0, -6]);
  });

  it('leaves descendants unclipped for visible overflow', () => {
    const parent = BABYLON.MeshBuilder.CreatePlane('parent', { width: 4, height: 2 }, scene);
    const child = BABYLON.MeshBuilder.CreatePlane('child', { width: 8, height: 8 }, scene);
    child.parent = parent;
    child.material = new BABYLON.StandardMaterial('child-material', scene);

    service.apply(parent, { selector: '#parent', overflow: 'visible' });

    expect(child.material.clipPlane).toBeUndefined();
  });

  it('clips scroll-container descendants to the stable viewport bounds', () => {
    const parent = BABYLON.MeshBuilder.CreatePlane('parent', { width: 4, height: 2 }, scene);
    const child = BABYLON.MeshBuilder.CreatePlane('child', { width: 4, height: 6 }, scene);
    child.parent = parent;
    child.material = new BABYLON.StandardMaterial('child-material', scene);

    service.apply(parent, { selector: '#parent', overflow: 'auto' });

    expect(child.material.clipPlane?.asArray()).toEqual([-1, 0, 0, -2]);
    expect(child.material.clipPlane2?.asArray()).toEqual([1, 0, 0, -2]);
    expect(child.material.clipPlane3?.asArray()).toEqual([0, -1, 0, -1]);
    expect(child.material.clipPlane4?.asArray()).toEqual([0, 1, 0, -1]);
  });
});
