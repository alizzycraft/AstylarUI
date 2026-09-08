import {
  Camera,
  FreeCamera,
  Matrix,
  NullEngine,
  Scene,
  Vector3,
  Viewport,
} from '@babylonjs/core';
import { CssBabylonProjection } from './css-babylon-projection';

describe('CssBabylonProjection', () => {
  it('projects an asymmetric CSS point onto the expected render point', () => {
    const projection = new CssBabylonProjection(
      { width: 800, height: 600 },
      0.5,
    );

    expect(projection.projectViewportPoint({ x: 100.25, y: 200.75 }, 3)).toEqual({
      x: -149.875,
      y: 49.625,
      z: 3,
    });
  });

  it('projects a CSS rectangle without changing its visible bounds', () => {
    const projection = new CssBabylonProjection(
      { width: 800, height: 600 },
      2,
    );

    expect(projection.projectRect({ x: 10, y: 20, width: 100, height: 50 })).toEqual({
      center: { x: -680, y: 510, z: 0 },
      size: { width: 200, height: 100 },
    });
  });

  it('round-trips fractional viewport and element-local points', () => {
    for (const scale of [0.25, 1, 1.75]) {
      const projection = new CssBabylonProjection(
        { width: 913.5, height: 617.25 },
        scale,
      );
      const viewportPoint = { x: 713.125, y: 81.875 };
      const localPoint = { x: 31.375, y: 47.625 };

      const viewportRoundTrip = projection.unprojectViewportPoint(
        projection.projectViewportPoint(viewportPoint),
      );
      const localRoundTrip = projection.unprojectLocalPoint(
        projection.projectLocalPoint(localPoint),
      );

      expect(viewportRoundTrip.x).toBeCloseTo(viewportPoint.x, 10);
      expect(viewportRoundTrip.y).toBeCloseTo(viewportPoint.y, 10);
      expect(localRoundTrip.x).toBeCloseTo(localPoint.x, 10);
      expect(localRoundTrip.y).toBeCloseTo(localPoint.y, 10);
    }
  });

  it('composes nesting in CSS space before the final projection', () => {
    const projection = new CssBabylonProjection(
      { width: 800, height: 600 },
      1,
    );
    const parent = { x: 137.5, y: 64.25 };
    const childLocal = { x: 31.75, y: 22.5 };

    const nested = projection.projectViewportPoint({
      x: parent.x + childLocal.x,
      y: parent.y + childLocal.y,
    });

    expect(nested).toEqual({ x: -230.75, y: 213.25, z: 0 });
  });

  it('keeps CSS +X screen-right when the camera observes from negative Z', () => {
    const engine = new NullEngine({
      renderWidth: 800,
      renderHeight: 600,
      textureSize: 512,
      deterministicLockstep: false,
      lockstepMaxSteps: 4,
    });
    const scene = new Scene(engine);
    const camera = new FreeCamera('css-camera', new Vector3(0, 0, -600), scene);
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.orthoLeft = -400;
    camera.orthoRight = 400;
    camera.orthoTop = 300;
    camera.orthoBottom = -300;
    camera.setTarget(Vector3.Zero());
    scene.activeCamera = camera;
    scene.render();

    const viewport = new Viewport(0, 0, 800, 600);
    const left = Vector3.Project(
      new Vector3(-100, 0, 0),
      Matrix.IdentityReadOnly,
      scene.getTransformMatrix(),
      viewport,
    );
    const right = Vector3.Project(
      new Vector3(100, 0, 0),
      Matrix.IdentityReadOnly,
      scene.getTransformMatrix(),
      viewport,
    );

    expect(right.x).toBeGreaterThan(left.x);
    scene.dispose();
    engine.dispose();
  });
});
