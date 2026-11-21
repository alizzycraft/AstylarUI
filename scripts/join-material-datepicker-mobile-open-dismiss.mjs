import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const digest = value => createHash('sha256').update(value).digest('hex');
const base = 'artifacts/material-parity/';
const captureRoot = base + 'datepicker-mobile-open-dismiss-focus-state-20261122/';
const caseKey = 'interaction:datepicker@dark/mobile-dpr2/open-dismiss';
const parentGeneration = '0c2cc1b9ce3121155c98b4dec8b015b44b9219a8bbbeba11ccb29ec45924deb5';
const parentIndex = '31fb68e7f3f8d6dfed26c43d78f2f775382c7f42643c9ed350c2310a7db51519';
export const datepickerMobileOpenDismissReview = 'a095cf9b57430eb73acc3a3d33f4092644cfef4ac21a1a494ec71acde09c719f';

const evidence = [
  { file: captureRoot + 'latest-report.json', sha256: 'da27a5d4f6910ca0d5298ea3a4e1128da1768e807ee02d6a60280252b8e78402' },
  { file: captureRoot + 'diagnostic-runner.mjs', sha256: 'a8c2177ec93f6b816585acb29e3a0b1b76207b27f3b2097a6efed663e59a23d7' },
];
const conclusions = {
  authoredActivation: 'Both sides opened and closed in all three cycles. Reference transferred focus into the calendar and Astylar remained on the opener.',
  programmaticFocus: 'Opening focus-transfer failure. After Escape both openers held focus. The existing authored opening focus-transfer finding applies to the observed route.',
  semantics: 'While open, the reference input aria-owns resolved to MAT-CALENDAR. No aria-owns, aria-controls or aria-activedescendant link was observed in the inspected Astylar Datepicker DOM scope.',
};

export function buildDatepickerMobileOpenDismissReview({ root = process.cwd(), read = readFileSync } = {}) {
  const checked = ({ file, sha256 }) => {
    const bytes = read(path.resolve(root, file));
    assert.equal(digest(bytes), sha256, `Datepicker review dependency changed: ${file}`);
    return bytes;
  };
  const predecessor = JSON.parse(checked({
    file: base + 'working-audit/' + parentGeneration + '/index.json', sha256: parentIndex,
  })).metadata.coverage.inspectionEvidence;
  const report = JSON.parse(checked(evidence[0]));
  checked(evidence[1]);
  assert.ok(report.captureProvenance.harnessFiles.some(row => row.sha256 === evidence[1].sha256));
  const originalReport = JSON.parse(checked({
    file: base + 'current-full-20261005/latest-report.json',
    sha256: 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62',
  }));
  assert.deepEqual(report.captureProvenance.browserFiles, originalReport.captureProvenance.browserFiles);
  assert.equal(report.interactions.length, 1);
  const [capture] = report.interactions;
  assert.equal(`interaction:${capture.family}@${capture.profile}/${capture.viewport.id}/${capture.state}`, caseKey);
  assert.deepEqual(capture.runtimeErrors, []);
  assert.equal(capture.focusBoundaries.length, 6);
  for (const [index, row] of capture.focusBoundaries.entries()) {
    const open = index % 2 === 0;
    const { reference, astylar } = row;
    assert.equal(row.cycle, Math.floor(index / 2));
    assert.equal(row.boundary, open ? 'settled-open' : 'settled-dismissed');
    assert.equal(reference.nativeCalendar, open);
    assert.equal(astylar.candidateOpen, open);
    assert.equal(astylar.ancestry[0].logicalId, 'datepicker-icon');
    assert.equal(astylar.associations.length, 0);
    if (open) {
      assert.equal(astylar.candidatePopup.role, 'dialog');
      assert.ok(reference.ancestry.some(node => node.role === 'gridcell'));
      assert.ok(reference.associations.some(association => association.owner.id === 'datepicker-control'
        && association.references['aria-owns']?.some(link => link.target?.tag === 'MAT-CALENDAR')));
    } else {
      assert.equal(astylar.candidatePopup, null);
      assert.ok(reference.ancestry.some(node => node.tag === 'MAT-DATEPICKER-TOGGLE'));
      assert.equal(reference.associations.length, 0);
    }
  }
  let changed = 0;
  const groups = predecessor.cases.map(row => {
    if (row.case !== caseKey) return row;
    ++changed;
    assert.equal(row.inspection, 'partial');
    assert.equal(row.currentRendering, 'unverified');
    const obligations = { ...row.obligations };
    for (const [name, conclusion] of Object.entries(conclusions)) {
      assert.ok(obligations[name]);
      assert.equal(obligations[name].retainedDatepickerMobileOpenDismiss, undefined);
      obligations[name] = {
        ...obligations[name],
        retainedDatepickerMobileOpenDismiss: {
          disposition: 'inspected-retained-opening-and-dismissal',
          conclusion,
          evidence: structuredClone(evidence),
          boundary: 'Instrumented replay of the exact maintained action with 1887 original served assets. Six settled paired samples in Chromium 157. Current rendering, intermediate frames, local paint and AX equivalence remain unverified.',
        },
      };
    }
    return { ...row, obligations };
  });
  assert.equal(changed, 1);
  assert.equal(groups.length, 2311);
  const review = {
    kind: 'case-obligation-coverage-extension',
    status: 'proposal-not-canonical',
    ...(predecessor.schemaVersion === 2 ? { inspectionSchemaVersion: 2 } : {}),
    scope: predecessor.scope,
    groups,
  };
  assert.equal(digest(JSON.stringify(review)), datepickerMobileOpenDismissReview);
  return review;
}
