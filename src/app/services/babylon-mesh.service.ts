import { Injectable } from "@angular/core";
import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Vector2,
  Mesh,
  Material,
  VertexData,
  PolygonMeshBuilder,
  DynamicTexture,
  ShaderMaterial,
  Effect,
  Texture,
} from "@babylonjs/core";
import {
  BorderWidthBox,
  BorderWidths,
  BoxShadowLayer,
  GradientStop,
  LinearGradientDefinition,
} from "./dom/interfaces/render.types";

import { BabylonCameraService } from "./babylon-camera.service";
import { CoordinateTransformService } from "./coordinate-transform.service";
import roundPolygon, { getSegments } from "round-polygon";

@Injectable({
  providedIn: "root",
})
export class BabylonMeshService {
  private scene?: Scene;
  private cameraService?: BabylonCameraService;
  private coordinateTransform: CoordinateTransformService;

  constructor() {
    this.coordinateTransform = new CoordinateTransformService();
  }

  initialize(scene: Scene, cameraService?: BabylonCameraService): void {
    this.scene = scene;
    this.cameraService = cameraService;
  }

  createPlane(name: string, width: number, height: number): Mesh {
    if (!this.scene) {
      throw new Error("Mesh service not initialized");
    }
    const scene = this.scene;

    return MeshBuilder.CreatePlane(
      name,
      {
        width: width,
        height: height,
      },
      scene,
    );
  }

  private parseCssColor(colorInput: string | undefined): {
    color: Color3;
    alpha: number;
  } {
    if (!colorInput) {
      return { color: new Color3(0, 0, 0), alpha: 1 };
    }

    const trimmed = colorInput.trim();

    const rgbaMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbaMatch) {
      const parts = rgbaMatch[1].split(",").map((part) => part.trim());
      if (parts.length >= 3) {
        const channelFromString = (value: string): number => {
          if (value.endsWith("%")) {
            const percent = parseFloat(value);
            return Number.isNaN(percent)
              ? 0
              : Math.max(0, Math.min(255, percent * 2.55));
          }
          const numeric = parseFloat(value);
          return Number.isNaN(numeric)
            ? 0
            : Math.max(0, Math.min(255, numeric));
        };

        const r = channelFromString(parts[0]);
        const g = channelFromString(parts[1]);
        const b = channelFromString(parts[2]);
        const alpha =
          parts[3] !== undefined
            ? Math.max(0, Math.min(1, parseFloat(parts[3])))
            : 1;

        return {
          color: new Color3(r / 255, g / 255, b / 255),
          alpha: Number.isNaN(alpha) ? 1 : alpha,
        };
      }
    }

    const hexMatch = trimmed.match(/^#([0-9a-f]{3,8})$/i);
    if (hexMatch) {
      let hex = hexMatch[1];

      if (hex.length === 3) {
        hex = hex
          .split("")
          .map((ch) => ch + ch)
          .join("");
      } else if (hex.length === 4) {
        // Expand #RGBA to #RRGGBBAA
        hex = hex
          .split("")
          .map((ch) => ch + ch)
          .join("");
      }

      let alpha = 1;
      if (hex.length === 8) {
        const alphaHex = hex.slice(6, 8);
        alpha = parseInt(alphaHex, 16) / 255;
        hex = hex.slice(0, 6);
      }

      try {
        return {
          color: Color3.FromHexString(`#${hex}`),
          alpha: Math.max(0, Math.min(1, alpha)),
        };
      } catch (error) {
        console.warn(`⚠️ Failed to parse hex color "${colorInput}":`, error);
      }
    }

    // Basic named color fallback for a few common values
    const namedColors: Record<string, Color3> = {
      white: new Color3(1, 1, 1),
      black: new Color3(0, 0, 0),
      transparent: new Color3(0, 0, 0),
      red: new Color3(1, 0, 0),
      green: new Color3(0, 1, 0),
      blue: new Color3(0, 0, 1),
    };

    const lower = trimmed.toLowerCase();
    if (namedColors[lower]) {
      const alpha = lower === "transparent" ? 0 : 1;
      return { color: namedColors[lower], alpha };
    }

    console.warn(
      `⚠️ Unsupported color format "${colorInput}". Falling back to black.`,
    );
    return { color: new Color3(0, 0, 0), alpha: 1 };
  }

  createRoundedRectangle(
    name: string,
    width: number,
    height: number,
    borderRadius: number,
  ): Mesh {
    if (!this.scene) {
      throw new Error("Mesh service not initialized");
    }

    // Clamp border radius to prevent visual artifacts
    const maxRadius = Math.min(width, height) / 2;
    const radius = Math.min(borderRadius, maxRadius);

    // If no border radius, create a regular plane
    if (radius <= 0) {
      return this.createPlane(name, width, height);
    }

    // Create rounded rectangle using custom vertex data with improved triangulation
    const vertexData = this.createRoundedRectangleVertexData(
      width,
      height,
      radius,
    );
    const mesh = new Mesh(name, this.scene);
    vertexData.applyToMesh(mesh);



    return mesh;
  }

  createPolygon(
    name: string,
    polygonType: string,
    width: number,
    height: number,
    borderRadius: number = 0,
  ): Mesh {
    if (!this.scene) {
      throw new Error("Mesh service not initialized");
    }

    // Create polygon using custom vertex data with default angles
    const vertexData = this.createPolygonVertexData(
      polygonType,
      width,
      height,
      borderRadius,
    );
    const mesh = new Mesh(name, this.scene);
    vertexData.applyToMesh(mesh);



    return mesh;
  }

