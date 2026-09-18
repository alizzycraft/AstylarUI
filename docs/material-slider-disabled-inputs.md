# Slider disabled state is not forwarded to its visual owner

The [machine evidence](material-slider-disabled-inputs.json) scans the complete
**2,311-case** original capture. All **78 slider cases** are accounted for:
70 have numerically equal host opacity (`1` versus `1.0`), while all **eight
disabled cases** differ (`0.38` versus `1.0`). The eight cases cover four profiles
at desktop DPR 1/2. Matching opacity in the other cases is not full equivalence.

The original Material `mat-slider` has `mdc-slider--disabled`, whose captured
active rule explicitly requests `opacity: 0.38`. Its two child range inputs are
also disabled. In the candidate, both range inputs are disabled, but they are
siblings of a separate `showcase.material:range-visual`. That visual has no
disabled flag, disabled data, opacity data or authored children.

Every captured candidate opacity rule is retained and checked: `#slider-disabled`
requests `1`, while `#slider-start` and `#slider-primary` request `0`. None targets
the visual or its ancestors. The visual and each real captured ancestor retain
opacity `1.0` at normal/effective/comparison stages, with no inline or `all` reset
requests. The synthetic root has no captured local style; it is recorded as such,
not assigned an invented computed opacity.

Classification: **application/plugin authoring defect**. The first demonstrated
divergence is the fixture's disabled-state/opacity input to its separate visual
owner, before projection. Current authoring can be located in
`examples/material-showcase/src/app/reference.component.ts:82` and
`examples/material-showcase/src/app/astylar.component.ts:901` (visual followed by
the two disabled-capable sibling controls). These are navigation references;
the proof itself uses the immutable original capture and both authenticated
input trees, not an inference from current source alone.

A future correction should supply the reference disabled-state styling through
the shared styling/paint path and then verify core group opacity with equivalent
inputs. This audit does not change either fixture or renderer, prove final group
compositing, explain swapped thumbs/jerky dragging, or diagnose the black hover
ring. Those remain separate from this disabled-state finding. Control bounds and
steps remain present in the machine evidence rather than being treated as equal.

## Verification

```powershell
node scripts/audit-material-slider-disabled-inputs.mjs
node scripts/audit-material-slider-disabled-inputs.mjs --check
node --test --test-concurrency=1 tests/material-parity/slider-disabled-inputs.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation and full no-write replay pass. Machine report SHA-256:
`b0940fff625541609b48e2a71b503332ea0e4913faf47476ddeae66d407ed8b2`.
The two proof tests and four inventory tests pass **6/6**, exit **0**, no skips,
cancellations or todos, total **2,822.0972 ms**. Eighteen rejection controls cover
inspection provenance, reference disabled state/rule/opacity, candidate disabled
or opacity requests, added children, rule/inline/ancestor changes, control state
and ownership, and changed comparison/effective scalars. Original inputs remain
unchanged after those controls.

The source report's fixed SHA-256 is
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`;
each observation retains its complete scalar-input digest and paired tree
descriptors. The test is explicitly required by the discovered harness inventory,
now **118 files** (110 Material, four general, four TTS; all 43 legacy files).
No canonical attribution is promoted; full audit and rendering acceptance remain
outstanding.
