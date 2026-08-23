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

  it('preserves pointer identity and canvas-local coordinate data', () => {
    let observed: AstylarEventSnapshot | undefined;
    const dispatcher = new AstylarEventDispatcher(createSiteData(), {
      handlers: {
        button: {
          pointermove: (event) => {
            expect(event.pointerId).toBe(7);
            expect(event.buttons).toBe(1);
            expect(event.localX).toBe(12);
          },
        },
      },
      onEvent: (event) => { observed = event; },
    });

    dispatcher.dispatch({
      type: 'pointermove', targetId: 'button', button: 0, buttons: 1,
      pointerId: 7, pointerType: 'pen', isPrimary: true,
      clientX: 42, clientY: 56, canvasX: 22, canvasY: 28,
      localX: 12, localY: 8,
    });

    expect(observed).toEqual(jasmine.objectContaining({
      type: 'pointermove', pointerId: 7, pointerType: 'pen', isPrimary: true,
      clientX: 42, clientY: 56, canvasX: 22, canvasY: 28,
      localX: 12, localY: 8,
    }));
  });
});

describe('AstylarInteractionRuntime', () => {
  it('routes semantic focus and activation through the existing typed defaults', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const events: AstylarEventSnapshot[] = [];
    let focusedElementId: string | undefined;
    const focusVisibility: boolean[] = [];
    let checked = false;
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: { children: [{
          type: 'input', inputType: 'checkbox', id: 'choice', checked: false,
        }] },
      },
      { onEvent: (event) => events.push(event) },
      () => ({ value: 'on', checked }),
      {
        getFocusedElementId: () => focusedElementId,
        focus: (elementId, focusVisible) => {
          focusedElementId = elementId;
          focusVisibility.push(focusVisible ?? true);
          return true;
        },
        blur: (elementId) => {
          if (focusedElementId === elementId) focusedElementId = undefined;
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
    );

    expect(runtime.focusSemanticElement('choice')).toBeTrue();
    expect(runtime.snapshot.focusVisible).toBeTrue();
    expect(runtime.focusSemanticElement('choice', false, false)).toBeTrue();
    expect(runtime.snapshot.focusVisible).toBeFalse();
    expect(runtime.activateSemanticElement('choice')).toBeTrue();
    expect(runtime.blurSemanticElement('choice')).toBeTrue();
    expect(checked).toBeTrue();
    expect(events.map((event) => `${event.type}:${event.checked}`)).toEqual([
      'focus:false', 'click:true', 'input:true', 'change:true', 'blur:true',
    ]);
    expect(focusVisibility).toEqual([true, false]);

    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

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

  it('owns one non-passive wheel path and removes it on disposal', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const mesh = MeshBuilder.CreatePlane('scroll-child', {}, scene);
    mesh.metadata = { elementId: 'child' };
    const canvas = document.createElement('canvas');
    const calls: Array<[string, number, number]> = [];
    spyOn(scene, 'pick').and.returnValue({
      hit: true,
      pickedMesh: mesh,
      pickedPoint: { x: 0, y: 0, z: 0 },
    } as never);
    const runtime = new AstylarInteractionRuntime(
      scene,
      { styles: [], root: { children: [{ type: 'div', id: 'child' }] } },
      {},
      undefined,
      undefined,
      canvas,
      {
        scrollFrom: (elementId, deltaX, deltaY) => {
          calls.push([elementId, deltaX, deltaY]);
          return true;
        },
        isPointVisible: () => true,
      },
    );
    const wheel = new WheelEvent('wheel', { deltaY: 70, cancelable: true });

    canvas.dispatchEvent(wheel);

    expect(calls).toEqual([['child', 0, 70]]);
    expect(wheel.defaultPrevented).toBeTrue();
    expect(runtime.snapshot.wheelHandlers).toBe(1);

    runtime.dispose();
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 20, cancelable: true }));
    expect(calls.length).toBe(1);
    expect(runtime.snapshot.wheelHandlers).toBe(0);
    scene.dispose();
    engine.dispose();
  });

  it('falls back to the nearest visible mesh when Babylon omits pointer-move pick data', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const backdrop = MeshBuilder.CreatePlane('backdrop', {}, scene);
    backdrop.metadata = { elementId: 'backdrop' };
    const action = MeshBuilder.CreatePlane('action', {}, scene);
    action.metadata = { elementId: 'action' };
    const canvas = document.createElement('canvas');
    const hoverStates: Array<[string, boolean]> = [];
    const events: AstylarEventSnapshot[] = [];
    const point = { x: 2, y: 3, z: 0 };
    spyOn(scene, 'multiPick').and.returnValue([
      { hit: true, pickedMesh: backdrop, pickedPoint: point, distance: 20 },
      { hit: true, pickedMesh: action, pickedPoint: point, distance: 2 },
    ] as never);
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: { children: [
          { type: 'div', id: 'backdrop' },
          { type: 'button', inputType: 'button', id: 'action', value: 'Play' },
        ] },
      },
      { onEvent: (event) => events.push(event) },
      undefined,
      {
        getFocusedElementId: () => undefined,
        focus: () => false,
        blur: () => false,
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
        setHoverState: (elementId: string, hovered: boolean) =>
          hoverStates.push([elementId, hovered]),
      } as never,
      canvas,
      {
        scrollFrom: () => false,
        isPointVisible: (elementId) => elementId === 'action',
      },
    );

    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERMOVE,
      event: new MouseEvent('pointermove', { clientX: 10, clientY: 10 }),
      pickInfo: undefined,
    } as unknown as PointerInfo);

    expect(runtime.snapshot.hoveredElementId).toBe('action');
    expect(hoverStates).toEqual([['action', true]]);
    expect(events.map((event) => `${event.type}:${event.targetId}`)).toEqual([
      'pointerenter:action',
      'pointermove:action',
    ]);
    hoverStates.length = 0;
    runtime.reconcileModalState();
    expect(hoverStates).toEqual([['action', true]]);
    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('transfers hover to a direct authored hit without falling through to a stale pick', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const action = MeshBuilder.CreatePlane('action', {}, scene);
    action.metadata = { elementId: 'action' };
    const outside = MeshBuilder.CreatePlane('outside', {}, scene);
    outside.metadata = { elementId: 'outside' };
    const canvas = document.createElement('canvas');
    const hoverStates: Array<[string, boolean]> = [];
    const point = { x: 0, y: 0, z: 0 };
    const multiPick = spyOn(scene, 'multiPick').and.returnValue([
      { hit: true, pickedMesh: action, pickedPoint: point, distance: 2 },
    ] as never);
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: { children: [
          { type: 'button', inputType: 'button', id: 'action', value: 'Play' },
          { type: 'div', id: 'outside' },
        ] },
      },
      {},
      undefined,
      {
        getFocusedElementId: () => undefined,
        focus: () => false,
        blur: () => false,
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
        setHoverState: (elementId: string, hovered: boolean) =>
          hoverStates.push([elementId, hovered]),
      } as never,
      canvas,
      {
        scrollFrom: () => false,
        isPointVisible: () => true,
      },
    );

    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERMOVE,
      event: new MouseEvent('pointermove'),
      pickInfo: { hit: true, pickedMesh: action, pickedPoint: point },
    } as unknown as PointerInfo);
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERMOVE,
      event: new MouseEvent('pointermove'),
      pickInfo: { hit: true, pickedMesh: outside, pickedPoint: point },
    } as unknown as PointerInfo);

    expect(runtime.snapshot.hoveredElementId).toBe('outside');
    expect(hoverStates).toEqual([
      ['action', true],
      ['action', false],
      ['outside', true],
    ]);
    expect(multiPick).not.toHaveBeenCalled();
    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('keeps authored ancestors hovered when the pointer moves onto a nested child', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const card = MeshBuilder.CreatePlane('card', {}, scene);
    card.metadata = { elementId: 'card' };
    const copy = MeshBuilder.CreatePlane('copy', {}, scene);
    copy.metadata = { elementId: 'copy' };
    copy.parent = card;
    const canvas = document.createElement('canvas');
    const hoverStates: Array<[string, boolean]> = [];
    const events: AstylarEventSnapshot[] = [];
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: { children: [{ type: 'article', id: 'card', children: [
          { type: 'p', id: 'copy', textContent: 'Nested copy' },
        ] }] },
      },
      { onEvent: (event) => events.push(event) },
      undefined,
      {
        getFocusedElementId: () => undefined,
        focus: () => false,
        blur: () => false,
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
        setHoverState: (elementId: string, hovered: boolean) =>
          hoverStates.push([elementId, hovered]),
      } as never,
      canvas,
    );

    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERMOVE,
      event: new MouseEvent('pointermove'),
      pickInfo: { hit: true, pickedMesh: card },
    } as unknown as PointerInfo);
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERMOVE,
      event: new MouseEvent('pointermove'),
      pickInfo: { hit: true, pickedMesh: copy },
    } as unknown as PointerInfo);

    expect(runtime.snapshot.hoveredElementId).toBe('copy');
    expect(hoverStates).toEqual([
      ['card', true],
      ['copy', true],
    ]);
    expect(events.map((event) => `${event.type}:${event.targetId}`)).toEqual([
      'pointerenter:card',
      'pointermove:card',
      'pointerenter:copy',
      'pointermove:copy',
    ]);
    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('prefers a picked authored descendant over its overlapping layout ancestor', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const layout = MeshBuilder.CreatePlane('layout', {}, scene);
    layout.metadata = { elementId: 'layout' };
    const card = MeshBuilder.CreatePlane('card', {}, scene);
    card.metadata = { elementId: 'card' };
    const point = { x: 0, y: 0, z: 0 };
    spyOn(scene, 'multiPick').and.returnValue([
      { hit: true, pickedMesh: layout, pickedPoint: point, distance: 1 },
      { hit: true, pickedMesh: card, pickedPoint: point, distance: 2 },
    ] as never);
    const canvas = document.createElement('canvas');
    const runtime = new AstylarInteractionRuntime(
      scene,
      { styles: [], root: { children: [{ type: 'div', id: 'layout', children: [
        { type: 'article', id: 'card' },
      ] }] } },
      {},
      undefined,
      {
        getFocusedElementId: () => undefined,
        focus: () => false,
        blur: () => false,
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
      } as never,
      canvas,
    );

    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERMOVE,
      event: new MouseEvent('pointermove', { clientX: 10, clientY: 10 }),
      pickInfo: { hit: true, pickedMesh: layout, pickedPoint: point },
    } as unknown as PointerInfo);

    expect(runtime.snapshot.hoveredElementId).toBe('card');
    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('walks generated mesh ancestry to find the authored wheel target', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const ancestor = MeshBuilder.CreatePlane('ancestor', {}, scene);
    ancestor.metadata = { elementId: 'ancestor' };
    const child = MeshBuilder.CreatePlane('generated-text-child', {}, scene);
    child.parent = ancestor;
    child.metadata = { elementId: 'generated-text-id' };
    const point = { x: 0, y: 0, z: 0 };
    const canvas = document.createElement('canvas');
    const calls: string[] = [];
    spyOn(scene, 'pick').and.returnValue({ hit: true, pickedMesh: child, pickedPoint: point } as never);
    const runtime = new AstylarInteractionRuntime(
      scene,
      { styles: [], root: { children: [{ type: 'div', id: 'ancestor' }] } },
      {},
      undefined,
      undefined,
      canvas,
      {
        scrollFrom: (elementId) => {
          calls.push(elementId);
          return elementId === 'ancestor';
        },
        isPointVisible: () => true,
      },
    );
    const wheel = new WheelEvent('wheel', { deltaY: 70, cancelable: true });

    canvas.dispatchEvent(wheel);

    expect(calls).toEqual(['generated-text-id', 'ancestor']);
    expect(wheel.defaultPrevented).toBeTrue();
    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('lets a hovered text control consume wheel input before a scroll ancestor', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const mesh = MeshBuilder.CreatePlane('textarea', {}, scene);
    mesh.metadata = { elementId: 'bio' };
    const canvas = document.createElement('canvas');
    const textCalls: Array<[string, number, number]> = [];
    const containerCalls: string[] = [];
    spyOn(scene, 'pick').and.returnValue({
      hit: true,
      pickedMesh: mesh,
      pickedPoint: { x: 0, y: 0, z: 0 },
    } as never);
    const runtime = new AstylarInteractionRuntime(
      scene,
      { styles: [], root: { children: [{ type: 'textarea', id: 'bio', value: 'Alpha' }] } },
      {},
      undefined,
      {
        getFocusedElementId: () => undefined,
        scrollTextControl: (elementId: string, deltaX: number, deltaY: number) => {
          textCalls.push([elementId, deltaX, deltaY]);
          return true;
        },
      } as never,
      canvas,
      {
        scrollFrom: (elementId) => {
          containerCalls.push(elementId);
          return true;
        },
        isPointVisible: () => true,
      },
    );
    const wheel = new WheelEvent('wheel', { deltaY: 96, cancelable: true });

    canvas.dispatchEvent(wheel);

    expect(textCalls).toEqual([['bio', 0, 96]]);
    expect(containerCalls).toEqual([]);
    expect(wheel.defaultPrevented).toBeTrue();
    runtime.dispose();
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

  it('lets an expanded select consume Escape before public keydown dispatch', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const canvas = document.createElement('canvas');
    const events: AstylarEventSnapshot[] = [];
    let cancelCalls = 0;
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: { children: [{
          type: 'select', id: 'choice', value: 'alpha',
          options: [{ value: 'alpha', label: 'Alpha' }],
        }] },
      },
      { onEvent: (event) => events.push(event) },
      () => ({ value: 'alpha', selectedValue: 'alpha' }),
      {
        getFocusedElementId: () => 'choice',
        focus: () => true,
        blur: () => true,
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
        cancelExpandedSelect: () => {
          cancelCalls += 1;
          return true;
        },
      },
      canvas,
    );
    const keydown = new KeyboardEvent('keydown', {
      key: 'Escape', code: 'Escape', bubbles: true, cancelable: true,
    });

    canvas.dispatchEvent(keydown);
    canvas.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'Escape', code: 'Escape', bubbles: true, cancelable: true,
    }));

    expect(cancelCalls).toBe(1);
    expect(keydown.defaultPrevented).toBeTrue();
    expect(events.map((event) => event.type)).toEqual(['keyup']);

    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('keeps expanded select arrows private and emits the native Enter commit sequence', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const canvas = document.createElement('canvas');
    const events: AstylarEventSnapshot[] = [];
    let selectedValue = 'alpha';
    let activeValue = 'alpha';
    let expanded = true;
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: { children: [{
          type: 'select', id: 'choice', value: 'alpha',
          options: [
            { value: 'alpha', label: 'Alpha' },
            { value: 'beta', label: 'Beta' },
            { value: 'gamma', label: 'Gamma' },
          ],
        }] },
      },
      { onEvent: (event) => events.push(event) },
      () => ({ value: selectedValue, selectedValue }),
      {
        getFocusedElementId: () => 'choice',
        focus: () => true,
        blur: () => true,
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
        handleExpandedSelectKeyDown: (_elementId, event) => {
          if (!expanded) return undefined;
          if (event.key === 'ArrowDown') {
            activeValue = activeValue === 'alpha' ? 'beta' : 'gamma';
            return { handled: true, changed: false, dispatchClick: false, suppressKeyUp: true };
          }
          if (event.key === 'Enter') {
            selectedValue = activeValue;
            expanded = false;
            return { handled: true, changed: true, dispatchClick: true, suppressKeyUp: false };
          }
          return undefined;
        },
      },
      canvas,
    );

    for (const key of ['ArrowDown', 'ArrowDown', 'Enter']) {
      canvas.dispatchEvent(new KeyboardEvent('keydown', {
        key, code: key, bubbles: true, cancelable: true,
      }));
      canvas.dispatchEvent(new KeyboardEvent('keyup', {
        key, code: key, bubbles: true, cancelable: true,
      }));
    }

    expect(selectedValue).toBe('gamma');
    expect(events.map((event) => `${event.type}:${event.selectedValue}`)).toEqual([
      'input:gamma',
      'change:gamma',
      'click:gamma',
      'keyup:gamma',
    ]);
    expect(events[2].button).toBe(-1);

    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('keeps expanded option pointer events private and emits only the committed mutation', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const optionMesh = MeshBuilder.CreatePlane('choice-option-2', {}, scene);
    optionMesh.metadata = {
      optionIndex: 2,
      selectElement: { element: { id: 'choice' } },
    };
    const events: AstylarEventSnapshot[] = [];
    let selectedValue = 'alpha';
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: { children: [{
          type: 'select', id: 'choice', value: 'alpha',
          options: [
            { value: 'alpha', label: 'Alpha' },
            { value: 'blocked', label: 'Blocked', disabled: true },
            { value: 'beta', label: 'Beta' },
          ],
        }] },
      },
      { onEvent: (event) => events.push(event) },
      () => ({ value: selectedValue, selectedValue }),
      {
        getFocusedElementId: () => 'choice',
        focus: () => true,
        blur: () => true,
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
        hasExpandedSelectPopup: () => true,
        commitExpandedSelectOption: (_elementId, optionIndex) => {
          expect(optionIndex).toBe(2);
          selectedValue = 'beta';
          return true;
        },
      },
    );
    const pointerEvent = new PointerEvent('pointerdown', {
      button: 0,
      pointerType: 'mouse',
    });

    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERDOWN,
      event: pointerEvent,
      pickInfo: { pickedMesh: optionMesh },
    } as unknown as PointerInfo);
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERUP,
      event: pointerEvent,
      pickInfo: { pickedMesh: optionMesh },
    } as unknown as PointerInfo);

    expect(events.map((event) => `${event.type}:${event.selectedValue}`)).toEqual([
      'input:beta',
      'change:beta',
    ]);

    runtime.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('gives an expanded select option pointer priority over an overlapping page mesh', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const blocker = MeshBuilder.CreatePlane('page-layer', {}, scene);
    const optionMesh = MeshBuilder.CreatePlane('choice-option-2', {}, scene);
    optionMesh.metadata = {
      optionIndex: 2,
      selectElement: { element: { id: 'choice' } },
    };
    spyOn(scene, 'multiPick').and.returnValue([
      { pickedMesh: blocker },
      { pickedMesh: optionMesh },
    ] as any);
    const events: AstylarEventSnapshot[] = [];
    let selectedValue = 'alpha';
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: { children: [{
          type: 'select', id: 'choice', value: 'alpha',
          options: [
            { value: 'alpha', label: 'Alpha' },
            { value: 'beta', label: 'Beta' },
            { value: 'gamma', label: 'Gamma' },
          ],
        }] },
      },
      { onEvent: (event) => events.push(event) },
      () => ({ value: selectedValue, selectedValue }),
      {
        getFocusedElementId: () => 'choice',
        focus: () => true,
        blur: () => true,
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
        hasExpandedSelectPopup: () => true,
        commitExpandedSelectOption: (_elementId, optionIndex) => {
          expect(optionIndex).toBe(2);
          selectedValue = 'gamma';
          return true;
        },
      },
    );
    const pointerEvent = new PointerEvent('pointerdown', {
      button: 0,
      pointerType: 'mouse',
    });
    const pointerInfo = {
      event: pointerEvent,
      pickInfo: { pickedMesh: blocker },
    } as unknown as PointerInfo;

    scene.onPointerObservable.notifyObservers({
      ...pointerInfo,
      type: PointerEventTypes.POINTERDOWN,
    } as unknown as PointerInfo);
    scene.onPointerObservable.notifyObservers({
      ...pointerInfo,
      type: PointerEventTypes.POINTERUP,
    } as unknown as PointerInfo);

    expect(events.map((event) => `${event.type}:${event.selectedValue}`)).toEqual([
      'input:gamma',
      'change:gamma',
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

  it('focuses anchors and performs only accepted navigation defaults', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const canvas = document.createElement('canvas');
    const events: AstylarEventSnapshot[] = [];
    const scrolls: Array<[string, 'start' | 'nearest' | undefined]> = [];
    const outcomes: Array<{
      sourceId: string;
      href: string;
      kind: 'fragment' | 'external';
      url: string;
      target?: string;
      fragmentId?: string;
    }> = [];
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: { children: [
          { type: 'a', id: 'fragment', href: '#destination', textContent: 'Jump' },
          {
            type: 'a', id: 'external', href: 'https://example.com/docs#intro',
            target: '_blank', textContent: 'Docs',
          },
          { type: 'a', id: 'cancelled', href: '#blocked', textContent: 'Blocked' },
          { type: 'div', id: 'destination' },
          { type: 'div', id: 'blocked' },
        ] },
      },
      {
        handlers: {
          cancelled: { click: (event) => event.preventDefault() },
        },
        onEvent: (event) => events.push(event),
      },
      undefined,
      {
        getFocusedElementId: () => undefined,
        focus: () => false,
        blur: () => false,
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
      },
      canvas,
      {
        scrollFrom: () => false,
        isPointVisible: () => true,
        scrollIntoView: (elementId, alignment) => {
          scrolls.push([elementId, alignment]);
          return true;
        },
      },
      { onNavigate: (outcome) => outcomes.push({ ...outcome }) },
    );

    expect(runtime.focusSemanticElement('fragment')).toBeTrue();
    expect(runtime.snapshot.focusedElementId).toBe('fragment');
    expect(scrolls).toEqual([['fragment', 'nearest']]);

    const enter = new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', cancelable: true,
    });
    runtime.handleSemanticKeyDown(enter);
    expect(enter.defaultPrevented).toBeTrue();
    expect(scrolls).toEqual([
      ['fragment', 'nearest'],
      ['destination', undefined],
    ]);
    expect(outcomes[0]).toEqual({
      sourceId: 'fragment',
      href: '#destination',
      kind: 'fragment',
      url: '#destination',
      target: undefined,
      fragmentId: 'destination',
    });

    expect(runtime.focusSemanticElement('external')).toBeTrue();
    expect(runtime.activateSemanticElement('external')).toBeTrue();
    expect(outcomes[1]).toEqual({
      sourceId: 'external',
      href: 'https://example.com/docs#intro',
      kind: 'external',
      url: 'https://example.com/docs#intro',
      target: '_blank',
      fragmentId: undefined,
    });

    expect(runtime.focusSemanticElement('cancelled')).toBeTrue();
    expect(runtime.activateSemanticElement('cancelled')).toBeFalse();
    expect(outcomes).toHaveSize(2);
    expect(runtime.snapshot.navigationOutcomes).toEqual(outcomes);
    expect(events.map((event) => `${event.type}:${event.targetId}`)).toEqual([
      'focus:fragment',
      'keydown:fragment',
      'click:fragment',
      'blur:fragment',
      'focus:external',
      'click:external',
      'blur:external',
      'focus:cancelled',
      'click:cancelled',
    ]);
    expect(events.at(-1)?.defaultPrevented).toBeTrue();

    runtime.dispose();
    expect(runtime.snapshot.navigationOutcomes).toEqual([]);
    expect(runtime.snapshot.focusedElementId).toBeUndefined();
    scene.dispose();
    engine.dispose();
  });

  it('owns modal autofocus, Tab containment, background inertness, and top-layer cleanup', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const canvas = document.createElement('canvas');
    const events: AstylarEventSnapshot[] = [];
    const topLayerCalls: Array<{ ids: readonly string[]; active: boolean }> = [];
    let focusedElementId: string | undefined;
    const runtime = new AstylarInteractionRuntime(
      scene,
      {
        styles: [],
        root: { children: [
          { type: 'input', inputType: 'button', id: 'background', value: 'Background' },
          {
            type: 'dialog', id: 'dialog', open: true, modal: true,
            children: [
              { type: 'h2', id: 'title', textContent: 'Confirm' },
              {
                type: 'input', inputType: 'button', id: 'first',
                value: 'First', autofocus: true,
              },
              { type: 'input', inputType: 'button', id: 'second', value: 'Second' },
            ],
          },
        ] },
      },
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
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
      },
      canvas,
      undefined,
      undefined,
      {
        setTopLayer: (ids, active) => topLayerCalls.push({ ids: [...ids], active }),
      },
    );

    runtime.reconcileModalState();
    expect(runtime.snapshot.modalDialogId).toBe('dialog');
    expect(focusedElementId).toBe('first');
    expect(topLayerCalls).toEqual([{
      ids: ['dialog', 'title', 'first', 'second'],
      active: true,
    }]);
    expect(runtime.focusSemanticElement('background')).toBeFalse();
    expect(runtime.activateSemanticElement('background')).toBeFalse();

    const tab = (shiftKey = false): void => {
      const down = new KeyboardEvent('keydown', {
        key: 'Tab', code: 'Tab', shiftKey, cancelable: true,
      });
      runtime.handleSemanticKeyDown(down);
      expect(down.defaultPrevented).toBeTrue();
      runtime.handleSemanticKeyUp(new KeyboardEvent('keyup', {
        key: 'Tab', code: 'Tab', shiftKey, cancelable: true,
      }));
    };
    tab();
    expect(focusedElementId).toBe('second');
    tab();
    expect(focusedElementId).toBe('first');
    tab(true);
    expect(focusedElementId).toBe('second');
    expect(events.map((event) => `${event.type}:${event.targetId}`)).toEqual([
      'focus:first',
      'keydown:first', 'blur:first', 'focus:second', 'keyup:second',
      'keydown:second', 'blur:second', 'focus:first', 'keyup:first',
      'keydown:first', 'blur:first', 'focus:second', 'keyup:second',
    ]);

    runtime.dispose();
    expect(topLayerCalls.at(-1)).toEqual({
      ids: ['dialog', 'title', 'first', 'second'],
      active: false,
    });
    expect(runtime.snapshot.modalDialogId).toBeUndefined();
    scene.dispose();
    engine.dispose();
  });

  it('dispatches cancelable modal dismissal, restores its invoker, and cleans update removal', () => {
    jasmine.clock().install();
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const canvas = document.createElement('canvas');
    const events: AstylarEventSnapshot[] = [];
    const presentation: string[] = [];
    let focusedElementId: string | undefined;
    let cancelDismissal = true;
    const base: SiteData = {
      styles: [],
      root: { children: [
        { type: 'input', inputType: 'button', id: 'invoker', value: 'Open' },
      ] },
    };
    const modal: SiteData = {
      styles: [],
      root: { children: [
        ...base.root.children,
        {
          type: 'dialog', id: 'dialog', open: true, modal: true,
          children: [
            { type: 'input', inputType: 'button', id: 'action', value: 'Action', autofocus: true },
          ],
        },
      ] },
    };
    const hiddenModal: SiteData = {
      styles: [],
      root: { children: [
        ...base.root.children,
        {
          type: 'dialog', id: 'dialog', open: false, modal: true, hidden: true,
          children: [
            { type: 'input', inputType: 'button', id: 'action', value: 'Action', autofocus: true },
          ],
        },
      ] },
    };
    const runtime = new AstylarInteractionRuntime(
      scene,
      base,
      {
        handlers: {
          dialog: { cancel: (event) => { if (cancelDismissal) event.preventDefault(); } },
        },
        onEvent: (event) => events.push(event),
      },
      undefined,
      {
        getFocusedElementId: () => focusedElementId,
        focus: (elementId) => { focusedElementId = elementId; return true; },
        blur: (elementId) => {
          if (focusedElementId === elementId) focusedElementId = undefined;
          return true;
        },
        handleKeyDown: () => undefined,
        commitsValueOnBlur: () => false,
      },
      canvas,
      undefined,
      undefined,
      {
        setTopLayer: (ids, active) => presentation.push(
          `layer:${active}:${ids.join(',')}`,
        ),
        setOpen: (id, ids, open) => presentation.push(
          `open:${open}:${id}:${ids.join(',')}`,
        ),
        restoreFocus: (id) => presentation.push(`restore:${id}`),
      },
    );

    try {
      expect(runtime.focusSemanticElement('invoker')).toBeTrue();
      runtime.setSiteData(modal);
      runtime.reconcileModalState();
      expect(focusedElementId).toBe('action');

      const canceledEscape = new KeyboardEvent('keydown', {
        key: 'Escape', code: 'Escape', cancelable: true,
      });
      runtime.handleSemanticKeyDown(canceledEscape);
      runtime.handleSemanticKeyUp(new KeyboardEvent('keyup', {
        key: 'Escape', code: 'Escape', cancelable: true,
      }));
      jasmine.clock().tick(1);
      expect(runtime.snapshot.modalDialogId).toBe('dialog');
      expect(focusedElementId).toBe('action');
      expect(events.find((event) => event.type === 'cancel')?.defaultPrevented).toBeTrue();
      expect(events.some((event) => event.type === 'close')).toBeFalse();

      cancelDismissal = false;
      runtime.handleSemanticKeyDown(new KeyboardEvent('keydown', {
        key: 'Escape', code: 'Escape', cancelable: true,
      }));
      expect(runtime.snapshot.modalDialogId).toBeUndefined();
      expect(focusedElementId).toBe('invoker');
      runtime.handleSemanticKeyUp(new KeyboardEvent('keyup', {
        key: 'Escape', code: 'Escape', cancelable: true,
      }));
      jasmine.clock().tick(1);
      expect(events.map((event) => event.type).slice(-6)).toEqual([
        'keydown', 'cancel', 'blur', 'focus', 'keyup', 'close',
      ]);
      expect(presentation).toContain('restore:invoker');

      runtime.setSiteData(modal);
      runtime.reconcileModalState();
      expect(focusedElementId).toBe('action');
      runtime.setSiteData(hiddenModal);
      runtime.reconcileModalState();
      expect(runtime.snapshot.modalDialogId).toBeUndefined();
      expect(focusedElementId).toBeUndefined();
      expect(events.at(-1)?.type).toBe('blur');

      runtime.setSiteData(modal);
      runtime.reconcileModalState();
      expect(focusedElementId).toBe('action');
      runtime.setSiteData(base);
      runtime.reconcileModalState();
      expect(runtime.snapshot.modalDialogId).toBeUndefined();
      expect(focusedElementId).toBeUndefined();
      expect(events.at(-1)?.type).toBe('blur');
      expect(presentation.at(-2)).toBe('layer:false:dialog,action');
      expect(presentation.at(-1)).toBe('open:false:dialog:dialog,action');
    } finally {
      runtime.dispose();
      scene.dispose();
      engine.dispose();
      jasmine.clock().uninstall();
    }
  });
});
