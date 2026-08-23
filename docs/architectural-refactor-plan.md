# AstylarUI Architectural Refactor Plan

> **Status (2026-08-15):** Phase 1.1 and Phase 1.2 are complete. Phases 2-7
> are uncommitted future proposals, not unfinished parts of the renderer split.
> See `project-status.md` for the current handoff.

## Overview
This document outlines the architectural improvements for the AstylarUI project based on the code review conducted on 2026-05-01. The plan addresses key architectural concerns while respecting the project's "pure renderer" philosophy and acknowledging existing technical debt.

## De-Scoped Items (Out of Scope)

### 3.3 Style Defaults Service - Browser Default Replication
**Status:** Partially in scope - Moving defaults TO A FILE is now included
**Reasoning:** The defaults in `StyleDefaultsService` were intended as a
browser-compatibility baseline. They also contain legacy Astylar visual choices,
so browser fidelity is a goal rather than a verified property of every value.

**In scope:** Extracting defaults to a separate configuration file for better organization
**Not in scope:** Changing default values during the configuration-only extraction

**New task added:** See Phase 1.2 below

### 4.1 Magic Numbers
**Status:** Not in scope for this refactor
**Reasoning:** This is a known issue that has already been investigated extensively. Previous attempts to address these magic numbers (particularly in `BabylonCameraService`) have proven complex and scope-intensive. These will remain as documented technical debt.

**Documentation approach:** Add `// TODO: TECH-DEBT` comments with explanations where magic numbers exist.

---

## Phase 1: Service Responsibility Refactoring (High Priority)

### 1.1 Split BabylonDOMService
**Resolution:** Completed in commits `c7465b7` and `40ac6f4`.
**Current Issue:** `BabylonDOMService` has too many responsibilities (DOM rendering, text rendering coordination, input management, hover states, element lifecycle).

**Target Files:**
- `src/app/services/dom/babylon-dom.service.ts` (refactor)
- Create new services in `src/app/services/dom/`

**Proposed Split:**
```
BabylonDOMService (refactored)
├── BabylonDOMRendererService (new)
│   └── Core rendering logic, mesh creation, scene management
├── BabylonElementManagerService (new)
│   └── Element lifecycle, Map<string, Mesh> management
└── BabylonInteractionService (new)
    └── Hover states, focus states, interaction tracking
```

**Tasks:**
1. Extract element lifecycle management (Maps, registration, cleanup) → `BabylonElementManagerService`
2. Extract hover/focus/interaction state tracking → `BabylonInteractionService`
3. Keep core rendering orchestration in `BabylonDOMRendererService`
4. Update constructor dependencies and ensure proper injection
5. Maintain backward compatibility via the `dom` getter interface

**Estimated Impact:** High - Core service refactoring
**Risk:** Medium - Requires careful testing of element rendering pipeline

### 1.2 Extract Browser Defaults to Configuration File
**Resolution:** Completed during the 2026-08-15 reconciliation, including
regression coverage that verifies the extraction preserves the previous defaults.
**Current Issue:** Browser default styles are embedded in `StyleDefaultsService` making the service file long and mixing configuration with logic.

**Target Files:**
- `src/app/services/dom/style-defaults.service.ts` (refactor)
- Create `src/app/config/browser-defaults.ts` (new)
- Potentially create `src/app/config/index.ts` for exports

**Tasks:**
1. Create `src/app/config/browser-defaults.ts` with `globalDefaultStyle` and `defaults` objects
2. Add MDN documentation links as comments for each default
3. Update `StyleDefaultsService` to import from config file
4. Keep the `mergeStyles()` method and `getElementTypeDefaults()` logic in the service
5. Document that the values are a compatibility baseline awaiting fixture-based
   parity validation

**Example structure:**
```typescript
// src/app/config/browser-defaults.ts
export const globalDefaultStyle: Partial<StyleRule> = {
    // ... (existing defaults)
};

export const elementDefaults: { [key: string]: Partial<StyleRule> } = {
    // === SECTIONS & STRUCTURE ===
    // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div
    div: {},
    // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/section
    section: { background: '#34495e' },
    // ...
};
```

**Benefits:**
- Cleaner separation of configuration vs logic
- Easier to maintain and update defaults
- Configuration file can be generated from MDN data in the future
- `StyleDefaultsService` focuses on style resolution logic

**Estimated Impact:** Low - Configuration reorganization
**Risk:** Low - Straightforward extraction with minimal logic changes

---

## Phase 2: State Management Standardization (High Priority)

### 2.1 Standardize on NgRx Signals Pattern
**Current Issue:** Inconsistent state management patterns:
- `CounterStore` uses NgRx Signals (`signalStore`)
- `TextSelectionStore` uses injectable with manual signals

**Target Files:**
- `src/app/store/text-selection.store.ts` (refactor to NgRx Signals)
- Potentially create additional stores for other stateful services

