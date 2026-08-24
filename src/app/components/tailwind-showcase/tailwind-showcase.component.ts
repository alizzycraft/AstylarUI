import { Component, NgZone, computed, inject, signal } from '@angular/core';
import {
  AstylarSurfaceComponent,
  type AstylarRenderOptions,
  type AstylarSurface,
} from '../../../lib';
import { TailwindReferenceComponent } from './tailwind-reference.component';
import {
  TAILWIND_SHOWCASE_TABS,
  createTailwindShowcaseSiteData,
  tailwindShowcaseReferenceNodes,
  type TailwindShowcaseTabId,
} from './tailwind-showcase.data';

interface ShowcaseViewport {
  readonly id: 'compact' | 'desktop';
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

@Component({
  selector: 'app-tailwind-showcase',
  imports: [AstylarSurfaceComponent, TailwindReferenceComponent],
  templateUrl: './tailwind-showcase.component.html',
  styleUrl: './tailwind-showcase.component.scss',
})
export class TailwindShowcaseComponent {
  private readonly zone = inject(NgZone);

  protected readonly tabs = TAILWIND_SHOWCASE_TABS;
  protected readonly viewports: readonly ShowcaseViewport[] = [
    { id: 'compact', label: 'Compact · 520px', width: 520, height: 620 },
    { id: 'desktop', label: 'Desktop · 800px', width: 800, height: 620 },
  ];
  protected readonly selectedTabId = signal<TailwindShowcaseTabId>('layout');
  protected readonly selectedViewportId = signal<ShowcaseViewport['id']>('compact');
  protected readonly renderStatus = signal('Waiting for AstylarUI to settle.');
  protected readonly selectedTab = computed(() =>
    this.tabs.find((tab) => tab.id === this.selectedTabId()) ?? this.tabs[0],
  );
  protected readonly selectedViewport = computed(() =>
    this.viewports.find((viewport) => viewport.id === this.selectedViewportId()) ?? this.viewports[0],
  );
  protected readonly siteData = computed(() => createTailwindShowcaseSiteData(this.selectedTab()));
  protected readonly referenceNodes = computed(() => tailwindShowcaseReferenceNodes(this.selectedTab()));
  protected readonly astylarOptions: AstylarRenderOptions = {
    diagnostics: { logLevel: 'silent' },
  };

  protected selectTab(id: TailwindShowcaseTabId): void {
    this.selectedTabId.set(id);
    this.renderStatus.set(`${this.selectedTab().label} comparison selected.`);
  }

  protected selectViewport(id: ShowcaseViewport['id']): void {
    this.selectedViewportId.set(id);
    this.renderStatus.set(`Both panes are set to ${this.selectedViewport().width}px.`);
  }

  protected onTabKeydown(event: KeyboardEvent, index: number): void {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % this.tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + this.tabs.length) % this.tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = this.tabs.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    this.selectTab(this.tabs[nextIndex].id);
    const tabList = (event.currentTarget as HTMLElement).parentElement;
    tabList?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }

  protected onMounted(surface: AstylarSurface): void {
    void surface;
    this.zone.run(() => this.renderStatus.set('AstylarUI settled. Both panes are ready to compare.'));
  }

  protected onFailed(error: unknown): void {
    this.zone.run(() => this.renderStatus.set(
      `AstylarUI failed: ${error instanceof Error ? error.message : String(error)}`,
    ));
  }
}
