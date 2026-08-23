# Separation of Concerns Improvement Plan

> **Status (2026-08-15):** Superseded analysis. Its primary recommendation—the
> `BabylonDOMService` split—was implemented in `c7465b7` and repaired in
> `40ac6f4`. Remaining suggestions are optional future refactors.

## Initial Analysis

### BabylonDOMService
- Very large file with many responsibilities:
  - Site creation and orchestration
  - Style parsing and merging
  - Layout calculation (flex, list, standard)
  - Element creation (including mesh/material logic)
  - Event handling (hover, click, etc.)
  - Z-index, transforms, border, shadow, and more
- Variation-specific logic:
  - `processChildren` handles lists, flex, and standard layouts in one function.
  - `createElement` handles different element types (div, img, a, polygons) with branching logic.
  - Layout logic (flex, list, standard) is mixed with mesh/material creation.
- Mixed concerns:
  - Some camera/scene logic is present (e.g., pixel-to-world scaling, z-index, etc.).
  - Style parsing, layout, and rendering are all in the same service.

**Opportunities for splitting:**
- Layout logic (flex, list, standard) → `babylon-layout.service.ts`
- Style parsing/merging → `babylon-style.service.ts`
- Mesh/material creation → `babylon-mesh.service.ts` (expand as needed)
- Event handling → `babylon-events.service.ts`
- Transform/border/shadow logic could be grouped by concern or moved to helpers/services.

## Deepened Analysis (Pre-Step-1 Enhancement)

### BabylonDOMService
- **processChildren**: Contains large blocks of variation-specific logic for lists, flex, and standard layouts. **Recommendation:** Split layout logic (flex, list, standard) into `babylon-layout.service.ts`.
- **createElement**: Contains branching logic for different element types (div, img, a, polygons). **Recommendation:** Split element creation by type into separate helpers or services, and group by concern.

### BabylonMeshService
- **createPolygonVertexData** and **generatePolygonPoints**: Contain variation-specific logic for different polygon types (rectangle, triangle, pentagon, hexagon, octagon, etc.). **Recommendation:** If mesh or border logic grows, split by mesh or border type into separate files or classes.

### For All Features
- Each service/file should have a single, focused responsibility. If a service grows too large or handles unrelated concerns, split it.
- As the refactor proceeds, document any further findings and recommendations here.

---

## Recommendations

1. **Split BabylonDOMService:**
   - Layout logic (all flex/list/standard layout calculation) → `babylon-layout.service.ts`
   - Style parsing/merging → `babylon-style.service.ts`
   - Event handling → `babylon-events.service.ts`
   - Element creation should delegate to mesh/material/text services, not do layout or style parsing itself.
2. **Group variation-specific logic:**
   - If a function has large blocks for different element types or layout modes, split those into separate files or classes, grouped by concern.
3. **Review BabylonMeshService:**
   - If mesh creation for different shapes or borders grows, consider splitting by mesh type or border type.
4. **For each new or existing feature:**
   - Ensure that each service/file has a single, focused responsibility.
   - If a service grows too large or handles unrelated concerns, split it.

---

## Pre-Step-1 Enhancement: Deepen the Analysis

**Before starting Step 1 of the main refactor plan:**
- Review all functions for large blocks of variation-specific logic (e.g., big switch/case or if/else for element types or layout modes). If found, recommend splitting into separate files/classes grouped by concern. Add findings here.
- Review BabylonMeshService for possible splits by mesh type or border type. Add findings here.
- For each new or existing feature, ensure that each service/file has a single, focused responsibility. If not, recommend and document a split here.

**As you proceed with the refactor, update this file with new findings and recommendations.**
