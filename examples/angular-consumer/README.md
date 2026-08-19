# AstylarUI external Angular consumer

This committed Angular 20 application is a package-boundary and integration
fixture. It imports AstylarUI exclusively from the package entry point and does
not use repository source aliases, internal modules, or parity-harness code.

The example intentionally includes ordinary responsive layout, navigation,
forms, a data table with nested controls, scrolling, a local image, dynamic data
updates, and modal state. It avoids advanced CSS animation and effects so that
consumer behavior remains deterministic.

Run it through the repository-level check:

```sh
npm run consumer:check
```

That command builds and packs the library, copies this application to a fresh
directory outside the repository, installs the generated tarball, builds and
tests the application (including SSR/prerender), and removes the temporary copy.
The `astylarui.tgz` path in this package is supplied only by that check and is
never committed.
