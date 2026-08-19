import { TestBed } from '@angular/core/testing';
import { Astylar } from 'astylarui';
import { App } from './app';

describe('external AstylarUI consumer', () => {
  const scene = { dispose: jasmine.createSpy('dispose') };
  const astylar = {
    render: jasmine.createSpy('render').and.returnValue(scene),
    update: jasmine.createSpy('update').and.resolveTo({}),
    whenSettled: jasmine.createSpy('whenSettled').and.resolveTo({}),
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
