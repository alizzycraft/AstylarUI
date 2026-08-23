# Enhanced Features Plan for ASTYLARUI

> **Status (2026-08-15):** Historical vision document written before much of the
> current renderer existed. Several features are now partially or fully present,
> but this file was not maintained as a completion checklist. Use
> `project-status.md` and measured parity fixtures for current planning.

## Overview
This plan outlines the strategic development of DOM elements and styling capabilities, building from simple to complex features. The goal is to create a comprehensive HTML/CSS-like system in 3D space using BabylonJS, avoiding the standard BabylonJS GUI package due to its limitations for our use case.

## Current State
- ✅ Basic `div` elements with positioning (top, left, width, height)
- ✅ Background color styling
- ✅ Hover states with material switching
- ✅ Parent-child element relationships
- ✅ Clean service architecture (Camera, Mesh, DOM services)
- ✅ Border support with frame-based rendering and hover states

## Development Phases

### Phase 1: Core Styling Enhancements (Simple)
**Estimated Complexity: Low**

1. **Border Support** ✅ **COMPLETED**
   - ✅ `borderWidth`, `borderColor`, `borderStyle` (solid initially)  
   - ✅ Implementation: Four-frame border system around element meshes
   - ✅ Hover support with color changes
   - ✅ CamelCase property support (borderWidth vs border-width)

2. **Padding & Margin** ✅ **COMPLETED**
   - ✅ `padding` (all sides, individual sides)
   - ✅ `margin` (spacing between elements)
   - ✅ Implementation: Adjust positioning calculations in `calculateDimensions`

3. **Opacity/Transparency** ✅ **COMPLETED**
   - ✅ `opacity` property (0.0 to 1.0)
   - ✅ Implementation: Modify material alpha channel in mesh service
   - ✅ Support for both element and border opacity
   - ✅ Added parseOpacity function with value clamping

4. **Z-Index/Layering** ✅ **COMPLETED**
   - ✅ `z-index` for element stacking order  
   - ✅ `zIndex` and `z-index` property support
   - ✅ Implementation: Adjust Z positioning in `positionMesh` with calculated scaling
   - ✅ Added parseZIndex function and calculateZPosition method
   - ✅ Border positioning updated to respect z-index layering

### Phase 2: Advanced Styling (Medium)

5. **Border Radius** ✅ **COMPLETED**
   - ✅ `border-radius` for rounded corners
   - ✅ Implementation: Custom mesh generation with curved edges using VertexData
   - ✅ Support for both 'borderRadius' and 'border-radius' properties
   - ✅ Automatic radius clamping to prevent visual artifacts
   - ✅ Fallback to regular plane when radius is 0
   - Challenge: Non-rectangular collision detection for hover events (to be addressed)

6. **Polygon-Type Property** ✅ **COMPLETED**
   - `polygonType` property added to style rule properties as optional
   - When not set differently defaults to `rectangle` (the existing code assumes this now)
   - Implementation: When set to `triangle` or `pentagon` or `hexagon` or `octagon` creates a mesh of that shape
   - Each polygon type uses its natural default orientation (no custom angle needed)
   - Note: If border-radius is set for a non-rect polygon type the corners are rounded
   - Border support: Borders follow the actual polygon outline instead of rectangular frames  

7. **Box Shadow** ✅ **COMPLETED**
   - ✅ `boxShadow` and `box-shadow` property support with offset, blur, color
   - ✅ Implementation: Additional shadow mesh behind main element
   - ✅ Support for both rectangle and polygon shadows with border radius
   - ✅ Shadow positioning with proper Z-layering behind elements
   - ✅ CSS parsing with regex pattern matching for standard box-shadow syntax
   - ✅ Sharp shadow support (blur = 0px) for crisp edges
   - ✅ Smooth blur implementation with multi-layer system for gradient effects
   - ✅ Glow effects (0px offset with blur) for surrounding shadows
   - ✅ Proper pixel-to-world coordinate scaling for consistent positioning

