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
      inspectResolvedStyles: jasmine.createSpy('inspectResolvedStyles').and.returnValue({ revision: 1, elements: [] }),
      update: jasmine.createSpy('update').and.resolveTo(snapshot),
      invalidate: jasmine.createSpy('invalidate').and.resolveTo(snapshot),
      whenSettled: jasmine.createSpy('whenSettled').and.resolveTo(snapshot),
      focus: jasmine.createSpy('focus').and.returnValue(true),
      blur: jasmine.createSpy('blur').and.returnValue(true),
      getSession: jasmine.createSpy('getSession').and.returnValue({ snapshot }),
      getResourceSnapshot: jasmine.createSpy('getResourceSnapshot'),
      getInteractionSnapshot: jasmine.createSpy('getInteractionSnapshot'),
      getScrollSnapshot: jasmine.createSpy('getScrollSnapshot'),
      getSemanticSnapshot: jasmine.createSpy('getSemanticSnapshot'),
      getVisualReconciliationSnapshot: jasmine.createSpy('getVisualReconciliationSnapshot'),
      getDiagnosticSnapshot: jasmine.createSpy('getDiagnosticSnapshot').and.returnValue([]),
      getPluginSnapshot: jasmine.createSpy('getPluginSnapshot').and.returnValue({
        sealed: true,
        pluginIds: [],
        elementIds: [],
        propertyIds: [],
        rendererIds: [],
        lifecycleIds: [],
      }),
      getPluginResourceSnapshot: jasmine.createSpy('getPluginResourceSnapshot').and.returnValue({
        owners: 0,
        resources: 0,
        cleanups: 0,
        pending: 0,
      }),
      reportDiagnostic: jasmine.createSpy('reportDiagnostic'),
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

  it('requests one renderer-owned responsive reflow without clearing the canvas early', async () => {
    const { engine, host, scene, surface } = setup();

    await surface.resize();

    expect(engine.resize).not.toHaveBeenCalled();
    expect(host.invalidate).toHaveBeenCalledOnceWith('resize', scene);
  });

  it('routes programmatic focus and blur through its own scene', () => {
    const { host, scene, surface } = setup();

    expect(surface.focus('menu', { focusVisible: false, scrollIntoView: false })).toBeTrue();
    expect(surface.blur()).toBeTrue();

    expect(host.focus).toHaveBeenCalledOnceWith(
      'menu',
      { focusVisible: false, scrollIntoView: false },
      scene,
    );
    expect(host.blur).toHaveBeenCalledOnceWith(scene);
  });

  it('requests style inspection only on demand and binds it to the owning scene', () => {
    const { host, scene, surface } = setup();
    void surface.diagnostics;
    expect(host.inspectResolvedStyles).not.toHaveBeenCalled();
    expect(surface.inspectResolvedStyles()).toEqual({ revision: 1, elements: [] });
    expect(host.inspectResolvedStyles).toHaveBeenCalledOnceWith(scene);
  });

  it('disposes idempotently and rejects later operations', () => {
    const { host, scene, surface } = setup();

    surface.dispose();
    surface.dispose();

    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(surface.disposed).toBeTrue();
    expect(() => surface.update(data)).toThrowError(/disposed Astylar surface/);
    expect(() => surface.resize()).toThrowError(/disposed Astylar surface/);
    expect(() => surface.focus('menu')).toThrowError(/disposed Astylar surface/);
    expect(() => surface.blur()).toThrowError(/disposed Astylar surface/);
    expect(() => surface.inspectResolvedStyles()).toThrowError(/disposed Astylar surface/);
    expect(host.reportDiagnostic).toHaveBeenCalledWith(jasmine.objectContaining({
      code: 'surface-disposed',
      severity: 'error',
    }));
  });
});
