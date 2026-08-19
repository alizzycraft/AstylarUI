import type { Scene } from '@babylonjs/core';
import type { SiteData } from '../app/types/site-data';
import { AstylarSurfaceHandle, type AstylarSurfaceHost } from './astylar-surface';

describe('AstylarSurfaceHandle', () => {
  const data: SiteData = { root: { children: [] }, styles: [] };

  function setup() {
    let disposed = false;
    const engine = {
      isDisposed: false,
      resize: jasmine.createSpy('resize'),
      dispose: jasmine.createSpy('dispose').and.callFake(() => { engine.isDisposed = true; }),
    };
    const scene = {
      get isDisposed() { return disposed; },
      getEngine: () => engine,
      dispose: jasmine.createSpy('dispose').and.callFake(() => { disposed = true; }),
    } as unknown as Scene;
    const snapshot = { disposed: false } as never;
    const host = {
      update: jasmine.createSpy('update').and.resolveTo(snapshot),
      invalidate: jasmine.createSpy('invalidate').and.resolveTo(snapshot),
      whenSettled: jasmine.createSpy('whenSettled').and.resolveTo(snapshot),
      getSession: jasmine.createSpy('getSession').and.returnValue({ snapshot }),
      getResourceSnapshot: jasmine.createSpy('getResourceSnapshot'),
      getInteractionSnapshot: jasmine.createSpy('getInteractionSnapshot'),
      getScrollSnapshot: jasmine.createSpy('getScrollSnapshot'),
      getSemanticSnapshot: jasmine.createSpy('getSemanticSnapshot'),
      getVisualReconciliationSnapshot: jasmine.createSpy('getVisualReconciliationSnapshot'),
    } satisfies jasmine.SpyObj<AstylarSurfaceHost>;
    return { engine, host, scene, surface: new AstylarSurfaceHandle(scene, host) };
  }

  it('binds updates, settlement and diagnostics to its own scene', async () => {
    const { host, scene, surface } = setup();

    await surface.update(data);
    await surface.whenSettled();
    void surface.diagnostics;

    expect(host.update).toHaveBeenCalledOnceWith(data, scene);
    expect(host.whenSettled).toHaveBeenCalledOnceWith(scene);
    expect(host.getSession).toHaveBeenCalledOnceWith(scene);
  });

  it('resizes the engine and requests a responsive reflow', async () => {
    const { engine, host, scene, surface } = setup();

    await surface.resize();

    expect(engine.resize).toHaveBeenCalledOnceWith(true);
    expect(host.invalidate).toHaveBeenCalledOnceWith('resize', scene);
  });

  it('disposes idempotently and rejects later operations', () => {
    const { scene, surface } = setup();

    surface.dispose();
    surface.dispose();

    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(surface.disposed).toBeTrue();
    expect(() => surface.update(data)).toThrowError(/disposed Astylar surface/);
    expect(() => surface.resize()).toThrowError(/disposed Astylar surface/);
  });
});
