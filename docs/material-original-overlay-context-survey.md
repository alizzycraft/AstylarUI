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