  private createRoundedRectanglePoints(
    width: number,
    height: number,
    radius: number,
  ): Vector3[] {
    const points: Vector3[] = [];
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const segments = 8;

    // Top edge
    points.push(new Vector3(-halfWidth + radius, halfHeight, 0));
    points.push(new Vector3(halfWidth - radius, halfHeight, 0));

    // Top-right corner
    for (let i = 1; i <= segments; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 2 / segments;
      const x = halfWidth - radius + radius * Math.cos(angle);
      const y = halfHeight - radius + radius * Math.sin(angle);
      points.push(new Vector3(x, y, 0));
    }

    // Right edge
    points.push(new Vector3(halfWidth, halfHeight - radius, 0));
    points.push(new Vector3(halfWidth, -halfHeight + radius, 0));

    // Bottom-right corner
    for (let i = 1; i <= segments; i++) {
      const angle = 0 + (i * Math.PI) / 2 / segments;
      const x = halfWidth - radius + radius * Math.cos(angle);
      const y = -halfHeight + radius + radius * Math.sin(angle);
      points.push(new Vector3(x, y, 0));
    }

    // Bottom edge
    points.push(new Vector3(halfWidth - radius, -halfHeight, 0));
    points.push(new Vector3(-halfWidth + radius, -halfHeight, 0));

    // Bottom-left corner
    for (let i = 1; i <= segments; i++) {
      const angle = Math.PI / 2 + (i * Math.PI) / 2 / segments;
      const x = -halfWidth + radius + radius * Math.cos(angle);
      const y = -halfHeight + radius + radius * Math.sin(angle);
      points.push(new Vector3(x, y, 0));
    }

    // Left edge
    points.push(new Vector3(-halfWidth, -halfHeight + radius, 0));
    points.push(new Vector3(-halfWidth, halfHeight - radius, 0));

    // Top-left corner
    for (let i = 1; i <= segments; i++) {
      const angle = Math.PI + (i * Math.PI) / 2 / segments;
      const x = -halfWidth + radius + radius * Math.cos(angle);
      const y = halfHeight - radius + radius * Math.sin(angle);
      points.push(new Vector3(x, y, 0));
    }

    return points;
  }

  private createRoundedRectangleVertexData(
    width: number,
    height: number,
    radius: number,
  ): VertexData {
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    // Calculate rectangle bounds
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Define rectangle corners for round-polygon library
    const rectangleCorners = [
      { x: -halfWidth, y: halfHeight }, // Top-left
      { x: halfWidth, y: halfHeight }, // Top-right
      { x: halfWidth, y: -halfHeight }, // Bottom-right
      { x: -halfWidth, y: -halfHeight }, // Bottom-left
    ];



    // Generate rounded polygon using the library
    const roundedPolygon = roundPolygon(rectangleCorners, radius);


    // Preserve rounded corners after CSS pixels are scaled into Babylon units.
    const segmentLength = Math.max(0.001, radius / 10);
    const segments = getSegments(roundedPolygon, "LENGTH", segmentLength);


    let vertexIndex = 0;

    // Helper function to add a vertex
    const addVertex = (x: number, y: number) => {
      positions.push(x, y, 0);
      normals.push(0, 0, 1);
      uvs.push((x + halfWidth) / width, (y + halfHeight) / height);
      return vertexIndex++;
    };

    // Add all segment points as vertices
    const vertices: number[] = [];
    for (const segment of segments) {
      vertices.push(addVertex(segment.x, segment.y));
    }



    // Use simple fan triangulation (should work well with evenly distributed points)
    this.earClipTriangulation(vertices, indices);

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;



    return vertexData;
  }

  public createPolygonVertexData(
    polygonType: string,
    width: number,
    height: number,
    borderRadius: number,
  ): VertexData {


    // Special case for rectangles with border radius - use optimized rectangle method
    if (polygonType === "rectangle" && borderRadius > 0) {

      return this.createRoundedRectangleVertexData(width, height, borderRadius);
    }

    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    // Get the basic polygon points based on type (with default angles)
    const polygonPoints = this.generatePolygonPoints(
      polygonType,
      width,
      height,
    );

    if (borderRadius > 0) {

      // Use round-polygon library for rounded corners
      return this.createRoundedPolygonVertexData(
        polygonPoints,
        borderRadius,
        width,
        height,
      );
    } else {

      // Create sharp-cornered polygon
      return this.createSharpPolygonVertexData(polygonPoints, width, height);
    }
  }

