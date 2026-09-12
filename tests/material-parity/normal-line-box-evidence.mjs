// Self-contained browser measurement. A temporary observer measures only the
// natural single-line box; it never changes a fixture or supplies layout input.
export function captureNormalLineBox({ referenceNode, expectedText, expectedStyle }) {
  const fail = (message) => { throw new Error(`Normal line-box evidence: ${message}`); };
  const parts = referenceNode.split('/');
  if (parts.shift() !== 'frame' || parts.some((part) => !/^\d+$/.test(part))) fail('unsupported reference path');
  let label = document.querySelector('app-reference .frame');
  for (const index of parts) label = label?.children[Number(index)];
  if (!(label instanceof HTMLElement) || label.tagName !== 'SPAN' || !label.classList.contains('mdc-button__label') ||
      label.parentElement?.tagName !== 'BUTTON' || label.children.length !== 0) fail('reference label identity changed');
  const text = [...label.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join('');
  if (!text.trim() || text !== expectedText || /[\r\n\t]/.test(text)) fail('reference text changed or is not single-line');
  const computed = getComputedStyle(label);
  if (computed.lineHeight !== 'normal' || computed.writingMode !== 'horizontal-tb' || document.fonts.status !== 'loaded') fail('unsupported line-height, writing mode or unsettled fonts');
  const capturedProperties = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'wordSpacing', 'textAlign', 'textTransform', 'textDecoration', 'whiteSpace'];
  for (const property of capturedProperties) {
    if (typeof expectedStyle[property] !== 'string' || computed[property] !== expectedStyle[property]) fail(`checkpoint typography changed: ${property}`);
  }
  const properties = [...new Set([...capturedProperties, 'fontStretch', 'fontKerning', 'fontFeatureSettings',
    'fontVariationSettings', 'fontVariant', 'fontVariantCaps', 'fontVariantLigatures', 'fontVariantNumeric',
    'fontVariantEastAsian', 'fontOpticalSizing', 'textRendering', 'direction', 'writingMode', 'textOrientation'])];
  const typography = Object.fromEntries(properties.map((property) => [property, computed[property]]));
  const observer = document.createElement('material-audit-line-box');
  observer.setAttribute('aria-hidden', 'true');
  observer.style.cssText = 'all:initial!important;position:fixed!important;left:-100000px!important;top:0!important;display:block!important;width:max-content!important;height:auto!important;padding:0!important;border:0!important;margin:0!important;white-space:pre!important;pointer-events:none!important';
  for (const [property, value] of Object.entries(typography)) {
    if (property !== 'whiteSpace') observer.style.setProperty(property.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase()), value, 'important');
  }
  observer.textContent = text;
  const before = label.getBoundingClientRect();
  document.body.append(observer);
  try {
    const actual = getComputedStyle(observer);
    for (const [property, value] of Object.entries(typography)) {
      if (property !== 'whiteSpace' && actual[property] !== value) fail(`observer typography differs: ${property}`);
    }
    for (const pseudo of ['::before', '::after']) if (!['none', 'normal'].includes(getComputedStyle(observer, pseudo).content)) fail('observer has generated content');
    const box = observer.getBoundingClientRect(), after = label.getBoundingClientRect();
    if (!Number.isFinite(box.height) || box.height <= 0 || !Number.isFinite(box.width) || box.width <= 0) fail('empty or invalid natural box');
    if (['x', 'y', 'width', 'height'].some((property) => before[property] !== after[property])) fail('observer disturbed the reference');
    const fontReady = document.fonts.check(`${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`, text);
    if (!fontReady) fail('reference font is not ready');
    return { schemaVersion: 1, source: 'browser-natural-single-line-box', referenceNode, text, typography,
      naturalHeight: box.height, naturalWidth: box.width, fontReady,
      fonts: [...document.fonts].filter((face) => face.status === 'loaded').map((face) => ({
        family: face.family, weight: face.weight, style: face.style, stretch: face.stretch, unicodeRange: face.unicodeRange, status: face.status })),
      viewport: { width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio },
      scope: 'Natural unwrapped horizontal line-height only. White-space pre prevents wrapping; original content and typography are retained. This does not establish wrapper layout, baseline, glyph raster, family-list or tracking equivalence.' };
  } finally { observer.remove(); }
}
