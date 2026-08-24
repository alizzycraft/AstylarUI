import { SiteData } from '../app/types/site-data';

export interface ParityViewport {
  /** Stable profile name. Fixtures and application benchmarks may add their own names. */
  id: string;
  width: number;
  height: number;
  deviceScaleFactor: number;
}

export const PARITY_VIEWPORTS: Record<string, ParityViewport> = {
  desktop: { id: 'desktop', width: 800, height: 600, deviceScaleFactor: 1 },
  tablet: { id: 'tablet', width: 640, height: 720, deviceScaleFactor: 1 },
  mobile: { id: 'mobile', width: 390, height: 844, deviceScaleFactor: 1 },
  'tailwind-retina': {
    id: 'tailwind-retina', width: 700, height: 600, deviceScaleFactor: 2,
  },
};

export const PARITY_VIEWPORT = PARITY_VIEWPORTS['desktop'];

export function getParityViewport(id: string | null | undefined): ParityViewport {
  return PARITY_VIEWPORTS[id ?? ''] ?? PARITY_VIEWPORT;
}

export type ParityCategory =
  | 'cascade-defaults'
  | 'block-inline'
  | 'box-model-units'
  | 'typography'
  | 'flexbox'
  | 'positioning-stacking'
  | 'lists-tables-images'
  | 'forms-interactive'
  | 'selectors-cascade'
  | 'grid'
  | 'responsive'
  | 'overflow-scrolling'
  | 'controls-states'
  | 'layering-overlays'
  | 'composed-application'
  | 'accessibility-semantics';

export interface ParityFixture {
  id: string;
  title: string;
  category: ParityCategory;
  expectedBehavior: string;
  measurementIds: string[];
  /** Computed style properties that must match exactly after normalization. */
  enforcedStyleProperties?: Record<string, string[]>;
  optionalMeasurementIds?: string[];
  viewportIds?: ParityViewport['id'][];
  /** Optional fixture-owned profiles used instead of the global smoke profiles. */
  viewports?: ParityViewport[];
  responsiveSequence?: ParityViewport['id'][];
  expectedAbsentIds?: string[];
  expectedMissingIds?: string[];
  reference: {
    html: string;
    css: string;
  };
  siteData: SiteData;
  dynamicSteps?: ParityDynamicStep[];
  lifecycleViewports?: ParityViewport['id'][];
  interactionSteps?: ParityInteractionStep[];
  /** Repeated interaction phases used to enforce warm resource plateaus and final disposal. */
  interactionCycleLength?: number;
  interactionIds?: string[];
  /** Whether the pointer cursor must match after every interaction step. */
  enforcePointerCursor?: boolean;
  /** Text controls whose rendered caret/highlight and selection direction must match. */
  controlVisualStateIds?: string[];
  /** Non-control text nodes whose browser/Astylar selection state must match. */
  textSelectionIds?: string[];
  scrollIds?: string[];
  /** Authored IDs whose browser accessibility snapshots must match exactly. */
  semanticIds?: string[];
  /** Live-region IDs whose non-empty mutation announcements must match exactly. */
  announcementIds?: string[];
  /** Zero-based dynamic-step indexes that must retain measured Babylon owners. */
  visualReuseStepIndexes?: number[];
  /** Zero-based visual-update indexes that must retain common measured mesh owners. */
  visualOwnerReuseStepIndexes?: number[];
  interactionEventTypes?: ParityInteractionEventType[];
  /** Click handlers installed outside serializable fixture data. */
  cancelClickIds?: string[];
  /** Native reference dialogs opened with showModal() after fixture reconciliation. */
  modalDialogIds?: string[];
  /** Native reference dialog cancel events prevented by application policy. */
  cancelDialogIds?: string[];
}

export type ParityInteractionEventType =
  | 'pointerenter'
  | 'pointerleave'
  | 'pointerdown'
  | 'pointerup'
  | 'click'
  | 'focus'
  | 'blur'
  | 'keydown'
  | 'keyup'
  | 'input'
  | 'change'
  | 'invalid'
  | 'submit'
  | 'reset'
  | 'cancel'
  | 'close';

export interface ParityClickAction {
  type: 'click';
  elementId: string;
  offsetX?: number;
  offsetY?: number;
}

/** Chooses a native popup option semantically and the equivalent Astylar row by pointer. */
export interface ParitySelectOptionAction {
  type: 'select-option';
  elementId: string;
  value: string;
  offsetX: number;
  offsetY: number;
}

