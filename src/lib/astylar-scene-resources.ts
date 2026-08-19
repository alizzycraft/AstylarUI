import type { AbstractMesh, BaseTexture, Material, Scene } from '@babylonjs/core';

export interface AstylarSceneResourceSnapshot {
  meshes: number;
  materials: number;
  textures: number;
}

/** Tracks only resources created while rebuilding the Astylar DOM. */
export class AstylarSceneResources {
  private meshes = new Set<AbstractMesh>();
  private materials = new Set<Material>();
  private textures = new Set<BaseTexture>();

  constructor(private readonly scene: Scene) {}

  get snapshot(): AstylarSceneResourceSnapshot {
    return {
      meshes: this.countPresent(this.meshes, this.scene.meshes),
      materials: this.countPresent(this.materials, this.scene.materials),
      textures: this.countPresent(this.textures, this.scene.textures),
    };
  }

  replace(render: () => void, retainedTextures: ReadonlySet<BaseTexture> = new Set()): void {
    this.clearMeshes();
    this.clearMaterials();
    this.clearTextures(retainedTextures);
    const existingMeshes = new Set(this.scene.meshes);
    const existingMaterials = new Set(this.scene.materials);
    const existingTextures = new Set(this.scene.textures);
    try {
      render();
    } finally {
      this.meshes = new Set(this.scene.meshes.filter((item) => !existingMeshes.has(item)));
      this.materials = new Set(
        this.scene.materials.filter((item) => !existingMaterials.has(item))
      );
      this.textures = new Set([
        ...[...retainedTextures].filter((item) => this.scene.textures.includes(item)),
        ...this.scene.textures.filter((item) => !existingTextures.has(item)),
      ]);
    }
  }

  /** Temporarily releases meshes that an incremental reconciliation will retain. */
  releaseMeshes(meshes: Iterable<AbstractMesh>): void {
    for (const mesh of meshes) this.meshes.delete(mesh);
  }

  /** Re-adopts retained meshes so final session disposal still owns them. */
  adoptMeshes(meshes: Iterable<AbstractMesh>): void {
    for (const mesh of meshes) {
      if (this.scene.meshes.includes(mesh)) this.meshes.add(mesh);
    }
  }

  dispose(): void {
    this.clear();
  }

  private clear(): void {
    this.clearMeshes();
    this.clearMaterials();
    this.clearTextures();
  }

  private clearMeshes(): void {
    for (const mesh of this.meshes) {
      if (!mesh.isDisposed()) mesh.dispose(false, false);
    }
    this.meshes.clear();
  }

  private clearMaterials(): void {
    for (const material of this.materials) {
      if (this.isLive(material)) material.dispose(true, false);
    }
    this.materials.clear();
  }

  private clearTextures(retainedTextures: ReadonlySet<BaseTexture> = new Set()): void {
    for (const texture of this.textures) {
      if (!retainedTextures.has(texture) && this.isLive(texture)) texture.dispose();
    }
    this.textures = new Set(
      [...retainedTextures].filter((item) => this.scene.textures.includes(item)),
    );
  }

  private countPresent<T>(items: Set<T>, sceneItems: readonly T[]): number {
    const present = new Set(sceneItems);
    return [...items].filter((item) => present.has(item)).length;
  }

  private isLive<T>(item: T): boolean {
    const candidate = item as T & { isDisposed?: boolean | (() => boolean) };
    return typeof candidate.isDisposed === 'function'
      ? !candidate.isDisposed()
      : !candidate.isDisposed;
  }
}
