# Paired web and Astylar translations

[`manifest.json`](manifest.json) curates eleven bounded translation examples for
human users and the checked `astylarui-developer` skill. Every entry includes its
classification, the web and Astylar sources, direct mappings, important
differences, and executable or implementation evidence.

Eight entries deliberately point at existing parity fixtures rather than copying
their source. Each fixture already keeps `reference.html`, `reference.css`,
`siteData.root`, and `siteData.styles` together and executes both renderings in
the same Chromium comparison. The other three entries keep compact sources
inline because they explain a platform boundary rather than ordinary visual
parity.

| Topic | Pair | Classification | Primary source |
| --- | --- | --- | --- |
| Semantic structure and text | `semantic-document` | Compatible | `semantic-structure.fixture.ts` |
| Block and box model | `box-model-card` | Compatible | `box-model-basic.fixture.ts` |
| Responsive layout | `responsive-breakpoints` | Different | `responsive-media.fixture.ts` |
| Typography and inheritance | `inherited-typography` | Compatible | `text-inheritance.fixture.ts` |
| Interactive forms | `validated-form` | Compatible | `interaction-form-validation.fixture.ts` |
| Positioning/modal stacking | `modal-top-layer` | Different | `semantic-modal-containment.fixture.ts` |
| Async image assets | `owned-image` | Compatible | `image-intrinsic-size.fixture.ts` |
| Loaded global CSS/Tailwind | `loaded-global-tailwind` | Different | `tailwind-loaded-utilities.fixture.ts` plus the packed Angular consumer |
| 3D scene ownership | `scene-backed-card` | Different | Inline web, SiteData, and host lifecycle code |
| Unsupported animation | `animation-alternative` | Unsupported | Inline explicit-state alternative |
| Plugin custom capability | `plugin-badge` | Plugin | Inline pair plus the packed Angular consumer |

Run the fast structural gate with:

```bash
npm run examples:check
```

It enforces the eleven required topics, source completeness, classifications,
evidence paths, catalogued public element/field/style names, plugin requirement
metadata, and the unsupported-feature boundary. `npm run parity:check` remains
the rendering/behavior gate for the eight fixture-backed pairs, while
`npm run consumer:check` executes the plugin-backed package-boundary example.

These are teaching translations, not a new demo framework. Add a pair only when
it closes a distinct knowledge-transfer gap; focused renderer behavior should
continue to live in the parity corpus.
