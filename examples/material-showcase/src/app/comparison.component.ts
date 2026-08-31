import { Component, ElementRef, HostListener, computed, inject, signal, viewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MATERIAL_CATALOG, MaterialFamily } from './catalog';
import { ShowcaseFrameCommand } from './frame-protocol';
import { ShowcaseStore } from './showcase.store';
import { MATERIAL_THEME_PROFILES, MaterialThemeConfig } from './theme';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-comparison',
  imports: [FormsModule],
  template: `
    <section class="comparison-toolbar" aria-label="Showcase controls">
      <label>Component
        <select [ngModel]="store.family()" (ngModelChange)="selectFamily($event)">
          @for (entry of catalog; track entry.id) { <option [value]="entry.id">{{ entry.label }}</option> }
        </select>
      </label>
      <div class="profiles" aria-label="Theme profiles">
        @for (profile of profileEntries; track profile[0]) {
          <button type="button" (click)="applyTheme(profile[1])">{{ profile[0] }}</button>
        }
      </div>
      <button type="button" (click)="reset()">Reset</button>
      <div class="states" aria-label="Component states">
        <button type="button" [class.active]="store.state().selected" (click)="patchState({ selected: !store.state().selected })">Selected</button>
        <button type="button" [class.active]="store.state().disabled" (click)="patchState({ disabled: !store.state().disabled })">Disabled</button>
        <button type="button" [class.active]="store.state().error" (click)="patchState({ error: !store.state().error })">Error</button>
        <button type="button" [class.active]="store.state().open" (click)="patchState({ open: !store.state().open })">Open</button>
      </div>
      <details class="theme-editor">
        <summary>Custom theme</summary>
        <div class="theme-fields">
          <label>Mode<select [ngModel]="store.theme().mode" (ngModelChange)="patchTheme({ mode: $event })"><option value="light">Light</option><option value="dark">Dark</option></select></label>
          <label>Primary<input type="color" [ngModel]="store.theme().primary" (ngModelChange)="patchTheme({ primary: $event })"></label>
          <label>Tertiary<input type="color" [ngModel]="store.theme().tertiary" (ngModelChange)="patchTheme({ tertiary: $event })"></label>
          <label>Surface<input type="color" [ngModel]="store.theme().surface" (ngModelChange)="patchTheme({ surface: $event })"></label>
          <label>Error<input type="color" [ngModel]="store.theme().error" (ngModelChange)="patchTheme({ error: $event })"></label>
          <label>Density {{ store.theme().density }}<input type="range" min="-5" max="0" step="1" [ngModel]="store.theme().density" (ngModelChange)="patchTheme({ density: +$event })"></label>
          <label>Corner {{ store.theme().cornerScale }}<input type="range" min="0.5" max="1.5" step="0.05" [ngModel]="store.theme().cornerScale" (ngModelChange)="patchTheme({ cornerScale: +$event })"></label>
          <label>Type {{ store.theme().typographyScale }}<input type="range" min="0.85" max="1.25" step="0.05" [ngModel]="store.theme().typographyScale" (ngModelChange)="patchTheme({ typographyScale: +$event })"></label>
        </div>
      </details>
    </section>
    <section class="comparison-grid" aria-label="Material parity comparison">
      <article><h2>Angular Material reference</h2><iframe #frame title="Angular Material reference" [src]="referenceUrl()" (load)="syncFrames()"></iframe></article>
      <article><h2>AstylarUI</h2><iframe #frame title="AstylarUI implementation" [src]="astylarUrl()" (load)="syncFrames()"></iframe></article>
    </section>
  `,
  styles: [`
    :host { display:block; min-height:100%; background:#f6f2fa; color:#25232a; }
    .comparison-toolbar { position:sticky; top:0; z-index:2; display:flex; gap:16px; align-items:end; padding:14px 20px; background:#fffbfe; box-shadow:0 2px 10px #0002; }
    label { display:grid; gap:4px; font:500 12px/1.3 Roboto, sans-serif; } select,button { min-height:36px; border:1px solid #cac4d0; border-radius:18px; padding:0 14px; background:white; }
    .profiles,.states { display:flex; gap:8px; flex-wrap:wrap; }.states button.active{background:#6750a4;color:white}.theme-editor{position:relative}.theme-editor summary{min-height:34px;display:flex;align-items:center;cursor:pointer}.theme-fields{position:absolute;right:0;top:42px;z-index:4;display:grid;grid-template-columns:repeat(2,minmax(140px,1fr));gap:12px;width:360px;padding:16px;border:1px solid #cac4d0;border-radius:16px;background:#fffbfe;box-shadow:0 8px 24px #0003}.theme-fields input,.theme-fields select{width:100%;box-sizing:border-box}.comparison-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; padding:16px; }
    article { min-width:0; } h2 { margin:0 0 8px; font:500 14px Roboto,sans-serif; } iframe { width:100%; height:calc(100vh - 125px); border:1px solid #cac4d0; border-radius:20px; background:white; }
    @media (max-width:800px) { .comparison-grid { grid-template-columns:1fr; } iframe { height:680px; } .comparison-toolbar { align-items:stretch; flex-direction:column; } }
  `],
})
export class ComparisonComponent {
  protected readonly store = inject(ShowcaseStore);
  protected readonly catalog = MATERIAL_CATALOG;
  protected readonly profileEntries = Object.entries(MATERIAL_THEME_PROFILES);
  private readonly frames = viewChildren<ElementRef<HTMLIFrameElement>>('frame');
  private readonly sanitizer = inject(DomSanitizer);
  private readonly nonce = signal(0);
  protected readonly referenceUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(`/reference/${this.store.family()}?v=${this.nonce()}`));
  protected readonly astylarUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(`/astylar/${this.store.family()}?v=${this.nonce()}`));

  protected selectFamily(family: MaterialFamily): void {
    this.store.selectFamily(family);
    this.nonce.update((value) => value + 1);
  }
  protected applyTheme(theme: MaterialThemeConfig): void { this.store.setTheme(theme); this.post({ type: 'showcase:theme', theme }); }
  protected patchTheme(patch: Partial<MaterialThemeConfig>): void { this.applyTheme({ ...this.store.theme(), ...patch }); }
  protected patchState(patch: Parameters<ShowcaseStore['patchState']>[0]): void { this.store.patchState(patch); this.post({ type: 'showcase:state', state: this.store.state() }); }
  protected reset(): void { this.store.reset(); this.post({ type: 'showcase:reset' }); }
  protected syncFrames(): void {
    this.post({ type: 'showcase:family', family: this.store.family() });
    this.post({ type: 'showcase:theme', theme: this.store.theme() });
    this.post({ type: 'showcase:state', state: this.store.state() });
  }
  @HostListener('window:message', ['$event'])
  protected handleFrameReady(event: MessageEvent<unknown>): void {
    if (event.origin !== window.location.origin ||
        !event.data || typeof event.data !== 'object' ||
        (event.data as { type?: unknown }).type !== 'showcase:ready') return;
    this.syncFrames();
  }
  private post(command: ShowcaseFrameCommand): void {
    for (const frame of this.frames()) frame.nativeElement.contentWindow?.postMessage(command, window.location.origin);
  }
}