export interface ParityHoverAction {
  type: 'hover';
  elementId: string;
  offsetX?: number;
  offsetY?: number;
}

export interface ParityPointerDownAction {
  type: 'pointer-down';
  elementId: string;
  offsetX?: number;
  offsetY?: number;
}

export interface ParityPointerUpAction {
  type: 'pointer-up';
}

export interface ParityPauseAction {
  type: 'pause';
  durationMs: number;
}

export interface ParityPressKeyAction {
  type: 'press-key';
  key: string;
}

/** Copies the current browser or scene-owned document-text selection. */
export interface ParityCopySelectionAction {
  type: 'copy-selection';
}

export interface ParityTypeTextAction {
  type: 'type-text';
  text: string;
}

/** Focuses the native authored node (or Astylar semantic counterpart). */
export interface ParitySemanticFocusAction {
  type: 'semantic-focus';
  elementId: string;
}

/** Invokes native semantic activation without pointer-driving the visual surface. */
export interface ParitySemanticActivateAction {
  type: 'semantic-activate';
  elementId: string;
}

export interface ParityApplyUpdateAction {
  type: 'apply-update';
  stepIndex: number;
  viewportId?: ParityViewport['id'];
}

export interface ParityWheelAction {
  type: 'wheel';
  elementId: string;
  deltaX?: number;
  deltaY?: number;
}

export type ParityInteractionAction =
  | ParityClickAction
  | ParitySelectOptionAction
  | ParityHoverAction
  | ParityPointerDownAction
  | ParityPointerUpAction
  | ParityPauseAction
  | ParityPressKeyAction
  | ParityCopySelectionAction
  | ParityTypeTextAction
  | ParitySemanticFocusAction
  | ParitySemanticActivateAction
  | ParityApplyUpdateAction
  | ParityWheelAction;

export interface ParityInteractionStep {
  id: string;
  actions: ParityInteractionAction[];
}

export interface ParityReferenceSetTextMutation {
  type: 'set-text';
  elementId: string;
  textContent: string;
}

export interface ParityReferenceSetValueMutation {
  type: 'set-value';
  elementId: string;
  value: string;
}

export interface ParityReferenceSetStyleMutation {
  type: 'set-style';
  elementId: string;
  property: string;
  value: string;
}

export interface ParityReferenceSetChildrenMutation {
  type: 'set-children';
  elementId: string;
  html: string;
}

export interface ParityReferenceSetSourceMutation {
  type: 'set-source';
  elementId: string;
  source: string;
}

export interface ParityReferenceRemoveElementMutation {
  type: 'remove-element';
  elementId: string;
}

export interface ParityReferenceSetAttributeMutation {
  type: 'set-attribute';
  elementId: string;
  name: string;
  value?: string;
}

export type ParityReferenceMutation =
  | ParityReferenceSetTextMutation
  | ParityReferenceSetValueMutation
  | ParityReferenceSetStyleMutation
  | ParityReferenceSetChildrenMutation
  | ParityReferenceSetSourceMutation
  | ParityReferenceRemoveElementMutation
  | ParityReferenceSetAttributeMutation;

export interface ParityDynamicStep {
  id: string;
  referenceMutations: ParityReferenceMutation[];
  siteData: SiteData;
}

export interface ParityRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ParityElementMeasurement {
  id: string;
  borderBox: ParityRect;
  contentBox?: ParityRect;
  styles: Record<string, string | number | undefined>;
  text?: {
    content: string;
    lineCount: number;
    lines?: string[];
  };
  visibility?: ParityVisibilityMeasurement;
}

export interface ParityVisibilityMeasurement {
  exists: boolean;
  intersectsViewport: boolean;
  fullyVisible: boolean;
  clipped: boolean;
  clippingAncestorIds: string[];
  viewportIntersection?: ParityRect;
}

export interface ParityRuntimeReport {
  ready: boolean;
  revision?: number;
  fixtureId: string;
  mode: 'reference' | 'astylar';
  viewport: ParityViewport;
  elements: Record<string, ParityElementMeasurement>;
  errors: string[];
  resources?: { meshes: number; materials: number; textures: number };
  registries?: { elements: number; inputs: number };
  semantics?: { nodes: number; eventRegistrations: number; observerRegistrations: number };
  visualOwners?: Record<string, number>;
  visualReconciliation?: {
    strategy: 'initial' | 'reuse' | 'rebuild';
    last: {
      reused: number;
      created: number;
      replaced: number;
      disposed: number;
      reconciled: number;
      reflowed: number;
    };
  };
  interaction?: ParityInteractionReport;
}

