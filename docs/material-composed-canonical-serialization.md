# Composed canonical proof: serialization boundary defect

The first 66-group canonical conservation test passed, but the subsequent
200-group composition test failed at the unchanged-row digest guard. The
failure is in the test's intermediate representation, not evidence of changed
Material inputs. This finding does not establish complete integration or parity.

## Independent diagnosis

The read-only diagnostic separately:

1. Decoded and authenticated the complete original canonical payload via
   `readReviewedProposalCanonical`.
2. Replayed the original seven source/proposal joins with
   `replayReviewedInputProposalBinding` and applied
   `stageReviewedInputTransitions` without changing that function.
3. Decoded and authenticated the complete committed `957774a` canonical payload
   via `readCaretConservationRows` and `git show`.
4. Compared every one of the 8,339 reconstructed rows with its ordered frozen
   counterpart, both by deep value equality and by JSON serialization.

Result: **zero value differences; exactly 134 serialization differences**.
The reconstructed reviewed rows append `reviewEvidence` and `reviewedCases`
after the original evidence fields. The canonical builder inserts those fields
before `occurrences`, `cases`, `states`, and authored examples. Every field's
value, including nested source evidence, is identical. The prior conservation
proof legitimately compared these complete objects by deep equality. Passing
its reconstructed serialization directly into a later byte-sensitive proof
was the new mistake.

The failing composed digest was
`6fcfdb76b336cd370c387bf2a883a9851f64811b0513e49e10df27e5594acb3a`;
the frozen next-stage digest remains
`c46a8886a4cb7d306fa879978581782a1ebe8a1224f1aeb2ddd6bac8608ffe1c`.
Neither expected digest is replaced.

The original sequential run is terminal, exit **1**, **one pass / one failure**,
zero skips/cancellations/TODOs, in **1,288,054.9688ms**. The diagnostic is
terminal, exit **0**. Logs are retained under
`artifacts/material-parity/field-host-flow-input-audit/`:

- `followup-input-canonical-full-conservation.log`;
- `followup-composed-baseline-diagnostic.log`.

## Bounded correction and verification

`conserveIntermediateCanonicalRows` first requires complete ordered deep
equality for every row, then returns a detached copy of the authenticated frozen
serialization for the next proof. It performs no property filtering, sorting,
hash substitution, classification exemption, or source mutation. Its caller must
still authenticate the frozen payload bytes and independently reconstruct the
expected rows. The helper itself makes neither authentication claim.

Focused verification:

```text
node --test --test-concurrency=1 tests/material-parity/canonical-transition-composition.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

**6/6 pass**, exit **0**, zero skips/cancellations/TODOs, in **751.3273ms**.
Two composition tests include 13 rejection cases for changed raw values,
omission, membership/order, attribution, evidence, and extra/missing fields.
Four inventory tests retain complete harness discovery. The focused log is
`followup-composed-serialization-focused.log` in the same directory.

The helper is prepared but not yet wired into the composed canonical test:
the independent full CLI freshness reader is still using that test file's
fingerprint. Once that reader terminates, read and authenticate the intermediate
payload, require its manifest to match the follow-up binding, verify all rows
through this helper, and apply the unchanged follow-up transition to those
frozen-order rows. Rerun the complete composed test and refresh the report's
source fingerprint through normal generation. Do not claim the failed combined
test is green from this focused result.

No renderer, plugin, authored comparison, capture, canonical report, or expected
hash changed in this correction. The nine saved case-index receipt updates,
full builder rerun, historical subset follow-ups, complete audit classification,
and enforced parity matrix remain outstanding.
