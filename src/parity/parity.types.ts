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
  | 'composed-application';

export interface ParityFixture {
  id: string;
  title: string;
  category: ParityCategory;
  expectedBehavior: string;
  measurementIds: string[];
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

export type ParityReferenceMutation =
  | ParityReferenceSetTextMutation
  | ParityReferenceSetValueMutation
  | ParityReferenceSetStyleMutation
  | ParityReferenceSetChildrenMutation
  | ParityReferenceSetSourceMutation;

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
}

declare global {
  interface Window {
    __ASTYLAR_PARITY_REPORT__?: ParityRuntimeReport;
    __ASTYLAR_PARITY_SET_VIEWPORT__?: (id: ParityViewport['id']) => void;
    __ASTYLAR_PARITY_APPLY_STEP__?: (index: number) => Promise<void>;
  }
}
