# Alignment adapters: preserve historical dry-run evidence

The three alignment adapters now serialize the supplied logical capture path,
not its junction-resolved external-worktree path. The real path remains the
target for containment validation, reading and capture authentication. This is
an audit-infrastructure correction, not a classification or renderer change.

The first full adapter rerun failed **3 of 15 tests** because saved dry-run
receipts compared their historical source hashes with the changed current
sources. The receipts were correct for their original sources and were not
rewritten. All twelve other source-replay, membership and transition tests passed.

`alignment-adapter-receipt-source.mjs` authenticates the original raw source
against the exact recorded hash and commit
`67db724e5f258c84cfdc70e9da2ccb6ee6353ad0`. It permits exactly one replacement:

```js
// Historical output-path serialization
file: path.relative(root, target).replaceAll('\\', '/')
// Current output-path serialization
file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/')
```

The entire remaining source must match, apart from checkout line endings. This
retains containment checks, source authentication, classification and row
conservation. It does not generally accept arbitrary current sources for an
old receipt. The three original log/row-conservation tests retain their other
assertions unchanged.

## Verification

```text
node --max-old-space-size=2048 --test --test-concurrency=1 tests/material-parity/alignment-adapter-receipt-source.spec.mjs tests/material-parity/alignment-font-audit-source-binding.spec.mjs tests/material-parity/text-align-audit-source-binding.spec.mjs tests/material-parity/ltr-alignment-audit-source-binding.spec.mjs
```

**17/17 pass**, exit 0, **279,818.9231ms**, no failures, cancellations, skips or
TODOs. Log:
`artifacts/material-parity/field-host-flow-input-audit/alignment-adapters-historical-receipts-sep20.log`.
This includes all three complete original-source replays, subset and negative
controls, metadata transitions and historical receipts. The new guard has 27
negative executions covering identity, hashes, source changes, classification,
containment and path expressions. Guard/inventory tests separately passed 6/6.

This does not establish canonical integration, complete audit-harness acceptance
or rendering parity. The historical dry runs still do not claim integration.
