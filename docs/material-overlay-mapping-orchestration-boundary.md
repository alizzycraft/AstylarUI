# Overlay mapping verification across audit orchestration changes

The first reviewed-input builder integration run stopped before generation:
**10/12 tests passed, two failed**, in 119,315.6375ms. Both failures originated
at the current whole-module fingerprint in the historical overlay mapping
reader. The old `input-equivalence-audit.mjs` hash was
`b6b4e62bab949ce5bc955a823225d93085accb67bb27f1c0f9d98796fb66ec73`;
classification wiring changed that module without changing the mapping helpers.
The failed log remains at
`artifacts/material-parity/field-host-flow-input-audit/reviewed-input-integrated-boundary-focused.log`.

## Bounded correction

The mapping reader retains every original receipt and the exact historical
mapping data. If the main audit module differs, it authenticates the prior
source at `4dc770a` against that recorded hash and parses both modules. It
requires every top-level statement outside six named audit orchestration
functions to remain byte-identical after line-ending normalization. Only the
two exact new reviewed-input import declarations are permitted. It rejects
any retained statement referencing a changed orchestration function.

This protects the mapping implementations, their in-module helpers, constants
and existing imports. All other source dependencies still require their whole
file hashes. Original/fresh owner proofs still replay for **91 states / 200
owners**, including all 89 scalar fields and the 17,654 external-root property
checks. A changed mapping function cannot be accepted by refreshing a hash.

The live context receipt records the current module hash and the exact retained
statement proof. The downstream original font-input proof continues to cite its
original context snapshot only after the fresh context is deeply equal in every
observation and non-current receipt. The sole permitted projection restores the
original current-source hash and removes the independently verified current
statement receipt; it neither rewrites that old snapshot nor labels its digest
as today's source digest. Missing projection proof for a changed source is
rejected. All original font observations, source memberships and conclusions
remain byte-identical.

## Verification

```text
node --test tests/material-parity/original-overlay-context-survey.spec.mjs
node --test --test-concurrency=1 tests/material-parity/original-overlay-context-survey.spec.mjs tests/material-parity/reviewed-input-audit-source-binding.spec.mjs tests/material-parity/reviewed-input-proposal-transition.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The combined command passes **20/20**, zero failed/skipped/cancelled/TODO, in
**229,488.5468ms**, including the independent complete frozen-canonical replay.
The final standalone overlay suite passes **8/8**, exit 0, in **19,121.6928ms**
after making its import-shape controls independent of the pending builder edit.
The focused source test additionally covers changed retained functions,
unapproved imports, links into changed orchestration, corrupted anchors,
changed observations and receipt laundering. Its tests also work before the
separate builder integration: approved import forms are exercised synthetically
when absent, rather than relying on an uncommitted dependency.

Logs: `artifacts/material-parity/field-host-flow-input-audit/reviewed-input-integrated-boundary-corrected.log`
and `artifacts/material-parity/field-host-flow-input-audit/overlay-mapping-projection-final-focused.log`.
No renderer, reference, fixture or scalar input was changed. Canonical generation
and complete classification conservation are separate, still-pending checks.
