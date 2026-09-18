import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { Astylar } from 'astylarui';
import { verticalAlignInput } from './vertical-align-input.mjs';

const query = new URLSearchParams(location.search);
const mode = query.get('mode'), context = query.get('context'), alignment = query.get('alignment');
const translated = query.get('translated') === 'true', site = verticalAlignInput(context, alignment);
document.body.style.cssText = 'margin:0;padding:0;background:white';
const stage = document.createElement(mode === 'reference' ? 'div' : 'canvas');
stage.id = 'audit-stage';
stage.style.cssText = `position:relative;display:block;width:400px;height:200px;margin:0;padding:0;left:${translated ? 64 : 0}px;top:${translated ? 40 : 0}px`;
document.body.append(stage);
let application, surface;
if (mode === 'reference') {
  const sheet = document.createElement('style');
  // Public `root` denotes the surface document root, represented here by the host.
  sheet.textContent = site.styles.map(({ selector, ...values }) => `${selector === 'root' ? '#audit-stage' : selector}{${Object.entries(values)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
  document.head.append(sheet);
  function append(parent, data) {
    const element = document.createElement(data.type); element.id = data.id;
    if (data.textContent) element.textContent = data.textContent;
    parent.append(element); for (const child of data.children ?? []) append(element, child);
  }
  for (const child of site.root.children) append(stage, child);
} else if (mode === 'astylar') {
  application = await createApplication({ providers: [provideZonelessChangeDetection()] });
  surface = application.injector.get(Astylar).mount(stage, site, { diagnostics: { logLevel: 'silent' } });
} else throw new Error('Unknown renderer');

async function settle() {
  await document.fonts.ready; await surface?.whenSettled();
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}
await settle();
window.verticalAlignAudit = {
  settle,
  snapshot() {
    const box = stage.getBoundingClientRect();
    return { mode, context, alignment, translated, site: structuredClone(site),
      surfaceBox: { x: box.x, y: box.y, width: box.width, height: box.height },
      fontAvailable: document.fonts.check('20px Arial'), diagnostics: surface?.diagnostics ?? null,
      resolved: surface?.inspectResolvedStyles() ?? null,
      reference: mode === 'reference' ? ['parent', 'target', ...(context === 'inline' ? ['anchor'] : [])].map(id => {
        const element = document.getElementById(id), style = getComputedStyle(element), rect = element.getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(element); const text = range.getBoundingClientRect();
        return { id, box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          textBox: { x: text.x, y: text.y, width: text.width, height: text.height },
          style: Object.fromEntries(['display', 'position', 'verticalAlign', 'fontFamily', 'fontSize', 'fontWeight',
            'fontStyle', 'lineHeight', 'height', 'width', 'color'].map(key => [key, style[key]])) };
      }) : null };
  },
  dispose() { surface?.dispose(); application?.destroy(); return { disposed: surface?.disposed ?? true }; },
};
