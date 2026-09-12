# Translating HTML and CSS to AstylarUI

This is the human compatibility contract for the implemented AstylarUI `0.1`
surface. It explains which web-development instincts transfer, where the result
is equivalent only inside a measured subset, and where Astylar intentionally
uses a different platform pattern.

For exhaustive public-name lookup, accepted value families, defaults,
inheritance, alternatives, plugin extensibility, and evidence, use the checked
[`capabilities.json`](capabilities.json). For concrete source pairs, use the eleven
verified [`translation examples`](translation-examples.json). A positive support claim
in this document should be read with those constraints, not as an implementation
of the complete HTML or CSS standards.

## Classification

| Label | How to interpret it |
| --- | --- |
| Direct | Use the ordinary web concept without a meaningful qualification. |
| Compatible | Expect equivalent observable behavior inside the documented and tested subset. |
| Different | Keep the concept, but translate its syntax, defaults, lifecycle, or rendering model. |
| Unsupported | Do not copy the web syntax; use the recorded alternative or redesign. |
| Plugin | Implement it as trusted Angular code through Astylar's public plugin contract. |

## The core mental model

HTML/CSS knowledge is the starting vocabulary; Astylar is not a browser DOM.

| Web concept | Astylar translation | Class |
| --- | --- | --- |
| An HTML document tree | A serializable `SiteData.root.children` tree of `DOMElement` objects | Different |
| A tag name | `DOMElement.type`, using a built-in alias such as `section` or a canonical plugin ID such as `example.cards:card` | Direct / Plugin |
| Attributes and text | Typed camelCase fields such as `id`, `class`, `textContent`, `href`, `required`, and `ariaLabel` | Compatible |
| A stylesheet | Either opted-in ordinary global CSS resolved into the supported typed subset, or ordered `SiteData.styles` objects with camelCase declarations | Different |
| Inline style | `DOMElement.style` | Direct |
| Browser layout and paint | Measured CSS-like layout converted into owned Babylon meshes, materials, and textures | Compatible / Different |
| Browser events | Typed handlers supplied separately through `AstylarRenderOptions.events` | Different |
| DOM mutation | Derive replacement `SiteData` from Angular state. `[siteData]` needs a new input identity; an explicit direct `surface.update(siteData)` call rereads the current object even when its reference is reused. | Different |
| A document/window lifetime | One Angular-owned `AstylarSurface` mounted on a canvas | Different |

IDs should be non-empty and unique whenever focus, control state, scroll state,
events, semantics, or visual ownership must survive an update. Anonymous nodes
and duplicate IDs use a deterministic positional fallback and do not promise
continuity when siblings move. The complete identity rules are in
[`docs/reconciliation.md`](reconciliation.md).

## Structure and authored data

The registered built-in element list includes common semantic containers,
headings and phrasing elements, lists, tables, links, images, forms, controls,
and dialogs. Ordinary nesting, authored order, IDs, classes, text, and supported
attributes translate naturally. The machine catalog is authoritative for the
91 exact identities and 62 public fields.

Registration alone is not native-feature parity. `canvas`, `iframe`, embedded
media identities, image maps, `details`/`summary`, `datalist`, and `optgroup`
currently act as generic or hidden layout identities with recorded defaults;
they do not implement browser drawing contexts, nested browsing, playback,
disclosure, maps, or complete option-group algorithms. Use supported structure
or a namespaced plugin when that behavior matters.

Plugin elements keep unknown-safe serializable values in `DOMElement.data`.
Core data stays strongly typed, and an unavailable plugin never causes its
authored payload or children to be deleted. In tolerant recovery an unresolved
plugin element renders as a deterministic leaf placeholder because Astylar
cannot safely guess the missing parent's child-layout semantics.

## Selectors, cascade, and responsive rules

Astylar supports the measured selector subset used by the parity corpus:

- type, `#id`, `.class`, universal, and comma-list selectors;
- descendant, child, adjacent-sibling, and general-sibling combinators;
- the tested structural, control-state, and control-requirement pseudo-classes;
- authored `:hover`, `:active`, and `:focus` state styles.

