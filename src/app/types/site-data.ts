import { DOMElement } from "./dom-element";
import { StyleRule } from "./style-rule";

/** Persisted compatibility requirement for plugin-owned document data. */
export interface AstylarDocumentPluginRequirement {
  readonly id: string;
  /** Semantic-version range accepted by the authored document. */
  readonly versionRange: string;
  /** Positive integer version of this plugin's persisted data shape. */
  readonly schemaVersion: number;
  /** Required by default. Optional capabilities may recover without the plugin. */
  readonly required?: boolean;
}

export interface SiteData {
  styles: StyleRule[];
  /** Plugins required to interpret namespaced authored data. */
  plugins?: readonly AstylarDocumentPluginRequirement[];
  root: {
    type?: string;
    id?: string;
    children: DOMElement[];
  };
  meta?: {
    description?: string;
  };
}
