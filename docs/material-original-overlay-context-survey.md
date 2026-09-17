# Original overlay states: reference ancestor context

This audit-only increment replays the **91 original interaction cases** behind
the 54-group overlay-owner survey. It supplies missing state-specific reference
ancestor observations without changing canonical fixtures, renderer behavior,
captured scalar inputs or canonical classifications.

## Population and reproducibility

The population is 25 bottom-sheet, 32 dialog and 34 snackbar cases, with **200
mapped owner observations**. States are `activate`, `activate-leave`,
`activate-twice`, `open` and `open-hover-content`, as assigned in the original
checkpoint, not a newly constructed cross product. It covers the original
light/dark/contrast/custom profiles and these viewport configurations:

| Viewport | CSS pixels | DPR |
| --- | --- | --- |
| desktop-dpr1 | 1440 × 1000 | 1 |
| desktop-dpr2 | 1440 × 1000 | 2 |
| comparison-pane-dpr1 | 900 × 800 | 1 |
| comparison | 609 × 844 | 1 |

The producer extracts and executes eight exact named function declarations from
the unchanged Material harness: theme selection/application, readiness,
settlement, phase control, target geometry, popup hover geometry and interaction
execution. It records their hashes and the source files, including the parser.
It does not execute the runner's top-level orchestration or add an animation
delay. Chrome **152.0.7977.76** runs against the frozen original served assets;
loaded document, script, stylesheet and font bytes are checked against the
original runtime manifest. This is a reference-only replay, not a fresh paired
rendering run or an event-trace-equivalence claim.

Every fresh mapped reference owner reproduces its existing original alias proof,
including the reference scalar values, candidate's original three local style
stages, ownership paths and known scalar/full-tree rule gaps. The independent
reader reopens both original trees and checkpoint records, verifies complete
case and owner membership, and replays both original and fresh proofs. The
candidate tree is original evidence; no fresh candidate computed values are
invented.

## Findings

All 91 observed overlay roots follow **div → body → html**. The overlay root is
fixed-positioned; body and html are static. Every node in these chains has:

- font size `16px` and line height `normal`;
- transform, translate, scale, rotate, perspective and filter `none`;
- zoom `1`, contain `none`, will-change `auto`;
- horizontal and vertical overflow `visible`.

Thus a transformed or zoomed *reference external ancestor* is not observed in
these frozen-runtime state replays. This does not diagnose candidate overlay
placement, establish historical unrecorded ancestor values, or prove the
snackbar is visible, correctly painted, unclipped or on-screen. Tooltip is not
part of this 91-case owner population; its separately labelled fresh context
remains in the earlier 48-case supplement.

The independent reader compares **17,654 enumerated root properties** between
the fresh input tree and supplemental root capture. Seven tree aliases are not
present as enumerated computed-property keys and remain explicit gaps:
`flex`, `gap`, `gridColumn`, `gridRow`, `margin`, `padding`, `whiteSpace`.
They are not treated as independently verified by that comparison.

## Verification

```powershell
node scripts/capture-material-original-overlay-context.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint --output=artifacts/material-parity/original-overlay-context-current-ancestry-audit
node scripts/audit-material-original-overlay-context.mjs
node --test tests/material-parity/original-overlay-context-survey.spec.mjs
node scripts/audit-material-original-overlay-context.mjs --check
```

Capture and generation exited 0. The verified focused run passed **4/4 tests**,
zero failures/skips/cancellations, in **2,948.5128 ms**; the subsequent no-write
check exited 0. Eighteen negative controls reject incomplete/duplicate coverage,
wrong states, changed function/source evidence, altered owner styles, missing
proofs/ancestors, duplicate nodes, wrong DPR/route/profile, stale browser/record/
asset evidence and unsupported candidate or rendering-equivalence claims.
These four standalone tests are not included in the concurrently running
43-file harness command.

## Next owning-layer investigation

Reference identity and external context are now separately evidenced for this
population. They do not authorize bypassing the main-root guard or declaring
candidate inherited/used values equal. Continue tracing explicit declarations,
candidate ancestor styles and core/plugin consumers at the mapped owners. Keep
the 59 existing layered-rule capture gaps visible. The canonical **2,812
unattributed groups** remain unchanged by this increment.

## Historical source receipt and current replay

After tooltip wrapping integration, the unchanged historical capture initially
failed its reader: the recorded audit-module SHA-256 was
`fb97f72a543cff1f6c4e1f163f8b92f98c7dbbacbaa4a37d0571432045201392`,
whereas the current module was
`c00cef561be90f9d67fbb98bad7a04898b369b0b5348eb310636cbee45334a66`.
The capture receipt describes historical producer code, not current code.

The reader now verifies that one historical receipt against the exact Git blob
at `65487aeba6a26f9715f302f92b4ee454161a94ef`. It separately records the
current module digest. The other ten capture source dependencies still require
exact current-file matches. This is not a blanket stale-source waiver or proof
that the two module versions behave identically: the current reader still
independently replays all 200 original/fresh owner proofs and the 17,654 root
property comparisons. Existing corruption and coverage rejection checks remain.

The original capture, its source receipt, trees and observations were not
rewritten. Comparing the previous checked-in survey with the regenerated one,
excluding only `sourceFingerprints` and the newly added `historicalAuditSource`,
proves deep equality of every prior data field. That conserved JSON projection
has SHA-256 `b4b16ea7e329e2467325fd3a1c2d54b7f82755e02ee9a42a155e458138b715d1`.
The regenerated survey additionally fingerprints the historical verifier,
reader tests and current audit module alongside the existing generator/reader.

