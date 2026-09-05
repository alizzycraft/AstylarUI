import { fakeAsync, TestBed, tick } from '@angular/core/testing';
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
    expect(style(chips, '#chips-primary')?.['gap']).toBe('8px');
    expect(find(chips, 'chip-0-mark')?.['type']).toBe('showcase.material:check-mark');
    expect(style(chips, '.chip')).toEqual(jasmine.objectContaining({ cursor: 'pointer', justifyContent: 'center' }));
    expect(style(chips, '.chip:hover')?.['background']).toBeDefined();
    expect(style(chips, '.chip:active')?.['background']).toBeDefined();
    expect(style(chips, '.chip.unselected .chip-label')?.['marginRight']).toBeUndefined();

    store.setTheme(MATERIAL_THEME_PROFILES.contrast);
    const compactChips = build(component, 'chips');
    expect(style(compactChips, '.chip')?.['height']).toBe('24px');
    const compactToggle = build(component, 'button-toggle');
    expect(style(compactToggle, '#button-toggle-primary')?.['height']).toBe('26px');
    expect(style(compactToggle, '.button-toggle-option')?.['height']).toBe('24px');
    expect(style(compactToggle, '.button-toggle-option:hover')?.['background']).toBeDefined();
    expect(style(compactToggle, '.button-toggle-option:active')?.['background']).toBeDefined();
    expect(style(compactToggle, '.button-toggle-option.selected:hover')?.['background']).toBeDefined();
    expect(style(compactToggle, '.button-toggle-option.selected:active')?.['background']).toBeDefined();
    store.setTheme(MATERIAL_THEME_PROFILES.light);

    const slider = build(component, 'slider');
    expect(find(slider, 'slider-start')).toEqual(jasmine.objectContaining({ min: '0', max: '50', step: '1', value: '30' }));
    expect(find(slider, 'slider-primary')).toEqual(jasmine.objectContaining({ min: '50', max: '100', step: '1', value: '65' }));
    expect(style(slider, '.range-layer')).toEqual(jasmine.objectContaining({ cursor: 'pointer' }));

    expect(style(build(component, 'paginator'), '#paginator-range')?.['top']).toBe('20px');
    store.patchState({ pageIndex: 1 });
    expect(style(build(component, 'paginator'), '#paginator-range')?.['top']).toBe('20.5px');
    store.setTheme(MATERIAL_THEME_PROFILES.contrast);
    expect(style(build(component, 'paginator'), '#paginator-range')?.['top']).toBe('12.49px');
    store.patchState({ pageIndex: 0 });
    store.setTheme(MATERIAL_THEME_PROFILES.light);

    store.patchState({ open: true });
    const datepicker = build(component, 'datepicker');
    expect(style(datepicker, '.field-label.empty-field-label')).toEqual(jasmine.objectContaining({ fontSize: '16px' }));
    expect(lastStyle(datepicker, '.datepicker-popup')).toEqual(jasmine.objectContaining({
      left: '0', width: '296px', height: '354px',
    }));
    expect(find(datepicker, 'datepicker-previous')).toEqual(jasmine.objectContaining({ type: 'button' }));
    expect(find(datepicker, 'datepicker-next')).toEqual(jasmine.objectContaining({ type: 'button' }));
    expect(style(datepicker, '.datepicker-nav')).toEqual(jasmine.objectContaining({ cursor: 'pointer' }));
    expect(style(datepicker, '.datepicker-day')).toEqual(jasmine.objectContaining({ cursor: 'pointer' }));
    expect(style(datepicker, '.datepicker-nav:hover')?.['background']).toBeDefined();
    expect(style(datepicker, '.datepicker-day:hover')?.['background']).toBeDefined();
    expect(style(datepicker, '.datepicker-month-marker')).toEqual(jasmine.objectContaining({ gridColumn: '1 / -1' }));
    const selectedDay = find(datepicker, `datepicker-day-${new Date().getDate()}`);
    expect(selectedDay).toEqual(jasmine.objectContaining({
      type: 'button',
      value: String(new Date().getDate()),
    }));
    expect(find(datepicker, 'datepicker-selected')).toBeDefined();
    const firstWeekday = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay();
    const leadingDays = firstWeekday;
    const selectedColumn = (leadingDays + new Date().getDate() - 1) % 7;
    const selectedRow = 2 + Math.floor((leadingDays + new Date().getDate() - 1) / 7);
    expect(style(datepicker, '.datepicker-selected')).toEqual(jasmine.objectContaining({
      left: `${10 + selectedColumn * 40}px`,
      top: `${66 + selectedRow * 40}px`,
    }));

    const timepicker = build(component, 'timepicker');
    expect(find(timepicker, 'timepicker-options')?.['children']?.length).toBe(48);
    expect(style(timepicker, '.picker-popup')).toEqual(jasmine.objectContaining({ width: 'auto', overflow: 'scroll' }));
    expect(lastStyle(timepicker, '.timepicker-shell .picker-popup')).toEqual(jasmine.objectContaining({
      top: '56px', left: '0', right: '0', height: '256px', paddingTop: '8px',
    }));
    expect(style(timepicker, '.timepicker-shell .picker-option')?.['height']).toBe('48px');

    store.setTheme(MATERIAL_THEME_PROFILES.custom);
    const compactAutocomplete = build(component, 'autocomplete');
    expect(style(compactAutocomplete, '#autocomplete-label')?.['display']).toBe('none');
    const compactTimepicker = build(component, 'timepicker');
    expect(style(compactTimepicker, '.timepicker-shell .field-label')?.['display']).toBe('none');

    const compactSelect = build(component, 'select');
    expect(find(compactSelect, 'select-control')).toEqual(jasmine.objectContaining({
      type: 'input',
      role: 'combobox',
      value: 'Team',
    }));
    expect(find(compactSelect, 'select-value')?.['textContent']).toBe('Team');
    expect(style(compactSelect, '.select-control, .select-control:focus')?.['color']).toBe('transparent');
    expect(style(compactSelect, '.select-control, .select-control:focus')?.['caretColor']).toBe('transparent');
    expect(lastStyle(compactSelect, '.select-popup')).toEqual(jasmine.objectContaining({
      left: '7px', right: '7px', width: 'auto',
    }));

    const customTabs = build(component, 'tabs');
    expect(lastStyle(customTabs, '.tab-panel')?.['height']).toBe('22px');
    expect(find(customTabs, 'tab-panel')?.['data']?.['baseline-offset']).toBe(-.2);

    (component as unknown as { handleClick: (id: string, event: AstylarEvent) => void }).handleClick(
      'datepicker-month', { targetId: 'datepicker-month' } as AstylarEvent,
    );
    const compactYearPicker = build(component, 'datepicker');
    expect(find(compactYearPicker, 'datepicker-month')?.['class']).toContain('year-view');
    expect(lastStyle(compactYearPicker, '.datepicker-popup')).toEqual(jasmine.objectContaining({
      top: '48px', height: '350.5px',
    }));

    store.setTheme(MATERIAL_THEME_PROFILES.dark);
    store.patchState({ disabled: true, open: false });
    expect(style(build(component, 'autocomplete'), '.field-surface')?.['background']).toBe('#2f2d33');
    store.patchState({ disabled: false, open: true });
    const darkDialog = build(component, 'dialog');
    expect(style(darkDialog, '.dialog-panel')).toEqual(jasmine.objectContaining({
      width: '280px', height: '161px', padding: '0', background: '#fef8fc', color: '#1d1b20',
    }));
    expect(style(darkDialog, '.dialog-copy')).toEqual(jasmine.objectContaining({
      color: '#49454f', fontSize: '14px', lineHeight: '20px', verticalAlign: 'middle',
    }));
    expect(style(darkDialog, '.dialog-action')).toEqual(jasmine.objectContaining({
      color: '#7d00fa', fontSize: '14px',
    }));
    store.patchState({ disabled: false, open: false });
    store.setTheme(MATERIAL_THEME_PROFILES.light);

    const slideToggle = build(component, 'slide-toggle');
    expect(style(slideToggle, '#slide-toggle-primary')?.['cursor']).toBe('pointer');
    expect(style(slideToggle, '.switch-minus')).toEqual(jasmine.objectContaining({
      width: '12px', height: '2px', background: jasmine.any(String),
    }));
    expect(find(slideToggle, 'slide-toggle-minus')?.['textContent']).toBeUndefined();
    expect(find(slideToggle, 'slide-toggle-primary')).toEqual(jasmine.objectContaining({
      role: 'switch',
      ariaLabel: 'Automatic updates',
      ariaChecked: true,
    }));
    expect(find(slideToggle, 'slide-toggle-state-layer')?.['class']).toBe('switch-state-layer');
    expect(find(slideToggle, 'slide-toggle-track')).toBeDefined();
    expect(find(slideToggle, 'slide-toggle-label')?.['textContent']).toBe('Automatic updates');

    const tabs = build(component, 'tabs');
    expect(style(tabs, '.tab:focus')?.['background']).toBeDefined();

    const stepper = build(component, 'stepper');
    expect(style(stepper, '.step-tab')).toEqual(jasmine.objectContaining({
      width: '130px',
      top: '0',
      zIndex: '2',
      cursor: 'pointer',
    }));
    expect(style(stepper, '#step-details')?.['left']).toBe('-24px');
    expect(style(stepper, '#step-review')?.['right']).toBe('-24px');
    expect(style(stepper, '.step-tab-content')).toEqual(jasmine.objectContaining({ left: '24px', display: 'flex' }));
    expect(style(stepper, '.step-connector')).toEqual(jasmine.objectContaining({
      zIndex: '3', pointerEvents: 'none',
    }));
    expect(style(stepper, '.step-tab:hover')?.['background']).toBeDefined();
    expect(style(stepper, '.step-tab:focus')?.['background']).toBeDefined();

    store.patchState({ disabled: true });
    const expansion = build(component, 'expansion');
    expect(style(expansion, '.expansion-trigger')?.['cursor']).toBe('pointer');
    expect(find(expansion, 'expansion-primary')?.['class']).toContain('disabled');
    expect(find(expansion, 'expansion-chevron')?.['class']).toContain('disabled');
    expect(style(expansion, '.expansion-title')?.['fontWeight']).toBe('500');
    store.setTheme(MATERIAL_THEME_PROFILES.contrast);
    expect(lastStyle(build(component, 'expansion'), '.expansion-title')).toEqual(jasmine.objectContaining({
      padding: '0', fontSize: '16px',
    }));
    store.patchState({ open: true });
    expect(lastStyle(build(component, 'expansion'), '.expansion-title')?.['padding']).toBe('2px 0 0');
    expect(style(expansion, '.expansion-chevron.disabled')?.['display']).toBe('none');
    store.patchState({ disabled: false });

    const bottomSheet = build(component, 'bottom-sheet');
    expect(find(bottomSheet, 'bottom-sheet-copy')?.['value']).toBe('Copy link');
    expect(find(bottomSheet, 'bottom-sheet-overlay')).toEqual(jasmine.objectContaining({
      type: 'div',
      role: 'dialog',
    }));
    expect(find(bottomSheet, 'bottom-sheet-overlay')?.['modal']).toBeUndefined();
    expect(style(bottomSheet, '.bottom-sheet-overlay')).toEqual(jasmine.objectContaining({
      flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center',
    }));
    expect(style(bottomSheet, '.bottom-sheet-panel')).toEqual(jasmine.objectContaining({
      width: '512px', height: '128px', padding: '16px',
    }));
    expect(lastStyle(bottomSheet, '.bottom-sheet-panel')).toEqual(jasmine.objectContaining({
      mediaMaxWidth: '960px', width: '100%', borderRadius: '0',
    }));
    expect(style(bottomSheet, '.bottom-sheet-option')).toEqual(jasmine.objectContaining({
      width: '100%', height: '48px', padding: '0 16px', fontSize: '16px',
    }));
  });

  it('activates sort ascending before alternating its direction', () => {
    const { component, store } = createComponent('sort');
    const click = (component as unknown as {
      handleClick: (id: string, event: AstylarEvent) => void;
    }).handleClick.bind(component);
    const handlers = eventHandlers(component);
    const event = { targetId: 'sort-trigger' } as AstylarEvent;

    expect(find(build(component, 'sort'), 'sort-arrow')).toBeUndefined();
    handlers['sort-primary']['focus']({ targetId: 'sort-primary' } as AstylarEvent);
    expect(find(build(component, 'sort'), 'sort-arrow')?.['textContent']).toBe('↑');
    expect(store.state().open).toBeFalse();
    handlers['sort-primary']['blur']({ targetId: 'sort-primary' } as AstylarEvent);
    expect(find(build(component, 'sort'), 'sort-arrow')).toBeUndefined();
    click('sort-trigger', event);
    expect(store.state().open).toBeTrue();
    click('sort-trigger', event);
    expect(store.state().sortDirection).toBe('desc');
    click('sort-trigger', event);
    expect(store.state().sortDirection).toBe('asc');
  });

  it('restores empty field labels and floats them only while focused', () => {
    const { component, store } = createComponent('form-field');
    const handlers = eventHandlers(component);
    store.setTheme(MATERIAL_THEME_PROFILES.contrast);

    let site = build(component, 'form-field');
    expect(find(site, 'form-field-label')?.['class']).toContain('compact-filled-label');
    expect(find(site, 'form-field-input-region')?.['class']).toContain('compact-filled-input-region');

    handlers['form-field-control']['input']({ targetId: 'form-field-control', value: '' } as AstylarEvent);

    site = build(component, 'form-field');
    expect(find(site, 'form-field-control')?.['value']).toBe('');
    expect(find(site, 'form-field-label')?.['class']).toContain('empty-field-label');
    expect(find(site, 'form-field-label')?.['class']).not.toContain('compact-filled-label');
    expect(style(site, '.field-label.empty-field-label')?.['fontSize']).toBe('16px');

    handlers['form-field-control']['focus']({ targetId: 'form-field-control' } as AstylarEvent);
    site = build(component, 'form-field');
    expect(style(site, '.field-label.empty-field-label')?.['fontSize']).toBe('12px');

    handlers['form-field-control']['blur']({ targetId: 'form-field-control' } as AstylarEvent);
    expect(style(build(component, 'form-field'), '.field-label.empty-field-label')?.['fontSize']).toBe('16px');
  });

  it('commits autocomplete and select options and dismisses popup families outside', () => {
    const { component, store } = createComponent('autocomplete');
    const click = (component as unknown as {
      handleClick: (id: string, event: AstylarEvent) => void;
    }).handleClick.bind(component);

    store.patchState({ open: true });
    click('autocomplete-option-cape-town', { targetId: 'autocomplete-option-cape-town-label' } as AstylarEvent);
    expect(find(build(component, 'autocomplete'), 'autocomplete-control')?.['value']).toBe('Cape Town');
    expect(store.state().open).toBeFalse();

    store.patchState({ open: true });
    expect(find(build(component, 'autocomplete'), 'autocomplete-option-cape-town-check')).toBeDefined();
    click('page', { targetId: 'page' } as AstylarEvent);
    expect(store.state().open).toBeFalse();

    store.patchState({ open: true });
    click('select-option-solo', { targetId: 'select-option-solo' } as AstylarEvent);
    expect(store.state()).toEqual(jasmine.objectContaining({ selected: false, open: false }));
  });

  it('dismisses menus, pickers, and dialogs from an outside target', () => {
    for (const family of ['menu', 'datepicker', 'timepicker', 'dialog']) {
      const { component, store } = createComponent(family);
      store.patchState({ open: true });
      (component as unknown as { handleClick: (id: string, event: AstylarEvent) => void }).handleClick(
        'page', { targetId: 'page' } as AstylarEvent,
      );
      expect(store.state().open).withContext(family).toBeFalse();
    }
  });

  it('opens the datepicker year view from the month and year control', () => {
    const { component, store } = createComponent('datepicker');
    const click = (component as unknown as {
      handleClick: (id: string, event: AstylarEvent) => void;
    }).handleClick.bind(component);

    click('datepicker-icon', { targetId: 'datepicker-icon' } as AstylarEvent);
    expect(store.state().open).toBeTrue();
    expect(find(build(component, 'datepicker'), 'datepicker-grid')).toBeDefined();

    click('datepicker-month', { targetId: 'datepicker-month' } as AstylarEvent);
    const yearView = build(component, 'datepicker');
    expect(find(yearView, 'datepicker-grid')).toBeUndefined();
    expect(find(yearView, 'datepicker-year-grid')?.['children']?.length).toBe(24);
    const currentYear = new Date().getFullYear();
    expect(find(yearView, `datepicker-year-${currentYear}`)).toEqual(jasmine.objectContaining({ value: String(currentYear) }));

    click(`datepicker-year-${currentYear}`, { targetId: `datepicker-year-${currentYear}` } as AstylarEvent);
    expect(find(build(component, 'datepicker'), 'datepicker-grid')).toBeDefined();
  });

  it('opens time options from input focus without opening the datepicker from input focus', () => {
    const timepicker = createComponent('timepicker');
    eventHandlers(timepicker.component)['timepicker-control']['focus']({
      targetId: 'timepicker-control',
    } as AstylarEvent);
    expect(timepicker.store.state().open).toBeTrue();
    expect(find(build(timepicker.component, 'timepicker'), 'timepicker-options')).toBeDefined();

    const datepicker = createComponent('datepicker');
    eventHandlers(datepicker.component)['datepicker-control']['focus']({
      targetId: 'datepicker-control',
    } as AstylarEvent);
    expect(datepicker.store.state().open).toBeFalse();
    expect(find(build(datepicker.component, 'datepicker'), 'datepicker-popup')).toBeUndefined();
  });

  it('toggles chips independently from any child hit target', () => {
    const { component, store } = createComponent('chips');
    const click = (component as unknown as {
      handleClick: (id: string, event: AstylarEvent) => void;
    }).handleClick.bind(component);

    click('chip-0', { targetId: 'chip-0-label' } as AstylarEvent);
    expect(store.state().chipSelections).toEqual([false, true]);
    expect(find(build(component, 'chips'), 'chip-0-mark')).toBeUndefined();
    expect(find(build(component, 'chips'), 'chip-1-mark')).toBeDefined();

    click('chip-1', { targetId: 'chip-1' } as AstylarEvent);
    expect(store.state().chipSelections).toEqual([false, false]);
  });

  it('keeps the left and right range handles mapped to start and end values', () => {
    const { component, store } = createComponent('slider');
    const updateRange = jasmine.createSpy('updateRange');
    (component as unknown as { surface: { scene: { clearColor?: unknown; meshes: unknown[] }; update: () => Promise<void> } }).surface = {
      scene: { meshes: [{ metadata: { showcaseMaterialVisual: 'range', updateRange } }] },
      update: () => Promise.resolve(),
    };
    const handlers = (component as unknown as {
      options: { events: { handlers: Record<string, {
        input: (event: AstylarEvent) => void;
        change: (event: AstylarEvent) => void;
      }> } };
    }).options.events.handlers;
    const slider = build(component, 'slider');
    expect(style(slider, '#slider-start')).toEqual(jasmine.objectContaining({ left: '0', width: '350px' }));
    expect(style(slider, '#slider-primary')).toEqual(jasmine.objectContaining({ left: '350px', width: '399px' }));

    handlers['slider-start'].input({ type: 'input', targetId: 'slider-start', currentTargetId: 'slider-start', value: 40 } as unknown as AstylarEvent);
    expect(updateRange).toHaveBeenCalledWith(.4, .65);
    expect(store.state().sliderStart).toBe(30);
    handlers['slider-start'].change({ type: 'change', targetId: 'slider-start', currentTargetId: 'slider-start', value: 40 } as unknown as AstylarEvent);
    expect(store.state().sliderStart).toBe(40);
    expect(store.state().sliderValue).toBe(65);

    handlers['slider-primary'].input({ type: 'input', targetId: 'slider-primary', currentTargetId: 'slider-primary', value: 75 } as unknown as AstylarEvent);
    expect(updateRange).toHaveBeenCalledWith(.4, .75);
    expect(store.state().sliderValue).toBe(65);
    handlers['slider-primary'].change({ type: 'change', targetId: 'slider-primary', currentTargetId: 'slider-primary', value: 75 } as unknown as AstylarEvent);
    expect(store.state().sliderStart).toBe(40);
    expect(store.state().sliderValue).toBe(75);
  });

  it('does not rebuild authored slider data merely because a range thumb receives focus', () => {
    const { component } = createComponent('slider');
    const internal = component as unknown as {
      siteData: () => SiteData;
      options: { events: { handlers: Record<string, { focus: (event: AstylarEvent) => void }> } };
    };
    const beforeFocus = internal.siteData();

    internal.options.events.handlers['slider-primary'].focus({
      type: 'focus', targetId: 'slider-primary', currentTargetId: 'slider-primary', value: 65,
    } as unknown as AstylarEvent);

    expect(internal.siteData()).toBe(beforeFocus);
  });

  it('updates slider interaction paint in place without interrupting pointer capture', () => {
    const { component } = createComponent('slider');
    const updateStateLayer = jasmine.createSpy('updateStateLayer');
    (component as unknown as { surface: { scene: { clearColor?: unknown; meshes: unknown[] }; update: () => Promise<void> } }).surface = {
      scene: { meshes: [{ metadata: { showcaseMaterialVisual: 'range', updateStateLayer } }] },
      update: () => Promise.resolve(),
    };
    const internal = component as unknown as {
      siteData: () => SiteData;
      options: { events: { handlers: Record<string, {
        pointerenter: (event: AstylarEvent) => void;
        pointerdown: (event: AstylarEvent) => void;
        pointerup: (event: AstylarEvent) => void;
      }> } };
    };
    const beforeInteraction = internal.siteData();
    const event = { targetId: 'slider-start', currentTargetId: 'slider-start' } as AstylarEvent;

    internal.options.events.handlers['slider-start'].pointerenter(event);
    internal.options.events.handlers['slider-start'].pointerdown(event);
    internal.options.events.handlers['slider-start'].pointerup(event);

    expect(internal.siteData()).toBe(beforeInteraction);
    expect(updateStateLayer.calls.allArgs()).toEqual([
      ['start', .08],
      ['start', .12],
      ['start', .08],
    ]);
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
    expect(find(build(component, 'snack-bar'), 'snack-bar-surface')).toEqual(jasmine.objectContaining({
      role: 'status',
      ariaLive: 'polite',
    }));
    expect(find(build(component, 'snack-bar'), 'snack-bar-dismiss')).toBeDefined();
    expect(style(build(component, 'snack-bar'), '.snack-overlay')).toEqual(jasmine.objectContaining({
      padding: '0 0 8px',
    }));
    expect(style(build(component, 'snack-bar'), '.snack-surface')).toEqual(jasmine.objectContaining({
      width: '344px', height: '48px',
    }));
  });

  it('dismisses the snackbar after five seconds and restarts that lifetime on repeat activation', fakeAsync(() => {
    const { component, store } = createComponent('snack-bar');
    const click = (component as unknown as {
      handleClick: (id: string, event: AstylarEvent) => void;
    }).handleClick.bind(component);
    const event = { targetId: 'snack-bar-primary' } as AstylarEvent;

    click('snack-bar-primary', event);
    tick(4_000);
    click('snack-bar-primary', event);
    tick(1_001);
    expect(store.state().open).toBeTrue();

    tick(3_999);
    expect(store.state().open).toBeFalse();
  }));

  it('anchors the tooltip below and centered on its trigger without a transform offset', () => {
    const { component, store } = createComponent('tooltip');
    store.patchState({ open: true });
    const site = build(component, 'tooltip');

    expect(style(site, '.tooltip-anchor')).toEqual(jasmine.objectContaining({
      alignItems: 'center', gap: '8px',
    }));
    expect(style(site, '#tooltip-popup')).toEqual(jasmine.objectContaining({
      width: '107px', height: '24px', justifyContent: 'center',
    }));
    expect(style(site, '#tooltip-popup')?.['transform']).toBeUndefined();
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

function eventHandlers(component: AstylarShowcaseComponent): Record<string, Record<string, (event: AstylarEvent) => void>> {
  return (component as unknown as {
    options: { events: { handlers: Record<string, Record<string, (event: AstylarEvent) => void>> } };
  }).options.events.handlers;
}

function style(site: SiteData, selector: string): Record<string, unknown> | undefined {
  return site.styles?.find((candidate) => candidate.selector === selector) as Record<string, unknown> | undefined;
}

function lastStyle(site: SiteData, selector: string): Record<string, unknown> | undefined {
  return site.styles?.filter((candidate) => candidate.selector === selector).at(-1) as Record<string, unknown> | undefined;
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
