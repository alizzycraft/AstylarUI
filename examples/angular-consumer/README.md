# AstylarUI external Angular consumer

This committed Angular 20 application is a package-boundary and integration
fixture. It imports AstylarUI exclusively from the package entry point and does
not use repository source aliases, internal modules, or parity-harness code.

The example intentionally includes ordinary responsive desktop, tablet, and
mobile layout, navigation, forms, a data table with nested controls, scrolling,
a local image, dynamic data updates, and modal state. Two surfaces stay mounted
at once to exercise independent ownership. It avoids advanced CSS animation and
effects so that consumer behavior remains deterministic.

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
The `astylarui.tgz` path in this package is supplied only by that check and is
never committed.