8. **Gradient Backgrounds** ✅ **COMPLETED**
   - ✅ `background: linear-gradient()`, `background: radial-gradient()`
   - ✅ Implementation: DynamicTexture with canvas-based gradient rendering
   - ✅ Support for directional gradients (angles, to right, to bottom, etc.)
   - ✅ Support for radial gradients (circle, ellipse) with positioning
   - ✅ Multi-color gradients with smooth color stop interpolation
   - ✅ Integration with existing polygon and border radius systems

9. **Transform Properties** ✅ **COMPLETED**
   - ✅ `transform: rotate()`, `transform: scale()`, `transform: translate()`
   - ✅ Implementation: Direct mesh transformation matrix manipulation
   - ✅ Support for individual transform functions and combined transforms
   - ✅ Unit support: degrees, radians, pixels, unitless values
   - ✅ 3D transform support with proper coordinate system conversion
   - ✅ Integration with existing polygon types, gradients, and other features

### Phase 3: Element Type Expansion (Medium)

10. **Generic Container Elements** ✅ **COMPLETED**
   - ✅ Refactored current `div` logic into generic container system
   - ✅ Support: `section`, `article`, `header`, `footer`, `nav`, `main`
   - ✅ Implementation: Single container class with different default styles
   - ✅ Type-specific default styling with semantic colors and properties
   - ✅ Style merging system: type defaults + explicit overrides

11. **List Elements** ✅ **COMPLETED**
    - ✅ `ul`, `ol`, `li` with automatic positioning
    - ✅ Implementation: Automatic vertical stacking logic for list items
    - ✅ Visual: Rectangle placeholders with bullet points/numbers as geometric indicators
    - ✅ Styling: `list-style-type` support (disc for ul, decimal for ol)
    - ✅ Type-specific default styling with proper list container behavior
    - ✅ Custom `listItemSpacing` property for controlling item spacing
    - ✅ Bullet point and number indicators as 3D geometric shapes

12. **Image Elements** ✅ **COMPLETED**
    - ✅ `img` elements as textured planes
    - ✅ Implementation: Texture loading and application to mesh with TextureService
    - ✅ Fallback: Colored rectangle with "IMG" indicator
    - ✅ Properties: `src`, `width`, `height`
    - ✅ Angular asset integration with public folder serving

13. **Link Elements** ✅ **COMPLETED**
    - ✅ `a` (anchor) elements as clickable containers (button-like for now)
    - ✅ Implementation: Styled containers with click events for navigation/callbacks
    - ✅ Visual: Similar to button styling until text rendering is available
    - ✅ Properties: `href` (navigation), `target` (_self, _blank), `onclick` (JavaScript execution)
    - ✅ Interaction: Scene-level pointer event handling, hover states for visual feedback
    - ✅ Navigation: URL validation, Angular router integration, external link support
    - ✅ Note: Text content will be added in Phase 5 with text rendering system

### Phase 4: Layout Systems (High)

14. **Flexbox Layout** ✅ **CORE COMPLETED** 🚧 **ADVANCED IN PROGRESS**
    - ✅ `display: flex`, `flex-direction`, `justify-content`, `align-items`, `flex-wrap`
    - ✅ Implementation: Custom layout calculation engine with multi-line wrapping support
    - ✅ Z-index layering system for proper 3D depth management
    - ✅ **Missing Advanced Features:**
      - ✅ `align-content` (alignment of wrapped lines)
      - ✅ `gap`, `row-gap`, `column-gap` (spacing between items)
      - ✅ `flex-grow`, `flex-shrink`, `flex-basis`, `flex` (item growth/shrink behavior)
      - ✅ `align-self` (individual item alignment override)
      - ✅ `order` (visual reordering of items)

15. **Table Layout**
    - elements: `table`, `td`, `th`, `tr`, `tbody`, `col`, `colgroup`, `thead`, `tfoot`, `caption`
    - Implementation: Table based positioning system

