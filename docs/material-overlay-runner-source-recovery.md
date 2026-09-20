# Exact historical overlay-runner bytes across checkout line endings

The original 91-state overlay capture records a raw SHA-256 for
`tests/material-parity/run-material-parity.mjs`:
`b2477a124293aec6bba3a2413ff58d41f409288dcf0cb53a54ed17d162b9fa97`.
The retained producer in `D:/dev/github/AstylarUI-material` still matches it.
Its 1,724 split lines contain 564 CRLF endings and other LF endings. The
integration worktree's LF checkout has SHA-256
`c3cabcfde7b9a0cd911eb919774e258145aefc629ff308a48f1f51ece0f34e10`.
Removing CR from CRLF pairs makes the two texts identical. All other ordinary
producer source receipts match exactly; the separately reviewed historical
main audit-module receipt remains a distinct source-history case.

The checked-in line-ending map was extracted from that retained raw producer,
not inferred from a desired result. `recoverOriginalOverlayRunnerSource`
requires the known complete LF content hash, reconstructs only the recorded
line endings, and verifies the resulting complete bytes against the original
raw capture receipt. No receipt or captured observation is rewritten. It does
not permit arbitrary source normalization or accept content edits.

The proof also parses the recovered bytes and verifies all eight reused action
function hashes from the original capture. Line endings inside source text can
matter; this is exact historical-byte recovery, **not** a blanket claim that
running a differently formatted producer has identical behavior.

## Verification

```text
node --test tests/material-parity/original-overlay-runner-source.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

**7/7 pass**, exit 0, **571.9127ms**, no failures, skips, cancellations or TODOs.
Log: `artifacts/material-parity/field-host-flow-input-audit/overlay-runner-source-tests-sep20.log`.
Tests verify LF, CRLF and original mixed representations; reject content,
receipt, identity and line-map mutations; authenticate all eight action
functions; and confirm the capture manifest remains unchanged.

This is an enabling provenance proof. The original overlay-context reader has
not been changed to use it, and its complete eight-test suite still requires
verification in the integration worktree. Neither the canonical generator's
live inputs nor the original full-harness worktree was modified. Integration
must preserve original byte and function receipts, owner/state coverage and
all existing rejection checks. Do not claim this focused pass establishes
complete overlay replay or rendering equivalence.

## Composed reader proof

The recovery is now exercised through the existing reader's `readBytes`
dependency in a separate test. Only the known runner source is reconstructed;
all other evidence is read unchanged. The reader replays all **91 states**,
**200 mapped original owners** and **17,654 root-property observations**.
Two additional controls corrupt an owner while recomputing its outer hashes,
and remove a state; the existing downstream checks reject both.

The expanded recovery/inventory command passes **8/8**, exit 0,
**5,061.5932ms**, with no failures, skips, cancellations or TODOs. Log:
`artifacts/material-parity/field-host-flow-input-audit/overlay-runner-composed-source-tests-sep20.log`.
This is the recovery suite plus inventory checks, not the separate eight-test
`original-overlay-context-survey.spec.mjs` suite. That suite and the default
reader's eventual integration remain pending. No new browser capture, candidate
replay, canonical classification or rendering equivalence is claimed.
