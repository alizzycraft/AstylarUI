import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import type { AstylarEvent, AstylarSurface } from 'astylarui';
import { AstylarShowcaseComponent } from './astylar.component';
import { FrameSync } from './frame-sync';
import { MaterialRippleController } from './material-plugin/material-ripple.controller';
import { DEFAULT_SHOWCASE_STATE, ShowcaseStore } from './showcase.store';
import { MATERIAL_THEME_PROFILES, resolveTheme } from './theme';

describe('AstylarShowcaseComponent', () => {
  it('activates a primary-color ripple from the toolbar action pointer origin', () => {
    const activate = jasmine.createSpy('activate');
    const tokens = resolveTheme(MATERIAL_THEME_PROFILES.light);
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'toolbar' } } } },
        { provide: FrameSync, useValue: {} },
        { provide: MaterialRippleController, useValue: { activate, dispose: () => undefined } },
        { provide: ShowcaseStore, useValue: { tokens: () => tokens, state: () => DEFAULT_SHOWCASE_STATE } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new AstylarShowcaseComponent());
    const surface = {
      scene: { getEngine: () => ({ getRenderingCanvas: () => ({ clientWidth: 900 }) }) },
    } as unknown as AstylarSurface;
    (component as unknown as { surface: AstylarSurface }).surface = surface;

    (component as unknown as { activateRipple: (event: AstylarEvent) => void }).activateRipple({
      targetId: 'toolbar-action', localX: 12, localY: 7,
    } as AstylarEvent);

    expect(activate).toHaveBeenCalledOnceWith({
      surface,
      elementId: 'toolbar-action',
      originX: 12,
      originY: 7,
      width: 65.140625,
      height: 40,
      cornerRadius: 20,
      color: '#6750a4',
    });
  });
});
