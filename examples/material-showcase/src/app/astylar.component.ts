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
import { ShowcaseStore, type ShowcaseState } from './showcase.store';
import { mixHex } from './theme';
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
  private readonly route = inject(ActivatedRoute);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sync = inject(FrameSync);
  private readonly ripple = inject(MaterialRippleController);
  protected readonly status = signal('Rendering');
  private surface?: AstylarSurface;
  private pendingSurfaceUpdate?: Promise<unknown>;
  private readonly focusedId = signal<string | undefined>(undefined);
  private readonly eventLog: Array<{ type: string; targetId?: string; value?: unknown }> = [];
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
            if (targetId === 'slider-primary') this.store.patchState({ sliderValue: Number(event.value) });
            if (targetId === 'slider-start') this.store.patchState({ sliderStart: Number(event.value) });
            if (targetId === 'checkbox-primary') this.store.patchState({ selected: event.checked === true });
            if (targetId === 'select-control') this.store.patchState({ selected: event.selectedValue === 'team' || event.value === 'team' });
            if (targetId === 'radio-team') this.store.patchState({ selected: true });
            if (targetId === 'radio-solo') this.store.patchState({ selected: false });
            if (targetId && ['slider-primary', 'slider-start', 'checkbox-primary', 'select-control', 'radio-team', 'radio-solo'].includes(targetId)) {
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
          change: (event: AstylarEvent) => this.zone.run(() => { this.recordEvent(event); this.status.set(`Committed ${event.value}`); }),
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
    this.eventLog.push({ type: event.type, targetId: event.targetId, value: event.value });
  }

  private handleClick(id: string, event: AstylarEvent): void {
    if (this.store.state().disabled && ['radio-solo', 'radio-team', 'slide-toggle-primary'].includes(id)) return;
    if (id === 'radio-team') this.store.patchState({ selected: true });
    if (id === 'radio-solo') this.store.patchState({ selected: false });
    if (id === 'sort-primary' || id === 'sort-trigger') this.store.patchState({ sortDirection: this.store.state().sortDirection === 'asc' ? 'desc' : 'asc' });
    if (id === 'paginator-next') this.store.patchState({ pageIndex: Math.min(9, this.store.state().pageIndex + 1) });
    if (id === 'paginator-previous') this.store.patchState({ pageIndex: Math.max(0, this.store.state().pageIndex - 1) });
    if (id === 'button-toggle-one' || id === 'tab-activity') this.store.patchState({ selected: false });
    if (id === 'button-toggle-two' || id === 'tab-overview') this.store.patchState({ selected: true });
    if (id === 'step-review') this.store.patchState({ selected: false });
    if (id === 'step-details') this.store.patchState({ selected: true });
    if (id === 'select-control') this.store.patchState({ open: !this.store.state().open });
    if (id === 'autocomplete-control') this.store.patchState({ open: true });
    if (id === 'timepicker-control') this.store.patchState({ open: !this.store.state().open });
    if (id === 'slide-toggle-primary') this.store.patchState({ selected: !this.store.state().selected });
    if (['dialog-primary', 'bottom-sheet-primary', 'snack-bar-primary'].includes(id)) {
      const wasOpen = this.store.state().open;
      this.store.patchState({ open: !wasOpen });
      if (wasOpen) this.surface?.focus(id, { focusVisible: true });
      else void this.surface?.whenSettled().then(() => this.surface?.focus(id.replace('-primary', '-dismiss')));
    }
    if (id === 'menu-primary') this.store.patchState({ open: !this.store.state().open });
    if (id === 'expansion-primary') this.store.patchState({ open: !this.store.state().open });
    if (id.endsWith('-dismiss')) {
      this.store.patchState({ open: false });
      this.surface?.focus(id.replace('-dismiss', '-primary'), { focusVisible: true });
    }
    if (id === 'dialog-cancel' || id === 'dialog-save') {
      this.store.patchState({ open: false });
      this.surface?.focus('dialog-primary', { focusVisible: true });
    }
    this.status.set(`Activated ${event.targetId}`);
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
    if (this.surface) this.surface.scene.clearColor = Color4.FromHexString(`${theme.surface}ff`);
    const rootId = `${family}-root`;
    const densityHeight = materialDensityHeight(theme.density);
    const referenceHeight = family === 'button' ? 58 + densityHeight : materialReferenceHeight(family, theme.density);
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
        { selector: '.radio-ring', position: 'relative', width: '20px', height: '20px', boxSizing: 'border-box', borderWidth: '2px', borderStyle: 'solid', borderColor: theme.onSurface, borderRadius: '10px' },
        { selector: '.radio-ring.selected', borderColor: theme.primary },
        { selector: '.radio-dot', position: 'absolute', top: '3px', left: '3px', width: '10px', height: '10px', borderRadius: '5px', background: theme.primary },
        { selector: '.radio-label', marginLeft: '8px', fontSize: '14px' },
        { selector: '#slide-toggle-primary', position: 'relative', width: '179px', height: '32px', alignSelf: 'flex-start' },
        { selector: '.switch-track', position: 'absolute', top: '0', left: '0', width: '52px', height: '32px', borderRadius: '16px', background: state.selected ? theme.primary : '#79747e' },
        { selector: '.switch-thumb', position: 'absolute', top: '4px', left: state.selected ? '24px' : '4px', width: '24px', height: '24px', borderRadius: '12px', background: theme.surface, color: theme.primary, textAlign: 'center', fontSize: '18px' },
        { selector: '.switch-label', position: 'absolute', top: '6px', left: '60px', whiteSpace: 'nowrap', color: theme.onSurface, fontSize: '14px' },
        { selector: '#button-toggle-primary', width: '130px', height: '42px', alignSelf: 'flex-start' },
        { selector: '#button-toggle-one, #button-toggle-two', width: '65px', height: '42px', padding: '0 12px' },
        { selector: '#menu-primary', width: '120px' },
        { selector: '#menu-popup', position: 'absolute', top: '69px', left: '28px', width: '112px', height: '112px', boxSizing: 'border-box', padding: '8px 0', background: theme.mode === 'dark' ? '#211f26' : '#f3edf7', boxShadow: '0 2px 6px rgba(0,0,0,0.24)', zIndex: '50' },
        { selector: '#menu-rename, #menu-delete', width: '112px', height: '48px', padding: '0 12px', borderWidth: '0', background: 'transparent', color: theme.onSurface, textAlign: 'left', fontSize: '14px' },
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
        { selector: '.field-label', position: 'absolute', top: '8px', left: '16px', color: theme.primary, fontSize: '12px' },
        { selector: '.field-label.empty-field-label', top: `${state.open ? 8 : theme.density === 0 ? 20 : 16}px`, color: state.open ? theme.primary : theme.onSurface, fontSize: state.open ? '12px' : '16px' },
        { selector: '.field-control', position: 'absolute', top: '0', left: '0', width: '100%', height: `${theme.density === 0 ? 56 : 48}px`, boxSizing: 'border-box', padding: `${theme.density === 0 ? 20 : 8}px 16px 0`, borderWidth: '0', borderRadius: `${4 * theme.cornerScale}px`, background: theme.mode === 'dark' && !state.open ? '#49454f' : '#e8e0eb', boxShadow: `0 1px 0 ${theme.onSurface}`, color: theme.mode === 'dark' && state.open ? '#1d1b20' : theme.onSurface, fontSize: '16px' },
        { selector: '.field-control:focus', borderWidth: '0', color: theme.onSurface, boxShadow: `0 2px 0 ${theme.primary}` },
        { selector: '.select-control', paddingRight: '48px', cursor: 'pointer', boxShadow: state.open ? `0 2px 0 ${theme.primary}` : `0 1px 0 ${theme.onSurface}` },
        { selector: '.select-caret', position: 'absolute', top: `${theme.density === 0 ? 20 : 16}px`, right: '16px', color: state.open ? theme.primary : theme.onSurface, fontSize: '14px' },
        { selector: '.select-popup', position: 'absolute', top: `${theme.density === 0 ? 56 : 48}px`, left: '0', width: '100%', height: `${theme.density === 0 ? 112 : 96}px`, background: '#f2ecf1', boxShadow: '0 2px 6px rgba(0,0,0,0.24)', zIndex: '60' },
        { selector: '.select-option', position: 'relative', width: '100%', height: `${theme.density === 0 ? 56 : 48}px`, boxSizing: 'border-box', padding: `${theme.density === 0 ? 18 : 14}px 16px`, color: '#1d1b20', fontSize: '16px' },
        { selector: '.select-option.selected', background: '#eadef7' },
        { selector: '.autocomplete-popup', top: `${theme.density === 0 ? 58 : 50}px` },
        { selector: '.autocomplete-popup .select-option', padding: `${theme.density === 0 ? 20 : 16}px 16px` },
        { selector: '.select-check', position: 'absolute', top: `${theme.density === 0 ? 16 : 12}px`, right: '16px', color: '#1d1b20', fontSize: '22px' },
        { selector: '.picker-control.open', boxShadow: `0 2px 0 ${theme.primary}` },
        { selector: '.picker-clock', position: 'absolute', top: `${theme.density === 0 ? 16 : 12}px`, right: '12px', color: theme.mode === 'dark' && state.open ? '#49454f' : theme.onSurface, fontSize: '24px' },
        { selector: '.picker-popup', position: 'absolute', top: `${theme.density === 0 ? 64 : 56}px`, left: '0', width: '100%', height: `${theme.density === 0 ? 248 : 216}px`, background: '#f2ecf1', boxShadow: '0 2px 6px rgba(0,0,0,0.24)', zIndex: '60' },
        { selector: '.picker-option', width: '100%', height: `${theme.density === 0 ? 48 : 42}px`, boxSizing: 'border-box', padding: `${theme.density === 0 ? 14 : 11}px 16px`, color: '#1d1b20', fontSize: '16px' },
        { selector: '.picker-option.selected', background: '#d8d2d8' },
        { selector: '.timepicker-shell .field-control', height: `${theme.density <= -5 && state.open ? 34 : theme.density === 0 ? 56 : 48}px` },
        { selector: '.timepicker-shell .field-label', color: theme.density <= -5 && state.open ? '#e8e0eb' : state.open ? theme.primary : theme.onSurface },
        { selector: '.timepicker-shell .picker-popup', top: `${theme.density <= -5 ? 39 : theme.density === 0 ? 64 : 56}px`, height: `${theme.density <= -5 ? 248 : theme.density === 0 ? 248 : 216}px`, paddingTop: `${theme.density <= -5 ? 8 : 0}px` },
        { selector: '.timepicker-shell .picker-option', height: `${theme.density <= -5 ? 48 : theme.density === 0 ? 48 : 42}px`, padding: `${theme.density <= -5 || theme.density === 0 ? 14 : 11}px 16px` },
        { selector: '.field-hint', position: 'absolute', top: `${theme.density === 0 ? 58 : 50}px`, left: '16px', fontSize: '12px', color: theme.onSurface },
        { selector: '.row', display: 'flex', flexWrap: 'wrap', gap: '0', alignItems: 'center' },
        { selector: '.card', padding: '20px', borderRadius: `${16 * theme.cornerScale}px`, background: theme.mode === 'dark' ? '#2b2930' : '#f3edf7', minHeight: '90px' },
        { selector: '.material-card', position: 'relative', width: '100%', height: '120px', boxSizing: 'border-box', borderRadius: `${12 * theme.cornerScale}px`, background: theme.mode === 'dark' ? '#fff7ff' : '#f8f2f6', boxShadow: '0 2px 1px -1px rgba(0,0,0,0.2), 0 1px 1px 0 rgba(0,0,0,0.14), 0 1px 3px 0 rgba(0,0,0,0.12)', zIndex: '2' },
        { selector: '.card-title', position: 'absolute', top: `${theme.density <= -5 ? 15.5 : 14.75}px`, left: '16px', fontSize: '22px', fontWeight: '400', whiteSpace: 'nowrap', zIndex: '2' },
        { selector: '.card-copy', position: 'absolute', top: `${theme.typographyScale > 1 ? 43.5 : 42.75}px`, left: '0', fontSize: '16px', whiteSpace: 'nowrap', zIndex: '2' },
        { selector: '.text-button', position: 'absolute', top: `${theme.density === 0 ? 71.25 : theme.density <= -5 ? 76 : 78}px`, left: '8px', width: '64px', height: `${densityHeight}px`, padding: '0 8px', borderWidth: '0', borderRadius: `${densityHeight / 2 * theme.cornerScale}px`, background: 'transparent', color: theme.primary, fontSize: '14px', fontWeight: '500', cursor: 'pointer', zIndex: '2' },
        { selector: '.text-button:hover', background: mixHex(theme.mode === 'dark' ? '#fff7ff' : '#f8f2f6', theme.primary, .08) },
        { selector: '.text-button:active', background: mixHex(theme.mode === 'dark' ? '#fff7ff' : '#f8f2f6', theme.primary, .12) },
        { selector: '.material-table', width: '100%', height: `${theme.density === 0 ? 162 : theme.density <= -5 ? 114 : 138}px`, borderWidth: '0', background: theme.surface, fontSize: '14px' },
        { selector: '.material-table th', position: 'relative', top: theme.density === -2 ? '-6px' : '0', height: `${theme.density === 0 ? 54 : theme.density <= -5 ? 40 : 48}px`, padding: '0 16px', borderWidth: '0', textAlign: 'left', verticalAlign: 'middle', fontWeight: '500', fontSize: '14px' },
        { selector: '.material-table td', position: 'relative', top: theme.density === -2 ? '-6px' : '0', height: `${theme.density === 0 ? 54 : theme.density <= -5 ? 36 : 44}px`, padding: '0 16px', borderWidth: '0', textAlign: 'left', verticalAlign: 'middle', fontSize: '14px' },
        { selector: '.table-rule', position: 'absolute', left: '28px', width: '720px', height: '1px', background: '#79747e' },
        { selector: '.table-rule-one', top: `${theme.density === 0 ? 84 : theme.density <= -5 ? 68 : 76}px` },
        { selector: '.table-rule-two', top: `${theme.density === 0 ? 138 : theme.density <= -5 ? 104 : 120}px` },
        { selector: '.table-rule', mediaMaxWidth: '500px', width: '260px' },
        ...(theme.density === 0 ? [{ selector: '.material-table th, .material-table td', mediaMaxWidth: '500px', top: '-7px' }] : []),
        { selector: '.expansion-panel', position: 'relative', width: '100%', height: `${theme.density === 0 ? 48 : theme.density <= -5 ? 36 : 40}px`, borderRadius: `${12 * theme.cornerScale}px`, background: theme.surface, boxShadow: '0 1px 2px #00000055' },
        { selector: '.expansion-trigger', width: '100%', height: `${theme.density === 0 ? 48 : theme.density <= -5 ? 36 : 40}px`, padding: '0 24px', borderWidth: '0', background: 'transparent', color: theme.onSurface, fontWeight: '500', textAlign: 'left' },
        { selector: '.expansion-chevron', position: 'absolute', top: '13px', right: '20px', fontSize: '20px' },
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
        { selector: '.chip', width: '88px', height: '32px', padding: '0 16px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#79747e', borderRadius: '16px', background: 'transparent', color: theme.onSurface },
        { selector: '.material-icon', width: '24px', height: '24px', objectFit: 'contain' },
        { selector: '#chips-primary', height: `${theme.density === 0 ? 40 : 32}px` },
        { selector: '.material-list', width: '100%', display: 'flex', flexDirection: 'column', fontSize: '16px' },
        { selector: '.list-item', width: '100%', height: `${theme.density === 0 ? 56 : theme.density <= -5 ? 40 : 48}px`, boxSizing: 'border-box', display: 'flex', alignItems: 'center' },
        { selector: '.list-label', marginLeft: '16px', fontSize: '16px' },
        { selector: '.sort-header', width: '100%', height: `${theme.density === -2 ? 22 : 19}px`, borderWidth: '0', background: 'transparent', color: theme.onSurface, textAlign: 'left', fontWeight: '500' },
        { selector: '.paginator', position: 'relative', width: '100%', height: '56px', background: theme.surface, fontSize: '12px' },
        { selector: '#paginator-size', position: 'absolute', top: '-2.5px', right: '23px', whiteSpace: 'nowrap', fontSize: '12px' },
        { selector: '#paginator-range', position: 'absolute', top: '26px', right: '125.5px', whiteSpace: 'nowrap', fontSize: '12px' },
        { selector: '.paginator-button', position: 'absolute', top: '10px', width: '40px', height: '40px', borderWidth: '0', borderRadius: '20px', background: 'transparent', color: theme.onSurface, fontSize: '20px' },
        { selector: '#paginator-previous', right: '48px' },
        { selector: '#paginator-next', right: '8px' },
        { selector: '.material-tree', width: '100%', display: 'flex', flexDirection: 'column', background: theme.surface },
        { selector: '.tree-item', width: '100%', height: `${theme.density < 0 ? 40 : 48}px`, padding: '0', boxSizing: 'border-box', display: 'flex', alignItems: 'center' },
        { selector: '#tree-item-0:focus, #tree-item-0.focused', height: `${theme.density < 0 ? 42 : 50}px`, padding: '0', borderWidth: '2px', borderStyle: 'solid', borderColor: theme.onSurface, color: theme.onSurface, background: theme.surface },
        { selector: '.tabs', position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' },
        { selector: '.tab-list', width: '100%', height: `${theme.density === 0 ? 48 : 43}px`, display: 'flex' },
        { selector: '.tab', width: '50%', height: `${theme.density === 0 ? 48 : 43}px`, borderWidth: '0', background: 'transparent', color: theme.onSurface, fontWeight: '500' },
        { selector: '.tab-indicator', position: 'absolute', top: `${theme.density === 0 ? 46 : 41}px`, left: state.selected ? '0' : '50%', width: '50%', height: '2px', background: theme.primary },
        { selector: '.tab-panel', paddingTop: '12px' },
        { selector: '.stepper', width: '100%', display: 'flex', flexDirection: 'column' },
        { selector: '#stepper-primary', height: `${theme.density === 0 ? 115 : 110}px` },
        { selector: '.stepper-head', width: '100%', height: '72px', display: 'flex', gap: '40px', alignItems: 'center' },
        { selector: '.step-label', fontWeight: '500' },
        { selector: '.stepper', position: 'relative', boxSizing: 'border-box', padding: '0 24px', background: theme.surface },
        { selector: '.stepper-head', gap: '16px' },
        { selector: '.step-tab', position: 'relative', height: '48px', display: 'flex', alignItems: 'center' },
        { selector: '.step-badge', width: '24px', height: '24px', borderRadius: '12px', background: theme.mode === 'dark' ? '#cac4d0' : '#49454f', color: theme.surface, textAlign: 'center', fontSize: '14px' },
        { selector: '.step-badge.selected', background: theme.primary, color: theme.onPrimary },
        { selector: '.step-text', marginLeft: '8px', whiteSpace: 'nowrap', fontWeight: '500', fontSize: '14px' },
        { selector: '.step-connector', width: '32px', height: '1px', background: '#79747e' },
        { selector: '#stepper-content', marginTop: '-1px' },
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
        { selector: '#checkbox-primary', width: theme.density <= -5 ? '137.5625px' : theme.density < 0 ? '141.5625px' : '149.5625px', height: `${theme.density === 0 ? 40 : 32}px`, alignSelf: 'flex-start' },
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
        { selector: '.dialog-panel', position: 'relative', width: '232px', minHeight: '112px', boxSizing: 'content-box', padding: '24px', borderRadius: `${28 * theme.cornerScale}px`, background: theme.mode === 'dark' ? '#211f26' : '#fff7ff', color: theme.onSurface },
        { selector: '.dialog-title', fontSize: '24px', fontWeight: '400' },
        { selector: '.dialog-copy', marginTop: '16px', fontSize: '14px' },
        { selector: '.dialog-actions', position: 'absolute', right: '24px', bottom: '16px', height: '40px', display: 'flex', gap: '8px' },
        { selector: '.dialog-action', width: '72px', height: '40px', borderWidth: '0', borderRadius: '20px', background: 'transparent', color: theme.primary, fontWeight: '500' },
        { selector: '.dialog-action.primary', background: theme.primary, color: theme.onPrimary },
        { selector: '.bottom-sheet-overlay', alignItems: 'flex-end', padding: '0' },
        { selector: '.bottom-sheet-panel', width: '512px', minHeight: '128px', boxSizing: 'border-box', padding: '16px', borderRadius: `${28 * theme.cornerScale}px ${28 * theme.cornerScale}px 0 0`, background: theme.surface, color: theme.onSurface },
        { selector: '.bottom-sheet-option', width: '100%', height: '48px', boxSizing: 'border-box', padding: '0 16px', borderWidth: '0', borderRadius: `${28 * theme.cornerScale}px`, background: 'transparent', color: theme.onSurface, textAlign: 'left', fontSize: '16px' },
        { selector: '.bottom-sheet-option:focus', color: theme.onSurface, background: mixHex(theme.surface, theme.onSurface, .12) },
        { selector: '.snack-surface', position: 'fixed', left: '24px', bottom: '24px', width: '360px', minHeight: '48px', boxSizing: 'border-box', padding: '10px 18px', borderRadius: '4px', background: '#322f35', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: '1000' },
        { selector: '.overlay-dismiss', width: '88px', height: '40px', borderWidth: '0', background: 'transparent', color: theme.primary, fontWeight: '500' },
      ],
    };
  }

  private familyElements(family: MaterialFamily): DOMElement[] {
    const state = this.store.state();
    if (family === 'toolbar') return [{ type: 'div', id: 'toolbar-primary', class: 'toolbar', children: [{ type: 'span', id: 'toolbar-title', class: 'toolbar-title', children: [{ type: 'span', id: 'toolbar-title-text', class: 'toolbar-title-text', textContent: 'Material workspace' }] }, { type: 'button', id: 'toolbar-action', class: 'toolbar-action', value: 'Action' }] }];
    if (family === 'sidenav') return [{ type: 'div', id: 'sidenav-primary', class: 'sidenav-container', children: [{ type: 'aside', id: 'sidenav-nav', class: 'sidenav', textContent: 'Navigation' }, { type: 'main', id: 'sidenav-content', class: 'sidenav-content', textContent: 'Main content' }] }];
    if (family === 'grid-list') return [{ type: 'div', id: 'grid-list-primary', class: 'grid-list', children: [{ type: 'div', id: 'grid-tile-one', class: 'grid-tile', children: [{ type: 'span', id: 'grid-tile-one-label', class: 'grid-tile-label', textContent: 'One' }] }, { type: 'div', id: 'grid-tile-two', class: 'grid-tile', children: [{ type: 'span', id: 'grid-tile-two-label', class: 'grid-tile-label', textContent: 'Two' }] }] }];
    if (family === 'badge') return [{ type: 'span', id: 'badge-primary', class: 'badge-anchor', children: [{ type: 'span', id: 'badge-label', class: 'badge-label', textContent: 'Notifications' }, { type: 'span', id: 'badge-count', class: 'badge-bubble', children: [{ type: 'span', id: 'badge-count-label', class: 'badge-count-label', textContent: '4' }] }] }];
    if (family === 'chips') return [{ type: 'div', id: 'chips-primary', class: 'row', role: 'listbox', ariaLabel: 'Tags', ariaDisabled: false, ariaMultiselectable: true, children: state.chips.map((chip, index) => ({ type: 'button' as const, id: `chip-${index}`, class: 'chip', role: 'option', ariaSelected: state.selected, value: chip })) }];
    if (family === 'icon') return [{ type: 'img', id: 'icon-primary', class: 'material-icon', src: '/icons/favorite.svg', alt: 'Favorite' }];
    if (family === 'list') return [{ type: 'div', id: 'list-primary', class: 'material-list', ariaDisabled: false, children: [{ type: 'div', id: 'list-inbox', class: 'list-item', children: [{ type: 'span', id: 'list-inbox-label', class: 'list-label', textContent: 'Inbox' }] }, { type: 'div', id: 'list-archive', class: 'list-item', children: [{ type: 'span', id: 'list-archive-label', class: 'list-label', textContent: 'Archive' }] }] }];
    if (family === 'sort') return [{ type: 'div', id: 'sort-primary', class: 'sort-header', children: [{ type: 'button', id: 'sort-trigger', ariaSort: state.sortDirection === 'asc' ? 'ascending' : 'descending', value: 'Sort by name' }] }];
    if (family === 'paginator') return [{ type: 'div', id: 'paginator-primary', class: 'paginator', role: 'group', ariaLabel: `Items per page: 10 ${state.pageIndex * 10 + 1} – ${Math.min(100, state.pageIndex * 10 + 10)} of 100`, children: [{ type: 'span', id: 'paginator-size', textContent: 'Items per page: 10' }, { type: 'span', id: 'paginator-range', textContent: `${state.pageIndex * 10 + 1} – ${Math.min(100, state.pageIndex * 10 + 10)} of 100` }, { type: 'button', id: 'paginator-previous', class: 'paginator-button', disabled: state.pageIndex === 0, ariaLabel: 'Previous page', value: '‹' }, { type: 'button', id: 'paginator-next', class: 'paginator-button', disabled: state.pageIndex === 9, ariaLabel: 'Next page', value: '›' }] }];
    if (family === 'tree') return [{ type: 'div', id: 'tree-primary', class: 'material-tree', role: 'tree', children: ['Documents', 'Projects', 'Archive'].map((label, index) => ({ type: 'div' as const, id: `tree-item-${index}`, class: `tree-item${this.focusedId() === `tree-item-${index}` ? ' focused' : ''}`, role: 'treeitem', tabindex: index === 0 ? 0 : -1, ariaLevel: 1, ariaPosinset: index + 1, ariaSetsize: 3, textContent: label })) }];
    if (family === 'slider') return [{ type: 'div', id: 'slider-pair', class: 'range-stack', children: [
      { type: 'showcase.material:range-visual', id: 'slider-material-visual', class: 'range-plugin-layer', data: { start: state.sliderStart / 100, end: state.sliderValue / 100, 'indicator-color': this.store.tokens().primary, 'track-color': this.store.tokens().mode === 'dark' ? '#49454f' : '#e7e0ec' } },
      { type: 'input', inputType: 'range', id: 'slider-start', class: 'range-layer', min: '0', max: '100', step: '5', value: String(state.sliderStart), disabled: state.disabled, ariaLabel: 'Minimum', ariaValueText: String(state.sliderStart) },
      { type: 'input', inputType: 'range', id: 'slider-primary', class: 'range-layer', min: '0', max: '100', step: '5', value: String(state.sliderValue), disabled: state.disabled, ariaLabel: 'Maximum', ariaValueText: String(state.sliderValue) },
    ] }];
    if (family === 'progress-bar') return [{ type: 'showcase.material:linear-progress', id: 'progress-bar-primary', class: 'progress', role: 'progressbar', ariaValueMin: 0, ariaValueMax: 100, ariaValueNow: 64, data: { mode: 'determinate', progress: .64, 'indicator-color': this.store.tokens().primary, 'track-color': this.store.tokens().mode === 'dark' ? '#49454f' : '#e7e0ec' } }];
    if (family === 'progress-spinner') return [{ type: 'showcase.material:circular-progress', id: 'progress-spinner-primary', class: 'progress', role: 'progressbar', ariaValueMin: 0, ariaValueMax: 100, ariaValueNow: 64, data: { mode: 'determinate', progress: .64, 'indicator-color': this.store.tokens().primary, 'stroke-width': 10 } }];
    if (['input', 'form-field', 'autocomplete'].includes(family)) return [{ type: 'div', id: `${family}-primary`, class: 'field-shell', children: [
      { type: 'label' as const, id: `${family}-label`, class: `field-label${family === 'autocomplete' ? ' empty-field-label' : ''}`, for: `${family}-control`, textContent: family === 'autocomplete' ? 'City' : family === 'form-field' ? 'Project name' : 'Email' },
      { type: 'input', inputType: family === 'input' ? 'email' : 'text', id: `${family}-control`, class: 'field-control', value: family === 'autocomplete' ? '' : family === 'input' ? 'team@example.com' : 'Atlas', disabled: state.disabled, ariaLabel: family === 'autocomplete' ? 'City' : family === 'input' ? 'Email' : 'Project name', ariaInvalid: state.error, role: family === 'autocomplete' ? 'combobox' : undefined, ariaExpanded: family === 'autocomplete' ? state.open : undefined, ariaControls: family === 'autocomplete' ? 'field-options' : undefined, ariaAutocomplete: family === 'autocomplete' ? 'list' : undefined },
      ...(family === 'form-field' ? [{ type: 'span' as const, id: 'form-field-hint', class: 'field-hint', textContent: 'Public label' }] : []),
      ...(family === 'autocomplete' && state.open ? [{ type: 'div' as const, id: 'field-options', class: 'select-popup autocomplete-popup', role: 'listbox', children: [
        { type: 'div' as const, id: 'autocomplete-option-cape-town', class: 'select-option', role: 'option', textContent: 'Cape Town' },
        { type: 'div' as const, id: 'autocomplete-option-johannesburg', class: 'select-option', role: 'option', textContent: 'Johannesburg' },
      ] }] : []),
    ] }];
    if (family === 'checkbox') return [{ type: 'input', inputType: 'checkbox', id: 'checkbox-primary', checked: state.selected, disabled: state.disabled, ariaLabel: 'Include archived' }];
    if (family === 'radio') return [{ type: 'div', id: 'radio-primary', role: 'radiogroup', children: [
      { type: 'div', id: 'radio-solo', class: 'radio-option', role: 'radio', tabindex: state.selected ? -1 : 0, ariaChecked: !state.selected, ariaDisabled: state.disabled, children: [{ type: 'span', id: 'radio-solo-ring', class: `radio-ring${state.selected ? '' : ' selected'}`, children: state.selected ? [] : [{ type: 'span', id: 'radio-solo-dot', class: 'radio-dot' }] }, { type: 'span', id: 'radio-solo-label', class: 'radio-label', textContent: 'Solo' }] },
      { type: 'div', id: 'radio-team', class: 'radio-option', role: 'radio', tabindex: state.selected ? 0 : -1, ariaChecked: state.selected, ariaDisabled: state.disabled, children: [{ type: 'span', id: 'radio-team-ring', class: `radio-ring${state.selected ? ' selected' : ''}`, children: state.selected ? [{ type: 'span', id: 'radio-team-dot', class: 'radio-dot' }] : [] }, { type: 'span', id: 'radio-team-label', class: 'radio-label', textContent: 'Team' }] },
    ] }];
    if (family === 'select') return [{ type: 'div', id: 'select-primary', class: 'field-shell', children: [
      { type: 'label', id: 'select-label', class: 'field-label', for: 'select-control', textContent: 'Plan' },
      {
        type: 'input', inputType: 'text', id: 'select-control', class: 'field-control select-control',
        value: state.selected ? 'Team' : 'Solo', readonly: true, disabled: state.disabled,
        role: 'combobox', ariaLabel: 'Plan', ariaInvalid: state.error, ariaExpanded: state.open,
        ariaControls: 'select-options', ariaActivedescendant: state.open
          ? state.selected ? 'select-option-team' : 'select-option-solo' : undefined,
      },
      { type: 'span', id: 'select-caret', class: 'select-caret', role: 'presentation', textContent: '▾' },
      ...(state.open ? [{ type: 'div' as const, id: 'select-options', class: 'select-popup', role: 'listbox', children: [
        { type: 'div' as const, id: 'select-option-solo', class: `select-option${state.selected ? '' : ' selected'}`, role: 'option', ariaSelected: !state.selected, textContent: 'Solo' },
        { type: 'div' as const, id: 'select-option-team', class: `select-option${state.selected ? ' selected' : ''}`, role: 'option', ariaSelected: state.selected, children: [
          { type: 'span' as const, id: 'select-team-label', textContent: 'Team' },
          ...(state.selected ? [{ type: 'span' as const, id: 'select-check', class: 'select-check', role: 'presentation', textContent: '✓' }] : []),
        ] },
      ] }] : []),
    ] }];
    if (family === 'slide-toggle') return [{ type: 'div', id: 'slide-toggle-primary', role: 'switch', tabindex: state.disabled ? -1 : 0, ariaLabel: 'Automatic updates', ariaChecked: state.selected, ariaDisabled: state.disabled, children: [{ type: 'span', id: 'slide-toggle-track', class: 'switch-track', children: [{ type: 'span', id: 'slide-toggle-thumb', class: 'switch-thumb', textContent: state.selected ? '✓' : '' }] }, { type: 'span', id: 'slide-toggle-label', class: 'switch-label', textContent: 'Automatic updates' }] }];
    if (family === 'menu') return [{ type: 'button', id: 'menu-primary', class: 'material-button', ariaHaspopup: 'menu', ariaExpanded: state.open, ariaControls: 'menu-popup', value: 'Open menu' }, ...(state.open ? [{ type: 'div' as const, id: 'menu-popup', role: 'menu', children: [{ type: 'button' as const, id: 'menu-rename', role: 'menuitem', value: 'Rename' }, { type: 'button' as const, id: 'menu-delete', role: 'menuitem', value: 'Delete' }] }] : [])];
    if (family === 'tabs') return [{ type: 'div', id: 'tabs-primary', class: 'tabs', children: [{ type: 'div', id: 'tabs-list', class: 'tab-list', role: 'tablist', children: [{ type: 'button', id: 'tab-overview', class: 'tab', role: 'tab', ariaSelected: state.selected, tabindex: state.selected ? 0 : -1, ariaControls: 'tab-panel', value: 'Overview' }, { type: 'button', id: 'tab-activity', class: 'tab', role: 'tab', ariaSelected: !state.selected, tabindex: state.selected ? -1 : 0, ariaControls: 'tab-panel', value: 'Activity' }] }, { type: 'div', id: 'tab-indicator', class: 'tab-indicator' }, { type: 'div', id: 'tab-panel', class: 'tab-panel', role: 'tabpanel', textContent: state.selected ? 'Overview content' : 'Activity content' }] }];
    if (family === 'stepper') return [{ type: 'div', id: 'stepper-primary', class: 'stepper', role: 'tablist', ariaLabel: state.selected ? '1Details2ReviewProject detailsReview changes' : 'EditablecreateDetails2ReviewProject detailsReview changes', children: [{ type: 'div', id: 'stepper-head', class: 'stepper-head', children: [{ type: 'div', id: 'step-details', class: 'step-tab', role: 'tab', tabindex: state.selected ? 0 : -1, ariaSelected: state.selected, children: [{ type: 'span', id: 'step-details-badge', class: `step-badge${state.selected ? ' selected' : ''}`, textContent: '1' }, { type: 'span', id: 'step-details-text', class: 'step-text', textContent: 'Details' }] }, { type: 'span', id: 'step-connector', class: 'step-connector' }, { type: 'div', id: 'step-review', class: 'step-tab', role: 'tab', tabindex: state.selected ? -1 : 0, ariaSelected: !state.selected, children: [{ type: 'span', id: 'step-review-badge', class: `step-badge${state.selected ? '' : ' selected'}`, textContent: '2' }, { type: 'span', id: 'step-review-text', class: 'step-text', textContent: 'Review' }] }] }, { type: 'div', id: 'stepper-content', role: 'tabpanel', textContent: state.selected ? 'Project details' : 'Review changes' }] }];
    if (family === 'button-toggle') return this.composite(family);
    if (family === 'divider') return [{ type: 'p', id: 'divider-above-row', class: 'divider-copy divider-above', children: [{ type: 'span', id: 'divider-above', textContent: 'Above' }] }, { type: 'div', id: 'divider-primary', class: 'divider', role: 'separator' }, { type: 'p', id: 'divider-below-row', class: 'divider-copy divider-below', children: [{ type: 'span', id: 'divider-below', textContent: 'Below' }] }];
    if (family === 'card') return [{ type: 'div', id: 'card-primary', class: 'material-card', children: [{ type: 'h2', id: 'card-title', class: 'card-title', textContent: 'Project Atlas' }, { type: 'p', id: 'card-copy', class: 'card-copy', textContent: 'Material surface content.' }, { type: 'button', id: 'card-open', class: 'text-button', value: 'OPEN' }] }];
    if (family === 'table') return [{ type: 'table', id: 'table-primary', class: 'material-table', tableProperties: { tableLayout: 'fixed', borderCollapse: 'collapse' }, children: [
      { type: 'thead', id: 'table-head', children: [{ type: 'tr', id: 'table-header-row', children: [{ type: 'th', id: 'table-name-header', scope: 'col', textContent: 'Name' }] }] },
      { type: 'tbody', id: 'table-body', children: [
        { type: 'tr', id: 'table-atlas-row', children: [{ type: 'td', id: 'table-atlas', textContent: 'Atlas' }] },
        { type: 'tr', id: 'table-northstar-row', children: [{ type: 'td', id: 'table-northstar', textContent: 'Northstar' }] },
      ] },
    ] }, { type: 'div', id: 'table-rule-one', class: 'table-rule table-rule-one' }, { type: 'div', id: 'table-rule-two', class: 'table-rule table-rule-two' }];
    if (family === 'expansion') return [{ type: 'article', id: 'expansion-shell', class: 'expansion-panel', children: [{ type: 'button', id: 'expansion-primary', class: 'expansion-trigger', disabled: state.disabled, ariaExpanded: state.open, ariaControls: 'expansion-content', value: 'Advanced settings' }, { type: 'span', id: 'expansion-chevron', class: 'expansion-chevron', textContent: state.open ? '⌃' : '⌄' }, ...(state.open ? [{ type: 'p' as const, id: 'expansion-content', textContent: 'Additional options.' }] : [])] }];
    if (['dialog', 'bottom-sheet', 'snack-bar'].includes(family)) {
      const label = family === 'dialog' ? 'Open dialog' : family === 'bottom-sheet' ? 'Open bottom sheet' : 'Show snackbar';
      const overlay = family === 'snack-bar'
        ? { type: 'div' as const, id: `${family}-overlay`, class: 'snack-surface', role: 'status', ariaLive: 'polite' as const, ariaAtomic: true, children: [
          { type: 'span' as const, id: `${family}-title`, textContent: 'Project saved' },
          { type: 'button' as const, id: `${family}-dismiss`, class: 'overlay-dismiss', value: 'UNDO' },
        ] }
        : { type: 'dialog' as const, id: `${family}-overlay`, class: `modal-overlay ${family === 'bottom-sheet' ? 'bottom-sheet-overlay' : ''}`, open: true, modal: true, ariaLabel: label, children: [
          { type: 'section' as const, id: `${family}-panel`, class: family === 'bottom-sheet' ? 'bottom-sheet-panel' : 'dialog-panel', children: family === 'bottom-sheet' ? [
            { type: 'button' as const, id: 'bottom-sheet-dismiss', class: 'bottom-sheet-option', autofocus: true, value: 'Share' },
            { type: 'button' as const, id: 'bottom-sheet-copy', class: 'bottom-sheet-option', value: 'Copy link' },
          ] : [
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
    if (family === 'datepicker' || family === 'timepicker') return [{ type: 'div', id: `${family}-primary`, class: `field-shell${family === 'timepicker' ? ' timepicker-shell' : ''}`, children: [
      { type: 'label', id: `${family}-label`, class: 'field-label empty-field-label', for: `${family}-control`, textContent: family === 'datepicker' ? 'Due date' : 'Meeting time' },
      { type: 'input', inputType: 'text', id: `${family}-control`, class: `field-control${family === 'timepicker' ? ' picker-control' : ''}${family === 'timepicker' && state.open ? ' open' : ''}`, value: '', disabled: state.disabled, role: family === 'timepicker' ? 'combobox' : undefined, ariaLabel: family === 'datepicker' ? 'Due date' : 'Meeting time', ariaInvalid: state.error, ariaHaspopup: 'dialog', ariaExpanded: family === 'timepicker' ? state.open : undefined, ariaControls: family === 'timepicker' ? 'timepicker-options' : undefined, ariaActivedescendant: family === 'timepicker' && state.open ? 'timepicker-option-0' : undefined },
      ...([{ type: 'span' as const, id: `${family}-icon`, class: 'picker-clock', role: 'presentation', textContent: family === 'datepicker' ? '▦' : '◷' }]),
      ...(family === 'timepicker' && state.open ? [{ type: 'div' as const, id: 'timepicker-options', class: 'picker-popup', role: 'listbox', children: ['12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM'].map((label, index) => ({ type: 'div' as const, id: `timepicker-option-${index}`, class: `picker-option${index === 0 ? ' selected' : ''}`, role: 'option', ariaSelected: index === 0, textContent: label })) }] : []),
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
        backgroundPick: backgroundPick ? { name: backgroundPick.name, metadata: backgroundPick.metadata } : undefined,
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
