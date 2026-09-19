# Text alignment: source-bound canonical membership proposal

This audit-only proposal joins the complete
[text-alignment ancestry survey](material-text-align-ancestry.md) to the frozen
canonical payload at `957774a`. It does not change the current canonical report,
renderer, fixtures, normalizers or classification precedence.

## Exact scope

The collector independently replays the source survey pinned at `7fa9b1b`,
authenticates the original capture and every selected input tree, and uses the
production normalization functions. It streams and authenticates every byte of
the frozen canonical payload, retaining complete discrepancy rows. Each proposed
row must match exact family, owner, property, values, occurrence count, original
case membership, ordered sample cases and states. Its complete original row hash
is retained for later integration; matching totals alone are not sufficient.

| Disposition | Groups | Observations |
| --- | ---: | ---: |
| Proposed computed-versus-local observation-stage classification | 48 | 2,659 |
| Proposed tooltip scalar authoring-omission classification | 1 | 18 |
| Earlier classifications preserved | 42 | 2,888 |
| Specific review still needed | 10 | 413 |
| **Original differing population** | **101** | **5,978** |

The 960 equal scalar observations and eight missing tooltip counterparts remain
accounted for separately. All **8,290 other complete canonical rows** stay
outside the proposal; their ordered row-digest hash is
`0f5b0c2bdf9e46bec94b462ab70eb092819fbd5b97e488be0ef68dd0eb2ebd56`.

## What the proposed classifications mean

For the 48 observation-stage groups, the browser owner/ancestor path computes
`start` with LTR direction. Neither captured path contains a relevant alignment,
reset or direction request; candidate local inspection stages omit `textAlign`.
The comparison is therefore between a computed browser value and local
declaration absence. This diagnoses the measurement-stage mismatch only.
It does **not** manufacture a candidate inherited/computed value, assume an
external reference ancestor, prove plugin consumption, waive motion, or certify
glyph placement. Unknown or explicit requests remain outside this rule.

The tooltip case reuses the demonstrated authoring discrepancy: the original
active Material surface rule explicitly requests `text-align: center`, the
candidate popup-to-root inputs omit it, and retained core text records `left`.
This binds the finding to its original 18-observation scalar group without
replacing the previous retained-text attribution. The candidate's flex centering
is not treated as equivalent text alignment. Position, size, blur, clipping and
final rendering remain separate obligations.

Every proposed record explicitly keeps whole-element input equivalence,
candidate computed/used alignment, renderer causality and rendering equivalence
false. No raw input is normalized away or deleted.

## Retained cases

- Five explicit `left` groups: sort, stepper content, expansion trigger and both
  bottom-sheet items. Logical/physical alignment intent needs its own review.
- Expansion title: the parent has an alignment request, so local omission does
  not qualify for the no-request classification.
- Both progress plugins: reference direction-related requests and private
  consumers remain visible, not waived as harmless defaults.
- Bottom-sheet and snackbar wrappers: all 59 known layered-rule capture gaps
  remain unresolved.

The frozen expansion-trigger row also belongs to the separate follow-up review;
it is retained here, not given a competing proposal. The current working report
has later reviews than the frozen payload. Integration must preserve them and
check complete original row hashes rather than projecting this proposal's
baseline unresolved count onto the current report.

## Verification

```powershell
node --max-old-space-size=2048 scripts/bind-material-text-align-ancestry.mjs
node --max-old-space-size=3072 --test --test-concurrency=1 tests/material-parity/text-align-canonical-plan.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0 with 49 proposed groups / 2,677 observations. The independent
full-source/full-payload no-write replay and inventory verification pass **8/8**,
exit **0**, no failures/skips/cancellations/TODOs, in **145,748.1348ms**.
The full-payload test alone takes 120,465.1565ms and checks that canonical/source
files remain byte-identical. Fourteen classification-boundary and fifteen
membership/row mutation controls reject unsupported promotions. Separate checks
preserve earlier reviews, an unrelated row and all false equivalence/causality
flags. The complete proposal replays with exactly the same machine-report hash.

Machine report: [material-text-align-canonical-plan.json](material-text-align-canonical-plan.json),
SHA-256 `94c73aef0ec51c349d985ed366f257541415eeca2188c7b5312296b263439886`.
Logs are `text-align-canonical-plan-generation.log` and
`text-align-canonical-plan-verification.log` under
`artifacts/material-parity/field-host-flow-input-audit/`.
Complete current harness and enforced parity acceptance remain outstanding.
