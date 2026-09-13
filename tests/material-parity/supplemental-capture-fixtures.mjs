import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { propertyGroups } from './input-equivalence-policy.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const script = 'scripts/audit-material-picker-commits.mjs';
const sourceFiles = [script, 'tests/material-parity/supplemental-capture-evidence.mjs', 'tests/material-parity/input-tree-evidence.mjs'];
const propertyNames = ['fontFamily', 'lineHeight', 'direction'];
const assetTypes = ['document', 'script', 'stylesheet', 'font'];
const assetFiles = ['index.csr.html', 'main.js', 'styles.css', 'media/font.woff2'];

export function tooltipStateFixture() {
  const f = fixture(), raw = f.raw, runtime = structuredClone(raw.results[0].reference.runtime);
  Object.assign(raw, { schemaVersion: 1, profile: 'light', viewport: { width: 1440, height: 1000 },
    cohorts: ['benchmark-open', 'benchmark-hover', 'ordinary'], actions: ['initial', 'hover', 'press', 'release', 'leave'], settleDelayMs: 250 });
  raw.capture.styleProperties = Object.values(propertyGroups).flat();
  raw.capture.sources = ['scripts/audit-material-tooltip-state.mjs', ...sourceFiles.slice(1)].map(file => f.put(file, file));
  raw.results = [1, 2].flatMap(deviceScaleFactor => raw.cohorts.flatMap(cohort => {
    const events = [];
    return raw.actions.map(action => {
      const x = action === 'leave' ? 1 : 120, y = action === 'leave' ? 1 : 120;
      for (const type of ({ initial: [], hover: ['pointermove'], press: ['pointerdown'], release: ['pointerup', 'click'], leave: ['pointermove'] })[action])
        events.push({ type, trusted: true, clientX: x, clientY: y });
      const entry = { family: 'tooltip', deviceScaleFactor, cohort, action };
      for (const side of ['reference', 'astylar']) {
        const ref = side === 'reference', present = ref ? ['hover', 'press'].includes(action)
          : action === 'release' || (cohort !== 'benchmark-open' && ['hover', 'press'].includes(action));
        const tree = { nodes: [{ key: 'trigger', parent: null, ...(ref
          ? { type: 'button', attributes: { id: 'tooltip-primary', mattooltip: 'Create a project' } }
          : { authored: { id: 'tooltip-primary', type: 'button', value: 'Hover for help' } }) }], errors: [] };
        if (ref && present) tree.nodes.push({ key: 'wrapper', parent: null, attributes: { class: 'mat-mdc-tooltip-show' } },
          { key: 'popup', parent: 'wrapper', attributes: { class: 'mat-mdc-tooltip-surface' }, ownText: 'Create a project' });
        if (!ref) {
          Object.assign(tree, { resolvedStyleEvidenceVersion: 2, resolvedStyleSource: 'core-style-inspection', resolvedStyleRevision: 0 });
          if (present) tree.nodes.push({ key: 'popup', parent: null, authored: { id: 'tooltip-popup', role: 'tooltip', textContent: 'Create a project' },
            retainedText: { source: 'core-text-registry' } });
        }
        const stem = `artifacts/material-parity/fresh/picker-commit-audit/${deviceScaleFactor}-${cohort}-${action}-${side}`;
        const png = Buffer.alloc(24); Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
        png.writeUInt32BE(1440 * deviceScaleFactor, 16); png.writeUInt32BE(1000 * deviceScaleFactor, 20);
        f.bytes.set(path.resolve(f.options.root, `${stem}.png`), png);
        entry[side] = { runtime: structuredClone(runtime), events: structuredClone(events),
          triggerBox: { x: 100, y: 100, width: 40, height: 40 }, popupCount: Number(present), retainedPopupCount: Number(!ref && present),
          referencePopup: ref && present ? { text: 'Create a project' } : null, referenceShown: ref && present,
          candidateOpen: !ref && present, candidatePopupBox: !ref && present ? { left: 100, top: 140, width: 100, height: 24 } : null,
          inputTree: f.put(`${stem}.json`, tree), screenshot: { file: `${stem}.png`, sha256: hash(png) } };
      }
      entry.presenceMatches = entry.reference.popupCount === entry.astylar.popupCount;
      return entry;
    });
  }));
  return f;
}