  private generatePolygonPoints(
    polygonType: string,
    width: number,
    height: number,
  ): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];

    // Handle rectangle specially using actual width/height dimensions
    if (polygonType === "rectangle") {
      const halfWidth = width / 2;
      const halfHeight = height / 2;

      // Create rectangle corners (clockwise from top-left)
      points.push({ x: -halfWidth, y: halfHeight }); // Top-left
      points.push({ x: halfWidth, y: halfHeight }); // Top-right
      points.push({ x: halfWidth, y: -halfHeight }); // Bottom-right
      points.push({ x: -halfWidth, y: -halfHeight }); // Bottom-left


      return points;
    }

    // Use the smaller dimension to determine the polygon radius (so it fits in the bounding box)
    const radius = Math.min(width, height) / 2;

    let sides: number;
    let startAngle: number;

    switch (polygonType) {
      case "circle":
        sides = 12; // Use 12 sides for smoother circle approximation
        startAngle = 0;
        break;
      case "triangle":
        sides = 3;
        // Triangle should have point up (vertex at top)
        startAngle = Math.PI / 2;
        break;
      case "pentagon":
        sides = 5;
        // Pentagon with flat top: rotate by half a vertex step
        // Vertex separation is 2π/5, so for flat top we rotate by π/5
        startAngle = Math.PI / 2 + Math.PI / 5; // 90° + 36° = 126°
        break;
      case "hexagon":
        sides = 6;
        // Hexagon: this was working correctly
        startAngle = Math.PI / 2 - Math.PI / 6; // 90° - 30° = 60°
        break;
      case "octagon":
        sides = 8;
        // Octagon with flat top: rotate by half a vertex step
        // Vertex separation is 2π/8, so for flat top we rotate by π/8
        startAngle = Math.PI / 2 + Math.PI / 8; // 90° + 22.5° = 112.5°
        break;
      default:
        console.warn(
          `Unknown polygon type: ${polygonType}, defaulting to hexagon`,
        );
        sides = 6;
        startAngle = Math.PI / 2 - Math.PI / 6;
    }

    // Generate polygon points in a circle
    for (let i = 0; i < sides; i++) {
      const polygonAngle = (2 * Math.PI * i) / sides + startAngle;
      const x = radius * Math.cos(polygonAngle);
      const y = radius * Math.sin(polygonAngle);
      points.push({ x, y });
    }


    return points;
  }

  private createRoundedPolygonVertexData(
    polygonPoints: Array<{ x: number; y: number }>,
    borderRadius: number,
    width: number,
    height: number,
  ): VertexData {
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];





    // Generate rounded polygon using the library
    const roundedPolygon = roundPolygon(polygonPoints, borderRadius);



    if (roundedPolygon.length === 0) {
      console.error(`❌ round-polygon library returned empty result! Input:`, {
        polygonPoints,
        borderRadius,
        width,
        height,
      });
      // Fallback to sharp polygon
      return this.createSharpPolygonVertexData(polygonPoints, width, height);
    }

    // Convert arcs to segments for triangulation with high resolution
    const segmentLength = Math.max(0.001, borderRadius / 10);
    const segments = getSegments(roundedPolygon, "LENGTH", segmentLength);


    if (segments.length === 0) {
      console.error(`❌ getSegments returned empty result!`);
      // Fallback to sharp polygon
      return this.createSharpPolygonVertexData(polygonPoints, width, height);
    }
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    let vertexIndex = 0;

    // Helper function to add a vertex
    const addVertex = (x: number, y: number) => {
      positions.push(x, y, 0);
      normals.push(0, 0, 1);
      uvs.push((x + halfWidth) / width, (y + halfHeight) / height);
      return vertexIndex++;
    };

    // Add all segment points as vertices
    const vertices: number[] = [];
    for (const segment of segments) {
      vertices.push(addVertex(segment.x, segment.y));
    }



    // Use fan triangulation for the polygon
    this.earClipTriangulation(vertices, indices);

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;



    return vertexData;
  }

  private createSharpPolygonVertexData(
    polygonPoints: Array<{ x: number; y: number }>,
    width: number,
    height: number,
  ): VertexData {
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    const halfWidth = width / 2;
    const halfHeight = height / 2;
    let vertexIndex = 0;

    // Helper function to add a vertex
    const addVertex = (x: number, y: number) => {
      positions.push(x, y, 0);
      normals.push(0, 0, 1);
      uvs.push((x + halfWidth) / width, (y + halfHeight) / height);
      return vertexIndex++;
    };

    // Add all polygon points as vertices
    const vertices: number[] = [];
    for (const point of polygonPoints) {
      vertices.push(addVertex(point.x, point.y));
    }



    // Use fan triangulation for the polygon
    this.earClipTriangulation(vertices, indices);

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;



    return vertexData;
  }

  private createPolygonFrameVertexData(
    polygonType: string,
    width: number,
    height: number,
    borderWidth: BorderWidths,
    borderRadius: number,
  ): VertexData {


    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    // Generate outer polygon points (actual size) with default angles
    const outerPolygonPoints = this.generatePolygonPoints(
      polygonType,
      width,
      height,
    );

    const borderWidths = this.normalizeBorderWidths(borderWidth);
    const maximumBorderWidth = Math.max(
      borderWidths.top,
      borderWidths.right,
      borderWidths.bottom,
      borderWidths.left,
    );

    // Generate inner polygon points (reduced by border width)
    // For rectangles, reduce both width and height by 2*borderWidth (border on both sides)
    // For circles, reduce radius by borderWidth
    let innerWidth, innerHeight;

    if (polygonType === "circle") {
      // For circles, reduce radius by border width
      const outerRadius = Math.min(width, height) / 2;
      const innerRadius = Math.max(0.1, outerRadius - maximumBorderWidth);
      const innerScale = innerRadius / outerRadius;
      innerWidth = width * innerScale;
      innerHeight = height * innerScale;
    } else {
      // For rectangles and other polygons, reduce dimensions by 2*borderWidth (border on both sides)
      innerWidth = Math.max(0.2, width - borderWidths.left - borderWidths.right);
      innerHeight = Math.max(0.2, height - borderWidths.top - borderWidths.bottom);
    }

    const innerPolygonPoints = this.generatePolygonPoints(
      polygonType,
      innerWidth,
      innerHeight,
    );
    if (polygonType === "rectangle") {
      // The renderer's logical X axis is mirrored at the camera boundary, so
      // CSS left/right widths map to the opposite local mesh edges.
      const offsetX = (borderWidths.right - borderWidths.left) / 2;
      const offsetY = (borderWidths.bottom - borderWidths.top) / 2;
      innerPolygonPoints.forEach((point) => {
        point.x += offsetX;
        point.y += offsetY;
      });
    }



    if (borderRadius > 0) {

      // Create rounded polygon border
      return this.createRoundedPolygonFrameVertexData(
        outerPolygonPoints,
        innerPolygonPoints,
        borderRadius,
        width,
        height,
        maximumBorderWidth,
      );
    } else {

      // Create sharp polygon border
      return this.createSharpPolygonFrameVertexData(
        outerPolygonPoints,
        innerPolygonPoints,
        width,
        height,
      );
    }
  }

  private createRoundedPolygonFrameVertexData(
    outerPoints: Array<{ x: number; y: number }>,
    innerPoints: Array<{ x: number; y: number }>,
    borderRadius: number,
    width: number,
    height: number,
    borderWidth: number,
  ): VertexData {
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];



    // Generate rounded outer polygon
    const roundedOuter = roundPolygon(outerPoints, borderRadius);
    const segmentLength = Math.max(0.001, borderRadius / 10);
    const outerSegments = getSegments(roundedOuter, "LENGTH", segmentLength);

    // Generate rounded inner polygon with proportionally smaller radius
    // Use exact geometric subtraction for concentric corners
    // innerRadius = outerRadius - borderWidth
    const innerBorderRadius = Math.max(0, borderRadius - borderWidth);
    const roundedInner = roundPolygon(innerPoints, innerBorderRadius);
    const innerSegments = getSegments(roundedInner, "LENGTH", segmentLength);




    const halfWidth = width / 2;
    const halfHeight = height / 2;
    let vertexIndex = 0;

    // Helper function to add a vertex
    const addVertex = (x: number, y: number) => {
      positions.push(x, y, 0);
      normals.push(0, 0, 1);
      uvs.push((x + halfWidth) / width, (y + halfHeight) / height);
      return vertexIndex++;
    };

    // Add outer vertices
    const outerVertices: number[] = [];
    for (const segment of outerSegments) {
      outerVertices.push(addVertex(segment.x, segment.y));
    }

    // Add inner vertices
    const innerVertices: number[] = [];
    for (const segment of innerSegments) {
      innerVertices.push(addVertex(segment.x, segment.y));
    }

    // Create triangular strips between outer and inner perimeters
    this.createBorderStrips(outerVertices, innerVertices, indices);

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;



    return vertexData;
  }

  private createSharpPolygonFrameVertexData(
    outerPoints: Array<{ x: number; y: number }>,
    innerPoints: Array<{ x: number; y: number }>,
    width: number,
    height: number,
  ): VertexData {
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    const halfWidth = width / 2;
    const halfHeight = height / 2;
    let vertexIndex = 0;

    // Helper function to add a vertex
    const addVertex = (x: number, y: number) => {
      positions.push(x, y, 0);
      normals.push(0, 0, 1);
      uvs.push((x + halfWidth) / width, (y + halfHeight) / height);
      return vertexIndex++;
    };

    // Add outer vertices
    const outerVertices: number[] = [];
    for (const point of outerPoints) {
      outerVertices.push(addVertex(point.x, point.y));
    }

    // Add inner vertices
    const innerVertices: number[] = [];
    for (const point of innerPoints) {
      innerVertices.push(addVertex(point.x, point.y));
    }

    // Create triangular strips between outer and inner perimeters
    this.createBorderStrips(outerVertices, innerVertices, indices);

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;



    return vertexData;
  }

  private createBorderStrips(
    outerVertices: number[],
    innerVertices: number[],
    indices: number[],
  ): void {
    const outerCount = outerVertices.length;
    const innerCount = innerVertices.length;

    if (outerCount === innerCount) {
      // Same number of vertices - create simple strips
      for (let i = 0; i < outerCount; i++) {
        const nextI = (i + 1) % outerCount;

        // Create two triangles for each segment of the border frame
        indices.push(outerVertices[i], innerVertices[i], outerVertices[nextI]);
        indices.push(
          innerVertices[i],
          innerVertices[nextI],
          outerVertices[nextI],
        );
      }
    } else {
      // Different vertex counts - use ratio-based mapping


      for (let i = 0; i < outerCount; i++) {
        const nextI = (i + 1) % outerCount;

        // Map to inner vertices using ratio
        const innerI = Math.floor((i * innerCount) / outerCount) % innerCount;
        const nextInnerI =
          Math.floor((nextI * innerCount) / outerCount) % innerCount;

        // Create triangles
        indices.push(
          outerVertices[i],
          innerVertices[innerI],
          outerVertices[nextI],
        );
        if (innerI !== nextInnerI) {
          indices.push(
            innerVertices[innerI],
            innerVertices[nextInnerI],
            outerVertices[nextI],
          );
        }
      }
    }
  }

  private earClipTriangulation(vertices: number[], indices: number[]): void {
    // Simple ear clipping for convex polygon (rounded rectangle)
    // For convex polygons, we can triangulate by connecting non-adjacent vertices
    // This guarantees no overlapping triangles

    const n = vertices.length;
    if (n < 3) return;

    // For convex polygons, we can use a simple fan triangulation from vertex 0
    // but ensure we don't create overlapping triangles by using proper indexing
    for (let i = 1; i < n - 1; i++) {
      indices.push(vertices[0], vertices[i], vertices[i + 1]);
    }
  }

  createBorderMesh(
    name: string,
    elementWidth: number,
    elementHeight: number,
    borderWidth: BorderWidths,
    borderRadius: number = 0,
  ): Mesh[] {
    if (!this.scene) {
      throw new Error("Mesh service not initialized");
    }

    // Use the polygon border creation which handles both rounded and rectangular
    return this.createPolygonBorder(
      name,
      "rectangle",
      elementWidth,
      elementHeight,
      borderWidth,
      borderRadius,
    );
  }

  createPolygonBorder(
    name: string,
    polygonType: string,
    width: number,
    height: number,
    borderWidth: BorderWidths,
    borderRadius: number = 0,
  ): Mesh[] {
    if (!this.scene) {
      throw new Error("Mesh service not initialized");
    }

    try {
      // Create polygon border frame using custom vertex data
      const vertexData = this.createPolygonFrameVertexData(
        polygonType,
        width,
        height,
        borderWidth,
        borderRadius,
      );

      const borderMesh = new Mesh(`${name}_border_frame`, this.scene);
      vertexData.applyToMesh(borderMesh);


      return [borderMesh];
    } catch (error) {
      console.warn("Failed to create polygon border:", error);
      return [];
    }
  }

  // ... (rest of the code remains the same)

  updateMeshWithBorderRadius(
    mesh: Mesh | string,
    polygonType: string,
    width: number,
    height: number,
    borderRadius: number,
    borderWidth: BorderWidths = 0,
    scene?: Scene,
  ): void {
    const targetScene = scene || this.scene;
    if (!targetScene) {
      throw new Error("Scene not initialized");
    }

    // Get the main mesh - either directly or by name
    let mainMesh: Mesh | null = null;
    let meshName: string = "";

    if (typeof mesh === "string") {
      meshName = mesh;
      mainMesh = targetScene.getMeshByName(meshName) as Mesh;
      if (!mainMesh) {
        console.warn(`⚠️ Cannot find mesh to update: ${meshName}`);
        return;
      }
    } else {
      mainMesh = mesh;
      meshName = mainMesh.name;
    }



    try {
      // Update the main mesh geometry
      const vertexData = this.createPolygonVertexData(
        polygonType,
        width,
        height,
        borderRadius,
      );
      vertexData.applyToMesh(mainMesh, true);
      mainMesh.refreshBoundingInfo();

      // If there's a border width, update border meshes too
      if (this.maximumBorderWidth(borderWidth) > 0) {
        const borderMeshNames = [
          `${meshName}_border_frame`,
          `${meshName}-border_border_frame`,
        ];
        const borderMeshName = borderMeshNames.find((name) =>
          targetScene.getMeshByName(name)
        );
        const borderMesh = borderMeshName
          ? targetScene.getMeshByName(borderMeshName) as Mesh | null
          : null;

        if (borderMesh) {
          // Single border frame mesh - recreate it with new border radius


          // Create new border vertex data
          const borderVertexData = this.createPolygonFrameVertexData(
            polygonType,
            width,
            height,
            borderWidth,
            borderRadius,
          );

          // Apply to existing mesh
          borderVertexData.applyToMesh(borderMesh, true);
          borderMesh.refreshBoundingInfo();
        } else {


          // Check for legacy rectangular border meshes so we can alert developers
          for (let i = 0; i < 4; i++) {
            const legacyName = `${meshName}-border-${i}`;
            const legacyMesh = targetScene.getMeshByName(legacyName);
            if (legacyMesh) {

            }
          }
        }
      }


    } catch (error) {
      console.error(`❌ Error updating mesh with border radius:`, error);
      throw error;
    }
  }

  /**
   * Updates a mesh's geometry with a new border radius
   * This method is specifically designed to fix hover state border radius issues
   */
  updateMeshBorderRadius(
    mesh: Mesh,
    width: number,
    height: number,
    borderRadius: number,
  ): void {
    if (!this.scene) {
      throw new Error("Scene not initialized");
    }



    try {
      // For rectangles, we need to recreate the mesh with the new border radius
      // First, dispose of any existing vertex data
      if (mesh.geometry) {
        const positions = [];
        const indices = [];
        const normals = [];
        const uvs = [];

        // Create new vertex data with the updated border radius
        const vertexData = new VertexData();

        // Calculate rectangle bounds
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        if (borderRadius <= 0) {
          // No border radius - create a simple rectangle
          positions.push(-halfWidth, halfHeight, 0); // Top-left
          positions.push(halfWidth, halfHeight, 0); // Top-right
          positions.push(halfWidth, -halfHeight, 0); // Bottom-right
          positions.push(-halfWidth, -halfHeight, 0); // Bottom-left

          indices.push(0, 1, 2); // First triangle
          indices.push(0, 2, 3); // Second triangle

          normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);

          uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
        } else {
          // With border radius - create a rounded rectangle
          // Define rectangle corners
          const rectangleCorners = [
            { x: -halfWidth, y: halfHeight }, // Top-left
            { x: halfWidth, y: halfHeight }, // Top-right
            { x: halfWidth, y: -halfHeight }, // Bottom-right
            { x: -halfWidth, y: -halfHeight }, // Bottom-left
          ];

          // Generate rounded polygon
          const roundedPolygon = roundPolygon(rectangleCorners, borderRadius);

          // Convert to segments for smooth curves
          const segmentLength = Math.max(0.001, borderRadius / 10);
          const segments = getSegments(roundedPolygon, "LENGTH", segmentLength);

          let vertexIndex = 0;
          const vertices = [];

          // Add all segment points as vertices
          for (const segment of segments) {
            positions.push(segment.x, segment.y, 0);
            normals.push(0, 0, 1);
            uvs.push(
              (segment.x + halfWidth) / width,
              (segment.y + halfHeight) / height,
            );
            vertices.push(vertexIndex++);
          }

          // Create triangles using fan triangulation
          for (let i = 1; i < vertices.length - 1; i++) {
            indices.push(vertices[0], vertices[i], vertices[i + 1]);
          }
        }

        // Apply the new vertex data to the mesh
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.normals = normals;
        vertexData.uvs = uvs;

        // Apply to the mesh with updateable flag set to true
        vertexData.applyToMesh(mesh, true);

        // Refresh the bounding info to ensure proper interactions
        mesh.refreshBoundingInfo();


      } else {
        console.error(`❌ Mesh has no geometry to update`);
      }
    } catch (error) {
      console.error(`❌ DEBUGGING: Error updating border radius:`, error);
      console.error(error); // Log the full error object
    }
  }

  cleanup(): void {
    this.scene = undefined;
  }

  /**
   * Creates a new mesh with the specified border radius and copies properties from the original mesh
   * This is a more reliable approach for handling hover state border radius changes
   */
  createMeshWithBorderRadius(
    originalMesh: Mesh,
    width: number,
    height: number,
    borderRadius: number,
  ): Mesh {
    if (!this.scene) {
      throw new Error("Mesh service not initialized");
    }



    try {
      // Create a new mesh with the desired border radius
      const newMesh = this.createRoundedRectangle(
        `${originalMesh.name}_with_radius`,
        width,
        height,
        borderRadius,
      );

      // Copy position, rotation, scaling from the original mesh
      newMesh.position.copyFrom(originalMesh.position);
      newMesh.rotation.copyFrom(originalMesh.rotation);
      newMesh.scaling.copyFrom(originalMesh.scaling);

      // Copy parent and material
      newMesh.parent = originalMesh.parent;
      newMesh.material = originalMesh.material;

      // Copy action manager to preserve event handlers
      if (originalMesh.actionManager) {
        newMesh.actionManager = originalMesh.actionManager;
      }



      return newMesh;
    } catch (error) {
      console.error(`❌ Error creating mesh with border radius:`, error);
      throw error;
    }
  }

  // ===== TEXT MESH CREATION METHODS =====

  /**
   * Creates a text mesh with proper dimensions and positioning
   * @param name - Name for the text mesh
   * @param texture - BabylonJS texture containing the rendered text
   * @param width - Width of the text plane in world units
   * @param height - Height of the text plane in world units
   * @returns Text mesh with applied texture and material
   */
  createTextMesh(
    name: string,
    texture: Texture,
    width: number,
    height: number,
  ): Mesh {
    if (!this.scene) {
      throw new Error("Mesh service not initialized");
    }



    try {
      // Create a plane mesh for the text
      const textPlane = MeshBuilder.CreatePlane(
        name,
        {
          width: width,
          height: height,
        },
        this.scene,
      );

      // Create material for text rendering
      const textMaterial = this.createTextMaterial(`${name}_material`, texture);
      textPlane.material = textMaterial;

      // Configure mesh properties for text rendering
      textPlane.billboardMode = Mesh.BILLBOARDMODE_NONE;
      // Keep text in the normal render group so depth testing and CSS-like
      // stacking contexts can occlude it (for example, behind a modal).
      // The small local Z offset applied by the caller is sufficient to keep
      // the text in front of its own element background.
      textPlane.renderingGroupId = 0;


      return textPlane;
    } catch (error) {
      console.error(`❌ Error creating text mesh: ${name}`, error);
      throw new Error(`Failed to create text mesh: ${error}`);
    }
  }

  /**
   * Creates a material specifically for text rendering with proper alpha support
   * @param name - Name for the material
   * @param texture - Text texture to apply
   * @returns StandardMaterial configured for text rendering
   */
  createTextMaterial(name: string, texture: Texture): StandardMaterial {
    if (!this.scene) {
      throw new Error("Mesh service not initialized");
    }

    const material = new StandardMaterial(name, this.scene);

    // Apply the text texture
    material.diffuseTexture = texture;

    // Configure material for text rendering
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    material.backFaceCulling = false;

    // Disable lighting effects for consistent text appearance
    material.disableLighting = true;
    material.emissiveTexture = texture; // Use texture as emissive for consistent brightness
    // Without this flag StandardMaterial multiplies the diffuse sample by the
    // same emissive sample, producing a squared color transfer. Textures made
    // from a display-encoded canvas should contribute their authored color once.
    material.useEmissiveAsIllumination = true;

    // Remove specular and other effects
    material.specularColor = new Color3(0, 0, 0);
    material.roughness = 1.0;


    return material;
  }

  /**
   * Creates a material with a solid color
   * @param name - Name for the material
   * @param color - Color3 for the material
   * @param alpha - Optional alpha value (0-1)
   * @returns StandardMaterial with solid color
   */
  createMaterial(
    name: string,
    color: Color3,
    alpha: number = 1,
  ): StandardMaterial {
    if (!this.scene) {
      throw new Error("Mesh service not initialized");
    }

    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = color;
    // CSS colors are presentation colors, not surfaces affected by scene light.
    // StandardMaterial renders black with lighting disabled unless the color is
    // also emitted, so keep the unlit output faithful to the requested color.
    material.emissiveColor = color;
    material.specularColor = new Color3(0, 0, 0);
    material.alpha = alpha;
    material.disableLighting = true;
    material.backFaceCulling = false;


    return material;
  }

  /**
   * Updates an existing text mesh with new texture content
   * @param textMesh - The text mesh to update
   * @param newTexture - New texture containing updated text
   * @param newWidth - Optional new width for the mesh
   * @param newHeight - Optional new height for the mesh
   */
  updateTextMesh(
    textMesh: Mesh,
    newTexture: Texture,
    newWidth?: number,
    newHeight?: number,
  ): void {
    if (!this.scene) {
      throw new Error("Mesh service not initialized");
    }



    try {
      // Update material texture
      if (textMesh.material && textMesh.material instanceof StandardMaterial) {
        const material = textMesh.material as StandardMaterial;

        // Dispose old texture if it exists
        if (material.diffuseTexture) {
          material.diffuseTexture.dispose();
        }
        if (
          material.emissiveTexture &&
          material.emissiveTexture !== material.diffuseTexture
        ) {
          material.emissiveTexture.dispose();
        }

        // Apply new texture
        material.diffuseTexture = newTexture;
        material.emissiveTexture = newTexture;
      }

      // Update mesh dimensions if provided
      if (newWidth !== undefined && newHeight !== undefined) {
        // Recreate the plane geometry with new dimensions
        const newVertexData = this.createPlaneVertexData(newWidth, newHeight);
        newVertexData.applyToMesh(textMesh, true);
        textMesh.refreshBoundingInfo();


      }


    } catch (error) {
      console.error(`❌ Error updating text mesh: ${textMesh.name}`, error);
      throw new Error(`Failed to update text mesh: ${error}`);
    }
  }

  /**
   * Creates vertex data for a plane with specified dimensions
   * @param width - Width of the plane
   * @param height - Height of the plane
   * @returns VertexData for the plane
   */
  private createPlaneVertexData(width: number, height: number): VertexData {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const positions = [
      -halfWidth,
      halfHeight,
      0, // Top-left
      halfWidth,
      halfHeight,
      0, // Top-right
      halfWidth,
      -halfHeight,
      0, // Bottom-right
      -halfWidth,
      -halfHeight,
      0, // Bottom-left
    ];

    const indices = [
      0,
      1,
      2, // First triangle
      0,
      2,
      3, // Second triangle
    ];

    const normals = [
      0,
      0,
      1, // Top-left
      0,
      0,
      1, // Top-right
      0,
      0,
      1, // Bottom-right
      0,
      0,
      1, // Bottom-left
    ];

    const uvs = [
      0,
      0, // Top-left
      1,
      0, // Top-right
      1,
      1, // Bottom-right
      0,
      1, // Bottom-left
    ];

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;

    return vertexData;
  }

  /**
   * Properly disposes of a text mesh and its associated resources
   * @param textMesh - The text mesh to dispose
   */
  disposeTextMesh(textMesh: Mesh): void {


    try {
      // Dispose material and textures
      if (textMesh.material) {
        const material = textMesh.material;

        if (material instanceof StandardMaterial) {
          // Dispose textures
          if (material.diffuseTexture) {
            material.diffuseTexture.dispose();
          }
          if (
            material.emissiveTexture &&
            material.emissiveTexture !== material.diffuseTexture
          ) {
            material.emissiveTexture.dispose();
          }
        }

        // Dispose material
        material.dispose();
      }

      // Dispose geometry
      if (textMesh.geometry) {
        textMesh.geometry.dispose();
      }

      // Dispose mesh
      textMesh.dispose();


    } catch (error) {
      console.error(`❌ Error disposing text mesh: ${textMesh.name}`, error);
    }
  }

  /**
   * Positions a text mesh at the specified coordinates
   * @param textMesh - The text mesh to position
   * @param x - X coordinate in world space
   * @param y - Y coordinate in world space
   * @param z - Z coordinate in world space
   */
  positionTextMesh(textMesh: Mesh, x: number, y: number, z: number): void {
    const renderPosition = this.coordinateTransform.transformToRenderCoordinates(
      x,
      y,
      z,
    );

    textMesh.position.copyFrom(renderPosition);

  }

  /**
   * Sets the parent of a text mesh for hierarchical transformations
   * @param textMesh - The text mesh to parent
   * @param parentMesh - The parent mesh
   */
  parentTextMesh(textMesh: Mesh, parentMesh: Mesh): void {
    textMesh.parent = parentMesh;

  }

  /**
   * Positions border meshes relative to parent mesh
   * @param borders - Array of border meshes to position
   * @param centerX - X offset from parent center
   * @param centerY - Y offset from parent center
   * @param centerZ - Z offset from parent center
   * @param elementWidth - Width of parent element
   * @param elementHeight - Height of parent element
   * @param borderWidth - Border width
   */
  positionBorderFrames(
    borders: Mesh[],
    centerX: number,
    centerY: number,
    centerZ: number,
    elementWidth: number,
    elementHeight: number,
    borderWidth: BorderWidths,
  ): void {
    borders.forEach((borderMesh, index) => {
      // Position each border mesh relative to parent
      borderMesh.position.x = centerX;
      borderMesh.position.y = centerY;
      borderMesh.position.z = centerZ;
    });

  }

  private normalizeBorderWidths(borderWidth: BorderWidths): BorderWidthBox {
    if (typeof borderWidth === "number") {
      const width = Math.max(0, borderWidth);
      return { top: width, right: width, bottom: width, left: width };
    }
    return {
      top: Math.max(0, borderWidth.top),
      right: Math.max(0, borderWidth.right),
      bottom: Math.max(0, borderWidth.bottom),
      left: Math.max(0, borderWidth.left),
    };
  }

  private maximumBorderWidth(borderWidth: BorderWidths): number {
    const widths = this.normalizeBorderWidths(borderWidth);
    return Math.max(widths.top, widths.right, widths.bottom, widths.left);
  }

  /**
   * Updates text mesh material properties for dynamic styling
   * @param textMesh - The text mesh to update
   * @param opacity - New opacity value (0-1)
   * @param color - Optional color tint (Color3)
   */
  updateTextMeshMaterial(
    textMesh: Mesh,
    opacity?: number,
    color?: Color3,
  ): void {
    if (
      !textMesh.material ||
      !(textMesh.material instanceof StandardMaterial)
    ) {
      console.warn(
        `⚠️ Text mesh ${textMesh.name} does not have a StandardMaterial`,
      );
      return;
    }

    const material = textMesh.material as StandardMaterial;

    try {
      // Update opacity
      if (opacity !== undefined) {
        material.alpha = Math.max(0, Math.min(1, opacity));

        // Update transparency mode based on opacity
        if (material.alpha < 1.0) {
          material.transparencyMode = Material.MATERIAL_ALPHABLEND;
        } else {
          material.transparencyMode = Material.MATERIAL_OPAQUE;
        }


      }

      // Update color tint
      if (color) {
        material.diffuseColor = color;

      }
    } catch (error) {
      console.error(
        `❌ Error updating text mesh material: ${textMesh.name}`,
        error,
      );
    }
  }

  /**
   * Creates a gradient material for mesh rendering
   * @param name - Material name
   * @param gradientData - Linear gradient definition
   * @param opacity - Material opacity
   * @param width - Width for gradient texture
   * @param height - Height for gradient texture
   * @returns StandardMaterial with gradient texture
   */
  createGradientMaterial(
    name: string,
    gradientData: LinearGradientDefinition,
    opacity: number,
    width: number,
    height: number,
  ): StandardMaterial {
    if (!this.scene) {
      throw new Error("Mesh service not initialized");
    }

    const material = new StandardMaterial(name, this.scene);
    material.alpha = Math.max(0, Math.min(1, opacity));

    // Create a dynamic texture for the gradient
    const textureSize = Math.max(width, height, 256);
    const gradientTexture = new DynamicTexture(
      `${name}-gradient-texture`,
      { width: textureSize, height: textureSize },
      this.scene,
      true,
    );

    const ctx = gradientTexture.getContext();
    const gradient = ctx.createLinearGradient(
      textureSize / 2,
      0,
      textureSize / 2,
      textureSize,
    );

    // Add gradient stops
    gradientData.stops.forEach((stop) => {
      const rgba = `rgba(${Math.round(stop.color.r * 255)}, ${Math.round(stop.color.g * 255)}, ${Math.round(stop.color.b * 255)}, ${stop.alpha})`;
      gradient.addColorStop(stop.offset, rgba);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, textureSize, textureSize);
    gradientTexture.update();

    material.diffuseTexture = gradientTexture;
    material.emissiveTexture = gradientTexture;


    return material;
  }

  /**
   * Creates a shadow mesh for an element
   * @param name - Shadow mesh name
   * @param width - Shadow width
   * @param height - Shadow height
   * @param offsetX - X offset
   * @param offsetY - Y offset
   * @param blur - Blur radius
   * @param color - Shadow color
   * @param polygonType - Polygon type
   * @param borderRadius - Border radius
   * @returns Shadow mesh
   */
  createShadow(
    name: string,
    width: number,
    height: number,
    layers: readonly BoxShadowLayer[],
    _polygonType: string,
    borderRadius: number,
  ): Mesh {
    if (!this.scene) {
      throw new Error("Mesh service not initialized");
    }
    const scene = this.scene;

    Effect.ShadersStore["astylarBoxShadowVertexShader"] = `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 worldViewProjection;
      varying vec2 vUV;
      void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }
    `;
    Effect.ShadersStore["astylarBoxShadowFragmentShader"] = `
      precision highp float;
      varying vec2 vUV;
      uniform vec2 planeSize;
      uniform vec2 rectSize;
      uniform vec2 elementSize;
      uniform vec2 clipOffset;
      uniform float radius;
      uniform float elementRadius;
      uniform float blur;
      uniform vec4 shadowColor;
      float roundedRectDistance(vec2 point, vec2 halfSize, float cornerRadius) {
        vec2 delta = abs(point) - halfSize + cornerRadius;
        return length(max(delta, 0.0)) + min(max(delta.x, delta.y), 0.0) - cornerRadius;
      }
      void main(void) {
        vec2 point = (vUV - 0.5) * planeSize;
        float distance = roundedRectDistance(point, rectSize * 0.5, radius);
        float elementDistance = roundedRectDistance(point + clipOffset, elementSize * 0.5, elementRadius);
        if (elementDistance <= 0.0) discard;
        float coverage;
        if (blur < 0.0001) {
          coverage = step(distance, 0.0);
        } else {
          // Chromium's CSS blur kernel has partial coverage at the source edge
          // and a tighter falloff than a half-radius Gaussian.
          float sigma = max(blur * 0.4, 0.0001);
          float outside = max(distance, 0.0) / sigma;
          coverage = distance <= 0.0 ? 0.82 : 0.41 * exp(-0.5 * outside * outside);
        }
        gl_FragColor = vec4(shadowColor.rgb, shadowColor.a * coverage);
      }
    `;

    const shadowRoot = new Mesh(name, scene);
    layers.slice().reverse().forEach((layer, reverseIndex) => {
      const spreadWidth = Math.max(0, width + layer.spread * 2);
      const spreadHeight = Math.max(0, height + layer.spread * 2);
      const margin = Math.max(0.001, layer.blur * 2);
      const planeWidth = spreadWidth + margin * 2;
      const planeHeight = spreadHeight + margin * 2;
      const layerIndex = layers.length - reverseIndex - 1;
      const plane = this.createPlane(`${name}-layer-${layerIndex}`, planeWidth, planeHeight);
      const material = new ShaderMaterial(
        `${plane.name}-material`,
        scene,
        { vertex: "astylarBoxShadow", fragment: "astylarBoxShadow" },
        {
          attributes: ["position", "uv"],
          uniforms: ["worldViewProjection", "planeSize", "rectSize", "elementSize", "clipOffset", "radius", "elementRadius", "blur", "shadowColor"],
        },
      );
      const parsedColor = this.parseCssColor(layer.color);
      material.setVector2("planeSize", new Vector2(planeWidth, planeHeight));
      material.setVector2("rectSize", new Vector2(spreadWidth, spreadHeight));
      material.setVector2("elementSize", new Vector2(width, height));
      material.setVector2("clipOffset", new Vector2(-layer.offsetX, -layer.offsetY));
      material.setFloat("radius", Math.max(0, borderRadius + layer.spread));
      material.setFloat("elementRadius", Math.max(0, borderRadius));
      material.setFloat("blur", layer.blur);
      material.setColor4("shadowColor", parsedColor.color.toColor4(parsedColor.alpha));
      material.backFaceCulling = false;
      material.needAlphaBlending = () => true;
      plane.material = material;
      // Astylar's camera axes are opposite CSS screen axes.
      plane.position.set(-layer.offsetX, -layer.offsetY, -0.00005 * reverseIndex);
      plane.isPickable = false;
      plane.parent = shadowRoot;
      plane.metadata = { shadowLayer: { ...layer, planeWidth, planeHeight } };
    });
    return shadowRoot;
  }
}
