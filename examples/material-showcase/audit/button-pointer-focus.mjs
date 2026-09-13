// Isolated browser-only audit entry. No Material code, renderer-private imports,
// scene mutation, focus injection, application updates, or corrective styles.
import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { Astylar } from 'astylarui';

const mode = new URLSearchParams(location.search).get('mode');
const styles = [
  { selector: 'button', position: 'absolute', top: '20px', width: '120px', height: '40px',
    display: 'block', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0',
    fontFamily: 'Arial', fontSize: '16px', fontWeight: '400', lineHeight: '20px',
    textAlign: 'center', color: '#000000', background: '#eeeeee', cursor: 'pointer' },
  { selector: '#first', left: '20px' },
  { selector: '#second', left: '160px' },
];
const children = ['first', 'second'].map(id => ({ type: 'button', id,
  textContent: id, disabled: false, inputType: 'button' }));
const site = { root: { children }, styles };
const authored = JSON.stringify(site);
const nativeEvents = [], publicEvents = [];
const identity = node => ({ tag: node?.tagName ?? null, id: node?.id ?? null,
  authoredId: node?.getAttribute?.('data-astylar-id') ?? null });
for (const type of ['pointermove', 'pointerdown', 'pointerup', 'click', 'keydown', 'keyup', 'focusin', 'focusout']) {
  document.addEventListener(type, event => nativeEvents.push({ type, trusted: event.isTrusted,
    key: event.key ?? null, buttons: event.buttons ?? null, target: identity(event.target) }), true);
}
document.body.style.cssText = 'margin:0;padding:0';
let application, surface, css;
const stage = document.createElement(mode === 'reference' ? 'div' : 'canvas');
stage.id = 'audit-stage';
stage.style.cssText = 'position:relative;display:block;width:400px;height:160px;margin:0;padding:0';
document.body.append(stage);
if (mode === 'reference') {
  css = document.createElement('style');
  css.textContent = styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
  document.head.append(css);
  for (const child of children) {
    const button = document.createElement('button');
    button.id = child.id;
    button.type = child.inputType;
    button.disabled = child.disabled;
    button.textContent = child.textContent;
    stage.append(button);
  }
} else if (mode === 'astylar') {
  application = await createApplication({ providers: [provideZonelessChangeDetection()] });
  surface = application.injector.get(Astylar).mount(stage, site, {
    diagnostics: { logLevel: 'silent' },
    events: { onEvent: event => publicEvents.push({ ...event }) },
  });
  await surface.whenSettled();
} else throw new Error('Expected reference or astylar mode');

window.buttonFocusAudit = {
  async settle() {
    await document.fonts.ready;
    await surface?.whenSettled();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  },
  snapshot() {
    const active = identity(document.activeElement);
    const controls = children.map(child => {
      const node = mode === 'reference' ? document.getElementById(child.id)
        : document.querySelector(`[data-astylar-id="${child.id}"]`);
      if (!node) throw new Error(`Missing ${mode} button ${child.id}`);
      return { id: child.id, tag: node.tagName, disabled: node.disabled,
        tabIndex: node.tabIndex, text: node.textContent, nativeType: node.type };
    });
    return { mode, authored: site, authoredUnchanged: JSON.stringify(site) === authored,
      referenceCss: css?.textContent ?? null, active,
      activeButton: mode === 'reference' ? (children.some(c => c.id === active.id) ? active.id : null) : active.authoredId,
      controls, nativeEvents: [...nativeEvents], publicEvents: [...publicEvents],
      diagnostics: surface?.diagnostics ?? null, resolved: surface?.inspectResolvedStyles() ?? null };
  },
  dispose() { surface?.dispose(); application?.destroy(); },
};
