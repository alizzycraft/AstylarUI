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

  it('ignores disposed-scene load and error callbacks without disturbing a same-source peer', () => {
    const service = new ImageResourceService();
    const retiredScene = {} as Scene, peerScene = {} as Scene;
    const retiredDispose = jasmine.createSpy('retiredDispose');
    const retired = { texture: { getSize: () => ({ width: 60, height: 40 }), dispose: retiredDispose } as unknown as Texture,
      status: 'loading' as const };
    const peer = { texture: { getSize: () => ({ width: 120, height: 80 }), dispose: jasmine.createSpy('peerDispose') } as unknown as Texture,
      status: 'loading' as const };
    service['sceneEntries'].set(retiredScene, new Map([['same.png', retired]]));
    service['sceneEntries'].set(peerScene, new Map([['same.png', peer]]));
    const listener = jasmine.createSpy('listener');
    const unsubscribe = service.subscribe(listener);
    const fallback = spyOn(RawTexture, 'CreateRGBATexture');
    service.disposeScene(retiredScene);
    service['recordLoaded'](retiredScene, 'same.png', retired);
    service['recordError'](retiredScene, 'same.png', retired);
    expect(retiredDispose).toHaveBeenCalledOnceWith();
    expect(fallback).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(service.getNaturalSize('same.png')).toBeUndefined();
    expect(service.getSceneTextures(retiredScene).size).toBe(0);
    expect([...service.getSceneTextures(peerScene)]).toEqual([peer.texture]);
    service['recordLoaded'](peerScene, 'same.png', peer);
    expect(listener).toHaveBeenCalledOnceWith(jasmine.objectContaining({ scene: peerScene, source: 'same.png', status: 'loaded' }));
    expect(service.getNaturalSize('same.png')).toEqual({ width: 120, height: 80 });
    expect(peer.texture.dispose).not.toHaveBeenCalled();
    unsubscribe(); service.disposeScene(peerScene);
    service['recordError'](peerScene, 'same.png', peer);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('rejects a retired entry even when a replacement reuses its scene and source URL', () => {
    const service = new ImageResourceService(), scene = {} as Scene;
    const retired = { texture: { getSize: () => ({ width: 1, height: 1 }), dispose: jasmine.createSpy('retiredDispose') } as unknown as Texture,
      status: 'loading' as const };
    service['sceneEntries'].set(scene, new Map([['same.png', retired]]));
    service.retain(scene, new Set());
    const current = { texture: { getSize: () => ({ width: 24, height: 24 }), dispose: jasmine.createSpy('currentDispose') } as unknown as Texture,
      status: 'loading' as const };
    service['sceneEntries'].get(scene)!.set('same.png', current);
    const listener = jasmine.createSpy('listener'); service.subscribe(listener);
    const fallback = spyOn(RawTexture, 'CreateRGBATexture');
    service['recordLoaded'](scene, 'same.png', retired);
    service['recordError'](scene, 'same.png', retired);
    expect(listener).not.toHaveBeenCalled(); expect(fallback).not.toHaveBeenCalled();
    expect(service.getNaturalSize('same.png')).toBeUndefined();
    expect([...service.getSceneTextures(scene)]).toEqual([current.texture]);
    service['recordLoaded'](scene, 'same.png', current);
    expect(listener).toHaveBeenCalledOnceWith(jasmine.objectContaining({ scene, naturalSize: { width: 24, height: 24 } }));
    expect(current.texture.dispose).not.toHaveBeenCalled();
    service.disposeScene(scene);
  });
});
