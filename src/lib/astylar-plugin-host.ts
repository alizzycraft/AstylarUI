import { DestroyRef, Injectable, inject } from '@angular/core';
import type { AstylarInvalidationReason } from './astylar-render-session';
import {
  AstylarCapabilityRegistry,
  type AstylarPluginAsyncResourceOptions,
  type AstylarPluginInvalidationDomain,
  type AstylarPluginInvalidationRequest,
  type AstylarPluginInvalidationTarget,
  type AstylarPluginResourceOwner,
  type AstylarPluginResourceSnapshot,
  type AstylarPluginResourceSource,
} from './astylar-plugin';
import { AstylarDiagnostics } from './astylar-diagnostics';

type InvalidationHandler = (reason: AstylarInvalidationReason) => Promise<unknown>;

const DOMAIN_ORDER: readonly AstylarPluginInvalidationDomain[] = [
  'layout',
  'paint',
  'semantics',
  'interaction',
];
const DOMAIN_SET = new Set<AstylarPluginInvalidationDomain>(DOMAIN_ORDER);
const MAX_CONSECUTIVE_PLUGIN_REFLOWS = 8;

interface OwnerCounts {
  owners: number;
  resources: number;
  cleanups: number;
  pending: number;
}

/** Surface-scoped implementation behind the curated public plugin facilities. */
@Injectable()
export class AstylarPluginHost {
  private readonly destroyRef = inject(DestroyRef);
  private readonly registry = inject(AstylarCapabilityRegistry);
  private readonly diagnostics = inject(AstylarDiagnostics);
  private readonly counts: OwnerCounts = {
    owners: 0,
    resources: 0,
    cleanups: 0,
    pending: 0,
  };
  private readonly surfaceRoot = new PluginResourceOwner(this, undefined);
  private generation?: PluginResourceOwner;
  private invalidationHandler?: InvalidationHandler;
  private resourceAdopter?: (resource: object) => void;
  private readonly queuedInvalidations = new Map<string, ResolvedInvalidation>();
  private readonly inFlightInvalidations = new Set<string>();
  private readonly recursiveReports = new Set<string>();
  private readonly cycleCounts = new Map<string, number>();
  private renderDepth = 0;
  private disposed = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());
  }

  get resources(): AstylarPluginResourceOwner {
    return this.surfaceRoot;
  }

  get snapshot(): AstylarPluginResourceSnapshot {
    return Object.freeze({ ...this.counts });
  }

  get hasActiveGeneration(): boolean {
    return this.generation?.active ?? false;
  }

  cancelPendingGeneration(): boolean {
    if (!this.generation?.hasPending) return false;
    this.invalidateCurrentGeneration();
    return true;
  }

  createSurfaceOwner(source: AstylarPluginResourceSource): AstylarPluginResourceOwner {
    return this.surfaceRoot.createChild(source);
  }

  beginGeneration(reasons: readonly AstylarInvalidationReason[]): PluginResourceOwner {
    this.noteGenerationReasons(reasons);
    this.generation?.dispose();
    this.generation = this.surfaceRoot.createChild(undefined);
    return this.generation;
  }

  invalidateCurrentGeneration(): void {
    this.generation?.dispose();
    this.generation = undefined;
  }

  createRenderOwner(source: AstylarPluginResourceSource): PluginResourceOwner {
    if (!this.generation?.active) {
      throw new Error('Plugin render resources require an active Astylar render generation.');
    }
    return this.generation.createChild(source);
  }

  enterRenderer(): () => void {
    this.renderDepth += 1;
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.renderDepth = Math.max(0, this.renderDepth - 1);
    };
  }

  bindInvalidation(handler: InvalidationHandler): void {
    if (this.disposed) return;
    this.invalidationHandler = handler;
    const queued = [...this.queuedInvalidations.values()];
    this.queuedInvalidations.clear();
    queued.forEach((request) => this.dispatchInvalidation(request));
  }

  bindResourceAdoption(adopter: (resource: object) => void): void {
    if (!this.disposed) this.resourceAdopter = adopter;
  }

  requestInvalidation(request: AstylarPluginInvalidationRequest): void {
    if (this.disposed) return;
    const resolved = this.resolveInvalidation(request);
    if (!resolved) return;
    this.requestResolvedInvalidation(resolved);
  }

  requestFor(
    source: AstylarPluginResourceSource,
    target: AstylarPluginInvalidationTarget,
  ): void {
    this.requestInvalidation({ ...target, ...source });
  }

  reportAsyncFailure(source: AstylarPluginResourceSource | undefined, error: unknown): void {
    if (this.disposed) return;
    this.diagnostics.report({
      code: 'plugin-async-resource-failed',
      severity: 'error',
      message: `Plugin asynchronous resource initialization failed.${error instanceof Error ? ` ${error.message}` : ''}`,
      pluginId: source?.pluginId,
      contributionId: source?.contributionId,
      value: error instanceof Error ? error.message : error,
    });
  }

  reportCleanupFailure(source: AstylarPluginResourceSource | undefined, error: unknown): void {
    this.diagnostics.report({
      code: 'plugin-resource-cleanup-failed',
      severity: 'error',
      message: `Plugin resource cleanup failed.${error instanceof Error ? ` ${error.message}` : ''}`,
      pluginId: source?.pluginId,
      contributionId: source?.contributionId,
      value: error instanceof Error ? error.message : error,
    });
  }

  resourceOwned(resource: object): void {
    this.resourceAdopter?.(resource);
  }

  ownerAdded(): void { this.counts.owners += 1; }
  ownerRemoved(): void { this.counts.owners = Math.max(0, this.counts.owners - 1); }
  resourceAdded(): void { this.counts.resources += 1; }
  resourceRemoved(): void { this.counts.resources = Math.max(0, this.counts.resources - 1); }
  cleanupAdded(): void { this.counts.cleanups += 1; }
  cleanupRemoved(): void { this.counts.cleanups = Math.max(0, this.counts.cleanups - 1); }
  pendingAdded(): void { this.counts.pending += 1; }
  pendingRemoved(): void { this.counts.pending = Math.max(0, this.counts.pending - 1); }
  resourcesRemovedBy(count: number): void {
    this.counts.resources = Math.max(0, this.counts.resources - count);
  }
  cleanupRemovedBy(count: number): void {
    this.counts.cleanups = Math.max(0, this.counts.cleanups - count);
  }
  pendingRemovedBy(count: number): void {
    this.counts.pending = Math.max(0, this.counts.pending - count);
  }

  private requestResolvedInvalidation(request: ResolvedInvalidation): void {
    if (this.renderDepth > 0) {
      if (!this.recursiveReports.has(request.key)) {
        this.recursiveReports.add(request.key);
        this.diagnostics.report({
          code: 'plugin-invalidation-recursive',
          severity: 'warning',
          message: `Ignored recursive invalidation from plugin ${JSON.stringify(request.pluginId)} during synchronous renderer execution.`,
          pluginId: request.pluginId,
          contributionId: request.contributionId,
        });
      }
      return;
    }
    if ((this.cycleCounts.get(request.key) ?? 0) >= MAX_CONSECUTIVE_PLUGIN_REFLOWS) {
      if (!this.recursiveReports.has(request.key)) {
        this.recursiveReports.add(request.key);
        this.diagnostics.report({
          code: 'plugin-invalidation-recursive',
          severity: 'error',
          message: `Stopped a repeated invalidation loop from plugin ${JSON.stringify(request.pluginId)} after ${MAX_CONSECUTIVE_PLUGIN_REFLOWS} consecutive reflows.`,
          pluginId: request.pluginId,
          contributionId: request.contributionId,
        });
      }
      return;
    }
    if (!this.invalidationHandler) {
      this.queuedInvalidations.set(request.key, request);
      return;
    }
    this.dispatchInvalidation(request);
  }

  private dispatchInvalidation(request: ResolvedInvalidation): void {
    if (this.disposed || this.inFlightInvalidations.has(request.key)) return;
    const handler = this.invalidationHandler;
    if (!handler) return;
    this.inFlightInvalidations.add(request.key);
    let result: Promise<unknown>;
    try {
      result = handler(request.key);
    } catch (error) {
      this.inFlightInvalidations.delete(request.key);
      this.reportInvalidationFailure(request, error);
      return;
    }
    void result.catch((error) => {
      if (!this.disposed) this.reportInvalidationFailure(request, error);
    }).finally(() => this.inFlightInvalidations.delete(request.key));
  }

  private resolveInvalidation(
    request: AstylarPluginInvalidationRequest,
  ): ResolvedInvalidation | undefined {
    const plugin = this.registry.resolvePlugin(request.pluginId);
    if (!plugin || (request.contributionId &&
        !request.contributionId.startsWith(`${request.pluginId}:`))) {
      this.invalidInvalidation(request, 'The plugin or contribution identity is not registered.');
      return undefined;
    }
    const domains = new Set<AstylarPluginInvalidationDomain>();
    for (const domain of request.domains ?? []) {
      if (!DOMAIN_SET.has(domain)) {
        this.invalidInvalidation(request, `Unknown invalidation domain ${JSON.stringify(domain)}.`);
        return undefined;
      }
      domains.add(domain);
    }
    for (const identity of request.properties ?? []) {
      const property = this.registry.resolveProperty(identity);
      if (!property || pluginIdFromContribution(property.id) !== request.pluginId) {
        this.invalidInvalidation(request, `Property ${JSON.stringify(identity)} is not owned by this plugin.`);
        return undefined;
      }
      property.affects.forEach((domain) => domains.add(domain));
    }
    if (domains.size === 0) {
      this.invalidInvalidation(request, 'At least one domain or owned property is required.');
      return undefined;
    }
    const ordered = DOMAIN_ORDER.filter((domain) => domains.has(domain));
    return {
      pluginId: request.pluginId,
      contributionId: request.contributionId,
      domains: ordered,
      key: `plugin:${request.pluginId}:${ordered.join(',')}`,
    };
  }

  private invalidInvalidation(
    request: AstylarPluginInvalidationRequest,
    detail: string,
  ): void {
    this.diagnostics.report({
      code: 'plugin-invalidation-invalid',
      severity: 'error',
      message: `Invalid plugin invalidation request. ${detail}`,
      pluginId: request.pluginId,
      contributionId: request.contributionId,
    });
  }

  private reportInvalidationFailure(request: ResolvedInvalidation, error: unknown): void {
    this.diagnostics.report({
      code: 'plugin-invalidation-failed',
      severity: 'error',
      message: `Invalidation requested by plugin ${JSON.stringify(request.pluginId)} failed.${error instanceof Error ? ` ${error.message}` : ''}`,
      pluginId: request.pluginId,
      contributionId: request.contributionId,
      value: error instanceof Error ? error.message : error,
    });
  }

  private noteGenerationReasons(reasons: readonly AstylarInvalidationReason[]): void {
    const pluginReasons = reasons.filter((reason) => reason.startsWith('plugin:'));
    if (pluginReasons.length !== reasons.length) {
      this.cycleCounts.clear();
      this.recursiveReports.clear();
    }
    for (const reason of pluginReasons) {
      this.cycleCounts.set(reason, (this.cycleCounts.get(reason) ?? 0) + 1);
    }
  }

  private dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.invalidationHandler = undefined;
    this.resourceAdopter = undefined;
    this.queuedInvalidations.clear();
    this.inFlightInvalidations.clear();
    this.surfaceRoot.dispose();
    this.generation = undefined;
  }
}

