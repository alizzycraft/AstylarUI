// Passive diagnostic companion to the unchanged public range reproduction.
// Importing the original module mounts exactly its original document. No mesh,
// material, camera, style, event or public update behavior is changed here.
import './range-drag.mjs';
import { EngineStore } from '@babylonjs/core';

const vector = v => v ? { x: v.x, y: v.y, z: v.z } : null;
window.rangePaintInspection = () => {
  const scene = EngineStore.LastCreatedScene;
  if (!scene) return null;
  const active = scene.getActiveMeshes();
  const activeNames = active.data.slice(0, active.length).map(m => m.name);
  return {
    camera: { position: vector(scene.activeCamera.position), mode: scene.activeCamera.mode,
      orthoLeft: scene.activeCamera.orthoLeft, orthoRight: scene.activeCamera.orthoRight,
      orthoTop: scene.activeCamera.orthoTop, orthoBottom: scene.activeCamera.orthoBottom },
    activeNames,
    meshes: scene.meshes.map(mesh => {
      const material = mesh.material, bounds = mesh.getBoundingInfo().boundingBox;
      return { name: mesh.name, parent: mesh.parent?.name ?? null, position: vector(mesh.position),
        absolutePosition: vector(mesh.getAbsolutePosition()), scaling: vector(mesh.scaling),
        isVisible: mesh.isVisible, visibility: mesh.visibility, enabled: mesh.isEnabled(),
        renderingGroupId: mesh.renderingGroupId, alphaIndex: mesh.alphaIndex,
        active: activeNames.includes(mesh.name),
        bounds: { minimumWorld: vector(bounds.minimumWorld), maximumWorld: vector(bounds.maximumWorld) },
        material: material ? { name: material.name, kind: material.getClassName(), alpha: material.alpha,
          disableDepthWrite: material.disableDepthWrite, disableColorWrite: material.disableColorWrite,
          depthFunction: material.depthFunction, needAlphaBlending: material.needAlphaBlending(),
          emissiveColor: material.emissiveColor?.toHexString() ?? null,
          diffuseColor: material.diffuseColor?.toHexString() ?? null } : null };
    }),
  };
};