The cascade applies element defaults first, then opted-in loaded document styles,
ordered `SiteData.styles`, renderer context overrides, and finally inline style.
Each origin retains normal specificity and source order. Each plugin
extension declaration cascades independently by canonical property identity.
This is not a general `querySelector` implementation or all of Selectors Level
4; absence from the catalog/evidence means unsupported.

When loaded document styles are disabled, responsive intent transfers but
`@media` syntax does not: put
`mediaMinWidth`, `mediaMaxWidth`, `mediaMinHeight`, or `mediaMaxHeight` on the
individual JSON rule. Bounds participate in normal source order. The Angular
surface component observes its canvas size; a direct host calls
`surface.resize()` after changing it. Viewport units resolve against the
surface, not an unrelated browser page viewport. With
`provideAstylar({ css: { useDocumentStyles: true } })`, inspectable applicable
global CSS keeps ordinary `@media` rules and resolves against each Astylar
surface's dimensions before entering the typed cascade. See
[`docs/document-styles.md`](document-styles.md).

## Values, units, inheritance, and defaults

The common supported length family is `px`, `%`, `em`, `rem`, `vw`, and `vh`,
with unitless numbers or `auto` only in property paths that document them. Grid
also supports the tested `fr`, `repeat()`, intrinsic-keyword, and `minmax()`
forms. Do not assume every property accepts every unit simply because CSS does;
consult the property group in the catalog.

Inherited typography and list values follow the implemented cascade. Layout,
sizing, spacing, positioning, most paint, Flexbox, and Grid declarations do not
inherit. A plugin property explicitly declares its own `inherits`, `initial`,
validation, and invalidation domains.

Defaults come from `globalDefaultStyle` plus the element map in
`src/app/config/browser-defaults.ts`. They approximate useful browser behavior
but are not a byte-for-byte Chromium user-agent stylesheet. Some are deliberate
Astylar visuals—for example styled controls and several colored semantic
containers. Author explicit styles when browser/Astylar output must match rather
than relying on unrelated user-agent defaults. The capability freshness gate
fingerprints that source so a default change requires compatibility review.

Direct `StyleRule` authoring does not accept CSS custom-property declarations,
`var()`, `calc()`, or arbitrary functions. Supply a supported resolved value
from Angular state, or enable loaded document styles so the browser resolves
custom properties, `var()`, `calc()`, modern colors, and generated utility
compositions first. Only final properties and values supported by Astylar enter
the renderer; container queries and a general CSS engine remain out of scope.

## Layout

### Block and inline

Normal block flow, content-driven auto height, the content/border box model,
min/max constraints, percentage and viewport sizing, common margins/padding,
inline, inline-block, inline-flex, wrapping text, and `<br>` behavior are
parity-backed. This is the measured subset, not every anonymous-box, bidi,
fragmentation, or intrinsic-sizing nuance of a browser.

### Flexbox

Rows/columns, wrapping, gaps, main/cross-axis alignment, align-content,
grow/shrink/basis and the tested shorthand, order, align-self, percentage
content sizing, and content-driven container sizing are parity-backed. Familiar
Flexbox design skills transfer well within the catalogued value grammar.

### Grid

Explicit and implicit tracks, gaps, placement, `px`, `%`, `fr`, `auto`,
`min-content`, `max-content`, fixed `repeat()`, and tested `minmax()`/nested
intrinsic cases are supported. Grid areas, subgrid, masonry, and unrecorded
grammar are not implied.

### Tables

The tested auto/fixed layout subset supports table groups, rows/cells, captions,
column widths, spans, borders, nested controls, and semantic headers. It is not
the complete CSS table module; use the parity-backed patterns for application
tables.

### Positioning, stacking, and overlays

Static, relative, absolute, and fixed positioning; containing blocks; offsets;
z-index; negative/auto stacking; opacity/transform stacking contexts; and
overflow intersections are supported within the measured model. Sticky
positioning, floats, multi-column layout, and general browser compositing are
unsupported.

