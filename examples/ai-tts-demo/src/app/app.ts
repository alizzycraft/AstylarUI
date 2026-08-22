import { isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, NgZone, PLATFORM_ID, signal } from '@angular/core';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import {
  AstylarSurfaceComponent,
  type AstylarEvent,
  type AstylarRenderOptions,
  type AstylarSurface,
} from 'astylarui';
import { TtsDemoStore } from './speech/tts-demo.store';
import { buildTtsDemoSite } from './ui/tts-demo-site';

@Component({
  selector: 'app-root',
  imports: [AstylarSurfaceComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly store = inject(TtsDemoStore);
  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly benchmarkState = isPlatformBrowser(this.platformId)
    ? new URLSearchParams(window.location.search).get('parityState')
    : null;

  protected readonly siteData = computed(() => {
    const view = this.store.viewModel();
    if (this.benchmarkState !== 'generated') return buildTtsDemoSite(view);
    return buildTtsDemoSite({
      ...view,
      progressPercent: 100,
      history: view.history.map((item) => ({ ...item, sizeLabel: '7.5 KB' })),
    });
  });
  protected readonly status = signal('Starting the AstylarUI renderer…');
  private readonly benchmarkEvents: Array<{ type: string; targetId: string }> = [];
  protected readonly options: AstylarRenderOptions = {
    events: {
      onEvent: (event) => {
        if (this.benchmarkState) {
          this.benchmarkEvents.push({ type: event.type, targetId: event.targetId });
        }
      },
      handlers: {
        'tts-app': {
          input: (event) => this.zone.run(() => this.handleEvent(event)),
          change: (event) => this.zone.run(() => this.handleEvent(event)),
          click: (event) => this.zone.run(() => this.handleEvent(event)),
        },
      },
    },
  };

  constructor() {
    if (this.benchmarkState === 'initial') {
      this.store.setTitle('');
      this.store.setText('');
      this.store.setInstructions('');
    } else if (this.benchmarkState === 'generated') {
      this.store.setTitle('');
      this.store.setText('hello');
      this.store.setInstructions('');
    }
  }

  protected async onMounted(surface: AstylarSurface): Promise<void> {
    if (this.benchmarkState === 'generated' && this.store.generations().length === 0) {
      await this.store.generate();
      await surface.whenSettled();
    }
    if (this.benchmarkState) this.installBenchmarkHook(surface);
    this.status.set('AstylarUI renderer ready.');
  }

  protected onFailed(error: unknown): void {
    this.status.set(`Renderer error: ${error instanceof Error ? error.message : String(error)}`);
  }

  private handleEvent(event: AstylarEvent): void {
    if (event.type === 'input') {
      const value = event.value ?? '';
      if (event.targetId === 'generation-title') this.store.setTitle(value);
      if (event.targetId === 'speech-text') this.store.setText(value);
      if (event.targetId === 'instructions') this.store.setInstructions(value);
      if (event.targetId === 'history-search') this.store.setHistoryQuery(value);
      return;
    }
    if (event.type === 'change' && event.targetId === 'voice') {
      this.store.setVoice(event.selectedValue ?? event.value ?? '');
      return;
    }
    if (event.type !== 'click') return;
    if (event.targetId === 'generate-speech') void this.store.generate();
    if (event.targetId === 'cancel-speech') this.store.cancelGeneration();
    if (event.targetId === 'clear-history') this.store.clearHistory();
    if (event.targetId === 'storage-summary') this.store.toggleStorageDisclosure();
    if (event.targetId === 'selected-play' && this.store.selectedGenerationId()) {
      void this.store.togglePlayback(this.store.selectedGenerationId()!);
    }
    if (event.targetId === 'selected-restart') void this.store.restartSelected();
    if (event.targetId === 'selected-download' && this.store.selectedGenerationId()) {
      this.store.downloadGeneration(this.store.selectedGenerationId()!);
    }
    const historyCard = /^history-(speech-\d+)$/.exec(event.targetId);
    if (historyCard) this.store.selectGeneration(historyCard[1]);

    const historyAction = /^history-(speech-\d+)-(select|play|download|delete)$/.exec(event.targetId);
    if (historyAction?.[2] === 'select') this.store.selectGeneration(historyAction[1]);
    if (historyAction?.[2] === 'play') void this.store.togglePlayback(historyAction[1]);
    if (historyAction?.[2] === 'download') this.store.downloadGeneration(historyAction[1]);
    if (historyAction?.[2] === 'delete') this.store.deleteGeneration(historyAction[1]);
  }

  private installBenchmarkHook(surface: AstylarSurface): void {
    const canvas = surface.scene.getEngine().getRenderingCanvas();
    if (!canvas) return;
    let lastPointerPick: unknown;
    surface.scene.onPointerObservable.add((pointerInfo) => {
      const event = pointerInfo.event as PointerEvent | MouseEvent | undefined;
      lastPointerPick = {
        type: pointerInfo.type,
        mesh: pointerInfo.pickInfo?.pickedMesh?.name,
        elementId: pointerInfo.pickInfo?.pickedMesh?.metadata?.elementId,
        clientX: event?.clientX,
        clientY: event?.clientY,
        offsetX: event?.offsetX,
        offsetY: event?.offsetY,
        sceneX: surface.scene.pointerX,
        sceneY: surface.scene.pointerY,
        skipPointerMovePicking: surface.scene.skipPointerMovePicking,
        point: pointerInfo.pickInfo?.pickedPoint ? {
          x: pointerInfo.pickInfo.pickedPoint.x,
          y: pointerInfo.pickInfo.pickedPoint.y,
          z: pointerInfo.pickInfo.pickedPoint.z,
        } : undefined,
      };
    });
    window.__ASTYLAR_TTS_BENCHMARK__ = {
      state: this.benchmarkState ?? 'interactive',
      measure: (ids: string[]) => {
        const projectBox = (id: string) => {
          const meshes = surface.scene.meshes.filter((mesh) => mesh.metadata?.elementId === id);
          const mesh = meshes.find((candidate) => candidate.name === id) ?? meshes[0];
          if (!mesh) return undefined;
          mesh.computeWorldMatrix(true);
          const engine = surface.scene.getEngine();
          const camera = surface.scene.activeCamera;
          if (!camera) return undefined;
          const renderViewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
          const projected = mesh.getBoundingInfo().boundingBox.vectorsWorld.map((point) =>
            Vector3.Project(point, Matrix.IdentityReadOnly, surface.scene.getTransformMatrix(), renderViewport));
          const scaleX = canvas.clientWidth / engine.getRenderWidth();
          const scaleY = canvas.clientHeight / engine.getRenderHeight();
          const left = Math.min(...projected.map((point) => point.x)) * scaleX;
          const right = Math.max(...projected.map((point) => point.x)) * scaleX;
          const top = Math.min(...projected.map((point) => point.y)) * scaleY;
          const bottom = Math.max(...projected.map((point) => point.y)) * scaleY;
          return { left, top, right, bottom, width: right - left, height: bottom - top };
        };
        const intersect = (
          first: { left: number; top: number; right: number; bottom: number },
          second: { left: number; top: number; right: number; bottom: number },
        ) => ({
          left: Math.max(first.left, second.left),
          top: Math.max(first.top, second.top),
          right: Math.min(first.right, second.right),
          bottom: Math.min(first.bottom, second.bottom),
        });
        const capture = { left: 0, top: 0, right: canvas.clientWidth, bottom: canvas.clientHeight };
        const elements = Object.fromEntries(ids.map((id) => {
          const borderBox = projectBox(id);
          if (!borderBox) return [id, { exists: false }];
          let visible = intersect(borderBox, capture);
          const clippingAncestorIds: string[] = [];
          for (const ancestorId of this.clippingAncestorIds(id)) {
            const ancestorBox = projectBox(ancestorId);
            if (!ancestorBox) continue;
            const before = visible;
            const next = intersect(visible, ancestorBox);
            if (next.right <= next.left || next.bottom <= next.top ||
                next.right - next.left < before.right - before.left ||
                next.bottom - next.top < before.bottom - before.top) {
              clippingAncestorIds.push(ancestorId);
            }
            visible = next;
          }
          const intersectsViewport = visible.right > visible.left && visible.bottom > visible.top;
          const epsilon = 0.15;
          const fullyVisible = intersectsViewport &&
            Math.abs(visible.left - borderBox.left) <= epsilon &&
            Math.abs(visible.top - borderBox.top) <= epsilon &&
            Math.abs(visible.right - borderBox.right) <= epsilon &&
            Math.abs(visible.bottom - borderBox.bottom) <= epsilon;
          const semantic = document.querySelector<HTMLElement>(
            `[data-astylar-id="${CSS.escape(id)}"]`,
          );
          const rawText = semantic instanceof HTMLInputElement ||
            semantic instanceof HTMLTextAreaElement || semantic instanceof HTMLSelectElement
            ? semantic.value
            : semantic?.textContent;
          return [id, {
            exists: true,
            borderBox,
            text: rawText?.replace(/\s+/g, ' ').trim(),
            visibility: {
              exists: true,
              intersectsViewport,
              fullyVisible,
              clipped: !fullyVisible,
              clippingAncestorIds,
            },
          }];
        }));
        const scrolling = surface.diagnostics.scrolling?.containers ?? {};
        const controlStates = Object.fromEntries(ids.flatMap((id) => {
          const semantic = document.querySelector<HTMLElement>(
            `[data-astylar-id="${CSS.escape(id)}"]`,
          );
          if (!(semantic instanceof HTMLInputElement || semantic instanceof HTMLTextAreaElement ||
              semantic instanceof HTMLSelectElement)) return [];
          // Read the owned caret material independently of its blink phase.
          const cursor = surface.scene.meshes.find((mesh) =>
            mesh.name === `cursor_input_${id}`);
          const cursorMaterial = cursor?.material;
          const caretColor = cursorMaterial && 'emissiveColor' in cursorMaterial
            ? (cursorMaterial.emissiveColor as { toHexString(): string }).toHexString().toLowerCase()
            : undefined;
          return [[id, {
            value: semantic.value,
            focused: document.activeElement === semantic,
            selectionStart: 'selectionStart' in semantic ? semantic.selectionStart : null,
            selectionEnd: 'selectionEnd' in semantic ? semantic.selectionEnd : null,
            selectionDirection: 'selectionDirection' in semantic ? semantic.selectionDirection : null,
            selectedIndex: semantic instanceof HTMLSelectElement ? semantic.selectedIndex : null,
            expanded: semantic.getAttribute('aria-expanded') === 'true',
            caretColor,
          }]];
        }));
        const centerPicks = Object.fromEntries(ids.flatMap((id) => {
          const box = (elements[id] as { borderBox?: {
            left: number; top: number; right: number; bottom: number;
          } } | undefined)?.borderBox;
          if (!box) return [];
          const hits = surface.scene.multiPick(
            (box.left + box.right) / 2,
            (box.top + box.bottom) / 2,
          ) ?? [];
          return [[id, hits.filter((hit) => hit.hit).map((hit) => ({
            mesh: hit.pickedMesh?.name,
            elementId: hit.pickedMesh?.metadata?.elementId,
            distance: hit.distance,
            point: hit.pickedPoint ? {
              x: hit.pickedPoint.x,
              y: hit.pickedPoint.y,
              z: hit.pickedPoint.z,
            } : undefined,
          }))]];
        }));
        const clippingBounds = Object.fromEntries(ids.flatMap((id) => {
          const ancestors = this.clippingAncestorIds(id);
          if (!ancestors.length) return [];
          return [[id, Object.fromEntries(ancestors.flatMap((ancestorId) => {
            const mesh = surface.scene.meshes.find((candidate) =>
              candidate.metadata?.elementId === ancestorId && candidate.name === ancestorId,
            );
            if (!mesh) return [];
            mesh.computeWorldMatrix(true);
            const bounds = mesh.getBoundingInfo().boundingBox;
            return [[ancestorId, {
              minimum: {
                x: bounds.minimumWorld.x,
                y: bounds.minimumWorld.y,
                z: bounds.minimumWorld.z,
              },
              maximum: {
                x: bounds.maximumWorld.x,
                y: bounds.maximumWorld.y,
                z: bounds.maximumWorld.z,
              },
            }]];
          }))]];
        }));
        const diagnostics = surface.diagnostics;
        const resolvedStyles = Object.fromEntries(ids.flatMap((id) => {
          const meshes = surface.scene.meshes.filter((candidate) => candidate.metadata?.elementId === id);
          const mesh = meshes.find((candidate) => candidate.name === id) ?? meshes[0];
          const style = mesh?.metadata?.astylarResolvedInteractionStyle;
          return style && typeof style === 'object' ? [[id, { ...style }]] : [];
        }));
        return {
          elements,
          visibleFocusIndicators: surface.scene.meshes
            .filter((mesh) => mesh.name.startsWith('focusIndicator_') && mesh.isVisible)
            .map((mesh) => ({
              name: mesh.name,
              borderRadiusPx: mesh.metadata?.focusBorderRadiusPx,
              outerBorderRadiusPx: mesh.metadata?.focusOuterBorderRadiusPx,
              kind: mesh.metadata?.focusIndicatorKind,
              color: mesh.material && 'emissiveColor' in mesh.material
                ? (mesh.material.emissiveColor as { toHexString(): string }).toHexString().toLowerCase()
                : undefined,
              alpha: mesh.material?.alpha,
            })),
          selectionHighlights: surface.scene.meshes
            .filter((mesh) => mesh.isVisible && mesh.metadata?.highlight)
            .map((mesh) => ({ ...mesh.metadata.highlight })),
          scrolling: Object.fromEntries(Object.entries(scrolling).map(([id, value]) => [id, {
            ...value,
            initialScrollLeft: 0,
            initialScrollTop: 0,
            maxScrollLeft: Math.max(0, value.scrollWidth - value.clientWidth),
            maxScrollTop: Math.max(0, value.scrollHeight - value.clientHeight),
            canReachRight: value.scrollLeft >= value.scrollWidth - value.clientWidth - 1,
            canReachBottom: value.scrollTop >= value.scrollHeight - value.clientHeight - 1,
          }])),
          settlement: surface.diagnostics.session,
          diagnostics: diagnostics.messages,
          interaction: diagnostics.interaction,
          resources: diagnostics.resources,
          pluginResources: diagnostics.pluginResources,
          semantics: diagnostics.semantics,
          controlStates,
          resolvedStyles,
          events: [...this.benchmarkEvents],
          centerPicks,
          clippingBounds,
          lastPointerPick,
          canvas: {
            width: canvas.clientWidth,
            height: canvas.clientHeight,
            cursor: getComputedStyle(canvas).cursor,
          },
        };
      },
    };
  }

  private clippingAncestorIds(targetId: string): string[] {
    const site = this.siteData();
    const visit = (element: typeof site.root.children[number], ancestors: string[]): string[] | undefined => {
      if (element.id === targetId) return ancestors;
      const rule = element.id ? site.styles.find((candidate) => candidate.selector === `#${element.id}`) : undefined;
      const next = element.id && ['hidden', 'clip', 'auto', 'scroll'].includes(rule?.overflow ?? '')
        ? [...ancestors, element.id]
        : ancestors;
      for (const child of element.children ?? []) {
        const found = visit(child, next);
        if (found) return found;
      }
      return undefined;
    };
    for (const root of site.root.children) {
      const found = visit(root, []);
      if (found) return found;
    }
    return [];
  }
}

declare global {
  interface Window {
    __ASTYLAR_TTS_BENCHMARK__?: {
      state: string;
      measure(ids: string[]): unknown;
    };
  }
}
