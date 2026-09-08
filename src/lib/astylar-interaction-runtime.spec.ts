import {
  MeshBuilder,
  NullEngine,
  PointerEventTypes,
  type PointerInfo,
  Scene,
} from '@babylonjs/core';
import {
  AstylarInteractionRuntime,
  resolveCanvasPointerPoint,
  resolveCanvasPointerX,
  selectElementProjectionMesh,
} from './astylar-interaction-runtime';

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

  it('resolves both pointer axes in canvas CSS pixels', () => {
    expect(resolveCanvasPointerPoint(
      { clientX: 533.25, clientY: 219.75, offsetX: 0, offsetY: 0 },
      { left: 65.5, top: 19.25 },
    )).toEqual({ x: 467.75, y: 200.5 });
  });

  it('maps range input through retained CSS geometry without reading mesh bounds', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const canvas = document.createElement('canvas');
    const mesh = MeshBuilder.CreatePlane('range', { width: 900, height: 300 }, scene);
    mesh.metadata = { elementId: 'range' };
    const rangeCalls: Array<[string, number, number]> = [];
    spyOn(canvas, 'getBoundingClientRect').and.returnValue({
      left: 25, top: 10, width: 800, height: 600,
      right: 825, bottom: 610, x: 25, y: 10, toJSON: () => ({}),
    });
    spyOn(mesh, 'getBoundingInfo').and.throwError(
      'interaction geometry must not be reconstructed from Babylon bounds',
    );
    const runtime = new AstylarInteractionRuntime(
      scene,
      { styles: [], root: { children: [{ type: 'input', inputType: 'range', id: 'range' }] } },
      {},
      undefined,
      {
        getFocusedElementId: () => undefined,
        focus: () => true,
        blur: () => true,
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
        setRangeFromPointer: (id: string, localX: number, width: number) => {
          rangeCalls.push([id, localX, width]);
          return true;
        },
      } as never,
      canvas,
      {
        scrollFrom: () => false,
        isPointVisible: () => true,
        getViewportRect: () => ({ x: 100.25, y: 40.5, width: 200.5, height: 24 }),
      },
    );
    try {
      scene.onPointerObservable.notifyObservers({
        type: PointerEventTypes.POINTERDOWN,
        event: new MouseEvent('pointerdown', { clientX: 175.75, clientY: 70 }),
        pickInfo: { hit: true, pickedMesh: mesh },
      } as unknown as PointerInfo);

      // Native MouseEvent client coordinates are integer CSS pixels in this browser;
      // the retained fractional target origin and width must still be preserved.
      expect(rangeCalls).toEqual([['range', 49.75, 200.5]]);
    } finally {
      runtime.dispose();
      scene.dispose();
      engine.dispose();
    }
  });
});