Verification: `node --test tests/material-parity/original-overlay-context-survey.spec.mjs`
passed **5/5**, zero failures/skips/cancellations, **3,411.6009 ms**.
Generation and `--check` both exited 0. New negative controls reject relabelling
the historical receipt with today's hash, a different file, and corrupted Git
source bytes. This correction does not establish candidate rendering parity,
change canonical attribution, or repair other historical surveys automatically.

### Replay after shared-shadow integration

The current audit-module digest changed again when shared-shadow classification
was integrated. Replaying this survey against that module verifies the same
**91 states, 200 original owner proofs and 17,654 root properties**. The original
capture receipt still verifies against the same historical Git blob; neither
its recorded digest nor any capture, observation or claim was rewritten.

The generated JSON diff contains exactly two changed fields:
`historicalAuditSource.currentSha256` and the current audit module's entry in
`sourceFingerprints`. Both now record
`f65b07b91a914dc722e77062320651b3c95f0a28550e36359989db0703c62c1a`.
An independent recursive diff against the previous committed survey asserts
that exact two-field change set. Excluding current-source fingerprints and only
the changing current digest, the entire survey is deeply equal, SHA-256
`4679b5eee977df406caac8a490d4115adb38c78597439be4d4f4119633f4858f`.
That projection retains the historical receipt and its verification scope.

```powershell
node scripts/audit-material-original-overlay-context.mjs
node scripts/audit-material-original-overlay-context.mjs --check
node --test tests/material-parity/original-overlay-context-survey.spec.mjs
```

Generation and no-write replay exit **0**. Tests: **5/5 pass**, zero
failures/skips/cancellations, **3,562.2379 ms**. This is current-reader proof
replay over retained evidence, not a fresh browser/candidate rendering capture.
The seven enumerated-alias gaps, external-context limits and unsupported
candidate-equivalence claims remain unchanged. Other historical surveys and
the complete enforced matrix still need their own verification.

### Replay after root-flow/button-radius integration

The source-bound authoring integration changes the current audit-module digest
to `25a58594bc30e4e7213738766514eeaef02d334eb6024bc91fe5f54a980c1602`.
Generation, no-write replay and all five tests pass again: **5/5**, zero
failures/skips/cancellations, **3,597.1518 ms**, using the same three commands
above. This retains all **91 states, 200 owner proofs and 17,654 root properties**.

An independent recursive comparison with the preceding committed survey proves
that only `historicalAuditSource.currentSha256` and `sourceFingerprints.4.sha256`
change. The complete remaining projection is deeply equal and retains SHA-256
`4679b5eee977df406caac8a490d4115adb38c78597439be4d4f4119633f4858f`.
The original capture receipt, its historical Git revision, all observations and
all seven alias gaps are unchanged. No source hash was substituted for the
historical receipt. This is current-reader verification, not a fresh browser or
candidate render, and does not establish candidate overlay/raster equivalence.

### Historical mapping identity after gap integration

Regenerating the mapping report after gap integration changed its dependency
digests. The historical browser capture still correctly points to the earlier
mapping bytes. The reader previously tried to satisfy that historical digest
with today's file, failing even when every case and mapping proof was unchanged.
The one-test red baseline exits **1** in
`field-host-flow-input-audit/owner-gap-historical-mapping-before.log`.

The reader now verifies the captured mapping digest against the exact Git blob
retained at `cab0cc3cc53b3728bb4022b89e0fe47168c18bae`. This is a revision
containing the recorded bytes, not an assertion that it was the browser-capture
commit. Every current mapping field except source fingerprints and the parent
report digest must match those historical bytes exactly. The current source
inventory, every current source hash and the current parent-report bytes are
independently checked. The original and fresh owner-proof replay remains
mandatory; parent-report semantics are separately covered by its original
membership/mapping replay, not inferred from a changed hash.

```powershell
node --test tests/material-parity/original-overlay-context-survey.spec.mjs
node scripts/audit-material-original-overlay-context.mjs
node scripts/audit-material-original-overlay-context.mjs --check
node scripts/audit-material-remaining-overlay-ancestry.mjs
```

All **6/6** tests pass, exit **0**, zero skips/cancellations/todos,
**7,087.2412 ms**. New controls reject altered membership, duplicate cases,
missing owners, changed proof values/counts, a wrong capture/parent/source,
extra provenance fields, corrupted or relabelled history, and unsupported
computed/rendering claims. Integration controls prove the reader actually
rejects changed mapping bytes and forged capture descriptors.

Generation, no-write replay and the remaining-ancestry generator also exit **0**.
The reader retains **91 states, 200 owner proofs and 17,654 root properties**.
The remaining-ancestry review retains **48 groups / 1,424 observations**,
including all 18 pending-context owners and 356 identity rejection controls.

The original capture remains SHA-256
`74813a6a0872c7215e338639d395279a5e0016bfb3b0a44123e4994a8501489e`;
all 91 referenced case files also keep their recorded hashes. Except for the
new historical-mapping receipt and current-source metadata, the complete
survey remains deeply equal, SHA-256
`4679b5eee977df406caac8a490d4115adb38c78597439be4d4f4119633f4858f`.
The passing test log is 1,665 bytes, SHA-256
`8237f795a3781e741961cf271620ef982a5aaa3720c8a8ca164e864d715841bf`,
at `artifacts/material-parity/field-host-flow-input-audit/owner-gap-historical-mapping-after.log`.

This is historical identity plus current-reader verification, not a fresh
browser capture, a changed historical observation, or candidate rendering
equivalence. The canonical audit and enforced parity remain separate gates.
