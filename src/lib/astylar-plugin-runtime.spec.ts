import {
  DestroyRef,
  Injectable,
  inject,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { SiteData } from '../app/types/site-data';
import { Astylar } from './astylar';
import { AstylarDiagnosticError, type AstylarDiagnostic } from './astylar-diagnostics';
import {
  ASTYLAR_PLUGIN_API_VERSION,
  defineAstylarPlugin,
  provideAstylar,
  type AstylarPluginLifecycle,
} from './astylar-plugin';

@Injectable()
class LifecycleProbe implements AstylarPluginLifecycle {
  static nextId = 0;
  static activated: number[] = [];
  static destroyed: number[] = [];

  readonly id = ++LifecycleProbe.nextId;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => LifecycleProbe.destroyed.push(this.id));
  }

  activate(): void {
    LifecycleProbe.activated.push(this.id);
  }
}

@Injectable()
class FailingLifecycle implements AstylarPluginLifecycle {
  static destroyed = 0;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => FailingLifecycle.destroyed++);
  }

  activate(): void {
    throw new Error('deliberate activation failure');
  }
}

const lifecyclePlugin = defineAstylarPlugin({
  id: 'example.lifecycle',
  version: '1.0.0',
  pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
  contributes: ['lifecycle'],
  contributions: {
    lifecycle: [{
      id: 'example.lifecycle:surface-probe',
      lifecycle: LifecycleProbe,
    }],
  },
});

const failingPlugin = defineAstylarPlugin({
  id: 'example.failing',
  version: '1.0.0',
  pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
  contributes: ['lifecycle'],
  contributions: {
    lifecycle: [{
      id: 'example.failing:startup',
      lifecycle: FailingLifecycle,
    }],
  },
});

describe('Astylar surface plugin runtime', () => {
  beforeEach(() => {
    LifecycleProbe.nextId = 0;
    LifecycleProbe.activated = [];
    LifecycleProbe.destroyed = [];
    FailingLifecycle.destroyed = 0;
  });

  it('creates, activates, and destroys plugin services independently per surface', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ plugins: [lifecyclePlugin] }),
      ],
    });
    const astylar = TestBed.inject(Astylar);
    const firstCanvas = document.createElement('canvas');
    const secondCanvas = document.createElement('canvas');
    const first = astylar.mount(firstCanvas, site());
    const second = astylar.mount(secondCanvas, site());

    try {
      await Promise.all([first.whenSettled(), second.whenSettled()]);
      expect(LifecycleProbe.activated).toEqual([1, 2]);
      expect(first.diagnostics.plugins).toEqual(jasmine.objectContaining({
        sealed: true,
        pluginIds: ['example.lifecycle'],
        lifecycleIds: ['example.lifecycle:surface-probe'],
      }));
      first.dispose();
      expect(LifecycleProbe.destroyed).toEqual([1]);
      expect(second.disposed).toBeFalse();
    } finally {
      first.dispose();
      second.dispose();
    }

    expect(LifecycleProbe.destroyed).toEqual([1, 2]);
  });

  it('normalizes activation failures and destroys the failed surface injector', () => {
    const reported: AstylarDiagnostic[] = [];
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ plugins: [failingPlugin] }),
      ],
    });
    const astylar = TestBed.inject(Astylar);

    expect(() => astylar.mount(document.createElement('canvas'), site(), {
      diagnostics: {
        logLevel: 'silent',
        onDiagnostic: (diagnostic) => reported.push(diagnostic),
      },
    })).toThrowError(AstylarDiagnosticError, /plugin-initialization-failed/);

    expect(reported.at(-1)).toEqual(jasmine.objectContaining({
      code: 'plugin-initialization-failed',
      pluginId: 'example.failing',
      contributionId: 'example.failing:startup',
    }));
    expect(FailingLifecycle.destroyed).toBe(1);
  });

  it('destroys activated plugin services when core mount validation fails', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ plugins: [lifecyclePlugin] }),
      ],
    });
    const astylar = TestBed.inject(Astylar);

    expect(() => astylar.mount(
      document.createElement('canvas'),
      { root: { children: [{ type: 'not-an-element' }] }, styles: [] } as unknown as SiteData,
      { diagnostics: { logLevel: 'silent' } },
    )).toThrowError(AstylarDiagnosticError, /invalid-element-type/);
    expect(LifecycleProbe.activated).toEqual([1]);
    expect(LifecycleProbe.destroyed).toEqual([1]);
  });
});

function site(): SiteData {
  return {
    root: { children: [{ type: 'div', id: 'plugin-surface-root' }] },
    styles: [{ selector: '#plugin-surface-root', width: '100px', height: '40px' }],
  };
}