interface ResolvedInvalidation {
  readonly pluginId: string;
  readonly contributionId?: string;
  readonly domains: readonly AstylarPluginInvalidationDomain[];
  readonly key: AstylarInvalidationReason;
}

class PluginResourceOwner implements AstylarPluginResourceOwner {
  private readonly controller = new AbortController();
  private readonly resources = new Map<object, () => void>();
  private readonly cleanups = new Set<() => void>();
  private readonly pending = new Set<Promise<unknown>>();
  private detachParent?: () => void;
  private disposed = false;

  constructor(
    private readonly host: AstylarPluginHost,
    readonly source: AstylarPluginResourceSource | undefined,
  ) {
    this.host.ownerAdded();
  }

  get signal(): AbortSignal { return this.controller.signal; }
  get active(): boolean { return !this.disposed && !this.signal.aborted; }
  get hasPending(): boolean { return this.pending.size > 0; }

  createChild(source: AstylarPluginResourceSource | undefined): PluginResourceOwner {
    const child = new PluginResourceOwner(this.host, source ?? this.source);
    if (!this.active) {
      child.dispose();
      return child;
    }
    child.detachParent = this.addCleanup(() => child.dispose());
    return child;
  }

  own<T extends object>(resource: T, dispose?: (resource: T) => void): T {
    const cleanup = this.resourceCleanup(resource, dispose);
    if (!this.active) {
      this.runCleanup(cleanup);
      return resource;
    }
    if (this.resources.has(resource)) return resource;
    this.resources.set(resource, cleanup);
    this.host.resourceAdded();
    this.host.resourceOwned(resource);
    return resource;
  }