An open `dialog` with `modal: true` opts into Astylar's top-layer subset:
initial focus, background inertness, wrapped Tab order, Escape `cancel`, accepted
close, and focus restoration. `modal` is Astylar-specific because serializable
data cannot call `showModal()`. Astylar does not synthesize visual `::backdrop`
paint; author an explicit backdrop node/style.

## Typography and paint

The tested typography surface covers font family, size, weight/style, color,
alignment, line height, letter/word spacing, whitespace modes, wrapping,
transforms, decoration, overflow ellipsis, and compact text shadow/stroke
subsets. Text is measured and rasterized through browser canvas facilities into
Babylon resources. Available fonts, font loading, and canvas metrics are part of
the fidelity boundary; Astylar is not a browser glyph/layout engine.

Background colors and the implemented gradient subset, borders, radius, solid
state paint, box/text shadow subsets, opacity, supported transforms, overflow
clipping, and stacking are Babylon output. Filters, backdrop filters, masks,
clip paths, blend modes, and complete CSS compositing are unsupported.
`polygonType` is an Astylar-specific shape selector, not CSS.

The outer `box-shadow` subset supports comma-separated layers with pixel
offsets, blur radius, spread radius, and color. Layers retain authored order,
follow rounded border geometry, and clip paint inside the owning border box.
Inset shadows and non-pixel shadow lengths remain unsupported.

CSS animation, transitions, and `@keyframes` are unsupported. Prefer immediate
supported hover/active/focus feedback; use Angular signals plus
`surface.update()` for meaningful application state. Truly three-dimensional
animation belongs in a trusted plugin and must keep Babylon/timer/observer
resources inside the public ownership contract.

Like browser CSS, `:hover` remains active on an element while the pointer is
over one of its rendered descendants. Moving from a card surface onto its text
or icon children does not clear the card's hover style.
Likewise, a pointer press applies `:active` to the pressed target and its
authored ancestors until release, while click activation remains owned by the
original target. `pointerEvents: 'none'` removes an element and its inheriting
descendants from Astylar pointer hit testing; `auto` is the default.

## Forms, interaction, selection, and scrolling

The implemented control subset includes text, password, email, number, range,
textarea, button, submit/reset, checkbox, radio, and select behavior. Range
inputs clamp and step values, drag with pointer capture, expose semantic range
values, and implement Arrow/Page/Home/End keyboard boundaries. Parity fixtures cover
pointer and keyboard activation, explicit labels, focus navigation, editing,
caret movement, selection/clipboard commands, textarea navigation and
autoscroll, radio groups, closed and expanded select workflows, tested
constraints, invalid focus, submit/reset, and state preservation across
compatible updates. The default text-control caret follows the resolved text
color, matching browser `caret-color: auto`. Authored `caretColor` accepts
`auto`, supported colors, and `transparent` through `StyleRule`.

Direct text in supported non-control elements participates in pointer selection
with browser-equivalent forward/backward endpoints, selected text, text cursor,
visible highlight ownership, native Copy/Cmd+C clipboard transfer, and
outside-click clearing for the tested subset. Its opaque highlight background
is selected from a contrast-aware light/dark pair and rendered behind the
glyphs. A cropped glyph-mask pass recolors only the selected foreground to black
or white, maintaining at least 4.5:1 foreground contrast while preserving the
original texture's font rasterization and kerning. Controls and ordinary text
share this selection paint path.
Authored pointer cursors continue to win on selectable links or other text whose
effective cursor is not the ordinary text cursor.

Handlers are trusted host code outside serializable documents:

```ts
const options: AstylarRenderOptions = {
  events: {
    handlers: {
      save: { click: (event) => save(event.currentTargetId) },
    },
  },
};
```

`DOMElement.onclick` and `StyleRule.onclick` strings are deprecated compatibility
fields and are never evaluated. Astylar events expose a small DOM-like contract
rather than browser `EventTarget` and arbitrary DOM APIs. Pointer events include
stable pointer identity/type, button state, client/canvas coordinates, and
target-local CSS-pixel coordinates.

