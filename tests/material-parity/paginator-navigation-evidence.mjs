import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { paginatorNavigationPlan, paginatorNavigationStyleProperties, comparePaginatorNavigation } from '../../scripts/audit-material-paginator-navigation.mjs';

const hasClass = (node, token) => String(node?.attributes?.class ?? '').split(/\s+/).includes(token);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function collectPaginatorNavigationEvidence(root, options = {}) {
  const absolute = path.resolve(root, options.reportPath ?? path.join(options.supplementalRoot ??
    'artifacts/material-parity', 'paginator-navigation-audit-v3', 'latest-report.json'));
  const file = path.relative(root, absolute).replaceAll('\\', '/');
  const required = ['light', 'dark'].flatMap(profile => [1, 2].flatMap(dpr =>
    paginatorNavigationPlan().map(step => `${profile}/${dpr}/${step.state}`)));
  const missing = { file, binding: { status: 'missing', errors: [] }, complete: false,
    cases: [], reviews: [], mismatches: [], missing: required, errors: [] };
  try {
    const boundary = path.resolve(root, 'artifacts/material-parity');
    const inside = (base, target) => {
      const relative = path.relative(base, target);
      return relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
    };
    assert.ok(inside(boundary, absolute), 'Paginator navigation evidence must remain inside Material artifacts');
    if (!options.readBytes) assert.ok(inside(realpathSync(boundary), realpathSync(absolute)), 'Paginator report symlink escapes artifacts');
    const bytes = (options.readBytes ?? readFileSync)(absolute), raw = JSON.parse(bytes);
    const validation = validatePaginatorNavigationCapture(raw, { ...options, root, reportFile: file });
    const cases = validation.complete ? raw.results.map(entry => ({
      kind: 'supplemental', family: 'paginator', profile: entry.profile,
      viewport: { ...raw.viewport, deviceScaleFactor: entry.deviceScaleFactor, id: `paginator-navigation-desktop-dpr${entry.deviceScaleFactor}` },
      state: `paginator-navigation-${entry.state}`, action: entry.action, target: entry.target,
      expectedPageIndex: entry.expectedPageIndex, reference: entry.reference, astylar: entry.astylar,
      inputTrees: { reference: entry.reference.inputTree, astylar: entry.astylar.inputTree },
      inputEquivalent: false, finalRasterVerified: false,
    })) : [];
    const mismatches = validation.observations.flatMap(review => Object.entries(review.checks)
      .filter(([, passed]) => !passed).map(([property]) => {
        const authoring = property === 'nativeDisabledInputs' || property === 'tooltipPresence';
        return { profile: review.profile, deviceScaleFactor: review.deviceScaleFactor, state: review.state,
          action: review.action, property, reference: review.reference, astylar: review.astylar,
          classification: authoring ? 'application-plugin-authoring-defect' : 'suspected-core-renderer-defect',
          recommendedOwner: authoring ? 'showcase paginator composition through core public APIs' : 'core interaction and semantic coordination, after checking identical control inputs',
          justification: property === 'nativeDisabledInputs'
            ? 'Material disabled-interactive navigation retains a native enabled button with aria-disabled and tabIndex:-1; the candidate authors native disabled. Range guards passing does not make these inputs equivalent.'
            : property === 'tooltipPresence'
              ? 'The observed reference tooltip content has no equivalent candidate content in this action state. The exact authored tree is retained; navigation success cannot waive omitted tooltip composition.'
              : property === 'focusNavigation'
                ? 'Document focus differs. Native disabled inputs are recorded separately and may differ too; do not attribute this observation solely to core. The independent enabled-button proof confirms a core held-focus synchronization defect, but this application capture does not itself expose logical focus.'
                : 'The observed range, availability or state assertion fails and needs first-divergence investigation; no renderer-only cause is inferred from this comparison.',
          inputEquivalent: false, finalRasterVerified: false };
      }));
    return { file, sha256: hash(bytes), browser: raw.browser, capture: raw.capture,
      binding: validation.binding ?? { status: 'invalid', errors: [] }, complete: validation.complete,
      cases, reviews: validation.observations, mismatches, missing: validation.complete ? [] : required, errors: validation.errors };
  } catch (error) {
    if (error.code === 'ENOENT') return missing;
    return { ...missing, binding: { status: 'invalid', errors: [{ error: String(error.message) }] }, errors: [String(error.message)] };
  }
}

