# Alignment evidence under precise normalization

## Scope and result

The three live alignment readers now authenticate and execute the current
precision-preserving normalizer. Historical attribution collectors execute
their pinned historical implementation from `957774a` instead. This separates
current-value validation from reproduction of old receipts; it does not replace
historical hashes with current ones or round current colors back to old values.

The complete live replay verifies the original input identity, source proof,
selected current property values, classification membership, and reserved rows:

| Reader | Groups | Observations |
| --- | ---: | ---: |
| Vertical alignment / additional font style | 72 | 4,016 |
| Text alignment ancestry | 49 | 2,677 |
| Contextual LTR alignment | 4 | 178 |
| Total | 125 | 6,871 |

These selected values and classifications remain unchanged. This does not prove
used alignment, actual placement, whole-element input equivalence, or renderer
parity. In particular, contextual `start`/`left` evidence is not a global
normalization rule. The live binding records both historical and current
normalization contracts and does not claim to decode the frozen canonical
payload during every synchronous source replay.

## Source conservation

Independent AST comparison against `67db724e5f258c84cfdc70e9da2ccb6ee6353ad0`
found exactly one changed retained statement: `normalizeColor`. The other 230
retained statements match. Evidence:
`artifacts/material-parity/field-host-flow-input-audit/alignment-normalization-source-diff-sep20.log`.

The guard authenticates all seven historical normalization functions with
`8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e`
and all seven current functions with
`27fcf8d751bb10a5a7e9426a4d21b83de3c0d9242387d75a67613b953940c773`.
Only then does it exclude `normalizeColor` from the unchanged-statement check.
It explicitly states that historical and current color values are not equivalent.
All other mapping statements, collector bodies, complete observations, and
non-source survey metadata must still match.

The saved dry-run adapter receipt guard permits only exact reviewed edits:
the existing logical-path serialization correction, the precise live-normalizer
binding, and explicit normalization metadata. Classification, capture identity,
path containment, and row-transition logic remain byte-identical after these
substitutions. Saved receipts retain their historical meaning and bytes.

An initial combined guard run failed with `Fatal process out of memory: Zone`
and exit 1 after two passing receipt tests. The first positive survey test passed
in isolation. Negative-path assertions comparing syntax-tree objects were then
changed to bounded boolean assertions: aliases remain forbidden, and the
conservation wrapper must still own the final return. The complete six-test
guard run subsequently passed, including all negative mutations. No rejection
condition was relaxed to avoid the diagnostic failure.

## Verification

```powershell
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/alignment-font-audit-source-binding.spec.mjs tests/material-parity/text-align-audit-source-binding.spec.mjs tests/material-parity/ltr-alignment-audit-source-binding.spec.mjs
```

**15/15 passed**, exit 0, no failures/skips/cancellations/TODOs, in
**220,365.1251 ms**. Log:
`artifacts/material-parity/field-host-flow-input-audit/alignment-normalization-live-sep20.log`.
Includes read-only complete source replay, actual current-value classifier
inputs, altered-current-value rejection, historical receipt preservation, and
metadata-only transition conservation.

```powershell
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/alignment-adapter-receipt-source.spec.mjs tests/material-parity/alignment-survey-conservation.spec.mjs
```

**6/6 passed**, exit 0, no failures/skips/cancellations/TODOs, in
**13,447.7987 ms**. Log:
`artifacts/material-parity/field-host-flow-input-audit/alignment-normalization-guards-sep20.log`.

After registering all affected receipt/adapter/plan tests in the main audit's
source fingerprints, the same guard command plus
`tests/parity/material-audit-harness-inventory.spec.mjs` passed **10/10**,
exit 0, in **13,811.0409 ms**, with no failures or skips. Log:
`artifacts/material-parity/field-host-flow-input-audit/alignment-normalization-final-guards-sep20.log`.

Historical complete-payload replay:

```powershell
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/vertical-align-canonical-plan.spec.mjs tests/material-parity/text-align-canonical-plan.spec.mjs tests/material-parity/additional-control-font-style-attribution.spec.mjs
```

Log: `artifacts/material-parity/field-host-flow-input-audit/alignment-normalization-historical-sep20.log`.

**10/10 passed**, exit 0, no failures/skips/cancellations/TODOs, in
**319,242.9334 ms**. All three original canonical joins replay unchanged.
The tests preserve the historical plan/proof files and canonical payload;
pure-function tests reject 34 vertical-alignment mutations and 27 additional
font-style mutations as well as text-alignment membership and classification
mutations. Existing reserved/prior-reviewed populations stay separate from
newly proposed classifications. This is historical conservation, not current
canonical regeneration.

## Boundaries and remaining work

No renderer, plugin, canonical comparison input, historical JSON, or canonical
audit payload is changed. The two pre-existing mixed-line-ending restorations
in the comparison and harness remain outside this increment.

Color-dependent classifications and remaining old live-normalizer bindings
still require investigation. Canonical regeneration, complete classifications,
and the complete enforced parity matrix remain outstanding. These passing
checks are audit instrumentation evidence, not proof that the reported UI
defects have been fixed.

The preceding commit's push terminated with HTTP 408. A fresh `git ls-remote`
still returned `d9b374fb6cd744d9e792f4ed30b00f2415ff7f52` for
`codex/material-audit-alignment-integration`; local progress is not claimed as
published.
