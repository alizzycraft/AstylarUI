import { Mesh, NullEngine, Scene } from '@babylonjs/core';
import { positionRenderedCssBox, projectCssLength, projectCssSize } from './css-render-boundary';
import { CssBabylonProjection } from './css-babylon-projection';
import { BabylonRender } from './dom/interfaces/render.types';

describe('CSS render boundary', () => {
  it('projects resolved CSS geometry only when painting it', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const projection = new CssBabylonProjection({ width: 800, height: 600 }, 0.25);
    const mesh = new Mesh('box', scene);
    const positionTextMesh = jasmine.createSpy('positionTextMesh')
      .and.callFake((target: Mesh, x: number, y: number, z: number) => {
        target.position.set(x, y, z);
      });
    const render = {
      actions: {
        camera: {
          projectCssLength: (value: number) => projection.projectSize({ width: value, height: 0 }).width,
          projectCssSize: (size: { width: number; height: number }) => projection.projectSize(size),
          projectCssLocalPoint: (point: { x: number; y: number }, depth = 0) =>
            projection.projectLocalPoint(point, depth),
        },
        mesh: { positionTextMesh },
      },
      scene,
    } as unknown as BabylonRender;

    expect(projectCssLength(render, 7.5)).toBeCloseTo(1.875, 8);
    expect(projectCssSize(render, { width: 12.5, height: 9.25 })).toEqual({
      width: 3.125,
      height: 2.3125,
    });

    positionRenderedCssBox(
      render,
      mesh,
      { x: 10.25, y: 20.5, width: 30.5, height: 40.25 },
      { width: 100.5, height: 90.75 },
      0.4,
    );

    expect(positionTextMesh).toHaveBeenCalledWith(
      mesh,
      jasmine.any(Number),
      jasmine.any(Number),
      0.4,
    );
    expect(mesh.position.x).toBeCloseTo(-6.1875, 8);
    expect(mesh.position.y).toBeCloseTo(1.1875, 8);
    engine.dispose();
  });
});