**Tasks:**
1. Convert `TextSelectionStore` to use `signalStore()` pattern
2. Ensure consistent API surface (`store.state()` vs `store.snapshot`)
3. Update all consumers of `TextSelectionStore` to use new API
4. Consider if `BabylonCameraService` state should also be migrated

**Example Target Pattern:**
```typescript
export const TextSelectionStore = signalStore(
  { providedIn: 'root' },
  withState(initialTextSelectionState),
  withComputed((store) => ({
    hasSelection: computed(() => store.state().hasSelection),
    selectedText: computed(() => { /* ... */ })
  })),
  withMethods((store) => ({
    clearSelection: () => { /* ... */ }
  }))
);
```

**Estimated Impact:** Medium - State access pattern changes
**Risk:** Low-Medium - Well-typed refactoring with clear patterns

---

## Phase 3: Logging Infrastructure (Medium Priority)

### 3.1 Implement Logging Service
**Current Issue:** Excessive console logging in `BabylonCameraService` and other services. No log level control.

**Target Files:**
- Create `src/app/services/logging.service.ts` (new)
- Update `BabylonCameraService` and other services

**Tasks:**
1. Create `LoggingService` with log levels (DEBUG, INFO, WARN, ERROR)
2. Add environment-based configuration (`environment.ts`)
3. Replace `console.log` calls with `loggingService.debug()` / `info()` / etc.
4. Add DPR-specific logging namespace support
5. Ensure production builds strip debug logs

