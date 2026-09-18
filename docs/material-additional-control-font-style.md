# Additional control font-style reset omissions

The shared reference `button, input, select { font: inherit; }` rule
(`examples/material-showcase/src/styles.scss:22`) requests inherited font style.
The candidate reset supplies only `fontFamily: 'Roboto, Arial, sans-serif'`
(`examples/material-showcase/src/app/astylar.component.ts:476`). This authoring
divergence also affects four controls excluded by the earlier shared-button
proof's `.material-button` ownership boundary.

| Original control | Actual candidate class | Observations |
| --- | --- | ---: |
| `card-open` | `text-button` | 52 |
| `toolbar-action` | `toolbar-action` | 52 |
| `dialog-cancel` | `dialog-action` | 32 |
| `dialog-save` | `dialog-action primary` | 32 |

The new proof scans all **2,311 original cases**, reopens hash-authenticated
paired trees, and checks all **168 observations**. It does not rename these
controls or change their classes to fit the earlier proof. All original scalar
properties must match their actual owners, and all three captured candidate
style stages must agree with the original input records.

Each reference control has the explicit `font-style: inherit` request from
the original shorthand, with no competing relevant declaration. Each candidate
control-to-page path omits the inheritance request, without a possibly matching
alternative rule or inline override. The actual button texture still reports
`fontStyle: normal` and the original text.

Classification: **application/plugin authoring defect**. The first divergence
is the omitted inheritance request, before layout or projection. This is not
evidence of incorrect glyphs in these captures, a core inheritance failure,
whole-element equivalence, or behavior under italic/oblique ancestors.

The original reset provenance is independently replayed from commit
`af04845d01e8e65ee2e88a67e41dac9ede4c7f3e`; the commit/comment does not prove
an intention to conceal a renderer defect. Before implementation, test the
same `font: inherit` request through public APIs under normal and non-normal
ancestors. Fix any demonstrated general parsing/reset/inheritance defect before
replacing the family-only translation. Do not add explicit `fontStyle: normal`
to imitate these screenshots.

## Verification

```text
node scripts/audit-material-additional-control-font-style.mjs
node --test --test-concurrency=1 tests/material-parity/additional-control-font-style.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation passes. Focused verification: **7/7**, exit 0, **9,045.444ms**,
zero failures/skips/cancellations/TODOs. Every observation is replayed;
31 non-no-op mutations reject changed identities, source ownership, reset
requests, inherited paths and texture stages. A separate write-prohibited
process regenerates the source/history proof.

Machine report: `docs/material-additional-control-font-style.json`, SHA-256
`104b291da1f68e722568e82fe3af4d7a81516d47380ff77ea27fc02f93783f49`.
Logs under `artifacts/material-parity/field-host-flow-input-audit/`:
`additional-control-font-style-generation.log` and
`additional-control-font-style-focused.log`.

The earlier 756-observation proof remains unchanged. These additional 168
observations are not included in its canonical proposal or the pending
66-group integration; exact full-canonical membership remains a next step.
No renderer, plugin or canonical fixture behavior changed.
