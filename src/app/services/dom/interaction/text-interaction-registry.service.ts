import { Injectable } from '@angular/core';
import { AbstractMesh, Mesh } from '@babylonjs/core';
import { Observable, Subject } from 'rxjs';
import { StyleRule } from '../../../types/style-rule';
import { StoredTextLayoutMetrics } from '../../../types/text-rendering';
import type { CssSize } from '../../coordinate-space.types';

export interface TextInteractionEntry {
  elementId: string;
  mesh: Mesh;
  style?: StyleRule;
  metrics?: StoredTextLayoutMetrics;
  text?: string;
  scrollOffset?: number;
  scrollTop?: number;
  verticalOrigin?: number;
  /** Visible text-plane viewport in CSS pixels. */
  viewportCssSize?: CssSize;
}

export type TextInteractionRegistryEvent =
  | { type: 'register'; entry: TextInteractionEntry }
  | { type: 'metrics'; elementId: string; entry: TextInteractionEntry }
  | { type: 'style'; elementId: string; entry: TextInteractionEntry }
  | { type: 'text'; elementId: string; entry: TextInteractionEntry }
  | { type: 'scroll'; elementId: string; entry: TextInteractionEntry }
  | { type: 'unregister'; elementId: string }
  | { type: 'clear' };

@Injectable({ providedIn: 'root' })
export class TextInteractionRegistryService {
  private entriesByMeshId = new Map<number, TextInteractionEntry>();
  private entriesByElementId = new Map<string, TextInteractionEntry>();
  private readonly eventsSubject = new Subject<TextInteractionRegistryEvent>();

  readonly events$: Observable<TextInteractionRegistryEvent> = this.eventsSubject.asObservable();

  register(
    elementId: string,
    mesh: Mesh,
    style?: StyleRule,
    metrics?: StoredTextLayoutMetrics,
    text?: string,
    scrollOffset?: number,
    scrollTop?: number,
    verticalOrigin?: number,
    viewportCssSize?: CssSize,
  ): TextInteractionEntry {
    // Ensure previous entry for this element is removed so the latest mesh wins
    this.unregisterByElementId(elementId);

    const entry: TextInteractionEntry = {
      elementId, mesh, style, metrics, text, scrollOffset, scrollTop, verticalOrigin,
      viewportCssSize,
    };
    this.entriesByMeshId.set(mesh.uniqueId, entry);
    this.entriesByElementId.set(elementId, entry);

    mesh.metadata = {
      ...(mesh.metadata || {}),
      isTextMesh: true,
      cursor: style?.cursor ?? mesh.metadata?.cursor,
      textInteraction: {
        ...(mesh.metadata?.textInteraction || {}),
        registered: true,
        elementId
      }
    };

    this.eventsSubject.next({ type: 'register', entry });
    return entry;
  }

  updateMetrics(elementId: string, metrics?: StoredTextLayoutMetrics): void {
    const entry = this.entriesByElementId.get(elementId);
    if (!entry) {
      return;
    }
    entry.metrics = metrics;
    this.eventsSubject.next({ type: 'metrics', elementId, entry });
  }

  updateStyle(elementId: string, style?: StyleRule): void {
    const entry = this.entriesByElementId.get(elementId);
    if (!entry) {
      return;
    }
    entry.style = style;
    this.eventsSubject.next({ type: 'style', elementId, entry });
  }

  updateText(elementId: string, text?: string): void {
    const entry = this.entriesByElementId.get(elementId);
    if (!entry) {
      return;
    }
    entry.text = text;
    this.eventsSubject.next({ type: 'text', elementId, entry });
  }

  updateScrollOffset(elementId: string, scrollOffset: number): void {
    const entry = this.entriesByElementId.get(elementId);
    if (!entry) {
      return;
    }
    entry.scrollOffset = scrollOffset;
    this.eventsSubject.next({ type: 'scroll', elementId, entry });
  }

  updateScrollTop(elementId: string, scrollTop: number): void {
    const entry = this.entriesByElementId.get(elementId);
    if (!entry) {
      return;
    }
    entry.scrollTop = scrollTop;
    this.eventsSubject.next({ type: 'scroll', elementId, entry });
  }

  unregister(mesh: AbstractMesh): void {
    const entry = this.entriesByMeshId.get(mesh.uniqueId);
    if (!entry) {
      return;
    }

    this.entriesByMeshId.delete(mesh.uniqueId);
    if (mesh.metadata?.textInteraction) {
      mesh.metadata = {
        ...mesh.metadata,
        textInteraction: {
          ...(mesh.metadata.textInteraction || {}),
          registered: false
        }
      };
    }

    this.entriesByElementId.delete(entry.elementId);
    this.eventsSubject.next({ type: 'unregister', elementId: entry.elementId });
  }

  unregisterByElementId(elementId: string): void {
    const entry = this.entriesByElementId.get(elementId);
    if (!entry) {
      return;
    }

    this.entriesByElementId.delete(elementId);
    this.entriesByMeshId.delete(entry.mesh.uniqueId);
    this.eventsSubject.next({ type: 'unregister', elementId });
  }

  getByMesh(mesh: AbstractMesh): TextInteractionEntry | undefined {
    return this.entriesByMeshId.get(mesh.uniqueId);
  }

  getByElementId(elementId: string): TextInteractionEntry | undefined {
    return this.entriesByElementId.get(elementId);
  }

  clear(): void {
    for (const entry of this.entriesByMeshId.values()) {
      if (entry.mesh.metadata?.textInteraction) {
        entry.mesh.metadata = {
          ...entry.mesh.metadata,
          textInteraction: {
            ...(entry.mesh.metadata.textInteraction || {}),
            registered: false
          }
        };
      }
    }

    this.entriesByMeshId.clear();
    this.entriesByElementId.clear();
    this.eventsSubject.next({ type: 'clear' });
  }

  get size(): number {
    return this.entriesByMeshId.size;
  }

  get entries(): TextInteractionEntry[] {
    return Array.from(this.entriesByElementId.values());
  }
}
