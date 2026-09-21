export const visibilityCases = ['omitted', 'visible', 'hidden', 'parent-hidden', 'child-visible', 'display-none'];

// One source of authored intent for both the native DOM and public SiteData.
// visibility is deliberately retained despite the documented public support gap.
export function visibilityInput(name) {
  if (!visibilityCases.includes(name)) throw new Error(`Unknown visibility case: ${name}`);
  const parent = { selector: '#parent', display: 'block', width: '120px', height: '60px', background: '#ff0000' };
  const child = { selector: '#child', display: 'block', width: '40px', height: '20px', background: '#0000ff' };
  if (name === 'visible') child.visibility = 'visible';
  if (name === 'hidden') child.visibility = 'hidden';
  if (name === 'parent-hidden' || name === 'child-visible') parent.visibility = 'hidden';
  if (name === 'child-visible') child.visibility = 'visible';
  if (name === 'display-none') parent.display = 'none';
  return { root: { children: [
    { type: 'div', id: 'parent', children: [{ type: 'div', id: 'child' }] },
    { type: 'div', id: 'after' },
  ] }, styles: [parent, child,
    { selector: '#after', display: 'block', width: '120px', height: '20px', background: '#00ff00' },
  ] };
}
