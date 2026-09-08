import {
  DestroyRef,
  EnvironmentProviders,
  Injectable,
  InjectionToken,
  inject,
  signal,
} from '@angular/core';
import {
  Color3,
  MeshBuilder,
  StandardMaterial,
  type Mesh,
} from '@babylonjs/core';
import {
  ASTYLAR_PLUGIN_API_VERSION,
  ASTYLAR_PLUGIN_SURFACE_CONTEXT,
  defineAstylarPlugin,
  provideAstylarPlugin,
  type AstylarPluginElementRenderer,
  type AstylarPluginLifecycle,
  type AstylarPluginElementMigrationData,
  type AstylarPluginRenderContext,
  type AstylarPluginStyleMigrationData,
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
  readonly asyncReady = signal(0);
  readonly asyncCancelled = signal(0);
  readonly asyncDisposed = signal(0);
  readonly surface = inject(ASTYLAR_PLUGIN_SURFACE_CONTEXT);
  readonly resources = this.surface.createResourceOwner({
    pluginId: 'consumer.proof',
    contributionId: 'consumer.proof:surface-state',
  });
  private readonly destroyRef = inject(DestroyRef);
  private readonly invalidatedRevisions = new Set<number>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.resources.dispose();
      this.disposed.set(true);
    });
  }

  requestReadyInvalidation(revision: number): boolean {
    if (this.invalidatedRevisions.has(revision)) return false;
    this.invalidatedRevisions.add(revision);
    return true;
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
    const revision = context.element.data?.['revision'];
    const authoredRevision = typeof revision === 'number' ? revision : 0;
    const size = context.coordinates.toRenderSize({
      width: context.dimensions.width,
      height: context.dimensions.height,
    });
    const mesh = MeshBuilder.CreateBox(context.meshId, {
      width: size.width,
      height: size.height,
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
      astylarPluginRevision: authoredRevision,
      astylarPluginCapabilityCount: this.state.surface.capabilities.pluginIds.length,
    };
    void context.resources.track(
      this.createDelayedMaterial(context, authoredRevision),
      {
        dispose: (material) => {
          this.state.asyncDisposed.update((count) => count + 1);
          material.dispose();
        },
        onReady: (material) => {
          this.state.asyncReady.update((count) => count + 1);
          mesh.material = material;
          mesh.metadata = {
            ...mesh.metadata,
            astylarPluginAsyncReady: true,
            astylarPluginAsyncReadyCount: this.state.asyncReady(),
            astylarPluginAsyncCancelledCount: this.state.asyncCancelled(),
            astylarPluginAsyncDisposedCount: this.state.asyncDisposed(),
            astylarPluginReadyRevision: authoredRevision,
          };
          if (this.state.requestReadyInvalidation(authoredRevision)) {
            context.requestInvalidation({ properties: ['consumerBadgeDepth'] });
          }
        },
      },
    );
    return mesh;
  }

  private createDelayedMaterial(
    context: AstylarPluginRenderContext,
    revision: number,
  ): Promise<StandardMaterial> {
    return new Promise((resolve, reject) => {
      const finish = () => {
        context.resources.signal.removeEventListener('abort', abort);
        const material = new StandardMaterial(
          `${context.meshId}-async-material-${revision}`,
          context.scene,
        );
        material.diffuseColor = Color3.FromHexString(revision % 2 ? '#7c3aed' : '#2563eb');
        material.emissiveColor = material.diffuseColor.scale(0.12);
        resolve(material);
      };
      // Keep the synthetic resource pending long enough for the browser
      // acceptance test to replace its revision deterministically, even when
      // the host is under build or shader-compilation load.
      const timer = window.setTimeout(finish, revision >= 5 ? 1200 : 250);
      const abort = () => {
        window.clearTimeout(timer);
        this.state.asyncCancelled.update((count) => count + 1);
        reject(new Error('Consumer delayed material was cancelled.'));
      };
      context.resources.signal.addEventListener('abort', abort, { once: true });
    });
  }
}

function migrateBadgeElement(
  element: AstylarPluginElementMigrationData,
): AstylarPluginElementMigrationData {
  const data = element.data ?? {};
  const { text: legacyText, ...current } = data;
  return {
    type: element.type,
    data: {
      ...current,
      label: current['label'] ?? legacyText ?? 'Migrated consumer badge',
      revision: typeof current['revision'] === 'number' ? current['revision'] : 1,
    },
  };
}

function migrateBadgeStyle(
  style: AstylarPluginStyleMigrationData,
): AstylarPluginStyleMigrationData {
  return {
    selector: style.selector,
    extensions: {
      'consumer.proof:depth': style.extensions['consumer.proof:z-depth'] ?? 0.08,
    },
  };
}

export function provideConsumerBadgePlugin(
  config: ConsumerBadgeConfig,
): EnvironmentProviders {
  return provideAstylarPlugin(defineAstylarPlugin({
    id: 'consumer.proof',
    version: '1.0.0',
    pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
    astylarVersionRange: '^0.2.0',
    documentSchemaVersion: 2,
    dependencies: [{ id: 'astylar.core', versionRange: '^1.0.0' }],
    contributes: ['elements', 'properties', 'renderers', 'lifecycle', 'migrations'],
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
          const data = element['data'] as { label?: unknown; revision?: unknown } | undefined;
          return typeof data?.label === 'string' && data.label.trim().length > 0 &&
            typeof data.revision === 'number' && Number.isInteger(data.revision)
            ? true
            : 'consumer-badge requires a non-empty data.label and integer data.revision.';
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
      migrations: [{
        id: 'consumer.proof:v1-to-v2',
        fromSchemaVersion: 1,
        toSchemaVersion: 2,
        migrateElement: migrateBadgeElement,
        migrateStyle: migrateBadgeStyle,
      }],
    },
  }));
}
