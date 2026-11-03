import { cursorInput as existingInput } from './cursor-default-input.mjs';

// Diagnostic variants only. Native CSS and public Astylar mount consume this
// same object; no Material plugin, state callbacks, or private API is required.
export function cursorInput(name) {
  const bases = { transparent: 'transparent', rgba: 'rgba(0,0,0,0)', opaque: '#ffffff' };
  if (!Object.hasOwn(bases, name)) throw new Error(`Unknown background control ${name}`);
  const site = existingInput('button-hover');
  site.styles.find(r => r.selector === '#target').background = bases[name];
  site.styles.find(r => r.selector === '#target:hover').background = '#ebebeb';
  return site;
}