16. **CSS Grid (Subset)**
    - `display: grid`, `grid-template-columns`, `grid-template-rows`
    - Implementation: Grid-based positioning system
    - Scope: Basic grid layouts only, not full CSS Grid spec

17. **Positioning Modes**
    - `position: absolute`, `position: relative`, `position: fixed`
    - Implementation: Different coordinate calculation strategies
    - Current: All elements are effectively `position: relative`

### Phase 5: Text Rendering System (Very High)

18. **Custom GUI Manager  Text Rendering Engine**  
      - Create texture-based text rendering system
      - Generate text as textures, apply to planes
      - Potentially render text using built in browser text support in a separate canvas and copy to the correct plane
      - Custom event handling to match BabylonJS mesh events
      - Benefits: All browser fonts available, better performance
      - Implementation: Canvas → Texture → Material → Mesh pipeline

19. **Text Properties**
    - `font-family`, `font-size`, `font-weight`, `color`
    - `text-align`, `line-height`, `text-decoration`
    - Implementation depends on chosen text rendering approach

20. **Advanced Text Features**
    - `text-shadow`, `text-overflow: ellipsis`
    - Multi-line text with word wrapping
    - Rich text support (bold, italic within text)

### Phase 6: Interactive Elements (Very High)

21. **Scroll Areas**
    - `overflow: scroll` with scrollbar representation
    - Mouse wheel and drag scrolling
    - Virtual scrolling for performance 
    - Support for "infinite scroll" mode, (dynamic content is added as you scroll)

22. **Functional Input Elements**
    - Actual text input with cursor positioning
    - Button click events with custom callbacks
    - Form submission simulation

23. **Zoom**
    - Holding down Ctrl (or cmd on mac) and then moving the mouse wheel zooms in and out (not scrolls)
    - Holding down Ctrl and middle mouse click / some equivalent on mac resets zoom to 100%
    - zoom animations should smooth
    - some style settings against the site itself might be useful to enable / disable it (enabled by default)
    - ability to constrain it to a single container and only have that container respond to zoom controls (only when the mouse is over that container)

24. **Panning**
    - Holding down Alt (or option on mac) and then dragging the mouse pans the view
    - Holding down Alt (or option on mac) and middle mouse click / some equivalent on mac resets to initial position
    - some style settings against the site itself might be useful to enable / disable it (enabled by default)
    - ability to constrain it to a single container and only have that container respond to zoom controls (only when the mouse is over that container)

24. **Map Controls**
    - some style settings against the site itself might be useful to enable / disable it (disabled by default)
    - For containers only not the whole page (can make a full page container if you want that anyway)
    - Adds the typical controls like panning and zooming via ui elements rather than mouse/keyboard shortcuts

### Phase 7: Advanced Styling (High)

25. **Blend Mode**
    - [mix-blend-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode)
    - potential options: normal, mix-blend-mode: multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity, plus-darker, plus-lighter
    - Should also have a value that controls the amount it's applied.

26. **Filter**
    - Support for css filters
    - `blur`, `brightness`, `contrast`, `grayscale`, `hue-rotate`, `invert`, `saturate`, `sepia`
    - Do we need to do filters like opacity and drop shadow if there's already css styles for that?

26. **Tailwind**
    - Support for the most useful / popular tailwind utilities

27. **Bootstrap**
    - Support for the most useful / popular bootrstrap css classes
    - Can use the tailwind utilities if need be

### Phase 8: Web Components (High)

28. **Web Component Framework**
    - We should have some templates that have the json needed for the dom and styling of a component
    - The template should have certain options that you specify like if it's an "alert box" you pass in the alert message
    - When you set content for a site and specify a web component in the site dom json we need a way of passing in those options
    - When rendering the final site data the web component references should be replaced (in-memory only of course) and options applied

29. **Material UI**
    - Support for the material ui as web components
    - Need some way of determining scope like use the material ui styling within this container only
    - if needed we can add style properties to handle component inputs / options

