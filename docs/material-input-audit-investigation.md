# Material input audit: root-cause evidence

This is an investigation record, not a declaration of completed parity or a renderer fix.
The machine report is generated separately from the full benchmark output.

The report generator accepts an explicit evidence path so the fresh full run
does not have to overwrite the preserved baseline. After the new control-text
run completes, use `node scripts/run-material-input-audit.mjs --parity-report=artifacts/material-parity/control-text-complete-audit/latest-report.json`,
then the same command with `--check`. Do not use `--allow-partial` for acceptance.
Argument validation rejects unknown, empty, and repeated options (25/25 audit
tests pass). A missing selected report fails rather than falling back to older
evidence. The retained-text baseline is now complete; it does not contain the
new control-text texture instrumentation.

## Natural-line-box reader rejects mismatched evidence before attribution (2026-09-12)

`loadNormalLineBoxReport` now independently validates the supplemental capture
against the selected run's complete capture provenance and exact static case
results. It checks the manifest and reviewed producer source hashes, case and
checkpoint filename identities, paired tree hashes, observed asset hashes/types,
unique control/reference mappings, original text and typography, font readiness,
viewport/DPR and measurement dimensions. Artifact paths are confined to Material
artifacts, including real-path checks when reading disk. Missing observations
stay missing; any malformed capture returns no partially validated observations.

The reader accepts all **120 observations / 96 cases** from the v2 capture with
zero missing entries and errors against the 436 current static checkpoint cases.
Its focused tests pass **51/51**, covering positive evidence, missing coverage,
corruption, stale sources/results/trees, duplicate identities and altered text,
typography, assets, dimensions, readiness and DPR. These tests are also included
in `npm run parity:harness:check` (**160/160 passed**). This is an evidence-loading increment only:
the main comparator does not yet consume it or normalize any differences, and
no fixture, renderer, capture runtime or full-matrix input has changed.

## Static natural line boxes now have provenance-bound supplemental captures (2026-09-12)

`scripts/audit-material-normal-line-boxes.mjs` completed **120 observations in
96 static cases**, covering all currently mapped normal-line-height labels
across eight families, four profiles and three static viewports. The immutable
local result is
`artifacts/material-parity/normal-line-box-static-audit-v2/latest-report.json`.
Every observed natural line box was **17 CSS pixels**. This remains a scoped
measurement, not a global normalization or completed input-equivalence claim.

The driver uses the frozen matrix server and rejects changed browser versions,
served document/script/style/font bytes, original typography, text, element
identity, viewport or DPR. The browser helper copies natural single-line
typography into a temporary offscreen observer, rejects unsupported structure,
writing modes and generated observer content, verifies the reference rectangle
is unchanged, and removes the observer on success or failure. No fixture input
or renderer implementation was changed. The first attempt rejected an incorrect
document filename expectation (`index.html` versus the served `index.csr.html`);
it produced no usable observations and was preserved separately.

An independent post-capture check validated all **436 static checkpoint result
digests**, checkpoint key/filename identities, the manifest and both capture
source hashes, all 96 supplemental file hashes, paired input-tree digests, exact
measurement-to-control mappings and typography, and **49,824 served-asset hash
references**. It found exactly the expected 120 unique observations, with no
inventory or recorded runtime errors. The result is static-only; it does not
cover interaction states, baselines, wrapper layout or final glyph rasters.

Reproduction command while the matching frozen server is available:
`node scripts/audit-material-normal-line-boxes.mjs --base-url=http://127.0.0.1:4431
--checkpoint=artifacts/material-parity/control-text-complete-audit/checkpoint
--output=artifacts/material-parity/normal-line-box-static-audit-v2`.
The output directory must be new for another capture. Browser-helper tests:
`npm run material-input-audit:line-box:test` (**4/4 passed**, repeated).

The next increment must add a tested fail-closed evidence loader and join these
observations to their exact report occurrences. Until then the comparator
intentionally leaves the 120 `normal`/17px differences unresolved. Separate
font-list, tracking and disabled-ink differences remain unequal inputs; the
Arial, serif and fallback-glyph core failures below remain valid. The full
matrix continues independently and has not been restarted or narrowed.

## Production normal line-box spot-check narrows the next capture step (2026-09-12)

A separate Chrome context loaded the frozen full-matrix server's actual
`reference/button` pages at 1440x1000, DPR 1, applied each maintained theme
through `__MATERIAL_SHOWCASE_COMMAND__`, and waited for fonts and two frames.
For each of the three direct `.mdc-button__label` leaves, a temporary offscreen
natural block copied the computed font family/size/weight/style/stretch,
kerning, features, variations, variant, spacing, line-height, text-transform,
text-rendering, direction and writing mode, with the same text. The probe was
removed immediately; the reference fixture was not changed and no resulting
measurement was fed to Astylar layout.

All **12 observed labels** (three per light/dark/contrast/custom theme) computed
Roboto 14px/500, `line-height:normal`, .096px tracking, and measured **17px**
natural height with fonts ready. That agrees with the current 17px candidate
paint value for these labels. It does not make their font-list/tracking/alpha
inputs equivalent, establish every normal line box, or invalidate the separate
Arial/serif/fallback-glyph core failures.

This is a diagnostic spot-check, **not yet an accepted normalization rule**.
The next harness step must retain per-case natural-line-box evidence tied to
the original result/tree digests, exact text/computed typography, viewport/DPR,
loaded font assets and runtime provenance. Missing/mismatched evidence must
stay unresolved; a global `normal = 17px` rule would hide the reproduced defect.
Do not alter or restart the ongoing full-matrix capture just to add this
supplemental observation.

## Disabled-button alpha substitution is attributed across themes (2026-09-12)

All twelve static button cases now carry occurrence-level evidence for the
disabled label's alpha-to-opaque authoring substitution, including the nine
dark/contrast/custom cases previously left unresolved. The reference button
and label retain 38%-alpha on-surface ink. The explicit candidate rule and
normal/effective/current texture stages instead agree on an opaque color:
light `#a4a0a7`, dark `#706c72`, contrast `#a09fa1`, custom `#99a0a2`.

The attribution checks the captured active Material disabled-label token rule,
both controls' disabled state, reference parent/label agreement, and the
candidate's explicit rule plus all three paint-input stages. It no longer
depends on one profile name or light-theme RGB constants. Wrong alpha, inactive
rules, duplicate candidate rules and conflicting states remain unresolved.
This classifies unequal fixture paint; it does not certify alpha compositing
or permit preblending as an equivalent representation.

All twelve result/tree digests validate with no inventory errors or current
control mapping gaps. Focused audit tests pass **71/71** and
`npm run parity:harness:check` passes **109/109**. No fixture, renderer,
capture runtime or ongoing matrix input changed.

## CSS normal line-height exposes a core font-metrics defect (2026-09-12)

The new `normal-line-height-audit.spec.ts` package-root proof compares identical
typography/content with a natural one-line DOM block. It observes the actual
core control paint inputs and the unique currently bound texture's logical CSS
height. It does not use the fixed 48px button container as a text-height oracle,
infer input from world-space output, or replace `normal` with an assumed number.

Repeated browser results in Chrome Headless 152 on Windows:

| Typography/content | Browser line box | Current paint and texture height | Result |
| --- | ---: | ---: | --- |
| Roboto 14px/500, Latin, explicit `normal` | 17px | 17px | pass |
| Same, omitted line-height | 17px | 17px | pass |
| Roboto 17.5px/400, `Mg` | 21px | 21px | pass |
| Arial 16px/400, `Mg` | 18px | 17px | fail |
| Serif 20px/400, `Mg` | 23px | 22px | fail |
| Roboto 14px/500, `A😀` | 19px | 17px | fail |
| Roboto 14px/500, `A漢` | 19px | 17px | fail |
| Roboto 14px/500, explicit `21px` | 21px | 21px | pass |
| Roboto 14px/500, explicit `1.5` | 21px | 21px | pass |

`TextStyleParserService.resolveNormalLineHeight`, introduced in `8870fc5`,
measures a fixed `Mg` string and uses only its font bounding-box ascent/descent.
That is not universally the browser normal line box, and the fixed string
cannot account for the actual text's fallback runs. This is a **confirmed core
renderer defect**, owned by normal line-box metrics/fallback-run resolution.
The passing controls rule out a universal one-pixel adjustment. No renderer
implementation or Material inputs were changed. The 120 static Material
`normal`/17px comparisons remain unresolved individually: these new reductions
are not a blanket waiver or proof that all such occurrences are defective.

Command: `npm --prefix examples/material-showcase test -- --watch=false
--browsers=ChromeHeadless --include=src/app/normal-line-height-audit.spec.ts`.
After correcting font availability, four browser runs report **5 passed / 4 diagnostic
failures**, exit 1; the final three also assert the bound texture height, and the
last additionally checks actual weight/style/spacing/white-space inputs. The initial
attempt had seven Roboto font-loading errors and is not rendering evidence.
Karma's test-only asset mapping now serves local Fontsource files; production
build settings and the ongoing frozen full-matrix bundle are unchanged.
Roboto is loaded explicitly under the isolated `MaterialAuditRoboto` family on
both sides. SHA-256 of the original local Latin-normal files:

- 400: `425c0713a8176f92273d378599c7eac57de7fafabd4bd0ed457b70eb8f80d371`
- 500: `5bcc3aa180e7f26f643cd5b2621cd7c2de193d0661d913a94afd3d4881a7a34b`

Final glyph raster, baseline placement, mixed inline fragments and multiline
layout still require separate proof. The implementation plan now explicitly
groups this defect under core typography, not per-component positioning.
The installed packed consumer contains the same `Mg` metrics branch as source.
`npm run parity:harness:check` passes **108/108**, including source-finding and
fingerprint coverage. A transient TypeScript assertion-inference error while
adding the extra paint checks was corrected before the final browser run.

## Paginator icon replacements are classified content differences (2026-09-12)

The current-texture audit now records paginator icons in a separate
`controlTypography.iconSubstitutions` inventory. The reference inputs are
specific SVG paths in a `0 0 24 24` viewBox; the candidate authors and paints
`‹` / `›` as text. Matching previous/next control classes and accessible labels
establish correspondence, not icon equivalence. Each observation retains the
reference control/SVG/path attributes and computed styles, candidate authored
content and normal/effective/current-paint inputs, and core capture revision.

The attribution requires unique controls, exact path geometry, no additional
text/vector content and valid current core texture provenance. Conflicting or
missing witnesses remain collection/mapping gaps. No reference font comparison
is fabricated for a path, and classified substitutions explicitly keep the
input-equivalence verdict false. This does not certify state, wrapper geometry,
core vector support or final raster.

Checkpoint verification covers **52 paginator cases** (12 static and 40
interaction), with valid result and tree digests, no tree errors, and **104
classified SVG-to-glyph substitutions**. There are no current-texture owner
gaps for those cases; retained-text and broader structure review are separate.
Focused audit tests pass **70/70**; `npm run parity:harness:check` passes
**108/108**. No capture runtime, fixture or renderer implementation changed.

## Tab typography now has guarded occurrence attribution (2026-09-12)

All 72 current-texture differences across the 12 static tab cases now have
captured authoring evidence, without declaring the inputs equivalent:

- Font family requires the active `.mat-mdc-tab` font token, matching browser
  label/ancestor values, the candidate control reset and missing `.tab` override,
  and matching candidate normal/effective/current-paint stack values.
- Tracking requires the active tab tracking token and the complete candidate
  control-to-page normal/effective ancestry omitting tracking. The existing
  button omission check now uses the same strictly validated ancestry helper.
- Line-height requires the actual `.mdc-tab__text-label { line-height: 1 }` rule,
  14px font/label line-height, the distinct 20px reference content/control line
  boxes, and the candidate `.tab` 20px declaration in all three core stages.

Every finding preserves its reference chain and specific rule witnesses; the
tracking finding also retains the candidate ancestry. Missing tokens, explicit
overrides, wrong line-box values, duplicate rules and conflicting state inputs
remain unresolved. Focused audit tests pass **68/68**; the complete
`npm run parity:harness:check` suite passes **106/106**. The 12 production result
hashes and input-tree digests validate; there are 24 mapped labels, 72 attributed
differences and no remaining current-texture collection/mapping gaps for these
static tabs. This does not complete retained-text, structure, raster or state
review, and no fixture or renderer implementation changed.

## Tab and paginator input substitutions traced to source (2026-09-12)

The tab differences have source-level authoring causes, recorded separately
from their still-pending per-occurrence attribution. Reference `.mat-mdc-tab`
declares the component font/tracking tokens. Nested `.mdc-tab__text-label`
declares `line-height: 1`, producing 14px at the captured 14px font size; the
surrounding content/control remains 20px. The candidate `.tab` omits font and
tracking, uses one button value label, and supplies 20px line-height. Initial
commit `2f44011` already omitted those tokens. Commit `bc4d442` retained the
20px value while introducing a 1px density-specific top padding. Do not replace
this with another baseline correction: preserve the distinct content/label
inputs, and investigate any core authoring or rendering gap they expose.

Paginator's remaining current-texture gaps are not ordinary missing label
identities. The reference controls contain SVGs with `viewBox="0 0 24 24"`:

- Previous path: `M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z`.
- Next path: `M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z`.

The candidate authors `value: '‹'` / `value: '›'`, and the current core textures
contain those glyphs at 20px. Both substitutions occur in `2f44011`. Matching
the semantic previous/next action does not make font outlines equal to these
SVG paths. The recommended owner is the fixture's icon input translation,
using core vector/image paint; no equal-SVG-input core defect has been shown.
The next reporting step must retain this as a classified structural/content
substitution, not fabricate reference typography or silently discard the
observed text textures. The source audit now has 58 findings.
`npm run parity:harness:check` passes **104/104**, including live source-pattern
detection. No fixture inputs or renderer implementation changed.

## Tab template labels now map to current control textures (2026-09-12)

The tab label is not a direct Material button-label span. Its explicit template
ID is inside `span.mdc-tab__text-label`, `span.mdc-tab__content`, and a
`div.mdc-tab` with `role=tab`. The corresponding candidate is a button with
the same template ID and `role=tab`. The new reviewed path requires unique
identities, leaf content, wrapper/control roles and matching authored/current
texture text. It does not declare the flattened structure equivalent.

