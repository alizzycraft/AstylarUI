# AstylarUI Material showcase

This is a standalone Angular 20 SSR application that installs AstylarUI from a packed tarball. It compares real Angular Material 20.0.5 components with equivalent AstylarUI documents across the same themes, density profiles, responsive viewports, and interaction states.

The Material-specific renderers are private to this application under `src/app/material-plugin`. General browser capabilities used by the example remain part of AstylarUI core.

## Run locally

From the repository root, build and install a fresh packed copy of AstylarUI:

```powershell
npm run material-showcase:prepare
Set-Location examples/material-showcase
npm start
```

Open `http://localhost:4200/compare`. The comparison screen selects the component family, while `/reference/:family` and `/astylar/:family` show the Angular Material-only and AstylarUI-only views respectively.

When AstylarUI changes, stop the server, run `npm run material-showcase:prepare` again from the repository root, and restart it. Preparation replaces the packed dependency and clears Angular's optimized dependency cache.

## Focused verification

```powershell
Set-Location examples/material-showcase
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

From the repository root, `npm run material-showcase:check` performs a clean packed-consumer install, tests, and browser/SSR build. `npm run material-parity:report` runs the paired visual, geometry, semantic, interaction, and resource benchmark.
