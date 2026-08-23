import { NullEngine, Scene } from '@babylonjs/core';
import { BabylonMeshService } from '../../babylon-mesh.service';
import { RangeManager } from './range.manager';

describe('RangeManager', () => {
  it('normalizes values and updates non-pickable presentation meshes', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const meshes = new BabylonMeshService();
    meshes.initialize(scene);
    const manager = new RangeManager(meshes);
    const range = manager.createRange(
      {
        type: 'input', inputType: 'range', id: 'volume',
        min: '10', max: '20', step: '2', value: '15',
      },
      { scene } as never,
      {} as never,
      { width: 3, height: 0.4 },
    );

    expect(range.value).toBe(16);
    expect(range.mesh.material?.disableDepthWrite).toBeTrue();
    expect(range.trackMesh?.isPickable).toBeFalse();
    expect(range.activeTrackMesh?.isPickable).toBeFalse();
    expect(range.thumbMesh?.isPickable).toBeFalse();
    expect(manager.setFromRatio(range, 0)).toBeTrue();
    expect(range.value).toBe(10);
    expect(manager.setFromRatio(range, 1)).toBeTrue();
    expect(range.value).toBe(20);

    manager.dispose(range);
    scene.dispose();
    engine.dispose();
  });

  it('supports native range keyboard steps and bounds', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const meshes = new BabylonMeshService();
    meshes.initialize(scene);
    const manager = new RangeManager(meshes);
    const range = manager.createRange(
      {
        type: 'input', inputType: 'range', id: 'density',
        min: '-5', max: '0', step: '1', value: '-2',
      },
      { scene } as never,
      {} as never,
      { width: 3, height: 0.4 },
    );

    const right = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
    expect(manager.handleKey(range, right)).toBeTrue();
    expect(right.defaultPrevented).toBeTrue();
    expect(range.value).toBe(-1);
    manager.handleKey(range, new KeyboardEvent('keydown', { key: 'End' }));
    expect(range.value).toBe(0);
    manager.handleKey(range, new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(range.value).toBe(0);

    manager.dispose(range);
    scene.dispose();
    engine.dispose();
  });

  it('keeps two composed range thumbs independent for paired-range applications', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const meshes = new BabylonMeshService();
    meshes.initialize(scene);
    const manager = new RangeManager(meshes);
    const render = { scene } as never;
    const dimensions = { width: 4, height: .5 };
    const start = manager.createRange(
      { type: 'input', inputType: 'range', id: 'price-start', min: '0', max: '100', step: '5', value: '30' },
      render, {} as never, dimensions,
    );
    const end = manager.createRange(
      { type: 'input', inputType: 'range', id: 'price-end', min: '0', max: '100', step: '5', value: '65' },
      render, {} as never, dimensions,
    );

    manager.setFromRatio(start, .4);
    expect(start.value).toBe(40);
    expect(end.value).toBe(65);
    manager.handleKey(end, new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(start.value).toBe(40);
    expect(end.value).toBe(60);
    expect(start.thumbMesh).not.toBe(end.thumbMesh);

    manager.dispose(start);
    manager.dispose(end);
    scene.dispose();
    engine.dispose();
  });

  it('releases private visuals when reconciliation temporarily detaches the owner mesh', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const meshes = new BabylonMeshService();
    meshes.initialize(scene);
    const manager = new RangeManager(meshes);
    const range = manager.createRange(
      { type: 'input', inputType: 'range', id: 'reconciled-range', value: '50' },
      { scene } as never, {} as never, { width: 3, height: .4 },
    );
    const retainedOwner = range.mesh;
    range.mesh = undefined as never;

    expect(() => manager.dispose(range)).not.toThrow();
    expect(retainedOwner.isDisposed()).toBeFalse();

    retainedOwner.dispose();
    scene.dispose();
    engine.dispose();
  });
});
