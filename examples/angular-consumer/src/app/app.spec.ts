import { TestBed } from '@angular/core/testing';
import { Astylar } from 'astylarui';
import { App } from './app';

describe('external AstylarUI consumer', () => {
  const surface = {
    whenSettled: jasmine.createSpy('whenSettled').and.resolveTo({}),
    update: jasmine.createSpy('update').and.resolveTo({}),
    resize: jasmine.createSpy('resize').and.resolveTo({}),
    dispose: jasmine.createSpy('dispose'),
  };
  const astylar = {
    mount: jasmine.createSpy('mount').and.returnValue(surface),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] })
      .overrideProvider(Astylar, { useValue: astylar })
      .compileComponents();
  });

  it('creates a consumer that imports only the package entry point', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="astylar-surface"]')).toBeTruthy();
  });
});
