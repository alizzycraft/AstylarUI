# Follow-up integration: preserve historical overlay mapping evidence

The pending four-set classifier integration adds two imports to the main audit
module. The existing historical overlay projection rejected them as changes
outside its previously reviewed orchestration imports. A focused test reproduced
that precise failure before the correction.

The projection now recognizes only the exact named imports from
`followup-input-audit-source-binding.mjs` and
`followup-input-proposal-transition.mjs`. All retained top-level statements
must still match the hash-authenticated historical source at `4dc770a` exactly.
The six existing orchestration-function boundaries are unchanged. Mapping,
normalization, unrelated imports, original captures and their receipts are not
exempted or rewritten.

The added rejection controls cover a changed imported member, an alias, a
default import, a duplicate import and a new mapping function reaching the
follow-up classifier. Existing controls still reject changes to mapping and
normalization functions, unrelated statements/imports, altered history, and
references into changed orchestration.

## Verification

```text
node --test --test-name-pattern="mapping projection rejects" tests/material-parity/original-overlay-context-survey.spec.mjs
node --test tests/material-parity/original-overlay-context-survey.spec.mjs
```

The first command reproduced the failure (exit 1). After the bounded correction,
the complete file passes **8/8**, exit 0, zero failures/skips/cancellations/TODOs,
in **120,629.7274ms**. This includes complete replay of **91 original states,
200 mapped owner proofs and 17,654 root properties**, plus unchanged historical
context snapshot conservation and rejection of altered observations/receipts.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:
`followup-overlay-projection-before.log` and
`followup-overlay-projection-focused.log`.

This is audit instrumentation only. It neither establishes input/rendering
equivalence nor proves the pending canonical integration. No renderer, plugin,
comparison input or visual threshold changed.
