# Control font-style inheritance reset omission

The first divergence is in shared comparison authoring, before layout or
Babylon projection. The reference stylesheet authors `font: inherit` for
`button, input, select` (`examples/material-showcase/src/styles.scss:22`).
The candidate's rule supplies only the literal family stack
`Roboto, Arial, sans-serif`
(`examples/material-showcase/src/app/astylar.component.ts:476`).
Its nearby comment says this mirrors the reference reset, but the captured
font-style request is not translated.

## Original evidence

The source proof scans all 2,311 original cases and independently reopens
hashed paired trees for **756 property observations**:

- **600 shared Material buttons** across nine diagnostic owners.
- **156 range inputs** across the two slider owners.

Every reference control has one active relevant reset rule: the original
`font: inherit;` serialization with CSSOM `font-style: inherit`. The reference
control and its immediate parent compute `normal`. The candidate's translated
reset contains only `fontFamily`; the complete control-to-page declaration
path omits `fontStyle`, `font`, and `all` in all three captured local stages,
without a possibly matching alternative rule or inline declaration.

The scalar properties and owner identities must agree with the complete trees.
Reference and candidate original values are retained, not replaced with
inferred computed defaults.

The text stages remain distinct:

- Button textures already report `fontStyle: normal`, with the original text
  identity. This is not evidence of currently italic or missing button glyphs.
- Range inputs have neither retained text nor painted control text. Their CSS
  font-style observation must not be converted into a glyph comparison.

Classification: **application/plugin authoring defect**, specifically the
omitted explicit inheritance request. It does not prove a core font-style
inheritance defect, final glyph/raster equivalence, or behavior under non-normal
ancestors. Other font-shorthand properties retain their independent findings.

## Historical provenance and implementation order

The original family-only reset was added in
`af04845d01e8e65ee2e88a67e41dac9ede4c7f3e` (`fix(material): inherit control
typography`). The existing range-reset collector is independently replayed to
retain the before/after source hashes, exact introduced fragment, and current
reference stylesheet hash. The commit/comment do not prove an intent to conceal
a particular renderer failure.

When implementation is authorized, first exercise equivalent `font: inherit`
inputs through public APIs, including normal, italic and oblique ancestors and
the other shorthand-reset properties. If parsing, reset expansion or control
inheritance fails, fix that general core boundary. Only then replace the
family-only authoring with the same inheritance semantics; do not substitute
explicit `fontStyle: normal` or measured text values to match these captures.

## Verification

```text
node scripts/audit-material-control-font-style-reset.mjs
node --test --test-concurrency=1 tests/material-parity/control-font-style-reset.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0. Focused verification passes **7/7**, exit 0, with no
skipped/cancelled/TODO tests, in **15,313.5261ms**. Every original observation is
individually replayed. Thirty-six mutation controls and one range-text-owner
control reject changed captures, controls, declarations, inherited paths,
scalar identities and paint-stage evidence. A separate child regenerates the
source/history proof with writes prohibited; all canonical files remain
byte-identical.

Machine evidence: `docs/material-control-font-style-reset.json`, SHA-256
`8267a8b7cb2ac34c5ecfdd49d0e5964325627a119b339ccb5f84710551de0e3a`.
Logs under `artifacts/material-parity/field-host-flow-input-audit/`:
`control-font-style-reset-generation.log` and
`control-font-style-reset-focused.log`.

No renderer, plugin, reference or candidate authoring changed. Exact canonical
membership/integration is still required; the unresolved count remains 2,026.
The complete audit harness and enforced rendering matrix are separate gates.
