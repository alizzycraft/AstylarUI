# Slider history: separate authoring regressions from the core gesture defect

The source history sharpens the existing `fixture-slider-fixed-half-domains`
finding and explains why green comparison output could coexist with incorrect
interaction. The [machine receipt](material-slider-input-history.json) pins seven
full revisions, complete normalized source hashes and the exact relevant
declarations. This is an audit-only history review; no fixture, renderer,
canonical attribution, or running harness input is changed.

## Verified sequence

| Revision | Source change | What it does not establish |
| --- | --- | --- |
| `2f44011` | Starts with two 0–100, step-5 inputs, but hard-coded invisible hit boxes and a separate visual plugin. | That initial geometry or multi-thumb interaction was equivalent. |
| `7159b1d` | Clamps the start input to 0–50 and end input to 50–100; values use `Math.min(50, …)` / `Math.max(50, …)`. Step stays 5. | Correct peer-dependent Material bounds or full-domain reachability. |
| `d973f84` | Removes range owners from the input-time document-update path, calls `updateSliderVisual` through mesh metadata, and commits store values on `change`. | A correction to the core update/focus/capture contract. |
| `f3c8254` | Changes both steps from 5 to 1, retaining the half-domains. | Equivalent keyboard stepping or value snapping to the reference. |
| `2cb8b19` | Sends pressed/hover state to `updateStateLayer` through mesh metadata. | General core gesture/state ownership or the original black-ring cause. |
| `ce8f3f1` | Replaces fixed pixel hit widths with two 50%-width halves. | Restoration of the reference value domain or dynamic sibling hit regions. |
| `3dcbdd9` | Adds horizontal container margins and renames the visual to `slider-visual`. | Removal of half-domains, step substitution or update bypass. |

Current `astylar.component.ts:139` still updates the visual directly during
input and `:164` commits values on change. Lines 784–785 retain the 50% hit boxes;
lines 903–904 retain the half-domain/step-1 declarations. The reference component
at line 82 authors `mat-slider min="0" max="100" step="5"` with two Material
thumbs. The generated native thumb bounds and hit regions are peer-dependent;
restoring the parent domain is not sufficient by itself to recreate those rules.

This review does not assign intent from commit messages or assert that every
other change in these commits was a workaround. Direct visual updates can be a
legitimate optimization; the defect is relying on bypassing normal public updates
to make a valid active gesture survive, or treating the bypass as proof that
core interaction has been corrected.

## Relation to demonstrated root causes

The independent [public range reproduction](material-public-range-drag-audit.md)
uses equal-input controls without Material, half-domains, invisible overlapping
owners or plugin visual callbacks. Its 16 update cases demonstrate premature
public release through semantic focus synchronization and canvas blur. Its 16
no-update cases retain capture and reach the endpoints but lose the captured
owner's public pointer-up when released outside. These are separately proved
core defects. The source history above is consistent with avoiding the update
trigger, not proof of the historical developer's motivation or a fresh execution
of each historical build.

The public reproduction also records intermediate one-step disagreements while
event-local coordinates agree with authored CSS coordinates. Native thumb/track
travel remains to be isolated; do not infer a global CSS/world-space defect or
add an offset to force matching samples.

The [sibling pointer-state survey](material-slider-peer-pointer-survey.md)
separately proves missing captured peer-suppression requests. The
[disabled-state proof](material-slider-disabled-inputs.md) proves disabled
inputs are siblings of a visual that receives no disabled-state opacity. The
initial visual declaration also omits disabled state; the source receipt retains
its complete file hash. Neither finding alone diagnoses the original swapped
thumb or black ring. All these distinctions must survive the implementation plan.

## Recommended implementation order

1. Fix generic active-gesture preservation through semantic focus synchronization
   and public updates. Require the existing button and range equal-input
   reproductions to pass; do not suppress consumer updates as the solution.
2. Fix captured-owner release routing. Separately isolate native range travel
   and stepping, preserving CSS-space event coordinates and exact values.
3. Restore reference domain, step, peer bounds and dynamic hit-region behavior
   through core controls plus legitimate Material state orchestration. Remove
   fixed half-domain clamping; test both thumbs across the midpoint, including
   start=60/end=80 and start=20/end=40, with pointer and keyboard.
4. Restore equivalent hover/pressed/disabled paint inputs and ownership. Verify
   labels, values, gesture lifetime, peer selection and raster independently.
   A correctly painted track cannot certify invisible hit geometry.

## Verification

Read-only `git log -S` queries located the introductions; `git show --unified=0`
and full file snapshots verified the changes. The seven revisions' chronological
ancestry and source fragments are checked against the machine receipt with:

```javascript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const receipt = JSON.parse(readFileSync('docs/material-slider-input-history.json'));
const read = revision => execFileSync('git', ['show', `${revision}:${receipt.sourceFile}`],
  { encoding: 'utf8' }).replaceAll('\r\n', '\n');
const hash = text => createHash('sha256').update(text).digest('hex');
for (const [index, entry] of receipt.revisions.entries()) {
  const source = read(entry.revision);
  assert.equal(hash(source), entry.sourceSha256);
  for (const fragment of entry.requiredFragments) assert.ok(source.includes(fragment));
  if (entry.parentSourceSha256) {
    const parent = read(entry.revision + '^');
    assert.equal(hash(parent), entry.parentSourceSha256);
    for (const fragment of entry.parentRequiredFragments) assert.ok(parent.includes(fragment));
  }
  if (index) execFileSync('git', ['merge-base', '--is-ancestor',
    receipt.revisions[index - 1].revision, entry.revision]);
}
```

Run as `node --input-type=module`. This validates historical source, not live
behavior, author intent, output parity or canonical row coverage. The ongoing
120-file harness remains bound to revision `9933ac1`; its input code and tests
were not changed for this documentation increment.

The read-only verification passes, exit **0**: all seven revision hashes, the
additional parent hash, **27 literal source fragments**, and all six
chronological ancestor checks agree. No current renderer or comparison input
was edited, and no historical build was executed as part of this check.
