import { TestBed } from '@angular/core/testing';
import { NullEngine, MeshBuilder, Scene, StandardMaterial } from '@babylonjs/core';
import type { AstylarSurface } from 'astylarui';
import { MaterialRippleController } from './material-ripple.controller';

describe('MaterialRippleController', () => {
  it('starts at the pointer origin, replaces an active ripple, and disposes its resources', () => {
    TestBed.configureTestingModule({ providers: [MaterialRippleController] });
    const controller = TestBed.inject(MaterialRippleController);
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const button = MeshBuilder.CreatePlane('button', { width: 1.41, height: .4 }, scene);
    const buttonMaterial = new StandardMaterial('button-material', scene);
    button.material = buttonMaterial;
    button.metadata = { elementId: 'button-primary', element: { id: 'button-primary' }, isTextMesh: false };
    const surface = { scene } as AstylarSurface;
    void scene.defaultMaterial;
    const baseline = { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length };

    controller.activate({
      surface, elementId: 'button-primary', originX: 18, originY: 20,
      width: 141, height: 40, cornerRadius: 20, color: '#ffffff',
    });
    expect(scene.meshes.find((mesh) => mesh.metadata?.showcaseMaterialVisual === 'ripple')?.metadata)
      .toEqual(jasmine.objectContaining({ elementId: 'button-primary', originX: 18, originY: 20 }));
    const resourceCounts = { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length };

    controller.activate({
      surface, elementId: 'button-primary', originX: 122, originY: 20,
      width: 141, height: 40, cornerRadius: 20, color: '#ffffff',
    });
    expect({ meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length })
      .toEqual(resourceCounts);
    expect(scene.meshes.find((mesh) => mesh.metadata?.showcaseMaterialVisual === 'ripple')?.metadata)
      .toEqual(jasmine.objectContaining({ originX: 122, originY: 20 }));

    controller.dispose();
    expect(scene.meshes).toEqual([button]);
    expect({ meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length })
      .toEqual(baseline);
    scene.dispose();
    engine.dispose();
  });
});
