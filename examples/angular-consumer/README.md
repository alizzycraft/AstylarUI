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
