# Composed canonical proof: serialization boundary defect

## 2026-09-19 integration checkpoint

The independent full CLI `--check` terminated, exit **1**, with no freshness
mismatch and only the retained **1,960 unresolved-group** error. That result
applies to the preceding 344-source report, not the subsequent edits.

The guard is now wired into the composed test: it independently reads the
complete frozen intermediate payload, checks its manifest against the follow-up
binding, compares all reconstructed rows, requires exactly 134 serialization-only
differences, and supplies the frozen-order rows to the unchanged follow-up
transition. The corrected run now passes **3/3**, exit **0**, zero skips/
failures/cancellations/TODOs, in **837,623.9177ms**. It verifies exactly 200
changed groups / 5,965 observations and 8,139 other complete rows conserved,
with ordered digest
`bb540087c97143a8448bdb9c57c5bfb79c8becdf2bbd9591a5cb66194c218c62`.
All 386,891 raw observations remain; 1,960 groups remain unresolved. This is
complete-row integration evidence, not full-builder freshness or rendering parity.

Both guard source/test files are added to the canonical source inventory:
**346 total**, retaining the original 308 in order and enumerating exactly 38
additions. The focused fingerprint test passes **1/1**, exit 0, in
**4,184.9306ms**. Normal generation must refresh this metadata; the previously
verified report is intentionally not presented as current after the edit.

Logs: `followup-composed-canonical-corrected.log` and
`followup-composed-fingerprints.log` under the existing artifact directory.

## Original failure and diagnosis

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

Initially the helper remained unwired while the independent CLI freshness
reader used that test file's fingerprint. The subsequent full integration
and passing composed test are recorded above. Canonical source metadata still
requires normal regeneration; the focused result alone was never used to
declare the failed combined test green.

No renderer, plugin, authored comparison, capture, canonical report, or expected
hash changed in this correction. The nine saved case-index receipt updates,
full builder rerun, historical subset follow-ups, complete audit classification,
and enforced parity matrix remain outstanding.
