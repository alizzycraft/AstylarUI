import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AstylarDiagnostics } from './astylar-diagnostics';
import { AstylarPluginHost } from './astylar-plugin-host';
import {
  ASTYLAR_PLUGIN_API_VERSION,
  AstylarCapabilityRegistry,
  defineAstylarPlugin,
} from './astylar-plugin';

const hostPlugin = defineAstylarPlugin({
  id: 'example.async',
  version: '1.0.0',
  pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
  contributes: ['properties'],
  contributions: {
    properties: [{
      id: 'example.async:depth',
      alias: 'asyncDepth',
      initial: 0.1,
      inherits: false,
      affects: ['layout', 'paint'],
      validate: () => true,
    }],
  },
});

describe('AstylarPluginHost', () => {
  function setup(): { host: AstylarPluginHost; diagnostics: AstylarDiagnostics } {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AstylarDiagnostics,
        {
          provide: AstylarCapabilityRegistry,
          useFactory: () => new AstylarCapabilityRegistry([hostPlugin]),
        },
        AstylarPluginHost,
      ],
    });
    const diagnostics = TestBed.inject(AstylarDiagnostics);
    diagnostics.configure({ logLevel: 'silent' });
    return { host: TestBed.inject(AstylarPluginHost), diagnostics };
  }

  it('owns surface resources and idempotent cleanup through Angular destruction', () => {
    const { host } = setup();
    const owner = host.createSurfaceOwner({ pluginId: 'example.async' });
    const resource = { dispose: jasmine.createSpy('dispose') };
    const cleanup = jasmine.createSpy('cleanup');

    owner.own(resource);
    owner.addCleanup(cleanup);
    expect(host.snapshot).toEqual({ owners: 2, resources: 1, cleanups: 2, pending: 0 });

    TestBed.resetTestingModule();
    expect(resource.dispose).toHaveBeenCalledOnceWith();
    expect(cleanup).toHaveBeenCalledOnceWith();
    expect(host.snapshot).toEqual({ owners: 0, resources: 0, cleanups: 0, pending: 0 });
  });

  it('aborts replaced generations and disposes their late async completion', async () => {
    const { host } = setup();
    const firstGeneration = host.beginGeneration(['initial']);
    const owner = host.createRenderOwner({
      pluginId: 'example.async',
      contributionId: 'example.async:renderer',
    });
    let resolve!: (resource: { dispose: jasmine.Spy }) => void;
    const delayed = new Promise<{ dispose: jasmine.Spy }>((ready) => { resolve = ready; });
    const tracked = owner.track(delayed);

    host.beginGeneration(['update']);
    expect(owner.active).toBeFalse();
    expect(firstGeneration.active).toBeFalse();
    expect(await tracked).toBeUndefined();

    const stale = { dispose: jasmine.createSpy('staleDispose') };
    resolve(stale);
    await Promise.resolve();
    await Promise.resolve();
    expect(stale.dispose).toHaveBeenCalledOnceWith();
  });

  it('reports failed async readiness and releases resources registered by that owner', async () => {
    const { host, diagnostics } = setup();
    host.beginGeneration(['initial']);
    const owner = host.createRenderOwner({
      pluginId: 'example.async',
      contributionId: 'example.async:renderer',
    });
    const resource = { dispose: jasmine.createSpy('dispose') };

    expect(await owner.track(Promise.resolve(resource), {
      onReady: () => { throw new Error('delayed setup failed'); },
    })).toBeUndefined();

    expect(resource.dispose).toHaveBeenCalledOnceWith();
    expect(owner.active).toBeFalse();
    expect(diagnostics.snapshot).toContain(jasmine.objectContaining({
      code: 'plugin-async-resource-failed',
      pluginId: 'example.async',
      contributionId: 'example.async:renderer',
      message: jasmine.stringContaining('delayed setup failed'),
    }));
  });

  it('derives domains from property metadata and coalesces repeated requests', async () => {
    const { host } = setup();
    const reasons: string[] = [];
    let settle!: () => void;
    const pending = new Promise<void>((resolve) => { settle = resolve; });
    host.bindInvalidation((reason) => {
      reasons.push(reason);
      return pending;
    });

    const request = {
      pluginId: 'example.async',
      properties: ['asyncDepth'],
    } as const;
    host.requestInvalidation(request);
    host.requestInvalidation(request);

    expect(reasons).toEqual(['plugin:example.async:layout,paint']);
    settle();
    await pending;
  });

  it('rejects foreign properties and prevents synchronous renderer recursion', () => {
    const { host, diagnostics } = setup();
    const reasons: string[] = [];
    host.bindInvalidation((reason) => {
      reasons.push(reason);
      return Promise.resolve();
    });

    host.requestInvalidation({
      pluginId: 'example.async',
      properties: ['missing.plugin:value'],
    });
    const exit = host.enterRenderer();
    host.requestInvalidation({ pluginId: 'example.async', domains: ['paint'] });
    exit();

    expect(reasons).toEqual([]);
    expect(diagnostics.snapshot).toContain(jasmine.objectContaining({
      code: 'plugin-invalidation-invalid',
      pluginId: 'example.async',
    }));
    expect(diagnostics.snapshot).toContain(jasmine.objectContaining({
      code: 'plugin-invalidation-recursive',
      severity: 'warning',
      pluginId: 'example.async',
    }));
  });

  it('stops a repeated plugin-only invalidation loop', () => {
    const { host, diagnostics } = setup();
    const reasons: string[] = [];
    host.bindInvalidation((reason) => {
      reasons.push(reason);
      return Promise.resolve();
    });
    const reason = 'plugin:example.async:paint';
    for (let index = 0; index < 8; index += 1) {
      host.beginGeneration([reason]);
    }

    host.requestInvalidation({ pluginId: 'example.async', domains: ['paint'] });

    expect(reasons).toEqual([]);
    expect(diagnostics.snapshot).toContain(jasmine.objectContaining({
      code: 'plugin-invalidation-recursive',
      severity: 'error',
      pluginId: 'example.async',
    }));
  });
});
