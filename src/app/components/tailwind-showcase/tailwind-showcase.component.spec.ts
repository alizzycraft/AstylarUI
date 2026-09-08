import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Astylar } from '../../../lib';
import { TailwindShowcaseComponent } from './tailwind-showcase.component';
import {
  TAILWIND_SHOWCASE_TABS,
  createTailwindShowcaseSiteData,
  tailwindShowcaseReferenceNodes,
} from './tailwind-showcase.data';

describe('TailwindShowcaseComponent', () => {
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
    astylar.mount.calls.reset();
    surface.whenSettled.calls.reset();
    surface.update.calls.reset();
    surface.resize.calls.reset();
    surface.dispose.calls.reset();

    await TestBed.configureTestingModule({
      imports: [TailwindShowcaseComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Astylar, useValue: astylar },
      ],
    }).compileComponents();
  });

  it('renders four labelled comparison tabs and one Astylar surface', async () => {
    const fixture = TestBed.createComponent(TailwindShowcaseComponent);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('[role="tab"]')).toHaveSize(4);
    expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain('Layout');
    expect(host.querySelector('[data-testid="tailwind-reference"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="tailwind-showcase-surface"]')).not.toBeNull();
  });

  it('switches the shared content and viewport through accessible controls', async () => {
    const fixture = TestBed.createComponent(TailwindShowcaseComponent);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const controlsTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
      .find((button) => button.textContent?.includes('Controls'))!;
    controlsTab.click();
    await fixture.whenStable();

    expect(controlsTab.getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector<HTMLIFrameElement>('[data-testid="tailwind-reference"]')
      ?.contentDocument?.querySelector('[data-showcase-id="controls-primary"]')).not.toBeNull();

    const desktopButton = [...host.querySelectorAll<HTMLButtonElement>('.viewport-button')]
      .find((button) => button.textContent?.includes('Desktop'))!;
    desktopButton.click();
    await fixture.whenStable();

    const grid = host.querySelector<HTMLElement>('.comparison-grid')!;
    expect(desktopButton.getAttribute('aria-pressed')).toBe('true');
    expect(grid.style.getPropertyValue('--showcase-width')).toBe('800px');
  });

  it('evaluates responsive utilities against each comparison surface width', async () => {
    const fixture = TestBed.createComponent(TailwindShowcaseComponent);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const responsiveTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
      .find((button) => button.textContent?.includes('Responsive'))!;
    responsiveTab.click();
    await fixture.whenStable();

    const referenceFrame = host.querySelector<HTMLIFrameElement>(
      'iframe[data-testid="tailwind-reference"]',
    );
    expect(referenceFrame).not.toBeNull();
    expect(referenceFrame!.contentWindow!.getComputedStyle(
      referenceFrame!.contentDocument!.querySelector('[data-showcase-id="responsive-direction"]')!,
    ).flexDirection).toBe('column');

    const desktopButton = [...host.querySelectorAll<HTMLButtonElement>('.viewport-button')]
      .find((button) => button.textContent?.includes('Desktop'))!;
    desktopButton.click();
    await fixture.whenStable();

    expect(referenceFrame!.style.width).toBe('800px');
    expect(referenceFrame!.contentWindow!.getComputedStyle(
      referenceFrame!.contentDocument!.querySelector('[data-showcase-id="responsive-direction"]')!,
    ).flexDirection).toBe('row');
  });

  it('feeds the reference and Astylar panes from the same Tailwind-authored tree', () => {
    for (const tab of TAILWIND_SHOWCASE_TABS) {
      const siteData = createTailwindShowcaseSiteData(tab);
      const referenceNodes = tailwindShowcaseReferenceNodes(tab);
      expect(referenceNodes).toEqual(siteData.root.children);
      expect(referenceNodes[0].class).toContain('tw:h-full');
      expect(tab.coverage.length).toBeGreaterThan(0);
    }
  });
});