All 12 SHA-256-checked static tab captures now yield 24 current-texture
comparisons with no collection or mapping gaps. They expose **72 unequal
typography inputs**: 24 `Roboto` versus `Roboto, Arial, sans-serif` font lists,
24 `.096px` versus zero tracking values, and 24 reference label line-heights of
14px versus candidate control texture line-heights of 20px. These remain
unattributed pending their captured rule and history review. In particular,
the reference tab control/content wrapper computes 20px, but its actual text
label computes 14px; comparing only control boxes would miss that distinction.

Focused audit tests pass 66/66, including malformed/nested/duplicate paths,
wrong roles and text, stale provenance and deliberately unequal typography.
The remaining static current-control mapping gaps are the 24 paginator icon
controls, whose SVG-versus-text substitution must not be treated as a matched
text label. Ordinary retained-text coverage remains a separate review.
`npm run parity:harness:check` passes **104/104**.

## Toolbar substitutes button height for inherited line-height (2026-09-12)

The reference `.mdc-button` inherits line-height from its immediate
`mat-toolbar`, whose title line-height token computes 28px in all 12 captured
static variants. The candidate `.toolbar-action` instead assigns the same
density branch to `height` and `lineHeight`: 40px for light/dark, 24px for
contrast and 28px for custom. Git blame traces the current rule to `3bf5b4d`.
This is an authored substitution; core's normal, effective and current-paint
stages agree on the supplied value. Do not fix it with another text offset or
by assuming the container's height is the text line-height.

All nine unequal static occurrences now receive a guarded authoring
classification, retaining the active toolbar token rule, button inheritance
rule, browser computed values and explicit candidate rule as evidence. The
three custom-profile values agree, but do not authorize the other values.
The toolbar's 12 font-family mutations are separately classified as core
defects. These 21 current-texture differences have attribution; that does not
complete review of the toolbar's other nodes, geometry, paint or interactions.

The source audit now has 56 findings. Focused audit tests pass **64/64**, with
both unequal density cases, the equal-value control, and negative token,
inheritance, ancestor, duplicate-rule and effective-state witnesses. All 12
production checkpoint result hashes and input-tree digests validate; current
control-texture comparison reports no collection or mapping gaps for toolbar.
The original fixture and renderer remain unchanged.
`npm run parity:harness:check` passes **102/102** at this increment.

## Card text-button font token is an authored omission (2026-09-12)

The remaining 12 static card font-family differences are now attributed with
their own witnesses. Reference `.mat-mdc-button` supplies
`var(--mat-button-text-label-text-font, var(--mat-sys-label-large-font))`,
computing `Roboto` on button and label. Candidate `.text-button` omits the font
override, so the document control reset supplies `Roboto, Arial, sans-serif`
unchanged through normal, effective and current-paint stages. The card flow
change in `1d74a0f` retained this earlier omission; it did not introduce the
core parser mutation established separately for toolbar.

The guarded component-token attribution now covers filled, outlined and text
button kinds, requiring the corresponding active reference token and candidate
class/rule. It rejects cross-kind substitutions, duplicate rules, explicit
font overrides, and conflicting stage evidence. All 12 SHA-256-checked card
captures receive the authoring classification; their 12 `normal` versus numeric
line-height observations remain unresolved. Focused audit tests pass 63/63 and
the full harness unit command passes 101/101. No fixture or runtime was changed.

## Current-paint attribution across the complete static capture (2026-09-12)

All **436 static checkpoint records** now exist in the new control-text run.
Their result SHA-256 values and referenced input-tree digests validate, with
zero inventory errors. This is checkpoint evidence, not the still-running
matrix's final enforced verdict. Current-texture comparison yields **132
mapped labels and 48 explicit gaps** (paginator icon controls and tab labels).

The confirmed parser rewrite now receives guarded occurrence attribution in
all **12 toolbar static variants**. This requires the browser button and label,
core normal input, and core effective input to agree on the reviewed single
family (`Roboto` or `Arial`), while actual current paint adds exactly the
source-traced fallback suffix. Other font lists, missing or conflicting stages,
and unmatched controls remain unresolved. The report records all four stage
values and links the source finding and equal-input proof. It does not equate
the two lists or imply a raster mismatch for an installed font. Validation
requires the core classification rather than treating this as fixture authoring.

Focused audit tests pass **63/63**, including positive cases for both reviewed
families and rejection of conflicting normal/effective/browser-parent inputs,
different suffixes, missing evidence, and a wrong classification. The other
static control-font differences include 108 captured component-token omissions
and 12 unresolved card text-button cases. Line heights and non-light disabled
ink remain independently unresolved. No runtime or fixture input changed.
The complete harness unit command, `npm run parity:harness:check`, passes
**101/101**.

## Font fallback rewrite changes actual text advance (2026-09-12)

The follow-up equal-input proof confirms an observable core defect. A button
with `font-family: MaterialAuditUnavailableFont_8c176e`, text
`WWWWiiiiMMMMmmmm`, size 20px, weight 400, zero tracking/word spacing and no
wrapping has browser Range width **230.296875px**. The currently bound Astylar
label texture records CSS width **226.562px**, a **3.734875px** difference;
actual paint inspection shows the parser-appended `Arial, Helvetica, sans-serif`.
Both explicit-generic controls (the same unavailable family followed by `serif`
or `sans-serif`) pass the same width assertion. Browser and candidate styles
come from the identical declaration object; there is no fixture correction.

The measurement uses the current label material's unique texture identity and
its core-recorded logical CSS size, compared with a DOM text Range. A material
can bind one texture in multiple slots, so the proof deduplicates identities.
It does not build a replacement candidate canvas from declarations, use world
coordinates as inputs, or equate the button's fixed width with its text width.
It establishes text-advance inequality, not the exact fallback font identity,
missing-glyph coverage, or final glyph raster/sharpness. The installed Roboto
showcase mutation still does not by itself imply different visible glyphs.

The focused command below now executes **39 cases: 17 pass, 22 fail**. The two
new explicit-generic controls pass; the single-family fallback case is the one
new diagnostic failure, in addition to the previous 21. Retain these honest
failures during this audit. Source finding
`core-explicit-font-list-appends-default-fallbacks` is now confirmed, owned by
core font-list parsing/fallback semantics. No renderer implementation changed.
`npm run parity:harness:check` passes **100/100**. The full frozen-bundle capture
has completed its static traversal and is still running interaction cases;
neither this focused proof nor the harness unit suite completes the audit.

## Initial explicit-font-list input proof (2026-09-12)

The new frozen-bundle toolbar capture separates another root cause from fixture
token omissions: browser computed and candidate normal/effective font-family
are all `Roboto`, but actual current control paint uses
`Roboto, Arial, Helvetica, sans-serif`. `TextStyleParserService.resolveFontFamily`
appends its default list when an authored list has no recognized generic. Git
history places that behavior in `2ec3152`, before the Material showcase.

Two package-root equivalent-input reductions now isolate the boundary. Both
author one fixed-size button and generate the browser declarations from the
same StyleRule. With `fontFamily: 'Arial'`, normal inspection agrees with the
browser, but the actual texture is painted with
`Arial, Arial, Helvetica, sans-serif`; the preservation assertion fails. With
`Arial, sans-serif`, both stages and geometry pass. No fixture input was changed
to avoid the parser branch. The collector serializes each current texture in
the same proof, independently from normal declarations.

Command: `npm --prefix examples/material-showcase test -- --watch=false
--browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`.
Two runs give 36 cases, 15 passes and 21 diagnostic failures: one new font-list
failure plus the previous twenty layout/transform failures. The assertion is
`font-list-button paintedControlText fontFamily: Expected 'Arial, Arial,
Helvetica, sans-serif' to be 'Arial'`. The existing zoneless/Zone.js warning
remains; there is no renderer implementation change.

At this initial stage the pre-paint mutation was proven; a changed glyph raster
was **not**. The follow-up above now proves changed text advance for an
unavailable family, while missing-glyph and final-raster claims remain unproven. Its
owner is core font-list parsing/fallback semantics, not the Material plugin or
fixture. The source audit now has 55 findings and fingerprints both the button
manager and text parser (21 source fingerprints). After updating the fingerprint
inventory assertions, `npm run parity:harness:check` passes 100/100. Full input
review remains incomplete.

## Current control texture comparison, not just collection (2026-09-12)

### Captured button inputs now receive guarded attribution

The report now attributes a tracking omission only with a unique active
filled/outlined reference token rule, equal button/leaf computed tracking,
the candidate `.material-button` rule and a complete candidate control-to-page
normal/effective ancestry omitting tracking. The disabled-ink attribution is
limited to the observed light-profile disabled button, its exact alpha rule,
explicit opaque candidate rule and matching declaration/current texture values.
Missing, conflicting or stale witnesses remain unresolved.

A third authored-input finding identifies the omitted component font override.
The reference filled/outlined token computes `Roboto`, while the candidate's
`button, input, select` reset (added by `af04845`) supplies the document stack
`Roboto, Arial, sans-serif` and `.material-button` lacks the component override.
Classification requires those exact captured rules and matching normal,
effective and painted candidate values. This is not a blanket rule that treats
all fallback-list differences as authoring; a parser-added list is distinct.
The source audit has 54 findings at this increment.

The production smoke's ten differences now have seven attributed authoring
occurrences (three tracking, three component fonts, one disabled ink) and three
unresolved line-height stage differences. All remain unequal inputs; attribution
does not make `inputEquivalent` true. `npm run parity:harness:check` passes
100/100, including negative-witness tests for all three classifications.

Separately, SHA-256-checked checkpoints from the live new-instrumentation matrix
provide 36 core/toolbar/card static cases and 36 current-texture mappings, with
no collection or mapping gaps. Twelve core font-token and twelve core tracking
observations receive the guarded authoring classification. The other 57
observations (24 font-family and 33 line-height) remain for their own review;
this partial diagnostic is not full-run acceptance.

### Attribution follow-up

Two button paint-input differences trace to initial showcase commit `2f44011`,
not a recent renderer regression. The source audit now has 53 findings:

- `.material-button` copies size 14px and weight 500 but omits tracking. In the
  production light/desktop capture, active `.mat-mdc-unelevated-button` and
  `.mat-mdc-outlined-button` rules explicitly declare their label tracking
  tokens; reference labels compute .096px while candidate declarations omit it
  and actual textures receive zero. Classify this captured omission as an
  application authoring defect. Restore the component token, not a label offset
  or fixed-width adjustment. Other states still need captured attribution.
- The disabled candidate authors `mixHex(theme.surfaceContainer,
  theme.onSurface, .38)`, producing opaque #a4a0a7. The active reference disabled
  rule uses on-surface ink mixed with transparent, retaining .38 alpha and
  computing rgba(29,27,32,.38). Classify this as precomposited fixture paint,
  not equivalent input or proof of a core alpha defect. Background layers and
  glyph-edge coverage must remain part of a future equal-alpha compositing proof.

ButtonManager forwards copied control styles to TextRenderingService; it does
not inject tracking. The text parser defaults omitted tracking to zero. Its
numeric `normal` line-height instead comes from `measureText('Mg')` font bounding
ascent plus descent divided by font size. Thus `normal` versus 17px is a stage
representation question, not yet a proved authored height mismatch. Font-family
fallback lists likewise still require an explicit equivalence assessment. These
source findings do not blanket-attribute every controlTypography occurrence.

The audit now reports `controlTypography` separately from registry-retained
typography. Reviewed mappings require one direct leaf `span.mdc-button__label`
under a unique reference button, joined to a unique candidate button by shared
ID or explicit reference `data-parity-id`. Reference direct text, candidate
authored label and actual current texture text must agree. This also supports
the explicit dialog-action identity without guessing correspondence from text.
Nested/duplicate labels, stale source/version/revision, mismatched content,
missing parsed fields and observed unmapped control textures remain gaps.

Every comparison preserves browser-computed, normal/effective declaration,
optional registry-retained and current texture stages independently. Numeric
parsed font/spacing lengths become CSS px; parsed line-height multiplies only
the captured parsed font size. CSS `normal`, font fallback lists and alpha ink
are not waived as equivalent to numeric heights, shorter font lists or opaque
colors. The original raw paint style and wrapping width remain inventoried.
Other effects and final placement/material/raster behavior are not certified by
these eleven-property comparisons. Existing retained-text gaps are not removed.

The digest-checked production button smoke has three mapped textures, no
control-stage gaps and ten differences: three font-family lists, three
`normal` versus 17px line heights, three .096px versus zero tracking values,
and disabled rgba(29,27,32,.38) versus opaque #a4a0a7. These differences still
need attribution; the visually passing smoke does not justify accepting them.
`npm run parity:harness:check` passes 97/97, including five new tests for stage
separation, numeric normalization, missing/invalid evidence, ambiguous identity,
and explicit non-button mapping gaps. No fixture, renderer, threshold or
reference input changes accompany this comparison increment.

## Complete retained-text visual baseline (2026-09-12)

The unfiltered enforced run at
`artifacts/material-parity/retained-text-complete-audit/latest-report.json`
completed with exit 0 against frozen
`examples/material-showcase/dist/material-showcase-retained-text-audit/browser`
on port 4431, Chromium 152.0.7977.76. Command: `node
tests/material-parity/run-material-parity.mjs --enforce --skip-build`, with
`ASTYLAR_MATERIAL_BROWSER_ROOT`, `ASTYLAR_MATERIAL_ARTIFACTS` and
`ASTYLAR_MATERIAL_PARITY_PORT` set to those isolated paths/port and no filters.

- Static: 436/436 pass, minimum/median SSIM .965296/.996382, maximum edge
  error .984px; text 428/428, backgrounds 24/24, rasters 120/120, shadows 12/12.
- Interactions/mobile: 1875/1875 pass, minimum/median SSIM .954514/.997463,
  text 2116/2116, focused rasters 880/880.
- Current audit loading verifies all 36 families and full configured coverage.
  Including supplemental captures, 4648 case sides yield 2311 tree variants,
  no collection errors, and no missing full-tree/resolved/state-style evidence.