30. **Chakra UI**
    - same as woth Material UI but for the charka ui components

31. **Spacial Shapes Grids**
    - Add a new element that will be used to create layouts where there is a grid of shapes that are not rectangular
    - Conceptually it will function like an ordered list but the items will be ordered spacially rather than ascending/descending order
    - For now we will only suuport regular tessellations (eg, triangle, square, and hexagon) so we need a property to set which one is wanted
    - There will be three values per grid, for triangle and square it will be (starting orientation, rows, columns)
    - For the hexagon grid there will only be two (starting orientation, radius)
    - Hexagon radius refers to items from edge to center, eg radius of 1 = 1 item total, radius of 2 = 7 items, radius of 3 = 19 items
    - Allow for spacing between the gaps

### Phase 9: Multi-Page Sites** (High)

32. **Add a Page layer of abstraction**
    - The current root of the site has children that are dom elements, going forward its children will be page elements
    - The new page element will have the dom elements as children
    - When there is only one page in the site root json data we can load that site
    - If there's multiple pages set in the json data then a "default page" can be set on the site to load
    - If there are multipel pages but no default page then for now pick the first one (temporary)

33. **Non-Rectangular Pages**
    - We should allow for pages (eg the root containing dom elements - not the site containing pages) to be a custom shape
    - If the shape is non-rectangular then we can allow for empty space around the page to show it as the desired shape 

34. **Sitemaps**
    - If there are multiple pages and no default page, or if there is only one page but default page is set to "none" then the pages should be displayed in a list
    - the way that they are displayed can be controlled by a 'sitemap' style property with options like `list`, `grid`
    - A `list` value would have the pages shown in an ordered list
    - A `grid` value would have the pages shown in a spacial grid and those pages will be the same shape as they are in the spacial grid
    - We can assume some default styles for each type but we should test all the functionality with test data
    - Clicking on a site should take you to a view of the page, but that transition should be a smooth animation

35. **Sitemap Styling**
    - Make sure the "empty space" on the sides of spacial sitemaps / shaped pages can be styled as well as part of the site styles

    
## Implementation Strategy

### Refactoring Priorities
1. **Abstract Element Creation**: Make `createElement` generic for all element types
2. **Style Parser Enhancement**: Extend style parsing to handle new CSS properties
3. **Material System**: Create material factory for different visual effects
4. **Event System**: Standardize mouse/interaction events across all elements
5. **Code Quality**: Clean / readable code over "whatever works"

### Service Organization
```
services/
├── babylon-dom.service.ts (orchestration)
├── babylon-camera.service.ts (viewport management)
├── babylon-mesh.service.ts (3D object creation)
├── babylon-style.service.ts (new: CSS parsing & application)
├── babylon-layout.service.ts (new: positioning & layout algorithms)
├── babylon-text.service.ts (new: text rendering engine)
└── babylon-events.service.ts (new: unified event handling)
```

### Testing Strategy
- Visual regression tests for element rendering
- Performance benchmarks for complex layouts
- Cross-browser compatibility testing

### Performance Considerations
- Mesh pooling for frequently created/destroyed elements
- LOD (Level of Detail) for off-screen or distant elements
- Selective rendering based on viewport visibility
- Material sharing for identical styles

## Success Metrics
- Support for 80% of common HTML elements (visual representation)
- Support for 60% of common CSS properties
- Smooth 60fps rendering with 100+ elements
- Mouse interaction response time < 16ms
- Text rendering quality comparable to browser text
- Memory usage growth < O(n²) with element count

## Risk Mitigation
- **Text Rendering Complexity**: Start with 3D font approach as fallback
- **Performance Issues**: Implement feature toggles for expensive effects
- **Browser Compatibility**: Progressive enhancement approach
- **Maintenance Overhead**: Comprehensive documentation and examples

This plan prioritizes building a solid foundation with simple features before tackling complex challenges like text rendering and advanced layouts.
