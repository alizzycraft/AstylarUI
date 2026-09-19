# Audit verification checkpoint — 2026-09-19

This records terminal results and explicitly pending jobs, not complete audit
acceptance. Branch: `codex/material-ui-showcase`.

## Committed audit increments

- `924db82`: verified 66-group / 2,640-observation follow-up integration.
  Canonical unresolved count is 1,960; original values and unrelated complete
  rows are conserved. See the [integration record](material-followup-input-canonical-integration.md).
- `e3fc1ae`: complete explicit-cursor owner census, 19 groups / 763 observations,
  with eight passing focused/inventory tests. See the
  [cursor findings](material-explicit-cursor-inputs.md). This is not a further
  canonical count reduction.

Both commits are pushed. No renderer or canonical comparison inputs changed.

## Enforced release attempts

1. `npm run parity:release:check` terminated with exit 1 before fixture capture:
   the runner did not obtain the local `4300/parity/fixtures.json` within its
   existing 120-second readiness window. This is not a tested-fixture failure.
   Log: `complete-parity-release-sep19.log`.
2. A separately started repository Angular dev server subsequently returned
   the complete manifest (167 fixtures). The same unfiltered release command,
   with `ASTYLAR_PARITY_BASE_URL=http://127.0.0.1:4300`, terminated with exit 1
   during general parity: `captureMode` exceeded its unchanged 30-second ready
   check in `measureDynamicFixture`. Latest capture paths place the interruption
   at `semantic-lifecycle-stress`, second fresh dynamic state. This location is
   inferred from artifact order, not a diagnosed timeout cause.
   Log: `complete-parity-release-ready-sep19.log`.

The release command uses `&&`; neither failure ran its TTS or Material
constituents. They are now running separately in sequence with the original
unfiltered enforced commands, preserving both exit statuses even if TTS fails:

```text
npm run tts-parity:check
npm run material-parity:check
```

At this checkpoint, TTS has built and entered browser interaction captures;
Material has not yet started. Session 71284 is live. Logs are
`complete-tts-parity-sep19.log` and `complete-material-parity-sep19.log`.
These are pending, not passes. A complete general-parity result remains needed.

## Focused lifecycle diagnostic: terminal failure

```text
ASTYLAR_PARITY_BASE_URL=http://127.0.0.1:4300
node tests/parity/run-parity.mjs --fixture=semantic-lifecycle-stress --enforce-focused
```

The focused rerun **completed**, exit **1**, with one fixture / 29 renders /
one exercised viewport. It did not repeat the ready timeout. Median SSIM is
0.9954253842063013; minimum is 0.9929340272061842; edge ratio is 1 with maximum
edge error 0; text and local sharpness match. Runtime/resource acceptance fails:

| In-place update | Updated meshes/materials/textures | Fresh meshes/materials/textures |
| --- | --- | --- |
| 2 | 15 / 17 / 10 | 15 / 18 / 5 |
| 3 | 13 / 14 / 11 | 13 / 15 / 4 |
| 4 | 15 / 17 / 11 | 15 / 18 / 5 |

These are the harness's resource-plateau assertions, not JavaScript exceptions.
They demonstrate excess retained texture counts relative to fresh renders;
the leaking allocation and its relationship, if any, to the earlier timeout
are not established. Do not adjust counts or thresholds to obtain a pass.
No lifecycle renderer fix was attempted during this audit.

Log: `semantic-lifecycle-timeout-recheck-sep19.log`. The focused report is
preserved separately as `semantic-lifecycle-focused-report-sep19.json`, SHA-256
`14de95e0abee9473472d20387a5b7d040707db4eaf87ec4d9137499f04c4bea7`.
It is focused diagnostic evidence, not the complete matrix. All log/report
paths above are under `artifacts/material-parity/field-host-flow-input-audit/`.

## Complete audit harness: pending

```text
NODE_OPTIONS=--max-old-space-size=4096
node scripts/run-material-audit-harness.mjs
```

The discovered inventory contains all 170 test files: 162 Material, four
general, four TTS, retaining all 43 legacy files. Tests are serial and unfiltered.
Session 61580 is live, log `complete-audit-harness-sep19.log`. The 4GB heap cap
avoids the already observed 3GB historical-suite OOM; no population or assertion
is reduced. Early tests have passed, but no complete harness result exists yet.

Remaining audit obligations include source-bound integration of the prepared
alignment/font classifications, remaining unclassified input differences,
complete state/owner coverage, and terminal full verification results. The
active goal remains incomplete.
