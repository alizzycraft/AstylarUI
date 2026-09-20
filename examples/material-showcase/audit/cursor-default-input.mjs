export const cursorCases = ['button-omitted', 'button-default', 'button-pointer', 'button-hover',
  'button-parent', 'label-omitted', 'label-default', 'label-parent', 'div-parent'];

export function cursorInput(name) {
  if (!cursorCases.includes(name)) throw new Error(`Unknown cursor case ${name}`);
  const [type, declaration] = name.split('-');
  return { root: { children: [{ type: 'div', id: 'parent', children: [{ type, id: 'target',
    ...(type === 'button' ? { value: 'Target' } : { textContent: 'Target' }) }] }] },
  styles: [
    { selector: '#parent', position: 'absolute', left: '20px', top: '32px', width: '180px', height: '72px',
      display: 'block', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0',
      background: '#eeeeee', ...(declaration === 'parent' ? { cursor: 'pointer' } : {}) },
    { selector: '#target', position: 'absolute', left: '16px', top: '16px', width: '140px', height: '40px',
      display: 'block', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', borderRadius: '0',
      background: '#ffffff', color: '#111111', fontFamily: 'Arial', fontSize: '16px', lineHeight: '24px',
      ...(declaration === 'default' || declaration === 'pointer' ? { cursor: declaration } : {}) },
    ...(declaration === 'hover' ? [{ selector: '#target:hover', cursor: 'pointer' }] : []),
  ] };
}
