# Primary-button interaction replaces a state layer with a preblended background

The [machine evidence](material-button-hover-composition.json) scans all **2,311
original cases**, independently selecting all unequal `button-primary`
backgrounds. Among **60 primary-button cases**, 36 have matching background
scalars and **24 differ**: hover, held press and post-activation, each across
light/dark/contrast/custom and desktop DPR 1/2. Matching background scalars do
not establish equivalent state-layer structure or full paint in the other cases.

The complete original report is pinned to SHA-256
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.
Each selected complete result must equal its checkpoint result, whose identity
and digest are checked. Both tree hashes must match the result descriptors and
captured-file inventory; original scalar, normal and effective backgrounds must
match the tree observations. This is captured-input evidence, not a new browser
execution or a review of every background difference in other components.

The Material button keeps its container-color token and generated persistent
ripple `::before` layer. The layer has its own state-layer-color token and hover
opacity token, resolving to **0.08** in hover/post-activation and **0.12** during
held presses. The Astylar button has no authored child layer: its corresponding
`:hover` or `:active` rule changes the opaque background to `mixHex(...)`.
The candidate declaration, normal inspection, effective inspection and comparison
stage are retained separately. The reference host and pseudo rules remain intact.

| Profile | Reference base / candidate normal | Reference layer | Candidate hover |
| --- | --- | --- | --- |
| Light | `#6750a4` | white at 0.08 | `#735eab` |
| Dark | `#d0bcff` | black at 0.08 | `#bfadeb` |
| Contrast | `#000000` | white at 0.08 | `#141414` |
| Custom | `#006a6a` | white at 0.08 | `#147676` |

The script extracts the actual `mixHex` function by TypeScript AST and executes
it unchanged. Its arithmetic reproduces the captured candidate hover color in
all 24 cases. That explains the preblending; it does **not** prove identical
composited pixels, clipping, animation, stacking, or general paint semantics.

Classification: **application/plugin authoring defect**. The comparison replaces
the reference's paint composition rather than supplying equivalent layer inputs
to the renderer. No defect in core alpha support is established by this finding.
No canonical discrepancy is reclassified by this standalone proof.

## History and implementation boundary

The exact hover rule already exists in initial showcase commit `2f44011`.
Current source is `examples/material-showcase/src/app/astylar.component.ts`
(`.material-button:hover`, currently line 533), with preblending in
`examples/material-showcase/src/app/theme.ts` (`mixHex`, line 53). Source and
function hashes are retained in the machine report. This establishes a historical
input substitution; it does not infer developer intent or identify a renderer
bug that supposedly motivated it.

Future implementation should restore the reference layer/token/opacity intent
and test the shared renderer's composition rules with equivalent inputs. Keep
hover, held press, focus, transitions, clipping and disabled behavior distinct.
Do not replace this finding with an assertion that a rounded RGB blend is an
equivalent CSS declaration. No fixture or renderer changes are made here.

## Verification

```powershell
node scripts/audit-material-button-hover-composition.mjs
node scripts/audit-material-button-hover-composition.mjs --check
node --test --test-concurrency=1 tests/material-parity/button-hover-composition.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation and full no-write replay pass, report SHA-256
`af74f90e8689903725de24527d3ffb274fff6c672992b96354f41c3e7e0ef81f`.
The three proof tests plus four inventory tests pass **7/7**, exit **0**, with
**2,342.6022 ms** total duration, no skips/cancellations/todos. Fourteen rejection
controls cover owner identity/type, layer ownership/generation, opacity/color
and token requests, candidate normal/effective/comparison stages, added child
structure, inspection provenance and the captured hover rule. Inputs remain
unchanged after every control. Three additional rejection controls prevent
substituting hover and held boundaries or accepting an unreviewed focus state.
Positive held and post-activation checks retain their own state and opacity.

An initial development assertion confused raw tree schema 1 with the separate
structure-summary schema 2. Reading the actual tree metadata exposed it; the
proof now checks raw schema 1 and candidate inspection evidence version 2.
Captured evidence was not altered to satisfy that assertion.

The test is explicitly protected by the complete harness inventory: **117
files**, including **109 Material**. Complete harness/parity acceptance and
source-bound canonical integration remain outstanding. The canonical unresolved
count remains **2,160**; other button owners and component state-layer populations
are not inferred from these primary-button cases. The original eight-case hover
proof is retained in `a94d15f`; this increment extends membership from the full
original capture instead of assuming hover observations cover activation/press.
