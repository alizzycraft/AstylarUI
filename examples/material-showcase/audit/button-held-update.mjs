// Isolated public-API reproduction: no Material plugin, private renderer access,
// scene mutation, injected pointer events, or corrective styles.
import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { Astylar } from 'astylarui';

const query = new URLSearchParams(location.search), mode = query.get('mode');
const stackTracing = query.get('stacks') === 'true';
const initialSite = {
  root: { children: ['first', 'second'].map(id => ({ type: 'button', id, textContent: id,
    disabled: false, inputType: 'button' })) },
  styles: [
    { selector: 'button', position: 'absolute', top: '20px', width: '120px', height: '40px',
      display: 'block', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0',
      fontFamily: 'Arial', fontSize: '16px', fontWeight: '400', lineHeight: '20px',
      textAlign: 'center', color: '#000000', background: '#eeeeee', cursor: 'pointer' },
    { selector: '#first', left: '20px' }, { selector: '#second', left: '160px' },
    { selector: 'button:hover', background: '#dddddd' },
    { selector: 'button:active', background: '#bbbbbb' },
  ],
};
let site = structuredClone(initialSite), application, surface, css;
const nativeEvents = [], publicEvents = [], updates = [];
const identity = node => ({ tag: node?.tagName ?? null, id: node?.id ?? null,
  authoredId: node?.getAttribute?.('data-astylar-id') ?? null });
const stack = () => {
  if (!stackTracing) return null;
  const oldLimit = Error.stackTraceLimit;
  try { Error.stackTraceLimit = 60; return new Error('passive audit observation').stack; }
  finally { Error.stackTraceLimit = oldLimit; }
};
const eventTypes = ['pointermove', 'pointerdown', 'pointerup', 'pointercancel', 'click', 'focus', 'blur'];
const observeNative = event => nativeEvents.push({ type: event.type, time: performance.now(),
  trusted: event.isTrusted, buttons: event.buttons ?? null, target: identity(event.target),
  stack: ['blur', 'focus', 'pointerup', 'click'].includes(event.type) ? stack() : null });
for (const type of eventTypes) document.addEventListener(type, observeNative, true);
document.body.style.cssText = 'margin:0;padding:0';
const stage = document.createElement(mode === 'reference' ? 'div' : 'canvas');
stage.id = 'audit-stage';
stage.style.cssText = 'position:relative;display:block;width:400px;height:160px;margin:0;padding:0';
document.body.append(stage);
const cssText = rules => rules.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
  .map(([key, value]) => `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
if (mode === 'reference') {
  css = document.createElement('style'); css.textContent = cssText(site.styles); document.head.append(css);
  for (const child of site.root.children) {
    const button = document.createElement('button'); button.id = child.id; button.type = child.inputType;
    button.disabled = child.disabled; button.textContent = child.textContent; stage.append(button);
  }
} else if (mode === 'astylar') {
  application = await createApplication({ providers: [provideZonelessChangeDetection()] });
  surface = application.injector.get(Astylar).mount(stage, site, {
    diagnostics: { logLevel: 'silent' }, events: { onEvent: event => publicEvents.push({
      ...event, time: performance.now(), stack: ['pointerup', 'click'].includes(event.type) ? stack() : null }) },
  });
  await surface.whenSettled();
} else throw new Error('Expected reference or astylar mode');

const initialNodes = site.root.children.map(child => mode === 'reference' ? document.getElementById(child.id)
  : document.querySelector(`[data-astylar-id="${child.id}"]`));
async function settle() {
  await document.fonts.ready; await surface?.whenSettled();
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}
window.buttonHeldUpdateAudit = {
  settle,
  async update(kind) {
    if (!['equivalent', 'sibling-text', 'sibling-paint'].includes(kind)) throw new Error('Unknown update');
    const next = structuredClone(site);
    if (kind === 'sibling-text') next.root.children[1].textContent = 'changed';
    if (kind === 'sibling-paint') next.styles[2].background = '#abcdef';
    updates.push({ kind, time: performance.now(), before: structuredClone(site), after: structuredClone(next) });
    site = next;
    if (mode === 'reference') {
      if (kind === 'sibling-text') document.getElementById('second').textContent = next.root.children[1].textContent;
      if (kind === 'sibling-paint') css.textContent = cssText(next.styles);
    } else await surface.update(next);
    await settle();
  },
  snapshot() {
    const controls = site.root.children.map((child, index) => {
      const node = mode === 'reference' ? document.getElementById(child.id)
        : document.querySelector(`[data-astylar-id="${child.id}"]`);
      if (!node) throw new Error(`Missing ${mode} button ${child.id}`);
      return { id: child.id, tag: node.tagName, nativeType: node.type, text: node.textContent,
        disabled: node.disabled, tabIndex: node.tabIndex, retainedNativeNode: node === initialNodes[index],
        ...(mode === 'reference' ? { active: node.matches(':active'), hovered: node.matches(':hover'),
          computed: Object.fromEntries(['backgroundColor', 'width', 'height', 'left', 'top', 'fontSize', 'lineHeight']
            .map(p => [p, getComputedStyle(node)[p]])) } : {}) };
    });
    return { mode, stackTracing, time: performance.now(), site: structuredClone(site), initialSite,
      active: identity(document.activeElement), controls, nativeEvents: [...nativeEvents], publicEvents: [...publicEvents],
      updates: structuredClone(updates), diagnostics: surface?.diagnostics ?? null,
      resolved: surface?.inspectResolvedStyles() ?? null };
  },
  dispose() {
    surface?.dispose(); application?.destroy();
    for (const type of eventTypes) document.removeEventListener(type, observeNative, true);
    return { disposed: surface?.disposed ?? true };
  },
};
