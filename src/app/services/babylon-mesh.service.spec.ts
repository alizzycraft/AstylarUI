import { Color3, DynamicTexture, Mesh, NullEngine, Scene, Vector3 } from '@babylonjs/core';

import { BabylonMeshService } from './babylon-mesh.service';

describe('BabylonMeshService', () => {
  describe('positionTextMesh', () => {
    it('converts logical coordinates to Babylon render coordinates', () => {
      const service = new BabylonMeshService();
      const mesh = {
        name: 'positioned-mesh',
        position: new Vector3(),
      } as Mesh;

      service.positionTextMesh(mesh, -180, 220, 0.5);

      expect(mesh.position.asArray()).toEqual([180, 220, 0.5]);
    });
  });

  describe('createMaterial', () => {
    it('renders CSS colors consistently without lighting or face orientation', () => {
      const engine = new NullEngine();
      const scene = new Scene(engine);
      const service = new BabylonMeshService();
      service.initialize(scene);
      const color = Color3.FromHexString('#dbeafe');

      const material = service.createMaterial('css-color', color);

      expect(material.diffuseColor.equals(color)).toBeTrue();
      expect(material.emissiveColor.equals(color)).toBeTrue();
      expect(material.disableLighting).toBeTrue();
      expect(material.backFaceCulling).toBeFalse();

      engine.dispose();
    });
  });

  describe('createTextMesh', () => {
    it('keeps text in the depth-tested render group for stacking-context occlusion', () => {
      const engine = new NullEngine();
      const scene = new Scene(engine);
      const service = new BabylonMeshService();
      service.initialize(scene);
      const texture = new DynamicTexture('text', { width: 16, height: 16 }, scene);

      const mesh = service.createTextMesh('text-plane', texture, 1, 1);

      expect(mesh.renderingGroupId).toBe(0);

      engine.dispose();
    });
  });
});
