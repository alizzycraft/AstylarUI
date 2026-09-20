# Reviewed input evidence after the color-precision correction

## Scope

Seven historical proposal sets cover 134 groups and 3,325 observations. Their
historical joins were proved with a color normalizer that rounded fractional
channels. Requiring that old implementation in the live audit would either
block the precision correction or silently retain its information loss.

The replay now separates two contracts:

- Frozen joins execute the original seven normalization functions from
  `06e50dbcd3594c5987d63a4ec38e792b87b08dde`, authenticated by their original
  `8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e` digest.
- Current classification executes the live seven functions authenticated by
  `27fcf8d751bb10a5a7e9426a4d21b83de3c0d9242387d75a67613b953940c773`.
  Every selected reference and candidate value must still equal its proposal
  value, and every complete raw input and source proof must retain its digest.
  A changed value fails validation; it is not rounded back into the old group.

The current evidence explicitly records both normalization contracts. The
synchronous builder replays all source proofs but does not claim that it also
rejoins the historical two-gigabyte canonical payload. A separate read-only
test authenticates that full payload and replays all seven complete joins.

All 3,325 selected property values and their classifications remain unchanged
under the precise normalizer. This does not contradict the previously measured
color changes elsewhere in the capture: this boundary validates only its exact
reviewed memberships and properties, not every property on those elements.

| Source plan | Groups | Observations |
| --- | ---: | ---: |
| Container font size | 63 | 1,150 |
| Leaf font size | 15 | 152 |
| Authoring inputs | 9 | 136 |
| Font ownership | 12 | 401 |
| Button paint | 8 | 24 |
| Host font tokens | 7 | 380 |
| Container font family | 20 | 1,082 |

## Overlay source guard

The initial replay exposed a second stale assumption in the overlay source
guard: all non-orchestration statements were required to match the old audit
module, including `normalizeColor`. The guard now authenticates that one
function's historical and corrected implementations separately, using the
reviewed correction at `704b2eb299c4fb654229b74a9f5b51877cbf6f98`.
All 226 other retained statements must still match exactly; unrelated source
changes and dependencies on changed orchestration remain rejected.

This is explicitly a semantic normalization change, not a claim that old and
current color values are equal. The original overlay mapping data, all 91
captured states and 200 owner proofs still require full replay. Historical
snapshots are retained only after exact comparison of their observations and
non-current lineage fields. No old receipt is rewritten to a new source hash.

The large statement comparison uses `isDeepStrictEqual` with a bounded assertion
message rather than asking the assertion formatter to expand the entire source
on a deliberate negative test. Its comparison semantics are unchanged.

## Verification and limitations

The original failed replay is retained in
`artifacts/material-parity/field-host-flow-input-audit/reviewed-normalization-source-binding-sep20.log`.
It failed on the changed non-orchestration source. A subsequent combined run
ran out of memory; its later source replay also failed while launching a Git
history read. Neither run is accepted as a pass.

The bounded-memory verification command is:

```powershell
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/original-overlay-context-survey.spec.mjs tests/material-parity/reviewed-input-audit-source-binding.spec.mjs tests/material-parity/reviewed-input-proposal-binding.spec.mjs tests/material-parity/reviewed-input-proposal-transition.spec.mjs
```

Its log is
`artifacts/material-parity/field-host-flow-input-audit/reviewed-normalization-focused-final-sep20.log`.
The terminal result was **23/23 passed**, exit 0, no failures, skips,
cancellations or TODOs, in **386,821.5167 ms**. The full source-bound transition
also preserved all 8,205 unrelated complete historical rows and left the
canonical files unchanged. Negative controls reject altered normalizers,
changed actual values, incomplete or duplicate membership, changed source
receipts, and unsupported equivalence/renderer-cause claims.

No renderer, plugin, canonical comparison input, historical proposal JSON or
canonical audit payload is changed by this increment. Other historical readers
still need revalidation against precise normalization, and full audit coverage
and the enforced parity matrix remain incomplete. These checks do not establish
input or rendering equivalence for the entire application.

## Publication

The push of the preceding caret increment failed with HTTP 408. A smaller push
of the first unpublished ancestor, `7cd5cb79f65f30a6468a41cbd9d643aadb723d72`,
also failed with HTTP 408 after transferring a 40.13 MiB pack. A subsequent
`git ls-remote` still returned `d9b374fb6cd744d9e792f4ed30b00f2415ff7f52` for
`codex/material-audit-alignment-integration`. Neither transfer is claimed as
published. The smaller attempt's terminal log is
`artifacts/material-parity/field-host-flow-input-audit/reviewed-normalization-incremental-push-retry-sep20.log`.
