import { MeshBuilder, NullEngine, PointerEventTypes, Scene } from '@babylonjs/core';
import type { PointerInfo } from '@babylonjs/core';
import type { SiteData } from '../app/types/site-data';
import { AstylarEventDispatcher, AstylarEventSnapshot } from './astylar-event';
import { AstylarInteractionRuntime } from './astylar-interaction-runtime';

const createSiteData = (disabled = false): SiteData => ({
  styles: [],
  root: {
    children: [{
      type: 'section',
      id: 'parent',
      children: [{
        type: 'input',
        inputType: 'button',
        id: 'button',
        value: 'Activate',
        disabled,
      }],
    }],
  },
});

describe('AstylarEventDispatcher', () => {
  it('dispatches target then ancestor handlers with DOM-like identity', () => {
    const calls: string[] = [];
    const dispatcher = new AstylarEventDispatcher(createSiteData(), {
      handlers: {
        button: { click: (event) => calls.push(`${event.targetId}:${event.currentTargetId}`) },
        parent: { click: (event) => calls.push(`${event.targetId}:${event.currentTargetId}`) },
      },
    });

    dispatcher.dispatch({ type: 'click', targetId: 'button', value: 'Activate' });

    expect(calls).toEqual(['button:button', 'button:parent']);
  });

  it('supports propagation and default cancellation without executable SiteData', () => {
    let observed: AstylarEventSnapshot | undefined;
    const calls: string[] = [];
    const dispatcher = new AstylarEventDispatcher(createSiteData(), {
      handlers: {
        button: {
          click: (event) => {
            calls.push('button');
            event.preventDefault();
            event.stopPropagation();
          },
        },
        parent: { click: () => calls.push('parent') },
      },
      onEvent: (event) => { observed = event; },
    });

    dispatcher.dispatch({ type: 'click', targetId: 'button' });

    expect(calls).toEqual(['button']);
    expect(observed?.defaultPrevented).toBeTrue();
    expect(observed?.propagationStopped).toBeTrue();
  });

  it('does not dispatch to disabled or removed targets', () => {
    const events: AstylarEventSnapshot[] = [];
    const dispatcher = new AstylarEventDispatcher(createSiteData(true), {
      onEvent: (event) => events.push(event),
    });
    expect(dispatcher.dispatch({ type: 'click', targetId: 'button' })).toBeUndefined();

    dispatcher.setSiteData({ styles: [], root: { children: [] } });
    expect(dispatcher.dispatch({ type: 'click', targetId: 'button' })).toBeUndefined();
    expect(events).toEqual([]);
  });
});

