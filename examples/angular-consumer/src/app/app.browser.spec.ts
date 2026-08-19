import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AstylarSurfaceComponent, type AstylarSurface } from 'astylarui';
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
      try {
        await waitFor(() => {
          fixture.detectChanges();
          return semanticRoots(fixture.nativeElement).length === 2 &&
            [...semanticRoots(fixture.nativeElement)]
              .every((root) => !!root.querySelector('[data-astylar-id="workspace"]')) &&
            text(fixture.nativeElement, 'consumer-status').includes('renderer settled and ready');
        }, 'initial surfaces', 20_000);
      } catch (error) {
        const snapshots = fixture.debugElement
          .queryAll(By.directive(AstylarSurfaceComponent))
          .map((element) => element.componentInstance.surface()?.diagnostics.session);
        throw new Error(`${String(error)} Sessions: ${JSON.stringify(snapshots)}; ` +
          `semantic roots: ${semanticRoots(fixture.nativeElement).length}; ` +
          `status: ${JSON.stringify(text(fixture.nativeElement, 'consumer-status'))}.`);
      }
      expect(fixture.nativeElement.querySelectorAll('astylar-surface canvas').length).toBe(2);
      expect(fixture.nativeElement.querySelector('[data-testid="consumer-status"]')?.textContent)
        .toContain('renderer settled and ready');

      const primary = surface(fixture.nativeElement, 'primary');
      const secondary = surface(fixture.nativeElement, 'secondary');
      expect(primary.querySelector('[data-astylar-id="workspace"]')).toBeTruthy();
      expect(secondary.querySelector('[data-astylar-id="workspace"]')).toBeTruthy();
      expect(primary.querySelector('[data-astylar-id="add-item"]')?.textContent).toBe('Add item');
      expect(primary.querySelector('[data-astylar-id="item-one-action"]')?.textContent).toBe('Inspect');

      const primaryHost = fixture.nativeElement.querySelector(
        '[data-testid="primary-astylar-surface"]',
      ) as HTMLElement;
      primaryHost.style.width = '900px';
      await handles.primarySurface!.resize();
      const desktopSidebarWidth = meshWidth(handles.primarySurface!, 'sidebar');
      const desktopSummaryDelta = meshYDelta(
        handles.primarySurface!,
        'summary-total',
        'summary-low',
      );

      primaryHost.style.width = '650px';
      await handles.primarySurface!.resize();
      expect(meshWidth(handles.primarySurface!, 'sidebar')).toBeLessThan(desktopSidebarWidth);

      primaryHost.style.width = '480px';
      await handles.primarySurface!.resize();
      expect(meshYDelta(handles.primarySurface!, 'summary-total', 'summary-low'))
        .toBeGreaterThan(desktopSummaryDelta + 0.1);

      primaryHost.style.width = '';
      await handles.primarySurface!.resize();

      const actionCellMesh = mesh(handles.primarySurface!, 'item-one-action-cell');
      const nestedActionMesh = mesh(handles.primarySurface!, 'item-one-action');
      const actionCell = actionCellMesh.getBoundingInfo().boundingBox;
      const nestedAction = nestedActionMesh.getBoundingInfo().boundingBox;
      expect(nestedActionMesh.isDescendantOf(actionCellMesh)).toBeTrue();
      expect(nestedAction.maximumWorld.x).toBeGreaterThan(actionCell.minimumWorld.x);
      expect(nestedAction.minimumWorld.x).toBeLessThan(actionCell.maximumWorld.x);
      expect(nestedAction.maximumWorld.y).toBeGreaterThan(actionCell.minimumWorld.y);
      expect(nestedAction.minimumWorld.y).toBeLessThan(actionCell.maximumWorld.y);

      (primary.querySelector('[data-astylar-id="item-one-action"]') as HTMLButtonElement).click();
      await waitFor(() => {
        fixture.detectChanges();
        return text(fixture.nativeElement, 'consumer-status') === 'Primary nested table action activated.';
      }, 'nested table action');

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
      expect(search.value).toBe('A');

      clickShellButton(fixture.nativeElement, 'Update data');
      fixture.detectChanges();
      await waitFor(() => {
        fixture.detectChanges();
        return text(fixture.nativeElement, 'primary-revision').includes('3') &&
          (surface(fixture.nativeElement, 'primary')
            .querySelector('[data-astylar-id="kicker"]')?.textContent ?? '')
            .includes('revision 3');
      }, 'repeated primary update');
      const stablePrimaryResources = await waitForStableResources(handles.primarySurface!);
      expect((surface(fixture.nativeElement, 'primary')
        .querySelector('[data-astylar-id="search"]') as HTMLInputElement).value).toBe('A');

      clickShellButton(fixture.nativeElement, 'Update data');
      fixture.detectChanges();
      await waitFor(() => {
        fixture.detectChanges();
        return text(fixture.nativeElement, 'primary-revision').includes('4') &&
          (surface(fixture.nativeElement, 'primary')
            .querySelector('[data-astylar-id="kicker"]')?.textContent ?? '')
            .includes('revision 4');
      }, 'second repeated primary update');
      expect(await waitForStableResources(handles.primarySurface!)).toEqual(stablePrimaryResources);
      expect((surface(fixture.nativeElement, 'primary')
        .querySelector('[data-astylar-id="search"]') as HTMLInputElement).value).toBe('A');

      const lastAction = surface(fixture.nativeElement, 'primary')
        .querySelector('[data-astylar-id="item-two-action"]') as HTMLButtonElement;
      lastAction.focus();
      await waitFor(
        () => (handles.primarySurface?.diagnostics.scrolling
          ?.containers['table-scroll']?.scrollTop ?? 0) > 0,
        'table scroll into view',
      );

      clickShellButton(fixture.nativeElement, 'Open details');
      fixture.detectChanges();
      await waitFor(() => {
        const dialog = surface(fixture.nativeElement, 'primary')
          .querySelector('[data-astylar-id="details-dialog"]');
        return dialog instanceof HTMLDialogElement && dialog.open;
      }, 'modal presentation');
      try {
        await waitFor(() => {
          const close = surface(fixture.nativeElement, 'primary')
            .querySelector('[data-astylar-id="dialog-close"]');
          return document.activeElement === close &&
            handles.primarySurface?.diagnostics.interaction?.modalDialogId === 'details-dialog' &&
            handles.primarySurface?.diagnostics.interaction?.focusedElementId === 'dialog-close';
        }, 'modal focus ownership');
      } catch (error) {
        const active = document.activeElement instanceof HTMLElement
          ? document.activeElement.dataset['astylarId'] ?? document.activeElement.tagName
          : undefined;
        throw new Error(`${String(error)} Active: ${active}; interaction: ` +
          `${JSON.stringify(handles.primarySurface?.diagnostics.interaction)}.`);
      }

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
  }, 40_000);
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

