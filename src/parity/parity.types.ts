import { SiteData } from '../app/types/site-data';

export interface ParityViewport {
  id: 'desktop' | 'tablet' | 'mobile';
  width: number;
  height: number;
  deviceScaleFactor: number;
}

export const PARITY_VIEWPORTS: Record<ParityViewport['id'], ParityViewport> = {
  desktop: { id: 'desktop', width: 800, height: 600, deviceScaleFactor: 1 },
  tablet: { id: 'tablet', width: 640, height: 720, deviceScaleFactor: 1 },
  mobile: { id: 'mobile', width: 390, height: 844, deviceScaleFactor: 1 },
};

export const PARITY_VIEWPORT = PARITY_VIEWPORTS.desktop;

export function getParityViewport(id: string | null | undefined): ParityViewport {
  return PARITY_VIEWPORTS[id as ParityViewport['id']] ?? PARITY_VIEWPORT;
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
  optionalMeasurementIds?: string[];
  viewportIds?: ParityViewport['id'][];
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
  scrollIds?: string[];
  /** Authored IDs whose browser accessibility snapshots must match exactly. */
  semanticIds?: string[];
  interactionEventTypes?: ParityInteractionEventType[];
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
  | 'reset';

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

export interface ParityTypeTextAction {
  type: 'type-text';
  text: string;
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
  | ParityTypeTextAction
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

export type ParityReferenceMutation =
  | ParityReferenceSetTextMutation
  | ParityReferenceSetValueMutation
  | ParityReferenceSetStyleMutation
  | ParityReferenceSetChildrenMutation
  | ParityReferenceSetSourceMutation
  | ParityReferenceRemoveElementMutation;

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
  cursorPosition?: number;
  scrollLeft?: number;
  scrollTop?: number;
  touched?: boolean;
  dirty?: boolean;
  valid?: boolean;
}

export interface ParityInteractionReport {
  events: ParityNormalizedEvent[];
  focusedElementId?: string;
  controls: Record<string, ParityControlState>;
  scrollContainers?: Record<string, ParityScrollState>;
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

export interface ParityScrollState {
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
}

export interface ParityDisposalReport {
  before: {
    resources?: { meshes: number; materials: number; textures: number };
    elements: number;
    inputs: number;
    cleanupRegistrations: number;
    semanticNodes?: number;
  };
  after: {
    resources?: { meshes: number; materials: number; textures: number };
    elements: number;
    inputs: number;
    cleanupRegistrations: number;
    semanticNodes?: number;
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
