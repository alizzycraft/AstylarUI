// Serialized directly into the browser. Never feed these observations into
// fixture styling or renderer layout. Kept separate from the frozen static probe.
export function hasControlTextOwners({ targets }) {
  if (!Array.isArray(targets) || !targets.length || document.fonts.status !== 'loaded') return false;
  return targets.every(target => {
    const [root, ...parts] = String(target.referenceNode).split('/');
    if (parts.some(part => !/^(0|[1-9]\d*)$/.test(part))) return false;
    let node;
    if (root === 'frame') {
      const roots = document.querySelectorAll('app-reference .frame'); if (roots.length !== 1) return false;
      node = roots[0];
    } else if (/^overlay:(0|[1-9]\d*)$/.test(root)) node = document.querySelectorAll('.cdk-overlay-container')[Number(root.slice(8))];
    else return false;
    for (const part of parts) node = node?.children[Number(part)];
    return node instanceof HTMLElement && node.tagName.toLowerCase() === target.type &&
      [...node.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('') === target.ownText;
  });
}

export function captureControlLineBox({ chain, expectedStyle }) {
  const fail = message => { throw new Error(`Control line-box evidence: ${message}`); };
  if (!Array.isArray(chain) || !chain.length || !expectedStyle) fail('missing owner or style evidence');
  const ownText = element => [...element.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('');
  const attrs = element => Object.fromEntries([...element.attributes].map(a => [a.name, a.value]));
  const same = (a, b) => JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b ?? {}).sort());
  let label;
  for (const [index, expected] of chain.entries()) {
    if (index === 0) {
      if (expected.parent !== null) fail('owner chain must begin at an input-tree root');
      if (expected.key === 'frame') {
        const frames = document.querySelectorAll('app-reference .frame');
        if (frames.length !== 1) fail('ambiguous frame root');
        label = frames[0];
      } else if (/^overlay:(0|[1-9]\d*)$/.test(expected.key)) {
        label = document.querySelectorAll('.cdk-overlay-container')[Number(expected.key.slice(8))];
      } else fail('unsupported root');
    } else {
      const parent = chain[index - 1];
      if (expected.parent !== parent.key || !expected.key.startsWith(parent.key + '/')) fail('broken owner chain');
      const child = expected.key.slice(parent.key.length + 1);
      if (!/^(0|[1-9]\d*)$/.test(child)) fail('invalid child index');
      label = label?.children[Number(child)];
    }
    if (!(label instanceof HTMLElement) || label.tagName.toLowerCase() !== expected.type ||
        !same(attrs(label), expected.attributes) || ownText(label) !== expected.ownText) fail('owner identity changed');
  }
  const text = ownText(label);
  if (label.tagName !== 'SPAN' || label.children.length || !text.trim() || /[\r\n\t]/.test(text)) fail('unsupported direct text owner');
  const computed = getComputedStyle(label);
  if (computed.lineHeight !== 'normal' || computed.writingMode !== 'horizontal-tb' || document.fonts.status !== 'loaded')
    fail('unsupported line-height, writing mode or unsettled fonts');
  const required = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'wordSpacing',
    'textAlign', 'textTransform', 'textDecoration', 'whiteSpace', 'direction', 'writingMode',
    'fontKerning', 'textRendering', 'fontVariantLigatures', 'fontFeatureSettings', 'fontVariationSettings'];
  for (const property of required) if (typeof expectedStyle[property] !== 'string' || computed[property] !== expectedStyle[property])
    fail(`captured typography changed: ${property}`);
  const properties = [...new Set([...required, 'fontStretch', 'fontVariant', 'fontVariantCaps', 'fontVariantNumeric',
    'fontVariantEastAsian', 'fontOpticalSizing', 'textOrientation'])];
  const typography = Object.fromEntries(properties.map(property => [property, computed[property]]));
  const observer = document.createElement('material-audit-control-line-box');
  observer.setAttribute('aria-hidden', 'true');
  observer.style.cssText = 'all:initial!important;position:fixed!important;left:-100000px!important;top:0!important;display:block!important;width:max-content!important;height:auto!important;padding:0!important;border:0!important;margin:0!important;white-space:pre!important;pointer-events:none!important';
  for (const [property, value] of Object.entries(typography)) if (property !== 'whiteSpace')
    observer.style.setProperty(property.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()), value, 'important');
  observer.textContent = text;
  const before = label.getBoundingClientRect().toJSON(), active = document.activeElement;
  const selection = getSelection(), selected = selection && { anchor: selection.anchorNode, anchorOffset: selection.anchorOffset,
    focus: selection.focusNode, focusOffset: selection.focusOffset };
  document.body.append(observer);
  try {
    const actual = getComputedStyle(observer);
    for (const [property, value] of Object.entries(typography)) if (property !== 'whiteSpace' && actual[property] !== value)
      fail(`observer typography differs: ${property}`);
    for (const pseudo of ['::before', '::after']) if (!['none', 'normal'].includes(getComputedStyle(observer, pseudo).content))
      fail('observer has generated content');
    // Computed width/height of this auto-sized block are CSS used values.
    // getBoundingClientRect alone would include a transformed body ancestor.
    const used = property => {
      const value = actual[property];
      if (!/^\d+(?:\.\d+)?px$/.test(value) || !(Number.parseFloat(value) > 0)) fail(`invalid used ${property}`);
      return Number.parseFloat(value);
    };
    const naturalHeight = used('height'), naturalWidth = used('width');
    const after = label.getBoundingClientRect().toJSON();
    if (!same(before, after) || active !== document.activeElement || (selected && (selection.anchorNode !== selected.anchor ||
        selection.anchorOffset !== selected.anchorOffset || selection.focusNode !== selected.focus ||
        selection.focusOffset !== selected.focusOffset))) fail('observer disturbed reference geometry, focus or selection');
    if (!document.fonts.check(`${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`, text))
      fail('reference font not ready');
    return { schemaVersion: 1, source: 'browser-control-natural-css-line-box', referenceNode: chain.at(-1).key,
      chain, text, typography, naturalHeight, naturalWidth, fontReady: true,
      observerViewportBox: observer.getBoundingClientRect().toJSON(), referenceViewportBox: before,
      fonts: [...document.fonts].filter(face => face.status === 'loaded').map(face => ({ family: face.family,
        weight: face.weight, style: face.style, stretch: face.stretch, unicodeRange: face.unicodeRange, status: face.status })),
      viewport: { width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio },
      scope: 'CSS used natural single-line metrics only. Viewport boxes are separate projected observations. No input equivalence, wrapped layout, baseline, visibility or raster verdict.' };
  } finally { observer.remove(); }
}
