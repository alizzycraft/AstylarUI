# Shared Material button pill-radius input audit

This is an authoring finding, not a renderer correction or a claim that the
current button screenshots have different corner pixels.

## Source-backed scope

[Machine evidence](material-button-pill-radius-audit.json) replays **600 mapped
button owners across 480 original cases**, seven families, four profiles and
all captured static/interaction states. It preserves 108 radius/value groups
and 2,400 corner-property observations. Families and owner counts are core 52,
button 180, menu 94, bottom-sheet 63, dialog 78, snack-bar 71 and tooltip 62.
This concerns their `.material-button` controls, not popup contents or all other
buttons in the showcase.

The original report digest is
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.
Every paired tree is hash checked, owner identities are unique, all 89 reference
scalars join to the original node, and all three candidate local style stages
join exactly. The test checks the full candidate tree class inventory in all
2,311 cases, including cases with no selected button, to detect missing owners.
Reference and candidate source files plus proof dependencies are fingerprinted.

## First divergence: full-pill intent replaced by a fixed radius

The reference Material rule requests
`border-radius: var(--mat-button-filled-container-shape, var(--mat-sys-corner-full))`
(the secondary button uses the outlined variant). All four original computed
corner values are `9999px`. The captured CSSOM longhands have empty values
because the shorthand contains `var()`; the full tree's actual `cssText` retains
the request. Treating those empty longhands as absent styling would be wrong.

The shared candidate rule at
`examples/material-showcase/src/app/astylar.component.ts:487` requests
`borderRadius: 20 * theme.cornerScale` in pixels, rather than the reference token.
The reference frame at `reference.component.ts:58` customizes several corner
tokens, but not the full-pill token. The original computed value is verified;
this survey does not separately reconstruct global token-definition ancestry.

| Profile | Reference radius | Candidate radius | Captured height |
| --- | --- | --- | --- |
| Light / dark | 9999px | 20px | 40px |
| Contrast | 9999px | 15px | 24px |
| Custom | 9999px | 30px | 28px |

Classification: **application/plugin authoring defect** in the shared showcase
button translation. The first divergence precedes layout: a full-pill shape
request becomes a fixed theme-scaled radius. There is no demonstrated renderer
defect or candidate used-paint claim in this finding.

## Why matching pixels do not establish equivalent intent

Browser-only controls at DPR 1 and 2 compare isolated solid boxes, with no text,
animations or font dependencies. For each of the three radius/height pairs,
the `9999px` and finite-radius requests produce byte-identical screenshots at
the captured height. Their computed radii remain different. Raising the same
boxes to 80px makes each pair's pixels differ. A 20px-wide narrow-box control
again produces identical pixels because width constrains both shapes.

There are nine paired controls per DPR, 18 in total. They prove the conditional
browser shape coincidence and its boundary, not Astylar's corner raster, border
clipping, hit testing or original screenshot equivalence. A generic normalizer
must not equate these authored requests based solely on today's fixed height.

The renderer has a radius clamp in
`src/app/services/babylon-mesh.service.ts:167`, but seeing that helper is not
proof that all relevant background, border, clip and interaction paths use it
correctly. No renderer claim is inferred from that source observation.

## Historical assessment and implementation order

The complete candidate `.material-button` base declaration is identical to its
declaration in the initial showcase commit
`2f440115740ff76fa9e55b3f4a11568207b2af5a`. Therefore the fixed radius is not
evidence of a subsequently introduced parity compensation. This does not
establish the original author's motivation or prove that a renderer defect
motivated the substitution.

When implementation is authorized:

1. Establish equivalent full-pill inputs in a separate public-API paired proof,
   covering the current heights, larger content-driven heights, narrow widths,
   and outlined/filled states at DPR 1 and 2.
2. Trace any failure through radius resolution, background/border construction,
   clipping and hit testing. Fix the responsible general rule if necessary;
   do not select a replacement finite radius that happens to look correct.
3. Restore equivalent token intent in the canonical comparison only after the
   public path is demonstrated, retaining the general regression proof. Keep
   width, density, text, hover layers and other authoring findings independent.

## Verification and limits

```powershell
node scripts/audit-material-button-pill-radii.mjs
node --test tests/material-parity/button-pill-radius-evidence.spec.mjs
node scripts/audit-material-button-pill-radii.mjs --check
```

Generation and no-write replay pass. Tests: **4/4 pass**, zero failures, skips
or cancellations, **6,951.9558 ms**, Chrome **152.0.7977.76**. Thirteen negative
controls reject changed identities, declarations, shorthand evidence, scalars,
style stages and unreviewed profiles. All original owner/property membership is
independently replayed.

The first generation attempt rejected the outlined button's compound rule
because the inspector expected a radius-only rule. Inspection showed the exact
same radius request alongside typography, height and border declarations. The
inspector now checks the radius-relevant declaration subset while preserving the
complete rule and exact scalar/full-tree join; it does not discard that input.

No canonical classification, renderer, reference or comparison input changes
are included. Production classification integration and full-report conservation
are pending. The complete audit and enforced matrix remain incomplete.
