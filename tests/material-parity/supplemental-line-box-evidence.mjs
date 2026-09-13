import assert from 'node:assert/strict';
import path from 'node:path';
import { parseSupplementalCaptureArguments } from './supplemental-capture-evidence.mjs';

export const supplementalLineBoxCaseKey = entry =>
  `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`;

export function parseSupplementalLineBoxArguments(args, root = process.cwd()) {
  let supplementalRoot;
  const rest = [];
  for (const arg of args) {
    if (!arg.startsWith('--supplemental-root=')) { rest.push(arg); continue; }
    assert.equal(supplementalRoot, undefined, 'Repeated --supplemental-root');
    supplementalRoot = arg.slice('--supplemental-root='.length);
    assert.ok(supplementalRoot.trim(), 'Empty --supplemental-root');
  }
  assert.ok(supplementalRoot, 'Supply --supplemental-root');
  const absolute = path.resolve(root, supplementalRoot);
  const relative = path.relative(path.resolve(root, 'artifacts/material-parity'), absolute);
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    'Supplemental root must remain inside Material artifacts');
  return { ...parseSupplementalCaptureArguments(rest, root), supplementalRoot: absolute };
}

// Preserve complete action sequences, including calendar's final closed state
// with no line-height target. This plan never selects states by candidate paint.
export function supplementalLineBoxSequences(cases) {
  assert.equal(cases.length, 50, 'Require all original calendar and tooltip action boundaries');
  const remaining = new Map(cases.map(entry => [supplementalLineBoxCaseKey(entry), entry]));
  assert.equal(remaining.size, cases.length, 'Duplicate supplemental case');
  const sequences = [];
  for (const dpr of [1, 2]) for (const view of ['month', 'multi-year']) {
    const states = ['opened', 'tab-close', 'blur-close', 'refocus-close', 'activate-close'];
    const entries = states.map(state => take('datepicker', `calendar-close-${view}-${state}`, `calendar-close-desktop-dpr${dpr}`, 900, dpr));
    sequences.push({ family: 'datepicker', view, dpr, viewport: { width: 1440, height: 900 },
      query: 'benchmark=1&profile=light&interaction=audit-calendar-close', entries });
  }
  for (const dpr of [1, 2]) for (const cohort of ['benchmark-open', 'benchmark-hover', 'ordinary']) {
    const states = ['initial', 'hover', 'press', 'release', 'leave'];
    const entries = states.map(state => take('tooltip', `tooltip-state-${cohort}-${state}`, `tooltip-state-desktop-dpr${dpr}`, 1000, dpr));
    sequences.push({ family: 'tooltip', cohort, dpr, viewport: { width: 1440, height: 1000 },
      query: cohort === 'ordinary' ? 'profile=light' : `benchmark=1&profile=light&interaction=${cohort.slice(10)}`, entries });
  }
  assert.equal(remaining.size, 0, 'Unexpected supplemental cases');
  return sequences;

  function take(family, state, id, height, dpr) {
    const key = `supplemental:${family}@light/${id}/${state}`, entry = remaining.get(key);
    assert.ok(entry, `Missing ${key}`);
    assert.deepEqual(entry.viewport, { width: 1440, height, deviceScaleFactor: dpr, id });
    remaining.delete(key);
    return entry;
  }
}

export async function driveSupplementalLineBoxStep(page, family, index, triggerBox) {
  assert.ok(Number.isInteger(index) && index >= 0 && index < 5, 'Invalid action boundary');
  if (family === 'datepicker') {
    const key = [null, 'Tab', 'Shift+Tab', 'Tab', 'Enter'][index];
    if (key) await page.keyboard.press(key);
    if (index === 4) await page.locator('.mat-datepicker-content').waitFor({ state: 'hidden' });
  } else {
    assert.equal(family, 'tooltip', 'Unknown sequence family');
    assert.ok(triggerBox && ['x', 'y', 'width', 'height'].every(p => Number.isFinite(triggerBox[p])) &&
      triggerBox.width > 0 && triggerBox.height > 0, 'Missing reference trigger box');
    if (index === 1) await page.mouse.move(triggerBox.x + triggerBox.width / 2, triggerBox.y + triggerBox.height / 2);
    if (index === 2) await page.mouse.down();
    if (index === 3) await page.mouse.up();
    if (index === 4) await page.mouse.move(1, 1);
  }
}
