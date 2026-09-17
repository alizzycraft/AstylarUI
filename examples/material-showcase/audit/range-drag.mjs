// Public core-control reduction. Both sides consume the same document and
// declarations; no Material plugin, private inspection or mesh mutation.
import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { Astylar } from 'astylarui';

const query = new URLSearchParams(location.search), mode = query.get('mode');
const translated = query.get('translated') === 'true';
const stackTracing = query.get('stacks') === 'true';
const site = {
  root: { children: ['first', 'second'].map((id, i) => ({ type: 'input', inputType: 'range', id,
    min: '0', max: '100', step: '5', value: i ? '65' : '30', ariaLabel: id })) },
  styles: [
    { selector: 'input', position: 'absolute', top: '40px', width: '160px', height: '40px',
      display: 'block', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0' },
    { selector: '#first', left: '20px' }, { selector: '#second', left: '240px' },
  ],
};
document.body.style.cssText = 'margin:0;padding:0';
const stage = document.createElement(mode === 'reference' ? 'div' : 'canvas');
stage.id = 'audit-stage';
stage.style.cssText = `position:relative;display:block;width:440px;height:140px;margin:0;padding:0;left:${translated ? 64 : 0}px;top:${translated ? 40 : 0}px`;
document.body.append(stage);
const nativeEvents = [], publicEvents = [], updates = [];
const identity = node => ({ tag: node?.tagName ?? null, id: node?.id ?? null,
  authoredId: node?.getAttribute?.('data-astylar-id') ?? null });
const types = ['pointermove', 'pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture',
  'lostpointercapture', 'input', 'change', 'focus', 'blur'];
const stack = () => {
  if (!stackTracing) return null;
  const previous = Error.stackTraceLimit;
  try { Error.stackTraceLimit = 60; return new Error('passive range audit observation').stack; }
  finally { Error.stackTraceLimit = previous; }
};
const observe = e => nativeEvents.push({ type: e.type, time: performance.now(), trusted: e.isTrusted,
  buttons: e.buttons ?? null, pointerId: e.pointerId ?? null, clientX: e.clientX ?? null,
  clientY: e.clientY ?? null, target: identity(e.target), value: e.target?.value ?? null,
  stack: ['focus', 'blur', 'pointerup'].includes(e.type) ? stack() : null });
for (const type of types) document.addEventListener(type, observe, true);
let application, surface;
if (mode === 'reference') {
  const css = document.createElement('style');
  css.textContent = site.styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
  document.head.append(css);
  for (const child of site.root.children) {
    const input = document.createElement('input');
    for (const p of ['id', 'min', 'max', 'step', 'value']) input[p] = child[p];
    input.type = child.inputType; input.setAttribute('aria-label', child.ariaLabel); stage.append(input);
  }
} else if (mode === 'astylar') {
  application = await createApplication({ providers: [provideZonelessChangeDetection()] });
  surface = application.injector.get(Astylar).mount(stage, site, {
    diagnostics: { logLevel: 'silent' }, events: { onEvent: e => publicEvents.push({ ...e, time: performance.now(),
      stack: e.type === 'pointerup' ? stack() : null }) },
  });
  await surface.whenSettled();
} else throw new Error('Expected reference or astylar mode');

async function settle() {
  await document.fonts.ready; await surface?.whenSettled();
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}
window.rangeDragAudit = {
  settle,
  async update() {
    // Identical authored replacement. Native reference requires no DOM mutation.
    updates.push({ time: performance.now(), document: structuredClone(site) });
    if (surface) await surface.update(structuredClone(site));
    await settle();
  },
  snapshot() {
    const controls = site.root.children.map(child => {
      const node = mode === 'reference' ? document.getElementById(child.id)
        : document.querySelector(`[data-astylar-id="${child.id}"]`);
      if (!(node instanceof HTMLInputElement)) throw new Error(`Missing ${mode} range ${child.id}`);
      const box = node.getBoundingClientRect();
      return { id: child.id, type: node.type, min: node.min, max: node.max, step: node.step,
        value: node.value, disabled: node.disabled, focused: node === document.activeElement,
        // Candidate DOM is a semantic mirror, not canvas geometry evidence.
        nativeBox: { x: box.x, y: box.y, width: box.width, height: box.height } };
    });
    const box = stage.getBoundingClientRect();
    return { mode, translated, stackTracing, site: structuredClone(site), controls, time: performance.now(),
      surfaceBox: { x: box.x, y: box.y, width: box.width, height: box.height },
      nativeEvents: [...nativeEvents], publicEvents: [...publicEvents], updates: structuredClone(updates),
      active: identity(document.activeElement), diagnostics: surface?.diagnostics ?? null,
      resolved: surface?.inspectResolvedStyles() ?? null };
  },
  dispose() {
    surface?.dispose(); application?.destroy();
    for (const type of types) document.removeEventListener(type, observe, true);
    return { disposed: surface?.disposed ?? true };
  },
};
