import { AstylarSemanticBridge } from './astylar-semantic-bridge';
import { SiteData } from '../app/types/site-data';

describe('AstylarSemanticBridge', () => {
  let host: HTMLDivElement;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    host = document.createElement('div');
    canvas = document.createElement('canvas');
    host.appendChild(canvas);
    document.body.appendChild(host);
  });

  afterEach(() => host.remove());

  it('creates a native nonvisual semantic hierarchy and hides the visual canvas', () => {
    const bridge = new AstylarSemanticBridge(canvas);
    bridge.reconcile(siteData());

    const root = host.querySelector<HTMLElement>('[data-astylar-semantic-root]');
    expect(root).not.toBeNull();
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(root?.querySelector('[data-astylar-id="main"]')?.tagName).toBe('MAIN');
    expect(root?.querySelector('[data-astylar-id="heading"]')?.tagName).toBe('H1');
    expect(root?.querySelector('[data-astylar-id="link"]')?.textContent).toBe('Read more');
    expect(bridge.snapshot.nodes).toBe(4);
  });

  it('retains unique stable nodes across compatible updates and removes stale nodes', () => {
    const bridge = new AstylarSemanticBridge(canvas);
    const initial = siteData();
    bridge.reconcile(initial);
    const heading = host.querySelector('[data-astylar-id="heading"]');

    const updated = siteData();
    updated.root.children[0].children = [
      { type: 'h1', id: 'heading', textContent: 'Updated heading' },
    ];
    bridge.reconcile(updated);

    expect(host.querySelector('[data-astylar-id="heading"]')).toBe(heading);
    expect(heading?.textContent).toBe('Updated heading');
    expect(host.querySelector('[data-astylar-id="link"]')).toBeNull();
    expect(bridge.snapshot.nodes).toBe(2);
  });

  it('removes owned nodes and restores the canvas accessibility state on disposal', () => {
    canvas.setAttribute('aria-hidden', 'false');
    const bridge = new AstylarSemanticBridge(canvas);
    bridge.reconcile(siteData());
    bridge.dispose();

    expect(host.querySelector('[data-astylar-semantic-root]')).toBeNull();
    expect(canvas.getAttribute('aria-hidden')).toBe('false');
    expect(bridge.snapshot.nodes).toBe(0);
  });

  it('maps authored label and ARIA ID references into the isolated native namespace', () => {
    const bridge = new AstylarSemanticBridge(canvas);
    bridge.reconcile({
      styles: [],
      root: { children: [
        { type: 'label', id: 'name-label', for: 'name', textContent: 'Name' },
        { type: 'input', id: 'name', value: 'Atlas', ariaLabel: 'Fallback', ariaLabelledby: 'name-label name-label', ariaDescribedby: 'help' },
        { type: 'p', id: 'help', textContent: 'Public name.' },
      ] },
    });

    const label = host.querySelector<HTMLLabelElement>('[data-astylar-id="name-label"]');
    const input = host.querySelector<HTMLInputElement>('[data-astylar-id="name"]');
    const help = host.querySelector<HTMLElement>('[data-astylar-id="help"]');
    expect(label?.htmlFor).toBe(input?.id);
    expect(input?.getAttribute('aria-labelledby')).toBe(`${label?.id} ${label?.id}`);
    expect(input?.getAttribute('aria-describedby')).toBe(help?.id);
    expect(input?.getAttribute('aria-label')).toBe('Fallback');
    expect(input?.value).toBe('Atlas');
  });

  it('maps native control properties and synchronizes mutable scene state', () => {
    const bridge = new AstylarSemanticBridge(canvas);
    bridge.reconcile({
      styles: [],
      root: { children: [
        {
          type: 'input', id: 'choice', inputType: 'checkbox', value: 'yes',
          checked: false, required: true, ariaLabel: 'Choice',
        },
        {
          type: 'input', id: 'locked', value: 'Read only', readonly: true,
          disabled: true, ariaLabel: 'Locked value',
        },
        {
          type: 'select', id: 'plan', value: 'team', required: true,
          ariaLabel: 'Plan', options: [
            { value: 'solo', label: 'Solo' },
            { value: 'team', label: 'Team' },
            { value: 'retired', label: 'Retired', disabled: true },
          ],
        },
      ] },
    });

    const choice = host.querySelector<HTMLInputElement>('[data-astylar-id="choice"]');
    const locked = host.querySelector<HTMLInputElement>('[data-astylar-id="locked"]');
    const plan = host.querySelector<HTMLSelectElement>('[data-astylar-id="plan"]');
    expect(choice?.type).toBe('checkbox');
    expect(choice?.value).toBe('yes');
    expect(choice?.checked).toBeFalse();
    expect(choice?.required).toBeTrue();
    expect(locked?.readOnly).toBeTrue();
    expect(locked?.disabled).toBeTrue();
    expect(Array.from(plan?.options ?? []).map((option) => option.textContent)).toEqual([
      'Solo', 'Team', 'Retired',
    ]);
    expect(plan?.selectedIndex).toBe(1);
    expect(plan?.required).toBeTrue();
    expect(plan?.options[2].disabled).toBeTrue();

    bridge.syncControlStates((elementId) => ({
      choice: { value: 'yes', checked: true, required: true, disabled: false },
      plan: { value: 'solo', selectedIndex: 0, required: true, expanded: true },
    })[elementId]);

    expect(choice?.checked).toBeTrue();
    expect(plan?.value).toBe('solo');
    expect(plan?.selectedIndex).toBe(0);
    expect(plan?.getAttribute('aria-expanded')).toBe('true');
  });

  it('delegates semantic focus, keyboard input, and activation and restores canvas focus state', async () => {
    canvas.setAttribute('tabindex', '4');
    const bridge = new AstylarSemanticBridge(canvas);
    bridge.reconcile({
      styles: [],
      root: { children: [
        { type: 'button', id: 'action', textContent: 'Run' },
      ] },
    });
    const calls: string[] = [];
    let focusedElementId: string | undefined;
    bridge.connectInteractions({
      getFocusedElementId: () => focusedElementId,
      focus: (elementId) => {
        focusedElementId = elementId;
        calls.push(`focus:${elementId}`);
        return true;
      },
      blur: (elementId) => {
        focusedElementId = undefined;
        calls.push(`blur:${elementId}`);
        return true;
      },
      activate: (elementId) => {
        calls.push(`activate:${elementId}`);
        return true;
      },
      keyDown: (event) => calls.push(`keydown:${event.key}`),
      keyUp: (event) => calls.push(`keyup:${event.key}`),
    });

    const action = host.querySelector<HTMLButtonElement>('[data-astylar-id="action"]');
    expect(canvas.tabIndex).toBe(-1);
    expect(bridge.snapshot.eventRegistrations).toBe(5);
    action?.focus();
    action?.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', bubbles: true, cancelable: true,
    }));
    action?.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'Enter', bubbles: true, cancelable: true,
    }));
    action?.click();
    action?.blur();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    bridge.queueFocusSync(() => 'action');
    await Promise.resolve();
    expect(document.activeElement).toBe(action);
    expect(calls).toEqual([
      'focus:action', 'keydown:Enter', 'keyup:Enter', 'activate:action',
      'blur:action', 'focus:action',
    ]);

    bridge.dispose();
    expect(canvas.tabIndex).toBe(4);
    expect(bridge.snapshot.eventRegistrations).toBe(0);
  });

  it('marks native Tab focus transitions as selection preserving', () => {
    const bridge = new AstylarSemanticBridge(canvas);
    bridge.reconcile({
      styles: [],
      root: { children: [
        { type: 'input', inputType: 'text', id: 'first', value: 'First' },
        { type: 'input', inputType: 'text', id: 'second', value: 'Second' },
      ] },
    });
    const focusCalls: Array<[string, boolean]> = [];
    let focusedElementId: string | undefined;
    bridge.connectInteractions({
      getFocusedElementId: () => focusedElementId,
      focus: (elementId, preserveSelection) => {
        focusedElementId = elementId;
        focusCalls.push([elementId, !!preserveSelection]);
        return true;
      },
      blur: (elementId) => {
        if (focusedElementId === elementId) focusedElementId = undefined;
        return true;
      },
      activate: () => true,
      keyDown: () => undefined,
      keyUp: () => undefined,
    });

    const first = host.querySelector<HTMLInputElement>('[data-astylar-id="first"]');
    const second = host.querySelector<HTMLInputElement>('[data-astylar-id="second"]');
    first?.focus();
    first?.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', bubbles: true, cancelable: true,
    }));
    second?.focus();

    expect(focusCalls).toEqual([['first', false], ['second', true]]);
    bridge.dispose();
  });

  it('exposes modal dialog state and makes the background semantic subtree inert', () => {
    const bridge = new AstylarSemanticBridge(canvas);
    const modalSiteData: SiteData = {
      styles: [],
      root: { children: [
        { type: 'section', id: 'background', children: [
          { type: 'button', id: 'background-action', textContent: 'Background' },
        ] },
        {
          type: 'dialog', id: 'dialog', open: true, modal: true,
          ariaLabelledby: 'dialog-title', children: [
            { type: 'h2', id: 'dialog-title', textContent: 'Confirm' },
            { type: 'button', id: 'dialog-action', textContent: 'Continue', autofocus: true },
          ],
        },
      ] },
    };
    bridge.reconcile(modalSiteData);

    const background = host.querySelector<HTMLElement>('[data-astylar-id="background"]');
    const dialog = host.querySelector<HTMLDialogElement>('[data-astylar-id="dialog"]');
    const action = host.querySelector<HTMLElement>('[data-astylar-id="dialog-action"]');
    expect(background?.inert).toBeTrue();
    expect(dialog?.open).toBeTrue();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.inert).toBeFalse();
    expect(action?.inert).toBeFalse();

    bridge.reconcile({
      ...modalSiteData,
      root: { children: [
        modalSiteData.root.children[0],
        { ...modalSiteData.root.children[1], open: false, modal: false },
      ] },
    });
    expect(background?.inert).toBeFalse();
    expect(dialog?.open).toBeFalse();
    expect(dialog?.hasAttribute('aria-modal')).toBeFalse();
    bridge.dispose();
  });

  function siteData(): SiteData {
    return {
      styles: [],
      root: {
        children: [{
          type: 'main', id: 'main', children: [
            { type: 'h1', id: 'heading', textContent: 'Semantic heading' },
            { type: 'p', id: 'paragraph', textContent: 'Introductory copy.' },
            { type: 'a', id: 'link', href: '/details', textContent: 'Read more' },
          ],
        }],
      },
    };
  }
});