**Example:**
```typescript
@Injectable({ providedIn: 'root' })
export class LoggingService {
  private level = environment.production ? LogLevel.WARN : LogLevel.DEBUG;
  
  debug(namespace: string, message: string, data?: any) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[${namespace}] ${message}`, data);
    }
  }
}
```

**Estimated Impact:** Medium - Multiple files updated
**Risk:** Low - Additive change with fallback to console

---

## Phase 4: BabylonJS Abstraction (Medium Priority)

### 4.1 Create BabylonJS Abstraction Layer
**Current Issue:** Tight coupling to BabylonJS types in services (`Mesh`, `Scene`, etc.)

**Target Files:**
- Create `src/app/services/rendering/` directory (new)
- Create abstraction interfaces and adapter

**Tasks:**
1. Define `IRenderer`, `IScene`, `IMesh` interfaces
2. Create `BabylonMeshAdapter` implementing `IMesh`
3. Update services to depend on abstractions, not BabylonJS directly
4. Keep BabylonJS-specific code in adapter implementations
5. Enable easier testing with mock renderers

**Benefits:**
- Decoupled architecture
- Easier unit testing
- Potential future engine flexibility

**Estimated Impact:** High - Significant abstraction work
**Risk:** Medium-High - Core rendering changes require extensive testing

**Note:** This could be phased in gradually, starting with `Mesh` abstraction.

---

## Phase 5: Error Handling & Resilience (Medium Priority)

### 5.1 Add Error Boundaries
**Current Issue:** No error boundaries for BabylonJS initialization failures or rendering errors.

**Target Files:**
- Create `src/app/error-boundary/` directory (new)
- Update `SiteComponent` and other rendering components

**Tasks:**
1. Create `BabylonErrorBoundaryService` for catching rendering errors
2. Add fallback UI for initialization failures
3. Implement retry logic for transient failures
4. Add error reporting hooks (optional: integrate with logging service)
5. Update templates to show error states

**Estimated Impact:** Medium - New error handling infrastructure
**Risk:** Low - Additive resilience improvements

---

## Phase 6: Type Safety Improvements (Low Priority)

### 6.1 Eliminate `any` Types
**Current Issue:** `private inputElements: Map<string, any>` and similar `any` usages.

**Target Files:**
- `src/app/services/dom/babylon-dom.service.ts`
- `src/app/types/` (potentially new types)

**Tasks:**
1. Define `InputElement` interface in `src/app/types/input-types.ts`
2. Update `BabylonDOMService.inputElements` to use proper type
3. Audit other services for `any` usage
4. Consider creating branded types for element IDs

**Estimated Impact:** Low-Medium - Type improvements
**Risk:** Low - Purely additive type safety

---

## Phase 7: Memory Management & Performance (Low Priority)

### 7.1 Consistent Cleanup Implementation
**Current Issue:** `BabylonCameraService` has `cleanup()` but other services don't implement `OnDestroy` consistently.

**Target Files:**
- All services with `Map` storage or BabylonJS resources

**Tasks:**
1. Implement `OnDestroy` on all services with resources
2. Add cleanup methods for Maps, textures, meshes
3. Ensure `ngOnDestroy` calls cleanup
4. Consider using `DestroyRef` pattern consistently

### 7.2 Rendering Optimization
**Current Issue:** No dirty checking, frequent texture recreation.

**Target Files:**
- `src/app/services/text/`
- `src/app/services/dom/`

**Tasks:**
1. Add change detection for Babylon mesh updates
2. Implement texture caching for text rendering
3. Consider mesh pooling for similar elements
4. Profile rendering performance before/after

**Estimated Impact:** Medium - Performance improvements
**Risk:** Medium - Optimization may introduce bugs if not careful

---

## Implementation Timeline (Suggested)

| Phase | Description | Priority | Estimated Effort |
|-------|-------------|----------|------------------|
| 1 | Service Responsibility Refactoring | High | 3-5 days |
| 1.2 | Extract Browser Defaults to Config | Medium | 0.5-1 day |
| 2 | State Management Standardization | High | 2-3 days |
| 3 | Logging Infrastructure | Medium | 1-2 days |
| 4 | BabylonJS Abstraction | Medium | 5-8 days |
| 5 | Error Handling & Resilience | Medium | 2-3 days |
| 6 | Type Safety Improvements | Low | 1-2 days |
| 7 | Memory & Performance | Low | 3-5 days |

**Total Estimated Effort:** 17.5-29 days (depending on scope adjustments)

---

## Testing Strategy

For each phase:
1. **Unit tests** for new services and refactored methods
2. **Integration tests** for service interactions
3. **Visual regression tests** for rendering output (manual or automated)
4. **SSR tests** to ensure server-side rendering still works
5. **DPR tests** to verify pixel-perfect rendering across devices

---

## Success Criteria

- [ ] `BabylonDOMService` responsibilities clearly separated
- [ ] All state management follows NgRx Signals pattern
- [ ] Logging is configurable and production-safe
- [ ] BabylonJS types are abstracted behind interfaces
- [ ] Error boundaries prevent catastrophic failures
- [ ] No `any` types in service definitions
- [ ] All services properly clean up resources
- [ ] Rendering performance meets or exceeds current benchmarks
- [ ] All existing functionality works after refactoring
- [ ] SSR routes continue to function correctly

---

## Notes

- This plan intentionally excludes the de-scoped items (3.3 and 4.1) as documented above
- Each phase can be implemented independently, but Phase 1 and 2 are prerequisites for later phases
- Consider feature flags for gradual rollout of major changes
- Document all architectural decisions in `docs/architecture-decisions/` (future)

---

*Plan created: 2026-05-01*
*Based on architectural code review of AstylarUI project*

---

## Technical Debt Documentation

### Magic Numbers (De-Scoped Item 4.1)

The following locations contain magic numbers that should be documented as technical debt:

#### `src/app/services/babylon-camera.service.ts`
- `borderZ = centerZ + 0.01` (line ~290) - Z-fighting prevention offset
  - **TODO: TECH-DEBT** - This value was determined experimentally. Previous attempts to calculate this dynamically based on scene depth or camera near/far planes have not been successful. The 0.01 value works across tested scenarios but is not mathematically derived.

- `cameraDistance = (canvas.height) / Math.tan(fov / 2)` - Camera positioning calculation
  - **TODO: TECH-DEBT** - The formula assumes specific FOV orientation. Should be extracted to a named constant with explanation of the trigonometric basis.

#### `src/app/services/dom/babylon-dom.service.ts`
- Default viewport dimensions: `sceneWidth: 1920`, `sceneHeight: 1080`
  - **TODO: TECH-DEBT** - These defaults should come from configuration or be calculated from the actual canvas dimensions at initialization time.

### Previous Investigation Notes

Magic number resolution was previously attempted with the following approaches:
1. Dynamic Z-offset calculation based on camera frustum depth
2. Using BabylonJS's built-in z-fighting prevention utilities
3. Calculating offsets based on mesh bounding box dimensions

All approaches either introduced new edge cases or didn't resolve the issue across different DPR values and canvas sizes. The current hardcoded values remain as the most reliable approach until a mathematically sound solution is found.

---

## Appendix: Browser Default Style Rationale (Item 3.3)

The `StyleDefaultsService` contains default styles intended to approximate modern
browser behavior. The extracted values preserve legacy behavior; they are not a
claim of exact user-agent stylesheet parity.

**Why this is not a purity violation:**
- The "pure renderer" principle refers to avoiding *arbitrary* fallback logic that hides rendering bugs
- Browser default styles are a *specification*, not arbitrary fallbacks
- Users expect their CSS to render consistently between AstylarUI and Chrome/Firefox/Safari
- Fixture-based parity work should verify and improve these defaults without
  introducing arbitrary renderer fallbacks

**Current organization (before refactor):**
- `globalDefaultStyle` - Shared resets and base styles
- `defaults` map - Per-element type defaults matching MDN specifications

**After Phase 1.2 refactor:**
- Configuration extracted to `src/app/config/browser-defaults.ts`
- MDN documentation links added for each default
- `StyleDefaultsService` focuses on style resolution logic only

**Future enhancements (not in scope):**
- Consider generating defaults from a Web Platform Tests dataset (long-term)
- Add automated tests to verify defaults match MDN specifications