- Input equivalence remains unproven: 8133 unique style differences across
  380407 occurrences; 3890 signatures still need attribution. There are 88
  structural differences, 7245 retained typography observations, 4634 retained
  mapping/stage gaps and 20028 unequal retained properties (14616 unresolved).
  All 51 source findings are still detected. The new control comparison
  correctly reports 625 missing-stage case gaps and zero control comparisons
  because this older frozen bundle has no `paintedControlText` evidence.

These are complete baseline captures, not a complete reviewed input audit.
Do not attribute current diagnostic API coverage to the older served bundle.
Preserve this report and capture the new instrumentation in a separate full run.

## Control texture evidence reaches the Material collector (2026-09-12)

The showcase collector now preserves `paintedControlText` as its own raw parsed
stage, including text, source, wrapping width, numeric CSS units and nested
effects. `paintedControlTextEvidenceVersion: 1` identifies collector support;
it is not a claim that every node has a texture. Older/mesh-only captures do not
gain this marker or fabricated entries. Normal/effective declarations and the
ordinary retained-text registry remain unchanged and separate.

Full-tree pooling retains the marker and all control-texture fields, interns its
style independently and does not coalesce legacy variants with newly observed
ones. Regression tests use deliberately different declaration, retained and
painted font sizes, and verify nested-effect preservation and detached snapshots.

The package-root button reductions now check the actual `paintedControlText`
source and its end-to-end serialization through the collector. Both value and
textContent labels pass. Only their documented parsed units are normalized for
comparison with browser computed values: font/spacing lengths become px strings,
and the recorded line-height multiplier is multiplied by the recorded font size.
No authored or rendered value supplies a fallback, and neither fixture changes.

After fresh `npm run material-showcase:prepare`, the combined proof/collector
command (`npm --prefix examples/material-showcase test -- --watch=false
--browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts
--include=src/app/material-input-evidence.spec.ts`) runs 41 cases: 21 pass and the
20 previously exposed geometry/transform failures remain. The missing button
inspection proof now passes using actual texture evidence rather than a changed
assertion about the meaning of `retainedText`. `npm run parity:harness:check`
passes 92/92 tests; the collector-only browser command also passes 7/7. The
separate production build at
`examples/material-showcase/dist/material-showcase-control-text-audit` succeeds.

A real production capture (`control-text-collector-smoke`, port 4433,
button/light/desktop, `--enforce --skip-build --static-only` against that new
browser output) captures one passing case: SSIM .999773, maximum edge error
.219px, and text alignment 3/3. Enforcement correctly exits 1 because this is
only 1/436 static cases and no interactions, not full acceptance. Digest-checked
full-tree loading has no errors and finds all three button label textures with
the new evidence marker and source. Their actual parsed font size is 14 and
weight 500; tracking is zero versus the reference labels' .096px. Reference
line-height remains `normal`, not an inferred pixel value; candidate parsed
line-height is 1.2142857142857142. These observations need input attribution, not
automatic equivalence based on similar pixels.

Property comparison and attribution for the newly observable showcase control
labels still require reviewed reference-text mappings and fresh captures. Merely
pooling this evidence does not waive any existing mapping or typography gap.

## Core-owned control texture inspection (2026-09-12)

The instrumentation now retains a detached copy of the parsed inputs actually
supplied to `TextRenderingService`'s canvas paint path. Evidence is weakly keyed
by texture, survives legitimate cache reuse, is removed on texture disposal, and
is discarded when the service owner is disposed. Inspection cannot invent an
entry for another renderer's texture and allocates no visual resource.

`inspectResolvedStyles()` adds optional `paintedControlText` with source
`core-control-texture`, current bound texture text/style and wrapping width. It
reads the actual control label material, including focus-color texture swaps;
it does not search output geometry or reconstruct inheritance. This is separate
from `retainedText`, whose existing registry-only meaning remains intact. Parsed
lengths are CSS pixels except lineHeight, which is the parser's multiplier. The
field describes paint inputs, not final clipping, material effects or visibility.
This is an additive diagnostic API, not a layout/paint fix or a document/plugin
schema change. Compatibility documentation and its generated skill copy agree.

Verification so far: the combined text-service/core-inspection tests pass 10/10;
the complete root browser suite passes 458/458 (with the existing launcher forced-
termination warning after successful tests); harness tests pass 91/91. Examples
and both skill validators pass. Capability validation still fails only the
previously documented stale element-creation fingerprint; that source is unchanged.
`npm run consumer:check` passes: fresh package installation (419 packed files),
browser and SSR builds, and 4/4 browser tests including surface-isolated control
texture inspection. The focused inspection suite also passes 3/3 after adding
the hidden-control assertion.

Commands: `npm test -- --watch=false --browsers=ChromeHeadless
--include=src/app/services/text/text-rendering.service.spec.ts
--include=src/lib/astylar-style-inspection.spec.ts` (10/10), the same root test
command without includes (458/458), and the inspection-only include (3/3).
`npm run parity:harness:check`, `npm run examples:check` and `npm run skill:check`
pass; `npm run capabilities:check` retains the known fingerprint failure.

Material collector integration and new-bundle captures are still required. The
frozen in-flight full matrix and current schema-2 tree captures do not contain
this new evidence. Their control-label gaps must remain visible; this change
alone cannot certify those comparisons or complete the audit.

## Control-value labels are outside the retained typography snapshot (2026-09-12)

A new package-root browser reduction isolates an inspection gap: a button
authored with `value: 'Action'` creates an enabled, nonzero-visibility label mesh
and has matching button-box geometry, but `inspectResolvedStyles()` returns no
retained text inputs. The missing values are font-size 16px, line-height 24px and
tracking .5px. The control using `textContent: 'Action'` with the same styles and
visible content passes these assertions. The reference uses button text because
HTML button `value` denotes submission data, whereas the current Astylar button
manager uses it as its label. This is disclosed semantic translation, not a
different visual input.

Source trace: `ButtonManager.createButton` chooses value before textContent and
`createLabelMesh` calls `TextRenderingService.renderTextToTexture`. That service
parses the actual text style before painting, but the snapshot only consults
`TextInteractionRegistry`. Ordinary element text creation is conditional on
textContent and registers there; the value-only control texture does not. Thus
the passing textContent control must not be read as proof of complete texture
inspection. Neither missing snapshot data nor registry presence alone proves a
glyph-rendering failure or success.

The narrow audit-instrumentation owner is core text/control paint: retain the
actual parsed texture inputs with an explicit source, expose detached evidence
after settlement, and verify cache reuse, updates and disposal. Do not manufacture
inherited values in the collector, inspect projected sizes as inputs, or replace
fixture values with textContent. The source inventory records this as a
parity-harness coverage defect, bringing the source-finding count to 51.

`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`
repeatedly executes 34 cases: 13 pass and 21 fail, including the new missing-evidence proof
and the 20 previously documented equal-input failures. This remains honest
failing diagnostic evidence, not an accepted parity run. The initial textContent-
only control passed (33 cases, 13 pass/20 fail), which prompted the value-path
reduction rather than an incorrect blanket conclusion about all button labels.
`npm run parity:harness:check` passes 91/91 tests. No core implementation or
showcase fixture was changed.

## Stepper number and current-panel text ownership (2026-09-12)

The reviewed text mapping now follows the exact Material step-header paths to
the two numbered icons, and the current content panel's `data-parity-id` to its
text leaf. It matches their candidate authored identities without changing either
tree. Generated stepper IDs must have the expected index and unique path; direct
text must agree. Completed/edit icons are not treated as numbered text. Hidden
panels remain inventoried and unaccepted rather than being selected by text alone.

Across the 436 static captures this adds 36 mappings and comparisons and exposes
132 more retained property differences. In particular, both reference step numbers
compute 16px while candidate retained text is 14px. Font family, tracking and
alignment also differ. These differences are not waived by establishing identity;
their ownership still needs attribution. Static diagnostic totals are 1,390
retained comparisons, 1,100 reviewed mappings, 3,786 property differences (2,770
unresolved), and 222 typography coverage gaps. This is not complete audit coverage.

Tests reject wrong paths, IDs, attributes, duplicate identities and changed text;
a focused state test switches the current panel and preserves the hidden-panel
gap. `npm run parity:harness:check` passes 91/91 tests. No fixture, renderer,
capture module or served full-matrix bundle changed for this increment.

## Control-label typography omissions, traced through captured rules (2026-09-12)

The chip/button-toggle weight difference is now attributed to unequal inputs
with a guarded rule-and-ancestry proof. Chip labels compute 500 from
`.mat-mdc-standard-chip .mdc-evolution-chip__text-label` and its Material weight
token. Button-toggle labels inherit 500 through their button from the
`.mat-button-toggle-appearance-standard` component token. The candidate's entire
text-leaf-to-main#page chain omits weight at both core declaration stages and
retained text is normal/400. The core text parser's default is normal and it
preserves numeric weights; the existing keyword proof distinguishes 400 from
500. There is no evidence here that core was given 500 and rendered it as 400.

Chip labels likewise compute .096px from the active Material tracking token,
while the complete candidate chain omits tracking and core retains zero. The
audit **does not** apply this conclusion to button-toggle tracking: although its
host specifies a tracking token, its intervening button computes normal. A fix
must preserve that actual cascade, not indiscriminately copy host tokens.

The initial chip styling in `2f44011` omitted these component properties;
`c47d589` introduced the current button-toggle label composition without weight.
The recommended owner is showcase component typography translation. Restore
the equivalent declarations before re-evaluating core, without adjusting fixed
widths, glyph offsets or theme scaling to conceal the input mismatch.

The machine guard requires the exact active token rule, matching computed
values on the reviewed reference inheritance path, and every normal/effective
candidate ancestor through a unique main#page. Explicit or competing candidate
declarations, absent records, wrong roots, cycles or contradictory reference
values reject attribution. It classifies 72 static observations (24 chip weight,
24 chip tracking, 24 button-toggle weight) as authoring defects while retaining
their unequal values. Totals remain 3,654 retained property differences, of which
2,638 are unresolved. Source inventory has 50 findings. The focused controls
exercise both families and preserve button-toggle tracking as unresolved;
full harness verification passes 72/72 tests. No fixture or renderer changes
were made.

## Chip, button-toggle and paginator text ownership (2026-09-12)

The retained-typography audit now maps both chip labels, both button-toggle
labels, and the paginator's page-size caption, value and range. The paths use
the paired template IDs and exact Material wrapper classes. The paginator's
generated caption ID is checked by shape and uniqueness; direct text is compared
after trimming, as in the existing identity contract. This does not accept
whitespace-layout differences.

Material chip labels contain one empty focus-indicator span. The chip-only
mapping requires exactly that span, its exact two classes, no ID, no direct
text and no descendants. Its node remains in the full inventory and is recorded
as `referenceDecorationNodes` on the mapping. Allowing this known text-free
decoration establishes only the parent text's identity; it does not accept the
indicator's paint, layout or focus behavior. Unknown, duplicated, nonempty or
nested children are rejected, as is an absent required focus indicator.

Across all 436 static cases this adds 84 mappings and comparisons, exposing 204
additional property differences: chip font family/weight/tracking (72),
button-toggle font family/weight/tracking/alignment (96), and paginator alignment
(36). Both chip and button-toggle reference labels compute weight 500 while the
candidate retains 400. Chip tracking computes .096px versus retained zero. These
differences remain unresolved until their authored and resolution evidence is
attributed; visual similarity does not excuse them.

Static diagnostic totals: 1,354 retained comparisons, 1,064 reviewed mappings,
3,654 property differences with 2,710 unresolved, and 258 gaps (144 anonymous-node
case gaps, 60 missing/ambiguous IDs, 30 missing retained entries, 24 direct-text
mismatches). The full matrix remains in progress. `node --test
tests/material-parity/*.spec.mjs` passes 70/70 tests, including changed identity
and ownership controls across all nine reviewed families. No fixture, renderer,
capture module, production bundle or threshold was modified.

## Sort, expansion and sidenav wrapper text ownership (2026-09-12)

Three more explicit paired-template paths now identify sort header content,
expansion body content and sidenav navigation text. In particular, the reference
`sidenav-nav` ID belongs to a wrapper whose generated inner div owns Navigation;
the candidate aside owns the text itself. That alias is permitted only when the
unique same-ID wrapper is on the reviewed path and has no direct text. An
unrelated same-ID element, an extra text owner or a duplicate path is rejected.
The generated expansion content ID is checked by its Material ID shape rather
than a particular runtime counter.

All 36 mappings succeed across the 436 static cases, but only 24 have retained
core text evidence. The 12 closed expansion labels have no core text registry
entry; their new mappings expose this fact instead of manufacturing typography
from the authored styles. Hidden/clipped-state structure and rendering coverage
still need a separate classification. No glyph-equivalence claim is made for
these missing entries.

The newly comparable sort/sidenav text adds 69 unequal properties: 36 for
sidenav (tracking, alignment and color) and 33 for sort (tracking, alignment,
six font-size and three color observations). These remain unresolved pending
captured-rule attribution. Totals are now 1,270 retained comparisons, 980 reviewed
mappings (including headings), 3,450 property differences with 2,506 unresolved,
and 390 gaps: 180 anonymous-node case gaps, 156 missing/ambiguous IDs, 30 missing
retained entries and 24 direct-text mismatches. These are static diagnostics,
not acceptance of the still-running complete interaction matrix.

`node --test tests/material-parity/*.spec.mjs` passes 69/69 tests. The existing
changed-path/type/class/text and duplicate-ID controls now cover all six reviewed
template families; new negative controls cover same-ID wrapper ownership and
generated expansion IDs. No fixture inputs, renderer, capture module, served
bundle or threshold changed.

## Reviewed tree, grid-list and badge text ownership (2026-09-12)

The typography audit now follows explicit paired-template paths for tree item
labels, grid tile content, and badge counts. Material owns the text directly on
`mat-tree-node`, a generated `div.mat-grid-tile-content`, or a generated
`span.mat-badge-content`; the candidate owns it on its corresponding authored
label/count span. Unique anchor IDs, each direct-child tag/ID/class, unique
generated badge ID shape, identical direct text, and terminal leaf structure
are required. Matching strings alone are insufficient. Original reference IDs
and all wrappers remain intact in the captured inventory; an alias only chooses
the text owner for the separate retained-typography comparison.

