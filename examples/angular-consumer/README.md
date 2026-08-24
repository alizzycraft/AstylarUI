# AstylarUI external Angular consumer

This committed Angular 20 application is a package-boundary and integration
fixture. It imports AstylarUI exclusively from the package entry point and does
not use repository source aliases, internal modules, or parity-harness code.

The example intentionally includes ordinary responsive desktop, tablet, and
mobile layout, navigation, forms, a data table with nested controls, scrolling,
a local image, dynamic data updates, and modal state. Two surfaces stay mounted
at once to exercise independent ownership. It avoids advanced CSS animation and
effects so that consumer behavior remains deterministic.

`src/app/consumer-badge.plugin.ts` is the durable Phase 14 external plugin proof. It
uses only the packed `astylarui` root API plus declared Angular and Babylon peer
dependencies. The plugin registers through an Angular provider helper, injects
its own configuration and Astylar's surface context, keeps signal state in the
surface injector, uses `DestroyRef`, validates an unknown-safe element `data`
payload and namespaced `extensions` property, and returns a distinctive Babylon
box mesh. Persisted requirements pin its compatible package/schema versions; a
pure v1-to-v2 migration upgrades legacy payload and property names without
mutating input. The renderer owns a deterministic delayed Babylon material,
cancels stale update generations, and requests one property-derived invalidation
per revision. A named service owner is tied to `DestroyRef`.

The two mounted surfaces receive different service instances, updates change the
authored depth, async scene/plugin resource counts plateau, one surface can be
disposed independently, and final scene plus plugin-owner counts return to zero.
An additional package-boundary test prepares legacy data and renders an
incompatible-version placeholder with aggregate diagnostics. Registration is
side-effect free during SSR and prerendering.

## Loaded Tailwind proof

The consumer pins Tailwind `4.3.3` and `@tailwindcss/postcss` `4.3.3`, uses the
official PostCSS plugin in `.postcssrc.json`, and imports Tailwind as ordinary
global CSS with `@import "tailwindcss"` in `src/styles.css`. Angular enables the
feature once with `provideAstylar({ css: { useDocumentStyles: true } })`.
There is no Astylar CSS compiler call, stylesheet registration, source name, or
Tailwind-specific runtime API.

The proof authors complete static utility strings in `DOMElement.class` and
does not duplicate its Tailwind region as equivalent `StyleRule[]`. It covers
block/inline presentation, Flexbox, Grid, fixed/min/max sizing, spacing and gap,
typography, colors, borders, radii, shadows and rings, `md:` responsive rules,
`hover:`, `active:`, and `focus:` states, disabled and checked controls,
input/select presentation, overflow, an arbitrary `13rem` value, and
custom-property-composed color, transform, shadow, and ring output. Browser
acceptance exercises two independent surfaces, responsive resizing, repeated
updates, independent disposal, and final cleanup.

This is an exact tested subset, not a claim that all Tailwind or CSS is
supported. Tailwind must be able to discover complete class names in source;
runtime construction from partial class fragments is outside this proof.
Loaded CSS still resolves only to Astylar's supported final typed properties and
values, and deliberate `SiteData.styles`/inline declarations keep higher
precedence.

Run it through the repository-level check:

```sh
npm run consumer:check
```

That command builds and packs the library, copies this application to a fresh
directory outside the repository, installs the generated tarball and declared
peer dependencies, builds and tests the application (including SSR/prerender),
and removes the temporary copy. The real-Chrome acceptance checks responsive
reflow, semantic control names, nested-table activation, keyboard editing and
value retention, resource plateaus, scroll-into-view, modal focus/inertness,
independent updates, disposal, remounting, and final resource cleanup.
It also verifies plugin metadata, per-surface DI identity, property-driven
Babylon output, migration, tolerant recovery, delayed readiness, stale-work
cancellation, public invalidation, repeated plugin updates, and plugin resource
ownership.
The `astylarui.tgz` path in this package is supplied only by that check and is
never committed.
