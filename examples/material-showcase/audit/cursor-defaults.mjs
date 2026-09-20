import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { Astylar } from 'astylarui';
import { cursorInput } from './cursor-default-input.mjs';

const query = new URLSearchParams(location.search), mode = query.get('mode'), name = query.get('case');
const translated = query.get('translated') === 'true', site = cursorInput(name);
document.body.style.cssText = 'margin:0;padding:0';
const stage = document.createElement(mode === 'reference' ? 'div' : 'canvas');
stage.id = 'audit-stage';
stage.style.cssText = `position:relative;display:block;width:240px;height:140px;left:${translated ? 64 : 0}px;top:${translated ? 40 : 0}px;margin:0;padding:0`;
document.body.append(stage);
let application, surface;
const publicEvents = [];
if (mode === 'reference') {
  const css = document.createElement('style');
  css.textContent = site.styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${v}`).join(';')}}`).join('\n');
  document.head.append(css);
  function append(parent, description) {
    const node = document.createElement(description.type); node.id = description.id;
    node.textContent = description.textContent ?? description.value ?? ''; parent.append(node);
    for (const child of description.children ?? []) append(node, child);
  }
  for (const child of site.root.children) append(stage, child);
} else if (mode === 'astylar') {
  application = await createApplication({ providers: [provideZonelessChangeDetection()] });
  surface = application.injector.get(Astylar).mount(stage, site, {
    diagnostics: { logLevel: 'silent' }, events: { onEvent: event => publicEvents.push({ ...event }) },
  });
  await surface.whenSettled();
} else throw new Error('Expected reference or astylar mode');

async function settle() {
  await document.fonts.ready; await surface?.whenSettled();
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}
window.cursorDefaultAudit = {
  settle,
  snapshot(point) {
    const box = stage.getBoundingClientRect();
    const hit = document.elementFromPoint(point.x, point.y);
    const native = mode === 'reference' ? document.getElementById('target') : null;
    const style = native ? getComputedStyle(native) : null;
    const hitStyle = hit ? getComputedStyle(hit) : null;
    // The runner chooses a blank inset, but prove that it does not hit text
    // before interpreting CSS auto as the default arrow in the reference.
    let pointTouchesText = false;
    if (hit) {
      const walker = document.createTreeWalker(hit, NodeFilter.SHOW_TEXT);
      for (let node; (node = walker.nextNode());) {
        const range = document.createRange(); range.selectNodeContents(node);
        if ([...range.getClientRects()].some(r => point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom)) pointTouchesText = true;
      }
    }
    return { mode, name, translated, site: structuredClone(site), point,
      surfaceBox: { x: box.x, y: box.y, width: box.width, height: box.height },
      hit: { id: hit?.id ?? null, type: hit?.tagName.toLowerCase() ?? null, cursor: hitStyle?.cursor ?? null, pointTouchesText },
      target: native ? { cursor: style.cursor, pointerEvents: style.pointerEvents,
        box: { x: native.getBoundingClientRect().x, y: native.getBoundingClientRect().y,
          width: native.getBoundingClientRect().width, height: native.getBoundingClientRect().height } } : null,
      canvasCursor: mode === 'astylar' ? getComputedStyle(stage).cursor : null,
      resolved: surface?.inspectResolvedStyles() ?? null,
      publicEvents: [...publicEvents], diagnostics: surface?.diagnostics ?? null };
  },
  dispose() { surface?.dispose(); application?.destroy(); return { disposed: surface?.disposed ?? true }; },
};
