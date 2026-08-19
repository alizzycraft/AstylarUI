import { TestBed } from '@angular/core/testing';
import type { AstylarSurface } from 'astylarui';
import { App } from './app';

describe('external AstylarUI browser acceptance', () => {
  it('runs two installed-package surfaces through update, input, modal, resize, and disposal', async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
    const fixture = TestBed.createComponent(App);
    const handles = fixture.componentInstance as unknown as {
      primarySurface?: AstylarSurface;
      secondarySurface?: AstylarSurface;
    };
    let finalPrimary: AstylarSurface | undefined;
    let finalSecondary: AstylarSurface | undefined;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();

    try {
      await waitFor(() => {
        fixture.detectChanges();
        return semanticRoots(fixture.nativeElement).length === 2 &&
          [...semanticRoots(fixture.nativeElement)]
            .every((root) => !!root.querySelector('[data-astylar-id="workspace"]')) &&
          text(fixture.nativeElement, 'consumer-status').includes('renderer settled and ready');
      }, 'initial surfaces');
      expect(fixture.nativeElement.querySelectorAll('astylar-surface canvas').length).toBe(2);
      expect(fixture.nativeElement.querySelector('[data-testid="consumer-status"]')?.textContent)
        .toContain('renderer settled and ready');

      const primary = surface(fixture.nativeElement, 'primary');
      const secondary = surface(fixture.nativeElement, 'secondary');
      expect(primary.querySelector('[data-astylar-id="workspace"]')).toBeTruthy();
      expect(secondary.querySelector('[data-astylar-id="workspace"]')).toBeTruthy();

      (primary.querySelector('[data-astylar-id="add-item"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      await waitFor(() => {
        fixture.detectChanges();
        return text(fixture.nativeElement, 'primary-revision').includes('2') &&
          (surface(fixture.nativeElement, 'primary')
            .querySelector('[data-astylar-id="kicker"]')?.textContent ?? '')
            .includes('revision 2');
      }, 'primary update');
      expect(text(fixture.nativeElement, 'secondary-revision')).toContain('1');

      const stablePrimaryResources = handles.primarySurface?.diagnostics.resources;
      clickShellButton(fixture.nativeElement, 'Update data');
      fixture.detectChanges();
      await waitFor(() => {
        fixture.detectChanges();
        return text(fixture.nativeElement, 'primary-revision').includes('3') &&
          (surface(fixture.nativeElement, 'primary')
            .querySelector('[data-astylar-id="kicker"]')?.textContent ?? '')
            .includes('revision 3');
      }, 'repeated primary update');
      expect(handles.primarySurface?.diagnostics.resources).toEqual(stablePrimaryResources);

      const search = primary.querySelector('[data-astylar-id="search"]') as HTMLInputElement;
      search.focus();
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }));
      search.dispatchEvent(new KeyboardEvent('keyup', { key: 'A', bubbles: true }));
      await waitFor(
        () => {
          fixture.detectChanges();
          return text(fixture.nativeElement, 'consumer-status').includes('Primary keyboard input: A');
        },
        'keyboard event',
      );

      clickShellButton(fixture.nativeElement, 'Open details');
      fixture.detectChanges();
      await waitFor(() => {
        const dialog = surface(fixture.nativeElement, 'primary')
          .querySelector('[data-astylar-id="details-dialog"]');
        return dialog instanceof HTMLDialogElement && dialog.open;
      }, 'modal open');

      clickShellButton(fixture.nativeElement, 'Update secondary');
      fixture.detectChanges();
      await waitFor(() => {
        fixture.detectChanges();
        return text(fixture.nativeElement, 'secondary-revision').includes('2') &&
          (surface(fixture.nativeElement, 'secondary')
            .querySelector('[data-astylar-id="kicker"]')?.textContent ?? '')
            .includes('revision 2');
      }, 'secondary update');

      const disposedPrimary = handles.primarySurface;
      clickShellButton(fixture.nativeElement, 'Dispose primary');
      fixture.detectChanges();
      await waitFor(() => semanticRoots(fixture.nativeElement).length === 1, 'primary disposal');
      expect(fixture.nativeElement.querySelector('[data-testid="primary-astylar-surface"]')).toBeNull();
      expect(surface(fixture.nativeElement, 'secondary').querySelector('[data-astylar-id="workspace"]')).toBeTruthy();
      expect(disposedPrimary?.disposed).toBeTrue();
      expect(disposedPrimary?.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });

      clickShellButton(fixture.nativeElement, 'Resize secondary');
      await waitFor(
        () => {
          fixture.detectChanges();
          return text(fixture.nativeElement, 'consumer-status').includes('Explicit resize completed');
        },
        'secondary resize',
      );

      clickShellButton(fixture.nativeElement, 'Remount primary');
      fixture.detectChanges();
      await waitFor(() => {
        fixture.detectChanges();
        return semanticRoots(fixture.nativeElement).length === 2 &&
          !!surface(fixture.nativeElement, 'primary').querySelector('[data-astylar-id="workspace"]') &&
          text(fixture.nativeElement, 'consumer-status').includes('Primary renderer settled and ready');
      }, 'settled primary remount');
      expect(fixture.nativeElement.querySelectorAll('astylar-surface canvas').length).toBe(2);
      expect(handles.primarySurface).not.toBe(disposedPrimary);
      expect(handles.primarySurface?.diagnostics.messages.some((message) => message.severity === 'error')).toBeFalse();
      expect(handles.secondarySurface?.diagnostics.messages.some((message) => message.severity === 'error')).toBeFalse();
      finalPrimary = handles.primarySurface;
      finalSecondary = handles.secondarySurface;
    } finally {
      fixture.destroy();
      fixture.nativeElement.remove();
    }

    expect(finalPrimary?.disposed).toBeTrue();
    expect(finalSecondary?.disposed).toBeTrue();
    expect(finalPrimary?.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
    expect(finalSecondary?.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
  }, 20_000);
});

function semanticRoots(host: HTMLElement): NodeListOf<HTMLElement> {
  return host.querySelectorAll('[data-astylar-semantic-root]');
}

function surface(host: HTMLElement, kind: 'primary' | 'secondary'): HTMLElement {
  const owner = host.querySelector(`[data-testid="${kind}-astylar-surface"]`);
  const semantic = owner?.querySelector('[data-astylar-semantic-root]');
  if (!(semantic instanceof HTMLElement)) throw new Error(`${kind} semantic surface is not ready.`);
  return semantic;
}

function text(host: HTMLElement, testId: string): string {
  return host.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';
}

function clickShellButton(host: HTMLElement, label: string): void {
  const button = [...host.querySelectorAll<HTMLButtonElement>('.consumer-actions button')]
    .find((candidate) => candidate.textContent?.trim() === label);
  if (!button) throw new Error(`Could not find shell button ${JSON.stringify(label)}.`);
  button.click();
}

async function waitFor(
  predicate: () => boolean,
  description: string,
  timeout = 10_000,
): Promise<void> {
  const deadline = performance.now() + timeout;
  while (!predicate()) {
    if (performance.now() >= deadline) {
      throw new Error(`Timed out waiting for browser acceptance state: ${description}.`);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
}
