# Public visibility reduction

This extends the [public support check](material-visibility-support.md) with a
browser reproduction, without changing canonical fixtures or renderer code.
One shared SiteData generator produces native CSS/DOM and public `Astylar.mount`
inputs. Unsupported `visibility` declarations are deliberately retained and
their exact diagnostic counts checked; unrelated diagnostics reject the run.

## Evidence

Run `node scripts/audit-public-visibility.mjs --output=<new-directory>`.
The accepted diagnostic capture is `artifacts/material-parity/public-visibility-v2`.
Its report and provenance digests are in the adjacent JSON. The runner bundles
the installed public package directly, hashes every bundle input, verifies served
document/script bytes, and records package/browser versions and screenshots.
No dev-server cache or private renderer access is involved.

Chrome 152.0.7977.84; Angular 20.3.29; Babylon 8.56.2; AstylarUI 0.2.0.
Viewport 300×180 CSS pixels; surface 240×140; DPR 1 and 2. No text/fonts are
involved. Each hover boundary awaits public settlement and two animation frames.

| Shared input | Observed outcome at both DPRs |
| --- | --- |
| Visibility omitted / child explicitly visible | All three sampled colors and hover targets match |
| Child hidden | Native hides blue child and hits red parent; candidate still paints/hits child |
| Parent hidden, child inherits | Native hides both; candidate still paints/hits both |
| Hidden parent, explicitly visible child | Native exposes only child; candidate also paints/hits parent |
| Parent display none | Both move green following sibling into first sample and remove parent/child hover targets; candidate empty background differs |

There are 8 visibility color differences and 8 visibility hover differences,
plus 4 separate empty-background color differences in the display-none control.
The run exits 1 honestly, with zero runtime errors. This is not accepted output
parity. Point samples prove these differences, not whole-box geometry or complete
raster equivalence. The following sibling remaining at the lower sample in hidden
cases is consistent with retained layout; no exact candidate box-size claim is made.

## Attribution and limits

The already-proven missing public visibility contract now has a demonstrated
paint/hit-test effect in a plugin-free reduction. Core support must cover inherited
hidden state, explicit descendant visibility overrides, paint exclusion and hit
testing while preserving layout. Replacing hidden nodes with display-none nodes
would not preserve browser intent.

The display-none empty color is RGB 204/25/25, matching the root background color
literal in `src/app/services/dom/elements/root.service.ts`. That is a separate
background investigation lead, not visibility evidence or a proven complete cause.

This does not establish the cause of Material snackbar absence, tooltip placement,
or all 17 canonical visibility groups. No canonical classifications were changed.
Click, focus, accessibility, updates and resource plateaus remain untested here.
Installed-bundle receipts identify runtime code; full current/installed renderer
equivalence is not asserted merely from matching package version.

The preserved v1 probe is rejected: it accidentally used unsupported
`backgroundColor` instead of public `background`, so its raster results cannot
support visibility claims. Both sides now share `background`; v2 additionally
authors a white public clear color and rejects all unrelated diagnostics.

Verification: `node --test tests/material-parity/visibility-public-input.spec.mjs`
passes. The capture replay test separately verifies complete case membership,
input identity, screenshot hashes, exact observed colors/hits and diagnostic scope.
