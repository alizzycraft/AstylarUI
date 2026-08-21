import { Color3, DynamicTexture, Mesh, NullEngine, Scene, Vector3, VertexBuffer } from '@babylonjs/core';

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

  describe('createPolygonBorder', () => {
    it('places each edge of an asymmetric rectangular border at its CSS width', () => {
      const engine = new NullEngine();
      const scene = new Scene(engine);
      const service = new BabylonMeshService();
      service.initialize(scene);

      const [mesh] = service.createPolygonBorder(
        'asymmetric', 'rectangle', 100, 50,
        { top: 1, right: 2, bottom: 3, left: 4 },
      );
      const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
      const inner = Array.from({ length: 4 }, (_, index) => ({
        x: positions[(index + 4) * 3],
        y: positions[(index + 4) * 3 + 1],
      }));

      expect(inner).toEqual([
        { x: -48, y: 24 },
        { x: 46, y: 24 },
        { x: 46, y: -22 },
        { x: -48, y: -22 },
      ]);

      engine.dispose();
    });
  });
});
