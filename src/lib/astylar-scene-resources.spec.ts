import { DynamicTexture, MeshBuilder, NullEngine, Scene, StandardMaterial } from '@babylonjs/core';
import { AstylarSceneResources } from './astylar-scene-resources';

describe('AstylarSceneResources', () => {
  let engine: NullEngine;
  let scene: Scene;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
  });

  afterEach(() => engine.dispose());

  it('replaces owned resources without disposing pre-existing scene content', () => {
    const externalMesh = MeshBuilder.CreatePlane('external', {}, scene);
    const resources = new AstylarSceneResources(scene);
    let oldMesh = MeshBuilder.CreatePlane('placeholder', {}, scene);
    oldMesh.dispose();
    let oldTexture: DynamicTexture | undefined;

    resources.replace(() => {
      oldMesh = MeshBuilder.CreatePlane('first', {}, scene);
      oldMesh.material = new StandardMaterial('first-material', scene);
      oldTexture = new DynamicTexture('first-texture', 32, scene);
    });
    expect(resources.snapshot).toEqual({ meshes: 1, materials: 1, textures: 1 });

    const firstMesh = oldMesh;
    const firstTexture = oldTexture;
    resources.replace(() => {
      firstTexture?.dispose();
      oldMesh = MeshBuilder.CreatePlane('second', {}, scene);
      oldMesh.material = new StandardMaterial('second-material', scene);
      oldTexture = new DynamicTexture('second-texture', 32, scene);
    });

    expect(firstMesh.isDisposed()).toBeTrue();
    expect(externalMesh.isDisposed()).toBeFalse();
    expect(resources.snapshot).toEqual({ meshes: 1, materials: 1, textures: 1 });

    resources.dispose();
    expect(oldMesh.isDisposed()).toBeTrue();
    expect(externalMesh.isDisposed()).toBeFalse();
    expect(resources.snapshot).toEqual({ meshes: 0, materials: 0, textures: 0 });
  });

  it('disposes replaced textures while preserving explicitly retained session textures', () => {
    const resources = new AstylarSceneResources(scene);
    const retained = new DynamicTexture('retained', 32, scene);
    let perRender = new DynamicTexture('first-render', 32, scene);

    resources.replace(() => undefined);
    resources.replace(() => {
      perRender = new DynamicTexture('second-render', 32, scene);
    }, new Set([retained]));

    expect(scene.textures).toContain(retained);
    expect(scene.textures).toContain(perRender);
    expect(resources.snapshot.textures).toBe(2);

    resources.replace(() => {
      perRender = new DynamicTexture('third-render', 32, scene);
    }, new Set([retained]));

    expect(scene.textures).toContain(retained);
    expect(scene.textures).toContain(perRender);
    expect(resources.snapshot.textures).toBe(2);
  });
});
