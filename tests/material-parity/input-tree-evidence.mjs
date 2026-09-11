// Self-contained so Playwright can evaluate it in the reference document.
// Collects inputs only; no measurements are fed back into layout.
export function captureBrowserInputTree({ styleProperties }) {
  const properties = [...new Set([...styleProperties, 'content', 'fill', 'stroke', 'strokeWidth'])];
  const nodes = [], styles = [], rules = [], errors = [];
  const styleIds = new Map(), ruleIds = new Map(), candidates = [];
  const declarations = (style) => Object.fromEntries([...style].map((property) => [property, {
    value: style.getPropertyValue(property).trim(), important: style.getPropertyPriority(property) === 'important',
  }]));
  const visitRules = (list, source, conditions = [], active = true) => {
    for (const [index, rule] of [...list].entries()) {
      const location = `${source}/${index}`;
      if (rule instanceof CSSStyleRule) {
        candidates.push({ source: location, selector: rule.selectorText, cssText: rule.style.cssText, declarations: declarations(rule.style), conditions, active });
      } else if ('cssRules' in rule) {
        const condition = rule.conditionText;
        const matches = rule instanceof CSSMediaRule ? matchMedia(condition).matches
          : typeof CSSSupportsRule !== 'undefined' && rule instanceof CSSSupportsRule ? CSS.supports(condition) : true;
        visitRules(rule.cssRules, location, condition ? [...conditions, condition] : conditions, active && matches);
      }
    }
  };
  for (const [index, sheet] of [...document.styleSheets].entries()) {
    try { visitRules(sheet.cssRules, `sheet:${index}`); }
    catch (error) { errors.push(`Unreadable stylesheet ${index}: ${String(error)}`); }
  }
  const styleId = (style) => {
    const snapshot = Object.fromEntries(properties.map((property) => [property, style[property]]));
    const signature = JSON.stringify(snapshot);
    if (!styleIds.has(signature)) { styleIds.set(signature, styles.length); styles.push(snapshot); }
    return styleIds.get(signature);
  };
  const matchingRules = (element, pseudo = '') => candidates.flatMap((rule) => {
    if (pseudo && !rule.selector.includes(pseudo)) return [];
    const selector = pseudo ? rule.selector.replaceAll(pseudo, '') : rule.selector;
    try { if (!element.matches(selector)) return []; } catch { return []; }
    if (!ruleIds.has(rule.source)) { ruleIds.set(rule.source, rules.length); rules.push(rule); }
    return [ruleIds.get(rule.source)];
  });
  const walk = (element, key, parent) => {
    if (['SCRIPT', 'STYLE', 'LINK', 'META'].includes(element.tagName)) return;
    const computed = getComputedStyle(element);
    const pseudoElements = ['::before', '::after'].map((pseudo) => {
      const style = getComputedStyle(element, pseudo);
      const generated = style.content !== 'none' && style.content !== 'normal';
      return { pseudo, generated, style: generated ? styleId(style) : undefined, rules: matchingRules(element, pseudo) };
    }).filter((pseudo) => pseudo.generated || pseudo.rules.length);
    nodes.push({
      key, parent, type: element.tagName.toLowerCase(),
      attributes: Object.fromEntries([...element.attributes].map(({ name, value }) => [name, value])),
      ownText: [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join(''),
      value: 'value' in element ? String(element.value) : undefined,
      style: styleId(computed), rules: matchingRules(element), inline: declarations(element.style), pseudoElements,
    });
    [...element.children].forEach((child, index) => walk(child, `${key}/${index}`, key));
  };
  const frame = document.querySelector('app-reference .frame');
  if (frame) walk(frame, 'frame', null); else errors.push('Reference frame is missing');
  [...document.querySelectorAll('.cdk-overlay-container')].forEach((element, index) => walk(element, `overlay:${index}`, null));
  return { schemaVersion: 1, nodes, styles, rules, errors };
}
