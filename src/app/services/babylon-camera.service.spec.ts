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
});
