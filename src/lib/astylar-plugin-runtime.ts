import { EnvironmentInjector, Injectable, inject } from '@angular/core';
import type { Mesh } from '@babylonjs/core';
import {
  AstylarCapabilityRegistry,
  type AstylarPluginElementRenderer,
  type AstylarPluginRenderContext,
  type AstylarPluginRendererDefinition,
} from './astylar-plugin';
import {
  AstylarDiagnosticError,
  AstylarDiagnostics,
} from './astylar-diagnostics';

export interface AstylarResolvedPluginRenderer {
  readonly definition: AstylarPluginRendererDefinition;
  readonly renderer: AstylarPluginElementRenderer;
}

/** Surface-owned Angular activation and renderer resolution. */
@Injectable()
export class AstylarPluginRuntime {
  private readonly injector = inject(EnvironmentInjector);
  private readonly registry = inject(AstylarCapabilityRegistry);
  private readonly diagnostics = inject(AstylarDiagnostics);
  private readonly renderers = new Map<string, AstylarPluginElementRenderer>();
  private activated = false;

  get snapshot() {
    return this.registry.snapshot;
  }

  activate(): void {
    if (this.activated) return;
    for (const plugin of this.registry.plugins) {
      for (const contribution of plugin.contributions.lifecycle ?? []) {
        try {
          this.injector.get(contribution.lifecycle).activate?.();
        } catch (error) {
          throw this.failure(
            'plugin-initialization-failed',
            `Plugin lifecycle ${JSON.stringify(contribution.id)} failed to activate.`,
            plugin.id,
            contribution.id,
            error,
          );
        }
      }
    }
    this.activated = true;
  }

  resolveRenderer(elementIdentity: string): AstylarResolvedPluginRenderer | undefined {
    const definition = this.registry.resolveRendererForElement(elementIdentity);
    if (!definition) return undefined;
    let renderer = this.renderers.get(definition.id);
    if (!renderer) {
      const pluginId = pluginIdFromContribution(definition.id);
      try {
        renderer = this.injector.get(definition.renderer);
      } catch (error) {
        throw this.failure(
          'plugin-initialization-failed',
          `Plugin renderer ${JSON.stringify(definition.id)} could not be resolved.`,
          pluginId,
          definition.id,
          error,
        );
      }
      this.renderers.set(definition.id, renderer);
    }
    return { definition, renderer };
  }

  render(
    resolved: AstylarResolvedPluginRenderer,
    context: AstylarPluginRenderContext,
  ): Mesh {
    try {
      return resolved.renderer.render(context);
    } catch (error) {
      throw this.failure(
        'plugin-render-failed',
        `Plugin renderer ${JSON.stringify(resolved.definition.id)} failed while rendering element ${JSON.stringify(context.element.id ?? context.meshId)}.`,
        pluginIdFromContribution(resolved.definition.id),
        resolved.definition.id,
        error,
      );
    }
  }

  private failure(
    code: 'plugin-initialization-failed' | 'plugin-render-failed',
    message: string,
    pluginId: string,
    contributionId: string,
    cause: unknown,
  ): AstylarDiagnosticError {
    const diagnostic = this.diagnostics.report({
      code,
      severity: 'error',
      message: cause instanceof Error ? `${message} ${cause.message}` : message,
      pluginId,
      contributionId,
    });
    return new AstylarDiagnosticError(diagnostic, { cause });
  }
}

function pluginIdFromContribution(contributionId: string): string {
  return contributionId.slice(0, contributionId.indexOf(':'));
}