// Completeness here means trustworthy captured action evidence, not successful
// behavior or input equivalence. Honest failed checks remain observations.
export function validatePaginatorNavigationCapture(raw, options) {
  const errors = [], observations = [];
  let binding;
  try {
    assert.equal(raw.schemaVersion, 1);
    assert.deepEqual(raw.viewport, { width: 1440, height: 1000 });
    assert.deepEqual(raw.profiles, ['light', 'dark']);
    assert.equal(raw.settleDelayMs, 250);
    const plan = paginatorNavigationPlan();
    assert.deepEqual(raw.plan, plan, 'Changed navigation action plan');
    const keys = raw.profiles.flatMap(profile => [1, 2].flatMap(dpr => plan.map(step => `${profile}/${dpr}/${step.state}`)));
    assert.deepEqual(raw.results?.map(e => `${e.profile}/${e.deviceScaleFactor}/${e.state}`), keys, 'Incomplete or reordered navigation matrix');
    binding = validateSupplementalCapture(raw, { ...options, script: 'scripts/audit-material-paginator-navigation.mjs',
      styleProperties: paginatorNavigationStyleProperties });
    assert.equal(binding.status, 'checkpoint-bound', JSON.stringify(binding.errors));
    const directory = path.dirname(path.resolve(options.root, options.reportFile));
    const read = item => {
      const absolute = path.resolve(options.root, item?.file ?? '');
      assert.equal(path.dirname(absolute), directory, 'Artifact belongs to another directory');
      if (!options.readBytes) assert.equal(path.dirname(realpathSync(absolute)), realpathSync(directory), 'Artifact symlink escapes directory');
      const bytes = (options.readBytes ?? readFileSync)(absolute);
      assert.equal(hash(bytes), item.sha256, 'Changed navigation artifact bytes');
      return bytes;
    };
    const histories = new Map(), screenshots = new Set();
    for (const entry of raw.results) {
      assert.equal(entry.family, 'paginator');
      const step = plan.find(s => s.state === entry.state);
      for (const field of ['action', 'target', 'expectedPageIndex']) assert.equal(entry[field], step[field], `Changed ${field}`);
      for (const side of ['reference', 'astylar']) {
        const ref = side === 'reference', sample = entry[side], tree = JSON.parse(read(sample.inputTree));
        assert.equal(tree.schemaVersion, 1);
        if (ref) for (const node of tree.nodes)
          assert.ok(['visible', 'hidden', 'collapse'].includes(tree.styles?.[node.style]?.visibility), 'Missing reference visibility input');
        assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length, 'Ambiguous node keys');
        const one = (predicate, message) => {
          const found = tree.nodes.filter(predicate); assert.equal(found.length, 1, message); return found[0];
        };
        const range = one(n => ref ? hasClass(n, 'mat-mdc-paginator-range-label') : n.authored?.id === 'paginator-range', 'Missing or duplicate range label');
        assert.equal(sample.range, ref ? range.ownText.trim() : range.authored.textContent, 'Range is disconnected from captured inputs');
        for (const direction of ['previous', 'next']) {
          const control = one(n => ref ? hasClass(n, `mat-mdc-paginator-navigation-${direction}`)
            : n.authored?.id === `paginator-${direction}`, 'Missing or duplicate navigation control');
          assert.equal(ref ? control.type : control.authored.type, 'button');
          const nativeDisabled = ref ? Object.hasOwn(control.attributes, 'disabled') : control.authored.disabled === true;
          assert.equal(sample[`${direction}Disabled`], nativeDisabled, 'Native disabled state does not match captured input');
          if (ref) {
            assert.equal(sample[`${direction}AriaDisabled`], control.attributes['aria-disabled'] ?? null);
            assert.equal(sample[`${direction}TabIndex`], Number(control.attributes.tabindex ?? 0));
          } else assert.equal(sample[`authored${direction === 'previous' ? 'Previous' : 'Next'}Disabled`], control.authored.disabled);
        }
        if (!ref) {
          assert.equal(tree.resolvedStyleEvidenceVersion, 2);
          assert.equal(tree.resolvedStyleSource, 'core-style-inspection');
          assert.ok(Number.isInteger(tree.resolvedStyleRevision) && tree.resolvedStyleRevision >= 0);
          for (const node of tree.nodes.filter(n => /^paginator-(?:range|previous|next)$/.test(n.authored?.id))) {
            for (const field of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
              assert.ok(node[field] && typeof node[field] === 'object' && !Array.isArray(node[field]), 'Missing current style stage');
            }
          }
          const match = /^(\d+) – (\d+) of 100$/.exec(sample.range);
          assert.ok(match, 'Unexpected candidate range format');
          assert.equal(sample.pageIndex, (Number(match[1]) - 1) / 10, 'Candidate state and authored range disagree');
        }
        const tooltips = tree.nodes.filter(n => ref ? hasClass(n, 'mat-mdc-tooltip-surface') &&
          hasClass(tree.nodes.find(p => p.key === n.parent), 'mat-mdc-tooltip-show') : n.authored?.role === 'tooltip');
        assert.deepEqual(sample.visibleTooltips, tooltips.map(n => ref ? n.ownText.trim() : n.authored.textContent ?? n.authored.value ?? ''), 'Tooltip presence/text is not backed by the tree');
        assert.ok(sample.pointer && ['x', 'y'].every(p => Number.isFinite(sample.pointer[p])));
        if (['move', 'click'].includes(step.action)) {
          const b = sample.targetBox;
          assert.ok(b && ['x', 'y', 'width', 'height'].every(p => Number.isFinite(b[p])) && b.width > 0 && b.height > 0);
          assert.equal(sample.pointer.x, b.x + b.width / 2); assert.equal(sample.pointer.y, b.y + b.height / 2);
        } else assert.equal(sample.targetBox, null);
        const key = `${entry.profile}/${entry.deviceScaleFactor}/${side}`, previous = histories.get(key) ?? [];
        assert.ok(Array.isArray(sample.events) && sample.events.every(e => e.trusted === true), 'Missing or synthetic event history');
        assert.deepEqual(sample.events.slice(0, previous.length), previous, 'Rewritten event prefix');
        const delta = sample.events.slice(previous.length);
        const required = { click: ['pointerdown', 'pointerup'], down: ['pointerdown'], up: ['pointerup'],
          'space-down': ['keydown'], 'space-up': ['keyup'], leave: ['pointermove'] }[step.action] ?? [];
        for (const type of required) assert.ok(delta.some(e => e.type === type &&
          (!type.startsWith('key') || e.key === ' ')), `Missing trusted ${type} boundary`);
        histories.set(key, sample.events);
        assert.ok(sample.active && typeof sample.active.tag === 'string');
        const focusedDirection = ['previous', 'next'].find(direction => sample.active.tag === 'BUTTON' && (ref
          ? sample.active.label === `${direction === 'previous' ? 'Previous' : 'Next'} page`
          : sample.active.astylarId === `paginator-${direction}`)) ?? null;
        assert.equal(sample.activeNavigation, focusedDirection, 'Fabricated focused navigation target');
        assert.ok(!screenshots.has(sample.screenshot?.file), 'Duplicate screenshot'); screenshots.add(sample.screenshot.file);
        const png = read(sample.screenshot);
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Missing PNG signature');
        assert.equal(png.readUInt32BE(16), raw.viewport.width * entry.deviceScaleFactor);
        assert.equal(png.readUInt32BE(20), raw.viewport.height * entry.deviceScaleFactor);
      }
      const checks = comparePaginatorNavigation(entry);
      assert.deepEqual(entry.checks, checks, 'Recorded navigation assertions do not replay');
      observations.push({ profile: entry.profile, deviceScaleFactor: entry.deviceScaleFactor,
        state: entry.state, action: entry.action, expectedPageIndex: entry.expectedPageIndex, checks,
        reference: { range: entry.reference.range, nativeDisabled: [entry.reference.previousDisabled, entry.reference.nextDisabled],
          ariaDisabled: [entry.reference.previousAriaDisabled, entry.reference.nextAriaDisabled],
          focus: entry.reference.activeNavigation, tooltips: entry.reference.visibleTooltips },
        astylar: { range: entry.astylar.range, nativeDisabled: [entry.astylar.previousDisabled, entry.astylar.nextDisabled],
          ariaDisabled: [entry.astylar.previousAriaDisabled, entry.astylar.nextAriaDisabled],
          focus: entry.astylar.activeNavigation, tooltips: entry.astylar.visibleTooltips },
        inputEquivalent: false, finalRasterVerified: false });
    }
  } catch (error) { errors.push(String(error.message)); }
  return { complete: errors.length === 0, binding, observations: errors.length ? [] : observations, errors };
}
