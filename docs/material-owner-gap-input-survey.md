# Owner gap inputs: original-capture survey

This is an audit-only survey of the **162** unresolved `rowGap`/`columnGap`
groups in the saved report at `2408285b0a3cff2a6366825bb9dee214758bf91d`.
The [machine evidence](material-owner-gap-input-survey.json) preserves all
**9,254** observations across **2,311** original cases. Every group has the
same original-capture occurrence count as the saved report. Canonical
classifications and renderer/comparison inputs are unchanged; input or rendering
equivalence is not established.

## Findings and limits

| Groups | Observed input evidence | Next investigation |
| --- | --- | --- |
| 92 | Browser `normal`; no relevant local candidate request or value in comparison, normal or interaction stages | Bind exact canonical membership and distinguish computed/default values from local declarations; do not synthesize candidate zero |
| 16 | Explicit candidate gap requests, including shorthand where both local longhands are absent | Review original child/wrapper composition, margin-based reference spacing and source history before attributing a layout defect |
| 30 | Reference transition/animation declarations require property-specific review | Determine whether the captured motion can affect gaps; do not discard rules just because the captured scalar is `normal` |
| 24 | Direct ID/unique-alias owner mapping is insufficient | Reuse or extend the independently reviewed generated-owner mapping, especially for overlays; do not select nodes by appearance/order |

These categories partition the 162 groups. The chip groups in the explicit-gap
category also retain reference motion declarations. The 92 omission groups
include different formatting contexts: for example, the reference field host
is `inline-flex` while its candidate is `block`. Their property-local omission
evidence does not equate those structures or their descendants.

The collector reopens and hash-checks every selected paired tree inside the
resolved artifact boundary. It preserves owner keys, mapping kind, raw requests,
three candidate stages, source/revision, formatting context, every selected case,
rejection reasons and per-group proof digests. Unknown potentially applicable
selectors, gap/grid-gap aliases, resets, motion requests, malformed provenance,
duplicate identities and scalar/tree disagreement remain review cases.

The first raw-only selection missed **1,032** observations in the 16 explicit-gap
groups because the original local snapshots contain `gap`, while canonical
comparison expands it into longhands. The corrected survey executes the seven
actual production normalization functions extracted unchanged from the audit
module. Their source digest is recorded. It does not add a separate CSS gap
normalizer or populate omitted raw fields. All 162 counts now agree; count
agreement is still distinguished from a complete canonical membership proof.

## Source/history leads, not a demonstrated renderer cause

The original source requests are in
`examples/material-showcase/src/app/astylar.component.ts`:

- Lines 513 and 690: toggle/chip `gap: '8px'` accompanied by candidate flex
  composition. Commit `c47d589ac2cf1967cc321df38339cb64dabb3732`
  (`fix(example): reuse Material selection indicators`) introduces these rules.
- Line 771: checkbox `gap: '14px'`, introduced in that same commit while changing
  the candidate from a native checkbox input to a composed role-checkbox `div`.
  This is direct evidence of changed composition, not proof of why the renderer
  required it or that the resulting spacing is equivalent.
- Line 697: chip-set `gap: '8px'`; the current line is attributed to `00de46ce`.
  Its introduction and relationship to reference wrappers require further review.
- Lines 683 and 792: grid-list `gap: '0'` and dialog-actions `gap: '8px'` already
  exist in the original `2f44011` showcase commit. Later line edits alone must
  not be presented as introducing those gap requests.

The remaining implementation decision belongs to shared CSS layout/cascade and
the component authoring boundary, not a new plugin gap calculation. First prove
equivalent child composition and requests; then reduce any used-gap divergence
through public APIs. Do not replace reference margins/wrappers with candidate
gap values just because one screenshot aligns.

## Verification

```powershell
node scripts/audit-material-owner-gap-inputs.mjs
node --test tests/material-parity/owner-gap-input-evidence.spec.mjs
```

The focused test covers raw omission without equivalence, explicit shorthand
retention, 24 provenance/request/mapping rejection mutations, unique/ambiguous
alias controls, property isolation, every original group count, and complete
no-write source replay. It also hashes the canonical manifest, compressed
payload and human report before/after replay to reject mutation.

Final focused session **97385** exits **0**: **4/4 passing**, zero failures,
skips, cancellations or todos, **26,992.2993 ms**. Its log is
`artifacts/material-parity/field-host-flow-input-audit/owner-gap-survey-tests.log`,
**1,215 bytes**, SHA-256
`101f1aab9b98918e4760ac8ed2500d421ed5194a4bae6546c29aa075cc247f0d`.

The current full harness discovers this new spec in addition to the previous
90 files: **91 total**, comprising 83 Material, four general parity and four TTS
specs, retaining all 43 legacy files. A focused pass is not a complete current harness or enforced parity
result. Canonical integration, exact membership binding, remaining review cases,
used-gap public proofs and final matrix acceptance remain outstanding.
