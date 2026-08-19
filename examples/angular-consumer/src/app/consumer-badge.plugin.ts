import {
  DestroyRef,
  EnvironmentProviders,
  Injectable,
  InjectionToken,
  inject,
  signal,
} from '@angular/core';
import { MeshBuilder, type Mesh } from '@babylonjs/core';
import {
  ASTYLAR_PLUGIN_API_VERSION,
  ASTYLAR_PLUGIN_SURFACE_CONTEXT,
  defineAstylarPlugin,
  provideAstylarPlugin,
  type AstylarPluginElementRenderer,
  type AstylarPluginLifecycle,
  type AstylarPluginRenderContext,
} from 'astylarui';

export interface ConsumerBadgeConfig {
  readonly marker: string;
  readonly minimumDepth: number;
}

export const CONSUMER_BADGE_CONFIG =
  new InjectionToken<ConsumerBadgeConfig>('CONSUMER_BADGE_CONFIG');

let nextSurfaceInstance = 0;

@Injectable()
class ConsumerBadgeSurfaceState {
  readonly instanceId = ++nextSurfaceInstance;
  readonly active = signal(false);
  readonly renders = signal(0);
  readonly disposed = signal(false);
  readonly surface = inject(ASTYLAR_PLUGIN_SURFACE_CONTEXT);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => this.disposed.set(true));
  }
}

@Injectable()
class ConsumerBadgeLifecycle implements AstylarPluginLifecycle {
  private readonly state = inject(ConsumerBadgeSurfaceState);

  activate(): void {
    this.state.active.set(true);
  }
}

@Injectable()
class ConsumerBadgeRenderer implements AstylarPluginElementRenderer {
  private readonly config = inject(CONSUMER_BADGE_CONFIG);
  private readonly state = inject(ConsumerBadgeSurfaceState);

  render(context: AstylarPluginRenderContext): Mesh {
    const authoredDepth = context.properties['consumerBadgeDepth'];
    const depth = Math.max(
      this.config.minimumDepth,
      typeof authoredDepth === 'number' ? authoredDepth : 0,
    );
    this.state.renders.update((count) => count + 1);
    const mesh = MeshBuilder.CreateBox(context.meshId, {
      width: context.dimensions.width * context.dimensions.pixelToWorldScale,
      height: context.dimensions.height * context.dimensions.pixelToWorldScale,
      depth,
    }, context.scene);
    mesh.metadata = {
      astylarPluginId: 'consumer.proof',
      astylarPluginMarker: this.config.marker,
      astylarPluginInstanceId: this.state.instanceId,
      astylarPluginActive: this.state.active(),
      astylarPluginRenderCount: this.state.renders(),
      astylarPluginDepth: depth,
      astylarPluginLabel: context.element.data?.['label'],
      astylarPluginCapabilityCount: this.state.surface.capabilities.pluginIds.length,
    };
    return mesh;
  }
}

export function provideConsumerBadgePlugin(
  config: ConsumerBadgeConfig,
): EnvironmentProviders {
  return provideAstylarPlugin(defineAstylarPlugin({
    id: 'consumer.proof',
    version: '1.0.0',
    pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
    dependencies: ['astylar.core'],
    contributes: ['elements', 'properties', 'renderers', 'lifecycle'],
    providers: [
      ConsumerBadgeSurfaceState,
      { provide: CONSUMER_BADGE_CONFIG, useValue: Object.freeze({ ...config }) },
    ],
    contributions: {
      elements: [{
        id: 'consumer.proof:badge',
        alias: 'consumer-badge',
        defaults: { data: { label: 'Consumer plugin badge' } },
        children: 'none',
        validate: (element) => {
          const data = element['data'] as { label?: unknown } | undefined;
          return typeof data?.label === 'string' && data.label.trim().length > 0
            ? true
            : 'consumer-badge data.label must be a non-empty string.';
        },
      }],
      properties: [{
        id: 'consumer.proof:depth',
        alias: 'consumerBadgeDepth',
        initial: 0.08,
        inherits: false,
        affects: ['layout', 'paint'],
        validate: (value) => typeof value === 'number' &&
          Number.isFinite(value) && value > 0 && value <= 1
          ? true
          : 'consumerBadgeDepth must be a finite number greater than 0 and at most 1.',
      }],
      renderers: [{
        id: 'consumer.proof:badge-renderer',
        elements: ['consumer.proof:badge'],
        renderer: ConsumerBadgeRenderer,
      }],
      lifecycle: [{
        id: 'consumer.proof:surface-lifecycle',
        lifecycle: ConsumerBadgeLifecycle,
      }],
    },
  }));
}
