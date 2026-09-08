import {
  Color3,
  Mesh,
  Scene,
  StandardMaterial,
  Texture,
} from "@babylonjs/core";
import { DOMElement } from "../../../types/dom-element";
import { StyleRule } from "../../../types/style-rule";
import type {
  CssPoint,
  CssSize,
  RenderPoint,
  RenderSize,
} from "../../coordinate-space.types";

export interface GradientStop {
  offset: number;
  color: Color3;
  alpha: number;
}

export interface LinearGradientDefinition {
  type: "linear";
  angle: number; // Degrees, 0deg points to the right
  stops: GradientStop[];
}

export type ParsedBackground =
  | { type: "color"; color: Color3; alpha?: number }
  | { type: "gradient"; gradient: LinearGradientDefinition; alpha?: number };

export interface BorderWidthBox {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type BorderWidths = number | BorderWidthBox;

export interface BoxShadowLayer {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
}

export interface MeshActions {
  createPolygon: (
    name: string,
    polygonType: string,
    width: number,
    height: number,
    borderRadius: number,
  ) => Mesh;
  createPlane: (name: string, width: number, height: number) => Mesh;
  createTextMaterial: (name: string, texture: Texture) => StandardMaterial;
  createMaterial: (
    name: string,
    color: Color3,
    alpha?: number,
  ) => StandardMaterial;
  createGradientMaterial: (
    name: string,
    gradientData: LinearGradientDefinition,
    opacity: number,
    width: number,
    height: number,
  ) => StandardMaterial;
  createShadow: (
    name: string,
    width: number,
    height: number,
    layers: readonly BoxShadowLayer[],
    polygonType: string,
    borderRadius: number,
  ) => Mesh;
  createTextMesh: (
    name: string,
    texture: Texture,
    width: number,
    height: number,
  ) => Mesh;
  createBorderMesh: (
    name: string,
    elementWidth: number,
    elementHeight: number,
    borderWidth: BorderWidths,
    borderRadius?: number,
  ) => Mesh[];
  createPolygonBorder: (
    name: string,
    polygonType: string,
    width: number,
    height: number,
    borderWidth: BorderWidths,
    borderRadius?: number,
  ) => Mesh[];
  updateTextMesh: (
    textMesh: Mesh,
    newTexture: Texture,
    newWidth?: number,
    newHeight?: number,
  ) => void;
  updateTextMeshMaterial: (
    textMesh: Mesh,
    opacity?: number,
    color?: Color3,
  ) => void;
  updateMeshWithBorderRadius: (
    mesh: Mesh | string,
    polygonType: string,
    width: number,
    height: number,
    borderRadius: number,
    borderWidth?: BorderWidths,
  ) => void;
  updateMeshBorderRadius: (
    mesh: Mesh,
    width: number,
    height: number,
    borderRadius: number,
  ) => void;
  createMeshWithBorderRadius: (
    originalMesh: Mesh,
    width: number,
    height: number,
    borderRadius: number,
  ) => Mesh;
  positionTextMesh: (textMesh: Mesh, x: number, y: number, z: number) => void;
  parentTextMesh: (textMesh: Mesh, parentMesh: Mesh) => void;
  createPolygonVertexData: (
    polygonType: string,
    width: number,
    height: number,
    borderRadius: number,
  ) => any;
  generatePolygonVertexData: (
    polygonType: string,
    width: number,
    height: number,
    borderRadius: number,
  ) => any;
  positionBorderFrames: (
    borders: Mesh[],
    centerX: number,
    centerY: number,
    centerZ: number,
    elementWidth: number,
    elementHeight: number,
    borderWidth: BorderWidths,
  ) => void;
}

export interface StyleActions {
  findStyleBySelector: (
    selector: string,
    styles: StyleRule[],
  ) => StyleRule | undefined;
  findStyleForElement: (
    element: DOMElement,
    styles: StyleRule[],
    elementStyles?: Map<string, { normal: StyleRule; hover?: StyleRule }>,
  ) => StyleRule | undefined;
  parseBackgroundColor: (background?: string) => ParsedBackground | null;
  parseOpacity: (opacityValue: string | undefined) => number;
  getElementTypeDefaults: (elementType: string) => Partial<StyleRule>;
  parseAlignContent: (value: string | undefined) => string;
  parseFlexGrow: (value: string | undefined) => number;
  parseFlexShrink: (value: string | undefined) => number;
  parseFlexBasis: (value: string | undefined) => string;
  parseFlexShorthand: (value: string | undefined) => {
    flexGrow: number;
    flexShrink: number;
    flexBasis: string;
  };
  parseAlignSelf: (value: string | undefined) => string;
  parseOrder: (value: string | undefined) => number;
}

export interface CameraActions {
  calculateViewportDimensions: () => { width: number; height: number };
  getPixelToWorldScale: () => number;
  projectCssLocalPoint: (point: CssPoint, renderDepth?: number) => RenderPoint;
  unprojectRenderLocalPoint: (point: RenderPoint) => CssPoint;
  projectCssSize: (size: CssSize) => RenderSize;
}

export interface TextureActions {
  getTexture: (url: string, scene: Scene) => Promise<Texture>;
}

export interface BabylonRenderActions {
  mesh: MeshActions;
  style: StyleActions;
  camera: CameraActions;
  texture: TextureActions;
}

export interface BabylonRender {
  actions: BabylonRenderActions;
  scene: Scene | undefined;
}