Overflow `hidden`, `clip`, `auto`, and `scroll`, nested clipping, wheel input,
scroll-into-view, retained offset across compatible updates, and cleanup are
covered. Overflowing `scroll` containers paint owned track/thumb indicators
whose thumbs follow the retained scroll offsets. The indicators do not claim
platform-native arrow buttons, thumb dragging, scrollbar styling, touch,
overscroll, or scroll-snap behavior.

## Semantics and accessibility

Visual output stays in Babylon. When accessibility is enabled (the default in a
browser mount), Astylar maintains an offscreen semantic tree for the supported
landmarks, headings, lists, tables, links, controls, names/descriptions, live
regions, state, focus, navigation, modal containment, and lifecycle behavior.
CamelCase fields such as `ariaLabelledby` reference authored Astylar IDs.

This bridge is compatibility infrastructure, not a claim that every HTML/ARIA
role, relationship, browser accessibility API, or assistive-technology behavior
is implemented. Verify application-critical flows with the browser-backed
harness.

## Images and asynchronous assets

`img`, `src`, `alt`, explicit/intrinsic sizing, and `objectFit` contain/cover
patterns are supported. Assets become owned Babylon textures/materials and can
settle after initial synchronous layout. `surface.whenSettled()` is the host
readiness boundary; updates cancel obsolete work and disposal releases owned
resources. Prefer deterministic local or data assets for SSR and offline tests.

Core Astylar does not turn `video`, `audio`, `iframe`, `canvas`, or other
registered media identities into native browser subsystems. Use host Angular
composition when content belongs outside the scene, or a plugin renderer with
explicit async ownership when it belongs inside Babylon.

## Updates, reconciliation, and lifetime

Build replaceable `SiteData` from application state. A mounted surface provides:

- `update(nextSiteData)` to reconcile new authored data;
- `resize()` for a changed canvas viewport;
- `focus(elementId, options?)` and `blur()` for application-owned composite focus;
- `whenSettled()` for the current owned generation;
- `inspectResolvedStyles()` for an on-demand, detached diagnostic snapshot of
  normal and effective core declarations, including hidden and anonymous nodes;
- diagnostics for sessions, resources, interaction, scrolling, semantics,
  reconciliation, plugins, and plugin resources;
- idempotent `dispose()` for the entire surface lifetime.

Call style inspection only after `whenSettled()`; inspection rejects a pending
render or a disposed surface. Snapshot paths identify the current authored tree,
and the revision identifies the settled generation. Values are core declarations
(for example percentages remain percentages), not browser used sizes or Babylon
coordinates. Inspection allocates no visual resources and does not change the
document. It is for diagnosis, never an alternative layout or paint pipeline.
An optional `retainedText` entry separately exposes the last style retained by
the core text registry for an authored ID. Its `source` is `core-text-registry`;
the detached `style` can include typography inherited by the text renderer but
absent from the earlier `normal` declarations. This is retained text input, not
a recalculated CSS computed style or a guarantee of current pseudo-state pixels.
It is absent for hidden/non-text nodes without a retained entry and does not
replace normal/effective declaration evidence. No registry mesh, metrics, or
world-space values are exposed. This optional field is backward compatible.
An independent optional `paintedControlText` entry observes the currently bound
core control-label texture. Its source is `core-control-texture`, with detached
text, parsed style and optional wrapping width captured when that texture was
painted. Parsed lengths are CSS pixels, except `lineHeight`, which is a font-size
multiplier. Evidence follows cached texture reuse and control pseudo-state texture
swaps; foreign textures and disposed owners have no entry. This is not inferred
from authored declarations or projected geometry and does not describe material
effects, clipping, placement or final raster visibility. It complements rather
than replaces `retainedText`. Adding this optional field is backward compatible;
no persisted document or plugin schema changes.
The API is additive for consumers of mounted handles; custom implementations of
the `AstylarSurface` interface must supply the new diagnostic method. Persisted
documents and plugin API v2 are unchanged. The packed-consumer style-inspection
test exercises this contract through the package root.

