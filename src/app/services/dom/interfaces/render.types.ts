import { Color3, Mesh, Scene, StandardMaterial, Texture } from "@babylonjs/core";
import { DOMElement } from "../../../types/dom-element";
import { StyleRule } from "../../../types/style-rule";

export interface GradientStop {
    offset: number;
    color: Color3;
    alpha: number;
}

export interface LinearGradientDefinition {
    type: 'linear';
    angle: number; // Degrees, 0deg points to the right
    stops: GradientStop[];
}

export type ParsedBackground =
    | { type: 'color'; color: Color3; alpha?: number }
    | { type: 'gradient'; gradient: LinearGradientDefinition; alpha?: number };

export interface MeshActions {
    createPolygon: (name: string, polygonType: string, width: number, height: number, borderRadius: number) => Mesh;
    createPlane: (name: string, width: number, height: number) => Mesh;
    createMaterial: (name: string, diffuseColor: Color3, emissiveColor?: Color3, opacity?: number) => StandardMaterial;
    createGradientMaterial: (name: string, gradientData: LinearGradientDefinition, opacity: number, width: number, height: number) => StandardMaterial;
    createShadow: (...args: any[]) => Mesh;
    createPolygonBorder: (...args: any[]) => Mesh[];
    positionMesh: (mesh: Mesh, x: number, y: number, z: number) => void;
    parentMesh: (child: Mesh, parent: Mesh) => void;
    generatePolygonVertexData: (polygonType: string, width: number, height: number, borderRadius: number) => any;
    updatePolygon: (mesh: Mesh, polygonType: string, width: number, height: number, borderRadius: number) => void;
    updateMeshBorderRadius: (mesh: Mesh, width: number, height: number, borderRadius: number) => void;
    createMeshWithBorderRadius: (originalMesh: Mesh, width: number, height: number, borderRadius: number) => Mesh;
    createBorderMesh: (name: string, elementWidth: number, elementHeight: number, borderWidth: number, borderRadius?: number) => Mesh[];
    positionBorderFrames: (borders: Mesh[], centerX: number, centerY: number, centerZ: number, elementWidth: number, elementHeight: number, borderWidth: number) => void;
}

export interface StyleActions {
    findStyleBySelector: (selector: string, styles: StyleRule[]) => StyleRule | undefined;
    findStyleForElement: (element: DOMElement, styles: StyleRule[], elementStyles?: Map<string, { normal: StyleRule, hover?: StyleRule }>) => StyleRule | undefined;
    parseBackgroundColor: (background?: string) => ParsedBackground | null;
    parseOpacity: (opacityValue: string | undefined) => number;
    getElementTypeDefaults: (elementType: string) => Partial<StyleRule>;
    parseAlignContent: (value: string | undefined) => string;
    parseFlexGrow: (value: string | undefined) => number;
    parseFlexShrink: (value: string | undefined) => number;
    parseFlexBasis: (value: string | undefined) => string;
    parseFlexShorthand: (value: string | undefined) => { flexGrow: number; flexShrink: number; flexBasis: string };
    parseAlignSelf: (value: string | undefined) => string;
    parseOrder: (value: string | undefined) => number;
}

export interface CameraActions {
    calculateViewportDimensions: () => { width: number; height: number };
    getPixelToWorldScale: () => number;
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