  addCleanup(cleanup: () => void): () => void {
    if (!this.active) {
      this.runCleanup(cleanup);
      return () => undefined;
    }
    this.cleanups.add(cleanup);
    this.host.cleanupAdded();
    let registered = true;
    return () => {
      if (!registered) return;
      registered = false;
      if (this.cleanups.delete(cleanup)) this.host.cleanupRemoved();
    };
  }

  track<T extends object>(
    work: PromiseLike<T>,
    options: AstylarPluginAsyncResourceOptions<T> = {},
  ): Promise<T | undefined> {
    if (!this.active) {
      void Promise.resolve(work).then((resource) =>
        this.runCleanup(this.resourceCleanup(resource, options.dispose)), () => undefined);
      return Promise.resolve(undefined);
    }
    let abort: (() => void) | undefined;
    let tracked!: Promise<T | undefined>;
    tracked = new Promise<T | undefined>((resolve) => {
      let settled = false;
      const finish = (value: T | undefined) => {
        if (settled) return;
        settled = true;
        if (abort) this.signal.removeEventListener('abort', abort);
        if (this.pending.delete(tracked)) this.host.pendingRemoved();
        resolve(value);
      };
      abort = () => finish(undefined);
      this.signal.addEventListener('abort', abort, { once: true });
      void Promise.resolve(work).then(async (resource) => {
        if (!this.active || settled) {
          try {
            this.runCleanup(this.resourceCleanup(resource, options.dispose));
          } catch (error) {
            this.host.reportAsyncFailure(this.source, error);
          }
          finish(undefined);
          return;
        }
        try {
          this.own(resource, options.dispose);
          await options.onReady?.(resource, this.signal);
          if (!this.active) {
            finish(undefined);
            return;
          }
          if (options.invalidate) this.host.requestFor(this.sourceRequired(), options.invalidate);
          finish(resource);
        } catch (error) {
          this.host.reportAsyncFailure(this.source, error);
          this.dispose();
          finish(undefined);
        }
      }, (error) => {
        if (settled || this.signal.aborted) return;
        this.host.reportAsyncFailure(this.source, error);
        this.dispose();
        finish(undefined);
      });
    });
    this.pending.add(tracked);
    this.host.pendingAdded();
    return tracked;
  }

