import { Injectable } from '@angular/core';
import type { Mesh } from '@babylonjs/core';
import { ASTYLAR_CORE_ELEMENT_TYPES } from './astylar-core-capabilities';
import {
  ASTYLAR_PLUGIN_API_VERSION,
  defineAstylarPlugin,
  type AstylarPluginElementRenderer,
} from './astylar-plugin';

export const ASTYLAR_CORE_PLUGIN_ID = 'astylar.core';

/**
 * Marker adapter retaining the existing specialized core renderer branches.
 * ElementCreationService recognizes this surface-scoped resolved contribution.
 */
@Injectable()
export class AstylarCoreCompatibilityRenderer implements AstylarPluginElementRenderer {
  render(): Mesh {
    throw new Error('The core compatibility renderer must be invoked by its internal adapter.');
  }
}

const coreElementIds = ASTYLAR_CORE_ELEMENT_TYPES.map(
  (type) => `${ASTYLAR_CORE_PLUGIN_ID}:${type}`,
);

export const ASTYLAR_CORE_PLUGIN = defineAstylarPlugin({
  id: ASTYLAR_CORE_PLUGIN_ID,
  version: '1.0.0',
  pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
  contributes: ['elements', 'renderers'],
  contributions: {
    elements: ASTYLAR_CORE_ELEMENT_TYPES.map((type) => ({
      id: `${ASTYLAR_CORE_PLUGIN_ID}:${type}`,
      alias: type,
      children: 'any' as const,
    })),
    renderers: [{
      id: `${ASTYLAR_CORE_PLUGIN_ID}:compatibility-renderer`,
      elements: coreElementIds,
      renderer: AstylarCoreCompatibilityRenderer,
    }],
  },
});
