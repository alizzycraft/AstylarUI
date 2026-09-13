import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { calendarFixture, tooltipStateFixture } from './supplemental-capture-fixtures.mjs';
import { collectCalendarCloseEvidence } from './calendar-close-evidence.mjs';
import { collectTooltipStateEvidence } from './tooltip-state-evidence.mjs';
import { supplementalLineBoxSequences, supplementalLineBoxCaseKey as caseKey } from './supplemental-line-box-evidence.mjs';
import { propertyGroups } from './input-equivalence-policy.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const style = { fontFamily: 'Roboto', fontSize: '14px', fontWeight: '500', fontStyle: 'normal', lineHeight: 'normal',
  letterSpacing: '0.096px', wordSpacing: '0px', textAlign: 'center', textTransform: 'none', textDecoration: 'none', whiteSpace: 'normal',
  direction: 'ltr', writingMode: 'horizontal-tb', fontKerning: 'auto', textRendering: 'auto', fontVariantLigatures: 'normal',
  fontFeatureSettings: 'normal', fontVariationSettings: 'normal' };

// Portable, in-memory report fixtures reuse the original source validators.
// No retained local browser artifacts are required by these regression tests.
export function supplementalMetricFixture() {
  const calendar = calendarFixture(), tooltip = tooltipStateFixture(), root = calendar.options.root;
  const files = new Map([...calendar.bytes, ...tooltip.bytes]);
  const putBytes = (file, bytes) => { files.set(path.resolve(root, file), bytes); return { file, sha256: digest(bytes) }; };
  const put = (file, value) => putBytes(file, Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)));
  const readBytes = file => { assert.ok(files.has(file), `Missing virtual metric evidence ${file}`); return files.get(file); };
  const read = file => JSON.parse(readBytes(path.resolve(root, file)));
  const base = 'artifacts/material-parity/supplemental-metric-reader-test';
  for (const [kind, source] of [['calendar', calendar], ['tooltip', tooltip]]) {
    const references = kind === 'calendar' ? source.raw.results.flatMap(e => e.sides.reference.samples) : source.raw.results.map(e => e.reference);
    for (const sample of references) {
      const tree = read(sample.inputTree.file);
      tree.schemaVersion = 1; tree.styles ??= []; const styleIndex = tree.styles.length; tree.styles.push(structuredClone(style));
      if (kind === 'calendar' && sample.open) {
        tree.nodes.push({ key: 'overlay:0', parent: null, type: 'mat-datepicker-content', attributes: {}, ownText: '', style: styleIndex },
          { key: 'overlay:0/0', parent: 'overlay:0', type: 'span', attributes: {}, ownText: 'SEP 2026', style: styleIndex });
      }
      if (kind === 'tooltip') {
        const trigger = tree.nodes.find(n => n.attributes?.id === 'tooltip-primary');
        Object.assign(trigger, { key: 'frame/0', parent: 'frame', ownText: '', style: styleIndex });
        tree.nodes.push({ key: 'frame', parent: null, type: 'main', attributes: {}, ownText: '', style: styleIndex },
          { key: 'frame/0/0', parent: 'frame/0', type: 'span', attributes: {}, ownText: 'Hover for help', style: styleIndex });
      }
      sample.inputTree = put(sample.inputTree.file, tree);
    }
  }
  const sourceReports = [put('artifacts/material-parity/fresh/picker-commit-audit/calendar-report.json', calendar.raw),
    put('artifacts/material-parity/fresh/picker-commit-audit/tooltip-report.json', tooltip.raw)];
  const expectedProvenance = calendar.options.expectedProvenance;
  const sources = [collectCalendarCloseEvidence, collectTooltipStateEvidence].map((collect, index) =>
    collect(root, { reportPath: sourceReports[index].file, expectedProvenance, readBytes }));
  for (const source of sources) { assert.equal(source.complete, true, JSON.stringify(source.errors)); assert.deepEqual(source.errors, []); }
  const cases = sources.flatMap(s => s.cases), inventory = { errors: [], cases: [], variants: [], styles: [] };
  const comparisons = [], records = [], trees = [];
  for (const sequence of supplementalLineBoxSequences(cases)) {
    const events = [];
    const event = (type, key = null, clientX = null, clientY = null) => ({ type, key, trusted: true, id: '', tag: 'SPAN', clientX, clientY });
    if (sequence.family === 'datepicker') for (let i = 0; i < (sequence.view === 'multi-year' ? 2 : 1); i++)
      events.push(...['pointerdown', 'pointerup', 'click'].map(type => event(type, null, 120, 120)));
    for (const [index, selected] of sequence.entries.entries()) {
      if (sequence.family === 'datepicker') {
        const keys = [[], ['Tab'], ['Shift', 'Tab'], ['Tab'], ['Enter']][index];
        events.push(...keys.map(key => event('keydown', key)));
        if (index === 4) events.push(event('click', null, 0, 0));
      } else {
        for (const type of [[], ['pointermove'], ['pointerdown'], ['pointerup', 'click'], ['pointermove']][index])
          events.push(event(type, null, index === 4 ? 1 : 120, index === 4 ? 1 : 120));
      }
      const key = caseKey(selected), stem = `${base}/${digest(key)}`, tree = read(selected.inputTrees.reference.file);
      const variant = structuredClone(tree);
      for (const node of variant.nodes) if (node.style !== undefined) {
        const originalStyle = tree.styles[node.style]; node.style = inventory.styles.length;
        inventory.styles.push({ side: 'reference', value: structuredClone(originalStyle) });
      }
      inventory.cases.push({ case: key, side: 'reference', variant: inventory.variants.length }); inventory.variants.push(variant);
      const closed = sequence.family === 'datepicker' && index === 4;
      const measurements = [];
      if (!closed) {
        const referenceNode = sequence.family === 'datepicker' ? 'overlay:0/0' : 'frame/0/0';
        const element = sequence.family === 'datepicker' ? 'datepicker-month' : 'tooltip-primary';
        const properties = { lineHeight: { reference: 'normal', painted: '17px' }, fontSize: { reference: '14px', painted: '14px' } };
        const target = { case: key, element, referenceNode, astylarNode: 'candidate/0', properties }; comparisons.push(target);
        const chain = []; let node = tree.nodes.find(n => n.key === referenceNode);
        while (node) {
          const { key, parent, type, attributes, ownText } = node;
          chain.unshift({ key, parent, type, attributes, ownText }); node = tree.nodes.find(n => n.key === node.parent);
        }
        const box = { x: 0, y: 0, top: 0, left: 0, width: 80, height: 17, right: 80, bottom: 17 };
        measurements.push({ element, referenceNode, schemaVersion: 1, source: 'browser-control-natural-css-line-box',
          checkpointReferenceNode: referenceNode, checkpointCandidateNode: target.astylarNode,
          checkpointTypography: structuredClone(properties), checkpointPaint: '17px', chain,
          text: chain.at(-1).ownText, typography: structuredClone(style), naturalHeight: 17, naturalWidth: 80,
          observerViewportBox: { ...box }, referenceViewportBox: { ...box }, fontReady: true,
          fonts: [{ family: 'Roboto', status: 'loaded' }], viewport: { ...sequence.viewport, deviceScaleFactor: sequence.dpr } });
      }
      const png = Buffer.alloc(24); Buffer.from('89504e470d0a1a0a', 'hex').copy(png); png.write('IHDR', 12);
      png.writeUInt32BE(selected.viewport.width * sequence.dpr, 16); png.writeUInt32BE(selected.viewport.height * sequence.dpr, 20);
      const record = { case: key, family: selected.family, state: selected.state, profile: selected.profile, viewport: structuredClone(selected.viewport),
        query: sequence.query, view: sequence.view ?? null, cohort: sequence.cohort ?? null, actionIndex: index,
        triggerBox: selected.reference.triggerBox ?? null, originalInputTrees: structuredClone(selected.inputTrees),
        inputTree: put(`${stem}-reference.json`, tree), screenshot: putBytes(`${stem}.png`, png),
        calendarOpen: selected.family === 'datepicker' && !closed, activeIsClose: selected.reference.activeIsClose ?? false,
        openerFocused: selected.reference.openerFocused ?? false, tooltipPresent: !!selected.reference.popupCount,
        tooltipShown: !!selected.reference.referenceShown, activeId: selected.family === 'tooltip' && index >= 2 ? 'tooltip-primary' : '',
        events: structuredClone(events), measurements, runtime: structuredClone(tooltip.raw.results[0].reference.runtime) };
      records.push(record); trees.push(tree);
    }
  }
  const raw = { schemaVersion: 1, browser: expectedProvenance.browser,
    capture: { ...structuredClone(calendar.raw.capture), sources: ['scripts/audit-material-supplemental-line-boxes.mjs',
      'tests/material-parity/supplemental-capture-evidence.mjs', 'tests/material-parity/input-tree-evidence.mjs'].map(file => put(file, file)) },
    sourceReports, measurementSources: ['tests/material-parity/supplemental-line-box-evidence.mjs', 'tests/material-parity/control-line-box-evidence.mjs',
      'tests/material-parity/input-equivalence-audit.mjs', 'tests/material-parity/input-equivalence-policy.mjs',
      'tests/material-parity/calendar-close-evidence.mjs', 'tests/material-parity/tooltip-state-evidence.mjs'].map(file => {
      const source = put(file, file), snapshot = `${base}/source-${source.sha256}.txt`; put(snapshot, file); return { ...source, snapshot };
    }), cases: 50, observations: 46, results: records.map(r => ({ case: r.case, file: `${base}/${digest(r.case)}.json`, observations: r.measurements.length })) };
  const options = { root, reportPath: `${base}/latest-report.json`, cases, inventory,
    controlTypography: { comparisons }, expectedProvenance, styleProperties: Object.values(propertyGroups).flat(), readBytes };
  const save = () => {
    for (const [index, record] of records.entries()) {
      record.inputTree = put(record.inputTree.file, trees[index]);
      const item = raw.results.find(r => r.file === `${base}/${digest(cases[index] ? caseKey(cases[index]) : '')}.json`);
      if (item) item.sha256 = put(item.file, record).sha256;
    }
    put(options.reportPath, raw);
  };
  save(); return { options, raw, records, trees, save, put, putBytes };
}