export interface ParityNormalizedEvent {
  type: ParityInteractionEventType;
  targetId: string;
  currentTargetId: string;
  defaultPrevented: boolean;
  value?: string;
  checked?: boolean;
  selectedValue?: string;
  key?: string;
  code?: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  button?: number;
  pointerType?: string;
}

export interface ParityControlState {
  type: string;
  value: string;
  checked?: boolean;
  selectedIndex?: number;
  selectedValue?: string;
  expanded?: boolean;
  disabled: boolean;
  focused: boolean;
  selectionStart?: number;
  selectionEnd?: number;
  selectionDirection?: 'forward' | 'backward' | 'none';
  cursorPosition?: number;
  /** Whether the focused collapsed caret has an owned visual in the renderer. */
  caretRendered?: boolean;
  /** Whether a non-collapsed control selection has an owned highlight visual. */
  selectionRendered?: boolean;
  scrollLeft?: number;
  scrollTop?: number;
  touched?: boolean;
  dirty?: boolean;
  valid?: boolean;
}

export interface ParityInteractionReport {
  events: ParityNormalizedEvent[];
  focusedElementId?: string;
  modalDialogId?: string;
  controls: Record<string, ParityControlState>;
  /** Effective pointer cursor after the most recent pointer movement. */
  pointerCursor?: string;
  /** Browser Selection/Astylar text-selection state for non-control text. */
  textSelection?: ParityTextSelectionState;
  /** Text exposed by the latest native copy event in this interaction sequence. */
  clipboardText?: string;
  scrollContainers?: Record<string, ParityScrollState>;
  navigationOutcomes?: ParityNavigationOutcome[];
  registrations?: {
    pointerObservers: number;
    wheelHandlers: number;
    keyboardListeners: number;
    handlers: number;
    openPopups?: number;
    popupObservers?: number;
    popupMeshes?: number;
    popupMaterials?: number;
    popupTextures?: number;
  };
}

export interface ParityTextSelectionState {
  elementId?: string;
  text: string;
  anchorOffset?: number;
  focusOffset?: number;
  startOffset?: number;
  endOffset?: number;
  direction: 'forward' | 'backward' | 'none';
  collapsed: boolean;
  highlightRendered: boolean;
}

export interface ParityNavigationOutcome {
  sourceId: string;
  href: string;
  kind: 'fragment' | 'external';
  url: string;
  target?: string;
  fragmentId?: string;
}

export interface ParityScrollState {
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
  initialScrollLeft?: number;
  initialScrollTop?: number;
  maxScrollLeft?: number;
  maxScrollTop?: number;
  canReachRight?: boolean;
  canReachBottom?: boolean;
}

export interface ParityDisposalReport {
  before: {
    resources?: { meshes: number; materials: number; textures: number };
    elements: number;
    inputs: number;
    cleanupRegistrations: number;
    semanticNodes?: number;
    semanticEventRegistrations?: number;
    semanticObserverRegistrations?: number;
  };
  after: {
    resources?: { meshes: number; materials: number; textures: number };
    elements: number;
    inputs: number;
    cleanupRegistrations: number;
    semanticNodes?: number;
    semanticEventRegistrations?: number;
    semanticObserverRegistrations?: number;
    sessionStatus?: string;
    engineDisposed: boolean;
    sceneDisposed: boolean;
  };
}

declare global {
  interface Window {
    __ASTYLAR_PARITY_REPORT__?: ParityRuntimeReport;
    __ASTYLAR_PARITY_SET_VIEWPORT__?: (id: ParityViewport['id']) => void;
    __ASTYLAR_PARITY_APPLY_STEP__?: (
      index: number,
      viewportId?: ParityViewport['id'],
    ) => Promise<void>;
    __ASTYLAR_PARITY_DISPOSE__?: () => ParityDisposalReport;
    __ASTYLAR_PARITY_INTERACTION_STEPS__?: ParityInteractionStep[];
    __ASTYLAR_PARITY_CAPTURE_INTERACTION__?: () => Promise<void>;
  }
}
