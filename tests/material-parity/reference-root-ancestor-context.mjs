// Supplemental, read-only DOM evidence. This does not replace existing input
// trees, infer used values, or feed browser measurements into Astylar layout.
export function captureReferenceRootAncestorContext() {
  const errors = [], nodes = [], seen = new Map();
  const domPath = element => {
    const parts = [];
    for (let node = element; node; node = node.parentElement) {
      parts.unshift(node.parentElement ? [...node.parentElement.children].indexOf(node) : node.tagName.toLowerCase());
    }
    return parts.join('/');
  };
  const declarations = style => Object.fromEntries([...style].map(property => [property, {
    value: style.getPropertyValue(property).trim(), important: style.getPropertyPriority(property) === 'important',
  }]));
  const record = element => {
    if (seen.has(element)) return seen.get(element);
    const key = domPath(element);
    seen.set(element, key);
    const style = getComputedStyle(element);
    nodes.push({ key, parent: element.parentElement ? domPath(element.parentElement) : null,
      type: element.tagName.toLowerCase(), attributes: Object.fromEntries([...element.attributes].map(a => [a.name, a.value])),
      inline: declarations(element.style),
      computed: Object.fromEntries([...style].map(property => [property, style.getPropertyValue(property).trim()])),
      viewportRect: element.getBoundingClientRect().toJSON(), scrollLeft: element.scrollLeft, scrollTop: element.scrollTop });
    return key;
  };
  const selected = [];
  const frame = document.querySelector('app-reference .frame');
  if (frame) selected.push(['frame', frame]); else errors.push('Reference frame is missing');
  [...document.querySelectorAll('.cdk-overlay-container')].forEach((element, index) => selected.push([`overlay:${index}`, element]));
  const roots = selected.map(([captureKey, element]) => {
    const ancestry = [];
    for (let node = element; node; node = node.parentElement) ancestry.push(record(node));
    if (element.getRootNode() !== document) errors.push(`Root ${captureKey} crosses an uncaptured shadow boundary`);
    return { captureKey, node: ancestry[0], ancestry };
  });
  // Preserve ordered CSSOM source, including nested rules and stylesheet media,
  // instead of attempting a second cascade or selector engine in the audit.
  const sheets = [...document.styleSheets, ...(document.adoptedStyleSheets ?? [])].map((sheet, index) => {
    const metadata = { index, href: sheet.href, disabled: sheet.disabled, media: sheet.media.mediaText,
      owner: sheet.ownerNode?.nodeType === Node.ELEMENT_NODE ? domPath(sheet.ownerNode) : null };
    try { return { ...metadata, rules: [...sheet.cssRules].map(rule => rule.cssText) }; }
    catch (error) { errors.push(`Unreadable stylesheet ${index}: ${String(error)}`); return { ...metadata, rules: null }; }
  });
  return { schemaVersion: 1, kind: 'supplemental-reference-root-ancestor-context',
    documentUrl: location.href, viewport: { width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio },
    documentScroll: { x: scrollX, y: scrollY }, roots, nodes, sheets, errors,
    limitation: 'Computed context and raw CSSOM source only; no used-value, containing-block-owner, candidate or rendering-equivalence inference.' };
}