Compatible uniquely identified elements retain owners and live state according
to the reconciliation contract. Changing element type or input manager kind is
a replacement boundary. Do not retain or mutate internal meshes as a substitute
for `update()`.

A direct `AstylarSurface.update(siteData)` call always submits an update and
rereads the argument's current contents, including when the caller reused the
same object reference. This is distinct from `AstylarSurfaceComponent`, whose
Angular `[siteData]` input reacts to a new object identity. Application state
should still publish replacement `SiteData` objects so Angular delivers each
revision predictably.

## Angular and Babylon-specific concepts

Angular 20 is an intentional foundation. Prefer `AstylarSurfaceComponent` in an
Angular template; inject `Astylar` and call `mount()` only when the host owns the
canvas lifecycle directly. Each mount creates a child `EnvironmentInjector`, an
isolated capability registry, a Babylon engine/scene/camera, render/session
state, and owned cleanup.

CSS-like pixel layout is converted into world-space geometry only at the paint
boundary. Plugin renderers receive resolved CSS dimensions and project final
Babylon points, sizes, and lengths through `context.coordinates`. The host can
set scene clear color and lighting through
public render options and inspect `surface.scene`, but Astylar remains owner of
the mounted surface. Depth layers, camera orientation, materials, textures,
observers, and late async completion have no ordinary DOM equivalent.

Plugins are trusted in-process Angular code. They register immutable definitions
through Angular providers and may contribute namespaced elements, properties,
injectable renderers, lifecycle services, schema migrations, async ownership,
and safe invalidation. Persisted `SiteData.plugins` records version/schema
requirements; it is not inferred from npm metadata. Missing capability recovery,
migration, ownership, cancellation, and invalidation are specified in
[`docs/plugins.md`](plugins.md).

Plugins do not create a security sandbox, dynamically install packages, extend
the core CSS parser, or gain implicit permission to replace built-in renderers.

## Unsupported features and recommended substitutions

The catalog contains the checked list. The most important boundaries are:

| Familiar web feature | Current status | Recommended Astylar pattern |
| --- | --- | --- |
| CSS transitions, animations, `@keyframes` | Unsupported | Immediate state styles; Angular state plus `update()`; owned plugin/Babylon animation when genuinely 3D |
| CSS variables and `calc()` | Different | Enable loaded document styles for browser resolution into supported final values, or resolve values in Angular/TypeScript for direct `StyleRule` authoring |
| Sticky, floats, columns, subgrid, container queries | Unsupported | Use supported block/Flex/Grid/positioned composition and surface breakpoints |
| SVG/MathML and browser media/embed behavior | Unsupported as native subsystems | Pre-rendered image, host Angular content, or purpose-built plugin renderer |
| Browser DOM querying/mutation | Different | Keep application state in Angular and publish replacement `SiteData`; direct hosts explicitly call `surface.update()` for each revision |
| Inline JavaScript event attributes | Unsupported | Typed `AstylarRenderOptions.events` handlers |
| Web components/custom CSS as renderer registration | Different | A versioned Angular-native plugin with namespaced data/properties |
| Complete browser UA defaults | Intentionally different | Author explicit styles for parity-critical output |
| Complete CSS/HTML/ARIA standards | Out of scope | Check the catalog and evidence; record gaps honestly rather than guessing |

A plugin is appropriate only for custom scene behavior with a clear Angular and
Babylon lifetime. Ordinary application composition should stay in supported
`SiteData`; host UI that does not belong in 3D should stay in Angular/HTML
outside the canvas.

## Verification and maintenance

```bash
npm run capabilities:check
npm run examples:check
npm run parity:check
npm run consumer:check
```

The catalog gate compares exact public element/field/property coverage and
tracked semantic source fingerprints. The examples gate validates all eleven
translation sources. Parity measures the eight fixture-backed pairs and broader
browser-equivalence corpus. The packed consumer executes the plugin translation
across the public package boundary.

Do not promote intended or plausible behavior to `direct`/`compatible` without
implementation and executable evidence. When public capability changes, update
the authoritative source, evidence, catalog, and this prose together.
