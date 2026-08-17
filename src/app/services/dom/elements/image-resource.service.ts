import { Injectable } from '@angular/core';
import { RawTexture, Scene, Texture } from '@babylonjs/core';

export interface ImageNaturalSize {
  width: number;
  height: number;
}

export interface ImageResourceEvent {
  scene: Scene;
  source: string;
  status: 'loaded' | 'error';
  naturalSize?: ImageNaturalSize;
}

interface ImageResourceEntry {
  texture: Texture;
  status: 'loading' | 'loaded' | 'error';
}

/**
 * Owns image textures and natural-size metadata independently from a layout
 * pass. A scene can therefore rebuild after an asynchronous image load without
 * starting the request again, while replaced sources are disposed promptly.
 */
@Injectable({ providedIn: 'root' })
export class ImageResourceService {
  private readonly sceneEntries = new WeakMap<Scene, Map<string, ImageResourceEntry>>();
  private readonly naturalSizes = new Map<string, ImageNaturalSize>();
  private readonly listeners = new Set<(event: ImageResourceEvent) => void>();

  getTexture(source: string, scene: Scene): Texture {
    const entries = this.entriesFor(scene);
    const existing = entries.get(source);
    if (existing) return existing.texture;

    let entry: ImageResourceEntry;
    const texture = new Texture(
      source,
      scene,
      false,
      true,
      Texture.TRILINEAR_SAMPLINGMODE,
      undefined,
      () => queueMicrotask(() => this.recordError(scene, source, entry)),
    );
    entry = { texture, status: 'loading' };
    entries.set(source, entry);

    const loaded = () => this.recordLoaded(scene, source, entry);
    texture.onLoadObservable.addOnce(loaded);
    if (texture.isReady()) loaded();
    return texture;
  }

  getNaturalSize(source: string | undefined): ImageNaturalSize | undefined {
    return source ? this.naturalSizes.get(source) : undefined;
  }

  getSceneTextures(scene: Scene): ReadonlySet<Texture> {
    return new Set(
      [...(this.sceneEntries.get(scene)?.values() ?? [])].map((entry) => entry.texture),
    );
  }

  subscribe(listener: (event: ImageResourceEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Retains exactly the image sources referenced by the current site data. */
  retain(scene: Scene, sources: ReadonlySet<string>): void {
    const entries = this.sceneEntries.get(scene);
    if (!entries) return;
    for (const [source, entry] of entries) {
      if (sources.has(source)) continue;
      entries.delete(source);
      entry.texture.dispose();
    }
  }

  disposeScene(scene: Scene): void {
    const entries = this.sceneEntries.get(scene);
    if (!entries) return;
    for (const entry of entries.values()) entry.texture.dispose();
    entries.clear();
    this.sceneEntries.delete(scene);
  }

  private entriesFor(scene: Scene): Map<string, ImageResourceEntry> {
    let entries = this.sceneEntries.get(scene);
    if (!entries) {
      entries = new Map();
      this.sceneEntries.set(scene, entries);
    }
    return entries;
  }

  private recordLoaded(scene: Scene, source: string, entry: ImageResourceEntry): void {
    if (!this.isCurrent(scene, source, entry) || entry.status !== 'loading') return;
    const size = entry.texture.getSize();
    if (size.width <= 0 || size.height <= 0) {
      this.recordError(scene, source, entry);
      return;
    }

    entry.status = 'loaded';
    const naturalSize = { width: size.width, height: size.height };
    this.naturalSizes.set(source, naturalSize);
    this.emit({ scene, source, status: 'loaded', naturalSize });
  }

  private recordError(scene: Scene, source: string, entry: ImageResourceEntry): void {
    if (!this.isCurrent(scene, source, entry) || entry.status !== 'loading') return;
    const failedTexture = entry.texture;
    entry.texture = RawTexture.CreateRGBATexture(
      new Uint8Array([0, 0, 0, 0]),
      1,
      1,
      scene,
    );
    entry.texture.hasAlpha = true;
    entry.status = 'error';
    failedTexture.dispose();
    this.emit({ scene, source, status: 'error' });
  }

  private isCurrent(scene: Scene, source: string, entry: ImageResourceEntry): boolean {
    return this.sceneEntries.get(scene)?.get(source) === entry;
  }

  private emit(event: ImageResourceEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
