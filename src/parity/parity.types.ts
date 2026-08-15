import { SiteData } from '../app/types/site-data';

export const PARITY_VIEWPORT = {
  width: 800,
  height: 600,
  deviceScaleFactor: 1
} as const;

export type ParityCategory =
  | 'cascade-defaults'
  | 'block-inline'
  | 'box-model-units'
  | 'typography'
  | 'flexbox'
  | 'positioning-stacking'
  | 'lists-tables-images'
  | 'forms-interactive';

export interface ParityFixture {
  id: string;
  title: string;
  category: ParityCategory;
  expectedBehavior: string;
  measurementIds: string[];
  reference: {
    html: string;
    css: string;
  };
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
  fixtureId: string;
  mode: 'reference' | 'astylar';
  viewport: typeof PARITY_VIEWPORT;
  elements: Record<string, ParityElementMeasurement>;
  errors: string[];
}

declare global {
  interface Window {
    __ASTYLAR_PARITY_REPORT__?: ParityRuntimeReport;
  }
}

