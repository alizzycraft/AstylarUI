import { RawTexture, Scene, Texture } from '@babylonjs/core';
import { ImageResourceService } from './image-resource.service';

describe('ImageResourceService', () => {
  it('publishes natural metadata once for the current scene resource', () => {
    const service = new ImageResourceService();
    const scene = {} as Scene;
    const texture = {
      getSize: () => ({ width: 120, height: 80 }),
      dispose: jasmine.createSpy('dispose'),
    } as unknown as Texture;
    const entry = { texture, status: 'loading' as const };
    service['sceneEntries'].set(scene, new Map([['art.svg', entry]]));
    const events: unknown[] = [];
    service.subscribe((event) => events.push(event));

    service['recordLoaded'](scene, 'art.svg', entry);
    service['recordLoaded'](scene, 'art.svg', entry);

    expect(service.getNaturalSize('art.svg')).toEqual({ width: 120, height: 80 });
    expect(events.length).toBe(1);
  });

  it('disposes replaced sources and ignores their late completion', () => {
    const service = new ImageResourceService();
    const scene = {} as Scene;
    const dispose = jasmine.createSpy('dispose');
    const texture = {
      getSize: () => ({ width: 120, height: 80 }),
      dispose,
    } as unknown as Texture;
    const entry = { texture, status: 'loading' as const };
    service['sceneEntries'].set(scene, new Map([['old.svg', entry]]));
    const listener = jasmine.createSpy('listener');
    service.subscribe(listener);

    service.retain(scene, new Set(['new.svg']));
    service['recordLoaded'](scene, 'old.svg', entry);

    expect(dispose).toHaveBeenCalledOnceWith();
    expect(listener).not.toHaveBeenCalled();
    expect(service.getNaturalSize('old.svg')).toBeUndefined();
  });

  it('settles a failed request to a ready transparent fallback', () => {
    const service = new ImageResourceService();
    const failedTexture = { dispose: jasmine.createSpy('dispose') } as unknown as Texture;
    const fallbackTexture = {
      hasAlpha: false,
      dispose: jasmine.createSpy('fallbackDispose'),
    } as unknown as Texture;
    const scene = {} as Scene;
    const entry = { texture: failedTexture, status: 'loading' as const };
    service['sceneEntries'].set(scene, new Map([['missing.svg', entry]]));
    const listener = jasmine.createSpy('listener');
    service.subscribe(listener);
    spyOn(RawTexture, 'CreateRGBATexture').and.returnValue(fallbackTexture as never);

    service['recordError'](scene, 'missing.svg', entry);

    expect(failedTexture.dispose).toHaveBeenCalledOnceWith();
    expect(entry.texture).toBe(fallbackTexture);
    expect(entry.status).toBe('error');
    expect(fallbackTexture.hasAlpha).toBeTrue();
    expect(listener).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      scene,
      source: 'missing.svg',
      status: 'error',
    }));
  });
});