Across the existing 436 static checkpoints this adds 72 reviewed mappings and
raises retained text comparisons from 1,174 to 1,246. It exposes 222 additional
property differences, **none accepted by the mapping**: grid-list tracking and
alignment (48), badge tracking (12), and tree font family, line height, tracking,
alignment and font size (162). In 18 tree observations browser computed size is
16px while retained core size is 14.4px (contrast) or 18.4px (custom).
Attribution of these new differences
still requires authored/resolution evidence; `normal` tracking, `start`
alignment and font stacks are not silently normalized into equivalent inputs.

There are now 3,381 retained property differences, including 2,455 unresolved,
and 450 mapping/provenance gaps: 204 anonymous-node case gaps, 180 missing or
ambiguous IDs, 48 direct-text mismatches and 18 missing retained text entries.
These figures are a static diagnostic, not complete matrix acceptance.

Verification: `node --test tests/material-parity/*.spec.mjs` passes 66/66 tests.
New negative controls reject moved/retyped/reclassified nodes, duplicate IDs,
duplicate matching paths, conflicting aliases, changed text, non-leaf text
owners, unrelated component anchors, and invalid generated badge IDs. Positive
controls deliberately retain unequal font sizes and verify that the audit gate
still rejects them. No showcase fixture, renderer, capture module, served bundle,
visual threshold or interaction case changed. The unfiltered enforced matrix
continues against its previously fingerprinted production build.

### Tree font-size follow-up: missing component token, not proven core scaling

The captured `.mat-tree-node, .mat-nested-tree-node` rule explicitly authors
`font-size: var(--mat-tree-node-text-size, var(--mat-sys-body-large-size))` and
`font-family: var(--mat-tree-node-text-font, var(--mat-sys-body-large-font))`.
Its computed size is 16px even when the reference frame computes 14.4px in
contrast or 18.4px in custom. The candidate's `#page` correctly has those same
theme-scaled page sizes, but `.material-tree`, `.tree-item` and `.tree-label`
do not author a component font-size override. Their core declaration records
omit the size and the leaf's retained text records the page size instead.

This is evidence of an application/plugin **input-authoring defect**, not
evidence that core miscalculates a shared font-size input. The missing override
was present in initial showcase commit `2f44011`. Commit `7159b1d` subsequently
moved direct tree item text into `.tree-label` spans with fixed 20px height and
line-height; it did not restore the Material component typography declaration.
The narrow follow-up is to restore equivalent component typography inputs, then
test those equal inputs through core. Do not add inverse theme scale factors or
resize the rendered text to match screenshots. The 20px-versus-normal line-height
and wrapper differences require their own proof and are not accepted here.

The automated attribution now requires that exact active token rule, the
reviewed tree text identity, every candidate normal/effective ancestor record,
no intervening font-size/font shorthand declaration, and a unique main#page
whose authored, normal and effective sizes match the retained leaf size. It
does not reconstruct inherited values in the declaration records. Missing,
cyclic, contradictory or duplicate evidence leaves the difference unresolved.
Across the 436 static checkpoints the guard classifies nine contrast and nine
custom font-size observations as input-authoring defects. All 3,381 property
differences remain visible; 2,437 still require attribution. Source inventory
now contains 49 findings. The full harness suite passes 68/68 tests, including
positive controls for both theme sizes and negative controls for incomplete or
conflicting evidence. This does not establish full tree rendering parity.

## Ordered transform composition is also lost (2026-09-12)

The transform follow-up now includes three controls using only pixel units and
the default transform origin. They reuse the exact same containing block,
label, text and retained-typography assertions as the preceding reduction, so
the percentage and unsupported-origin gaps cannot explain these differences.

| CSS input on both sides | Browser label left | Astylar label left | Result |
| --- | ---: | ---: | --- |
| `translateX(10px) scale(.5)` | 66px | 66px | Pass |
| `scale(.5) translateX(10px)` | 61px | 66px | Fail: 5px |
| `translateX(4px) translateX(6px)` | 26px | 22px | Fail: 4px |

The parser introduced in shared form by `662c179` stores a single mutable
`translate`/`rotate`/`scale` tuple. It assigns the latest value for each function
instead of composing an ordered CSS transform. The material service then
applies the tuple in one fixed arrangement. This loses both noncommutative
function order and earlier repeated functions **before** final projection.
The inline text moves with the same error; its retained font size, line height
and tracking remain correct in all three controls.

The source inventory records a confirmed core composition defect for these
accepted functions. That narrow finding does not expand the catalog's declared
incomplete CSS transform grammar, nor does it relabel the absent public
`transformOrigin` field as a supported feature. Remediation must retain and
compose the ordered CSS-space affine transform, including repeated functions,
alongside percentage/reference-box/origin work. Merely fixing percent parsing
and origin offsets would leave this independently reproduced error intact.
Do not reorder, combine, or calculate equivalent transforms in the showcase to
compensate for it.

