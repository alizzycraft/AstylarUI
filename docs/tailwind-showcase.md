# Tailwind side-by-side showcase

The repository demo application includes an interactive visual workbench at
`/tailwind-showcase`. It renders one shared, statically authored element model
in two equal-sized panes:

- ordinary browser elements using the host Tailwind v4 build;
- equivalent AstylarUI `SiteData` using the same element hierarchy and complete
  Tailwind class strings.

The four tabs cover layout, typography and paint, controls and pseudo-states,
and responsive/overflow behavior. Every sample labels the Tailwind utility
family it exercises. The compact and desktop controls resize both panes to the
same CSS viewport so that `md:` behavior can be checked against the Astylar
surface rather than the browser window.

## Run it

From the repository root:

```sh
npm install
npm start
```

Open <http://localhost:4200/tailwind-showcase>.

Use the tabs and shared viewport buttons, then compare the panes at rest. On the
controls tab, hover, hold, focus, type, check, and open the select in each pane
to compare the corresponding interactive states. On the responsive tab, switch
between 520px and 720px and scroll both overflow regions to their bottom edge.

The page is a manual visual workbench, not a replacement for the enforced
parity fixtures. A mismatch found here should be reduced to paired reference and
Astylar evidence before changing the renderer.

## Implementation boundary

The host enables loaded styles once with
`provideAstylar({ css: { useDocumentStyles: true } })`. Tailwind is built by the
normal Angular PostCSS pipeline from `src/styles.css`; the showcase does not
call an Astylar CSS compiler or duplicate the utilities as `StyleRule` values.
The Tailwind prefix used by the repository is `tw:`.
