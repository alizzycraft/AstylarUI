# Reconciliation identity contract

Phase 11 uses the same identity rules for visual resources, control owners, interaction registrations, scroll state, and the browser-facing semantic tree.

## Stable authored identity

A non-empty `DOMElement.id` is stable only when it occurs exactly once in the complete `SiteData` tree. A unique authored ID follows the element through sibling insertion and removal, reordering, and reparenting. Compatible updates retain the existing owner and its transient state.

Authors should assign unique IDs to every element whose identity or live state must survive `Astylar.update()`.

## Update delivery and object identity

`AstylarSurface.update(siteData)` is an explicit update request, not an object-
identity change detector. Every call rereads, validates, and reconciles the
current document contents. A direct-mount caller that mutates and reuses the
same `SiteData` object will therefore submit those changes when it explicitly
calls `surface.update(siteData)`.

`AstylarSurfaceComponent` has a separate Angular input-delivery boundary. Its
`[siteData]` input updates the mounted surface only when Angular publishes a new
object identity; mutating an already-published object does not deliver another
component update. Applications should derive serializable replacement
`SiteData` objects from Angular state. That remains the recommended state model
even though the direct surface API can reread a reused object reference.

## Positional fallback

Anonymous elements and every occurrence of a duplicate ID use a typed positional path such as `root/2:section/0:span`. This fallback is deterministic, but intentionally does not promise continuity across insertion, removal, reordering, or reparenting. A node at the same typed position may be reused when compatible; a changed position or type creates a different key.

Duplicate IDs never claim stable keyed state. ID-addressed interaction, focus, form, scroll, semantic-reference, and event behavior remains unavailable or ambiguous for duplicates, matching the library's existing safety behavior.

## Compatible updates

The following changes retain identity when the reconciliation key is unchanged:

- text, class, inline style, matched authored styles, and supported attributes;
- form values, checked/selected/disabled/required/readonly state, and select options;
- image source and alternative text;
- child insertion, removal, and reorder around uniquely identified descendants;
- reparenting of a uniquely identified compatible descendant.

The visual reconciler may still reflow an affected ancestor or recreate an owned subresource such as a text texture. Retaining element identity does not require every implementation resource beneath it to remain unchanged.

## Replacement boundaries

Changing `DOMElement.type` always replaces the owner. Inputs are additionally divided by renderer-manager kind:

- `text`, `password`, `email`, and `number` share the text-editor kind;
- `button`, `submit`, and `reset` share the button kind;
- `checkbox` and `radio` are distinct kinds;
- unsupported input types are compatible only with the same unsupported type.

Changing between these input kinds replaces the owner and disposes its transient state and registrations. A replacement may use the same authored ID, but it is a new identity instance.

## Diagnostics

`AstylarReconciliationIdentityIndex.snapshot` reports total nodes, unique authored IDs, anonymous nodes, duplicate IDs, and duplicate-node count. Semantic reconciliation snapshots additionally report the numbers of reused, created, replaced, and disposed native semantic owners for the most recent reconciliation.

`Astylar.getVisualReconciliationSnapshot(scene)` reports the latest strategy plus per-pass and cumulative reused, created, replaced, disposed, reconciled, and reflowed node counts. An update whose visual projection is unchanged uses the `reuse` strategy: the existing Babylon meshes, materials, textures, layout registrations, controls, and interaction state stay live while the semantic tree is reconciled.

Resize, asset, manual, layout, paint, content, child-list, image-source, and control-data changes still run the mature layout/paint pass, but compatible uniquely identified primary meshes are retained. The new geometry, material, child resources, metadata, transforms, picking state, and control binding are transplanted onto the existing Babylon owner before scroll, focus, modal, and clipping registrations are rebuilt. Incompatible, removed, anonymous, and duplicate-ID owners remain on the safe disposal/recreation path.
