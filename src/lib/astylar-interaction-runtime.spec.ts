import { MeshBuilder, NullEngine, Scene } from '@babylonjs/core';
import { resolveCanvasPointerX, selectElementProjectionMesh } from './astylar-interaction-runtime';

describe('AstylarInteractionRuntime projection geometry', () => {
  it('prefers the authored element plane over renderer-owned descendants', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const descendant = MeshBuilder.CreatePlane('slider-primary-range', {}, scene);
      descendant.metadata = { elementId: 'slider-primary', element: { id: 'slider-primary' } };
      const authored = MeshBuilder.CreatePlane('slider-primary', {}, scene);
      authored.metadata = { elementId: 'slider-primary', element: { id: 'slider-primary' } };

      expect(selectElementProjectionMesh(scene.meshes, 'slider-primary')).toBe(authored);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });

  it('uses client coordinates relative to the canvas instead of target-relative offsetX', () => {
    expect(resolveCanvasPointerX({ clientX: 533, offsetX: 0 }, { left: 65 })).toBe(468);
  });
});
