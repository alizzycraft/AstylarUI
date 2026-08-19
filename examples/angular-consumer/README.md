# AstylarUI external Angular consumer

This committed Angular 20 application is a package-boundary and integration
fixture. It imports AstylarUI exclusively from the package entry point and does
not use repository source aliases, internal modules, or parity-harness code.

The example intentionally includes ordinary responsive desktop, tablet, and
mobile layout, navigation, forms, a data table with nested controls, scrolling,
a local image, dynamic data updates, and modal state. Two surfaces stay mounted
at once to exercise independent ownership. It avoids advanced CSS animation and
effects so that consumer behavior remains deterministic.

`src/app/consumer-badge.plugin.ts` is the Phase 13 external plugin proof. It
uses only the packed `astylarui` root API plus declared Angular and Babylon peer
dependencies. The plugin registers through an Angular provider helper, injects
its own configuration and Astylar's surface context, keeps signal state in the
surface injector, uses `DestroyRef`, validates an unknown-safe element `data`
payload and `extensions` property, and returns a distinctive Babylon box mesh.
The two mounted surfaces receive different service instances, updates change the
authored depth, and disposal returns tracked resources to zero. Registration is
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
Babylon output, repeated plugin updates, and plugin resource ownership.
The `astylarui.tgz` path in this package is supplied only by that check and is
never committed.
