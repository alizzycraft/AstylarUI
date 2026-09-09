import { Camera, FreeCamera } from '@babylonjs/core';
import { BabylonCameraService } from './babylon-camera.service';

describe('BabylonCameraService', () => {
  it('bounds the clip range around the UI page plane', () => {
    const service = new BabylonCameraService();

    expect(service['calculateUiClipRange'](1040, 600)).toEqual({
      minZ: 440,
      maxZ: 1640,
    });
    expect(service['calculateUiClipRange'](50, 100)).toEqual({
      minZ: 0.1,
      maxZ: 150,
    });
  });

  it('uses the CSS viewport for an orthographic camera regardless of backing-store DPR', () => {
    const service = new BabylonCameraService();
    const camera = {
      mode: Camera.PERSPECTIVE_CAMERA,
      // This is the distance the old implementation derived from the 2x
      // backing-store height. Orthographic CSS bounds must not inherit it.
      position: { z: 1600 / Math.tan(Math.PI / 6) },
      orthoLeft: null,
      orthoRight: null,
      orthoTop: null,
      orthoBottom: null,
    } as unknown as FreeCamera;
    service['camera'] = camera;

    service.updateViewport({
      width: 2400,
      height: 1600,
      clientWidth: 1200,
      clientHeight: 800,
    } as HTMLCanvasElement);

    expect(camera.mode).toBe(Camera.ORTHOGRAPHIC_CAMERA);
    expect(camera.orthoLeft).toBeCloseTo(-600, 8);
    expect(camera.orthoRight).toBeCloseTo(600, 8);
    expect(camera.orthoTop).toBeCloseTo(400, 8);
    expect(camera.orthoBottom).toBeCloseTo(-400, 8);
    const viewport = service.calculateViewportDimensions();
    expect(viewport.width).toBeCloseTo(1200, 8);
    expect(viewport.height).toBeCloseTo(800, 8);
  });
});