Verification: `node --test tests/material-parity/*.spec.mjs` passes **64/64**.
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`
now runs **32 cases: 12 pass / 20 fail**. The new passing order control and the
two new failing composition controls retain the existing threshold; all prior
29 cases remain. The inventory now has **48** detected source findings. No
renderer implementation, showcase input, capture module, or production bundle
was changed. The full audit and running unfiltered matrix remain incomplete.

## Floating-label substitution exposes transform-subset gaps (2026-09-12)

The 16px/12px field-label difference is not a simple font-scaling diagnosis.
Material keeps 16px typography inside an absolutely positioned floating label
with `translateY(-106%) scale(0.75)` and a top-left transform origin. The
candidate instead authors 12px text directly on an absolute label at `top:8px;
left:16px`, with different tracking. The substitution was present in `2f44011`;
`87bc351` added tracking and vertical-alignment overrides. This changes rendering
inputs even where the apparent glyph size is similar.

The retained-stage audit now attributes **18** static font-size observations
(form-field, input and select; light/dark; three viewports) to this substitution.
Each attribution requires the exact reference wrapper/type/class, active scale
rule, computed .75 matrix and top-left origin, reference 16px text, corresponding
candidate 12px rule and retained value, fixed insets, and an untransformed
candidate ancestry reaching the page. Missing/competing rules or changed
structure/transform evidence are rejected. Hidden/untransformed compact states,
tracking, colors, font stacks and other properties remain separately reviewable;
the classifier does not multiply font sizes to declare the inputs equal.

Six new original-input reductions isolate the rendering boundary. Both sides
receive the same rule objects and unchanged 16px/24px text with 0.496px tracking.
The label is 160x24px at (16,40) in a 240x80px containing block. Retained font
size, line height and tracking are asserted independently of projected output.
Only the inline text fragment's horizontal bounds are compared; wrapper border
boxes keep all four edge checks.

| Reduction | Observed result |
| --- | --- |
| No transform | Pass |
| `translateY(-12px) scale(1)` | Pass |
| `scale(.75)` with the default origin | Pass |
| `translateY(-50%) scale(1)` | Fail: top -10px versus 28px; -50% is treated as -50px rather than -12px |
| `scale(.75)` with `left top` origin | Fail: left 36px versus 16px; top 43px versus 40px |
| Percentage translation plus .75 scale, `left top` origin | Fail: left 36px versus 16px; top -7px versus 28px |

Source trace separates these from final world-axis projection:

- `parseCssTransform` strips translation units using `parseFloat` and receives
  no transform reference-box dimensions. Percentage translation is therefore
  already wrong before `cssTranslationToRenderOffset` projects it. The pixel
  translation control passes.
- `StyleRule` has no `transformOrigin` field. `ElementMaterialService.applyTransforms`
  receives only translation/rotation/scale plus projection, and scales the mesh
  about its existing center. The 20px/3px displacement matches the missing
  top-left-origin adjustment for this 160x24px box. Default-origin scaling passes.
- The capability catalog already classifies transforms as a **different,
  incomplete subset**. These are confirmed unsupported-semantics gaps, not a
  newly claimed regression in a promised complete CSS transform contract.
  The original `transform-origin` declaration is intentionally retained in the
  diagnostic payload outside today's typed subset; the test explicitly says so.

Remediation belongs in the core CSS transform parser/reference-box/origin
composition and its public contract, before final projection. The implementation
plan now prioritizes it after removal of output-to-layout feedback. Preserve the
original label typography/wrapper; do not repair these gaps with a smaller font,
plugin arithmetic, mesh-coordinate feedback, or adjusted Babylon axis signs.

Verification: `node --test tests/material-parity/*.spec.mjs` passes **64/64**,
including positive/negative label attribution and the expanded source fingerprint
checks. `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`
now contains **29 cases: 11 pass / 18 fail**.
The three new failing paths repeat the isolated results; all 15 prior failures
remain. The three new passing controls distinguish the missing semantics from
general placement/scaling failure. Full-tree reanalysis of 436 static cases has
zero collection errors, detects all **47** source findings, and reduces retained
unresolved property observations from 2,251 to **2,233**. This is not a completed
audit or a renderer implementation change. The unfiltered matrix remains live
against its unchanged capture modules and served production bundle.

## Table font input changed alongside a renderer fix (2026-09-12)

History identifies a concrete unequal-input change: commit `f980edc`
(`fix(renderer): honor Material table row sizing`) changed `.material-table`,
`.material-table th`, and `.material-table td` from **14px to 16px**. It also
changed renderer code, row heights and positional adjustments. The initial
showcase commit `2f44011` used 14px. The commit's grouping is evidence of when
the input changed, not proof of the author's motive or a core font-scaling bug.

All 12 current static table captures show the reference header/body cells at
14px and the candidate's retained core text at 16px: **36 attributed cell-font
observations**. The reference row's captured active Material typography token
and computed 14px value, the corresponding candidate cell's explicit 16px rule,
matching table/row/cell structure, and retained 16px value are recorded together.
The audit rejects this attribution if those witnesses change or the candidate
cell selector has competing font-size declarations. Normal/effective cell
records can omit font size; the audit preserves those earlier stages rather
than replacing them with reconstructed inheritance.

The existing equal-input table reduction now additionally asserts retained
14px font size and 20px line height on both cells. It passes together with its
existing padding, border, and row/cell geometry assertions. This proves that
this reduced case needs no 16px fixture compensation; it does not establish
complete Material table typography, transformed text, or pseudo-state parity.
The actual showcase inputs and renderer implementation remain unchanged.

Verification:

- `node --test tests/material-parity/*.spec.mjs`: **62/62 pass**, including
  positive and negative attribution tests.
- `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`:
  **8 pass / 15 intentionally exposed failures**, repeated with the failure
  names inspected. The table test passes; the same existing intrinsic-width,
  positioned-margin, auto-height, grid-content, calc, and divider reductions
  still fail. Neither failing cases nor thresholds were changed. The existing
  zoneless/Zone.js warning remains.
- Reanalysis of all 436 static checkpoints: **44/44 source findings detected**;
  retained unresolved observations decrease from 2,287 to **2,251**. The legacy
  mapped-style list does not include these cell font observations and remains
  at **3,189 unresolved attributions**. These are different evidence scopes,
  not alternative pass counts. The full matrix remains in progress.

Follow-up owner: Material table input translation, coordinated with the already
recorded table border/flow findings. Restore the reference typography intent
when undertaking remediation; if equal inputs then expose another discrepancy,
reduce and fix its core owner rather than increasing the fixture's font size.

## Benchmark heading masking and explicit identity mapping (2026-09-12)

The full trees exposed an additional benchmark defect: the HTML reference uses
`.benchmark > .eyebrow, .benchmark > h1 { opacity: 0 }`; AstylarUI instead sets
the same headings' `color` to `theme.surface`, leaving opacity at 1. These are
unequal paint inputs. Neither establishes visible heading text parity. This is
separate from the already reviewed matching heading offsets: equal positioning
declarations do not justify suppressing their paint.

History confirms both masking paths were already present in the initial showcase
commit `2f44011`. Commit `ee42cb3` changed heading flow but retained the masks.
The source audit now records both paths as parity-harness defects, with a
follow-up priority to restore honest visible-input coverage. This audit does not
change the reference, mask additional content, or retune the candidate.

The report can now map the reference's unnamed headings to `p#eyebrow` and
`h1#title` through a narrowly reviewed template identity rule. It requires one
outer `main.frame`, one authored `main#page`, unique direct children of the
expected tag/class, identical direct text, and no conflicting IDs. It preserves
the original nodes and style records. The mapping establishes correspondence
only: it does not accept color, opacity, sizing, offset or generated-content
differences. Other anonymous descendants remain review gaps.

The paint-mask classification additionally requires the active reference opacity
rule, the explicit candidate heading color rule, the explicit page background
rule, and matching core declaration/retained values. A changed rule, missing
evidence, duplicate identity, different parent/tag/text, or a different page
background cannot receive that attribution. The report keeps exact node paths,
rules, values, classification, and owner for each occurrence.

Read-only analysis of the 436 completed static checkpoints confirms all **872**
heading mappings and **872** unequal paint-mask observations. Direct retained
text comparisons increase from 302 to 1,174. Previously unmatched shared-ID
observations decrease from 1,136 to 264, and cases with remaining anonymous text
decrease from 436 to 216. The larger reviewed text scope exposes 3,159 unequal
retained-property observations: 872 heading colors are attributed to the masking
path; 2,287 other observations still require normalization or source attribution.
These are not counts of confirmed core defects. The 84 differing-own-text and
18 absent-retained-entry observations remain open. All full-tree hashes passed,
and all 43 source findings were detected.

Verification: `node --test tests/material-parity/*.spec.mjs` passed **60/60**,
including three new positive/negative identity and masking tests. The unfiltered
matrix continues with its unchanged capture modules and served bundle. Final
coverage, classification, and the checked-in full reports remain incomplete.

## Explicit font-weight aliases (2026-09-12)

The retained-stage comparison exposed 230 observations of browser `400` versus
core `normal`. This is a representation difference, not a renderer discrepancy.
The audit now normalizes explicit `normal` to `400`, alongside its existing
`bold` to `700` mapping. `reviewedValueNormalizations` records the technical
justification and proofs in the generated machine report. Raw full-tree styles
are preserved. Omitted weight, `bolder`, `lighter`, other numeric weights, font
stacks, and normal/zero letter spacing are not collapsed by this rule.

Evidence was added before changing normalization: the new audit regression
failed (one unexpected discrepancy), while the real-browser test passed for
both CSS aliases and showed that `bolder` changes with parent weight. A core
test passes the original values through `TextStyleParserService` and
`TextCanvasRendererService`, then compares complete canvas dimensions/pixels.
Both alias pairs match exactly, the raster contains ink, and 400 differs from
700. This is a narrow text-style/canvas proof, not a WebGL layout or full-scene
parity claim. No renderer implementation or fixture was modified.

Verification:

- `node --test tests/material-parity/*.spec.mjs`: **57/57 pass**.
- `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/services/text/text-canvas-renderer.service.spec.ts`:
  **8/8 pass**, repeated after adding the nonempty-ink assertion. The known Karma
  root-proxy warning remains; both commands exited 0.
- Reanalysis of all 436 static checkpoints: retained unequal-property
  observations decrease from 1,209 to 979; no weight differences remain in that
  table. The exact retained-stage attribution now covers 43 mapped signatures/
  338 occurrences, and the mapped unresolved count is 3,189. Other typography
  properties and missing mappings remain open; this does not establish complete
  input equivalence. All ten pinned capture-module hashes still match the live
  full-matrix manifest.

## Separate retained-typography review (2026-09-12)

Audit schema 3 now compares the already captured core text-registry stage without
merging it into normal/effective declaration snapshots. It consumes hash-verified,
pooled full-tree evidence and joins only unique shared IDs with identical direct
own-text. Eleven text properties retain all four values separately: browser
computed, candidate normal, candidate effective, and candidate retained text.
This also finds different retained values when declaration snapshots agree.

The narrow new attribution covers static mapped properties omitted in both
candidate declaration stages but present in the core registry and equal to the
browser computed value. It requires matching mapped text, evidence version 2,
core-source provenance and a revision. It classifies a demonstrated diagnostic
stage mismatch, **not** a font authoring defect or overall input equivalence.
Existing proven initial-value equivalents keep their classifications. Explicit
unequal declarations, hover/current-state paint, unshared or duplicated IDs,
different text, missing fields, and missing registry entries are not waived.
No inheritance, font fallback, transformed text, or world coordinates are
calculated in this report. Anonymous wrappers and plugin/control text still need
their own mappings/stage evidence; missing entries are explicit acceptance gaps.

Applied read-only to all 436 completed static checkpoints from
`retained-text-complete-audit`, this attributes 35 signatures/234 occurrences;
34 were previously unresolved. The mapped-style unresolved count is now 3,197
(previously 3,231). The separate retained-text table contains 302 direct text-node
observations and 1,209 unequal-property observations (111 unique family/element/
property/value pairs). These are **not** 1,209 confirmed renderer defects: they
include unreviewed normal/400 weight, start/left alignment, normal/zero spacing,
font-stack representation, and genuinely different sizes/colors. For example,
table text retains 16px while browser computed text is 14px; floating-label
font-size comparisons still require reference-transform context.

The new mapping/stage gaps are 436 cases with anonymous own-text, 1,136 missing or
ambiguous shared text IDs, 84 different direct-text observations, and 18 absent
core registry entries. Exact node paths remain in the report/inventory. These
counts reveal incomplete attribution rather than claim new regressions; the
full audit must review them before acceptance. Existing full-tree hashes passed
with zero collection errors. No fixture, renderer, capture graph, served bundle,
or threshold changed; the unfiltered full matrix continues using its pinned build.

Focused audit tests 36/36 pass, including five new cases covering separate
stages, hidden retained differences, rejected interaction/explicit overrides,
mapping/provenance failures, and missing property evidence. The full harness
command `node --test tests/material-parity/*.spec.mjs` passes **55/55**.
The checked-in final
JSON/Markdown deliverables remain pending complete capture and review.

## Durable full-matrix capture (2026-09-11)

The earlier `complete-input-audit` process is no longer running: its terminal
handle was missing and the Windows process inventory contained no matching
capture process. Its partial artifacts are preserved, but no aggregate report
was produced. This is not full-matrix verification and was not inferred from
an observation timeout. The subsequent separate production build completed
successfully at `examples/material-showcase/dist/material-showcase-retained-text-audit`.

The harness now checkpoints each fully captured case, including failing results.
Explicit `--resume` verifies exact browser/runtime identity, installed dependency
lock digest, served build files, transitive local harness imports, and selected
case matrices before reuse. Each result and its captured files are hash-checked;
partial writes do not count as completed evidence. Changed provenance or altered
artifacts fail closed. A fresh run refuses an existing checkpoint manifest; use
a new artifact directory for changed inputs. Do not run concurrent writers against
the same artifact directory. Checkpoints are local interruption recovery, not
an assertion that a subset meets the full gate.

Verification: `node --test tests/material-parity/*.spec.mjs` passed **46/46**,
including four checkpoint tests for failure retention, provenance/artifact/result
changes, partial writes, path boundaries, and transitive import fingerprints.
The one-case `core/light/desktop` capture in
`artifacts/material-parity/retained-text-checkpoint-smoke` completed with SSIM
0.999770 and two text-bearing nodes carrying `source:core-text-registry` evidence.
Repeating the exact command with `--resume` logged `Material resumed`, retained
the same input-tree hashes and metrics, and correctly reported full acceptance
as false (1/436 static, 0 interactions). The command used `--skip-build
--static-only`, the new browser output root, port4432, and those explicit filters.

The next full run uses no filters, `--enforce --skip-build`, the rebuilt browser
output, and the new directory
`artifacts/material-parity/retained-text-complete-audit`. If externally interrupted,
first confirm that its process is stopped, then repeat exactly with `--resume`.
The aggregate report is still written only after all configured cases complete;
checkpoint presence or passing smoke results must not be reported as completion.
No reference input, fixture style, case, acceptance threshold, or renderer behavior
changed in this increment. Fully resolved style coverage and substantive review
of every material difference remain separate unfinished requirements.

## Static review inventory and proven initial values (2026-09-12)

All 436 configured static checkpoint results are now available. Loading that
complete static subset through `buildMaterialInputAudit` reports zero missing
full trees, resolved-node gaps, state-provenance gaps or tree collection errors.
This establishes collection coverage, not completed semantic/style attribution.
The interaction run remains live; no aggregate full-matrix acceptance is claimed.

The static-only report contains 7,030 difference signatures and 68,933
occurrences. Before this increment, 3,505 signatures remained unattributed.
Three narrow initial-value equivalences are now justified by core implementation
and focused tests:

- `boxShadow` omitted versus `none`: `parseBoxShadow` returns the same empty
  layer list. Nonempty shadows are not accepted by this rule.
- `gridColumn` or `gridRow` omitted versus `auto`: the grid axis parser uses the
  same automatic single-track placement branch. Explicit lines, spans and
  template differences are not accepted by this rule.

The audit retains those entries with explicit technical justifications instead
of deleting their evidence. In the static subset this classifies 804 no-shadow,
1,264 automatic-column and 1,264 automatic-row occurrences, reducing unresolved
signatures to **3,231**. This is review progress, not 3,332 fixed rendering bugs.
Appearance, clipping, inheritance, used sizing and other unresolved inputs still
need their own evidence; the initial-value list is not a blanket defaults waiver.

The core tests are in `box-shadow.spec.ts` and `grid.service.spec.ts` beside the
owning implementations. The report regression verifies these accepted pairs and
rejects nonempty shadows/explicit placement. `node --test
tests/material-parity/*.spec.mjs` passes 50/50. The focused core command
`npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/services/dom/elements/box-shadow.spec.ts --include=src/app/services/dom/elements/grid.service.spec.ts`
passes **24/24** in Chrome Headless 152. No implementation, fixture,
capture module or running served build changed.

## Badge reduction: intrinsic parent width and positioned margins (2026-09-12)

Six new equivalent-input cases separate the badge's measured width and changed
anchor offsets from the core rules they can conceal. They use the same rule
objects for browser CSS and public `SiteData` and the existing 640x360px test
surfaces. Text-bearing cases use Arial 16px/20px. No Material plugin, measured
width or DPR correction is involved.

Both inline and inline-block content-sized spans containing the label
`Notifications` stay **zero-width** in Astylar instead of the browser's
87.15625px. The label's horizontal edges match. The parent starts at x20 on both
sides, but its right edge is x20 instead of x107.15625. Removing the positioned
badge child reproduces precisely that parent-width error in both display modes.
This is a confirmed **core descendant-intrinsic-width defect**, not a font-width
or Babylon projection discrepancy. `ElementDimensionService.measureTextContent`
measures own text, `calculateIntrinsicWidth` falls back to zero without own text,
and `ElementCreationService.layoutInlineChildren` subsequently updates height
while retaining that zero parent width. The missing descendant contribution must
be resolved before parent flow placement and descendant containing-block use.

The compound badge cases retain all four positioned-badge edge checks. They
also expose placement errors; these are not all declared explained merely by
the parent width. Inline text fragments and core text planes are different
vertical measurement objects, so the new proof compares only their horizontal
contribution; the frame, inline-block host and positioned badge use full edge
checks. This scope does not claim inline ink-height or text raster parity and
does not change assertions in any pre-existing reduction.

A second control removes text, inline flow and percentages entirely. In a
180x100px relative parent, a fixed 16x16px absolute child with left:40px and
bottom:20px has these border-box origins:

| Margin | Browser (x,y) | Astylar (x,y) |
| --- | --- | --- |
| -12px | (28,76) | (40,64) |
| +12px | (52,52) | (40,64) |

Its size matches. This confirms **core positioned offsets ignore the margin
box** in this left/bottom case. The dimension service returns parsed margins
but its left/bottom offset branches omit them from the border-box origin, which
is passed to final rendering. The positive/negative controls must remain while
extending top/right, auto-margin and over-constrained coverage before a fix.
The original badge's remaining compound vertical placement still requires
reverification after the independently established rules are corrected.

The first bad revision is not established for either defect; blame dates on
individual formulas are not a historical reproduction. No renderer or showcase
implementation was modified. The focused command
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`
ran twice with **8 passed, 15 failed across 23 cases**. The six added failures
are retained alongside the earlier nine. Existing Zone.js/zoneless NG0914
warnings remain; runtime is Chrome Headless 152, Babylon 8.56.2/WebGL2.
`node --test tests/material-parity/*.spec.mjs` passes **49/49** and
`git diff --check` passes. The unfiltered full Material capture continues using
its pinned, unchanged served build and capture modules.

## Badge theme inputs (2026-09-12)

All twelve badge static captures in `retained-text-complete-audit` retain
reference `.mat-badge-content` with
`background-color:var(--mat-badge-background-color, var(--mat-sys-error))`.
Candidate `.badge-bubble` instead supplies `theme.primary`. Exact resolved pairs:

| Profile | Reference error color | Candidate primary color |
| --- | --- | --- |
| light | #b3261e | #6750a4 |
| dark | #f2b8b5 | #d0bcff |
| contrast | #8b0000 | #000000 |
| custom | #ba1a1a | #006a6a |

Each pair occurs at desktop, tablet and mobile. This is an application authoring
defect, not evidence of incorrect core color conversion. The existing inline
width table is a separate input discrepancy. Commit `48c994e` retained the
primary-token choice while changing badge text structure; the first introduction
of that choice is not claimed here.

The audit now attributes this property only with the exact paired span mapping,
reference token declaration, candidate color declaration matching its resolved
color, and no competing background declaration. It retains the exact witness
rules separately from compact authored examples, which can truncate earlier
rules. Negative tests leave missing/conflicting witnesses unresolved. Applying
the classifier to all twelve fresh checkpoint results yields four reviewed
signatures, three occurrences each, with no input-tree collection errors.
Their minimum whole-page SSIM is 0.993772 despite the wrong badge color: that
scalar alone does not establish local paint correctness. `node --test
tests/material-parity/*.spec.mjs` passes 49/49; `git diff --check` passes.
Other badge properties and states are not implicitly accepted. The current
capture graph, fixtures and reference styles are unchanged.

## Original expressions through core loaded CSS (2026-09-12)

The grid-list reductions now also send the original `calc(80px)`,
`calc(50% - 0.5px)` and `calc(50% + 0.5px)` declarations through the existing
public `provideAstylar({css:{useDocumentStyles:true}})` path. Reference and host
receive identical CSS, scoped to a class on the same authored elements without
adding a layout wrapper. Candidate `SiteData.styles` is empty in these variants;
no test-side expression evaluator or measured browser dimensions are injected.
The temporary stylesheet is removed with the surface.

At both 280px and 480px, public pre-projection `inspectResolvedStyles()` assertions
match browser width/height/left for the list and both tiles. All three outer
border boxes and the one-pixel gutter also match. Only the inner content bottoms
fail: candidate 20px versus browser 80px. Thus the existing core expression path
handles these specific expressions, while the downstream opposing-inset
auto-height defect remains. This does not establish arbitrary function support,
full Material loaded-style integration, text raster quality, or responsiveness
beyond the two separately mounted widths. No fixture or core behavior changed.

The same focused Chrome command below completed twice with **8 passed, 9 failed**
across 17 cases. The original fifteen cases are retained unchanged in intent and
assertions; the two added loaded-CSS cases retain their height failures rather
than omitting inner content from measurement. All 48 Material harness tests pass
(`node --test tests/material-parity/*.spec.mjs`); `git diff --check` passes.
The generated proof inventory and implementation plan now separate
this bounded resolution evidence from the still-required core height fix.

## Grid-list: expression boundary and positioned height (2026-09-11)

Fresh static captures retain Material's actual `.mat-grid-list` block container
and absolute tiles. Tile one has width `calc(50% - 0.5px)` and left `0`; tile two
has the same width and left `calc(50% + 0.5px)`. Height is `calc(80px)`. These
inputs produce a 1px gutter. The candidate instead authors `display:grid`,
`gridTemplateColumns:'1fr 1fr'`, `gap:'0'`, and relatively positioned flex tiles.
The substitution dates to initial showcase commit `2f44011`.

New identical-input reductions retain those expressions at 280px and 480px
container widths. Both fail: candidate height is 360px rather than 80px, each
tile takes the full container width, and the second starts at zero. This is the
documented **direct StyleRule calc-resolution limitation**, not automatically a
defect in claimed function support. `docs/compatibility/html-css.md` and the
capability catalog distinguish direct authoring from the opt-in loaded-document
CSS resolver. `ElementDimensionService` leaves dimensions at their provisional
parent values when `parseFloat('calc(...)')` is NaN. Any eventual solution must
use a verified core-owned resolution path or general expression support, not
fixture-specific arithmetic.

Separate literal controls use the mathematically corresponding lengths on both
sides. They are diagnostic controls, not replacements for the expression cases
or proposed showcase changes. The list and both outer tile border boxes now
match, including the 1px gutter. However, the text-bearing content with absolute
top/bottom/left/right zero is only 20px high instead of 80px on Astylar.

A further reduction removes Material and calc entirely. A text-bearing absolute
box inside a 280x100px parent has top:10px, bottom:15px, left:12px, right:18px.
Both ordinary block and flex variants correctly match the horizontal edges and
top, but their bottom is 30px instead of 85px: intrinsic text height 20px is used
instead of the 75px opposing-inset height. This confirms a separate **core
positioned auto-height defect**. The dimension service has a horizontal
`positioned-insets` width branch, but no equivalent vertical branch before its
intrinsic-text fallback and min/max constraints. Subsequent block/flex intrinsic
resizing must also preserve positioned used-height ownership; merely patching
the initial mesh size would be insufficient. All of this arithmetic precedes
Babylon projection. The audit does not assert the first revision that introduced
the missing vertical rule.

The existing zero-inset empty drawer proof remains valid for its measured boxes,
but cannot establish general opposing-inset support: provisional parent height
can coincidentally match an empty, zero-inset box. The nonzero-inset text-bearing
reduction exposes that distinction. Keep both, with their different scopes.

Verification command:
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`.
The completed fifteen-case suite ran twice with **8 passed, 7 failed**. The seven
failures are the two original-expression grid-list cases, two literal controls
with incorrect content height, two opposing-inset reductions, and the previously
recorded divider defect. Earlier eight passing reductions remain passing.
No tolerance, reference expression, authored fixture, or core implementation
was changed. The same existing NG0914 and text-bearing-main advisory warnings
remain. These are intentional retained diagnostic failures, not a green release
claim. The full capture continues independently against its pinned bundle.

The report separates the calc limitation, the opposing-inset core defect, and
the fixture's grid substitution into three findings with distinct owners.
Applying its witness-based container classifier to the twelve fresh static
grid-list records attributes exactly the block-to-grid display signature;
conflicting or missing declarations still leave attribution unresolved.
`node --test tests/material-parity/*.spec.mjs` passes **48/48**. The implementation
plan now requires both used-height corrections and verification of the existing
core CSS-expression resolution path before restoring equivalent grid-list input.
None of these findings waives the remaining full-tree, state, or paint review.

## Sidenav equivalent-input reduction (2026-09-11)

The freshly checkpointed twelve static sidenav cases show an authored
`display:block` reference container and an authored `display:flex` candidate.
The light/desktop full tree additionally locates the reference's absolute drawer
at `frame/2/0/1`, its independent scroll wrapper at `frame/2/0/1/0`, and its
margin-offset content at `frame/2/0/3`. The corresponding candidate at
`root/0/2/0` is a flex container with two direct text-bearing siblings. These
trees are under `artifacts/material-parity/retained-text-complete-audit/sidenav`;
their recorded hashes are preserved by the case checkpoints.

The ninth browser reduction uses one shared set of declarations for both sides:
a relative 360x220px block with hidden overflow, an absolute 160px border-box
drawer stretched by top/bottom:0, 20px padding and a1px right border, a100% inner
scroll wrapper, and content-box content with margin-left:160px, height:100% and
20px padding. All four border boxes pass the unchanged0.5px geometry tolerance.
The reference content's padding may extend its border box below the container;
the proof preserves that constraint rather than fixing both boxes to220px.

`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`
ran twice with **8 passed, 1 failed**. Only the pre-existing paragraph/divider
reduction fails: separator bottom383 versus82, following paragraph top399 versus98,
and parent bottom464 versus163 (all301px errors). The new drawer composition
passes without the candidate flex replacement or17px top-padding adjustment.
This proves those substitutions are not required by the tested geometry path;
it does not prove text raster, scrolling/reachability, animated drawers, responsive
Material behavior, or all anonymous-wrapper equivalence. Those remain separate
coverage requirements. Warnings include the existing NG0914 Zone.js setup warning
and the core advisory that a text-bearing `main` may not be optimal; the latter
does not reject the public element or fail its geometry test.

Git history places the `.sidenav-container` flex rule in `2f44011`, the initial
showcase, rather than a later demonstrated core repair. No fixture or renderer
input was changed by this proof, and the full matrix continues with its original
pinned served bundle.

The audit now attributes the mapped sidenav container's block-to-flex difference
only when both captured authored rules, resolved values, family/ID, and paired
node types match this reviewed path. Conflicting declarations or missing/changed
selectors leave attribution unresolved. Applying the classifier to all12 fresh
static sidenav records resolves exactly that display signature with12 occurrences;
it does not waive other properties or the wrapper/scrolling differences. The
source finding records the independent scroll wrapper and containing-block
ownership lost by the fixture substitution. The28 focused audit tests pass,
including negative witness/conflicting-cascade/type cases. The report's proof
inventory now lists nine reductions, eight passing and the one retained divider
failure. This changes audit interpretation only, not the running capture inputs.

## Retained core text-input evidence (2026-09-11)

The diagnostic snapshot now has an additive optional `retainedText` field with
`source:core-text-registry`. It copies the existing text registry's retained
style, which the ordinary text-rendering path registers after passing that style
to texture creation. It neither recomputes inheritance nor reads mesh positions.
Normal and effective cascade declarations remain separate and unchanged.

This is deliberately a stage-specific field, not a claim of complete computed
style: hidden nodes with no retained text entry have no such field; anonymous
nodes without authored IDs are not guessed from mesh names; retained registry
styles do not necessarily describe later pseudo-state glyph textures. Those
boundaries still need evidence before the overall fully resolved input requirement
can pass. No blanket equivalence classification or missing-value waiver was added.

The Material collector preserves the optional text stage in each full-tree node,
and the audit pools it separately from normal and effective style tables. The
inherited-typography reduction compares the same browser values to this explicit
core text-input stage, rather than requiring the earlier cascade stage to contain
later inherited values. This changes the observation boundary, not either side's
authored input, layout, expected typography, or tolerance.

Focused core browser verification:
`npm test -- --watch=false --browsers=ChromeHeadless --include=src/lib/astylar-style-inspection.spec.ts --include=src/lib/astylar-surface.spec.ts`
passes **7/7**. The new test covers inherited font size/line height, detached
copies, absence for non-rendered text, update revisions, and unchanged resources.
`npm run skill:check`, `npm run examples:check`, and the 27 audit tests pass.
`npm run capabilities:check` still fails only the previously recorded
`element-creation.service.ts` fingerprint (expected `2edeb33f...`, actual
`bf5fd586...`); Git confirms that file's worktree content equals HEAD.

The showcase diagnostic dependency replacement initially failed from an incorrect
relative tarball path, then from the pre-existing Angular animations/common peer
version mismatch. The explicit workspace tarball path with `--no-save
--package-lock=false --no-audit --no-fund --legacy-peer-deps` replaced exactly one
package. No dependency manifest or lockfile changed. The separate clean packed
consumer check uses its normal installer without that diagnostic override.

With the new packed diagnostic installed, the command
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts --include=src/app/material-input-evidence.spec.ts`
reports **13 passed, 1 failed**: all six collector tests and seven of eight
browser reductions pass. Inherited 24px/32px typography now passes through the
explicit retained-text stage; only the unchanged divider failure remains.
The proof still uses exactly the same parent/child declarations and geometry
tolerance. Chrome reports the existing test setup's NG0914 warning (zoneless
TestBed while the showcase loads Zone.js).
`npm run consumer:check` passes: 419 packed files, browser and SSR/prerender
builds, and **4/4** Chrome tests, including inherited text values and isolation
between two package-root surfaces. Its disposed-surface diagnostic is expected
by the negative test. The complete root command
`npm test -- --watch=false --browsers=ChromeHeadless` also passes **452/452**.
These results are not complete audit acceptance. The existing full Material
matrix continues against its unchanged `material-showcase-inspection-audit`
bundle. A separate `material-showcase-retained-text-audit` production bundle is
being built for the next diagnostic capture; do not overwrite the served bundle
or describe the older captures as containing the new text-stage field.

## Typography-stage evidence gap (2026-09-11)

The eighth identical-input reduction uses a parent with `font-size:24px` and
`line-height:32px`, containing a text-bearing block with no own typography rules.
Browser computed child values are 24px and 32px. The settled public core style
snapshot omits both fields. Parent and child border-box geometry nevertheless
passes the existing 0.5px comparison. This is a diagnostic-stage gap, not proof
of missing authored intent or broken rendered inheritance.

The same focused Chrome command recorded below now reports **6 passed, 2 failed**:
the new snapshot assertions fail (`''` versus `24px` and `32px`), and the divider
retains its earlier 301px failures. An initial inline-span version also exposed
the omitted fields, but compared a browser inline fragment with a candidate
line box; changing the reproduction to an ordinary block removes that unrelated
measurement ambiguity without adding typography declarations or changing the
expected inherited values. No text pixel-parity claim is made by either probe.

Source trace: `Astylar.inspectResolvedStyles` calls `getElementInteractionStyles`,
whose normal branch resolves `StyleService.findStyleForElement`. That stage
explicitly handles cursor inheritance but does not supply inherited typography.
`BabylonDOMRendererService`, `ElementDimensionService`, and `FlexService` each
contain a later `getInheritedTextStyle` path. Their declarations must not be
conflated with the earlier diagnostic snapshot. The public snapshot is documented
as diagnostic declarations, not used layout boxes; treating it as fully resolved
typography in this audit is the defect.

The report records `audit-style-snapshot-precedes-typography-inheritance` as a
parity-harness defect and puts trustworthy stage capture ahead of repair-plan
acceptance. The next instrumentation change must expose authoritative core
pre-projection typography with provenance, preserving authored and pseudo-state
evidence. It must not reproduce inheritance logic in the showcase or blanket-waive
missing values. The active full matrix remains useful outcome/declaration
evidence, but cannot by itself close this fully resolved input requirement.

## Attribution is not inferred from unequal resolved values (2026-09-11)

The shared demo root now has a bounded reviewed rule: only mapped section nodes
with captured `.demo` reference evidence and an explicit matching candidate
`#<family>-root` declaration can attribute `static -> relative` and
`block -> flex` to fixture authoring. Missing evidence, different semantic tags,
or a candidate declaration that disagrees with its resolved value retain their
attribution gap. This separates a source-proven compensation from a hypothetical
cascade defect. The live source pattern is checked alongside the report.

A different root discrepancy is representational: reference `max-width:720px`
on a content box plus 28px padding and 1px border on each side equals a 778px
border-box maximum. Normalization now accepts that constraint only when both
box-sizing modes and every inset are explicit fixed pixel values. It does not
waive the box-sizing difference, other dimensions, or percentage/auto/intrinsic
constraints. Tests include unequal limits, unresolved insets and reversed sides.
All 27 audit tests pass; no fixture input was changed.

The automatic style classifier previously labelled every unmatched scalar pair
an application/plugin authoring defect. That was too strong: a resolved value
may differ because of defaults/cascade, wrapper mapping, used-value serialization,
or genuinely unequal authored rules. An omitted resolved property also does not
prove missing authored intent. These signatures now remain explicit harness
attribution gaps until their authored-rule and semantic-box evidence is traced.
The report counts unresolved attributions and rejects complete acceptance while
they remain. Distinct attribution evidence cannot collapse into a shared signature.

This does not retract separately traced source findings or observed supplemental
behavior failures. It prevents the raw discrepancy count from being presented as
a count of proven authoring defects. Focused audit tests pass 24/24; fixture
inputs, renderer output, and the in-flight matrix are unchanged.

## Divider, sidenav and table source review (2026-09-11)

Fresh light/desktop full-tree evidence in
`artifacts/material-parity/complete-input-audit/{divider,sidenav,table}` confirms
three additional unequal-input paths:

- Sidenav reference styles explicitly specify `padding:20px` for both drawer and
  content. The candidate instead authors `17px 20px 20px`, moving text upward.
  This difference already existed in the original showcase commit `2f44011`.
- Divider reference paragraphs participate in normal block flow with 16px
  vertical margins; the separator is a 1px top border. Commit `fcde1b7` replaced
  paragraphs with absolutely positioned wrappers. Later `1f2f2aa` and `662c179`
  adjusted their theme/mobile/DPR-sensitive positions. These are not equivalent
  layout declarations.
- Table reference header/first body cells own their bottom borders; the final
  body cell has none. Candidate cell borders are disabled and two absolutely
  positioned sibling divs draw their replacements using density-specific row
  offsets. This also dates to `2f44011`. Reference light/desktop table text is
  14px with a 20px line height, whereas candidate source rules declare 16px.
  Table layout creates temporary cell/row style overrides: its captured mesh
  declarations must not be confused with original authored padding or fonts.

### Table reduction: declarations and geometry without detached borders

The seventh case in `input-equivalence-proof.spec.ts` uses the same two-row
table, class-descendant cell selector, 16px horizontal cell padding, 14px/20px
typography, and first-cell bottom border on both sides. Public `tableProperties`
are translated to the corresponding browser CSS declarations; no sibling rule
elements or absolute border positions are present. The test compares table,
row and cell edges and inspects settled core padding, border width, font size
and line height against browser computed declarations.

Verification on 2026-09-11:
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`
reports **6 passed, 1 failed** in Chrome 152/WebGL2. The table case passes;
only the previously reproduced empty-block case below fails, with the same
301px edge errors. A repeat with the class-descendant selector gives the same
result. The six passing cases are scoped geometry/declaration evidence, not
complete Material acceptance. In particular, this table test does not inspect
border pixels, glyph rasterization, header semantics, collapsed borders, or
responsive column allocation. No general table-renderer defect is established
by the showcase's detached-border workaround alone.

### Confirmed core reduction: empty auto-height block

The new paragraph/divider case in
`examples/material-showcase/src/app/input-equivalence-proof.spec.ts` generates
both browser CSS and Astylar styles from the same rule objects. It uses a padded
block, two ordinary paragraphs, and an empty block carrying a 1px top border.
There are no absolute coordinates or measured replacement dimensions.

Run twice:
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`.
Both Chrome 152/WebGL2 runs report **1 failed, 5 passed**, with the same failure:
the separator begins at y=81 on both sides, but ends at y=383 in Astylar versus
y=82 in the browser. The following paragraph begins at y=399 versus y=98, and
the parent ends at y=464 versus y=163. The five earlier reductions still pass.
This is retained failing evidence, not a successful verification or skipped test.

Source tracing identifies the owning rule: `ElementDimensionService` initializes
height from the parent's content height. Its auto/intrinsic replacement is
limited to inline elements, text-bearing elements, and textareas. The empty
block retains the provisional 302px height, and `ElementCreationService` only
recurses into child layout when children exist. This is a CSS used-height defect,
not a Babylon coordinate-conversion defect. The reduction uses explicit Arial
16px/20px typography; it proves the empty-block flow failure, not complete Material
Roboto text/raster parity. Fix the general empty non-replaced auto-height rule
before removing the divider compensation, protecting explicit constraints,
flex/grid stretch, replaced elements, padding/borders and nested/resize behavior.
No renderer fix or showcase input adjustment was made in this audit increment.

## Hidden-node inspection boundary (2026-09-11)

The complete root suite (`npm test -- --watch=false --browsers=ChromeHeadless`)
passed 451/451 after the snapshot integration. The earlier mesh-only collector
run was deliberately superseded, not abandoned on a timeout. Its captured
artifacts and the completed original baseline remain intact. The new unfiltered
`node tests/material-parity/run-material-parity.mjs --enforce --skip-build` uses
`ASTYLAR_MATERIAL_BROWSER_ROOT=examples/material-showcase/dist/material-showcase-inspection-audit/browser`
and `ASTYLAR_MATERIAL_ARTIFACTS=artifacts/material-parity/complete-input-audit`.
It is still running; no complete result is claimed here.

All three supplemental probes were rerun against this build on port 4431:
`audit-material-picker-commits.mjs`, `audit-material-overlay-breakpoints.mjs`,
and `audit-material-slider-domain.mjs` in `scripts/`. They retain the previously
observed six picker failures, one medium-width bottom-sheet failure, and four
slider-domain failures, with no page errors. The picker month's first recapture
attempt exposed a harness mistake: a geometry-only measurement was asked for
its omitted input tree. The corrected probe requests settled input evidence;
its successful recapture still reports all six behavioral mismatches rather
than changing application behavior or masking the failures.

The showcase collector now consumes this snapshot by authored tree path and
retains its source and revision through report pooling. Geometry-only action
targeting explicitly skips input inspection; final input capture awaits settlement
and measures in the same browser evaluation. A first hover smoke correctly
rejected an unsettled targeting-time inspection; separating these two purposes
fixed the harness call site without weakening the core snapshot's guard.

Focused production-build checks after integration:

- `form-field,expansion`, contrast/desktop, static report mode: 2/2 pass, minimum
  SSIM 0.996178 and maximum edge error 0.013px. `form-field-label` and
  `expansion-content` now retain `display:none` resolved declarations; the hidden
  expansion label also has its own resolved styles. Both candidate trees have
  source `core-style-inspection`, revision 3, and no missing resolved nodes.
- `core`, light/desktop-dpr1, hover and held report mode: 2/2 pass, minimum SSIM
  0.999540. Normal `#6750a4` and effective `#735eab` backgrounds are retained at
  revisions 5 and 6. These are focused checks, not complete enforced acceptance.
- 27/27 showcase component/helper tests and 62/62 harness tests pass. The separate
  browser/server production build at `dist/material-showcase-inspection-audit`
  succeeds. It does not replace either of the older served bundles.

Core now exposes the on-demand `AstylarSurface.inspectResolvedStyles()` diagnostic
snapshot. It traverses the authored tree (including hidden descendants and
anonymous nodes) through the existing core cascade and interaction resolution.
Paint and inspection share the same pseudo-state merge order. Snapshots retain
normal/effective declarations and the settled revision, contain no projected
geometry, and are detached from authored data. Pending or disposed surfaces are
rejected. No inspection work runs unless the caller requests it.

This is the narrowly scoped instrumentation addition needed to close the audit's
mesh-only evidence gap, not a renderer parity fix. The public API compatibility
decision and usage constraints are recorded in `docs/compatibility/html-css.md`
and synchronized developer references. No private service is exported to the
showcase and no plugin/application style resolver was added.

Verification: core style-inspection and surface-handle tests passed 6/6 in Chrome
152 with Babylon 8.15.1/WebGL2. `npm run consumer:check` passed: a fresh package
with 419 files, browser/server build and prerender checks, and 4/4 Chrome tests,
including the package-root hidden-node/focus/two-surface inspection proof. The
disposal assertion intentionally emits the `surface-disposed` diagnostic.
`npm run skill:check` and all 11 translation-example checks also pass.

`npm run capabilities:check` reports a pre-existing stale fingerprint for
`element-creation.service.ts`. HEAD and working source both hash to
`bf5fd5861c7d1b412520a41abf5bfa0aa1085d9a139a96f3d202dde6cbf8ea3a`, while HEAD's
catalog still records `2edeb33f4095e3d3bb2be889991473e153df96f6d9a46ec9af94bbc56fa87d24`.
The last source change is `97e0da0`, retaining CSS select-popup anchor geometry;
this increment does not touch that source or refresh its acceptance fingerprint.

## Effective-state evidence correction (2026-09-11)

The Material collector previously compared browser computed interaction styles
with Astylar's normal mesh declarations. Core already publishes its resolved
normal/hover/focus/active merge as `astylarResolvedInteractionStyle`; the audit
now captures that result, preserves normal and interaction snapshots separately,
and labels the evidence version 2. No fixture styles, rendering rules, or visual
thresholds changed. Legacy state captures remain explicit harness gaps: updating
the collector source cannot retroactively upgrade their evidence.

Focused real-browser verification used the separate production output
`examples/material-showcase/dist/material-showcase-effective-audit/browser`, port
4432, artifacts `artifacts/material-parity/effective-style-smoke`, family `core`,
profile `light`, interaction viewport `desktop-dpr1`, and states `hover,held`:
`node tests/material-parity/run-material-parity.mjs --skip-build --interaction-only`.
Both cases passed their existing visual checks (minimum SSIM 0.999540).
`core-primary` retained normal background `#6750a4` and captured effective
background `#735eab` in both states. All four full-tree sidecars passed digest
and collection validation; neither candidate state retained a provenance gap.
This is a focused report-only check, not complete enforced acceptance.

Verification also passed 4/4 Material evidence helper tests, 22/22 Material
component tests, and 62/62 `npm run parity:harness:check` tests. The unfiltered
matrix already running uses the earlier separate bundle and is being preserved;
its state captures will still require replacement with version-2 evidence.
Hidden/non-rendered nodes remain a separate unresolved collection gap. They must
be observed through core style resolution, not assigned manufactured styles by
the audit.

## Rendered geometry feeds layout

`examples/material-showcase/src/app/astylar.component.ts`, `connectedOverlayTop`, calls
`measure(surface, [anchorId], false)`. That measurement calls `computeWorldMatrix`,
projects `boundingBox.vectorsWorld` with `Vector3.Project`, and converts the result
to CSS pixels. `connectedOverlayTop` then uses `anchor.top` to author the next
datepicker overlay position.

This is a confirmed architectural violation: expressing the result in CSS pixels
does not remove its dependency on rendered output. It also creates first-render
versus update dependence. The earlier audit instrumentation correction in
`d6a3158` avoided re-entering the `siteData` computed signal; it did not fix this
layout feedback path.

Core already owns `layoutBoxesMap`, consumed by the scroll runtime in
`src/lib/astylar.ts`. The public `AstylarSurface` interface in
`src/lib/astylar-surface.ts` has no layout-box query. Plugin render contexts do
receive their own CSS dimensions (`src/lib/astylar-plugin.ts`), but that is not
an application query for an arbitrary overlay anchor. Implementation should
reuse authoritative core CSS geometry, not add another calculation based on
mesh output. Test first open, subsequent updates, scroll, nested transforms,
resize, and DPR separately.

## Slider authoring and test coverage disagree with the reference

`reference.component.ts` declares a Material range slider with min 0, max 100,
and step 5. `astylar.component.ts` authors start as 0..50 and end as 50..100,
both step 1, and clamps their values at 50. Shared state normalization rounds
values to multiples of 5, introducing another difference between the native
control's value and application state.

Start=60/end=80 and start=20/end=40 are valid shared states but cannot be
represented faithfully by those candidate controls. This discrepancy exists
before rendering; it is not evidence of a Babylon coordinate bug.

The harness `sliderDragCoordinates` only targets start=40 and end=75. Both
remain within those restricted halves. A green drag test therefore does not
disprove the defect. Restore equivalent domains and step semantics, then add
cross-midpoint drags in both directions, full-range reachable values, and
keyboard increments. Reduce any remaining hit-testing failure independently.

Supplemental real-action proof (2026-09-11):
`node scripts/audit-material-slider-domain.mjs --base-url=http://127.0.0.1:4431`
opens the unchanged production fixtures at light/1440x900/DPR1 and records native
range attributes and values at each action boundary. No state is injected.

| Action from start30/end65 | Reference final values | Astylar final native values |
| --- | --- | --- |
| Start: six ArrowRight presses | 60 / 65 | 40 / 65 |
| End: five ArrowLeft presses | 30 / 40 | 30 / 58 |
| Start: drag to60% | 60 / 65 | 50 / 65 |
| End: drag to40% | 30 / 40 | 30 / 50 |

Start keyboard traces are reference30,35,40,45,50,55,60 versus
candidate30,31,32,35,36,37,40. End keyboard traces are reference
65,60,55,50,45,40 versus candidate65,64,63,60,59,58. These demonstrate
step1/round-to5 discontinuities as well as the pointer half-domain clamp.
Reference native bounds are peer-constrained (initially start0..65/end30..100);
candidate bounds stay0..50/50..100. The correct authoring contract is the
component's full range with peer constraints, not two independent unrestricted
thumbs and not two fixed halves.

The diagnostic waits for renderer settlement plus two animation frames between
actions on both sides. An initial exploratory rapid-key sequence dropped some
reference updates; it is not used as deterministic evidence. The settled run
captures all expected reference transitions. Two full diagnostic runs reproduced
the same outcomes. All four supplementary cases fail
parity honestly (exit1), with eight verified full input trees and no page or
collection errors. Artifact references and SHA-256 digests are under
`artifacts/material-parity/slider-domain-audit`. The audit loader requires all
four cases, verifies trace lengths, native step/value quantization, unchanged
peer values, expected keyboard increments and monotonic pointer samples, and
recomputes outcomes rather than trusting `matches`. Collection/reference-action
failures are reported separately from confirmed candidate mismatches.
Audit unit tests20/20 and `npm run parity:harness:check`58/58 pass.

## Plugin typography ownership

`MaterialTabPanelRenderer` in `material-showcase.plugin.ts` allocates a
`DynamicTexture`, calculates a baseline using `textureFontSize * .328125`,
adds an authored `baseline-offset`, and draws text with `fillText`.
This is a confirmed second text-paint path. Transition orchestration can stay
Material-specific; ordinary text layout and rasterization should use core.
The general plugin coordinate adapter is not itself evidence of a violation:
final CSS-to-render projection is its intended responsibility.

## Intrinsic sizing and layout substitutions

Reviewed the reference declarations in `reference.component.ts`, installed
Angular Material styles, and fresh light/desktop full-tree captures against
`astylar.component.ts`. These are input discrepancies, not yet confirmed core
failures. Source policy entries retain exact candidate locations and history.

| Component | Reference input | Candidate substitution | History / owner |
| --- | --- | --- | --- |
| Toolbar | Title has no width declaration; action has min-width:64px, content and padding; a flex spacer fills remaining space. | Title width 192.15625px and action width 65.140625px, both non-shrinking; action becomes 64px at the mobile breakpoint. Reference used widths in the capture are 192.156px and 65.1406px, exposing the measured-value substitution. | `92067a1`; fixture intrinsic sizing, then core flex/text if equivalent composition fails. |
| Badge | Inline relative span with auto width around Notifications. | Width table 81.859375/104.65625/90.953125px selected by density/typography. | `2f44011`; fixture inline sizing and core text/inline layout investigation. |
| Chips | Content and graphic/padding determine chip width. | ID/state tables 97/68px and 93/64px. Selected reference chips measure 97.4219px and 92.75px in this capture. Rounding their output into authored widths is not equivalent input. | `00de46c`; fixture composition and intrinsic flex sizing. |
| Stepper | `.mat-horizontal-stepper-header-container` is flex; `.mat-stepper-horizontal-line` uses flex:auto, height:0, min-width:32px, margin:0 -16px and a 1px top border. | Absolute headers and connector, with connector widths 73.2%, 69.5%, and 15.1% at breakpoints. | `4e58f58` connector changes; `bc4d442` header width changes; fixture flex composition first. |
| Grid list | Two absolute tiles emitted by Material; widths calc(50% - 0.5px), second left calc(50% + 0.5px), giving a 1px gutter. | Two CSS grid tracks with gap:0. | `2f44011`; fixture translation, not evidence of a grid-engine defect. |

The fresh reference trees are under
`artifacts/material-parity/<family>/light/desktop/reference-input-tree.json`.
Their authored-rule records include media/support conditions; merely matching a
selector is not proof that an inactive rule applies. The values above were
cross-checked against computed styles and current source, not inactive rules.

Card shadow counterexample: the reference's light/desktop `card-primary` uses
three layers (0 2px 1px -1px at .2 alpha, 0 1px 1px at .14, 0 1px 3px at .12).
The candidate `.material-card` supplies those same layers. Accept this specific
shadow representation; it does not waive card typography, wrappers, colors,
theme variants, or the shared fixed-height table. A literal constant is not by
itself evidence of compensation.

## Picker commit behavior missing from the configured matrix

`node scripts/audit-material-picker-commits.mjs --base-url=http://127.0.0.1:4431`
ran against the separately built audit showcase on 2026-09-11 (Chrome
152.0.7977.76, light, 1440x900). The script opens fresh pages and delivers real
pointer clicks on each toggle and then a date/time option. Two consecutive runs
produced the same values, open states, and click targets. It deliberately exits
1 when committed values or open state differ; it does not bless the defect with
an inverted passing assertion.

| Action | Reference after settlement | Astylar after settlement |
| --- | --- | --- |
| Select day 1 | Input `9/1/2026`; popup closed | Input empty; popup open |
| Select second time option | Input `12:30 AM`; popup closed | Input empty; popup open |

Both candidate event logs confirm the exact target (`datepicker-day-1` and
`timepicker-option-1`). Neither side reported a page error. The detailed artifact
is `artifacts/material-parity/picker-commit-audit/latest-report.json`.
The diagnostic syntax check and all 52 harness self-tests passed; these do not
override the two intentionally retained behavioral failures.
This establishes a fixture interaction defect: the authored inputs always use
`value:''`, and `handleClick` has no date/time selection commit branch. It does
not implicate pointer-coordinate conversion or core layout.

The configured matrix includes `open-commit-reopen` for autocomplete/select only.
It exercises date/time opening, hovering and dismissal without committing an
option. Thus 1,875/1,875 configured interaction cases cannot establish all
relevant interaction coverage. Picker commit/reopen, calendar navigation,
and keyboard selection still need explicit audit coverage and durable maintained
assertions; retain this honest failing diagnostic meanwhile. The reference's
committed date string varies with the test date; the script compares actual values rather than
hard-coding September as the correct future month.

The supplemental script now covers six cases and captures both complete input
trees after each action, referenced by SHA-256 digests. Two expanded runs on
2026-09-11 also confirmed keyboard selection failures (reference commits
`9/2/2026` or `12:30 AM`; candidate remains empty/open), previous-month failure
(reference AUG 2026; candidate SEP 2026), and next-month failure (reference OCT
2026; candidate SEP 2026). Candidate logs contain the corresponding key/click
targets. Calendar helpers derive their month from `new Date()` rather than
displayed-month state; previous/next transitions are absent from `handleClick`.

An initial keyboard probe timed out on the reference because it sent keys during
the calendar's focus-managing opening animation. Waiting for the reference
animation to finish corrected the diagnostic, without changing either fixture.
The final input-tree run completed all six cases with no page or collection
errors and six retained behavior mismatches. The report builder now includes
these supplemental cases and their trees, requires their presence for a complete
audit, and recomputes value/month equivalence instead of trusting a stored
`matches:true`. Configured-matrix coverage is reported separately.

Tooltip structure is another input substitution: `.tooltip-anchor` authors a
138x72px flex column containing a normal-flow popup, whereas Material's tooltip
is a connected CDK overlay. Its absence of a transform offset does not establish
equivalent anchoring. The existing component test checks the candidate's flex
declarations, not equivalence to the reference containing block. This must be
addressed with the shared CSS-space overlay work, not another local offset.

## Overlay constraint substitution and an omitted breakpoint

The settled bottom-sheet diagnostic now preserves a concrete failure outside
the maintained viewport matrix. Run:
`node scripts/audit-material-overlay-breakpoints.mjs --base-url=http://127.0.0.1:4431`
against the already-built audit showcase server. On Chrome 152.0.7977.76,
light theme, DPR1, height900, the unmodified fixtures produce:

| Viewport width | Reference left / width | Astylar left / width | Result |
| ---: | --- | --- | --- |
| 900 | 0 / 900 | 0 / 900 | geometry matches |
| 1024 | 320 / 384 | 256 / 512 | width differs by128px |
| 1440 | 464 / 512 | 464 / 512 | geometry matches |

All three have top772 and height128 (candidate floating-point noise below
0.000001px). All six input trees captured without collection/page errors.
The command exits1 deliberately because the medium case fails unchanged
geometry expectations; it is not a passing parity test. The script waits for
finite reference animations to finish before measuring. Earlier exploratory
measurements taken during entry animation are not used as settled evidence.
Artifacts and SHA-256 tree references are under
`artifacts/material-parity/overlay-breakpoint-audit`; the audit loader includes
all three supplemental cases and recomputes geometry errors rather than trusting
their claimed `matches` fields. These cases do not inflate configured-matrix
coverage. Missing cases, invalid geometry, duplicate keys, wrong environments,
and missing tree evidence cannot establish complete audit coverage.

The immediate owner is fixture authoring, not a demonstrated core layout bug:
`.bottom-sheet-panel` fixes width512/height128 with one max960 full-width rule.
Installed Material `fesm2022/bottom-sheet.mjs` instead uses content flow,
max-height80vh, and full-viewport/medium384/large512 minimum widths. Its outer
padding8px16px plus the list's vertical8px padding is flattened into candidate
padding16px; current two-row geometry alone does not prove equivalent layout.
The fixed height was introduced in `8505c3b`.

Two related source findings are classified separately:

- Dialog (`bc0e449`): fixed panel/title/content/actions heights161/67/20/73
  reproduce current used heights. Reference
  `fesm2022/module-Ce6F7TNm.mjs` derives them from flow, a title `::before`
  inline40px spacer, title padding6px24px13px, and wrapping actions with
  min-height52px, padding16px24px, and a transparent1px top border. Candidate
  uses flex-end title alignment, padding7px24px12px, and action padding
  16px24px17px instead. These are unequal rules even when the box sizes match.
- Snackbar (`899c741`): candidate fixed width344px and space-between replace
  the reference surface's min-width344/max-width672 and flexing label with
  separate action padding (`fesm2022/snack-bar.mjs`). This is an intrinsic-size
  input mismatch, not evidence that another fixed width would fix the renderer.

Verification for this increment: audit unit tests16/16 and
`npm run parity:harness:check`54/54 pass. No fixture, production renderer,
reference styling, or visual threshold was changed.

## Minimal browser evidence

`input-equivalence-proof.spec.ts` supplies the same style objects to browser CSS
and public Astylar `SiteData`. All five Chrome/WebGL tests passed on 2026-09-11:
intrinsic toolbar content sizing with a flex spacer, a stepper-like flex connector
with negative margins, content-derived padded flex height, a full-span grid marker
with a cell-centered ring, and a fixed bottom-aligned overlay. Every measured edge
is within 0.5 CSS px. The toolbar reduction uses shared Arial declarations rather
than the full Material/Roboto typography; the connector reduction uses fixed-size
header boxes to isolate flex allocation. Neither proves full component parity.

Command: `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`.
Runtime: Chrome Headless 152, Babylon 8.56.2, WebGL2. The existing NG0914
Zone.js/zoneless configuration warning was emitted. These are geometry proofs,
not typography, paint, or full Material-composition proofs. They do not justify
either a broad core rewrite or retention of fixture compensation.

## Outstanding acceptance work

Resolved-style completeness review (2026-09-11): the fresh run has written all
436 static Astylar trees, containing4,384 nodes. Of these,436 are empty SiteData
root envelopes, not authored elements. A further42 authored nodes lack resolved
styles: form-field-label6, input-label6, select-label6, expansion-content12, and
expansion-content-label12. The field labels have the `compact-filled-label`
display:none rule in contrast/custom themes; expansion content is collapsed.
`collectAuthoredInputTree` retains these nodes, but the input map comes only from
scene meshes. The inventory now reports per-element resolved-style gaps and
rejects complete audit validation when they remain. It must not claim these
snapshots are fully resolved merely because node enumeration succeeded.

Source tracing also confirms a pseudo-state evidence mismatch: core
`src/lib/astylar.ts` writes the merged normal/hover/focus/active style into
`astylarResolvedInteractionStyle`, while showcase `measure` reads
`astylarResolvedStyle` and only exposes a separate `interactionBackground`.
The harness `compareStyleInputs` consumes the normal `resolvedStyle` only.
This does not show that the renderer paints state incorrectly; it shows that
the audit can compare current browser computed styles with candidate normal
styles. Before final attribution, capture both base and effective state style
with provenance. For non-rendered nodes, collect at authoritative style resolution
before the display:none mesh skip; do not reconstruct CSS values in the report.
These changes must not feed diagnostic output back into fixture inputs.

Matching mapped text/order is also no longer sufficient to accept differing
framework host types. Such pairs remain structural-review gaps until wrapper
styles, generated content, defaults and layout ownership are justified. Equal
mapped tags/text/order are accepted only for those fields, not for the entire
anonymous subtree. Focused audit tests22/22 pass. The collector itself and running
full-matrix bundle have not changed for this reporting increment; completing the
capture and resolving these gaps remains required.

Context-sensitive normalization correction (2026-09-11): the audit previously
accepted browser `cursor:auto` as candidate `cursor:default` without examining
the hit target. The maintained `effectiveBrowserCursor` helper already shows why
that is unsafe: auto can resolve to a text cursor over selectable text. These
pairs now remain harness evidence gaps until the same-point/state cursor probe
is linked. Alignment normal/stretch/start equivalence is restricted to paired
flex containers; other contexts remain explicit gaps rather than silent waivers.
Scanning the preserved full baseline finds4,693 auto/default pairs across all36
families and16,359 normal-alignment pairs without paired flex context. These are
potential evidence gaps, not confirmed interaction/layout defects. Fresh complete
tree evidence still requires review.

The canonicalizer also no longer overwrites a complex background shorthand with
its color longhand or lowercases case-sensitive URL/custom-property/string
tokens. The preserved baseline has no complex gradient/image background entries
in its mapped styles; this is preventive harness coverage, not a newly confirmed
showcase paint defect. Regression tests retain image-layer differences alongside
equal background colors, differently cased asset/variable names, and quoted
whitespace. Single recognized color backgrounds remain comparable to color
longhands. Audit unit tests19/19 and `npm run parity:harness:check`57/57 pass.
Only audit normalization changed; the running full collector and rendered
fixtures remain unchanged.

Audit normalization correction (2026-09-11): the old canonicalizer unconditionally
deleted shorthands, including `flex` without expanding it. It could therefore
hide unequal declarations. Supported box/gap/overflow shorthands now expand on
both sides; unexpanded flex and elliptical radius declarations remain explicit
harness-normalization gaps. Zero percentages are no longer collapsed to absolute
zero, preserving potentially different flex-basis semantics. Regression tests
cover differing flex/radius declarations, symmetric shorthand expansion, and
zero-percentage retention. `node --test tests/material-parity/input-equivalence-audit.spec.mjs`
passed 14/14; `npm run parity:harness:check` passed 52/52. This changes report
interpretation only, not captured inputs or fixture output.

The superseded collector run was explicitly stopped after confirming its live
process. A fresh unfiltered `--enforce --skip-build` run using the separate audit
build is now collecting complete trees; the previously completed baseline remains
in `artifacts/material-parity/full-audit-base.json`. Completion of the fresh run
and final report review are still required.

Collector end-to-end smoke (2026-09-11): a separate production build at
`examples/material-showcase/dist/material-showcase-audit` succeeded. Using
`ASTYLAR_MATERIAL_BROWSER_ROOT=examples/material-showcase/dist/material-showcase-audit/browser`,
`ASTYLAR_MATERIAL_ARTIFACTS=artifacts/material-parity/collector-smoke`, port 4432,
families `core,datepicker`, profile `light`, and viewport `desktop`, the command
`node tests/material-parity/run-material-parity.mjs --enforce --skip-build --static-only`
captured two passing cases (minimum SSIM 0.998795, maximum edge error 0.002px).
It correctly exited 1 because enforced acceptance requires all 436 static and
1,875 interaction cases. This is focused diagnostic evidence, not a green full
gate. Loading the resulting tree artifacts through `buildMaterialInputAudit`
verified all four case sides, valid digests, no collection gaps/errors, and
structural schema 2 throughout. Partial audit validation returned no errors.
The existing unfiltered run's bundle and artifacts were not replaced.

The initial structural collectors were not comparable: reference text included
the subtree, candidate text included only the node's own value; reference
descendant order followed requested IDs, while candidate IDs included unmapped
descendants. Structural schema 2 aligns subtree text and mapped document order.
The candidate style collector now retains all scalar resolved properties instead
of dropping longhands through an allowlist. Legacy evidence must be recaptured;
it must not be reported as a confirmed fixture discrepancy. These changes affect
audit collection only, not the rendered fixture. The matrix already in flight
uses its original bundle and cannot verify these later collector changes.

- Finish the unfiltered enforced matrix and regenerate both audit reports.
- Reconcile every one-sided mapping and preserve genuine state divergence.
- Capture and review the new full-tree inventory for every case, including
  anonymous wrappers, generated icons, and pseudo-elements. The browser collector
  has a real-Chrome regression test covering these plus inactive media rules and
  CSS layers (`node --test tests/material-parity/input-tree-evidence.spec.mjs`).
  Reference captures are stored with SHA-256 digests so a later focused run
  cannot silently replace evidence referenced by the full report. The generated
  audit pools identical styles/rules/trees while retaining every case association.
- Resolve used-value versus authored-expression normalization gaps before
  treating automatic difference counts as confirmed authoring defects.
- Complete minimal equivalent-input investigations for remaining suspicious
  compensation and connect the durable audit check to the release gate.

No fixture behavior, reference truth, or visual threshold was changed for these
findings. The investigation remains open until the full objective is verified.
