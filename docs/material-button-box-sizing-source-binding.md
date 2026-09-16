# Shared-button box-sizing: original-source binding

## Scope and result

This is an audit-evidence increment, not a renderer or comparison-input change.
The [existing survey](material-button-box-sizing-input-survey.md) proved the
bounded box-sizing observations but did not provide a reusable original-source
binding for later canonical attribution. The width-authoring binder cannot fill
that role: it binds style/tree data, not the measured geometry consumed by this
proof.

The new binder reopens the original report, compares the complete selected-case
population **including geometry presence and values**, verifies both source-tree
digests for every case, checks the complete `.material-button` owner inventory,
and reruns the existing authored/scalar/three-stage/geometry inspection. Its
validator independently reopens those sources and compares the entire derived
receipt, rather than trusting its totals or classification flags.

The checked-in [source-bound receipt](material-button-box-sizing-source-binding.json)
retains:

- **2,311 cases**, including **1,831 negative-owner cases**;
- **600 observations**, in **480 selected cases** and **nine owner groups**;
- **108 measured static border boxes**, agreeing with declared candidate sizes
  within the original proof's 0.01 CSS-pixel tolerance;
- **492 interaction observations without retained geometry**, still explicit
  gaps rather than inferred border-box measurements;
- the original fixed-candidate/omitted-reference width-authoring discrepancy;
- false whole-input, whole-rendering, full-layout and interaction-geometry
  verification claims.

Every previous observation, measured/gap case membership, and source-tree
association is conserved exactly by the generator and its tests. The capture
remains `artifacts/material-parity/current-ancestry-audit/latest-report.json`,
SHA-256 `b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.
The previous survey, public proof, canonical report and renderer were not edited.

## Negative controls

Eight caller-source mutations reject dropped negative cases, duplicate cases,
shifted measured positions even when width/height remain internally consistent,
lost static geometry, invented interaction geometry, removed owner inputs and
changed tree descriptors. Fifteen receipt mutations reject removed coverage,
changed measurement/input hashes, shifted retained boxes, upgraded gaps,
changed declarations, forged group membership/equivalence/layout claims,
changed capture hashes and a source path outside Material artifacts.

The mutation tests use a separate three-case diagnostic corpus containing three
static button owners, three interaction button owners and one negative-owner
case. This is not a replacement for the independent full 2,311-case replay in
the first test. Its generated files are retained under
`artifacts/material-parity/button-box-sizing-binding-control-*` for diagnosis.

## Verification

```powershell
node scripts/audit-material-button-box-sizing-binding.mjs
node --test --test-concurrency=1 tests/material-parity/button-box-sizing-source-binding.spec.mjs
node scripts/audit-material-button-box-sizing-binding.mjs --check
```

Generation and complete no-write replay both exit **0**. Focused tests pass
**2/2**, zero failures, skips, cancellations or todos, **27,159.4575ms**.
The full-source validator reopens all capture/tree data in that run; the
23 mutation controls all reject their forged evidence.

The already-running complete harness launched at `14aa5b5` selected **80 files**
before this new spec existed. Its dependencies remain unchanged. This focused
result is separate; it must not be counted in that run. Fresh final harness
discovery must include this new spec (**81 files**, 73 Material plus eight
general/TTS). Neither that running harness nor this focused check substitutes
for the required final enforced comparison matrix.

## Remaining work and ownership

Canonical classification/coverage integration is still pending. This receipt
does not change the current unresolved total or erase scalar differences.
Any future attribution must match the exact owner/property/value population,
retain all 600 cases and the 492 gaps, and preserve unrelated canonical records.

The bounded disposition remains an observation-stage difference with static
native-button sizing evidence. Core declared-size consumption and the audit's
interpretation of observation stages own that distinction. The existing public
native-button calibration is separate evidence; this binding does not rerun it
or extend its scope. Intrinsic sizing, live interaction geometry, composition,
clipping, hit testing and raster equivalence remain separate obligations.

Do not add an Astylar-only `boxSizing` declaration merely to make the scalar
report match. First establish the relevant core rule under equal authored
inputs and preserve the independent fixed-width mismatch while doing so.
