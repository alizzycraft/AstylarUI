# Layout/Rendering Refactor Plan: Pixel-First Layout, World-Unit Rendering

> **Status (2026-08-15):** Historical design direction, partially implemented
> across the current camera, layout, and mesh services. The end-to-end audit and
> strict separation described here were not completed. Treat the principles as
> guidance and validate them through the parity harness rather than as active
> unfinished Phase 1 work.

## Step 0: Separation of Concerns Analysis (Optional Side Quest)
- **Before starting the main refactor, analyze the codebase for opportunities to split large files/services into smaller, more focused files/services.**
- Look for:
  - Large files with repeated or variation-specific logic (e.g., big blocks for different variations that could be split into their own files/folders).
  - Services that have grown too large and now contain unrelated functionality (e.g., DOM service also handling camera logic).
  - Functions that can be grouped by a more specific area of concern.
- For each opportunity, create a plan for refactoring and save it to `docs/seperation_of_concerns_improvement.md`.
- As you proceed with each step of the main refactor, **check the separation of concerns plan** and, if relevant, apply those refactors at the same time.

## Overview
This plan describes how to refactor the codebase to ensure all layout and sizing logic is performed in **screen pixels**, and only the final rendering step converts to **world units** for BabylonJS. This separation of concerns will make the system more maintainable, extensible, and accurate to CSS/web standards.

---

## Step-by-Step Refactor Plan

### 1. Audit All Layout and Sizing Code
- Identify all places where layout, sizing, or positioning is calculated or parsed.
- Look for any function that parses, calculates, or manipulates width, height, position, gap, margin, padding, flexBasis, etc.
- Find any place where pixel values are immediately converted to world units, or where world units are used in layout logic.
- **Check the separation of concerns plan for any relevant refactors and apply them as you go.**

### 2. Refactor Parsing Functions to Return Pixels
- Functions: `parseFlexBasis`, `parseGapValue`, `parsePaddingValue`, `parseMarginValue`, etc.
- Ensure these functions return values in **screen pixels** only.
- Remove any conversion to world units from these functions.
- **Check the separation of concerns plan for any relevant refactors and apply them as you go.**

### 3. Refactor Layout Calculation Functions to Use Pixels
- Functions: `calculateFlexLayout`, any flexbox/grid/list layout logic, etc.
- All layout math (flex grow/shrink, gap, alignment, etc.) should be done in pixels.
- The layout result (positions, sizes) should be in pixels.
- **Check the separation of concerns plan for any relevant refactors and apply them as you go.**

### 4. Refactor Mesh/Render Creation to Convert Pixels to World Units
- Functions: `createElement`, mesh creation, border/shadow rendering, etc.
- When creating or updating a mesh, **convert the final pixel values to world units** using the camera’s scale factor.
- Only this step should know about world units.
- **Check the separation of concerns plan for any relevant refactors and apply them as you go.**

### 5. Update Data Flow: Pass Pixel Layout to Renderer
- The renderer should receive a fully resolved layout (positions, sizes) in pixels.
- The renderer is responsible for converting these to world units for BabylonJS.
- **Check the separation of concerns plan for any relevant refactors and apply them as you go.**

### 6. Enforce the Pattern in All Existing Functionality
- Review all layout-related code (lists, images, borders, shadows, transforms, etc.).
- Ensure all layout logic is in pixels.
- Ensure all world unit conversion is isolated to rendering/mesh creation.
- **Check the separation of concerns plan for any relevant refactors and apply them as you go.**

### 7. Add Comments and Documentation
- Add comments to parsing/layout/rendering functions to clarify which units they use and why.
- Document the pattern for future contributors.
- **Check the separation of concerns plan for any relevant refactors and apply them as you go.**

---

## Order of Audit and Refactor

**Follow the order of the Enhanced Features Plan (docs/enhanced_features_plan.md), starting with the most basic features and progressing to advanced ones.**

### Audit/Refactor Order:
1. **Basic Box Model:**
   - Positioning (top, left, width, height)
   - Background color
   - Parent-child relationships
2. **Borders**
3. **Padding & Margin**
4. **Opacity/Transparency**
5. **Z-Index/Layering**
6. **Border Radius**
7. **Polygon Types**
8. **Box Shadow**
9. **Gradient Backgrounds**
10. **Transform Properties**
11. **Generic Container Elements**
12. **List Elements**
13. **Image Elements**
14. **Link Elements**
15. **Flexbox Layout** (core, then advanced: grow/shrink, gap, etc.)
16. **Table Layout**
17. **CSS Grid**
18. **Positioning Modes**
19. **Text Rendering**
20. **Scroll Areas**
21. **Input Elements**
22. **Zoom/Panning/Map Controls**
23. **Blend Mode/Filter/Tailwind/Bootstrap**
24. **Web Components/Material UI/Chakra UI**
25. **Spacial Shapes Grids**
26. **Multi-Page Sites/Sitemaps**

**For each feature:**
- Ensure all layout logic is in pixels.
- Ensure all rendering logic converts pixels to world units at the last possible step.
- If any code mixes units, refactor so that only the renderer/mesh creation does the conversion.
- **Check the separation of concerns plan for any relevant refactors and apply them as you go.**

---

## Maintenance Principle
- **Never mix units in the same function.**
- **All layout = pixels. All rendering = world units.**
- **Renderer should never do layout, only conversion and drawing.**

---

This plan will ensure a maintainable, extensible, and standards-aligned codebase for all current and future features.

## Step 1: Audit All Layout and Sizing Code

### Findings
- Layout, sizing, and positioning logic (width, height, top, left, background, parent-child relationships) is primarily handled in BabylonDOMService, especially in `calculateDimensions`, `createElement`, `createRootBodyElement`, and `processChildren`.
- There is mixing of pixel and world unit logic in `calculateDimensions` and related functions. These should be refactored so all layout is done in pixels, and only the final rendering step converts to world units.
- **Separation of concerns:**
  - `calculateDimensions` and related layout logic should be moved to a dedicated layout service (`babylon-layout.service.ts`).
  - Element creation should not do layout math, only use the resolved layout.
  - Parent-child relationships are handled in `processChildren`, which also mixes layout and rendering logic. This should be split so layout is resolved first, then rendering is handled separately.
  - Any style parsing (width, height, top, left, background) should be done in a style service, not mixed with layout or rendering.

### Action Items
- Refactor all layout and sizing logic to operate in pixels only.
- Move layout calculation functions to a dedicated layout service.
- Move style parsing to a style service.
- Ensure element creation and rendering only convert pixels to world units, and do not perform layout math.
- Split parent-child relationship handling so layout and rendering are separate steps.
- Reference the separation of concerns plan for implementation details and further recommendations.
