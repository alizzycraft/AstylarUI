import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { SiteData } from '../app/types/site-data';
import { Astylar } from './astylar';
import type { AstylarSurface } from './astylar-surface';
import { AstylarSurfaceComponent } from './astylar-surface.component';

describe('AstylarSurfaceComponent', () => {
  const data: SiteData = { root: { children: [] }, styles: [] };
  let surface: jasmine.SpyObj<AstylarSurface>;
  let astylar: jasmine.SpyObj<Astylar>;

  beforeEach(() => {
    surface = jasmine.createSpyObj<AstylarSurface>(
      'AstylarSurface',
      ['update', 'resize', 'whenSettled', 'dispose'],
      { disposed: false },
    );
    surface.whenSettled.and.resolveTo({} as never);
    surface.update.and.resolveTo({} as never);
    astylar = jasmine.createSpyObj<Astylar>('Astylar', ['mount']);
    astylar.mount.and.returnValue(surface);
  });

  it('does not mount Babylon during server rendering', async () => {
    await TestBed.configureTestingModule({
      imports: [AstylarSurfaceComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Astylar, useValue: astylar },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AstylarSurfaceComponent);
    fixture.componentRef.setInput('siteData', data);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(astylar.mount).not.toHaveBeenCalled();
  });

  it('mounts after the canvas exists, updates inputs, and disposes ownership', async () => {
    await TestBed.configureTestingModule({
      imports: [AstylarSurfaceComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Astylar, useValue: astylar },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AstylarSurfaceComponent);
    fixture.componentRef.setInput('siteData', data);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(astylar.mount).toHaveBeenCalledTimes(1);
    const updatedData: SiteData = {
      root: { children: [{ type: 'p', id: 'updated', textContent: 'Updated' }] },
      styles: [],
    };
    fixture.componentRef.setInput('siteData', updatedData);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(surface.update).toHaveBeenCalledOnceWith(updatedData);

    fixture.destroy();
    expect(surface.dispose).toHaveBeenCalledTimes(1);
  });
});
