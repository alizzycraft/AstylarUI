import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { Astylar } from 'astylarui';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { visibilityInput } from './visibility-input.mjs';

const query = new URLSearchParams(location.search), mode = query.get('mode'), name = query.get('case');
const site = visibilityInput(name);
document.body.style.cssText = 'margin:0;padding:0;background:white';
const stage = document.createElement(mode === 'reference' ? 'div' : 'canvas');
stage.id = 'audit-stage';
stage.style.cssText = 'position:relative;display:block;width:240px;height:140px;margin:0;padding:0;background:white';
document.body.append(stage);
let application, surface;
if (mode === 'reference') {
  const css = document.createElement('style');
  css.textContent = site.styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${v}`).join(';')}}`).join('\n');
  document.head.append(css);
  function append(parent, description) {
    const node = document.createElement(description.type); node.id = description.id; parent.append(node);
    for (const child of description.children ?? []) append(node, child);
  }
  for (const child of site.root.children) append(stage, child);
} else if (mode === 'astylar') {
  application = await createApplication({ providers: [provideZonelessChangeDetection()] });
  surface = application.injector.get(Astylar).mount(stage, site, {
    clearColor: new Color4(1, 1, 1, 1), diagnostics: { logLevel: 'silent' },
  });
  await surface.whenSettled();
} else throw new Error('Expected reference or astylar mode');

window.visibilityAudit = {
  async settle() {
    await surface?.whenSettled();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  },
  snapshot(point) {
    const box = stage.getBoundingClientRect();
    const native = mode === 'reference' ? ['parent', 'child', 'after'].map(id => {
      const node = document.getElementById(id), style = getComputedStyle(node), bounds = node.getBoundingClientRect();
      return { id, visibility: style.visibility, display: style.display,
        box: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } };
    }) : null;
    return { mode, name, site: structuredClone(site), point, native,
      surfaceBox: { x: box.x, y: box.y, width: box.width, height: box.height },
      hit: mode === 'reference' ? document.elementFromPoint(point.x, point.y)?.id ?? null
        : surface.diagnostics.interaction.hoveredElementId,
      resolved: surface?.inspectResolvedStyles() ?? null, diagnostics: surface?.diagnostics ?? null };
  },
  dispose() { surface?.dispose(); application?.destroy(); return { disposed: surface?.disposed ?? true }; },
};
