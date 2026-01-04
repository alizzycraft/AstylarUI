import { Injectable } from '@angular/core';
import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Vector2, Mesh, Material, VertexData, PolygonMeshBuilder, DynamicTexture, ShaderMaterial, Effect, Texture } from '@babylonjs/core';
import { GradientStop, LinearGradientDefinition } from './dom/interfaces/render.types';

import { BabylonCameraService } from './babylon-camera.service';
import { CoordinateTransformService } from './coordinate-transform.service';
import roundPolygon, { getSegments } from 'round-polygon';

@Injectable({
  providedIn: 'root'
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
      throw new Error('Mesh service not initialized');
    }

    return MeshBuilder.CreatePlane(name, {
      width: width,
      height: height
    }, this.scene);
  }

  createRoundedRectangle(name: string, width: number, height: number, borderRadius: number): Mesh {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    // Clamp border radius to prevent visual artifacts
    const maxRadius = Math.min(width, height) / 2;
    const radius = Math.min(borderRadius, maxRadius);

    // If no border radius, create a regular plane
    if (radius <= 0) {
      return this.createPlane(name, width, height);
    }

    // Create rounded rectangle using custom vertex data with improved triangulation
    const vertexData = this.createRoundedRectangleVertexData(width, height, radius);
    const mesh = new Mesh(name, this.scene);
    vertexData.applyToMesh(mesh);

    console.log(`🎨 Created rounded rectangle: ${name} (${width.toFixed(3)} x ${height.toFixed(3)}) radius=${radius.toFixed(3)}`);

    return mesh;
  }

  createPolygon(name: string, polygonType: string, width: number, height: number, borderRadius: number = 0): Mesh {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    // Create polygon using custom vertex data with default angles
    const vertexData = this.createPolygonVertexData(polygonType, width, height, borderRadius);
    const mesh = new Mesh(name, this.scene);
    vertexData.applyToMesh(mesh);

    console.log(`🎨 Created ${polygonType}: ${name} (${width.toFixed(3)} x ${height.toFixed(3)}) radius=${borderRadius.toFixed(3)}`);

    return mesh;
  }

  private createRoundedRectanglePoints(width: number, height: number, radius: number): Vector3[] {
    const points: Vector3[] = [];
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const segments = 8;

    // Top edge
    points.push(new Vector3(-halfWidth + radius, halfHeight, 0));
    points.push(new Vector3(halfWidth - radius, halfHeight, 0));

    // Top-right corner
    for (let i = 1; i <= segments; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI / 2) / segments;
      const x = (halfWidth - radius) + radius * Math.cos(angle);
      const y = (halfHeight - radius) + radius * Math.sin(angle);
      points.push(new Vector3(x, y, 0));
    }

    // Right edge
    points.push(new Vector3(halfWidth, halfHeight - radius, 0));
    points.push(new Vector3(halfWidth, -halfHeight + radius, 0));

    // Bottom-right corner
    for (let i = 1; i <= segments; i++) {
      const angle = 0 + (i * Math.PI / 2) / segments;
      const x = (halfWidth - radius) + radius * Math.cos(angle);
      const y = (-halfHeight + radius) + radius * Math.sin(angle);
      points.push(new Vector3(x, y, 0));
    }

    // Bottom edge
    points.push(new Vector3(halfWidth - radius, -halfHeight, 0));
    points.push(new Vector3(-halfWidth + radius, -halfHeight, 0));

    // Bottom-left corner
    for (let i = 1; i <= segments; i++) {
      const angle = Math.PI / 2 + (i * Math.PI / 2) / segments;
      const x = (-halfWidth + radius) + radius * Math.cos(angle);
      const y = (-halfHeight + radius) + radius * Math.sin(angle);
      points.push(new Vector3(x, y, 0));
    }

    // Left edge
    points.push(new Vector3(-halfWidth, -halfHeight + radius, 0));
    points.push(new Vector3(-halfWidth, halfHeight - radius, 0));

    // Top-left corner
    for (let i = 1; i <= segments; i++) {
      const angle = Math.PI + (i * Math.PI / 2) / segments;
      const x = (-halfWidth + radius) + radius * Math.cos(angle);
      const y = (halfHeight - radius) + radius * Math.sin(angle);
      points.push(new Vector3(x, y, 0));
    }

    return points;
  }

  private createRoundedRectangleVertexData(width: number, height: number, radius: number): VertexData {
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    // Calculate rectangle bounds
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Define rectangle corners for round-polygon library
    const rectangleCorners = [
      { x: -halfWidth, y: halfHeight },   // Top-left
      { x: halfWidth, y: halfHeight },    // Top-right
      { x: halfWidth, y: -halfHeight },   // Bottom-right
      { x: -halfWidth, y: -halfHeight }   // Bottom-left
    ];

    console.log(`🔍 Using round-polygon library for ${width.toFixed(1)}x${height.toFixed(1)} rectangle (radius=${radius.toFixed(1)}):`);

    // Generate rounded polygon using the library
    const roundedPolygon = roundPolygon(rectangleCorners, radius);
    console.log(`   Generated ${roundedPolygon.length} rounded corner points`);

    // Convert arcs to segments for triangulation with higher resolution
    // Use smaller segment length for smoother curves (0.5 units per segment instead of 2)
    const segmentLength = Math.max(0.3, radius / 10); // Dynamic based on radius, minimum 0.3
    const segments = getSegments(roundedPolygon, "LENGTH", segmentLength);
    console.log(`   Generated ${segments.length} segments for smooth curves (segment length: ${segmentLength.toFixed(2)})`);

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

    console.log(`   Created ${vertices.length} vertices from segments`);

    // Use simple fan triangulation (should work well with evenly distributed points)
    this.earClipTriangulation(vertices, indices);

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;

    console.log(`🎨 Generated rounded rectangle: ${vertices.length} vertices, ${indices.length / 3} triangles (round-polygon library)`);

    return vertexData;
  }

  public createPolygonVertexData(polygonType: string, width: number, height: number, borderRadius: number): VertexData {
    console.log(`🔍 createPolygonVertexData: ${polygonType}, ${width.toFixed(1)}×${height.toFixed(1)}, radius=${borderRadius.toFixed(3)}`);

    // Special case for rectangles with border radius - use optimized rectangle method
    if (polygonType === 'rectangle' && borderRadius > 0) {
      console.log(`✅ Using createRoundedRectangleVertexData for rectangle with radius ${borderRadius.toFixed(3)}`);
      return this.createRoundedRectangleVertexData(width, height, borderRadius);
    }

    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    // Get the basic polygon points based on type (with default angles)
    const polygonPoints = this.generatePolygonPoints(polygonType, width, height);

    if (borderRadius > 0) {
      console.log(`✅ Using rounded polygon path for ${polygonType} with radius ${borderRadius.toFixed(3)}`);
      // Use round-polygon library for rounded corners
      return this.createRoundedPolygonVertexData(polygonPoints, borderRadius, width, height);
    } else {
      console.log(`⚠️ Using sharp polygon path for ${polygonType} (borderRadius=${borderRadius})`);
      // Create sharp-cornered polygon
      return this.createSharpPolygonVertexData(polygonPoints, width, height);
    }
  }

  private generatePolygonPoints(polygonType: string, width: number, height: number): Array<{ x: number, y: number }> {
    const points: Array<{ x: number, y: number }> = [];

    // Handle rectangle specially using actual width/height dimensions
    if (polygonType === 'rectangle') {
      const halfWidth = width / 2;
      const halfHeight = height / 2;

      // Create rectangle corners (clockwise from top-left)
      points.push({ x: -halfWidth, y: halfHeight });   // Top-left
      points.push({ x: halfWidth, y: halfHeight });    // Top-right
      points.push({ x: halfWidth, y: -halfHeight });   // Bottom-right
      points.push({ x: -halfWidth, y: -halfHeight });  // Bottom-left

      console.log(`🔸 Generated rectangle with ${points.length} vertices (${width.toFixed(1)}x${height.toFixed(1)})`);
      return points;
    }

    // Use the smaller dimension to determine the polygon radius (so it fits in the bounding box)
    const radius = Math.min(width, height) / 2;

    let sides: number;
    let startAngle: number;

    switch (polygonType) {
      case 'circle':
        sides = 12; // Use 12 sides for smoother circle approximation
        startAngle = 0;
        break;
      case 'triangle':
        sides = 3;
        // Triangle should have point up (vertex at top)
        startAngle = Math.PI / 2;
        break;
      case 'pentagon':
        sides = 5;
        // Pentagon with flat top: rotate by half a vertex step
        // Vertex separation is 2π/5, so for flat top we rotate by π/5
        startAngle = Math.PI / 2 + Math.PI / 5; // 90° + 36° = 126°
        break;
      case 'hexagon':
        sides = 6;
        // Hexagon: this was working correctly
        startAngle = Math.PI / 2 - Math.PI / 6; // 90° - 30° = 60°
        break;
      case 'octagon':
        sides = 8;
        // Octagon with flat top: rotate by half a vertex step  
        // Vertex separation is 2π/8, so for flat top we rotate by π/8
        startAngle = Math.PI / 2 + Math.PI / 8; // 90° + 22.5° = 112.5°
        break;
      default:
        console.warn(`Unknown polygon type: ${polygonType}, defaulting to hexagon`);
        sides = 6;
        startAngle = Math.PI / 2 - Math.PI / 6;
    }

    // Generate polygon points in a circle
    for (let i = 0; i < sides; i++) {
      const polygonAngle = (2 * Math.PI * i / sides) + startAngle;
      const x = radius * Math.cos(polygonAngle);
      const y = radius * Math.sin(polygonAngle);
      points.push({ x, y });
    }

    console.log(`🔸 Generated ${sides}-sided ${polygonType} with ${points.length} vertices (startAngle=${(startAngle * 180 / Math.PI).toFixed(1)}°)`);
    return points;
  }

  private createRoundedPolygonVertexData(polygonPoints: Array<{ x: number, y: number }>, borderRadius: number, width: number, height: number): VertexData {
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    console.log(`🔍 Using round-polygon library for ${polygonPoints.length}-sided polygon (radius=${borderRadius.toFixed(1)}):`);
    console.log(`   Input polygon points:`, polygonPoints);
    console.log(`   Shape dimensions: ${width.toFixed(1)} × ${height.toFixed(1)}`);

    // Generate rounded polygon using the library
    const roundedPolygon = roundPolygon(polygonPoints, borderRadius);
    console.log(`   Generated ${roundedPolygon.length} rounded corner points`);
    console.log(`   First few rounded points:`, roundedPolygon.slice(0, 5));

    if (roundedPolygon.length === 0) {
      console.error(`❌ round-polygon library returned empty result! Input:`, {
        polygonPoints,
        borderRadius,
        width,
        height
      });
      // Fallback to sharp polygon
      return this.createSharpPolygonVertexData(polygonPoints, width, height);
    }

    // Convert arcs to segments for triangulation with high resolution
    const segmentLength = Math.max(0.3, borderRadius / 10);
    const segments = getSegments(roundedPolygon, "LENGTH", segmentLength);
    console.log(`   Generated ${segments.length} segments for smooth curves (segment length: ${segmentLength.toFixed(2)})`);

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

    console.log(`   Created ${vertices.length} vertices from segments`);

    // Use fan triangulation for the polygon
    this.earClipTriangulation(vertices, indices);

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;

    console.log(`🎨 Generated rounded ${polygonPoints.length}-sided polygon: ${vertices.length} vertices, ${indices.length / 3} triangles`);

    return vertexData;
  }

  private createSharpPolygonVertexData(polygonPoints: Array<{ x: number, y: number }>, width: number, height: number): VertexData {
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

    console.log(`   Created ${vertices.length} vertices for sharp polygon`);

    // Use fan triangulation for the polygon
    this.earClipTriangulation(vertices, indices);

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;

    console.log(`🎨 Generated sharp ${polygonPoints.length}-sided polygon: ${vertices.length} vertices, ${indices.length / 3} triangles`);

    return vertexData;
  }

  private createPolygonFrameVertexData(polygonType: string, width: number, height: number, borderWidth: number, borderRadius: number): VertexData {
    console.log(`🖼️ createPolygonFrameVertexData: ${polygonType}, ${width.toFixed(1)}×${height.toFixed(1)}, borderWidth=${borderWidth.toFixed(3)}, borderRadius=${borderRadius.toFixed(3)}`);

    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    // Generate outer polygon points (actual size) with default angles
    const outerPolygonPoints = this.generatePolygonPoints(polygonType, width, height);

    // Generate inner polygon points (reduced by border width)
    // For rectangles, reduce both width and height by 2*borderWidth (border on both sides)
    // For circles, reduce radius by borderWidth
    let innerWidth, innerHeight;

    if (polygonType === 'circle') {
      // For circles, reduce radius by border width
      const outerRadius = Math.min(width, height) / 2;
      const innerRadius = Math.max(0.1, outerRadius - borderWidth);
      const innerScale = innerRadius / outerRadius;
      innerWidth = width * innerScale;
      innerHeight = height * innerScale;
    } else {
      // For rectangles and other polygons, reduce dimensions by 2*borderWidth (border on both sides)
      innerWidth = Math.max(0.2, width - 2 * borderWidth);
      innerHeight = Math.max(0.2, height - 2 * borderWidth);
    }

    const innerPolygonPoints = this.generatePolygonPoints(polygonType, innerWidth, innerHeight);

    console.log(`🔧 Creating polygon border frame:`, {
      polygonType,
      outerDimensions: `${width.toFixed(2)}×${height.toFixed(2)}`,
      innerDimensions: `${innerWidth.toFixed(2)}×${innerHeight.toFixed(2)}`,
      borderWidth: borderWidth.toFixed(2),
      outerPoints: outerPolygonPoints.length,
      innerPoints: innerPolygonPoints.length
    });

    if (borderRadius > 0) {
      console.log(`✅ Creating ROUNDED polygon border with radius ${borderRadius.toFixed(3)}`);
      // Create rounded polygon border
      return this.createRoundedPolygonFrameVertexData(
        outerPolygonPoints, innerPolygonPoints, borderRadius, width, height, borderWidth
      );
    } else {
      console.log(`⚠️ Creating SHARP polygon border (borderRadius=${borderRadius})`);
      // Create sharp polygon border
      return this.createSharpPolygonFrameVertexData(
        outerPolygonPoints, innerPolygonPoints, width, height
      );
    }
  }

  private createRoundedPolygonFrameVertexData(outerPoints: Array<{ x: number, y: number }>, innerPoints: Array<{ x: number, y: number }>, borderRadius: number, width: number, height: number, borderWidth: number): VertexData {
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    console.log(`🔍 Using round-polygon library for polygon border (radius=${borderRadius.toFixed(1)}):`);


    // Generate rounded outer polygon
    const roundedOuter = roundPolygon(outerPoints, borderRadius);
    const segmentLength = Math.max(0.3, borderRadius / 10);
    const outerSegments = getSegments(roundedOuter, "LENGTH", segmentLength);

    // Generate rounded inner polygon with proportionally smaller radius
    // Use exact geometric subtraction for concentric corners
    // innerRadius = outerRadius - borderWidth
    const innerBorderRadius = Math.max(0, borderRadius - borderWidth);
    const roundedInner = roundPolygon(innerPoints, innerBorderRadius);
    const innerSegments = getSegments(roundedInner, "LENGTH", segmentLength);

    console.log(`   Border radius: outer=${borderRadius.toFixed(3)}, inner=${innerBorderRadius.toFixed(3)}`);
    console.log(`   Generated ${outerSegments.length} outer segments, ${innerSegments.length} inner segments`);

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

    console.log(`🎨 Generated rounded polygon border: ${outerVertices.length + innerVertices.length} vertices, ${indices.length / 3} triangles`);

    return vertexData;
  }

  private createSharpPolygonFrameVertexData(outerPoints: Array<{ x: number, y: number }>, innerPoints: Array<{ x: number, y: number }>, width: number, height: number): VertexData {
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

    console.log(`🎨 Generated sharp polygon border: ${outerVertices.length + innerVertices.length} vertices, ${indices.length / 3} triangles`);

    return vertexData;
  }

  private createBorderStrips(outerVertices: number[], innerVertices: number[], indices: number[]): void {
    const outerCount = outerVertices.length;
    const innerCount = innerVertices.length;

    if (outerCount === innerCount) {
      // Same number of vertices - create simple strips
      for (let i = 0; i < outerCount; i++) {
        const nextI = (i + 1) % outerCount;

        // Create two triangles for each segment of the border frame
        indices.push(outerVertices[i], innerVertices[i], outerVertices[nextI]);
        indices.push(innerVertices[i], innerVertices[nextI], outerVertices[nextI]);
      }
    } else {
      // Different vertex counts - use ratio-based mapping
      console.log(`⚠️ Vertex count mismatch: outer=${outerCount}, inner=${innerCount} - using ratio mapping`);

      for (let i = 0; i < outerCount; i++) {
        const nextI = (i + 1) % outerCount;

        // Map to inner vertices using ratio
        const innerI = Math.floor((i * innerCount) / outerCount) % innerCount;
        const nextInnerI = Math.floor((nextI * innerCount) / outerCount) % innerCount;

        // Create triangles
        indices.push(outerVertices[i], innerVertices[innerI], outerVertices[nextI]);
        if (innerI !== nextInnerI) {
          indices.push(innerVertices[innerI], innerVertices[nextInnerI], outerVertices[nextI]);
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

  createBorderMesh(name: string, elementWidth: number, elementHeight: number, borderWidth: number, borderRadius: number = 0): Mesh[] {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    // If we have border radius, create rounded borders
    if (borderRadius > 0) {
      return this.createRoundedBorderMesh(name, elementWidth, elementHeight, borderWidth, borderRadius);
    }

    // Otherwise, use the existing rectangular border system
    return this.createRectangularBorderMesh(name, elementWidth, elementHeight, borderWidth);
  }

  createPolygonBorder(name: string, polygonType: string, width: number, height: number, borderWidth: number, borderRadius: number = 0): Mesh[] {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    try {
      // Create polygon border frame using custom vertex data with default angles
      const vertexData = this.createPolygonFrameVertexData(
        polygonType, width, height, borderWidth, borderRadius
      );

      const borderMesh = new Mesh(`${name}_polygon_border_frame`, this.scene);
      vertexData.applyToMesh(borderMesh);

      console.log(`✅ Created polygon border frame for ${name} (${polygonType})`);
      return [borderMesh];
    } catch (error) {
      console.warn('Failed to create polygon border, falling back to rectangular:', error);
      return this.createRectangularBorderMesh(name, width, height, borderWidth);
    }
  }

  private createRectangularBorderMesh(name: string, elementWidth: number, elementHeight: number, borderWidth: number): Mesh[] {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    // Get unified border dimensions from camera service for consistency
    let borderDimensions;
    if (this.cameraService) {
      // Use a dummy center position just to get the dimensions calculation
      const layout = this.cameraService.calculateUnifiedBorderLayout(0, 0, 0, elementWidth, elementHeight, borderWidth);
      borderDimensions = layout.borderDimensions;
    } else {
      // Fallback calculation if camera service not available
      borderDimensions = {
        horizontal: { width: elementWidth + (borderWidth * 2), height: borderWidth },
        vertical: { width: borderWidth, height: elementHeight }
      };
    }

    // Create 4 border rectangles using unified dimensions
    const borders: Mesh[] = [];

    // Top border - uses horizontal dimensions
    const topBorder = MeshBuilder.CreatePlane(`${name}-top`, {
      width: borderDimensions.horizontal.width,
      height: borderDimensions.horizontal.height
    }, this.scene);
    borders.push(topBorder);

    // Bottom border - uses horizontal dimensions  
    const bottomBorder = MeshBuilder.CreatePlane(`${name}-bottom`, {
      width: borderDimensions.horizontal.width,
      height: borderDimensions.horizontal.height
    }, this.scene);
    borders.push(bottomBorder);

    // Left border - uses vertical dimensions
    const leftBorder = MeshBuilder.CreatePlane(`${name}-left`, {
      width: borderDimensions.vertical.width,
      height: borderDimensions.vertical.height
    }, this.scene);
    borders.push(leftBorder);

    // Right border - uses vertical dimensions
    const rightBorder = MeshBuilder.CreatePlane(`${name}-right`, {
      width: borderDimensions.vertical.width,
      height: borderDimensions.vertical.height
    }, this.scene);
    borders.push(rightBorder);

    console.log('🎯 Unified border mesh creation:', {
      elementSize: `${elementWidth.toFixed(6)} x ${elementHeight.toFixed(6)}`,
      originalBorderWidth: borderWidth.toFixed(6),
      snappedBorderWidth: this.cameraService ?
        this.cameraService.snapBorderWidthToPixel(borderWidth).toFixed(6) : 'N/A',
      dimensions: {
        horizontal: {
          width: borderDimensions.horizontal.width.toFixed(6),
          height: borderDimensions.horizontal.height.toFixed(6)
        },
        vertical: {
          width: borderDimensions.vertical.width.toFixed(6),
          height: borderDimensions.vertical.height.toFixed(6)
        }
      },
      meshNames: [`${name}-top`, `${name}-bottom`, `${name}-left`, `${name}-right`]
    });

    return borders;
  }

  private createRoundedBorderMesh(name: string, elementWidth: number, elementHeight: number, borderWidth: number, borderRadius: number): Mesh[] {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    try {
      // Create rounded border frame using custom vertex data
      const vertexData = this.createRoundedFrameVertexData(
        elementWidth, elementHeight, borderRadius,
        elementWidth - 2 * borderWidth, elementHeight - 2 * borderWidth,
        Math.max(0, borderRadius - borderWidth)
      );

      const borderMesh = new Mesh(`${name}_border_frame`, this.scene);
      vertexData.applyToMesh(borderMesh);

      // Apply border material
      const material = new StandardMaterial(`${name}_border_material`, this.scene);
      material.diffuseColor = Color3.White();
      material.emissiveColor = Color3.White().scale(0.1);
      borderMesh.material = material;

      console.log(`✅ Created rounded border frame for ${name}`);
      return [borderMesh];
    } catch (error) {
      console.warn('Failed to create rounded border, falling back to rectangular:', error);
      return this.createRectangularBorderMesh(name, elementWidth, elementHeight, borderWidth);
    }
  }

  private createRoundedFrameVertexData(outerWidth: number, outerHeight: number, outerRadius: number, innerWidth: number, innerHeight: number, innerRadius: number): VertexData {
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    let vertexIndex = 0;
    const segments = 8;

    // Helper function to add a vertex
    const addVertex = (x: number, y: number) => {
      positions.push(x, y, 0);
      normals.push(0, 0, 1);
      uvs.push(0.5 + x / outerWidth, 0.5 + y / outerHeight); // Simple UV mapping
      return vertexIndex++;
    };

    // Generate outer perimeter vertices
    const outerVertices = this.generateRoundedPerimeter(outerWidth, outerHeight, outerRadius, segments, addVertex);

    // Generate inner perimeter vertices  
    const innerVertices = this.generateRoundedPerimeter(innerWidth, innerHeight, innerRadius, segments, addVertex);

    // Create triangular strips between outer and inner perimeters
    for (let i = 0; i < outerVertices.length; i++) {
      const nextI = (i + 1) % outerVertices.length;

      // Create two triangles for each segment of the frame
      indices.push(outerVertices[i], innerVertices[i], outerVertices[nextI]);
      indices.push(innerVertices[i], innerVertices[nextI], outerVertices[nextI]);
    }

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;

    return vertexData;
  }

  private generateRoundedPerimeter(width: number, height: number, radius: number, segments: number, addVertex: (x: number, y: number) => number): number[] {
    const vertices: number[] = [];
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Clamp radius
    const maxRadius = Math.min(halfWidth, halfHeight);
    const clampedRadius = Math.min(radius, maxRadius);

    // Top edge
    vertices.push(addVertex(-halfWidth + clampedRadius, halfHeight));
    vertices.push(addVertex(halfWidth - clampedRadius, halfHeight));

    // Top-right corner
    for (let i = 0; i <= segments; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI / 2) / segments;
      const x = (halfWidth - clampedRadius) + clampedRadius * Math.cos(angle);
      const y = (halfHeight - clampedRadius) + clampedRadius * Math.sin(angle);
      vertices.push(addVertex(x, y));
    }

    // Right edge
    vertices.push(addVertex(halfWidth, halfHeight - clampedRadius));
    vertices.push(addVertex(halfWidth, -halfHeight + clampedRadius));

    // Bottom-right corner
    for (let i = 0; i <= segments; i++) {
      const angle = 0 + (i * Math.PI / 2) / segments;
      const x = (halfWidth - clampedRadius) + clampedRadius * Math.cos(angle);
      const y = (-halfHeight + clampedRadius) + clampedRadius * Math.sin(angle);
      vertices.push(addVertex(x, y));
    }

    // Bottom edge
    vertices.push(addVertex(halfWidth - clampedRadius, -halfHeight));
    vertices.push(addVertex(-halfWidth + clampedRadius, -halfHeight));

    // Bottom-left corner
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI / 2 + (i * Math.PI / 2) / segments;
      const x = (-halfWidth + clampedRadius) + clampedRadius * Math.cos(angle);
      const y = (-halfHeight + clampedRadius) + clampedRadius * Math.sin(angle);
      vertices.push(addVertex(x, y));
    }

    // Left edge
    vertices.push(addVertex(-halfWidth, -halfHeight + clampedRadius));
    vertices.push(addVertex(-halfWidth, halfHeight - clampedRadius));

    // Top-left corner
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI + (i * Math.PI / 2) / segments;
      const x = (-halfWidth + clampedRadius) + clampedRadius * Math.cos(angle);
      const y = (halfHeight - clampedRadius) + clampedRadius * Math.sin(angle);
      vertices.push(addVertex(x, y));
    }

    return vertices;
  }

  positionBorderFrames(borders: Mesh[], centerX: number, centerY: number, centerZ: number, elementWidth: number, elementHeight: number, borderWidth: number): void {
    if (!borders || borders.length === 0) return;

    // Handle rounded borders (single mesh)
    if (borders.length === 1) {
      const borderMesh = borders[0];
      // Add a consistent Z offset to ensure visibility and avoid Z-fighting, matching rectangular borders
      const borderZ = centerZ + 0.05;
      borderMesh.position.set(centerX, centerY, borderZ);
      console.log(`🎯 Positioned rounded border at (${centerX.toFixed(3)}, ${centerY.toFixed(3)}, ${borderZ.toFixed(3)})`);
      return;
    }

    // Handle rectangular borders (4 meshes)
    if (borders.length !== 4) {
      console.warn(`Unexpected border count: ${borders.length}, expected 1 or 4`);
      return;
    }

    const [topBorder, bottomBorder, leftBorder, rightBorder] = borders;

    // Use unified border layout calculation for complete consistency
    if (!this.cameraService) {
      console.warn('Camera service not available - using fallback positioning');
      return;
    }

    const layout = this.cameraService.calculateUnifiedBorderLayout(
      centerX, centerY, centerZ,
      elementWidth, elementHeight,
      borderWidth
    );

    // Apply calculated positions directly - no additional calculations needed
    topBorder.position.set(
      layout.borderPositions.top.x,
      layout.borderPositions.top.y,
      layout.borderPositions.top.z
    );

    bottomBorder.position.set(
      layout.borderPositions.bottom.x,
      layout.borderPositions.bottom.y,
      layout.borderPositions.bottom.z
    );

    leftBorder.position.set(
      layout.borderPositions.left.x,
      layout.borderPositions.left.y,
      layout.borderPositions.left.z
    );

    rightBorder.position.set(
      layout.borderPositions.right.x,
      layout.borderPositions.right.y,
      layout.borderPositions.right.z
    );

    console.log('🎯 Unified border positioning applied:', {
      elementCenter: `(${centerX.toFixed(3)}, ${centerY.toFixed(3)}, ${centerZ.toFixed(3)})`,
      elementSize: `${elementWidth.toFixed(3)} x ${elementHeight.toFixed(3)}`,
      originalBorderWidth: borderWidth.toFixed(6),
      snappedBorderWidth: layout.snappedBorderWidth.toFixed(6),
      widthDifference: (layout.snappedBorderWidth - borderWidth).toFixed(6),
      zPositions: {
        element: centerZ.toFixed(6),
        borders: layout.borderPositions.top.z.toFixed(6),
        offset: (layout.borderPositions.top.z - centerZ).toFixed(6)
      },
      elementBounds: {
        left: layout.elementBounds.left.toFixed(6),
        right: layout.elementBounds.right.toFixed(6),
        top: layout.elementBounds.top.toFixed(6),
        bottom: layout.elementBounds.bottom.toFixed(6)
      },
      borderDimensions: {
        horizontalMeshes: `${layout.borderDimensions.horizontal.width.toFixed(3)} x ${layout.borderDimensions.horizontal.height.toFixed(6)}`,
        verticalMeshes: `${layout.borderDimensions.vertical.width.toFixed(6)} x ${layout.borderDimensions.vertical.height.toFixed(3)}`
      },
      finalPositions: {
        top: `(${layout.borderPositions.top.x.toFixed(6)}, ${layout.borderPositions.top.y.toFixed(6)}, ${layout.borderPositions.top.z.toFixed(6)})`,
        bottom: `(${layout.borderPositions.bottom.x.toFixed(6)}, ${layout.borderPositions.bottom.y.toFixed(6)}, ${layout.borderPositions.bottom.z.toFixed(6)})`,
        left: `(${layout.borderPositions.left.x.toFixed(6)}, ${layout.borderPositions.left.y.toFixed(6)}, ${layout.borderPositions.left.z.toFixed(6)})`,
        right: `(${layout.borderPositions.right.x.toFixed(6)}, ${layout.borderPositions.right.y.toFixed(6)}, ${layout.borderPositions.right.z.toFixed(6)})`
      }
    });
  }

  createMaterial(name: string, diffuseColor: Color3, emissiveColor?: Color3, opacity: number = 1.0): StandardMaterial {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = diffuseColor;

    // Add slight emissive color to match HTML/CSS brightness
    // This makes colors appear more vibrant and closer to web rendering
    material.emissiveColor = diffuseColor.scale(0.3); // 30% of diffuse color as emissive

    material.backFaceCulling = false;

    // Clean settings for sharp edges
    material.specularColor = new Color3(0, 0, 0); // No specular reflection

    material.roughness = 0;

    //material.fillMode = Material.TriangleFillMode;

    // Apply opacity/transparency - always set alpha
    material.alpha = opacity;

    // Enhanced transparency settings for better rendering
    if (opacity < 1.0) {
      material.transparencyMode = Material.MATERIAL_ALPHABLEND;
      material.separateCullingPass = true;
      material.useAlphaFromDiffuseTexture = false;
      console.log(`🎨 Material transparency applied: ${name} opacity=${opacity} (${Math.round(opacity * 100)}%)`);
    } else {
      material.transparencyMode = Material.MATERIAL_OPAQUE;
      console.log(`🎨 Material opaque: ${name} opacity=${opacity}`);
    }

    return material;
  }

  createDropShadowMaterial(name: string, elementWidth: number, elementHeight: number, blur: number, color: string, offsetX: number, offsetY: number, borderRadius: number): ShaderMaterial {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    // Parse shadow color
    const shadowColor = Color3.FromHexString(color);

    // Register shaders if not already registered
    if (!Effect.ShadersStore["dropShadowVertexShader"]) {
      // Register vertex shader
      Effect.ShadersStore["dropShadowVertexShader"] = `
        precision highp float;
        
        attribute vec3 position;
        attribute vec2 uv;
        
        uniform mat4 worldViewProjection;
        
        varying vec2 vUV;
        
        void main(void) {
            gl_Position = worldViewProjection * vec4(position, 1.0);
            vUV = uv;
        }
      `;

      // Register fragment shader
      Effect.ShadersStore["dropShadowFragmentShader"] = `
        precision highp float;
        
        varying vec2 vUV;
        
        uniform vec2 elementSize;
        uniform float shadowBlur;
        uniform vec3 shadowColor;
        uniform vec2 shadowOffset;
        uniform float borderRadius;
        
        float roundedRectSDF(vec2 p, vec2 size, float radius) {
            vec2 d = abs(p) - size + radius;
            return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - radius;
        }
        
        void main(void) {
            vec2 coord = vUV - 0.5;
            
            // Scale coordinates to element size (mesh is now same size as element)
            vec2 scaledCoord = coord * elementSize;
            
            // Apply shadow offset
            vec2 shadowCoord = scaledCoord - shadowOffset;
            
            // Calculate distance to the element rectangle with border radius
            float elementDist = roundedRectSDF(shadowCoord, elementSize * 0.5, borderRadius);
            
            // Create shadow falloff - shadow starts right at element edge
            float shadowFalloff = 1.0 - smoothstep(-shadowBlur * 0.2, shadowBlur * 0.8, elementDist);
            
            // Shadow is visible both inside and outside element, but stronger outside
            float shadowAlpha = shadowFalloff * 0.4;
            
            // Reduce shadow inside the element to create proper drop shadow effect
            if (elementDist < -shadowBlur * 0.1) {
                shadowAlpha *= 0.05; // Much weaker inside element core
            } else if (elementDist < 0.0) {
                shadowAlpha *= 0.3; // Moderate shadow at element edges
            }
            
            // Discard pixels with very low alpha to improve performance
            if (shadowAlpha < 0.01) discard;
            
            gl_FragColor = vec4(shadowColor, shadowAlpha);
        }
      `;

      console.log(`🎨 Registered drop shadow shaders`);
    }

    // Create custom shader material for drop shadow
    const shaderMaterial = new ShaderMaterial(`${name}-shader`, this.scene, "dropShadow", {
      attributes: ["position", "uv"],
      uniforms: ["worldViewProjection", "elementSize", "shadowBlur", "shadowColor", "shadowOffset", "borderRadius"]
    });

    // Set shader uniforms
    shaderMaterial.setVector2("elementSize", new Vector2(elementWidth, elementHeight));
    shaderMaterial.setFloat("shadowBlur", blur);
    shaderMaterial.setColor3("shadowColor", shadowColor);
    shaderMaterial.setVector2("shadowOffset", new Vector2(offsetX, offsetY));
    shaderMaterial.setFloat("borderRadius", borderRadius);

    // Enable transparency and proper depth testing
    shaderMaterial.transparencyMode = Material.MATERIAL_ALPHABLEND;
    shaderMaterial.backFaceCulling = false;
    shaderMaterial.disableDepthWrite = true; // Don't write to depth buffer (allows proper transparency)
    shaderMaterial.needDepthPrePass = true; // Ensure proper depth testing order for z-sorting

    // Set rendering group to ensure shadows render before other elements
    // This helps with z-ordering issues during hover

    console.log(`🎨 Created drop shadow shader material: ${name} blur=${blur} color=${color}`);

    return shaderMaterial;
  }

  createGradientMaterial(name: string, gradientData: LinearGradientDefinition, opacity: number = 1.0, width: number, height: number): StandardMaterial {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    const material = new StandardMaterial(name, this.scene);

    // Create a texture for the gradient
    const textureSize = 256; // Size of the texture
    const texture = new DynamicTexture(`${name}-gradient-texture`, { width: textureSize, height: textureSize }, this.scene);

    // Get the texture context to draw the gradient
    const context = texture.getContext() as CanvasRenderingContext2D;

    this.drawLinearGradient(context, textureSize, gradientData);

    // Update the texture
    texture.update();

    // Apply the texture to the material
    material.diffuseTexture = texture;
    material.emissiveColor = new Color3(0, 0, 0);
    material.specularColor = new Color3(0, 0, 0);
    material.backFaceCulling = false;
    material.roughness = 0;

    // Apply opacity
    material.alpha = opacity;
    if (opacity < 1.0) {
      material.transparencyMode = Material.MATERIAL_ALPHABLEND;
      material.separateCullingPass = true;
    } else {
      material.transparencyMode = Material.MATERIAL_OPAQUE;
    }

    console.log(`🎨 Created gradient material: ${name} (linear) opacity=${opacity}`);

    return material;
  }

  private drawLinearGradient(context: CanvasRenderingContext2D, size: number, gradientData: LinearGradientDefinition): void {
    const angleRadians = (gradientData.angle % 360) * (Math.PI / 180);

    const diagonal = Math.sqrt(2) * (size / 2);
    const centerX = size / 2;
    const centerY = size / 2;

    const x1 = centerX - diagonal * Math.cos(angleRadians);
    const y1 = centerY - diagonal * Math.sin(angleRadians);
    const x2 = centerX + diagonal * Math.cos(angleRadians);
    const y2 = centerY + diagonal * Math.sin(angleRadians);

    const gradient = context.createLinearGradient(x1, y1, x2, y2);

    gradientData.stops.forEach((stop: GradientStop) => {
      const colorString = `rgba(${Math.round(stop.color.r * 255)}, ${Math.round(stop.color.g * 255)}, ${Math.round(stop.color.b * 255)}, ${stop.alpha})`;
      gradient.addColorStop(stop.offset, colorString);
    });

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    console.log(`🎨 Drew linear gradient angle=${gradientData.angle} stops=${gradientData.stops.length}`);
  }

  createShadow(name: string, width: number, height: number, offsetX: number, offsetY: number, blur: number, color: string, polygonType: string = 'rectangle', borderRadius: number = 0): Mesh {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    console.log(`🌒 Creating shader-based drop shadow: ${name}`);
    console.log(`🌒 Shadow parameters: width=${width}, height=${height}, blur=${blur}, color=${color}, offset=(${offsetX}, ${offsetY})`);

    // Create a single mesh with a custom shader material for the drop shadow effect
    // Make shadow mesh same size as element - shader will handle the blur expansion
    const shadowMesh = this.createSingleShadow(name, width, height, polygonType, borderRadius);

    // Create custom shader material for drop shadow effect
    const shadowMaterial = this.createDropShadowMaterial(name, width, height, blur, color, offsetX, offsetY, borderRadius);
    shadowMesh.material = shadowMaterial;

    // Shadow will inherit rendering group from its parent element
    // This ensures it stays in the same rendering layer as the element

    console.log(`🌒 Created shader-based drop shadow: ${name} (${width}x${height}) blur=${blur}px color=${color}`);

    return shadowMesh;
  }

  private createSingleShadow(name: string, width: number, height: number, polygonType: string, borderRadius: number = 0): Mesh {
    let shadowMesh: Mesh;

    // Create shadow mesh based on the same shape as the element
    if (polygonType === 'rectangle') {
      if (borderRadius > 0) {
        shadowMesh = this.createRoundedRectangle(name, width, height, borderRadius);
      } else {
        shadowMesh = this.createPlane(name, width, height);
      }
    } else {
      shadowMesh = this.createPolygon(name, polygonType, width, height, borderRadius);
    }

    return shadowMesh;
  }

  private createHollowShadow(name: string, width: number, height: number, polygonType: string, borderRadius: number = 0, shadowWidth: number = 2): Mesh {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    // Create a hollow shadow by creating a frame (outer shape minus inner shape)
    // This creates the effect of a shadow that only appears around the edges

    const shadowFrameWidth = Math.max(shadowWidth, 1); // Minimum 1 unit shadow width

    if (polygonType === 'rectangle') {
      // For rectangles, create a border frame
      const borderMeshes = this.createRectangularBorderMesh(name, width, height, shadowFrameWidth);

      if (borderMeshes.length === 4) {
        // Combine the 4 border pieces into a single mesh
        const combinedMesh = new Mesh(`${name}-combined`, this.scene);

        // Parent all border pieces to the combined mesh
        borderMeshes.forEach((borderMesh, index) => {
          borderMesh.parent = combinedMesh;
          // Position border pieces to form a frame
          this.positionBorderFrames(borderMeshes, 0, 0, 0, width, height, shadowFrameWidth);
        });

        return combinedMesh;
      } else if (borderMeshes.length === 1) {
        // Single border frame mesh (rounded borders)
        return borderMeshes[0];
      }
    }

    // Fallback: create polygon border frame
    const borderMeshes = this.createPolygonBorder(name, polygonType, width, height, shadowFrameWidth, borderRadius);

    if (borderMeshes.length === 1) {
      return borderMeshes[0];
    } else if (borderMeshes.length > 1) {
      // Combine multiple border pieces
      const combinedMesh = new Mesh(`${name}-combined`, this.scene);
      borderMeshes.forEach(borderMesh => {
        borderMesh.parent = combinedMesh;
      });
      return combinedMesh;
    }

    // Final fallback: create a simple plane (shouldn't happen)
    console.warn(`🌒 Fallback to plane shadow for ${name}`);
    return this.createPlane(name, width, height);
  }

  positionMesh(mesh: Mesh, x: number, y: number, z: number): void {
    // Use the coordinate transform service to convert from logical to render coordinates
    const renderPosition = this.coordinateTransform.transformToRenderCoordinates(x, y, z);

    mesh.position = renderPosition;
    console.log(`[BabylonMeshService] mesh.position after set: (${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`);
  }

  parentMesh(child: Mesh, parent: Mesh): void {
    child.parent = parent;
  }

  updatePolygon(mesh: Mesh, polygonType: string, width: number, height: number, borderRadius: number, borderWidth: number = 0): void {
    console.log(`🔄 Updating polygon mesh: ${mesh.name}, type=${polygonType}, size=${width.toFixed(2)}x${height.toFixed(2)}, radius=${borderRadius.toFixed(2)}, borderWidth=${borderWidth.toFixed(4)}`);

    try {
      // Create new vertex data with the updated border radius
      const vertexData = this.createPolygonVertexData(polygonType, width, height, borderRadius);

      // Apply to the mesh with updateable flag set to true
      vertexData.applyToMesh(mesh, true);

      // Refresh the bounding info to ensure proper interactions
      mesh.refreshBoundingInfo();

      // Check if there's a border mesh that needs updating too
      if (this.scene && borderWidth > 0) {
        const borderMeshName = `${mesh.name}_border_frame`;
        const borderMesh = this.scene.getMeshByName(borderMeshName);

        if (borderMesh) {
          console.log(`🔄 Found associated border mesh: ${borderMeshName}, updating with new border radius`);

          // Create new border vertex data
          const borderVertexData = this.createPolygonFrameVertexData(
            polygonType, width, height, borderWidth, borderRadius
          );

          // Apply to the border mesh
          borderVertexData.applyToMesh(borderMesh as Mesh, true);
          (borderMesh as Mesh).refreshBoundingInfo();

          console.log(`✅ Border mesh updated successfully with new border radius`);
        }
      }

      console.log(`✅ Polygon mesh updated successfully`);
    } catch (error) {
      console.error(`❌ Error updating polygon mesh:`, error);
    }
  }

  // Helper method to generate polygon vertex data without creating a mesh
  generatePolygonVertexData(polygonType: string, width: number, height: number, borderRadius: number): VertexData {
    return this.createPolygonVertexData(polygonType, width, height, borderRadius);
  }

  /**
   * Updates both a mesh and its associated border meshes with a new border radius
   * @param mesh The mesh to update (can be a mesh object or a mesh name)
   * @param polygonType The polygon type (rectangle, triangle, etc.)
   * @param width The width of the mesh
   * @param height The height of the mesh
   * @param borderRadius The new border radius to apply
   * @param borderWidth The border width (if any)
   * @param scene The BabylonJS scene
   */
  updateMeshWithBorderRadius(
    mesh: Mesh | string,
    polygonType: string,
    width: number,
    height: number,
    borderRadius: number,
    borderWidth: number = 0,
    scene?: Scene
  ): void {
    const targetScene = scene || this.scene;
    if (!targetScene) {
      throw new Error('Scene not initialized');
    }

    // Get the main mesh - either directly or by name
    let mainMesh: Mesh | null = null;
    let meshName: string = '';

    if (typeof mesh === 'string') {
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

    console.log(`🔄 Updating mesh and borders with new border radius: ${meshName}, radius=${borderRadius.toFixed(2)}`);

    try {
      // Update the main mesh geometry
      const vertexData = this.createPolygonVertexData(polygonType, width, height, borderRadius);
      vertexData.applyToMesh(mainMesh, true);
      mainMesh.refreshBoundingInfo();

      // If there's a border width, update border meshes too
      if (borderWidth > 0) {
        // Look for border meshes with pattern: meshName-border-0, meshName-border-1, etc.
        // or meshName_border_frame
        const borderMeshName = `${meshName}_border_frame`;
        const borderMesh = targetScene.getMeshByName(borderMeshName);

        if (borderMesh) {
          // Single border frame mesh - recreate it with new border radius
          console.log(`🔄 Updating border frame mesh: ${borderMeshName}`);

          // Create new border vertex data
          const borderVertexData = this.createPolygonFrameVertexData(
            polygonType, width, height, borderWidth, borderRadius
          );

          // Apply to existing mesh
          borderVertexData.applyToMesh(borderMesh as Mesh, true);
          (borderMesh as Mesh).refreshBoundingInfo();
        } else {
          // Check for individual border meshes (older style)
          for (let i = 0; i < 4; i++) {
            const oldBorderMeshName = `${meshName}-border-${i}`;
            const oldBorderMesh = targetScene.getMeshByName(oldBorderMeshName);
            if (oldBorderMesh) {
              console.log(`⚠️ Found old-style border mesh: ${oldBorderMeshName} - these cannot be updated with border radius`);
            }
          }
        }
      }

      console.log(`✅ Successfully updated mesh geometry with border radius: ${borderRadius.toFixed(2)}`);
    } catch (error) {
      console.error(`❌ Error updating mesh with border radius:`, error);
      throw error;
    }
  }

  /**
   * Updates a mesh's geometry with a new border radius
   * This method is specifically designed to fix hover state border radius issues
   */
  updateMeshBorderRadius(mesh: Mesh, width: number, height: number, borderRadius: number): void {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }

    console.log(`🔄 updateMeshBorderRadius called for mesh: ${mesh.name}, width=${width}, height=${height}, radius=${borderRadius.toFixed(2)}`);

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
          positions.push(-halfWidth, halfHeight, 0);  // Top-left
          positions.push(halfWidth, halfHeight, 0);   // Top-right
          positions.push(halfWidth, -halfHeight, 0);  // Bottom-right
          positions.push(-halfWidth, -halfHeight, 0); // Bottom-left

          indices.push(0, 1, 2); // First triangle
          indices.push(0, 2, 3); // Second triangle

          normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);

          uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
        } else {
          // With border radius - create a rounded rectangle
          // Define rectangle corners
          const rectangleCorners = [
            { x: -halfWidth, y: halfHeight },   // Top-left
            { x: halfWidth, y: halfHeight },    // Top-right
            { x: halfWidth, y: -halfHeight },   // Bottom-right
            { x: -halfWidth, y: -halfHeight }   // Bottom-left
          ];

          // Generate rounded polygon
          const roundedPolygon = roundPolygon(rectangleCorners, borderRadius);

          // Convert to segments for smooth curves
          const segmentLength = Math.max(0.3, borderRadius / 10);
          const segments = getSegments(roundedPolygon, "LENGTH", segmentLength);

          let vertexIndex = 0;
          const vertices = [];

          // Add all segment points as vertices
          for (const segment of segments) {
            positions.push(segment.x, segment.y, 0);
            normals.push(0, 0, 1);
            uvs.push((segment.x + halfWidth) / width, (segment.y + halfHeight) / height);
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

        console.log(`✅ Successfully updated mesh geometry with border radius=${borderRadius.toFixed(2)}`);
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
  createMeshWithBorderRadius(originalMesh: Mesh, width: number, height: number, borderRadius: number): Mesh {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    console.log(`🔄 Creating new mesh with border radius: width=${width}, height=${height}, radius=${borderRadius.toFixed(2)}`);

    try {
      // Create a new mesh with the desired border radius
      const newMesh = this.createRoundedRectangle(
        `${originalMesh.name}_with_radius`,
        width,
        height,
        borderRadius
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

      console.log(`✅ Successfully created new mesh with border radius=${borderRadius.toFixed(2)}`);

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
  createTextMesh(name: string, texture: Texture, width: number, height: number): Mesh {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    console.log(`📝 Creating text mesh: ${name} (${width.toFixed(3)} x ${height.toFixed(3)})`);

    try {
      // Create a plane mesh for the text
      const textPlane = MeshBuilder.CreatePlane(name, {
        width: width,
        height: height
      }, this.scene);

      // Create material for text rendering
      const textMaterial = this.createTextMaterial(`${name}_material`, texture);
      textPlane.material = textMaterial;

      // Configure mesh properties for text rendering
      textPlane.billboardMode = Mesh.BILLBOARDMODE_NONE;
      textPlane.renderingGroupId = 1; // Render after background elements

      console.log(`✅ Created text mesh: ${name} with texture material`);
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
      throw new Error('Mesh service not initialized');
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

    // Remove specular and other effects
    material.specularColor = new Color3(0, 0, 0);
    material.roughness = 1.0;

    console.log(`🎨 Created text material: ${name} with alpha support`);
    return material;
  }

  /**
   * Updates an existing text mesh with new texture content
   * @param textMesh - The text mesh to update
   * @param newTexture - New texture containing updated text
   * @param newWidth - Optional new width for the mesh
   * @param newHeight - Optional new height for the mesh
   */
  updateTextMesh(textMesh: Mesh, newTexture: Texture, newWidth?: number, newHeight?: number): void {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    console.log(`🔄 Updating text mesh: ${textMesh.name}`);

    try {
      // Update material texture
      if (textMesh.material && textMesh.material instanceof StandardMaterial) {
        const material = textMesh.material as StandardMaterial;

        // Dispose old texture if it exists
        if (material.diffuseTexture) {
          material.diffuseTexture.dispose();
        }
        if (material.emissiveTexture && material.emissiveTexture !== material.diffuseTexture) {
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

        console.log(`📏 Updated text mesh dimensions: ${newWidth.toFixed(3)} x ${newHeight.toFixed(3)}`);
      }

      console.log(`✅ Successfully updated text mesh: ${textMesh.name}`);
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
      -halfWidth, halfHeight, 0,   // Top-left
      halfWidth, halfHeight, 0,    // Top-right
      halfWidth, -halfHeight, 0,   // Bottom-right
      -halfWidth, -halfHeight, 0   // Bottom-left
    ];

    const indices = [
      0, 1, 2,  // First triangle
      0, 2, 3   // Second triangle
    ];

    const normals = [
      0, 0, 1,  // Top-left
      0, 0, 1,  // Top-right
      0, 0, 1,  // Bottom-right
      0, 0, 1   // Bottom-left
    ];

    const uvs = [
      0, 0,  // Top-left
      1, 0,  // Top-right
      1, 1,  // Bottom-right
      0, 1   // Bottom-left
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
    console.log(`🗑️ Disposing text mesh: ${textMesh.name}`);

    try {
      // Dispose material and textures
      if (textMesh.material) {
        const material = textMesh.material;

        if (material instanceof StandardMaterial) {
          // Dispose textures
          if (material.diffuseTexture) {
            material.diffuseTexture.dispose();
          }
          if (material.emissiveTexture && material.emissiveTexture !== material.diffuseTexture) {
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

      console.log(`✅ Successfully disposed text mesh and resources`);
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
    // Use the existing positionMesh method which handles coordinate transformation
    this.positionMesh(textMesh, x, y, z);
    console.log(`📍 Positioned text mesh: ${textMesh.name} at (${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)})`);
  }

  /**
   * Sets the parent of a text mesh for hierarchical transformations
   * @param textMesh - The text mesh to parent
   * @param parentMesh - The parent mesh
   */
  parentTextMesh(textMesh: Mesh, parentMesh: Mesh): void {
    this.parentMesh(textMesh, parentMesh);
    console.log(`🔗 Parented text mesh: ${textMesh.name} to ${parentMesh.name}`);
  }

  /**
   * Updates text mesh material properties for dynamic styling
   * @param textMesh - The text mesh to update
   * @param opacity - New opacity value (0-1)
   * @param color - Optional color tint (Color3)
   */
  updateTextMeshMaterial(textMesh: Mesh, opacity?: number, color?: Color3): void {
    if (!textMesh.material || !(textMesh.material instanceof StandardMaterial)) {
      console.warn(`⚠️ Text mesh ${textMesh.name} does not have a StandardMaterial`);
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

        console.log(`🎨 Updated text mesh opacity: ${textMesh.name} = ${material.alpha.toFixed(2)}`);
      }

      // Update color tint
      if (color) {
        material.diffuseColor = color;
        console.log(`🎨 Updated text mesh color: ${textMesh.name}`);
      }
    } catch (error) {
      console.error(`❌ Error updating text mesh material: ${textMesh.name}`, error);
    }
  }
}