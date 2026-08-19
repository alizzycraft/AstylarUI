import { DOMElement } from "./dom-element";
import { StyleRule } from "./style-rule";

export interface SiteData {
  styles: StyleRule[];
  root: {
    type?: string;
    id?: string;
    children: DOMElement[];
  };
  meta?: {
    description?: string;
  };
}