describe('AstylarInteractionRuntime', () => {
  it('commits and blurs focus before a control is removed or incompatibly replaced', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const events: AstylarEventSnapshot[] = [];
    const focusStates: Array<[string, boolean]> = [];
    let focusedElementId: string | undefined = 'field';
    const textSiteData: SiteData = {
      styles: [],
      root: { children: [{ type: 'input', inputType: 'text', id: 'field', value: 'Seed' }] },
    };
    const runtime = new AstylarInteractionRuntime(
      scene,
      textSiteData,
      { onEvent: (event) => events.push(event) },
      () => ({ value: 'Edited' }),
      {
        getFocusedElementId: () => focusedElementId,
        focus: () => true,
        blur: (elementId) => {
          if (focusedElementId === elementId) focusedElementId = undefined;
          return true;
        },
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => true,
        setFocusState: (elementId, focused) => focusStates.push([elementId, focused]),
      },
    );

    runtime.setSiteData({
      styles: [],
      root: { children: [{ type: 'input', inputType: 'text', id: 'field', value: 'Server' }] },
    });
    expect(events).toEqual([]);
    expect(focusedElementId).toBe('field');

    runtime.setSiteData({
      styles: [],
      root: { children: [{ type: 'input', inputType: 'checkbox', id: 'field' }] },
    });
    expect(events.map((event) => `${event.type}:${event.targetId}`)).toEqual([
      'change:field', 'blur:field',
    ]);
    expect(focusedElementId).toBeUndefined();
    expect(focusStates).toEqual([['field', false]]);

    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('owns one scene pointer observer and emits one activation sequence', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const mesh = MeshBuilder.CreatePlane('button-mesh', {}, scene);
    mesh.metadata = { elementId: 'button' };
    const events: AstylarEventSnapshot[] = [];
    const activeStates: Array<[string, boolean]> = [];
    const runtime = new AstylarInteractionRuntime(scene, createSiteData(), {
      onEvent: (event) => events.push(event),
    }, undefined, {
      getFocusedElementId: () => undefined,
      focus: () => false,
      blur: () => false,
      handleKeyDown: () => undefined,
      commitsValueOnBlur: () => false,
      setActiveState: (elementId, active) => activeStates.push([elementId, active]),
    });
    const pointerEvent = new PointerEvent('pointerdown', {
      button: 0,
      pointerType: 'mouse',
    });

    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERDOWN,
      event: pointerEvent,
      pickInfo: { pickedMesh: mesh },
    } as unknown as PointerInfo);
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERUP,
      event: pointerEvent,
      pickInfo: { pickedMesh: mesh },
    } as unknown as PointerInfo);

    expect(events.map((event) => event.type)).toEqual(['pointerdown', 'pointerup', 'click']);
    expect(events.every((event) => event.targetId === 'button')).toBeTrue();
    expect(activeStates).toEqual([['button', true], ['button', false]]);
    expect(runtime.snapshot.pointerObservers).toBe(1);

    runtime.dispose();
    expect(runtime.snapshot.pointerObservers).toBe(0);
    expect(runtime.snapshot.disposed).toBeTrue();
    scene.dispose();
    engine.dispose();
  });

  it('owns keyboard navigation and emits browser-order focus events', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const first = MeshBuilder.CreatePlane('first-mesh', {}, scene);
    first.metadata = { elementId: 'first' };
    const canvas = document.createElement('canvas');
    const events: AstylarEventSnapshot[] = [];
    const focusStates: Array<[string, boolean]> = [];
    let focusedElementId: string | undefined;
    const handledKeys: string[] = [];
    const preservedSelectionOnBlur: boolean[] = [];
    const siteData: SiteData = {
      styles: [],
      root: {
        children: [
          { type: 'button', id: 'first', textContent: 'First' },
          { type: 'button', id: 'disabled', textContent: 'Disabled', disabled: true },
          { type: 'button', id: 'second', textContent: 'Second' },
        ],
      },
    };
    const runtime = new AstylarInteractionRuntime(
      scene,
      siteData,
      { onEvent: (event) => events.push(event) },
      undefined,
      {
        getFocusedElementId: () => focusedElementId,
        focus: (elementId) => {
          focusedElementId = elementId;
          return true;
        },
        blur: (elementId, preserveSelectionOnReset) => {
          preservedSelectionOnBlur.push(preserveSelectionOnReset === true);
          if (focusedElementId === elementId) focusedElementId = undefined;
          return true;
        },
        handleKeyDown: (_elementId, event) => handledKeys.push(event.key),
        commitsValueOnBlur: () => false,
        setFocusState: (elementId, focused) => focusStates.push([elementId, focused]),
      },
      canvas,
    );
    const pointerEvent = new PointerEvent('pointerdown', { button: 0 });

    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERDOWN,
      event: pointerEvent,
      pickInfo: { pickedMesh: first },
    } as unknown as PointerInfo);
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERUP,
      event: pointerEvent,
      pickInfo: { pickedMesh: first },
    } as unknown as PointerInfo);
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab' }));
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }));

    expect(events.map((event) => `${event.type}:${event.targetId}`)).toEqual([
      'pointerdown:first',
      'focus:first',
      'pointerup:first',
      'click:first',
      'keydown:first',
      'blur:first',
      'focus:second',
      'keydown:second',
    ]);
    expect(focusedElementId).toBe('second');
    expect(focusStates).toEqual([
      ['first', true],
      ['first', false],
      ['second', true],
    ]);
    expect(handledKeys).toEqual(['a']);
    expect(runtime.snapshot.keyboardListeners).toBe(2);

    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERDOWN,
      event: pointerEvent,
      pickInfo: undefined,
    } as unknown as PointerInfo);
    expect(events.at(-1)?.type).toBe('blur');
    expect(events.at(-1)?.targetId).toBe('second');
    expect(focusedElementId).toBeUndefined();
    expect(focusStates.at(-1)).toEqual(['second', false]);
    expect(preservedSelectionOnBlur).toEqual([true, false]);

    runtime.dispose();
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab' }));
    expect(runtime.snapshot.keyboardListeners).toBe(0);
    expect(events.length).toBe(9);
    scene.dispose();
    engine.dispose();
  });

  it('emits input after text mutation and commits change before blur', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const mesh = MeshBuilder.CreatePlane('field-mesh', {}, scene);
    mesh.metadata = { elementId: 'field' };
    const canvas = document.createElement('canvas');
    const events: AstylarEventSnapshot[] = [];
    let focusedElementId: string | undefined;
    let value = 'Seed';
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: { children: [{ type: 'input', inputType: 'text', id: 'field', value }] },
      },
      {
        handlers: {
          field: {
            keydown: (event) => {
              if (event.key === 'y') event.preventDefault();
            },
          },
        },
        onEvent: (event) => events.push(event),
      },
      () => ({ value }),
      {
        getFocusedElementId: () => focusedElementId,
        focus: (elementId) => {
          focusedElementId = elementId;
          return true;
        },
        blur: () => {
          focusedElementId = undefined;
          return true;
        },
        handleKeyDown: (_elementId, event) => {
          if (event.key.length === 1) value += event.key;
        },
        commitsValueOnBlur: () => true,
      },
      canvas,
    );
    const pointerEvent = new PointerEvent('pointerdown', { button: 0 });

    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERDOWN,
      event: pointerEvent,
      pickInfo: { pickedMesh: mesh },
    } as unknown as PointerInfo);
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', code: 'KeyX' }));
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', code: 'KeyY' }));
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERDOWN,
      event: pointerEvent,
      pickInfo: undefined,
    } as unknown as PointerInfo);

    expect(events.map((event) => `${event.type}:${event.value}`)).toEqual([
      'pointerdown:Seed',
      'focus:Seed',
      'keydown:Seed',
      'input:Seedx',
      'keydown:Seedx',
      'change:Seedx',
      'blur:Seedx',
    ]);
    expect(events[4].defaultPrevented).toBeTrue();
    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('orders checkbox activation events and rolls back a cancelled click', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const mesh = MeshBuilder.CreatePlane('checkbox-mesh', {}, scene);
    mesh.metadata = { elementId: 'alerts' };
    const canvas = document.createElement('canvas');
    const events: AstylarEventSnapshot[] = [];
    let checked = false;
    let cancelClick = false;
    let cancelKeydown = false;
    let focusedElementId: string | undefined;
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: { children: [{ type: 'input', inputType: 'checkbox', id: 'alerts' }] },
      },
      {
        handlers: {
          alerts: {
            click: (event) => { if (cancelClick) event.preventDefault(); },
            keydown: (event) => { if (cancelKeydown) event.preventDefault(); },
          },
        },
        onEvent: (event) => events.push(event),
      },
      () => ({ value: 'on', checked }),
      {
        getFocusedElementId: () => focusedElementId,
        focus: (elementId) => {
          focusedElementId = elementId;
          return true;
        },
        blur: () => {
          focusedElementId = undefined;
          return true;
        },
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
        activate: () => {
          const before = checked;
          checked = !checked;
          return { changed: true, rollback: () => { checked = before; } };
        },
        canActivateWithSpace: () => true,
      },
      canvas,
    );
    const pointerEvent = new PointerEvent('pointerdown', { button: 0 });

    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERDOWN,
      event: pointerEvent,
      pickInfo: { pickedMesh: mesh },
    } as unknown as PointerInfo);
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERUP,
      event: pointerEvent,
      pickInfo: { pickedMesh: mesh },
    } as unknown as PointerInfo);

    expect(events.map((event) => `${event.type}:${event.checked}`)).toEqual([
      'pointerdown:false',
      'focus:false',
      'pointerup:false',
      'click:true',
      'input:true',
      'change:true',
    ]);
    expect(checked).toBeTrue();

    cancelClick = true;
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERDOWN,
      event: pointerEvent,
      pickInfo: { pickedMesh: mesh },
    } as unknown as PointerInfo);
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERUP,
      event: pointerEvent,
      pickInfo: { pickedMesh: mesh },
    } as unknown as PointerInfo);

    expect(events.slice(-3).map((event) => `${event.type}:${event.checked}`)).toEqual([
      'pointerdown:true',
      'pointerup:true',
      'click:false',
    ]);
    expect(events.at(-1)?.defaultPrevented).toBeTrue();
    expect(checked).toBeTrue();

    cancelClick = false;
    canvas.dispatchEvent(new KeyboardEvent('keydown', {
      key: ' ', code: 'Space', bubbles: true, cancelable: true,
    }));
    canvas.dispatchEvent(new KeyboardEvent('keyup', {
      key: ' ', code: 'Space', bubbles: true, cancelable: true,
    }));

    expect(events.slice(-5).map((event) => `${event.type}:${event.checked}`)).toEqual([
      'keydown:true',
      'keyup:true',
      'click:false',
      'input:false',
      'change:false',
    ]);
    expect(checked).toBeFalse();

    cancelKeydown = true;
    canvas.dispatchEvent(new KeyboardEvent('keydown', {
      key: ' ', code: 'Space', bubbles: true, cancelable: true,
    }));
    canvas.dispatchEvent(new KeyboardEvent('keyup', {
      key: ' ', code: 'Space', bubbles: true, cancelable: true,
    }));

    expect(events.slice(-2).map((event) => event.type)).toEqual(['keydown', 'keyup']);
    expect(events.at(-2)?.defaultPrevented).toBeTrue();
    expect(checked).toBeFalse();
    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('moves and activates a named radio group with arrow keys', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const canvas = document.createElement('canvas');
    const events: AstylarEventSnapshot[] = [];
    let focusedElementId: string | undefined = 'alpha';
    let checkedId = 'alpha';
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: {
          children: [
            { type: 'input', inputType: 'radio', id: 'alpha', name: 'channel' },
            { type: 'input', inputType: 'radio', id: 'beta', name: 'channel' },
          ],
        },
      },
      { onEvent: (event) => events.push(event) },
      (elementId) => ({ value: elementId, checked: checkedId === elementId }),
      {
        getFocusedElementId: () => focusedElementId,
        focus: (elementId) => {
          focusedElementId = elementId;
          return true;
        },
        blur: () => {
          focusedElementId = undefined;
          return true;
        },
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
        getRadioNavigationTarget: (elementId, direction) => {
          if (elementId === 'alpha' && direction === 1) return 'beta';
          if (elementId === 'beta' && direction === -1) return 'alpha';
          return undefined;
        },
        activate: (elementId) => {
          const before = checkedId;
          checkedId = elementId;
          return {
            changed: before !== checkedId,
            rollback: () => { checkedId = before; },
          };
        },
      },
      canvas,
    );

    const keydown = new KeyboardEvent('keydown', {
      key: 'ArrowRight', code: 'ArrowRight', bubbles: true, cancelable: true,
    });
    canvas.dispatchEvent(keydown);
    canvas.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'ArrowRight', code: 'ArrowRight', bubbles: true, cancelable: true,
    }));

    expect(keydown.defaultPrevented).toBeTrue();
    expect(focusedElementId).toBe('beta');
    expect(checkedId).toBe('beta');
    expect(events.map((event) => `${event.type}:${event.targetId}:${event.checked}`)).toEqual([
      'keydown:alpha:true',
      'blur:alpha:true',
      'focus:beta:false',
      'click:beta:true',
      'input:beta:true',
      'change:beta:true',
      'keyup:beta:true',
    ]);

    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('emits input and change for an immediate select keyboard mutation', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const canvas = document.createElement('canvas');
    const events: AstylarEventSnapshot[] = [];
    let selectedValue = 'alpha';
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: {
          children: [{
            type: 'select', id: 'choice', value: 'alpha',
            options: [{ value: 'alpha', label: 'Alpha' }, { value: 'beta', label: 'Beta' }],
          }],
        },
      },
      { onEvent: (event) => events.push(event) },
      () => ({ value: selectedValue, selectedValue }),
      {
        getFocusedElementId: () => 'choice',
        focus: () => true,
        blur: () => true,
        handleKeyDown: (_elementId, event) => {
          if (event.key === 'ArrowDown') selectedValue = 'beta';
        },
        commitsValueOnBlur: () => false,
        emitsImmediateChangeOnKeyboardMutation: () => true,
      },
      canvas,
    );

    canvas.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true,
    }));
    canvas.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true,
    }));

    expect(events.map((event) => `${event.type}:${event.selectedValue}`)).toEqual([
      'keydown:alpha',
      'input:beta',
      'change:beta',
      'keyup:beta',
    ]);

    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('synthesizes button clicks at the browser Enter and Space boundaries', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const canvas = document.createElement('canvas');
    const events: AstylarEventSnapshot[] = [];
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: { children: [{ type: 'input', inputType: 'button', id: 'run', value: 'Run' }] },
      },
      { onEvent: (event) => events.push(event) },
      () => ({ value: 'Run' }),
      {
        getFocusedElementId: () => 'run',
        focus: () => true,
        blur: () => true,
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
        canActivateWithEnter: () => true,
        canActivateWithSpace: () => true,
      },
      canvas,
    );

    canvas.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', bubbles: true, cancelable: true,
    }));
    canvas.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'Enter', code: 'Enter', bubbles: true, cancelable: true,
    }));
    canvas.dispatchEvent(new KeyboardEvent('keydown', {
      key: ' ', code: 'Space', bubbles: true, cancelable: true,
    }));
    canvas.dispatchEvent(new KeyboardEvent('keyup', {
      key: ' ', code: 'Space', bubbles: true, cancelable: true,
    }));

    expect(events.map((event) => event.type)).toEqual([
      'keydown', 'click', 'keyup', 'keydown', 'keyup', 'click',
    ]);
    expect(events.filter((event) => event.type === 'click').map((event) => ({
      button: event.button,
      pointerType: event.pointerType,
    }))).toEqual([
      { button: 0, pointerType: '' },
      { button: 0, pointerType: '' },
    ]);

    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('focuses and activates the enabled control associated with an explicit label', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const labelMesh = MeshBuilder.CreatePlane('label-mesh', {}, scene);
    labelMesh.metadata = { elementId: 'alerts-label' };
    const canvas = document.createElement('canvas');
    const events: AstylarEventSnapshot[] = [];
    let focusedElementId: string | undefined;
    let checked = false;
    let cancelLabelClick = false;
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: {
          children: [
            { type: 'input', inputType: 'checkbox', id: 'alerts', value: 'on' },
            { type: 'label', id: 'alerts-label', for: 'alerts', textContent: 'Alerts' },
          ],
        },
      },
      {
        handlers: {
          'alerts-label': {
            click: (event) => { if (cancelLabelClick) event.preventDefault(); },
          },
        },
        onEvent: (event) => events.push(event),
      },
      (elementId) => elementId === 'alerts' ? { value: 'on', checked } : {},
      {
        getFocusedElementId: () => focusedElementId,
        focus: (elementId) => {
          focusedElementId = elementId;
          return true;
        },
        blur: () => {
          focusedElementId = undefined;
          return true;
        },
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
        activate: (elementId) => {
          if (elementId !== 'alerts') return undefined;
          const before = checked;
          checked = !checked;
          return { changed: true, rollback: () => { checked = before; } };
        },
      },
      canvas,
    );
    const pointerEvent = new PointerEvent('pointerdown', { button: 0 });

    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERDOWN,
      event: pointerEvent,
      pickInfo: { pickedMesh: labelMesh },
    } as unknown as PointerInfo);
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERUP,
      event: pointerEvent,
      pickInfo: { pickedMesh: labelMesh },
    } as unknown as PointerInfo);

    expect(focusedElementId).toBe('alerts');
    expect(checked).toBeTrue();
    expect(events.map((event) => `${event.type}:${event.targetId}:${event.checked}`)).toEqual([
      'pointerdown:alerts-label:undefined',
      'pointerup:alerts-label:undefined',
      'click:alerts-label:undefined',
      'focus:alerts:false',
      'click:alerts:true',
      'input:alerts:true',
      'change:alerts:true',
    ]);

    cancelLabelClick = true;
    events.length = 0;
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERDOWN,
      event: pointerEvent,
      pickInfo: { pickedMesh: labelMesh },
    } as unknown as PointerInfo);
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERUP,
      event: pointerEvent,
      pickInfo: { pickedMesh: labelMesh },
    } as unknown as PointerInfo);

    expect(focusedElementId).toBeUndefined();
    expect(checked).toBeTrue();
    expect(events.map((event) => event.type)).toEqual([
      'pointerdown', 'blur', 'pointerup', 'click',
    ]);
    expect(events.at(-1)?.defaultPrevented).toBeTrue();

    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('dispatches an accepted form reset after click and restores its controls', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const buttonMesh = MeshBuilder.CreatePlane('reset-mesh', {}, scene);
    buttonMesh.metadata = { elementId: 'reset-button' };
    const canvas = document.createElement('canvas');
    const events: AstylarEventSnapshot[] = [];
    let focusedElementId: string | undefined;
    let resetIds: readonly string[] = [];
    let cancelReset = false;
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: {
          children: [{
            type: 'form', id: 'settings', children: [
              { type: 'input', inputType: 'text', id: 'name', value: 'Seed' },
              { type: 'input', inputType: 'reset', id: 'reset-button', value: 'Reset' },
            ],
          }],
        },
      },
      {
        handlers: {
          settings: {
            reset: (event) => {
              if (cancelReset) event.preventDefault();
            },
          },
        },
        onEvent: (event) => events.push(event),
      },
      () => ({ value: 'Reset' }),
      {
        getFocusedElementId: () => focusedElementId,
        focus: (elementId) => {
          focusedElementId = elementId;
          return true;
        },
        blur: () => true,
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
        resetFormControls: (elementIds) => { resetIds = elementIds; },
      },
      canvas,
    );
    const pointerEvent = new PointerEvent('pointerdown', { button: 0 });

    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERDOWN,
      event: pointerEvent,
      pickInfo: { pickedMesh: buttonMesh },
    } as unknown as PointerInfo);
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERUP,
      event: pointerEvent,
      pickInfo: { pickedMesh: buttonMesh },
    } as unknown as PointerInfo);

    expect(events.map((event) => `${event.type}:${event.targetId}`)).toEqual([
      'pointerdown:reset-button',
      'focus:reset-button',
      'pointerup:reset-button',
      'click:reset-button',
      'reset:settings',
    ]);
    expect(resetIds).toEqual(['name', 'reset-button']);

    cancelReset = true;
    resetIds = [];
    events.length = 0;
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERDOWN,
      event: pointerEvent,
      pickInfo: { pickedMesh: buttonMesh },
    } as unknown as PointerInfo);
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERUP,
      event: pointerEvent,
      pickInfo: { pickedMesh: buttonMesh },
    } as unknown as PointerInfo);

    expect(events.map((event) => event.type)).toEqual([
      'pointerdown', 'pointerup', 'click', 'reset',
    ]);
    expect(events.at(-1)?.defaultPrevented).toBeTrue();
    expect(resetIds).toEqual([]);

    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('dispatches a cancellable form submit after an accepted submit-button click', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const buttonMesh = MeshBuilder.CreatePlane('submit-mesh', {}, scene);
    buttonMesh.metadata = { elementId: 'submit-button' };
    const canvas = document.createElement('canvas');
    const events: AstylarEventSnapshot[] = [];
    let cancelSubmit = false;
    let cancelInvalid = false;
    let focusedElementId = 'submit-button';
    let invalidIds: readonly string[] = [];
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: {
          children: [{
            type: 'form', id: 'settings', children: [
              { type: 'input', inputType: 'text', id: 'name', value: 'Seed' },
              { type: 'input', inputType: 'submit', id: 'submit-button', value: 'Save' },
            ],
          }],
        },
      },
      {
        handlers: {
          name: {
            invalid: (event) => {
              if (cancelInvalid) event.preventDefault();
            },
          },
          settings: {
            submit: (event) => {
              if (cancelSubmit) event.preventDefault();
            },
          },
        },
        onEvent: (event) => events.push(event),
      },
      (elementId) => ({ value: elementId === 'name' ? '' : 'Save' }),
      {
        getFocusedElementId: () => focusedElementId,
        focus: (elementId) => {
          focusedElementId = elementId;
          return true;
        },
        blur: () => true,
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
        validateFormControls: () => invalidIds,
      },
      canvas,
    );
    const pointerEvent = new PointerEvent('pointerdown', { button: 0 });
    const click = (): void => {
      scene.onPointerObservable.notifyObservers({
        type: PointerEventTypes.POINTERDOWN,
        event: pointerEvent,
        pickInfo: { pickedMesh: buttonMesh },
      } as unknown as PointerInfo);
      scene.onPointerObservable.notifyObservers({
        type: PointerEventTypes.POINTERUP,
        event: pointerEvent,
        pickInfo: { pickedMesh: buttonMesh },
      } as unknown as PointerInfo);
    };

    click();

    expect(events.map((event) => `${event.type}:${event.targetId}`)).toEqual([
      'pointerdown:submit-button',
      'pointerup:submit-button',
      'click:submit-button',
      'submit:settings',
    ]);
    expect(events.at(-1)?.defaultPrevented).toBeFalse();

    cancelSubmit = true;
    events.length = 0;
    click();
    expect(events.map((event) => event.type)).toEqual([
      'pointerdown', 'pointerup', 'click', 'submit',
    ]);
    expect(events.at(-1)?.defaultPrevented).toBeTrue();

    cancelSubmit = false;
    invalidIds = ['name'];
    cancelInvalid = true;
    events.length = 0;
    click();
    expect(events.map((event) => event.type)).toEqual([
      'pointerdown', 'pointerup', 'click', 'invalid',
    ]);
    expect(events.at(-1)?.defaultPrevented).toBeTrue();
    expect(focusedElementId).toBe('submit-button');

    cancelInvalid = false;
    events.length = 0;
    click();
    expect(events.map((event) => `${event.type}:${event.targetId}`)).toEqual([
      'pointerdown:submit-button',
      'pointerup:submit-button',
      'click:submit-button',
      'invalid:name',
      'blur:submit-button',
      'focus:name',
    ]);
    expect(focusedElementId).toBe('name');

    invalidIds = [];
    events.length = 0;
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', bubbles: true, cancelable: true,
    });
    canvas.dispatchEvent(enter);
    canvas.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'Enter', code: 'Enter', bubbles: true, cancelable: true,
    }));
    expect(enter.defaultPrevented).toBeTrue();
    expect(events.map((event) => `${event.type}:${event.targetId}`)).toEqual([
      'keydown:name',
      'click:submit-button',
      'submit:settings',
      'keyup:name',
    ]);
    expect(focusedElementId).toBe('name');

    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });
});
