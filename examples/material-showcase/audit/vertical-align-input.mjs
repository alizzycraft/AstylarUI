// One document/declaration source for both renderers. Diagnostic only.
export const contexts = ['block', 'flex-item', 'absolute', 'inline'];
export const alignments = ['baseline', 'middle', 'bottom', 'omitted'];
export function verticalAlignInput(context, alignment) {
  if (!contexts.includes(context) || !alignments.includes(alignment)) throw new Error('Unknown diagnostic variant');
  return {
    root: { children: [{ type: 'div', id: 'parent', children: [
      ...(context === 'inline' ? [{ type: 'span', id: 'anchor', textContent: 'H' }] : []),
      { type: 'span', id: 'target', textContent: 'Label Hgp' },
    ] }] },
    styles: [
      { selector: '*', margin: '0', padding: '0', borderWidth: '0', boxSizing: 'border-box',
        fontFamily: 'Arial', fontSize: '20px', fontWeight: '400', fontStyle: 'normal',
        lineHeight: '24px', letterSpacing: '0px', whiteSpace: 'nowrap', color: '#0033cc', background: 'transparent' },
      { selector: '#parent', position: 'absolute', top: '20px', left: '20px', width: '320px', height: '120px',
        display: context === 'flex-item' ? 'flex' : 'block', background: '#eeeeee',
        ...(context === 'flex-item' ? { alignItems: 'flex-start', justifyContent: 'flex-start' } : {}) },
      { selector: '#target', display: context === 'inline' ? 'inline' : 'block', width: '200px', height: '80px',
        ...(alignment !== 'omitted' ? { verticalAlign: alignment } : {}),
        ...(context === 'absolute' ? { position: 'absolute', top: '0px', left: '0px' } : {}) },
      ...(context === 'inline' ? [{ selector: '#anchor', display: 'inline', fontSize: '40px', lineHeight: '80px', color: '#cc3300' }] : []),
      { selector: 'root', background: '#ffffff' },
    ],
  };
}
