# Reviewed inputs: canonical integration

The audit builder now consumes the seven previously reviewed proposal sets,
after all earlier attribution rules. It replays the twelve underlying original
source proofs, authenticates the committed proposal/membership evidence, and
binds complete scalar inputs and tree descriptors to the supplied report.
It does not insert computed defaults, change comparison normalization, or
rewrite reference/candidate inputs.

## Complete conservation verified

The independently replayed transition agrees with every complete row in the
generated canonical payload:

- **8,339 groups / 386,891 original property observations** retained.
- Exactly **134 groups / 3,325 observations** change classification metadata.
- All **8,205 other complete rows** remain unchanged, including earlier
  classifications with identical scalar tuples.
- Unresolved groups decrease from **2,160 to 2,026**.
- Input equivalence and rendering equivalence are **not established**.

The conservation test authenticates all bytes of both compressed and decoded
current/frozen payloads, replays the seven original joins and twelve source
proofs, and compares the result to the actual builder output. It does not infer
correctness from counts or the first twelve displayed cases. All original raw
fields, occurrence counts, state lists and order remain unchanged.

Other complete rows' ordered-row-digest SHA-256:
`d65133f5c8148f376ea6ff795d06e6760bea1b64052c53dcb90dbe66a2decfb8`.

Current payload: 53,296,756 compressed bytes, SHA-256
`9e229c0cb10b50162b18058a5eb0bca28caa6191679d78019510f336ba9bcec5`;
1,974,047,716 decoded bytes, SHA-256
`0c218356dfedfca0bd75c01de525615939fee290e19ed57682d869a0e2c008da`.

## Validation boundary

The production validator independently replays the source binding before
checking exact classified-row membership and metadata. Missing/invalid source,
missing/duplicate rows, changed property values or cases, fabricated complete
coverage and inflated equivalence claims are rejected. Fourteen added emitted-
row controls supplement the existing eighteen source-projection controls.
Focused subsets explicitly retain omitted original observations; they are not
reported as complete.

The prior combined source/transition/overlay/inventory suite passes **20/20**
in 229,488.5468ms. Full canonical conservation passes **1/1**, exit 0, zero
skipped/cancelled/TODO tests, in **211,327.539ms**:

```text
node --test tests/material-parity/reviewed-input-canonical-integration.spec.mjs
```

## Gap dependency receipts, independently replayed

The first full-generation attempt exposed stale whole-module fingerprints in
the existing gap proofs. It was deliberately stopped after those concrete
failures, before writing canonical output; it was not restarted for a timeout.
All seven original generators were rerun unchanged, in dependency order:

```text
node scripts/audit-material-owner-gap-inputs.mjs
node scripts/audit-material-owner-gap-canonical-join.mjs
node scripts/audit-material-explicit-gap-composition.mjs
node scripts/bind-material-explicit-gap-composition.mjs
node scripts/audit-material-gap-motion-requests.mjs
node scripts/audit-material-gap-scalar-rule-loss.mjs
node scripts/bind-material-gap-review-membership.mjs
```

Every generator exits 0. Against committed baseline `84861a6`, the seven full
JSON objects differ in exactly **11 dependency-hash fields**. Every other
field, including observations, findings, normalizers, source identities,
membership and unresolved motion, is unchanged. The source fingerprint records
the newly replayed producer; it is not presented as the original producer.

A new test authenticates all eleven current dependencies and proves that all
seven generator implementations remain unchanged. Sixteen rejection controls
cover forged receipts and changed evidence. It reruns every generator with
`--check` and filesystem writes prohibited, including spawned child replays.
All seven reports and three canonical files remain byte-identical during that
check. Together with inventory tests: **7/7**, exit 0, no skipped/cancelled/TODO,
**84,964.4771ms**.

```text
node --test --test-concurrency=1 tests/material-parity/reviewed-input-gap-receipts.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

## Full generation and freshness

```text
node scripts/run-material-input-audit.mjs --parity-report=artifacts/material-parity/current-ancestry-audit/latest-report.json --normal-line-box-report=artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json --control-line-box-report=artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json --supplemental-line-box-report=artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit
```

Generation finishes with 436/436 static cases, 1,875/1,875 interaction cases,
132 source findings and exactly one diagnostic: **2,026 differences still lack
root-cause attribution**. Exit 1 is preserved; this is not complete audit
acceptance. The independent command with `--check` is running at this checkpoint
and has not yet been claimed successful.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:
`reviewed-input-integrated-boundary-corrected.log`,
`reviewed-input-gap-receipts-focused.log`,
`reviewed-input-canonical-generation-complete-inventory.log` (stopped failure),
`reviewed-input-canonical-generation-gap-replayed.log`,
`reviewed-input-canonical-conservation.log`, and
`reviewed-input-canonical-freshness.log`.

## Remaining work

The separate leaf-family proposal and expansion owner-mapping finding are not
silently added to these seven sets. Their subsequent canonical integration
requires its own source, membership and precedence evidence. Remaining
classifications, dependent historical guards, complete current harness and
enforced rendering matrix remain outstanding. No renderer, plugin, reference
fixture, visual threshold or comparison input changed in this integration.