export function calendarFixture() {
  const f = fixture();
  const raw = f.raw;
  raw.schemaVersion = 1;
  raw.profile = 'light';
  raw.viewport = { width: 1440, height: 900 };
  raw.capture.styleProperties = Object.values(propertyGroups).flat();
  raw.capture.sources = ['scripts/audit-material-calendar-close.mjs', ...sourceFiles.slice(1)].map(file => f.put(file, file));
  const runtime = structuredClone(raw.results[0].reference.runtime);
  raw.results = [1, 2].flatMap(deviceScaleFactor => ['month', 'multi-year'].map(view => {
    const sides = {};
    for (const side of ['reference', 'astylar']) {
      const events = [{ type: 'click', trusted: true, close: false }];
      const samples = ['opened', 'tab-close', 'blur-close', 'refocus-close', 'activate-close'].map((state, i) => {
        const isRef = side === 'reference', focused = isRef && (i === 1 || i === 3), closed = isRef && i === 4;
        const key = [null, 'Tab', 'Shift+Tab', 'Tab', 'Enter'][i];
        if (i) events.push({ type: 'keydown', key: i === 4 ? 'Enter' : 'Tab', trusted: true, close: isRef && i === 4 });
        if (focused) events.push({ type: 'focusin', trusted: true, close: true });
        if (isRef && i === 2) events.push({ type: 'focusout', trusted: true, close: true });
        if (closed) events.push({ type: 'click', trusted: true, close: true });
        const clip = focused ? 'auto' : 'rect(0px, 0px, 0px, 0px)';
        const tree = { schemaVersion: 1, nodes: [{ key: 'root', parent: null }], rules: [], errors: [], styles: [{ clip }] };
        if (isRef && !closed) tree.nodes.push(
          { key: 'dialog', parent: 'root', type: 'div', attributes: { role: 'dialog', 'aria-modal': 'true', class: 'mat-datepicker-content-container' } },
          { key: 'view', parent: 'dialog', type: view === 'month' ? 'mat-month-view' : 'mat-multi-year-view' },
          { key: 'close', parent: 'dialog', type: 'button', attributes: { type: 'button',
            class: `mat-datepicker-close-button${focused ? '' : ' cdk-visually-hidden'}` }, style: 0 },
          { key: 'label', parent: 'close', type: 'span', attributes: { class: 'mdc-button__label' }, ownText: 'Close calendar' });
        if (!isRef) {
          Object.assign(tree, { resolvedStyleEvidenceVersion: 2, resolvedStyleSource: 'core-style-inspection', resolvedStyleRevision: 0 });
          tree.nodes.push({ key: 'popup', parent: 'root', authored: { id: 'datepicker-popup', role: 'dialog' } });
          for (const id of ['datepicker-icon', 'datepicker-header', 'datepicker-month', 'datepicker-previous', 'datepicker-next']) {
            tree.nodes.push({ key: id, parent: 'popup', authored: { id } });
          }
          tree.nodes.push({ key: 'grid', parent: 'popup', authored: { id: view === 'month' ? 'datepicker-grid' : 'datepicker-year-grid' } });
          for (let n = 0; n < (view === 'month' ? 30 : 24); n++) tree.nodes.push({ key: `cell${n}`, parent: 'grid', authored: { type: 'button' } });
        }
        for (const node of tree.nodes) {
          if (isRef) Object.assign(node, { rules: [], pseudoElements: [], style: 0 });
          else {
            node.authored ??= {};
            Object.assign(node, { resolvedStyle: { color: '#123456' }, normalResolvedStyle: { color: '#123456' },
              interactionResolvedStyle: { color: '#123456' } });
          }
        }
        const stem = `artifacts/material-parity/fresh/picker-commit-audit/${view}-${deviceScaleFactor}-${side}-${state}`;
        const png = Buffer.alloc(24);
        Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
        png.writeUInt32BE(1440 * deviceScaleFactor, 16);
        png.writeUInt32BE(900 * deviceScaleFactor, 20);
        f.bytes.set(path.resolve(f.options.root, `${stem}.png`), png);
        return { state, key, open: !closed, openerFocused: closed, activeIsClose: focused,
          active: { tag: 'button', text: focused ? 'Close calendar' : '12', label: closed ? 'Open calendar' : null,
            class: 'mat-calendar-body-cell' }, controls: [], events: structuredClone(events),
          close: isRef && !closed ? { text: 'Close calendar', clip, clipPath: 'none', position: 'absolute', display: 'flex',
            visibility: 'visible', opacity: '1', box: { left: 65, top: 599, width: 142, height: 40 } } : null,
          inputTree: f.put(`${stem}.json`, tree), screenshot: { file: `${stem}.png`, sha256: hash(png) } };
      });
      sides[side] = { samples, runtime: structuredClone(runtime) };
    }
    return { family: 'datepicker', view, deviceScaleFactor, sides };
  }));
  return f;
}

export function fixture(root = path.resolve('virtual-capture-root')) {
  const bytes = new Map();
  const put = (file, value) => {
    const content = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
    bytes.set(path.resolve(root, file), content);
    return { file, sha256: hash(content) };
  };
  const assets = assetFiles.map((file, index) => ({ file, type: assetTypes[index], sha256: hash(`runtime ${file}`) }));
  const expectedProvenance = { browser: '152.0.0.0', browserFiles: assets.map(({ file, sha256 }) => ({ file, sha256 })), cases: ['pinned'] };
  const checkpointManifest = put('artifacts/material-parity/run/checkpoint/manifest.json', { schemaVersion: 1, provenance: expectedProvenance });
  const sources = sourceFiles.map(file => put(file, `source ${file}`));
  const reportFile = 'artifacts/material-parity/fresh/picker-commit-audit/latest-report.json';
  const sides = Object.fromEntries(['reference', 'astylar'].map(side => [side, {
    runtime: { assets: structuredClone(assets), errors: [] },
    inputTree: put(`artifacts/material-parity/fresh/picker-commit-audit/${side}.json`, { nodes: [{ key: side }], errors: [] }),
  }]));
  const raw = { browser: expectedProvenance.browser,
    capture: { schemaVersion: 1, checkpointManifest, sources, styleProperties: [...propertyNames] }, results: [sides] };
  const options = { root, reportFile, expectedProvenance, script, styleProperties: propertyNames,
    readBytes: absolute => { assert.ok(bytes.has(absolute), `Missing virtual evidence: ${absolute}`); return bytes.get(absolute); } };
  return { raw, options, bytes, put };
}
