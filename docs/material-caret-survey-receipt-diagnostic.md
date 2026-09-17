# Historical caret survey: complete replay across builder integration

The proposed canonical caret integration changes the enclosing audit builder,
not its seven executed normalization functions. The immutable original survey
records builder SHA-256
`252754869d5683cc76ba0784a96fc55d5c50aa8eeeb8a0441c131ec0a62eb6d4`;
the integrated builder is
`b6b4e62bab949ce5bc955a823225d93085accb67bb27f1c0f9d98796fb66ec73`.
The original generator's exact-file `--check` consequently fails.

The complete unchanged five-test survey file initially reports **4 passed,
1 failed**, exit **1**, **26,928.1134 ms**. Retained log:
`artifacts/material-parity/field-host-flow-input-audit/caret-original-survey-integration-diagnostic.log`,
SHA-256 `bd8a2a273dbf8fc6aaf2aae922460ba80e20d23a4630c49333c65dab87a80a2a`.

## Independent original-generator replay

`scripts/diagnose-material-caret-survey-receipt.mjs` verifies the saved parent
against committed revision `280e86c013c7ba6ed0b3be58e3cd1a60ecadb0bb`, checks
every other complete source dependency, and authenticates the seven executed
normalization functions by their pinned AST digest.

It executes the actual original generator, including its historical compressed
canonical rows, original scalar/tree inspection, and complete membership join.
Only import locations are relocated. An inserted read-only check immediately
before the final comparison/write branch requires that restoring the one
historical module receipt makes the **entire generated object** identical to the
immutable survey. All original statements are AST-compared unchanged. The
diagnostic exits before the write branch; neither the survey nor the three
canonical audit artifacts is rewritten.

The successful replay preserves **145 groups, 1,734 selected cases and 4,050
observations**, including the original **86 local-omission groups / 2,358
observations**. This does not classify pending owners or establish input/paint
equivalence. The unadapted historical `--check` still fails by design.

The first diagnostic attempt failed before execution because bare package
imports cannot resolve from a data URL. Relocating those import specifiers too
corrected that diagnostic loader; no generator calculation changed. The passing
replay log is `caret-original-survey-receipt-recheck.log` in the same folder,
SHA-256 `883039cd7381a6c0dda7df328b06c44b145b0c1c2a443c862f7b57c90e1322ca`.

## Current test boundary

The original survey test now calls that complete generator replay rather than
requiring an unrelated enclosing-module hash to remain frozen. It retains all
original count, range-owner, membership, negative-control and false-equivalence
assertions, and additionally requires authenticated unchanged non-receipt
evidence and the exact seven normalization functions.

```powershell
node --test tests/material-parity/owner-caret-input-evidence.spec.mjs
node --check scripts/diagnose-material-caret-survey-receipt.mjs
git diff --check
```

The complete file passes **5/5**, exit **0**, **26,467.5119 ms**, with no skipped,
cancelled or todo tests. Log: `caret-survey-executed-boundary-recheck.log` in the
same folder. This is a focused historical-evidence check, not a full canonical
conservation, complete harness, or rendering-parity result.

Passing test log SHA-256:
`04a18a11ec2b750d6a1647e395dc1d69e46a59acdfcb89051ffdbb901877ba02`.