function mesh(surfaceHandle: AstylarSurface, elementId: string) {
  const result = surfaceHandle.scene.meshes.find(
    (candidate) => candidate.metadata?.elementId === elementId && !candidate.isDisposed(),
  );
  if (!result) throw new Error(`Could not find Babylon mesh for ${JSON.stringify(elementId)}.`);
  result.computeWorldMatrix(true);
  return result;
}

function meshBounds(surfaceHandle: AstylarSurface, elementId: string) {
  return mesh(surfaceHandle, elementId).getBoundingInfo().boundingBox;
}

function meshCenter(surfaceHandle: AstylarSurface, elementId: string) {
  return meshBounds(surfaceHandle, elementId).centerWorld;
}

function meshWidth(surfaceHandle: AstylarSurface, elementId: string): number {
  return meshBounds(surfaceHandle, elementId).extendSizeWorld.x * 2;
}

function meshYDelta(surfaceHandle: AstylarSurface, firstId: string, secondId: string): number {
  return Math.abs(meshCenter(surfaceHandle, firstId).y - meshCenter(surfaceHandle, secondId).y);
}

async function waitForStableResources(surfaceHandle: AstylarSurface) {
  let previous = JSON.stringify(surfaceHandle.diagnostics.resources);
  let stableSamples = 0;
  while (stableSamples < 3) {
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    const current = JSON.stringify(surfaceHandle.diagnostics.resources);
    stableSamples = current === previous ? stableSamples + 1 : 0;
    previous = current;
  }
  return surfaceHandle.diagnostics.resources;
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
