# Caret attribution: authenticated complete-capture source join

`tests/material-parity/owner-caret-source-binding.mjs` prepares the source boundary
for the [caret attribution](material-owner-caret-attribution.md) and its
[independent coverage check](material-owner-caret-coverage.md). This remains an
audit candidate, not a canonical integration or renderer change.

## What the binding proves

The saved attribution report must equal the report committed at
`0c96500aebc010f8ba1209f1dda46c83ea01549e`. Its parent must match both its recorded
byte digest and committed parent revision. Eleven complete source receipts are
checked against the active proof/inspection/membership code.

The canonical audit module is used only to extract seven exact production
normalization functions. Their combined AST text must match the parent's pinned
normalization digest. The binding records both historical and current whole-file
digests without replacing either. This distinction permits a later import of the
new binder into the surrounding canonical builder, but does not permit changed
normalization semantics. Other proof dependencies still require complete-source
matches. A comment-only positive control and altered/missing/duplicate function
negative controls exercise this boundary.

The original capture file must match its recorded digest. The caller's complete
case metadata, viewport, tree descriptors and scalar inputs must match that
capture. Every selected paired tree is reopened and digest-checked. For each
observation the original inspector recomputes the complete ancestry/declaration
proof, and the classifier recomputes the complete proposed classification. Both
must match the saved observation. Ordered membership and all selected cases are
checked, followed by the separate original-scalar coverage join.

The resulting context map contains **4,050 original observations / 1,734 selected
cases**, from **2,311 source cases**. A production-shaped grouping loop consumes
those contexts and the original inputs. Its **118 groups / 3,154 classified
observations** exactly match independently prepared output coverage; **896
observations remain unclassified**. These are observation-stage findings, not
proof that caret values or visible rendering are equivalent.

## Verification

```powershell
node scripts/check-material-owner-caret-source-binding.mjs
node --check scripts/check-material-owner-caret-source-binding.mjs
node --check tests/material-parity/owner-caret-source-binding.mjs
git diff --check
```

The final checker exits **0**. It performs complete binding/replay, grouping and
coverage checks, and **13 rejection controls** covering changed profiles/states,
raw values and candidate omission, missing owners, changed tree descriptors,
paths outside the artifact boundary, forged source receipts, duplicate contexts,
inflated rendering claims and changed normalization functions. A separate full
replay rejects a forged evidence object rather than accepting self-consistent
summary counts. The three canonical audit artifacts retain their original byte
digests throughout.

The initial run reached the last positive control and failed because that
control compared a badge-label color with the unrelated first context's color.
It was corrected to compare the same complete original input through both
normalizers. No inspector, classifier, source record or expected population was
changed to pass the retry.

- Initial failed-control log:
  `artifacts/material-parity/field-host-flow-input-audit/owner-caret-source-binding-check.log`,
  SHA-256 `a253b297fdb2c6d28e995a26447b8f97dd9f23690895ab90a467428de05762f3`.
- Passing retry log: `owner-caret-source-binding-recheck.log` in the same folder,
  SHA-256 `66d05ec52fd103dd451b02e1776ee8ba210fd94b8c383030f8530111e49b4e13`.
- Bound provenance object SHA-256:
  `02c335e07cab68c81f21d60c367043a87cced75a78946b9ea88435a68c71ffd0`.
- Complete rederived observations SHA-256:
  `e55080048682e77d2094a9ff513924cde68a92f506fba527becde1c40ee1f143`.

## Integration limits

This binder currently accepts the **complete pinned original capture**, not
arbitrary or filtered capture files. Missing input paths return an unbound result;
changed captures return an explicit invalid result. Before canonical integration,
account for the harness's isolated subset captures without silently dropping
coverage obligations: authenticate their membership against the same originals,
track missing observations explicitly, and require full membership for complete
audit acceptance. A subset must never be promoted to full-corpus evidence.

The canonical builder does not yet import this module; the existing live harness
and dependencies remain unchanged. Add focused inventory only after that run
terminates. Canonical integration still requires all-row scalar/authored-input
conservation, exact preservation of unrelated classifications, regeneration and
no-write replay, and the complete current harness/enforced parity matrix.
The canonical unresolved count remains **2,278**.