  async whenSettled(): Promise<void> {
    while (this.active && this.pending.size > 0) {
      await Promise.all([...this.pending]);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.controller.abort();
    this.detachParent?.();
    this.detachParent = undefined;
    this.host.pendingRemovedBy(this.pending.size);
    this.pending.clear();
    for (const cleanup of [...this.cleanups].reverse()) this.runCleanup(cleanup);
    this.host.cleanupRemovedBy(this.cleanups.size);
    this.cleanups.clear();
    for (const cleanup of [...this.resources.values()].reverse()) this.runCleanup(cleanup);
    this.host.resourcesRemovedBy(this.resources.size);
    this.resources.clear();
    this.host.ownerRemoved();
  }

  private sourceRequired(): AstylarPluginResourceSource {
    if (!this.source) {
      throw new Error('Tracked invalidation requires a named plugin resource owner.');
    }
    return this.source;
  }

  private resourceCleanup<T extends object>(
    resource: T,
    dispose?: (resource: T) => void,
  ): () => void {
    if (dispose) return () => dispose(resource);
    const candidate = resource as T & { dispose?: () => void };
    if (typeof candidate.dispose !== 'function') {
      throw new Error('Plugin resources without dispose() require an explicit disposer.');
    }
    return () => candidate.dispose!();
  }

  private runCleanup(cleanup: () => void): void {
    try {
      cleanup();
    } catch (error) {
      this.host.reportCleanupFailure(this.source, error);
    }
  }
}

function pluginIdFromContribution(contributionId: string): string {
  return contributionId.slice(0, contributionId.indexOf(':'));
}
