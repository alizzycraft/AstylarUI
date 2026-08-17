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
  it('owns one scene pointer observer and emits one activation sequence', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const mesh = MeshBuilder.CreatePlane('button-mesh', {}, scene);
    mesh.metadata = { elementId: 'button' };
    const events: AstylarEventSnapshot[] = [];
    const runtime = new AstylarInteractionRuntime(scene, createSiteData(), {
      onEvent: (event) => events.push(event),
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
    let focusedElementId: string | undefined;
    const handledKeys: string[] = [];
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
        blur: (elementId) => {
          if (focusedElementId === elementId) focusedElementId = undefined;
          return true;
        },
        handleKeyDown: (_elementId, event) => handledKeys.push(event.key),
        commitsValueOnBlur: () => false,
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
    expect(handledKeys).toEqual(['a']);
    expect(runtime.snapshot.keyboardListeners).toBe(1);

    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERDOWN,
      event: pointerEvent,
      pickInfo: undefined,
    } as unknown as PointerInfo);
    expect(events.at(-1)?.type).toBe('blur');
    expect(events.at(-1)?.targetId).toBe('second');
    expect(focusedElementId).toBeUndefined();

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
    let focusedElementId: string | undefined;
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: { children: [{ type: 'input', inputType: 'checkbox', id: 'alerts' }] },
      },
      {
        handlers: {
          alerts: { click: (event) => { if (cancelClick) event.preventDefault(); } },
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
    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });
});
