# Generated-owner identity in the remaining style review

The [mapping survey](material-owner-initial-style-mappings.json) builds on the
[exact membership binding](material-owner-initial-style-membership.md). It
examines only the **31,508 unresolved observations** in those **600 groups**;
the **636 previously reviewed static observations** remain separately recorded.
No canonical attribution or production rendering behavior is changed.

The completed generation partitions all 600 groups as follows:

| Remaining diagnostic disposition | Groups |
| --- | ---: |
| Captured-default/local-omission evidence in every exact unresolved case | 319 |
| Motion request review | 121 |
| Explicit relevant request review | 10 |
| Explicit requests and motion | 25 |
| Explicit requests and noninitial values | 9 |
| Explicit requests, motion and noninitial values | 6 |
| Generated-owner mapping still insufficient | 62 |
| Captured surface ancestry insufficient | 48 |

The 319 first-row groups account for **17,916 exact unresolved observations**.
They are candidates for a guarded observation-stage attribution, not accepted
computed values or completed renderer diagnoses. The explicit requests, motion,
mapping and ancestry gaps are retained rather than waived by this broader pass.

## Identity evidence, not replacement authoring

The ordinary reader continues to require direct authored IDs. Its new opt-in
mode can additionally use a unique captured `data-parity-id` or the existing
`reviewedTemplateTextMappings` function. That function validates the paired
component anchors, direct-child paths, tag/class/ID constraints, generated-ID
shape and text owner. The survey never adds an ID to the reference tree, changes
the candidate tree, or matches arbitrary nodes merely because their text looks
similar.

For example, the source-reviewed badge path maps `badge-count` to
`span#mat-badge-content-0` under the actual badge anchor. Its motion declarations
are still reported separately; resolving identity is not permission to classify
those styles as equivalent. The real slider `slider-visual` alias is likewise
located through its unique captured `data-parity-id`, without treating the
Material host and replacement candidate structure as equivalent.

Multiple aliases remain a conservative gap in this reader. The two retained
stepper-content aliases illustrate the next refinement: the existing full
template mapping identifies the current panel through its class/path, but the
simple alias branch currently rejects multiple aliases before attempting that
mapping. A future extension should reuse that source-reviewed active-panel path
and prove rejection when both panels appear active; it must not pick the first
alias or infer visibility from the screenshot. Overlay containment outside the
captured main/page chain remains a separate evidence requirement.

## Negative test exposed an identity guard gap

The initial mapping-only tests passed two cases and failed the conflicting-ID
mutation: assigning the synthetic badge ID to a same-tag parent could satisfy
the old tag/style checks. That intermediate result was never integrated into
the canonical audit.

The opt-in reader now also checks scalar/tree content agreement. A reference
input/textarea uses its captured value; other owners reconstruct normalized
subtree text from the captured nodes. Candidate own text/value must agree with
the independently captured scalar structure. Captured own-text snapshots do not
preserve arbitrary interleaving around element children: if this prevents exact
reconstruction, the reader reports a gap rather than guessing. This is a
diagnostic identity guard, not a renderer text/layout change.

All three focused mapping tests now pass, including nine negative mutations
for wrong family, generated-ID shape, classes, text, parent paths, duplicate
owners, conflicting IDs and scalar types. The complete replay is checked
separately before the increment is committed.

## Original evidence conservation

Compared with `cbcca07`, the original survey and membership JSON have identical
non-fingerprint data. Only their source fingerprints were refreshed after the
opt-in reader was added:

| Artifact | SHA-256 of its JSON data excluding sourceFingerprints |
| --- | --- |
| Original owner survey | `0d37e0f7fcbcb0fb1b463641e5994d0aabfa6405ee742055bf9a7c1e7bb9cf46` |
| Exact membership binding | `e7b4cff4aa3cd86047654d19373d36137c97240086cfc5942eeaa13c5b08d320` |

The new report retains all exact unresolved cases, raw tree references, reason
lists, representative diagnostic witnesses and ordered proof digests. It also
fingerprints the existing mapping source. Its generator independently replays
the membership binding before reading each unresolved case's source trees.

## Verification commands

```powershell
node --test --test-name-pattern='mapped survey reuses|mapped survey accepts|mapped survey rejects' tests/material-parity/owner-initial-style-mappings.spec.mjs
node scripts/audit-material-owner-initial-styles.mjs
node scripts/audit-material-owner-initial-membership.mjs
node scripts/audit-material-owner-initial-mappings.mjs
node --test --test-concurrency=1 tests/material-parity/owner-initial-style-survey.spec.mjs tests/material-parity/owner-initial-style-membership.spec.mjs
node --test tests/material-parity/owner-initial-style-mappings.spec.mjs
```

The focused three-test run passes in **2,028.2278 ms**. The original survey and
membership regression command passes **8/8** in **101,822.934 ms**. The full
mapping suite passes **4/4** in **90,352.1922 ms**, including exact no-write
membership and tree replay. Both complete runs have zero failures, skips or
cancellations. All seven mapping-report source fingerprints and the original
capture digest also verify independently. These standalone suites are not yet
registered in the 39-file package harness. These tests
exercise audit evidence, not current UI rendering, pointer interaction or
pixel-level acceptance. The canonical count remains **3,138 unresolved**.
