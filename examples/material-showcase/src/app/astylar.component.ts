import { Component, DestroyRef, NgZone, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import {
  AstylarSurfaceComponent,
  type AstylarEvent,
  type AstylarRenderOptions,
  type AstylarSurface,
  type DOMElement,
  type SiteData,
} from 'astylarui';
import { FrameSync } from './frame-sync';
import { MaterialFamily, isMaterialFamily } from './catalog';
import { MATERIAL_FAVORITE_ICON_DARK, MATERIAL_FAVORITE_ICON_LIGHT } from './material-assets';
import { ShowcaseStore, type ShowcaseState } from './showcase.store';
import { alphaHex, mixHex } from './theme';
import { MaterialRippleController } from './material-plugin/material-ripple.controller';

@Component({
  selector: 'app-astylar-showcase',
  providers: [FrameSync, MaterialRippleController],
  imports: [AstylarSurfaceComponent],
  template: `
    <main class="frame" [class.dark]="store.theme().mode === 'dark'" [style.background]="store.theme().surface">
      <astylar-surface [siteData]="siteData()" [options]="options" (mounted)="mounted($event)" (failed)="failed($event)"/>
    </main>
  `,
  styles: [`
    :host,.frame{display:block;height:100%}.frame{min-height:100%;background:#fffbfe;color:#1d1b20}.frame.dark{color:#e6e1e5}astylar-surface{display:block;width:100%;height:100%}
  `],
})
export class AstylarShowcaseComponent {
  protected readonly store = inject(ShowcaseStore);
  private readonly benchmarkMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('benchmark') === '1';
  private readonly benchmarkInteraction = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('interaction')
    : null;
  private readonly route = inject(ActivatedRoute);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sync = inject(FrameSync);
  private readonly ripple = inject(MaterialRippleController);
  protected readonly status = signal('Rendering');
  private surface?: AstylarSurface;
  private pendingSurfaceUpdate?: Promise<unknown>;
  private readonly focusedId = signal<string | undefined>(undefined);
  private readonly datepickerView = signal<'month' | 'years'>('month');
  private readonly fieldValues = signal<Record<'form-field' | 'input' | 'autocomplete', string>>({
    'form-field': 'Atlas',
    input: 'team@example.com',
    autocomplete: '',
  });
  private readonly eventLog: Array<{ type: string; targetId?: string; value?: unknown; clientX?: number; localX?: number }> = [];
  protected readonly family = computed<MaterialFamily>(() => {
    const value = this.route.snapshot.paramMap.get('family');
    return isMaterialFamily(value) ? value : 'button';
  });
  protected readonly siteData = computed(() => this.buildSiteData(this.family()));
  protected readonly options: AstylarRenderOptions = {
    clearColor: Color4.FromHexString('#fffbfeff'),
    events: {
      handlers: new Proxy({}, {
        get: (_target, id: string) => ({
          pointerdown: (event: AstylarEvent) => this.zone.run(() => {
            this.recordEvent(event);
            if (!this.benchmarkMode) this.activateRipple(event);
          }),
          pointerup: (event: AstylarEvent) => this.recordEvent(event),
          pointermove: (event: AstylarEvent) => this.recordEvent(event),
          pointerenter: (event: AstylarEvent) => this.zone.run(() => {
            this.recordEvent(event);
            if (event.targetId === 'tooltip-primary' && (!this.benchmarkMode || ['hover', 'held'].includes(this.benchmarkInteraction ?? ''))) {
              this.store.patchState({ open: true });
            }
          }),
          pointerleave: (event: AstylarEvent) => this.zone.run(() => {
            this.recordEvent(event);
            if (event.targetId === 'tooltip-primary') this.store.patchState({ open: false });
          }),
          focus: (event: AstylarEvent) => this.zone.run(() => {
            this.recordEvent(event);
            this.focusedId.set(event.targetId);
            if (event.targetId === 'autocomplete-control') this.store.patchState({ open: true });
          }),
          blur: (event: AstylarEvent) => this.zone.run(() => {
            this.recordEvent(event);
            if (this.focusedId() === event.targetId) this.focusedId.set(undefined);
          }),
          keydown: (event: AstylarEvent) => this.zone.run(() => { this.recordEvent(event); this.handleKeydown(id, event); }),
          click: (event: AstylarEvent) => this.zone.run(() => {
            this.recordEvent(event);
            this.handleClick(id, event);
          }),
          input: (event: AstylarEvent) => this.zone.run(() => {
            this.recordEvent(event);
            const targetId = event.targetId;
            if (targetId && ['form-field-control', 'input-control', 'autocomplete-control'].includes(targetId)) {
              const family = targetId.replace('-control', '') as 'form-field' | 'input' | 'autocomplete';
              this.fieldValues.update((values) => ({ ...values, [family]: String(event.value ?? '') }));
            }
            if (targetId === 'slider-primary' || targetId === 'slider-start') {
              const nextStart = targetId === 'slider-start' ? Number(event.value) : this.store.state().sliderStart;
              const nextEnd = targetId === 'slider-primary' ? Number(event.value) : this.store.state().sliderValue;
              this.updateSliderVisual(nextStart, nextEnd);
            }
            if (targetId === 'checkbox-primary') this.store.patchState({ selected: event.checked === true });
            if (targetId === 'select-control') this.store.patchState({ selected: event.selectedValue === 'team' || event.value === 'team' });
            if (targetId === 'radio-team') this.store.patchState({ selected: true });
            if (targetId === 'radio-solo') this.store.patchState({ selected: false });
            if (targetId && ['checkbox-primary', 'select-control', 'radio-team', 'radio-solo'].includes(targetId)) {
              const update = this.surface!.update(this.buildSiteData(this.family()));
              this.pendingSurfaceUpdate = update.catch((error) => {
                this.failed(error);
                console.error(error);
                throw error;
              });
              void this.pendingSurfaceUpdate.then(
                () => { this.pendingSurfaceUpdate = undefined; },
                () => { this.pendingSurfaceUpdate = undefined; },
              );
            }
            this.status.set(`Value ${event.value}`);
          }),
          change: (event: AstylarEvent) => this.zone.run(() => {
            this.recordEvent(event);
            if (event.targetId === 'slider-primary') this.store.patchState({ sliderValue: Number(event.value) });
            if (event.targetId === 'slider-start') this.store.patchState({ sliderStart: Number(event.value) });
            this.status.set(`Committed ${event.value}`);
          }),
          close: (event: AstylarEvent) => this.zone.run(() => {
            this.recordEvent(event);
            this.store.patchState({ open: false });
            this.surface?.focus(`${this.family()}-primary`, { focusVisible: true });
          }),
        }),
      }),
    },
  };

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (typeof window !== 'undefined') delete window.__ASTYLAR_MATERIAL_BENCHMARK__;
    });
  }

  protected mounted(surface: AstylarSurface): void {
    if (this.surface && this.surface !== surface) this.ripple.dispose();
    this.surface = surface;
    if (typeof window !== 'undefined') {
      window.__ASTYLAR_MATERIAL_BENCHMARK__ = {
        waitForSettled: async () => {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          await this.pendingSurfaceUpdate;
          await surface.whenSettled();
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          await surface.whenSettled();
        },
        measure: (ids) => this.measure(surface, ids),
        state: () => ({ ...this.store.state(), chips: [...this.store.state().chips] }),
        clearEvents: () => { this.eventLog.length = 0; },
        events: () => this.eventLog.map((event) => ({ ...event })),
      };
    }
    void surface.whenSettled().then(() => this.zone.run(() => this.status.set('Settled')));
  }
  protected failed(error: unknown): void { this.status.set(error instanceof Error ? error.message : String(error)); }

  private recordEvent(event: AstylarEvent): void {
    if (event.currentTargetId !== event.targetId) return;
    this.eventLog.push({
      type: event.type,
      targetId: event.targetId,
      value: event.value,
      clientX: event.clientX,
      localX: event.localX,
    });
  }

  private handleClick(id: string, event: AstylarEvent): void {
    if (this.benchmarkMode && this.benchmarkInteraction === 'held') return;
    const targetId = event.targetId ?? id;
    if (this.store.state().disabled && ['checkbox-primary', 'radio-solo', 'radio-team', 'slide-toggle-primary'].includes(id)) return;
    if (targetId.startsWith('autocomplete-option-cape-town') || targetId.startsWith('autocomplete-option-johannesburg')) {
      this.fieldValues.update((values) => ({
        ...values,
        autocomplete: targetId.includes('cape-town') ? 'Cape Town' : 'Johannesburg',
      }));
      this.store.patchState({ open: false });
    }
    if (targetId === 'select-option-solo' || targetId === 'select-option-team' || targetId === 'select-team-label' || targetId === 'select-check') {
      this.store.patchState({ selected: targetId !== 'select-option-solo', open: false });
    }
    if (id === 'radio-team') this.store.patchState({ selected: true });
    if (id === 'radio-solo') this.store.patchState({ selected: false });
    if (id === 'checkbox-primary') this.store.patchState({ selected: !this.store.state().selected });
    const chipIndex = Number((event.targetId ?? id).match(/^chip-(\d+)/)?.[1]);
    if (Number.isInteger(chipIndex)) this.store.patchState({
      chipSelections: this.store.state().chipSelections.map((selected, index) =>
        index === chipIndex ? !selected : selected),
    });
    if (id === 'sort-primary' || id === 'sort-trigger') {
      const sortActive = this.store.state().open;
      this.store.patchState({
        sortDirection: sortActive && this.store.state().sortDirection === 'asc' ? 'desc' : 'asc',
        open: true,
      });
    }
    if (id === 'paginator-next') this.store.patchState({ pageIndex: Math.min(9, this.store.state().pageIndex + 1) });
    if (id === 'paginator-previous') this.store.patchState({ pageIndex: Math.max(0, this.store.state().pageIndex - 1) });
    if (id === 'button-toggle-one' || id === 'tab-activity') this.store.patchState({ selected: false });
    if (id === 'button-toggle-two' || id === 'tab-overview') this.store.patchState({ selected: true });
    if (id === 'step-review') this.store.patchState({ selected: false });
    if (id === 'step-details') this.store.patchState({ selected: true });
    if (id === 'select-control') this.store.patchState({ open: !this.store.state().open });
    if (id === 'autocomplete-control') this.store.patchState({ open: true });
    if (id === 'datepicker-icon' || targetId.startsWith('datepicker-icon-visual') || targetId.startsWith('datepicker-calendar-')) {
      const opening = !this.store.state().open;
      if (opening) this.datepickerView.set('month');
      this.store.patchState({ open: opening });
    }
    if (id === 'datepicker-month') {
      this.datepickerView.set('years');
    }
    if (targetId.startsWith('datepicker-year-')) {
      this.datepickerView.set('month');
    }
    if (id === 'timepicker-icon' || targetId.startsWith('timepicker-icon-visual') || targetId.startsWith('timepicker-clock-')) {
      this.store.patchState({ open: !this.store.state().open });
    }
    if (id === 'slide-toggle-primary') this.store.patchState({ selected: !this.store.state().selected });
    if (['dialog-primary', 'bottom-sheet-primary'].includes(id)) {
      const wasOpen = this.store.state().open;
      this.store.patchState({ open: !wasOpen });
      if (wasOpen) this.surface?.focus(id, { focusVisible: true });
      else void this.surface?.whenSettled().then(() => this.surface?.focus(id.replace('-primary', '-dismiss')));
    }
    if (id === 'snack-bar-primary') this.store.patchState({ open: true });
    if (id === 'menu-primary') this.store.patchState({ open: !this.store.state().open });
    if (id === 'tooltip-primary' && this.benchmarkMode && this.benchmarkInteraction === 'open') {
      this.store.patchState({ open: true });
    }
    if (id === 'expansion-primary') this.store.patchState({ open: !this.store.state().open });
    if (id.endsWith('-dismiss')) {
      this.store.patchState({ open: false });
      this.surface?.focus(id.replace('-dismiss', '-primary'), { focusVisible: true });
    }
    if (id === 'dialog-cancel' || id === 'dialog-save') {
      this.store.patchState({ open: false });
      this.surface?.focus('dialog-primary', { focusVisible: true });
    }
    this.dismissPopupForOutsideTarget(targetId);
    this.status.set(`Activated ${event.targetId}`);
  }

  private updateSliderVisual(start: number, end: number): void {
    const range = this.surface?.scene.meshes.find((mesh) =>
      mesh.metadata?.showcaseMaterialVisual === 'range');
    const updateRange = range?.metadata?.updateRange;
    if (typeof updateRange === 'function') updateRange(start / 100, end / 100);
  }

  private dismissPopupForOutsideTarget(targetId: string): void {
    if (!this.store.state().open) return;
    const family = this.family();
    const insidePrefixes: Partial<Record<MaterialFamily, readonly string[]>> = {
      autocomplete: ['autocomplete-control', 'autocomplete-option-', 'field-options'],
      select: ['select-control', 'select-caret', 'select-option-', 'select-options'],
      datepicker: ['datepicker-icon', 'datepicker-calendar-', 'datepicker-popup', 'datepicker-header', 'datepicker-month', 'datepicker-nav', 'datepicker-previous', 'datepicker-next', 'datepicker-grid', 'datepicker-cell', 'datepicker-day-', 'datepicker-selected', 'datepicker-year-grid', 'datepicker-year-'],
      timepicker: ['timepicker-icon', 'timepicker-clock-icon', 'timepicker-clock-hand', 'timepicker-gap', 'timepicker-active-line', 'timepicker-options', 'timepicker-option-', 'timepicker-scroll'],
      menu: ['menu-primary', 'menu-popup', 'menu-rename', 'menu-delete'],
      dialog: ['dialog-primary', 'dialog-panel', 'dialog-title', 'dialog-copy', 'dialog-actions', 'dialog-cancel', 'dialog-save'],
    };
    const prefixes = insidePrefixes[family];
    if (!prefixes || prefixes.some((prefix) => targetId.startsWith(prefix))) return;
    this.store.patchState({ open: false });
    if (family === 'dialog') this.surface?.focus('dialog-primary', { focusVisible: true });
  }

  private activateRipple(event: AstylarEvent): void {
    if (!this.surface || !['button-primary', 'button-secondary', 'core-primary', 'toolbar-action', 'card-open'].includes(event.targetId)) return;
    const theme = this.store.tokens();
    const toolbarAction = event.targetId === 'toolbar-action';
    const mobileToolbar = toolbarAction &&
      (this.surface.scene.getEngine().getRenderingCanvas()?.clientWidth ?? Number.POSITIVE_INFINITY) <= 500;
    this.ripple.activate({
      surface: this.surface,
      elementId: event.targetId,
      originX: event.localX ?? 0,
      originY: event.localY ?? 0,
      width: event.targetId === 'card-open' ? 64 : toolbarAction ? mobileToolbar ? 64 : 65.140625 :
        event.targetId === 'core-primary' ? 212.234375 : event.targetId === 'button-secondary' ? 117 : 141,
      height: event.targetId === 'card-open' ? materialDensityHeight(theme.density) : toolbarAction ? toolbarActionHeight(theme.density) : materialDensityHeight(theme.density),
      cornerRadius: (event.targetId === 'card-open' ? materialDensityHeight(theme.density) / 2 : 20) * theme.cornerScale,
      color: event.targetId === 'button-secondary' || toolbarAction || event.targetId === 'card-open' ? theme.primary : theme.onPrimary,
    });
  }

  private handleKeydown(id: string, event: AstylarEvent): void {
    if (event.key !== 'Escape' || !this.store.state().open) return;
    this.store.patchState({ open: false });
    const family = this.family();
    this.surface?.focus(`${family}-primary`, { focusVisible: true });
  }

  private buildSiteData(family: MaterialFamily): SiteData {
    const theme = this.store.tokens();
    const state = this.store.state();
    const toolbarHeld = family === 'toolbar' && this.store.benchmarkPhase() === 'held';
    if (this.surface) this.surface.scene.clearColor = Color4.FromHexString(`${theme.surface}ff`);
    const rootId = `${family}-root`;
    const densityHeight = materialDensityHeight(theme.density);
    const emptyFieldActive = state.error || (
      ['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker'].includes(family) &&
      this.focusedId() === `${family}-control`
    );
    const referenceHeight = family === 'button' ? 58 + densityHeight
      : materialReferenceHeight(family, theme.density) + (family === 'expansion' && state.open ? 88 : 0);
    const content = this.familyElements(family);
    return {
      plugins: [{ id: 'showcase.material', versionRange: '^1.0.0', schemaVersion: 1 }],
      root: { children: [{
        type: 'main', id: 'page', children: [
          { type: 'p', id: 'eyebrow', textContent: 'Angular Material 20 reference' },
          { type: 'h1', id: 'title', textContent: family },
          { type: 'section', id: rootId, ariaLabel: `${family} showcase`, children: content },
        ],
      }] },
      styles: [
        { selector: 'root', background: theme.surface },
        { selector: '#page', width: '100%', minHeight: '100%', padding: '36px', background: theme.surface, color: theme.onSurface, fontFamily: 'Roboto, Arial, sans-serif', fontSize: `${16 * theme.typographyScale}px` },
        { selector: '#eyebrow', color: this.benchmarkMode ? theme.surface : theme.primary, fontSize: `${(theme.typographyScale > 1 ? 16 : 12) * theme.typographyScale}px`, fontWeight: '700', textTransform: 'uppercase', letterSpacing: `${(theme.typographyScale > 1 ? 1.28 : 1.2) * theme.typographyScale}px`, marginBottom: '6px' },
        { selector: '#title', color: this.benchmarkMode ? theme.surface : theme.onSurface, position: 'relative', top: theme.typographyScale > 1 ? '3.5px' : '0', fontSize: '32px', fontWeight: '700', textTransform: 'capitalize', marginBottom: `${31.875 + 31 * (theme.typographyScale - 1) + (theme.density <= -5 ? 2.34375 : 0) - (theme.typographyScale > 1 ? 12.95 : 0)}px` },
        ...(theme.typographyScale > 1 ? [{ selector: '#title', mediaMaxWidth: '500px', marginBottom: `${31.875 + 31 * (theme.typographyScale - 1) - 6.9}px` }] : []),
        ...(theme.typographyScale > 1 ? [{ selector: '#eyebrow', mediaMaxWidth: '500px', height: '37px' }] : []),
        { selector: `#${rootId}`, position: 'relative', width: '100%', maxWidth: '778px', height: `${referenceHeight}px`, boxSizing: 'border-box', padding: '28px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#cac4d0', borderRadius: `${24 * theme.cornerScale}px`, background: theme.surfaceContainer, boxShadow: '0 2px 8px rgba(0,0,0,0.14)', display: 'flex', flexDirection: 'column', gap: '16px' },
        ...(family === 'toolbar' && theme.density === 0 ? [{ selector: `#${rootId}`, mediaMaxWidth: '500px', height: '114px' }] : []),
        ...(family === 'toolbar' && theme.density === -2 ? [{ selector: `#${rootId}`, mediaMaxWidth: '500px', height: '106px' }] : []),
        ...(family === 'toolbar' && theme.density <= -5 ? [{ selector: `#${rootId}`, mediaMaxWidth: '500px', height: '102px' }] : []),
        ...(family === 'paginator' && theme.density === -2 ? [{ selector: `#${rootId}`, mediaMaxWidth: '500px', height: '114px' }] : []),
        ...(family === 'paginator' && theme.density <= -5 ? [{ selector: `#${rootId}`, mediaMaxWidth: '500px', height: '102px' }] : []),
        ...(family === 'button' ? [{ selector: `#${rootId}`, mediaMaxWidth: '500px', height: `${58 + densityHeight * 2}px` }] : []),
        { selector: '.material-button', width: '141px', height: `${densityHeight}px`, padding: '0 24px', borderRadius: `${20 * theme.cornerScale}px`, borderWidth: '0', background: theme.primary, color: theme.onPrimary, fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
        { selector: '#core-primary', position: 'absolute', top: '28px', left: '28px', width: '212.234375px', height: `${densityHeight}px` },
        { selector: `#${family}-secondary`, width: family === 'button' ? '117px' : '110px' },
        { selector: `#${family}-disabled`, width: family === 'button' ? '103px' : '99px', opacity: '1', background: theme.density === -2 ? '#ccd8d8' : mixHex(theme.surfaceContainer, theme.onSurface, .12), color: mixHex(theme.surfaceContainer, theme.onSurface, .38) },
        { selector: '#radio-primary', position: 'relative', width: theme.density <= -5 ? '129px' : theme.density < 0 ? '137px' : '153px', height: `${theme.density <= -5 ? 18 : theme.density < 0 ? 22 : 19}px`, marginTop: theme.density < 0 ? '4px' : '9px', alignSelf: 'flex-start' },
        { selector: '.radio-option', position: 'absolute', top: '-10px', height: '40px', display: 'flex', alignItems: 'center', color: theme.onSurface },
        { selector: '#radio-solo', left: '0', width: '68px' },
        { selector: '#radio-team', left: '73px', width: '80px' },
        { selector: '.radio-ring', position: 'relative', width: '20px', height: '20px', boxSizing: 'border-box', borderWidth: '2px', borderStyle: 'solid', borderColor: theme.onSurface, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        { selector: '.radio-ring.selected', borderColor: theme.primary },
        { selector: '.radio-dot', width: '10px', height: '10px', flexShrink: '0', borderRadius: '5px', background: theme.primary },
        { selector: '.radio-label', marginLeft: '8px', fontSize: '14px', verticalAlign: 'middle' },
        { selector: '#slide-toggle-primary', position: 'relative', width: '179px', height: '32px', alignSelf: 'flex-start' },
        { selector: '.switch-state-layer', position: 'absolute', zIndex: '3', top: '-4px', left: state.selected ? '16px' : '-6px', width: '40px', height: '40px', borderRadius: '20px', background: 'transparent' },
        { selector: '#slide-toggle-primary:hover .switch-state-layer', background: alphaHex(state.selected ? theme.primary : theme.onSurface, .08) },
        { selector: '#slide-toggle-primary:active .switch-state-layer', background: alphaHex(state.selected ? theme.primary : theme.onSurface, .12) },
        { selector: '.switch-track', position: 'absolute', zIndex: '2', top: '0', left: '0', width: '52px', height: '32px', boxSizing: 'border-box', borderWidth: state.selected ? '0' : '2px', borderStyle: 'solid', borderColor: '#79747e', borderRadius: '16px', background: state.selected ? theme.primary : state.disabled ? mixHex(theme.surfaceContainer, theme.onSurface, .08) : 'transparent' },
        { selector: '.switch-thumb', position: 'absolute', top: '4px', left: state.selected ? '24px' : '4px', width: '24px', height: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: state.selected ? theme.surface : '#79747e', color: state.selected ? theme.primary : theme.surfaceContainer, textAlign: 'center', fontSize: '14px' },
        { selector: '.switch-label', position: 'absolute', zIndex: '2', top: '6px', left: '60px', whiteSpace: 'nowrap', color: theme.onSurface, fontSize: '14px', verticalAlign: 'middle' },
        { selector: '#button-toggle-primary', width: '130px', height: `${theme.density <= -5 ? 26 : 42}px`, boxSizing: 'border-box', borderWidth: '1px', borderStyle: 'solid', borderColor: '#79747e', borderRadius: `${(theme.density <= -5 ? 13 : 21) * theme.cornerScale}px`, display: 'flex', alignSelf: 'flex-start', overflow: 'hidden', background: '#eadef7' },
        { selector: '.button-toggle-option', height: `${theme.density <= -5 ? 24 : 40}px`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: theme.onSurface, fontSize: '14px', cursor: 'pointer' },
        { selector: '#button-toggle-one-label, #button-toggle-two-label', verticalAlign: 'middle' },
        { selector: '#button-toggle-one', width: state.selected ? '47px' : '81px', borderRadius: `${20 * theme.cornerScale}px 0 0 ${20 * theme.cornerScale}px`, background: state.selected ? theme.surfaceContainer : 'transparent' },
        { selector: '#button-toggle-two', width: state.selected ? '81px' : '47px', borderWidth: '0 0 0 1px', borderStyle: 'solid', borderColor: '#79747e', borderRadius: `0 ${20 * theme.cornerScale}px ${20 * theme.cornerScale}px 0`, background: state.selected ? 'transparent' : theme.surfaceContainer },
        { selector: '.button-toggle-option.selected', color: '#4b4357' },
        { selector: '#menu-primary', width: '120px' },
        { selector: '#menu-popup', position: 'absolute', top: '69px', left: '32px', width: '111px', height: '112px', boxSizing: 'border-box', padding: '8px 0', borderRadius: '4px', background: '#f3edf7', boxShadow: '0 2px 6px rgba(0,0,0,0.24)', zIndex: '50' },
        { selector: '#menu-rename, #menu-delete', width: '111px', height: '48px', padding: '0 12px', borderWidth: '0', background: 'transparent', color: '#1d1b20', textAlign: 'left', fontSize: '14px' },
        { selector: '#menu-rename:hover, #menu-delete:hover', background: mixHex('#f3edf7', '#1d1b20', .08) },
        { selector: '#menu-rename:active, #menu-delete:active', background: mixHex('#f3edf7', '#1d1b20', .12) },
        { selector: '#bottom-sheet-primary', width: '169px' },
        { selector: '#dialog-primary', width: '124px' },
        { selector: '#snack-bar-primary', width: '145px' },
        { selector: '#tooltip-primary', width: '138px' },
        { selector: '.material-button:hover', background: mixHex(theme.primary, theme.onPrimary, .08) },
        { selector: '.material-button:active', background: mixHex(theme.primary, theme.onPrimary, .12) },
        { selector: '.material-button.outlined:hover', background: mixHex(theme.surfaceContainer, theme.primary, .08) },
        { selector: '.material-button.outlined:active', background: mixHex(theme.surfaceContainer, theme.primary, .12) },
        { selector: '.outlined', background: theme.surfaceContainer, color: theme.primary, borderWidth: '1px', borderStyle: 'solid', borderColor: '#79747e' },
        { selector: '.field', width: '100%', height: '56px', padding: '12px 16px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#79747e', borderRadius: `${4 * theme.cornerScale}px`, background: theme.surface, color: theme.mode === 'dark' ? '#e6e1e5' : '#1d1b20' },
        { selector: '.field-shell', position: 'relative', width: '100%', height: `${theme.density === 0 ? 78 : theme.density <= -5 ? 62 : 70}px`, alignSelf: 'flex-start', boxSizing: 'border-box', background: 'transparent' },
        { selector: '.field-surface', position: 'absolute', top: '0', left: '0', width: '100%', height: `${theme.density === 0 ? 56 : theme.density <= -5 ? 35 : 48}px`, boxSizing: 'border-box', borderRadius: `${4 * theme.cornerScale}px`, background: '#e8e0eb', boxShadow: '0 1px 0 #49454f' },
        { selector: '.field-surface.active', boxShadow: `0 2px 0 ${state.error ? theme.error : theme.primary}` },
        { selector: '.field-label', position: 'absolute', top: '8px', left: '16px', color: state.error ? theme.error : theme.density <= -5 ? '#000000' : '#49454f', fontSize: '12px', letterSpacing: '.4px', verticalAlign: 'middle' },
        { selector: '.field-label.empty-field-label', top: `${emptyFieldActive ? 8 : theme.density === 0 ? 20 : 16}px`, color: state.error ? theme.error : emptyFieldActive ? theme.primary : '#1d1b20', fontSize: emptyFieldActive ? '12px' : '16px', letterSpacing: emptyFieldActive ? '.4px' : '.65px' },
        { selector: '.field-label.compact-filled-label', display: 'none' },
        { selector: '.field-input-region', position: 'absolute', top: `${theme.density === 0 ? 24 : 16}px`, left: '0', width: '100%', height: '24px', boxSizing: 'border-box', padding: '0 16px', background: 'transparent' },
        { selector: '.field-input-region.compact-filled-input-region', top: '6px' },
        { selector: '#datepicker-input-region', right: '48px', width: 'auto' },
        { selector: '#timepicker-input-region', right: '48px', width: 'auto' },
        { selector: '.field-control', position: 'relative', width: '100%', height: '24px', boxSizing: 'border-box', padding: '0', borderWidth: '0', borderRadius: '0', background: 'transparent', boxShadow: 'none', color: '#1d1b20', fontSize: '16px' },
        { selector: '.field-control:focus', borderWidth: '0', color: '#1d1b20', boxShadow: 'none' },
        { selector: '.select-control', paddingRight: '32px', cursor: 'pointer', boxShadow: 'none' },
        { selector: '.select-caret', position: 'absolute', top: `${theme.density === 0 ? 18 : 14}px`, right: '15px', color: state.open ? theme.primary : theme.onSurface, fontSize: '12px' },
        { selector: '.select-popup', position: 'absolute', top: `${theme.density === 0 ? 56 : 48}px`, left: '7px', right: '7px', width: 'auto', height: `${theme.density === 0 ? 112 : 104}px`, boxSizing: 'border-box', padding: '8px 0', background: '#f2ecf1', boxShadow: '0 2px 6px rgba(0,0,0,0.24)', zIndex: '60' },
        { selector: '.select-option', position: 'relative', width: '100%', height: '48px', boxSizing: 'border-box', padding: '14px 16px', color: '#1d1b20', fontSize: '16px' },
        { selector: '.select-option.selected', background: '#eadef7' },
        { selector: '.select-option:hover', background: '#e5dfe5' },
        { selector: '.select-option.selected:hover', background: '#dfd3ef' },
        { selector: '.select-option:active', background: '#d8d2d8' },
        { selector: '.autocomplete-popup', top: `${theme.density === 0 ? 58 : 50}px` },
        { selector: '.autocomplete-popup .select-option', padding: `${theme.density === 0 ? 20 : 16}px 16px` },
        { selector: '.select-check', position: 'absolute', top: '14px', right: '16px', color: '#49454f' },
        { selector: '.picker-control.open', boxShadow: 'none' },
        { selector: '.picker-clock', position: 'absolute', top: `${theme.density === 0 ? 8 : 4}px`, right: '4px', width: '40px', height: '40px', boxSizing: 'border-box', padding: '0', borderWidth: '0', borderRadius: '20px', background: 'transparent', color: theme.mode === 'dark' && state.open ? '#49454f' : theme.onSurface, fontSize: '24px', zIndex: '4' },
        { selector: '.picker-clock:hover', background: 'rgba(73,69,79,0.08)' },
        { selector: '.picker-clock:active', background: 'rgba(73,69,79,0.12)' },
        { selector: '.picker-icon-visual', position: 'absolute', top: `${theme.density === 0 ? 8 : 4}px`, right: '4px', width: '40px', height: '40px', boxSizing: 'border-box', borderRadius: '20px', background: 'transparent', zIndex: '3' },
        { selector: '.calendar-icon', position: 'absolute', zIndex: '1', top: '11px', left: '11px', width: '18px', height: '18px', boxSizing: 'border-box', borderWidth: '2px', borderStyle: 'solid', borderColor: '#49454f', borderRadius: '2px' },
        { selector: '.calendar-icon-line', position: 'absolute', top: '4px', left: '0', width: '14px', height: '2px', background: '#49454f' },
        { selector: '.calendar-icon-day', position: 'absolute', top: '9px', left: '5px', width: '5px', height: '5px', background: '#49454f' },
        { selector: '.calendar-icon-binding', position: 'absolute', top: '-4px', width: '2px', height: '5px', background: '#49454f' },
        { selector: '.calendar-icon-binding.first', left: '3px' },
        { selector: '.calendar-icon-binding.last', right: '3px' },
        { selector: '.clock-icon', position: 'absolute', zIndex: '1', top: '10px', left: '10px', width: '20px', height: '20px', boxSizing: 'border-box', borderWidth: '2px', borderStyle: 'solid', borderColor: '#49454f', borderRadius: '10px' },
        { selector: '.clock-hand', position: 'absolute', left: '7px', top: '3px', width: '2px', height: '7px', background: '#49454f' },
        { selector: '.clock-hand.minute', left: '8px', top: '9px', width: '7px', height: '2px', transform: 'rotate(45deg)' },
        { selector: '.picker-popup', position: 'absolute', top: `${theme.density === 0 ? 56 : 48}px`, left: '7px', right: '7px', width: 'auto', height: `${theme.density === 0 ? 312 : 280}px`, boxSizing: 'border-box', paddingTop: '8px', overflow: 'scroll', background: '#f2ecf1', boxShadow: '0 2px 6px rgba(0,0,0,0.24)', zIndex: '60' },
        { selector: '.picker-option', width: '100%', height: `${theme.density === 0 ? 48 : 42}px`, boxSizing: 'border-box', padding: `${theme.density === 0 ? 14 : 11}px 16px`, color: '#1d1b20', fontSize: '16px' },
        { selector: '.picker-option.selected', background: '#d8d2d8' },
        { selector: '.picker-option:hover', background: '#e5dfe5' },
        { selector: '.picker-option:active', background: '#d8d2d8' },
        { selector: '.timepicker-shell .field-surface', height: `${theme.density <= -5 && state.open ? 34 : theme.density === 0 ? 56 : 48}px` },
        { selector: '.timepicker-shell .field-label', color: theme.density <= -5 && state.open ? '#e8e0eb' : state.open ? theme.primary : theme.onSurface },
        { selector: '.timepicker-gap', position: 'absolute', top: `${theme.density <= -5 ? 34 : theme.density === 0 ? 56 : 48}px`, left: '7px', right: '7px', height: '8px', background: '#f2ecf1', zIndex: '60' },
        { selector: '.timepicker-active-line', position: 'absolute', top: `${theme.density <= -5 ? 32 : theme.density === 0 ? 54 : 46}px`, left: '7px', right: '7px', height: '2px', background: theme.primary, zIndex: '61' },
        { selector: '.timepicker-shell .picker-popup', top: `${theme.density <= -5 ? 42 : theme.density === 0 ? 64 : 56}px`, height: '248px', paddingTop: '0' },
        { selector: '.timepicker-shell .picker-option', height: `${theme.density <= -5 ? 48 : theme.density === 0 ? 48 : 42}px`, padding: `${theme.density <= -5 || theme.density === 0 ? 14 : 11}px 16px` },
        { selector: '.timepicker-scroll-track', position: 'absolute', top: `${theme.density <= -5 ? 42 : theme.density === 0 ? 64 : 56}px`, right: '7px', width: '12px', height: '248px', background: '#f2ecf1', zIndex: '62' },
        { selector: '.timepicker-scroll-thumb', position: 'absolute', top: '4px', right: '1px', width: '10px', height: '32px', borderRadius: '5px', background: '#79747e' },
        { selector: '.datepicker-shell .field-surface', height: `${theme.density <= -5 && state.open ? 36 : theme.density === 0 ? 56 : 48}px` },
        { selector: '.datepicker-shell .field-label', color: theme.density < 0 && state.open ? '#e8e0eb' : theme.onSurface },
        { selector: '.datepicker-popup', position: 'absolute', top: `${theme.density <= -5 ? 39 : theme.density === 0 ? 59 : 51}px`, left: '7px', width: '291px', height: '349px', boxSizing: 'border-box', borderRadius: `${16 * theme.cornerScale}px`, background: '#ede6eb', boxShadow: '0 2px 4px rgba(0,0,0,0.24)', zIndex: '60' },
        { selector: '.datepicker-header', position: 'relative', width: '100%', height: '64px', boxSizing: 'border-box', padding: '0 24px', display: 'flex', alignItems: 'center', color: '#1d1b20', fontSize: '14px', fontWeight: '500' },
        { selector: '.datepicker-month', position: 'absolute', top: '13px', left: '12px', height: '40px', boxSizing: 'border-box', padding: '0 12px', borderWidth: '0', borderRadius: '20px', background: 'transparent', color: '#1d1b20', fontSize: '14px', fontWeight: '500', verticalAlign: 'middle' },
        { selector: '.datepicker-month:hover', borderRadius: '20px', background: '#e5dfe5' },
        { selector: '.datepicker-month:active', borderRadius: '20px', background: '#d8d2d8' },
        { selector: '.datepicker-nav', position: 'absolute', top: '29px', width: '24px', height: '24px', color: '#49454f', fontSize: '24px', textAlign: 'center', verticalAlign: 'middle' },
        { selector: '.datepicker-previous', right: '52px' },
        { selector: '.datepicker-next', right: '12px' },
        { selector: '.datepicker-grid', position: 'absolute', top: '64px', left: '21px', width: '280px', height: '280px', display: 'grid', gridTemplateColumns: 'repeat(7, 40px)', gridTemplateRows: 'repeat(7, 40px)' },
        { selector: '.datepicker-cell', position: 'relative', width: '40px', height: '40px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d1b20', fontSize: '14px', verticalAlign: 'middle' },
        { selector: '.datepicker-cell:hover', borderRadius: '20px', background: '#e5dfe5' },
        { selector: '.datepicker-cell:active', borderRadius: '20px', background: '#d8d2d8' },
        { selector: '.datepicker-weekday, .datepicker-month-marker', fontWeight: '500' },
        { selector: '.datepicker-selected', position: 'absolute', top: `${64 + materialSelectedDayRow() * 40 + 2}px`, left: `${11 + materialSelectedDayColumn() * 40 + 2}px`, width: '36px', height: '36px', boxSizing: 'border-box', borderWidth: '1px', borderStyle: 'solid', borderColor: theme.mode === 'dark' ? '#d5baff' : '#7d00fa', borderRadius: '18px', zIndex: '61' },
        { selector: '.datepicker-year-grid', position: 'absolute', top: '84px', left: '8px', width: '280px', height: '240px', display: 'grid', gridTemplateColumns: 'repeat(4, 70px)', gridTemplateRows: 'repeat(6, 40px)' },
        { selector: '.datepicker-year', width: '60px', height: '40px', marginLeft: '5px', boxSizing: 'border-box', padding: '0', borderWidth: '0', borderRadius: '20px', background: 'transparent', color: '#1d1b20', fontSize: '14px' },
        { selector: '.datepicker-year:hover', background: '#e5dfe5' },
        { selector: '.datepicker-year:active', background: '#d8d2d8' },
        { selector: '.datepicker-year.selected', borderWidth: '1px', borderStyle: 'solid', borderColor: theme.mode === 'dark' ? '#d5baff' : '#7d00fa' },
        { selector: '.field-hint', position: 'absolute', top: `${theme.density === 0 ? 58 : theme.density <= -5 ? 39 : 50}px`, left: '16px', fontSize: '12px', letterSpacing: '.4px', color: theme.onSurface },
        { selector: '.field-error', position: 'absolute', top: `${theme.density === 0 ? 58 : theme.density <= -5 ? 39 : 50}px`, left: '16px', fontSize: '12px', letterSpacing: '.4px', color: theme.error },
        { selector: '.row', display: 'flex', flexWrap: 'wrap', gap: '0', alignItems: 'center' },
        { selector: '.card', padding: '20px', borderRadius: `${16 * theme.cornerScale}px`, background: theme.mode === 'dark' ? '#2b2930' : '#f3edf7', minHeight: '90px' },
        { selector: '.material-card', position: 'relative', width: '100%', height: '120px', boxSizing: 'border-box', borderRadius: `${12 * theme.cornerScale}px`, background: theme.mode === 'dark' ? '#fff7ff' : '#f8f2f6', boxShadow: '0 2px 1px -1px rgba(0,0,0,0.2), 0 1px 1px 0 rgba(0,0,0,0.14), 0 1px 3px 0 rgba(0,0,0,0.12)', zIndex: '2' },
        { selector: '.card-title', position: 'absolute', top: `${theme.density <= -5 ? 15.5 : 14.75}px`, left: '16px', fontSize: '22px', fontWeight: '400', whiteSpace: 'nowrap', zIndex: '2' },
        { selector: '.card-copy', position: 'absolute', top: `${theme.typographyScale > 1 ? 43.5 : 42.75}px`, left: '16px', fontSize: '16px', whiteSpace: 'nowrap', zIndex: '2' },
        { selector: '.text-button', position: 'absolute', top: `${theme.density === 0 ? 71.25 : theme.density <= -5 ? 76 : 78}px`, left: '8px', width: '64px', height: `${densityHeight}px`, padding: '0 8px', borderWidth: '0', borderRadius: `${densityHeight / 2 * theme.cornerScale}px`, background: 'transparent', color: theme.primary, fontSize: '14px', fontWeight: '500', cursor: 'pointer', zIndex: '2' },
        { selector: '.text-button:hover', background: mixHex(theme.mode === 'dark' ? '#fff7ff' : '#f8f2f6', theme.primary, .08) },
        { selector: '.text-button:active', background: mixHex(theme.mode === 'dark' ? '#fff7ff' : '#f8f2f6', theme.primary, .12) },
        { selector: '.material-table', width: '100%', height: `${theme.density === 0 ? 160 : theme.density <= -5 ? 112 : 136}px`, borderWidth: '0', background: theme.surface, fontSize: '16px' },
        { selector: '.material-table th', position: 'relative', height: `${theme.density === 0 ? 56 : theme.density <= -5 ? 40 : 48}px`, padding: '0 16px', borderWidth: '0', textAlign: 'left', verticalAlign: 'middle', fontWeight: '500', fontSize: '16px' },
        { selector: '.material-table td', position: 'relative', height: `${theme.density === 0 ? 52 : theme.density <= -5 ? 36 : 44}px`, padding: '0 16px', borderWidth: '0', textAlign: 'left', verticalAlign: 'middle', fontSize: '16px' },
        { selector: '.table-rule', position: 'absolute', left: '28px', right: '28px', width: 'auto', height: '1px', background: '#79747e' },
        { selector: '.table-rule-one', top: `${theme.density === 0 ? 84 : theme.density <= -5 ? 68 : 76}px` },
        { selector: '.table-rule-two', top: `${theme.density === 0 ? 136 : theme.density <= -5 ? 104 : 120}px` },
        { selector: '.expansion-panel', position: 'relative', width: '100%', height: `${state.open ? theme.density === 0 ? 136 : theme.density <= -5 ? 112 : 120 : theme.density === 0 ? 48 : theme.density <= -5 ? 36 : 40}px`, borderRadius: `${12 * theme.cornerScale}px`, background: theme.surface, boxShadow: '0 1px 2px #00000055' },
        { selector: '.expansion-trigger', width: '100%', height: `${state.open ? theme.density === 0 ? 64 : theme.density <= -5 ? 52 : 56 : theme.density === 0 ? 48 : theme.density <= -5 ? 36 : 40}px`, boxSizing: 'border-box', padding: '0 24px', borderWidth: '0', display: 'flex', alignItems: 'center', background: 'transparent', color: theme.onSurface, fontWeight: '500', textAlign: 'left' },
        { selector: '.expansion-trigger:focus, .expansion-trigger:hover', background: mixHex(theme.surface, theme.onSurface, .08) },
        { selector: '.expansion-trigger:active', background: mixHex(theme.surface, theme.onSurface, .12) },
        { selector: '.expansion-title', fontWeight: '700', lineHeight: '20px', verticalAlign: 'middle' },
        { selector: '.expansion-chevron', position: 'absolute', top: `${state.open ? 27 : 15}px`, right: '24px', width: '8px', height: '8px', boxSizing: 'border-box', borderWidth: '1.5px 1.5px 0 0', borderStyle: 'solid', borderColor: theme.onSurface, transform: state.open ? 'rotate(-45deg)' : 'rotate(135deg)' },
        { selector: '#expansion-content', position: 'absolute', display: state.open ? 'block' : 'none', top: `${state.open ? theme.density === 0 ? 80 : theme.density <= -5 ? 60 : 68 : 0}px`, left: '0', width: '100%', boxSizing: 'border-box', padding: '0 24px', margin: '0', textAlign: 'left', verticalAlign: 'middle' },
        { selector: '.expansion-content-label', position: 'absolute', top: '-1px', left: '0', textAlign: 'left' },
        { selector: '.toolbar', position: 'relative', width: '100%', height: `${theme.density === 0 ? 64 : theme.density <= -5 ? 52 : 56}px`, display: 'flex', alignItems: 'center', background: theme.surface, color: theme.onSurface },
        ...(theme.density === 0 ? [{ selector: '.toolbar', mediaMaxWidth: '500px', height: '56px' }] : []),
        ...(theme.density === -2 ? [{ selector: '.toolbar', mediaMaxWidth: '500px', height: '48px' }] : []),
        ...(theme.density <= -5 ? [{ selector: '.toolbar', mediaMaxWidth: '500px', height: '44px' }] : []),
        { selector: '.toolbar-title', width: '192.15625px', height: '28px', marginLeft: '16px', whiteSpace: 'nowrap', fontSize: '22px', fontWeight: '400', lineHeight: '28px' },
        { selector: '.toolbar-title-text', position: 'relative', top: `${theme.density <= -5 ? -1 : -2}px` },
        { selector: '.toolbar-action', position: 'absolute', top: `${theme.density === 0 ? 11 : theme.density <= -5 ? 14 : 12.5}px`, right: '16px', width: '65.140625px', height: `${theme.density === 0 ? 40 : theme.density <= -5 ? 24 : 28}px`, borderWidth: '0', borderRadius: '20px', background: 'transparent', color: theme.onSurface, fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
        { selector: '.toolbar-action', mediaMaxWidth: '500px', top: `${theme.density === 0 ? 7 : 9}px`, right: '-12.15625px', width: '64px' },
        { selector: '.toolbar-action:hover', background: mixHex(theme.surface, theme.primary, .08) },
        { selector: '.toolbar-action:active', background: mixHex(theme.surface, theme.primary, .12) },
        { selector: '#toolbar-action:hover', background: mixHex(theme.surface, theme.primary, toolbarHeld ? .12 : .08) },
        { selector: '#toolbar-action:active', background: mixHex(theme.surface, theme.primary, .12) },
        { selector: '.sidenav-container', width: '100%', height: '220px', display: 'flex', background: theme.surface },
        { selector: '.sidenav', width: '160px', height: '220px', boxSizing: 'border-box', padding: '17px 20px 20px', flexShrink: '0', background: theme.mode === 'dark' ? theme.surface : '#f3edf7', color: theme.mode === 'dark' ? '#49454f' : theme.onSurface },
        { selector: '.sidenav-content', flexGrow: '1', height: '220px', boxSizing: 'border-box', padding: '17px 20px 20px', background: theme.mode === 'dark' ? '#fff7ff' : theme.surface, color: theme.mode === 'dark' ? '#1d1b20' : theme.onSurface },
        { selector: '.grid-list', width: '100%', height: '80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' },
        { selector: '.grid-tile', position: 'relative', height: '80px', background: theme.surfaceContainer },
        { selector: '.grid-tile-label', position: 'absolute', top: `${theme.density <= -5 ? 30 : theme.typographyScale > 1 ? 26 : 28}px`, left: '0', width: '100%', textAlign: 'center', whiteSpace: 'nowrap' },
        ...(family === 'grid-list' && theme.density <= -5 ? [{ selector: '.grid-tile-label', mediaMaxWidth: '500px', top: '29px' }] : []),
        ...(family === 'grid-list' && theme.typographyScale > 1 ? [{ selector: '.grid-tile-label', mediaMaxWidth: '500px', top: '25.5px' }] : []),
        { selector: '.badge-anchor', position: 'relative', width: '120px', height: '21px' },
        { selector: '#badge-primary', width: theme.density <= -5 ? '81.859375px' : theme.typographyScale > 1 ? '104.65625px' : '90.953125px' },
        { selector: '.badge-label', position: 'relative', top: `${theme.density <= -5 ? '-0.5px' : '-2px'}`, whiteSpace: 'nowrap' },
        ...(theme.density <= -5 ? [{ selector: '.badge-label', mediaMaxWidth: '500px', top: '-1px' }] : []),
        { selector: '.badge-bubble', position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '8px', background: theme.primary, color: theme.onPrimary, fontSize: '11px', lineHeight: '16px', textAlign: 'center' },
        { selector: '.badge-count-label', position: 'relative', top: '-2.5px', display: 'block', width: '100%', textAlign: 'center' },
        { selector: '.chip', height: `${theme.density === 0 ? 32 : 24}px`, boxSizing: 'border-box', padding: '0 12px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#79747e', borderRadius: `${8 * theme.cornerScale}px`, display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: theme.onSurface, fontSize: '14px', lineHeight: '20px', cursor: 'pointer' },
        { selector: '.chip.selected', borderWidth: '0', background: '#eadef7', color: '#4b4357' },
        { selector: '.chip-label', verticalAlign: 'middle' },
        { selector: '#chips-primary', gap: '8px' },
        { selector: '#chip-0', width: state.chipSelections[0] ? '97px' : '68px' },
        { selector: '#chip-1', width: state.chipSelections[1] ? '93px' : '64px' },
        { selector: '.selection-mark', width: '16px', height: '16px', flexShrink: '0' },
        { selector: '.checkbox-mark', width: '14px', height: '14px' },
        { selector: '.switch-mark', width: '16px', height: '16px' },
        { selector: '.material-icon', width: '24px', height: '24px', objectFit: 'contain' },
        { selector: '#chips-primary', height: `${theme.density === 0 ? 40 : 32}px` },
        { selector: '.material-list', width: '100%', display: 'flex', flexDirection: 'column', fontSize: '16px' },
        { selector: '.list-item', width: '100%', height: `${theme.density === 0 ? 56 : theme.density <= -5 ? 40 : 48}px`, boxSizing: 'border-box', display: 'flex', alignItems: 'center' },
        { selector: '.list-label', marginLeft: '16px', fontSize: '16px' },
        { selector: '.sort-header', width: '100%', height: `${theme.density === -2 ? 22 : 19}px`, borderWidth: '0', background: 'transparent', color: theme.onSurface, textAlign: 'left', fontWeight: '500' },
        { selector: '.sort-header.focused', boxShadow: `0 1px 0 ${theme.onSurface}` },
        { selector: '.sort-trigger', width: '132px', height: `${theme.density === -2 ? 22 : 19}px`, display: 'flex', alignItems: 'center', gap: '6px', color: theme.onSurface, fontSize: '17px', fontWeight: '500', cursor: 'pointer' },
        { selector: '.sort-arrow', fontSize: '16px', fontWeight: '700' },
        { selector: '.paginator', position: 'relative', width: '100%', height: '56px', background: theme.surface, fontSize: '13px' },
        { selector: '#paginator-size', position: 'absolute', top: `${theme.density === 0 ? 20 : theme.density <= -5 ? 12 : 16}px`, right: `${theme.density <= -5 ? 222.75 : 246.75}px`, whiteSpace: 'nowrap', fontSize: '13px', verticalAlign: 'middle' },
        { selector: '#paginator-page-size', position: 'absolute', top: `${theme.density === 0 ? 20 : theme.density <= -5 ? 12 : 16}px`, right: `${theme.density <= -5 ? 206 : 230}px`, whiteSpace: 'nowrap', fontSize: '13px', verticalAlign: 'middle' },
        { selector: '#paginator-range', position: 'absolute', top: `${theme.density === 0 ? 20 : theme.density <= -5 ? 13 : 16}px`, right: `${theme.density <= -5 ? 96 : 120}px`, whiteSpace: 'nowrap', fontSize: '13px', verticalAlign: 'middle', ...(theme.density <= -5 ? { height: '16px', boxSizing: 'border-box' as const } : {}) },
        { selector: '.paginator-button', position: 'absolute', top: `${theme.density === 0 ? 4 : theme.density <= -5 ? 2 : 4}px`, width: `${theme.density === 0 ? 48 : theme.density <= -5 ? 36 : 40}px`, height: `${theme.density === 0 ? 48 : theme.density <= -5 ? 36 : 40}px`, borderWidth: '0', borderRadius: '24px', background: 'transparent', color: theme.onSurface, fontSize: '20px' },
        { selector: '#paginator-previous', right: `${theme.density === 0 ? 48 : theme.density <= -5 ? 36 : 40}px` },
        { selector: '#paginator-next', right: '0' },
        { selector: '#paginator-size', mediaMaxWidth: '500px', top: '0', right: '34.25px' },
        { selector: '#paginator-page-size', mediaMaxWidth: '500px', top: '0', right: '17px' },
        { selector: '#paginator-range', mediaMaxWidth: '500px', top: `${theme.density <= -5 ? 22 : 28}px`, right: `${theme.density <= -5 ? 96 : 120}px`, paddingTop: '0' },
        { selector: '.paginator-button', mediaMaxWidth: '500px', top: `${theme.density === 0 ? 4 : theme.density <= -5 ? 4 : 8}px` },
        { selector: '.material-tree', width: '100%', display: 'flex', flexDirection: 'column', background: theme.surface },
        { selector: '.tree-item', width: '100%', height: `${theme.density < 0 ? 40 : 48}px`, padding: '0', boxSizing: 'border-box', display: 'flex', alignItems: 'center' },
        { selector: '.tree-label', height: '20px', lineHeight: '20px', verticalAlign: 'middle' },
        { selector: '#tree-item-0:focus, #tree-item-0.focused', height: `${theme.density < 0 ? 42 : 50}px`, padding: '0', borderWidth: '2px', borderStyle: 'solid', borderColor: theme.onSurface, color: theme.onSurface, background: theme.surface },
        { selector: '.tabs', position: 'relative', width: '100%', height: `${theme.density === 0 ? 68 : theme.density <= -5 ? 51 : 63}px`, display: 'flex', flexDirection: 'column' },
        { selector: '.tab-list', width: '100%', height: `${theme.density === 0 ? 48 : theme.density <= -5 ? 32 : 40}px`, display: 'flex' },
        { selector: '.tab', width: '50%', height: `${theme.density === 0 ? 48 : theme.density <= -5 ? 32 : 40}px`, boxSizing: 'border-box', padding: '0', flexShrink: '0', borderWidth: '0', background: 'transparent', color: theme.onSurface, fontSize: '14px', fontWeight: '500', lineHeight: '20px', verticalAlign: 'middle' },
        { selector: '.tab-baseline', position: 'absolute', top: `${theme.density === 0 ? 47 : theme.density <= -5 ? 31 : 39}px`, left: '0', width: '100%', height: '1px', background: '#e8e0eb' },
        { selector: '.tab-indicator', position: 'absolute', top: `${theme.density === 0 ? 46 : theme.density <= -5 ? 30 : 38}px`, left: state.selected ? '0' : '50%', width: '50.7%', height: '2px', background: theme.primary },
        { selector: '.tab-indicator', mediaMaxWidth: '800px', width: '51%' },
        { selector: '.tab-indicator', mediaMaxWidth: '500px', width: '51.9%', ...(theme.density <= -5 ? { top: '30.5px' } : theme.typographyScale > 1 ? { top: '37.33px', height: '2.67px' } : theme.mode === 'dark' ? { top: '46px', height: '2.67px' } : {}) },
        { selector: '.tab-baseline', mediaMaxWidth: '500px', ...(theme.density <= -5 ? { top: '32.5px' } : theme.typographyScale > 1 ? { top: '40px', height: '0.67px' } : theme.mode === 'dark' ? { top: '47.67px', height: '0.67px' } : {}) },
        { selector: '.tab-panel', width: '100%', height: '20px', boxSizing: 'border-box', verticalAlign: 'middle' },
        { selector: '.stepper', width: '100%', display: 'flex', flexDirection: 'column' },
        { selector: '#stepper-primary', height: `${theme.density === 0 ? 115 : 110}px` },
        { selector: '.stepper-head', position: 'relative', width: '100%', height: `${theme.density === 0 ? 72 : theme.density <= -5 ? 48 : 64}px` },
        { selector: '.step-label', fontWeight: '500' },
        { selector: '.stepper', position: 'relative', boxSizing: 'border-box', padding: '0 24px', background: theme.surface },
        { selector: '.step-tab', position: 'absolute', top: `${theme.density === 0 ? 12 : theme.density <= -5 ? -3 : 7}px`, height: '48px', display: 'flex', alignItems: 'center' },
        { selector: '#step-details', left: '0' },
        { selector: '#step-review', left: '87.8%' },
        { selector: '.step-badge', width: '24px', height: '24px', borderRadius: '12px', background: theme.mode === 'dark' ? '#cac4d0' : '#49454e', color: theme.surface, textAlign: 'center', fontSize: '14px' },
        { selector: '.step-badge.selected', background: theme.primary, color: theme.onPrimary },
        { selector: '.step-text', marginLeft: '8px', whiteSpace: 'nowrap', fontWeight: '500', fontSize: '14px', verticalAlign: 'middle' },
        { selector: '.step-connector', position: 'absolute', top: `${theme.density === 0 ? 35 : theme.density <= -5 ? 21 : 32}px`, left: '89px', width: '73.2%', height: '1px', background: '#7b757f' },
        { selector: '#stepper-content', boxSizing: 'border-box', paddingTop: `${theme.density <= -5 ? 2 : 0}px`, marginTop: `${theme.density <= -5 ? -4 : 1}px`, textAlign: 'left', verticalAlign: 'middle' },
        { selector: '.stepper-content-label', position: 'relative', top: `${theme.density <= -5 ? 1 : 0}px`, display: 'block', width: '100%', textAlign: 'left', verticalAlign: 'middle' },
        { selector: '#step-review', mediaMaxWidth: '800px', left: '86%' },
        { selector: '.step-connector', mediaMaxWidth: '800px', width: '69.5%' },
        { selector: '#step-review', mediaMaxWidth: '500px', left: '61.3%' },
        { selector: '.step-connector', mediaMaxWidth: '500px', left: '90px', width: '15.1%' },
        { selector: '.stepper-content-label', mediaMaxWidth: '500px', ...(theme.density <= -5 ? { top: '0' } : {}) },
        { selector: '.divider', position: 'absolute', top: `${theme.density === -2 ? 86.785 : theme.density <= -5 ? 74.785 : 80}px`, left: '28px', right: '28px', height: '1px', width: 'auto', background: '#cac4d0' },
        { selector: '.divider-copy', position: 'absolute', left: '28px', right: '28px', width: 'auto', height: `${22 * theme.typographyScale}px` },
        { selector: '.divider-above', top: `${theme.density === -2 ? 45.290625 : theme.density <= -5 ? 41.890625 : 42.69}px` },
        { selector: '.divider-below', top: `${theme.density === -2 ? 105.071875 : theme.density <= -5 ? 89.671875 : 94.69}px` },
        ...(family === 'divider' && theme.density <= -5 ? [
          { selector: '.divider-above', mediaMaxWidth: '500px', top: '41.390625px' },
          { selector: '.divider-below', mediaMaxWidth: '500px', top: '89.171875px' },
        ] : []),
        ...(family === 'divider' && theme.density === -2 ? [
          { selector: '.divider-above', mediaMaxWidth: '500px', top: '44.990625px' },
          { selector: '.divider-below', mediaMaxWidth: '500px', top: '104.771875px' },
        ] : []),
        { selector: '#checkbox-primary', position: 'relative', width: theme.density <= -5 ? '137.5625px' : theme.density < 0 ? '141.5625px' : '149.5625px', height: `${theme.density === 0 ? 40 : 32}px`, boxSizing: 'border-box', padding: '0 11px', display: 'flex', alignItems: 'center', gap: '14px', alignSelf: 'flex-start', cursor: 'pointer', background: 'transparent' },
        { selector: '#checkbox-primary:focus', borderWidth: '0', boxShadow: 'none', background: 'transparent' },
        { selector: '.checkbox-state-layer', position: 'absolute', zIndex: '3', top: `${theme.density === 0 ? 0 : -4}px`, left: '0', width: '40px', height: '40px', borderRadius: '20px', background: 'transparent' },
        { selector: '#checkbox-primary:hover .checkbox-state-layer', background: alphaHex(theme.primary, .08) },
        { selector: '#checkbox-primary:active .checkbox-state-layer', background: alphaHex(theme.primary, .12) },
        { selector: '.checkbox-box', position: 'relative', zIndex: '2', width: '18px', height: '18px', flexShrink: '0', boxSizing: 'border-box', borderWidth: '2px', borderStyle: 'solid', borderColor: state.selected ? theme.primary : theme.onSurface, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: state.selected ? theme.primary : 'transparent' },
        { selector: '.checkbox-label', position: 'relative', zIndex: '2', whiteSpace: 'nowrap', color: theme.onSurface, fontSize: '14px', verticalAlign: 'middle' },
        { selector: '.range', width: '100%', height: '48px', cursor: 'pointer' },
        { selector: '.range-stack', position: 'relative', width: '100%', height: '48px' },
        { selector: '.range-layer', position: 'absolute', top: '0', left: '0', width: '100%', height: '48px' },
        { selector: '#slider-start', width: '350px', height: '44px', top: '2px', opacity: '0' },
        { selector: '#slider-primary', width: '399px', height: '44px', top: '2px', left: '350px', opacity: '0' },
        { selector: '#slider-start', mediaMaxWidth: '800px', width: '311px' },
        { selector: '#slider-primary', mediaMaxWidth: '800px', width: '356px', left: '311px' },
        { selector: '#slider-start', mediaMaxWidth: '500px', width: '103px' },
        { selector: '#slider-primary', mediaMaxWidth: '500px', width: '157px', left: '132px' },
        { selector: '.range-plugin-layer', width: '100%', height: '48px' },
        { selector: '.progress', width: family === 'progress-spinner' ? '100px' : '100%', height: family === 'progress-spinner' ? '100px' : '8px' },
        { selector: '.modal-overlay', position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', boxSizing: 'border-box', padding: '32px', background: 'rgba(0,0,0,0.32)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1000' },
        { selector: '.dialog-panel', width: '240px', height: '140px', padding: '24px', borderRadius: `${28 * theme.cornerScale}px`, background: theme.mode === 'dark' ? '#211f26' : '#fff7ff', color: theme.onSurface, display: 'flex', flexDirection: 'column' },
        { selector: '.dialog-title', fontSize: '24px', fontWeight: '400' },
        { selector: '.dialog-copy', marginTop: '16px', fontSize: '14px' },
        { selector: '.dialog-actions', height: '40px', marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' },
        { selector: '.dialog-action', width: '64px', height: '40px', borderWidth: '0', borderRadius: '20px', background: 'transparent', color: theme.mode === 'dark' ? '#d5baff' : '#7d00fa', fontWeight: '500' },
        { selector: '.dialog-action.primary', width: '80px', background: theme.mode === 'dark' ? '#d5baff' : '#7d00fa', color: theme.mode === 'dark' ? '#381e72' : '#ffffff' },
        { selector: '.dialog-action:hover', background: mixHex(theme.mode === 'dark' ? '#211f26' : '#fff7ff', theme.mode === 'dark' ? '#d5baff' : '#7d00fa', .08) },
        { selector: '.dialog-action:active', background: mixHex(theme.mode === 'dark' ? '#211f26' : '#fff7ff', theme.mode === 'dark' ? '#d5baff' : '#7d00fa', .12) },
        { selector: '.dialog-action.primary:hover', background: mixHex(theme.mode === 'dark' ? '#d5baff' : '#7d00fa', theme.mode === 'dark' ? '#381e72' : '#ffffff', .08) },
        { selector: '.dialog-action.primary:active', background: mixHex(theme.mode === 'dark' ? '#d5baff' : '#7d00fa', theme.mode === 'dark' ? '#381e72' : '#ffffff', .12) },
        { selector: '.bottom-sheet-overlay', alignItems: 'flex-end', padding: '0' },
        { selector: '.bottom-sheet-panel', width: '438px', height: '110px', padding: '16px', borderRadius: `${28 * theme.cornerScale}px ${28 * theme.cornerScale}px 0 0`, background: theme.surface, color: theme.onSurface, display: 'flex', flexDirection: 'column', transform: 'translate(0, 146px)' },
        { selector: '.bottom-sheet-option', width: '100%', height: '60px', padding: '0 11px', borderWidth: '0', borderRadius: `${28 * theme.cornerScale}px`, background: 'transparent', color: theme.onSurface, textAlign: 'left', fontSize: '14px' },
        { selector: '#bottom-sheet-dismiss', background: mixHex(theme.surface, theme.onSurface, .08) },
        { selector: '.bottom-sheet-option:focus', color: theme.onSurface, background: mixHex(theme.surface, theme.onSurface, .12) },
        { selector: '.snack-overlay', position: 'fixed', left: '0', bottom: '0', width: '100%', height: '56px', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: '8px', transform: 'translate(0, 159px)', zIndex: '1000' },
        { selector: '.snack-surface', width: '294px', height: '41px', padding: '0 18px', borderRadius: '4px', background: '#322f35', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        { selector: '.overlay-dismiss', width: '88px', height: '40px', borderWidth: '0', background: 'transparent', color: theme.primary, fontWeight: '500' },
        { selector: '.material-button:focus', borderWidth: '0', boxShadow: 'none' },
        { selector: '#tooltip-popup', width: '91px', height: '24px', marginTop: '-10px', marginBottom: '-32px', marginLeft: '17px', padding: '0 8px', borderWidth: '0', borderRadius: '4px', background: '#322f35', color: '#ffffff', display: 'flex', alignItems: 'center', alignSelf: 'flex-start', flexShrink: '0', fontSize: '10px', whiteSpace: 'nowrap', transform: 'translate(-183px, -81px)', zIndex: '1000' },
      ],
    };
  }

  private familyElements(family: MaterialFamily): DOMElement[] {
    const state = this.store.state();
    const theme = this.store.tokens();
    const fieldSurface = (controlId: string): DOMElement => ({
      type: 'div',
      id: `${controlId}-surface`,
      class: `field-surface${this.focusedId() === controlId || state.error ? ' active' : ''}`,
    });
    const autocompleteOption = (label: string, slug: string, value: string): DOMElement => {
      const selected = value === label;
      return {
        type: 'div', id: `autocomplete-option-${slug}`, class: `select-option${selected ? ' selected' : ''}`,
        role: 'option', ariaSelected: selected,
        children: [
          { type: 'span', id: `autocomplete-option-${slug}-label`, textContent: label },
          ...(selected ? [this.selectionMark(`autocomplete-option-${slug}-check`, 'select-check')] : []),
        ],
      };
    };
    if (family === 'toolbar') return [{ type: 'div', id: 'toolbar-primary', class: 'toolbar', children: [{ type: 'span', id: 'toolbar-title', class: 'toolbar-title', children: [{ type: 'span', id: 'toolbar-title-text', class: 'toolbar-title-text', textContent: 'Material workspace' }] }, { type: 'button', id: 'toolbar-action', class: 'toolbar-action', value: 'Action' }] }];
    if (family === 'sidenav') return [{ type: 'div', id: 'sidenav-primary', class: 'sidenav-container', children: [{ type: 'aside', id: 'sidenav-nav', class: 'sidenav', textContent: 'Navigation' }, { type: 'main', id: 'sidenav-content', class: 'sidenav-content', textContent: 'Main content' }] }];
    if (family === 'grid-list') return [{ type: 'div', id: 'grid-list-primary', class: 'grid-list', children: [{ type: 'div', id: 'grid-tile-one', class: 'grid-tile', children: [{ type: 'span', id: 'grid-tile-one-label', class: 'grid-tile-label', textContent: 'One' }] }, { type: 'div', id: 'grid-tile-two', class: 'grid-tile', children: [{ type: 'span', id: 'grid-tile-two-label', class: 'grid-tile-label', textContent: 'Two' }] }] }];
    if (family === 'badge') return [{ type: 'span', id: 'badge-primary', class: 'badge-anchor', children: [{ type: 'span', id: 'badge-label', class: 'badge-label', textContent: 'Notifications' }, { type: 'span', id: 'badge-count', class: 'badge-bubble', children: [{ type: 'span', id: 'badge-count-label', class: 'badge-count-label', textContent: '4' }] }] }];
    if (family === 'chips') return [{ type: 'div', id: 'chips-primary', class: 'row', role: 'listbox', ariaLabel: 'Tags', ariaDisabled: false, ariaMultiselectable: true, children: state.chips.map((chip, index) => ({
      type: 'div' as const, id: `chip-${index}`, class: `chip${state.chipSelections[index] ? ' selected' : ''}`, role: 'option', tabindex: 0,
      ariaLabel: chip, ariaSelected: state.chipSelections[index],
      children: [...(state.chipSelections[index] ? [this.selectionMark(`chip-${index}-mark`)] : []), { type: 'span' as const, id: `chip-${index}-label`, class: 'chip-label', textContent: chip }],
    })) }];
    if (family === 'icon') return [{
      type: 'img', id: 'icon-primary', class: 'material-icon',
      src: theme.mode === 'dark' ? MATERIAL_FAVORITE_ICON_DARK : MATERIAL_FAVORITE_ICON_LIGHT,
      alt: 'Favorite',
    }];
    if (family === 'list') return [{ type: 'div', id: 'list-primary', class: 'material-list', ariaDisabled: false, children: [{ type: 'div', id: 'list-inbox', class: 'list-item', children: [{ type: 'span', id: 'list-inbox-label', class: 'list-label', textContent: 'Inbox' }] }, { type: 'div', id: 'list-archive', class: 'list-item', children: [{ type: 'span', id: 'list-archive-label', class: 'list-label', textContent: 'Archive' }] }] }];
    if (family === 'sort') {
      const focused = this.focusedId() === 'sort-primary' || this.focusedId() === 'sort-trigger';
      return [{ type: 'div', id: 'sort-primary', class: `sort-header${focused ? ' focused' : ''}`, ariaLabel: 'Sort by name', children: [{
      type: 'div', id: 'sort-trigger', class: 'sort-trigger', role: 'button', tabindex: 0,
      ariaSort: state.open ? state.sortDirection === 'asc' ? 'ascending' : 'descending' : undefined,
      children: [
        { type: 'span', id: 'sort-label', textContent: 'Sort by name' },
        ...(state.open || focused ? [{ type: 'span' as const, id: 'sort-arrow', class: 'sort-arrow', textContent: state.open && state.sortDirection === 'desc' ? '↓' : '↑' }] : []),
      ],
      }] }];
    }
    if (family === 'paginator') return [{ type: 'div', id: 'paginator-primary', class: 'paginator', role: 'group', ariaLabel: `Items per page: 10 ${state.pageIndex * 10 + 1} – ${Math.min(100, state.pageIndex * 10 + 10)} of 100`, children: [{ type: 'span', id: 'paginator-size', textContent: 'Items per page:' }, { type: 'span', id: 'paginator-page-size', textContent: '10' }, { type: 'span', id: 'paginator-range', textContent: `${state.pageIndex * 10 + 1} – ${Math.min(100, state.pageIndex * 10 + 10)} of 100` }, { type: 'button', id: 'paginator-previous', class: 'paginator-button', disabled: state.pageIndex === 0, ariaLabel: 'Previous page', value: '‹' }, { type: 'button', id: 'paginator-next', class: 'paginator-button', disabled: state.pageIndex === 9, ariaLabel: 'Next page', value: '›' }] }];
    if (family === 'tree') return [{ type: 'div', id: 'tree-primary', class: 'material-tree', role: 'tree', children: ['Documents', 'Projects', 'Archive'].map((label, index) => ({ type: 'div' as const, id: `tree-item-${index}`, class: `tree-item${this.focusedId() === `tree-item-${index}` ? ' focused' : ''}`, role: 'treeitem', tabindex: index === 0 ? 0 : -1, ariaLevel: 1, ariaPosinset: index + 1, ariaSetsize: 3, children: [{ type: 'span' as const, id: `tree-item-${index}-label`, class: 'tree-label', textContent: label }] })) }];
    if (family === 'slider') return [{ type: 'div', id: 'slider-pair', class: 'range-stack', children: [
      { type: 'showcase.material:range-visual', id: 'slider-material-visual', class: 'range-plugin-layer', data: { start: state.sliderStart / 100, end: state.sliderValue / 100, 'indicator-color': this.store.tokens().primary, 'track-color': this.store.tokens().mode === 'dark' ? '#49454f' : '#e7e0ec' } },
      { type: 'input', inputType: 'range', id: 'slider-start', class: 'range-layer', min: '0', max: '50', step: '5', value: String(Math.min(50, state.sliderStart)), disabled: state.disabled, ariaLabel: 'Minimum', ariaValueText: String(state.sliderStart) },
      { type: 'input', inputType: 'range', id: 'slider-primary', class: 'range-layer', min: '50', max: '100', step: '5', value: String(Math.max(50, state.sliderValue)), disabled: state.disabled, ariaLabel: 'Maximum', ariaValueText: String(state.sliderValue) },
    ] }];
    if (family === 'progress-bar') return [{ type: 'showcase.material:linear-progress', id: 'progress-bar-primary', class: 'progress', role: 'progressbar', ariaValueMin: 0, ariaValueMax: 100, ariaValueNow: 64, data: { mode: 'determinate', progress: .64, 'indicator-color': this.store.tokens().primary, 'track-color': this.store.tokens().mode === 'dark' ? '#49454f' : '#e7e0ec' } }];
    if (family === 'progress-spinner') return [{ type: 'showcase.material:circular-progress', id: 'progress-spinner-primary', class: 'progress', role: 'progressbar', ariaValueMin: 0, ariaValueMax: 100, ariaValueNow: 64, data: { mode: 'determinate', progress: .64, 'indicator-color': this.store.tokens().primary, 'stroke-width': 10 } }];
    if (['input', 'form-field', 'autocomplete'].includes(family)) {
      const fieldFamily = family as 'form-field' | 'input' | 'autocomplete';
      const fieldValue = this.fieldValues()[fieldFamily];
      const empty = fieldValue.length === 0;
      const compactFilled = theme.density < 0 && !empty;
      return [{ type: 'div', id: `${family}-primary`, class: 'field-shell', children: [
      fieldSurface(`${family}-control`),
      { type: 'label' as const, id: `${family}-label`, class: `field-label${empty ? ' empty-field-label' : ''}${compactFilled ? ' compact-filled-label' : ''}`, for: `${family}-control`, textContent: family === 'autocomplete' ? 'City' : family === 'form-field' ? 'Project name' : 'Email' },
      { type: 'div', id: `${family}-input-region`, class: `field-input-region${compactFilled ? ' compact-filled-input-region' : ''}`, children: [{ type: 'input', inputType: family === 'input' ? 'email' : 'text', id: `${family}-control`, class: 'field-control', value: fieldValue, disabled: state.disabled, ariaLabel: family === 'autocomplete' ? 'City' : family === 'input' ? 'Email' : 'Project name', ariaInvalid: state.error, role: family === 'autocomplete' ? 'combobox' : undefined, ariaExpanded: family === 'autocomplete' ? state.open : undefined, ariaControls: family === 'autocomplete' ? 'field-options' : undefined, ariaAutocomplete: family === 'autocomplete' ? 'list' : undefined }] },
      ...(family === 'form-field' && !state.error ? [{ type: 'span' as const, id: 'form-field-hint', class: 'field-hint', textContent: 'Public label' }] : []),
      ...(family === 'form-field' && state.error ? [{ type: 'span' as const, id: 'form-field-error', class: 'field-error', textContent: 'Project name is required' }] : []),
      ...(family === 'autocomplete' && state.open ? [{ type: 'div' as const, id: 'field-options', class: 'select-popup autocomplete-popup', role: 'listbox', children: [
        autocompleteOption('Cape Town', 'cape-town', fieldValue),
        autocompleteOption('Johannesburg', 'johannesburg', fieldValue),
      ] }] : []),
    ] }];
    }
    if (family === 'checkbox') return [{
      type: 'div', id: 'checkbox-primary', role: 'checkbox', tabindex: state.disabled ? -1 : 0,
      ariaLabel: 'Include archived', ariaChecked: state.selected, ariaDisabled: state.disabled,
      children: [
        { type: 'span', id: 'checkbox-state-layer', class: 'checkbox-state-layer' },
        { type: 'span', id: 'checkbox-box', class: 'checkbox-box', children: state.selected ? [this.selectionMark('checkbox-mark', 'checkbox-mark')] : [] },
        { type: 'span', id: 'checkbox-label', class: 'checkbox-label', textContent: 'Include archived' },
      ],
    }];
    if (family === 'radio') return [{ type: 'div', id: 'radio-primary', role: 'radiogroup', children: [
      { type: 'div', id: 'radio-solo', class: 'radio-option', role: 'radio', tabindex: state.selected ? -1 : 0, ariaChecked: !state.selected, ariaDisabled: state.disabled, children: [{ type: 'span', id: 'radio-solo-ring', class: `radio-ring${state.selected ? '' : ' selected'}`, children: state.selected ? [] : [{ type: 'span', id: 'radio-solo-dot', class: 'radio-dot' }] }, { type: 'span', id: 'radio-solo-label', class: 'radio-label', textContent: 'Solo' }] },
      { type: 'div', id: 'radio-team', class: 'radio-option', role: 'radio', tabindex: state.selected ? 0 : -1, ariaChecked: state.selected, ariaDisabled: state.disabled, children: [{ type: 'span', id: 'radio-team-ring', class: `radio-ring${state.selected ? ' selected' : ''}`, children: state.selected ? [{ type: 'span', id: 'radio-team-dot', class: 'radio-dot' }] : [] }, { type: 'span', id: 'radio-team-label', class: 'radio-label', textContent: 'Team' }] },
    ] }];
    if (family === 'select') return [{ type: 'div', id: 'select-primary', class: 'field-shell', children: [
      fieldSurface('select-control'),
      { type: 'label', id: 'select-label', class: 'field-label', for: 'select-control', textContent: 'Plan' },
      { type: 'div', id: 'select-input-region', class: 'field-input-region', children: [{
        type: 'input', inputType: 'text', id: 'select-control', class: 'field-control select-control',
        value: state.selected ? 'Team' : 'Solo', readonly: true, disabled: state.disabled,
        role: 'combobox', ariaLabel: 'Plan', ariaInvalid: state.error, ariaExpanded: state.open,
        ariaControls: 'select-options', ariaActivedescendant: state.open
          ? state.selected ? 'select-option-team' : 'select-option-solo' : undefined,
      }] },
      { type: 'span', id: 'select-caret', class: 'select-caret', role: 'presentation', textContent: '▼' },
      ...(state.open ? [{ type: 'div' as const, id: 'select-options', class: 'select-popup', role: 'listbox', children: [
        { type: 'div' as const, id: 'select-option-solo', class: `select-option${state.selected ? '' : ' selected'}`, role: 'option', ariaSelected: !state.selected, textContent: 'Solo' },
        { type: 'div' as const, id: 'select-option-team', class: `select-option${state.selected ? ' selected' : ''}`, role: 'option', ariaSelected: state.selected, children: [
          { type: 'span' as const, id: 'select-team-label', textContent: 'Team' },
          ...(state.selected ? [this.selectionMark('select-check', 'select-check')] : []),
        ] },
      ] }] : []),
    ] }];
    if (family === 'slide-toggle') return [{ type: 'div', id: 'slide-toggle-primary', role: 'switch', tabindex: state.disabled ? -1 : 0, ariaLabel: 'Automatic updates', ariaChecked: state.selected, ariaDisabled: state.disabled, children: [
      { type: 'span', id: 'slide-toggle-state-layer', class: 'switch-state-layer' },
      { type: 'span', id: 'slide-toggle-track', class: 'switch-track', children: [{ type: 'span', id: 'slide-toggle-thumb', class: 'switch-thumb', children: state.selected ? [this.selectionMark('slide-toggle-mark', 'switch-mark')] : [{ type: 'span', id: 'slide-toggle-minus', textContent: '−' }] }] },
      { type: 'span', id: 'slide-toggle-label', class: 'switch-label', textContent: 'Automatic updates' },
    ] }];
    if (family === 'menu') return [{ type: 'button', id: 'menu-primary', class: 'material-button', ariaHaspopup: 'menu', ariaExpanded: state.open, ariaControls: 'menu-popup', value: 'Open menu' }, ...(state.open ? [{ type: 'div' as const, id: 'menu-popup', role: 'menu', children: [{ type: 'button' as const, id: 'menu-rename', role: 'menuitem', value: 'Rename' }, { type: 'button' as const, id: 'menu-delete', role: 'menuitem', value: 'Delete' }] }] : [])];
    if (family === 'tabs') return [{ type: 'div', id: 'tabs-primary', class: 'tabs', ariaLabel: `OverviewActivity${state.selected ? 'Overview content' : 'Activity content'}`, children: [{ type: 'div', id: 'tabs-list', class: 'tab-list', role: 'tablist', children: [{ type: 'button', id: 'tab-overview', class: 'tab', role: 'tab', ariaSelected: state.selected, tabindex: state.selected ? 0 : -1, ariaControls: 'tab-panel', value: 'Overview' }, { type: 'button', id: 'tab-activity', class: 'tab', role: 'tab', ariaSelected: !state.selected, tabindex: state.selected ? -1 : 0, ariaControls: 'tab-panel', value: 'Activity' }] }, { type: 'div', id: 'tab-baseline', class: 'tab-baseline' }, { type: 'div', id: 'tab-indicator', class: 'tab-indicator' }, { type: 'showcase.material:tab-panel', id: 'tab-panel', class: 'tab-panel', role: 'tabpanel', ariaLabel: state.selected ? 'Overview content' : 'Activity content', data: { selected: state.selected, phase: this.benchmarkMode ? 1 : undefined, 'text-color': theme.onSurface, 'font-size': 16 * theme.typographyScale } }] }];
    if (family === 'stepper') return [{ type: 'div', id: 'stepper-primary', class: 'stepper', role: 'tablist', ariaLabel: 'Project setup', children: [{ type: 'div', id: 'stepper-head', class: 'stepper-head', children: [{ type: 'div', id: 'step-details', class: 'step-tab', role: 'tab', tabindex: state.selected ? 0 : -1, ariaSelected: state.selected, children: [{ type: 'span', id: 'step-details-badge', class: `step-badge${state.selected ? ' selected' : ''}`, textContent: '1' }, { type: 'span', id: 'step-details-text', class: 'step-text', textContent: 'Details' }] }, { type: 'span', id: 'step-connector', class: 'step-connector' }, { type: 'div', id: 'step-review', class: 'step-tab', role: 'tab', tabindex: state.selected ? -1 : 0, ariaSelected: !state.selected, children: [{ type: 'span', id: 'step-review-badge', class: `step-badge${state.selected ? '' : ' selected'}`, textContent: '2' }, { type: 'span', id: 'step-review-text', class: 'step-text', textContent: 'Review' }] }] }, { type: 'div', id: 'stepper-content', role: 'tabpanel', children: [{ type: 'span', class: 'stepper-content-label', textContent: state.selected ? 'Project details' : 'Review changes' }] }] }];
    if (family === 'button-toggle') return [{ type: 'div', id: 'button-toggle-primary', role: 'radiogroup', ariaLabel: 'ListGrid', ariaDisabled: false, children: [
      { type: 'div', id: 'button-toggle-one', class: `button-toggle-option${state.selected ? '' : ' selected'}`, role: 'radio', tabindex: state.selected ? -1 : 0, ariaLabel: 'List', ariaChecked: !state.selected, children: [...(!state.selected ? [this.selectionMark('button-toggle-one-mark')] : []), { type: 'span', id: 'button-toggle-one-label', textContent: 'List' }] },
      { type: 'div', id: 'button-toggle-two', class: `button-toggle-option${state.selected ? ' selected' : ''}`, role: 'radio', tabindex: state.selected ? 0 : -1, ariaLabel: 'Grid', ariaChecked: state.selected, children: [...(state.selected ? [this.selectionMark('button-toggle-two-mark')] : []), { type: 'span', id: 'button-toggle-two-label', textContent: 'Grid' }] },
    ] }];
    if (family === 'divider') return [{ type: 'p', id: 'divider-above-row', class: 'divider-copy divider-above', children: [{ type: 'span', id: 'divider-above', textContent: 'Above' }] }, { type: 'div', id: 'divider-primary', class: 'divider', role: 'separator' }, { type: 'p', id: 'divider-below-row', class: 'divider-copy divider-below', children: [{ type: 'span', id: 'divider-below', textContent: 'Below' }] }];
    if (family === 'card') return [{ type: 'div', id: 'card-primary', class: 'material-card', children: [{ type: 'h2', id: 'card-title', class: 'card-title', textContent: 'Project Atlas' }, { type: 'p', id: 'card-copy', class: 'card-copy', textContent: 'Material surface content.' }, { type: 'button', id: 'card-open', class: 'text-button', value: 'OPEN' }] }];
    if (family === 'table') return [{ type: 'table', id: 'table-primary', class: 'material-table', tableProperties: { tableLayout: 'fixed', borderCollapse: 'collapse' }, children: [
      { type: 'thead', id: 'table-head', children: [{ type: 'tr', id: 'table-header-row', children: [{ type: 'th', id: 'table-name-header', scope: 'col', textContent: 'Name' }] }] },
      { type: 'tbody', id: 'table-body', children: [
        { type: 'tr', id: 'table-atlas-row', children: [{ type: 'td', id: 'table-atlas', textContent: 'Atlas' }] },
        { type: 'tr', id: 'table-northstar-row', children: [{ type: 'td', id: 'table-northstar', textContent: 'Northstar' }] },
      ] },
    ] }, { type: 'div', id: 'table-rule-one', class: 'table-rule table-rule-one' }, { type: 'div', id: 'table-rule-two', class: 'table-rule table-rule-two' }];
    if (family === 'expansion') return [{ type: 'article', id: 'expansion-shell', class: 'expansion-panel', children: [{ type: 'div', id: 'expansion-primary', class: 'expansion-trigger', role: 'button', tabindex: state.disabled ? -1 : 0, ariaDisabled: state.disabled, ariaExpanded: state.open, ariaControls: 'expansion-content', children: [{ type: 'span', id: 'expansion-title', class: 'expansion-title', textContent: 'Advanced settings' }] }, { type: 'span', id: 'expansion-chevron', class: 'expansion-chevron' }, { type: 'p' as const, id: 'expansion-content', children: [{ type: 'span' as const, id: 'expansion-content-label', class: 'expansion-content-label', textContent: 'Additional options.' }] }] }];
    if (['dialog', 'bottom-sheet', 'snack-bar'].includes(family)) {
      const label = family === 'dialog' ? 'Open dialog' : family === 'bottom-sheet' ? 'Open bottom sheet' : 'Show snackbar';
      const overlay = family === 'snack-bar'
        ? { type: 'div' as const, id: `${family}-overlay`, class: 'snack-overlay', children: [
          { type: 'div' as const, id: `${family}-surface`, class: 'snack-surface', role: 'status', ariaLive: 'polite' as const, ariaAtomic: true, children: [
            { type: 'span' as const, id: `${family}-title`, textContent: 'Project saved' },
            { type: 'button' as const, id: `${family}-dismiss`, class: 'overlay-dismiss', value: 'UNDO' },
          ] },
        ] }
        : family === 'bottom-sheet'
          ? { type: 'div' as const, id: `${family}-overlay`, class: 'modal-overlay bottom-sheet-overlay', role: 'dialog', ariaLabel: label, children: [
            { type: 'section' as const, id: `${family}-panel`, class: 'bottom-sheet-panel', children: [
            { type: 'button' as const, id: 'bottom-sheet-dismiss', class: 'bottom-sheet-option', autofocus: true, value: 'Share' },
            { type: 'button' as const, id: 'bottom-sheet-copy', class: 'bottom-sheet-option', value: 'Copy link' },
            ] },
          ] }
          : { type: 'dialog' as const, id: `${family}-overlay`, class: 'modal-overlay', open: true, modal: true, ariaLabel: label, children: [
          { type: 'section' as const, id: `${family}-panel`, class: 'dialog-panel', children: [
            { type: 'h2' as const, id: `${family}-title`, class: 'dialog-title', textContent: 'Confirm action' },
            { type: 'p' as const, id: `${family}-copy`, class: 'dialog-copy', textContent: 'Save Project Atlas?' },
            { type: 'div' as const, id: 'dialog-actions', class: 'dialog-actions', children: [
              { type: 'button' as const, id: 'dialog-cancel', class: 'dialog-action', autofocus: true, value: 'Cancel' },
              { type: 'button' as const, id: 'dialog-save', class: 'dialog-action primary', value: 'Save' },
            ] },
          ] },
        ] };
      return [
        { type: 'button', id: `${family}-primary`, class: 'material-button', value: label },
        ...(state.open ? [overlay] : []),
      ];
    }
    if (family === 'datepicker' || family === 'timepicker') return [{ type: 'div', id: `${family}-primary`, class: `field-shell ${family}-shell`, children: [
      fieldSurface(`${family}-control`),
      { type: 'label', id: `${family}-label`, class: 'field-label empty-field-label', for: `${family}-control`, textContent: family === 'datepicker' ? 'Due date' : 'Meeting time' },
      { type: 'div', id: `${family}-input-region`, class: 'field-input-region', children: [{ type: 'input', inputType: 'text', id: `${family}-control`, class: `field-control${family === 'timepicker' ? ' picker-control' : ''}${family === 'timepicker' && state.open ? ' open' : ''}`, value: '', disabled: state.disabled, role: family === 'timepicker' ? 'combobox' : undefined, ariaLabel: family === 'datepicker' ? 'Due date' : 'Meeting time', ariaInvalid: state.error, ariaHaspopup: 'dialog', ariaExpanded: family === 'timepicker' ? state.open : undefined, ariaControls: family === 'timepicker' ? 'timepicker-options' : undefined, ariaActivedescendant: family === 'timepicker' && state.open ? 'timepicker-option-0' : undefined }] },
      family === 'datepicker'
        ? { type: 'button' as const, id: 'datepicker-icon', class: 'picker-clock', ariaLabel: 'Open calendar', value: '' }
        : { type: 'button' as const, id: 'timepicker-icon', class: 'picker-clock', ariaLabel: 'Open time options', value: '' },
      family === 'datepicker'
        ? { type: 'span' as const, id: 'datepicker-icon-visual', class: 'picker-icon-visual', children: [
          { type: 'span' as const, id: 'datepicker-calendar-icon', class: 'calendar-icon', children: [
            { type: 'span' as const, id: 'datepicker-calendar-line', class: 'calendar-icon-line' },
            { type: 'span' as const, id: 'datepicker-calendar-day', class: 'calendar-icon-day' },
            { type: 'span' as const, id: 'datepicker-calendar-binding-first', class: 'calendar-icon-binding first' },
            { type: 'span' as const, id: 'datepicker-calendar-binding-last', class: 'calendar-icon-binding last' },
          ] },
        ] }
        : { type: 'span' as const, id: 'timepicker-icon-visual', class: 'picker-icon-visual', children: [
          { type: 'span' as const, id: 'timepicker-clock-icon', class: 'clock-icon', children: [
            { type: 'span' as const, id: 'timepicker-clock-hour', class: 'clock-hand hour' },
            { type: 'span' as const, id: 'timepicker-clock-minute', class: 'clock-hand minute' },
          ] },
        ] },
       ...(family === 'timepicker' && state.open ? [
        { type: 'div' as const, id: 'timepicker-gap', class: 'timepicker-gap' },
        { type: 'div' as const, id: 'timepicker-active-line', class: 'timepicker-active-line' },
        { type: 'div' as const, id: 'timepicker-options', class: 'picker-popup', role: 'listbox', children: materialTimeOptions().map((label, index) => ({ type: 'div' as const, id: `timepicker-option-${index}`, class: `picker-option${index === 0 ? ' selected' : ''}`, role: 'option', ariaSelected: index === 0, textContent: label })) },
        { type: 'div' as const, id: 'timepicker-scroll-track', class: 'timepicker-scroll-track', children: [
          { type: 'span' as const, id: 'timepicker-scroll-thumb', class: 'timepicker-scroll-thumb' },
        ] },
       ] : []),
      ...(family === 'datepicker' && state.open ? [{ type: 'div' as const, id: 'datepicker-popup', class: 'datepicker-popup', role: 'dialog', ariaLabel: 'Choose date', children: [
        { type: 'div' as const, id: 'datepicker-header', class: 'datepicker-header', children: [
          { type: 'button' as const, id: 'datepicker-month', class: 'datepicker-month', ariaLabel: this.datepickerView() === 'month' ? 'Choose month and year' : 'Choose date', value: this.datepickerView() === 'month' ? `${materialCurrentMonth()} ${materialCurrentYear()} ▾` : `${materialYearStart()} – ${materialYearStart() + 23} ▴` },
          { type: 'span' as const, id: 'datepicker-previous', class: 'datepicker-nav datepicker-previous', textContent: '‹' },
          { type: 'span' as const, id: 'datepicker-next', class: 'datepicker-nav datepicker-next', textContent: '›' },
        ] },
        ...(this.datepickerView() === 'month' ? [{ type: 'div' as const, id: 'datepicker-grid', class: 'datepicker-grid', children: [
          ...['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => ({ type: 'span' as const, id: `datepicker-weekday-${index}`, class: 'datepicker-cell datepicker-weekday', textContent: label })),
          { type: 'span' as const, id: 'datepicker-month-marker', class: 'datepicker-cell datepicker-month-marker', textContent: materialCurrentMonth() },
          ...Array.from({ length: materialCalendarLeadingDays() }, (_, index) => ({ type: 'span' as const, id: `datepicker-leading-${index}`, class: 'datepicker-cell', textContent: '' })),
          ...Array.from({ length: materialCalendarDayCount() }, (_, index) => {
            const day = index + 1;
            return { type: 'span' as const, id: `datepicker-day-${day}`, class: 'datepicker-cell', textContent: String(day) };
          }),
          ...Array.from({ length: materialCalendarTrailingDays() }, (_, index) => ({ type: 'span' as const, id: `datepicker-trailing-${index}`, class: 'datepicker-cell', textContent: '' })),
        ] }] : [{ type: 'div' as const, id: 'datepicker-year-grid', class: 'datepicker-year-grid', children: Array.from({ length: 24 }, (_, index) => {
          const year = materialYearStart() + index;
          return { type: 'button' as const, id: `datepicker-year-${year}`, class: `datepicker-year${year === materialCurrentYear() ? ' selected' : ''}`, value: String(year) };
        }) }]),
        ...(this.datepickerView() === 'month' ? [{ type: 'span' as const, id: 'datepicker-selected', class: 'datepicker-selected' }] : []),
      ] }] : []),
    ] }];
    if (family === 'tooltip') return [{ type: 'button', id: 'tooltip-primary', class: 'material-button', value: 'Hover for help', ariaDescribedby: state.open ? 'tooltip-popup' : undefined }, ...(state.open ? [{ type: 'div' as const, id: 'tooltip-popup', role: 'tooltip', textContent: 'Create a project' }] : [])];
    if (family === 'core') {
      const phase = this.store.benchmarkPhase() === 'held' ? 1 : this.store.benchmarkPhase() === 'start' ? .35 : state.open ? .45 : 0;
      return [{ type: 'button', id: 'core-primary', class: 'material-button', value: 'Material ripple foundation' }, { type: 'showcase.material:state-layer', id: 'core-state-layer', data: { phase, 'state-layer-color': this.store.tokens().primary } }];
    }
    return [{ type: 'div', id: `${family}-content`, class: 'row', children: [
      { type: 'button', id: `${family}-primary`, class: 'material-button', value: family === 'button' ? 'Primary action' : family.replaceAll('-', ' ') },
      { type: 'button', id: `${family}-secondary`, class: 'material-button outlined', value: 'Secondary' },
      { type: 'button', id: `${family}-disabled`, class: 'material-button', value: 'Disabled', disabled: true },
    ] }];
  }

  private composite(family: MaterialFamily): DOMElement[] {
    const role = family === 'tabs' ? 'tablist' : family === 'tree' ? 'tree' : family === 'menu' ? 'menu' : family === 'button-toggle' ? 'radiogroup' : 'group';
    const first = family === 'button-toggle' ? 'List' : 'Overview';
    const second = family === 'button-toggle' ? 'Grid' : 'Activity';
    return [{ type: 'div', id: `${family}-primary`, role, class: 'row', ariaLabel: family === 'button-toggle' ? undefined : family, ariaDisabled: family === 'button-toggle' ? false : undefined, children: [
      { type: 'button', id: `${family}-one`, class: 'material-button', role: family === 'tabs' ? 'tab' : family === 'tree' ? 'treeitem' : family === 'menu' ? 'menuitem' : undefined, ariaSelected: family === 'tabs' ? true : undefined, tabindex: 0, value: first },
      { type: 'button', id: `${family}-two`, class: 'material-button outlined', role: family === 'tabs' ? 'tab' : family === 'tree' ? 'treeitem' : family === 'menu' ? 'menuitem' : undefined, ariaSelected: family === 'tabs' ? false : undefined, tabindex: -1, value: second },
    ] }];
  }

  private selectionMark(id: string, extraClass = ''): DOMElement {
    const theme = this.store.tokens();
    const color = extraClass === 'checkbox-mark' ? theme.onPrimary : extraClass === 'switch-mark' ? theme.primary : '#49454f';
    return {
      type: 'showcase.material:check-mark', id, class: `selection-mark${extraClass ? ` ${extraClass}` : ''}`, role: 'presentation',
      data: { 'indicator-color': color, 'stroke-width': 1.8 },
    };
  }

  private measure(surface: AstylarSurface, ids: readonly string[]): MaterialBenchmarkMeasurement {
    const engine = surface.scene.getEngine();
    const canvas = engine.getRenderingCanvas();
    const camera = surface.scene.activeCamera;
    if (!canvas || !camera) return { elements: {}, semantics: {}, diagnostics: surface.diagnostics };
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const scaleX = canvas.clientWidth / engine.getRenderWidth();
    const scaleY = canvas.clientHeight / engine.getRenderHeight();
    const elements = Object.fromEntries(ids.map((id) => {
      const meshes = surface.scene.meshes.filter((mesh) => mesh.metadata?.elementId === id);
      const mesh = meshes.find((candidate) => candidate.name === id) ??
        meshes.find((candidate) => candidate.metadata?.isTextMesh === false) ?? meshes[0];
      if (!mesh) return [id, { exists: false }];
      mesh.computeWorldMatrix(true);
      const projected = mesh.getBoundingInfo().boundingBox.vectorsWorld.map((point) =>
        Vector3.Project(point, Matrix.IdentityReadOnly, surface.scene.getTransformMatrix(), viewport));
      const left = Math.min(...projected.map((point) => point.x)) * scaleX;
      const right = Math.max(...projected.map((point) => point.x)) * scaleX;
      const top = Math.min(...projected.map((point) => point.y)) * scaleY;
      const bottom = Math.max(...projected.map((point) => point.y)) * scaleY;
      return [id, {
        exists: true,
        borderBox: { left, top, right, bottom, width: right - left, height: bottom - top },
        interactionBackground: mesh.metadata?.astylarResolvedInteractionStyle?.background,
      }];
    }));
    const semantics = Object.fromEntries(ids.map((id) => {
      const element = document.querySelector<HTMLElement>(`[data-astylar-id="${CSS.escape(id)}"]`);
      const semanticElement = element?.classList.contains('field-shell')
        ? element.querySelector<HTMLElement>('button,input,select,textarea,[role]') ?? element : element;
      return [id, element && semanticElement ? {
        exists: true,
        role: semanticRole(semanticElement),
        name: semanticName(semanticElement),
        value: semanticElement instanceof HTMLSelectElement ? semanticElement.selectedOptions[0]?.textContent?.trim() :
          semanticElement instanceof HTMLInputElement || semanticElement instanceof HTMLTextAreaElement ? semanticElement.value : undefined,
        checked: semanticElement instanceof HTMLInputElement && ['checkbox', 'radio'].includes(semanticElement.type) ? semanticElement.checked : semanticBoolean(semanticElement, 'aria-checked'),
        selected: semanticBoolean(semanticElement, 'aria-selected'),
        expanded: semanticBoolean(semanticElement, 'aria-expanded'),
        pressed: semanticBoolean(semanticElement, 'aria-pressed'),
        invalid: semanticBoolean(semanticElement, 'aria-invalid'),
        sort: semanticElement.getAttribute('aria-sort') ?? undefined,
        activeDescendant: semanticElement.getAttribute('aria-activedescendant') ?? undefined,
        valueMin: semanticNumber(semanticElement, 'aria-valuemin'),
        valueMax: semanticNumber(semanticElement, 'aria-valuemax'),
        valueNow: semanticNumber(semanticElement, 'aria-valuenow'),
        valueText: semanticElement.getAttribute('aria-valuetext') ?? undefined,
        disabled: 'disabled' in semanticElement ? (semanticElement as HTMLButtonElement).disabled :
          semanticBoolean(semanticElement, 'aria-disabled'),
      } : { exists: false }];
    }));
    const backgroundPick = surface.scene.pick(canvas.clientWidth / 2, canvas.clientHeight * .75)?.pickedMesh;
    return {
      elements,
      semantics,
      diagnostics: {
        surface: surface.diagnostics,
        clearColor: surface.scene.clearColor.toHexString(),
        backgroundPick: backgroundPick ? {
          name: backgroundPick.name,
          metadata: {
            elementId: backgroundPick.metadata?.elementId,
            cursor: backgroundPick.metadata?.cursor,
            astylarResolvedInteractionStyle: backgroundPick.metadata?.astylarResolvedInteractionStyle,
          },
        } : undefined,
      },
    };
  }
}

interface MaterialBenchmarkMeasurement {
  readonly elements: Record<string, unknown>;
  readonly semantics: Record<string, unknown>;
  readonly diagnostics: unknown;
}

function semanticRole(element: HTMLElement): string | undefined {
  const explicit = element.getAttribute('role');
  if (explicit) return explicit;
  if (element instanceof HTMLButtonElement) return 'button';
  if (element instanceof HTMLSelectElement) return element.multiple ? 'listbox' : 'combobox';
  if (element instanceof HTMLTextAreaElement) return 'textbox';
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox') return 'checkbox';
    if (element.type === 'radio') return 'radio';
    if (element.type === 'range') return 'slider';
    return 'textbox';
  }
  const tag = element.tagName.toLowerCase();
  if (tag === 'img') return 'img';
  if (tag === 'table') return 'table';
  if (tag === 'th') return 'columnheader';
  if (tag === 'td') return 'cell';
  if (tag === 'nav') return 'navigation';
  if (tag === 'main') return 'main';
  if (tag === 'aside') return 'complementary';
  if (tag === 'section' && (element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby'))) return 'region';
  return undefined;
}

function semanticName(element: HTMLElement): string {
  const explicit = element.getAttribute('aria-label') ?? element.getAttribute('alt');
  if (explicit !== null) return explicit;
  const labelled = 'labels' in element
    ? [...((element as HTMLInputElement).labels ?? [])].map((label) => label.textContent ?? '').join(' ')
    : '';
  const enclosing = element.closest('label')?.textContent ?? '';
  return (labelled || enclosing || element.textContent || '').replace(/\s+/g, ' ').trim();
}

function semanticBoolean(element: HTMLElement, attribute: string): boolean | 'mixed' | undefined {
  const value = element.getAttribute(attribute);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value === 'mixed' ? 'mixed' : undefined;
}

function semanticNumber(element: HTMLElement, attribute: string): number | undefined {
  const value = element.getAttribute(attribute);
  return value !== null && Number.isFinite(Number(value)) ? Number(value) : undefined;
}

function materialDensityHeight(density: number): number {
  if (density >= 0) return 40;
  if (density === -1) return 32;
  if (density === -2) return 28;
  return 24;
}

function materialTimeOptions(): string[] {
  return Array.from({ length: 48 }, (_, index) => {
    const minutes = index * 30;
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour24 < 12 ? 'AM' : 'PM';
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
  });
}

function materialCurrentDay(): number {
  return new Date().getDate();
}

function materialCurrentMonth(): string {
  return new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date()).toUpperCase();
}

function materialCurrentYear(): number {
  return new Date().getFullYear();
}

function materialYearStart(): number {
  return materialCurrentYear() - 10;
}

function materialSelectedDayColumn(): number {
  return (1 + materialCalendarLeadingDays() + materialCurrentDay() - 1) % 7;
}

function materialSelectedDayRow(): number {
  return 1 + Math.floor((1 + materialCalendarLeadingDays() + materialCurrentDay() - 1) / 7);
}

function materialCalendarLeadingDays(): number {
  return Math.max(0, new Date(materialCurrentYear(), new Date().getMonth(), 1).getDay() - 1);
}

function materialCalendarDayCount(): number {
  return new Date(materialCurrentYear(), new Date().getMonth() + 1, 0).getDate();
}

function materialCalendarTrailingDays(): number {
  return 42 - 1 - materialCalendarLeadingDays() - materialCalendarDayCount();
}

function toolbarActionHeight(density: number): number {
  if (density >= 0) return 40;
  if (density === -2) return 28;
  return 24;
}

function materialReferenceHeight(family: MaterialFamily, density: number): number {
  if (density === 0) return MATERIAL_REFERENCE_HEIGHTS[family];
  if (density === -2) return MATERIAL_COMPACT_REFERENCE_HEIGHTS[family];
  return density <= -5 ? MATERIAL_CONTRAST_REFERENCE_HEIGHTS[family] : MATERIAL_COMPACT_REFERENCE_HEIGHTS[family];
}

const MATERIAL_REFERENCE_HEIGHTS: Readonly<Record<MaterialFamily, number>> = Object.freeze({
  core: 98, toolbar: 122, sidenav: 278, 'grid-list': 138, divider: 161,
  badge: 77, card: 177, chips: 98, icon: 86, list: 170, table: 218, sort: 77,
  paginator: 114, tree: 202, 'form-field': 134, input: 134, autocomplete: 134,
  checkbox: 98, radio: 98, select: 134, slider: 106, 'slide-toggle': 90,
  datepicker: 134, timepicker: 134, button: 98, 'button-toggle': 100, menu: 98,
  tabs: 126, stepper: 173, expansion: 106, 'bottom-sheet': 98, dialog: 98,
  'snack-bar': 98, tooltip: 98, 'progress-bar': 62, 'progress-spinner': 158,
});

const MATERIAL_COMPACT_REFERENCE_HEIGHTS: Readonly<Record<MaterialFamily, number>> = Object.freeze({
  core: 86, toolbar: 114, sidenav: 278, 'grid-list': 138, divider: 176.5625,
  badge: 80, card: 176, chips: 90, icon: 87, list: 154, table: 194, sort: 80,
  paginator: 106, tree: 178, 'form-field': 126, input: 126, autocomplete: 126,
  checkbox: 90, radio: 90, select: 126, slider: 106, 'slide-toggle': 90,
  datepicker: 126, timepicker: 126, button: 86, 'button-toggle': 100, menu: 86,
  tabs: 121, stepper: 168, expansion: 98, 'bottom-sheet': 86, dialog: 86,
  'snack-bar': 86, tooltip: 86, 'progress-bar': 62, 'progress-spinner': 158,
});

const MATERIAL_CONTRAST_REFERENCE_HEIGHTS: Readonly<Record<MaterialFamily, number>> = Object.freeze({
  core: 82, toolbar: 110, sidenav: 278, 'grid-list': 138, divider: 152.5625,
  badge: 76, card: 172, chips: 90, icon: 86, list: 122, table: 170, sort: 76,
  paginator: 98, tree: 142, 'form-field': 114, input: 114, autocomplete: 114,
  checkbox: 86, radio: 86, select: 114, slider: 106, 'slide-toggle': 90,
  datepicker: 114, timepicker: 114, button: 82, 'button-toggle': 84, menu: 82,
  tabs: 109, stepper: 142, expansion: 94, 'bottom-sheet': 82, dialog: 82,
  'snack-bar': 82, tooltip: 82, 'progress-bar': 62, 'progress-spinner': 158,
});

declare global {
  interface Window {
    __ASTYLAR_MATERIAL_BENCHMARK__?: {
      waitForSettled(): Promise<void>;
      measure(ids: readonly string[]): MaterialBenchmarkMeasurement;
      state(): ShowcaseState;
      clearEvents(): void;
      events(): ReadonlyArray<{ type: string; targetId?: string; value?: unknown }>;
    };
  }
}
