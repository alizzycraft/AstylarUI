# Root-background classification integration

## Finding

The existing source proof demonstrates 144 groups / 2,311 original observations
where the HTML reference requests fractional CSS color-mix channels and the
showcase theme supplies integer hex channels to AstylarUI. These are unequal
authoring inputs. They are not, by themselves, evidence of a renderer color-mix
defect or visible raster error.

This increment connects the independently replayed root-background evidence to
the main audit builder, discrepancy aggregation, independent source/coverage
validation, Markdown summary, and source fingerprints. Classification occurs
only for previously unresolved observations with exact case, element, property,
input digest and scalar values. It retains all reviewed cases and does not
change either input, existing attributions, renderer code or showcase fixtures.

The evidence collector remains a preparation primitive: its
`canonicalIntegration` / `canonicalCoverageProven` flags stay false because it
does not inspect a generated canonical report. Full canonical coverage requires
the subsequent report regeneration and conservation check.

## Verification

The production-pipeline test compares the same complete original cases with and
without root evidence while leaving other proof populations absent on both
sides. It is intended to establish that only the 144 root classifications change,
all raw values and membership survive, and every unrelated full row is identical.
It is not a substitute for canonical old-to-new conservation.

The first combined run, retained at
`artifacts/material-parity/root-background-integration-e5a8bf2.tap`, had 8 passing
tests and two failures (69,295.083 ms):

1. Importing the root source collector exposed an ESM initialization cycle:
   the line-box helper eagerly read the imported normalization contract. The
   helper now reads it on invocation instead. Its contracts and behavior are
   otherwise unchanged.
2. The new pipeline test assumed raw scalar signatures were globally unique.
   The baseline has 8,362 rows but 8,359 such signatures because classification
   can split a scalar group. The test must preserve those distinct rows rather
   than deduplicate them or treat their existence as lost evidence.

Both failures are audit-code/test concerns, not renderer findings. Subsequent
verification:

- After the initialization correction, the combined rerun passed 10 tests with
  only the still-uncorrected pipeline identity assertion failing; complete output
  is `artifacts/material-parity/root-background-integration-e5a8bf2-rerun.tap`
  (110,679.2095 ms). Source binding, negative controls, alignment/source
  conservation and harness-inventory checks passed.
- The corrected pipeline plus motion conservation passed 2/2 tests with no
  skips, recorded in
  `artifacts/material-parity/root-background-pipeline-e5a8bf2-corrected.tap`
  (97,400.1648 ms). The pipeline preserves all 8,362 rows, changing only 144
  root classifications and leaving 8,218 complete unrelated rows identical.
- Full line-box reconciliation and the existing reader suite passed 112/112
  tests after the initialization correction, recorded in
  `artifacts/material-parity/line-box-after-root-integration-e5a8bf2.tap`
  (52,823.3713 ms).

Commands used Node's `--test --test-concurrency=1 --test-reporter=tap` and
`--test-reporter-destination=<the named artifact>`. The root runs used
`--max-old-space-size=1536`; the line-box run used 3072. Suites were:

```text
Combined root run:
tests/material-parity/root-background-pipeline.spec.mjs
tests/material-parity/root-background-classification-preparation.spec.mjs
tests/material-parity/alignment-survey-conservation.spec.mjs
tests/material-parity/historical-audit-module-source.spec.mjs
tests/parity/material-audit-harness-inventory.spec.mjs

Corrected pipeline run:
tests/material-parity/root-background-pipeline.spec.mjs
tests/material-parity/motion-source-conservation.spec.mjs

Line-box run:
tests/material-parity/control-line-box-reconciliation.spec.mjs
tests/material-parity/normal-line-box-report.spec.mjs
```

## Canonical conservation still required

The pre-integration generated report was preserved at
`artifacts/material-parity/pre-root-classification-e5a8bf2/`, including its
manifest and Markdown. Compressed payload SHA-256:
`d4dc68ab9a12d9de733e2a3c9aa462724ed2bb013ec402f04f8ab9fa291b6d7c`.
This is the earlier generated report with rejected historical line-box evidence,
not an accepted parity result. Regeneration must demonstrate the same raw
scalar population, exactly the new root attributions, restored line-box
evidence, and unchanged unrelated classifications before canonical commit.
The complete audit and enforced parity matrix remain unfinished.
