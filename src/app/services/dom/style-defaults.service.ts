import { Injectable } from "@angular/core";
import { StyleRule } from "../../types/style-rule";
import {
  globalDefaultStyle,
  elementDefaults,
} from "../../config/browser-defaults";

@Injectable({
  providedIn: "root",
})
export class StyleDefaultsService {
  static mergeStyles(
    base: Partial<StyleRule>,
    override: Partial<StyleRule>,
  ): Partial<StyleRule> {
    const merged = { ...base, ...override };
    // Handle padding
    if (override?.padding) {
      ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].forEach(
        (side) => {
          if (!(side in override)) {
            delete merged[side as keyof StyleRule];
          }
        },
      );
    }
    // Handle margin
    if (override?.margin) {
      ["marginTop", "marginRight", "marginBottom", "marginLeft"].forEach(
        (side) => {
          if (!(side in override)) {
            delete merged[side as keyof StyleRule];
          }
        },
      );
    }
    return merged;
  }

  getGlobalDefaultStyle(): Partial<StyleRule> {
    return globalDefaultStyle;
  }

  getElementTypeDefaults(elementType: string): Partial<StyleRule> {
    // Merge global defaults with element-specific defaults (element-specific takes precedence)
    return { ...globalDefaultStyle, ...(elementDefaults[elementType] || {}) };
  }
}
