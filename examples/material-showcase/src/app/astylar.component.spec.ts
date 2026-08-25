import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import type { AstylarEvent, AstylarSurface } from 'astylarui';
import type { SiteData } from 'astylarui';
import { AstylarShowcaseComponent } from './astylar.component';
import { FrameSync } from './frame-sync';
import { MaterialRippleController } from './material-plugin/material-ripple.controller';
import { DEFAULT_SHOWCASE_STATE, ShowcaseStore } from './showcase.store';
import { MATERIAL_THEME_PROFILES, resolveTheme } from './theme';

describe('AstylarShowcaseComponent', () => {
  it('activates a primary-color ripple from the toolbar action pointer origin', () => {
    const activate = jasmine.createSpy('activate');
    const tokens = resolveTheme(MATERIAL_THEME_PROFILES.light);
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'toolbar' } } } },
        { provide: FrameSync, useValue: {} },
        { provide: MaterialRippleController, useValue: { activate, dispose: () => undefined } },
        { provide: ShowcaseStore, useValue: { tokens: () => tokens, state: () => DEFAULT_SHOWCASE_STATE } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new AstylarShowcaseComponent());
    const surface = {
      scene: { getEngine: () => ({ getRenderingCanvas: () => ({ clientWidth: 900 }) }) },
    } as unknown as AstylarSurface;
    (component as unknown as { surface: AstylarSurface }).surface = surface;

    (component as unknown as { activateRipple: (event: AstylarEvent) => void }).activateRipple({
      targetId: 'toolbar-action', localX: 12, localY: 7,
    } as AstylarEvent);

    expect(activate).toHaveBeenCalledOnceWith({
      surface,
      elementId: 'toolbar-action',
      originX: 12,
      originY: 7,
      width: 65.140625,
      height: 40,
      cornerRadius: 20,
      color: '#6750a4',
    });
  });

  it('activates a compact primary-color ripple from the card action pointer origin', () => {
    const activate = jasmine.createSpy('activate');
    const tokens = resolveTheme(MATERIAL_THEME_PROFILES.light);
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'card' } } } },
        { provide: FrameSync, useValue: {} },
        { provide: MaterialRippleController, useValue: { activate, dispose: () => undefined } },
        { provide: ShowcaseStore, useValue: { tokens: () => tokens, state: () => DEFAULT_SHOWCASE_STATE } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new AstylarShowcaseComponent());
    const surface = {
      scene: { getEngine: () => ({ getRenderingCanvas: () => ({ clientWidth: 900 }) }) },
    } as unknown as AstylarSurface;
    (component as unknown as { surface: AstylarSurface }).surface = surface;

    (component as unknown as { activateRipple: (event: AstylarEvent) => void }).activateRipple({
      targetId: 'card-open', localX: 10, localY: 8,
    } as AstylarEvent);

    expect(activate).toHaveBeenCalledOnceWith({
      surface,
      elementId: 'card-open',
      originX: 10,
      originY: 8,
      width: 64,
      height: 40,
      cornerRadius: 20,
      color: '#6750a4',
    });
  });

  it('authors the reported component fixes through the public document contract', () => {
    const { component, store } = createComponent('card');
    const card = build(component, 'card');
    expect(style(card, '.card-copy')?.['left']).toBe('16px');

    const table = build(component, 'table');
    expect(style(table, '.table-rule')).toEqual(jasmine.objectContaining({ left: '28px', right: '28px', width: 'auto' }));

    const chips = build(component, 'chips');
    expect(style(chips, '#chips-primary')?.['gap']).toBe('10px');
    expect(find(chips, 'chip-0-mark')?.['type']).toBe('showcase.material:check-mark');

    const slider = build(component, 'slider');
    expect(find(slider, 'slider-start')).toEqual(jasmine.objectContaining({ min: '0', max: '50', value: '30' }));
    expect(find(slider, 'slider-primary')).toEqual(jasmine.objectContaining({ min: '50', max: '100', value: '65' }));

    store.patchState({ open: true });
    const datepicker = build(component, 'datepicker');
    expect(style(datepicker, '.field-label.empty-field-label')).toEqual(jasmine.objectContaining({ fontSize: '16px' }));
    expect(find(datepicker, 'datepicker-selected-label')?.['textContent']).toBe('25');

    const timepicker = build(component, 'timepicker');
    expect(find(timepicker, 'timepicker-options')?.['children']?.length).toBe(48);
    expect(style(timepicker, '.picker-popup')).toEqual(jasmine.objectContaining({ width: 'auto', overflow: 'scroll' }));

    const bottomSheet = build(component, 'bottom-sheet');
    expect(find(bottomSheet, 'bottom-sheet-copy')?.['value']).toBe('Copy link');
  });

  it('reverses the sort direction on every activation', () => {
    const { component, store } = createComponent('sort');
    const click = (component as unknown as {
      handleClick: (id: string, event: AstylarEvent) => void;
    }).handleClick.bind(component);
    const event = { targetId: 'sort-trigger' } as AstylarEvent;

    click('sort-trigger', event);
    expect(store.state().sortDirection).toBe('desc');
    click('sort-trigger', event);
    expect(store.state().sortDirection).toBe('asc');
  });

  it('keeps the left and right range handles mapped to start and end values', () => {
    const { component, store } = createComponent('slider');
    (component as unknown as { surface: { scene: { clearColor?: unknown }; update: () => Promise<void> } }).surface = {
      scene: {},
      update: () => Promise.resolve(),
    };
    const handlers = (component as unknown as {
      options: { events: { handlers: Record<string, { input: (event: AstylarEvent) => void }> } };
    }).options.events.handlers;

    handlers['slider-start'].input({ type: 'input', targetId: 'slider-start', currentTargetId: 'slider-start', value: 40 } as unknown as AstylarEvent);
    expect(store.state().sliderStart).toBe(40);
    expect(store.state().sliderValue).toBe(65);

    handlers['slider-primary'].input({ type: 'input', targetId: 'slider-primary', currentTargetId: 'slider-primary', value: 75 } as unknown as AstylarEvent);
    expect(store.state().sliderStart).toBe(40);
    expect(store.state().sliderValue).toBe(75);
  });

  it('keeps the snackbar visible when its trigger is activated again', () => {
    const { component, store } = createComponent('snack-bar');
    const click = (component as unknown as {
      handleClick: (id: string, event: AstylarEvent) => void;
    }).handleClick.bind(component);
    const event = { targetId: 'snack-bar-primary' } as AstylarEvent;

    click('snack-bar-primary', event);
    click('snack-bar-primary', event);
    expect(store.state().open).toBeTrue();
    expect(find(build(component, 'snack-bar'), 'snack-bar-dismiss')).toBeDefined();
  });
});

function createComponent(family: string): { component: AstylarShowcaseComponent; store: ShowcaseStore } {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => family } } } },
      { provide: FrameSync, useValue: {} },
      { provide: MaterialRippleController, useValue: { activate: () => undefined, dispose: () => undefined } },
      ShowcaseStore,
    ],
  });
  const store = TestBed.inject(ShowcaseStore);
  const component = TestBed.runInInjectionContext(() => new AstylarShowcaseComponent());
  return { component, store };
}

function build(component: AstylarShowcaseComponent, family: string): SiteData {
  return (component as unknown as { buildSiteData: (value: string) => SiteData }).buildSiteData(family);
}

function style(site: SiteData, selector: string): Record<string, unknown> | undefined {
  return site.styles?.find((candidate) => candidate.selector === selector) as Record<string, unknown> | undefined;
}

function find(site: SiteData, id: string): Record<string, any> | undefined {
  const visit = (nodes: readonly Record<string, any>[] | undefined): Record<string, any> | undefined => {
    for (const node of nodes ?? []) {
      if (node['id'] === id) return node;
      const nested = visit(node['children']);
      if (nested) return nested;
    }
    return undefined;
  };
  return visit(site.root.children as readonly Record<string, any>[]);
}
