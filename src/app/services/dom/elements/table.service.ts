import { Injectable } from '@angular/core';
import { Mesh } from '@babylonjs/core';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { DOMAncestryService } from '../dom-ancestry.service';

@Injectable({ providedIn: 'root' })
export class TableService {
  constructor(private readonly ancestry: DOMAncestryService) {}

  public processTable(dom: BabylonDOM, render: BabylonRender, tableChildren: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement: DOMElement, tableMeshOverride?: Mesh): void {
    if (!parentElement.id) {
      throw new Error("Parent table element has no id.");
    }


    if (tableMeshOverride) {

    }

    // ... rest of logging ...

    this.registerTableAncestry(tableChildren, parentElement);

    try {
      // Use existing mesh or create a new one
      const tableMesh = tableMeshOverride || this.createTableContainer(dom, render, parentElement, parent, styles);


      // Process column definitions first (col, colgroup) to establish column layout
      const columnDefinitions = this.extractColumnDefinitions(tableChildren);


      // Process caption if present
      const captionElement = tableChildren.find(child => child.type === 'caption');
      if (captionElement) {

        this.processCaption(dom, render, captionElement, tableMesh, styles);
      }

      // Check if table has explicit dimensions or needs content-based sizing
      let containerDimensions;
      try {

        containerDimensions = this.getTableContainerDimensions(dom, tableMesh);

      } catch (error) {


        // Debug: Show available elementStyles keys


        try {
          containerDimensions = this.calculateContentBasedTableDimensions(dom, tableChildren);


          // Validate calculated dimensions
          if (!containerDimensions || containerDimensions.width === null || isNaN(containerDimensions.width) || containerDimensions.height === null || isNaN(containerDimensions.height)) {
            throw new Error(`[TABLE ERROR] Content-based calculation failed for ${parentElement.id}. Result: ${JSON.stringify(containerDimensions)}`);
          }

          // Update the stored table dimensions
          dom.context.elementDimensions.set(tableMesh.name, {
            width: containerDimensions.width,
            height: containerDimensions.height,
            padding: { top: 0, right: 0, bottom: 0, left: 0 }
          });

        } catch (contentError) {
          console.error(`[TABLE DEBUG] Content-based calculation failed: ${contentError}`);
          throw contentError;
        }
      }

      // Calculate total row count across all sections for proper row height distribution
      const totalRowCount = this.calculateTotalRowCount(tableChildren);
      const totalColumnCount = this.calculateTotalColumnCount(tableChildren);


      // Calculate shared row height for all sections
      const sharedRowHeight = containerDimensions.height / totalRowCount;
      const sharedColumnWidths = this.resolveColumnWidths(
        columnDefinitions,
        containerDimensions.width,
        totalColumnCount,
      );


      // Filter out column definitions and captions from main table structure processing
      const tableStructureChildren = tableChildren.filter(child =>
        child.type !== 'col' && child.type !== 'colgroup' && child.type !== 'caption'
      );

      // Process table sections with shared dimensions and track Y position
      let currentTableY = 0;
      for (const child of tableStructureChildren) {
        if (child.type === 'tbody' || child.type === 'thead' || child.type === 'tfoot') {

          const sectionRowCount = (child.children || []).filter(c => c.type === 'tr').length;
          this.processTableSection(dom, render, child, tableMesh, styles, containerDimensions, parentElement.id, {
            sharedRowHeight,
            sharedColumnWidths,
            sectionStartY: currentTableY
          });
          currentTableY += sectionRowCount * sharedRowHeight;
        } else if (child.type === 'tr') {

          // Handle direct rows (no tbody wrapper) - create implicit tbody
          this.processDirectTableRows(dom, render, [child], tableMesh, styles, containerDimensions, parentElement.id);
        }
      }



    } catch (error) {
      console.error(`[TABLE DEBUG] Critical error in processTable for "${parentElement.id}": ${error}`);
      throw error;
    }
  }

  private createTableContainer(dom: BabylonDOM, render: BabylonRender, tableElement: DOMElement, parent: Mesh, styles: StyleRule[]): Mesh {



    // Check parent dimensions before creating table
    const parentDimensions = dom.context.elementDimensions.get(parent.name);


    // Fix: For tables, if parent is the table itself, look for the actual container parent
    let actualParentDimensions = parentDimensions;
    if (parent.name === tableElement.id) {

      // Look for the container that should be the real parent
      const containerName = tableElement.id?.replace('-table', '-container') || 'complex-container';
      actualParentDimensions = dom.context.elementDimensions.get(containerName);


      // Debug: Check what the container's parent dimensions are
      const rootDimensions = dom.context.elementDimensions.get('root-body');

      if (rootDimensions) {
        const containerExpectedHeight = rootDimensions.height * 0.7;


      }
    }

    // Check what the table's CSS height should resolve to
    if (actualParentDimensions && tableElement.id === 'complex-table') {
      const expectedHeight = actualParentDimensions.height * 0.7;

    }

    // Create the main table mesh using existing createElement
    const tableMesh = dom.actions.createElement(dom, render, tableElement, parent, styles);

    // Check if table dimensions were properly stored after creation
    const tableDimensions = dom.context.elementDimensions.get(tableMesh.name);



    return tableMesh;
  }

  private processTableSection(dom: BabylonDOM, render: BabylonRender, sectionElement: DOMElement, tableMesh: Mesh, styles: StyleRule[], containerDimensions: { width: number; height: number }, tableId: string, sharedDimensions?: { sharedRowHeight: number; sharedColumnWidths: number[]; sectionStartY: number }): void {


    // Calculate section-specific dimensions
    const sectionRows = (sectionElement.children || []).filter(c => c.type === 'tr');
    const sectionHeight = sharedDimensions ? sectionRows.length * sharedDimensions.sharedRowHeight : containerDimensions.height;
    const sectionDimensions = {
      width: containerDimensions.width,
      height: sectionHeight
    };

    // Create tbody/thead/tfoot mesh with proportional dimensions
    const sectionMesh = this.createTableSectionContainer(
      dom,
      render,
      sectionElement,
      tableMesh,
      styles,
      sectionDimensions,
      tableId,
      sharedDimensions?.sectionStartY ?? 0,
    );





    if (sectionRows.length > 0) {
      if (sharedDimensions) {

        this.processTableRowsWithSharedDimensions(dom, render, sectionRows, sectionMesh, styles, sharedDimensions, sectionElement.id || `${tableId}-${sectionElement.type}`);
      } else {
        this.processTableRows(dom, render, sectionRows, sectionMesh, styles, sectionDimensions, sectionElement.id || `${tableId}-${sectionElement.type}`);
      }
    }
  }

  private processDirectTableRows(dom: BabylonDOM, render: BabylonRender, rows: DOMElement[], tableMesh: Mesh, styles: StyleRule[], containerDimensions: { width: number; height: number }, tableId: string): void {

    this.processTableRows(dom, render, rows, tableMesh, styles, containerDimensions, tableId);
  }

  private createTableSectionContainer(dom: BabylonDOM, render: BabylonRender, sectionElement: DOMElement, tableMesh: Mesh, styles: StyleRule[], containerDimensions: { width: number; height: number }, tableId: string, sectionStartY: number): Mesh {


    // Create auto-positioned style for the section
    // We only provide layout overrides here; createElement will resolve the full style cascade
    const sectionLayoutOverride: StyleRule = {
      selector: sectionElement.id ? `#${sectionElement.id}` : sectionElement.type,
      width: `${containerDimensions.width}px`,
      height: `${containerDimensions.height}px`,
      top: `${sectionStartY}px`,
      left: '0px'
    };



    // Store layout overrides in context temporarily
    const originalId = sectionElement.id;
    const layoutId = originalId ?? `${tableId}-${sectionElement.type}-${sectionStartY}`;
    sectionElement.id = layoutId;
    const storedStyles = dom.context.elementStyles.get(layoutId);
    dom.context.elementStyles.set(layoutId, {
      normal: { ...(storedStyles?.normal || {}), ...sectionLayoutOverride },
      hover: storedStyles?.hover
    });

    // Create the section element
    const sectionMesh = dom.actions.createElement(dom, render, sectionElement, tableMesh, styles);

    // Store section dimensions for row calculations - CRITICAL for rows to find parent dimensions
    // Use the actual mesh name (which might be generated if no ID exists)
    dom.context.elementDimensions.set(sectionMesh.name, {
      width: containerDimensions.width,
      height: containerDimensions.height,
      padding: { top: 0, right: 0, bottom: 0, left: 0 }
    });


    // Restore original styles
    if (storedStyles) {
      dom.context.elementStyles.set(layoutId, storedStyles);
    } else {
      dom.context.elementStyles.delete(layoutId);
    }
    sectionElement.id = originalId;


    return sectionMesh;
  }

  private getTableContainerDimensions(dom: BabylonDOM, tableMesh: Mesh): { width: number; height: number } {
    const tableId = this.getElementIdFromMeshName(tableMesh.name);



    if (!tableId) {
      throw new Error(`[TABLE ERROR] Could not extract table ID from mesh name: ${tableMesh.name}`);
    }

    const containerDimensions = dom.context.elementDimensions.get(tableId);


    // Debug: Check parent container dimensions for percentage calculation validation
    const parentContainerDimensions = dom.context.elementDimensions.get('complex-container');


    if (parentContainerDimensions && containerDimensions) {
      const expectedHeight = parentContainerDimensions.height * 0.7;



    }

    if (!containerDimensions) {
      throw new Error(`[TABLE ERROR] No dimensions found for table ID: ${tableId}. Available keys: ${JSON.stringify(Array.from(dom.context.elementDimensions.keys()))}`);
    }



    if (containerDimensions.width === null || containerDimensions.width === undefined || isNaN(containerDimensions.width)) {
      throw new Error(`[TABLE ERROR] Table ${tableId} has null/undefined/NaN width: ${containerDimensions.width} (type: ${typeof containerDimensions.width}). Dimensions: ${JSON.stringify(containerDimensions)}`);
    }

    if (containerDimensions.height === null || containerDimensions.height === undefined) {
      throw new Error(`[TABLE ERROR] Table ${tableId} has null/undefined height. Dimensions: ${JSON.stringify(containerDimensions)}`);
    }

    const padding = containerDimensions.padding || { top: 0, right: 0, bottom: 0, left: 0 };
    const availableWidth = containerDimensions.width - padding.left - padding.right;
    const availableHeight = containerDimensions.height - padding.top - padding.bottom;

    if (availableWidth <= 0) {
      throw new Error(`[TABLE ERROR] Table ${tableId} has invalid available width: ${availableWidth}. Original width: ${containerDimensions.width}, padding: ${JSON.stringify(padding)}`);
    }

    if (availableHeight <= 0) {
      throw new Error(`[TABLE ERROR] Table ${tableId} has invalid available height: ${availableHeight}. Original height: ${containerDimensions.height}, padding: ${JSON.stringify(padding)}`);
    }

    return {
      width: availableWidth,
      height: availableHeight
    };
  }

  private processTableRowsWithSharedDimensions(dom: BabylonDOM, render: BabylonRender, tableRows: DOMElement[], parentMesh: Mesh, styles: StyleRule[], sharedDimensions: { sharedRowHeight: number; sharedColumnWidths: number[]; sectionStartY: number }, parentId: string): void {



    if (tableRows.length === 0) {
      console.warn(`[TABLE DEBUG] No table rows to process`);
      return;
    }

    // Use shared dimensions instead of calculating per-section
    const { sharedRowHeight, sharedColumnWidths, sectionStartY } = sharedDimensions;

    // The section mesh already carries the table-relative offset. Rows are
    // positioned locally so row groups do not apply that offset twice.
    let currentY = 0;
    tableRows.forEach((row, rowIndex) => {


      try {
        // Ensure unique row identification
        const originalId = row.id;
        if (!row.id) {
          row.id = `${parentMesh.name}-tr-${rowIndex}`;

        }

        const rowMesh = this.createTableRow(dom, render, row, parentMesh, styles, currentY, sharedRowHeight, parentMesh.name);


        // Restore original ID
        row.id = originalId;

        // Process cells in this row with shared column widths
        this.processTableCells(dom, render, row.children || [], rowMesh, styles, sharedColumnWidths, row);

        // Move to next row position
        currentY += sharedRowHeight;


      } catch (error) {
        console.error(`[TABLE DEBUG] Error processing table row ${row.type}#${row.id}: ${error}`);
        throw error;
      }
    });
  }

  private processTableRows(dom: BabylonDOM, render: BabylonRender, tableRows: DOMElement[], parentMesh: Mesh, styles: StyleRule[], containerDimensions: { width: number; height: number }, parentId: string): void {



    if (tableRows.length === 0) {
      console.warn(`[TABLE DEBUG] No table rows to process`);
      return;
    }

    // Calculate automatic row and column dimensions
    const { rowHeight, columnWidths } = this.calculateTableDimensions(tableRows, containerDimensions);


    // Process each row sequentially (like list items)
    let currentY = 0;
    tableRows.forEach((row, rowIndex) => {



      try {
        // Ensure unique row identification by temporarily setting an ID if none exists
        const originalId = row.id;
        if (!row.id) {
          row.id = `${parentMesh.name}-tr-${rowIndex}`;

        }

        const rowMesh = this.createTableRow(dom, render, row, parentMesh, styles, currentY, rowHeight, parentMesh.name);


        // Restore original ID
        row.id = originalId;

        // Process cells in this row
        this.processTableCells(dom, render, row.children || [], rowMesh, styles, columnWidths, row);

        // Move to next row position
        currentY += rowHeight;


      } catch (error) {
        console.error(`[TABLE DEBUG] Error processing table row ${row.type}#${row.id}: ${error}`);
        throw error;
      }
    });
  }

  private calculateTableDimensions(tableRows: DOMElement[], containerDimensions: { width: number; height: number }): { rowHeight: number; columnWidths: number[] } {
    const numRows = tableRows.length;
    const numCols = this.getMaxColumnsInTable(tableRows);






    // Calculate automatic row height (distribute evenly)
    const rowHeight = Math.floor(containerDimensions.height / numRows);


    // Calculate automatic column widths (distribute evenly)
    if (containerDimensions.width === null || containerDimensions.width === undefined || isNaN(containerDimensions.width)) {
      throw new Error(`[TABLE ERROR] Cannot calculate column widths - container width is invalid: ${containerDimensions.width}`);
    }

    if (numCols <= 0) {
      throw new Error(`[TABLE ERROR] Cannot calculate column widths - invalid number of columns: ${numCols}`);
    }

    const columnWidth = Math.floor(containerDimensions.width / numCols);
    const columnWidths = new Array(numCols).fill(columnWidth);


    return { rowHeight, columnWidths };
  }

  private calculateTotalRowCount(tableChildren: DOMElement[]): number {
    let totalRows = 0;
    for (const child of tableChildren) {
      if (child.type === 'tbody' || child.type === 'thead' || child.type === 'tfoot') {
        const sectionRows = (child.children || []).filter(c => c.type === 'tr');
        totalRows += sectionRows.length;
      } else if (child.type === 'tr') {
        totalRows += 1;
      }
    }
    return totalRows;
  }

  private calculateTotalColumnCount(tableChildren: DOMElement[]): number {
    // First check if we have column definitions
    const columnDefinitions = this.extractColumnDefinitions(tableChildren);
    if (columnDefinitions.length > 0) {

      return columnDefinitions.length;
    }

    // Fall back to analyzing table structure
    let maxCols = 0;
    for (const child of tableChildren) {
      if (child.type === 'tbody' || child.type === 'thead' || child.type === 'tfoot') {
        const sectionRows = (child.children || []).filter(c => c.type === 'tr');
        for (const row of sectionRows) {
          const cells = (row.children || []).filter(c => c.type === 'td' || c.type === 'th');
          maxCols = Math.max(maxCols, cells.length);
        }
      } else if (child.type === 'tr') {
        const cells = (child.children || []).filter(c => c.type === 'td' || c.type === 'th');
        maxCols = Math.max(maxCols, cells.length);
      }
    }
    return maxCols;
  }

  private registerTableAncestry(children: DOMElement[], parent: DOMElement): void {
    for (const child of children) {
      this.ancestry.setParent(child, parent);
      if (child.children?.length) {
        this.registerTableAncestry(child.children, child);
      }
    }
  }

  private resolveColumnWidths(
    definitions: ColumnDefinition[],
    tableWidth: number,
    columnCount: number,
  ): number[] {
    if (columnCount <= 0) {
      return [];
    }

    const widths = new Array<number | undefined>(columnCount).fill(undefined);
    let explicitTotal = 0;

    definitions.slice(0, columnCount).forEach((definition, index) => {
      const value = definition.width?.trim();
      if (!value) {
        return;
      }

      const numeric = Number.parseFloat(value);
      if (!Number.isFinite(numeric) || numeric < 0) {
        return;
      }

      const width = value.endsWith('%')
        ? tableWidth * numeric / 100
        : numeric;
      widths[index] = width;
      explicitTotal += width;
    });

    const unspecifiedCount = widths.filter(width => width === undefined).length;
    const remaining = Math.max(0, tableWidth - explicitTotal);
    const fallback = unspecifiedCount > 0
      ? remaining / unspecifiedCount
      : 0;

    return widths.map(width => width ?? fallback);
  }

  private getMaxColumnsInTable(tableRows: DOMElement[]): number {
    let maxCols = 0;

    for (const row of tableRows) {
      const cells = (row.children || []).filter(c => c.type === 'td' || c.type === 'th');
      maxCols = Math.max(maxCols, cells.length);
    }

    return Math.max(maxCols, 1); // At least 1 column
  }

  private createTableRow(dom: BabylonDOM, render: BabylonRender, rowElement: DOMElement, parent: Mesh, styles: StyleRule[], yOffset: number, rowHeight: number, parentId: string): Mesh {



    // Get parent container dimensions (could be table or tbody)
    const containerDimensions = dom.context.elementDimensions.get(parentId);


    const containerPadding = containerDimensions?.padding || { left: 0, right: 0, top: 0, bottom: 0 };

    // Calculate row dimensions
    if (!containerDimensions) {
      throw new Error(`[TABLE ERROR] No container dimensions found for parent: ${parentId}`);
    }

    if (containerDimensions.width === null || containerDimensions.width === undefined || isNaN(containerDimensions.width)) {
      throw new Error(`[TABLE ERROR] Container ${parentId} has invalid width: ${containerDimensions.width}. Full dimensions: ${JSON.stringify(containerDimensions)}`);
    }

    const rowWidth = containerDimensions.width - containerPadding.left - containerPadding.right;

    if (rowWidth <= 0) {
      throw new Error(`[TABLE ERROR] Calculated row width is invalid: ${rowWidth}. Container width: ${containerDimensions.width}, padding: ${JSON.stringify(containerPadding)}`);
    }



    // Create layout override for the row
    const rowLayoutOverride: StyleRule = {
      selector: rowElement.id ? `#${rowElement.id}` : rowElement.type,
      top: `${yOffset}px`,
      left: `${containerPadding.left}px`,
      width: `${rowWidth}px`,
      height: `${rowHeight}px`
    };

    // Store layout overrides in context temporarily
    const storedStyles = rowElement.id ? dom.context.elementStyles.get(rowElement.id) : undefined;
    if (rowElement.id) {
      dom.context.elementStyles.set(rowElement.id, {
        normal: { ...(storedStyles?.normal || {}), ...rowLayoutOverride },
        hover: storedStyles?.hover
      });
    }

    // Create the row element using existing createElement method
    const rowMesh = dom.actions.createElement(dom, render, rowElement, parent, styles);

    // Store row dimensions for cell calculations - CRITICAL for cells to find parent dimensions
    // Use the actual mesh name (which might be generated if no ID exists)
    dom.context.elementDimensions.set(rowMesh.name, {
      width: rowWidth,
      height: rowHeight,
      padding: { top: 0, right: 0, bottom: 0, left: 0 }
    });


    // Restore original styles
    if (rowElement.id && storedStyles) {
      dom.context.elementStyles.set(rowElement.id, storedStyles);
    }

    return rowMesh;
  }

  private processTableCells(dom: BabylonDOM, render: BabylonRender, cells: DOMElement[], rowMesh: Mesh, styles: StyleRule[], columnWidths: number[], rowElement: DOMElement): void {




    const tableCells = cells.filter(c => c.type === 'td' || c.type === 'th');


    let currentX = 0;
    let columnIndex = 0;

    tableCells.forEach((cell, cellIndex) => {


      // Handle colspan
      const colspan = cell.colspan || cell.tableProperties?.colspan || 1;
      const rowspan = cell.rowspan || cell.tableProperties?.rowspan || 1;


      if (colspan > 1 || rowspan > 1) {

      }

      // Calculate cell width based on colspan
      let cellWidth = 0;
      for (let i = 0; i < colspan && (columnIndex + i) < columnWidths.length; i++) {
        cellWidth += columnWidths[columnIndex + i];
      }



      try {
        if (cellWidth === null || cellWidth === undefined || isNaN(cellWidth)) {
          throw new Error(`[TABLE ERROR] Invalid cell width: ${cellWidth}. Column widths: ${JSON.stringify(columnWidths)}`);
        }

        const cellMesh = this.createTableCellWithSpanning(dom, render, cell, rowMesh, styles, currentX, cellWidth, rowMesh.name, colspan, rowspan);


        // Process cell children if any
        if (cell.children && cell.children.length > 0) {



          // Debug: Check if the cell content styles are available
          for (const child of cell.children) {

            if (child.class) {
              const childStyle = dom.context.elementStyles.get('.' + child.class) || dom.context.elementStyles.get(child.class);

            } else {

            }
            if (child.id) {
              const childStyle = dom.context.elementStyles.get(child.id);

            }
          }

          // Final check before processChildren

          dom.actions.processChildren(dom, render, cell.children, cellMesh, styles, cell);

        }

        // Move to next cell position, accounting for colspan
        currentX += cellWidth;
        columnIndex += colspan;


      } catch (error) {
        console.error(`[TABLE DEBUG] Error processing table cell ${cell.type}#${cell.id}: ${error}`);
        throw error;
      }
    });
  }

  private createTableCell(dom: BabylonDOM, render: BabylonRender, cellElement: DOMElement, rowMesh: Mesh, styles: StyleRule[], xOffset: number, cellWidth: number, rowId: string): Mesh {
    return this.createTableCellWithSpanning(dom, render, cellElement, rowMesh, styles, xOffset, cellWidth, rowId, 1, 1);
  }

  private createTableCellWithSpanning(dom: BabylonDOM, render: BabylonRender, cellElement: DOMElement, rowMesh: Mesh, styles: StyleRule[], xOffset: number, cellWidth: number, rowId: string, colspan: number, rowspan: number): Mesh {




    // Debug: Check if the cell's styles are available
    if (cellElement.id) {
      const cellIdStyle = dom.context.elementStyles.get(cellElement.id);

    }
    if (cellElement.class) {
      const cellClassStyle = dom.context.elementStyles.get('.' + cellElement.class);

    }

    // Get row dimensions for height calculation
    const rowDimensions = dom.context.elementDimensions.get(rowId);

    if (!rowDimensions) {
      throw new Error(`[TABLE ERROR] No row dimensions found for row ID: ${rowId}. Available keys: ${JSON.stringify(Array.from(dom.context.elementDimensions.keys()))}`);
    }

    // Calculate cell height based on rowspan
    let cellHeight = rowDimensions.height * rowspan;
    if (cellHeight === null || cellHeight === undefined || isNaN(cellHeight)) {
      throw new Error(`[TABLE ERROR] Invalid cell height from row ${rowId}: ${cellHeight}. Row dimensions: ${JSON.stringify(rowDimensions)}`);
    }


    // Create layout override for the cell
    const cellLayoutOverride: StyleRule = {
      selector: cellElement.id ? `#${cellElement.id}` : cellElement.type,
      top: '0px',  // Relative to row
      left: `${xOffset}px`,
      width: `${cellWidth}px`,
      height: `${cellHeight}px`
    };

    // Store layout overrides in context temporarily
    const storedStyles = cellElement.id ? dom.context.elementStyles.get(cellElement.id) : undefined;
    if (cellElement.id) {
      dom.context.elementStyles.set(cellElement.id, {
        normal: { ...(storedStyles?.normal || {}), ...cellLayoutOverride },
        hover: storedStyles?.hover
      });
    }

    // Create the cell element using existing createElement method
    const cellMesh = dom.actions.createElement(dom, render, cellElement, rowMesh, styles);



    // The generic element path has already resolved the authored cell padding. Keep
    // that content-box origin while replacing only the table algorithm's final
    // border-box dimensions. Nested controls must flow from the padded origin just
    // as they do in a browser table cell.
    const createdDimensions = dom.context.elementDimensions.get(cellMesh.name);
    dom.context.elementDimensions.set(cellMesh.name, {
      width: cellWidth,
      height: cellHeight,
      padding: createdDimensions?.padding ?? { top: 0, right: 0, bottom: 0, left: 0 }
    });

    // Restore original styles
    if (cellElement.id && storedStyles) {
      dom.context.elementStyles.set(cellElement.id, storedStyles);
    }

    return cellMesh;
  }

  private calculateContentBasedTableDimensions(dom: BabylonDOM, tableChildren: DOMElement[]): { width: number; height: number } {


    // Extract all rows from table structure
    const allRows: DOMElement[] = [];
    for (const child of tableChildren) {
      if (child.type === 'tbody' || child.type === 'thead' || child.type === 'tfoot') {
        const sectionRows = (child.children || []).filter((c: DOMElement) => c.type === 'tr');
        allRows.push(...sectionRows);
      } else if (child.type === 'tr') {
        allRows.push(child);
      }
    }


    if (allRows.length === 0) {
      throw new Error(`[TABLE ERROR] Cannot calculate content-based dimensions - no rows found`);
    }

    // Calculate maximum columns
    const maxCols = this.getMaxColumnsInTable(allRows);


    // Calculate column widths by examining cell content
    const columnWidths: number[] = [];
    for (let col = 0; col < maxCols; col++) {
      let maxColumnWidth = 0;

      for (const row of allRows) {
        const cells = (row.children || []).filter((c: DOMElement) => c.type === 'td' || c.type === 'th');
        if (cells[col]) {
          const cellContentWidth = this.calculateCellContentWidth(dom, cells[col]);
          maxColumnWidth = Math.max(maxColumnWidth, cellContentWidth);
        }
      }

      columnWidths.push(maxColumnWidth);

    }

    // Calculate row heights by examining cell content
    let totalHeight = 0;
    for (let rowIndex = 0; rowIndex < allRows.length; rowIndex++) {
      const row = allRows[rowIndex];
      const cells = (row.children || []).filter((c: DOMElement) => c.type === 'td' || c.type === 'th');

      let maxRowHeight = 0;
      for (const cell of cells) {
        const cellContentHeight = this.calculateCellContentHeight(dom, cell);
        maxRowHeight = Math.max(maxRowHeight, cellContentHeight);
      }

      totalHeight += maxRowHeight;

    }

    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);



    if (totalWidth <= 0 || totalHeight <= 0) {
      throw new Error(`[TABLE ERROR] Invalid calculated table dimensions: ${totalWidth}x${totalHeight}px`);
    }

    return {
      width: totalWidth,
      height: totalHeight
    };
  }

  private calculateCellContentWidth(dom: BabylonDOM, cell: DOMElement): number {



    // Look for explicit cell content dimensions
    if (cell.children && cell.children.length > 0) {
      const contentChild = cell.children[0];


      if (contentChild.class) {


        const dotClassStyle = dom.context.elementStyles.get('.' + contentChild.class);
        const classStyle = dom.context.elementStyles.get(contentChild.class);



        const contentStyle = dotClassStyle?.normal || classStyle?.normal;


        if (contentStyle?.width) {
          const width = typeof contentStyle.width === 'string' ? parseFloat(contentStyle.width) : contentStyle.width;

          if (!isNaN(width)) {
            return width;
          } else {

          }
        } else {

        }
      }
      if (contentChild.id) {
        const contentStyle = dom.context.elementStyles.get(contentChild.id)?.normal;

        if (contentStyle?.width) {
          const width = typeof contentStyle.width === 'string' ? parseFloat(contentStyle.width) : contentStyle.width;

          return width;
        }
      }
    }

    // Default minimum cell width

    return 100;
  }

  private calculateCellContentHeight(dom: BabylonDOM, cell: DOMElement): number {


    // Look for explicit cell content dimensions
    if (cell.children && cell.children.length > 0) {
      const contentChild = cell.children[0];


      if (contentChild.class) {
        const dotClassStyle = dom.context.elementStyles.get('.' + contentChild.class);
        const classStyle = dom.context.elementStyles.get(contentChild.class);
        const contentStyle = dotClassStyle?.normal || classStyle?.normal;

        if (contentStyle?.height) {
          const height = typeof contentStyle.height === 'string' ? parseFloat(contentStyle.height) : contentStyle.height;

          if (!isNaN(height)) {
            return height;
          }
        }
      }
      if (contentChild.id) {
        const contentStyle = dom.context.elementStyles.get(contentChild.id)?.normal;
        if (contentStyle?.height) {
          const height = typeof contentStyle.height === 'string' ? parseFloat(contentStyle.height) : contentStyle.height;

          if (!isNaN(height)) {
            return height;
          }
        }
      }
    }

    // Default minimum cell height

    return 30;
  }

  private getElementIdFromMeshName(meshName: string): string | null {


    // The mesh name should be the same as the element ID
    // If it's not found in elementDimensions, it might be a generated name
    if (meshName) {

      return meshName;
    }


    return null;
  }

  private extractColumnDefinitions(tableChildren: DOMElement[]): ColumnDefinition[] {
    const columnDefinitions: ColumnDefinition[] = [];

    for (const child of tableChildren) {
      if (child.type === 'colgroup') {
        // Process colgroup and its col children
        const colElements = child.children?.filter(c => c.type === 'col') || [];
        if (colElements.length > 0) {
          // Process individual col elements within colgroup
          for (const col of colElements) {
            const span = col.tableProperties?.span || 1;
            const width = col.tableProperties?.width;
            for (let i = 0; i < span; i++) {
              columnDefinitions.push({ width, span: 1 });
            }
          }
        } else {
          // Colgroup without col children - treat as single column definition
          const span = child.tableProperties?.span || 1;
          const width = child.tableProperties?.width;
          for (let i = 0; i < span; i++) {
            columnDefinitions.push({ width, span: 1 });
          }
        }
      } else if (child.type === 'col') {
        // Direct col element
        const span = child.tableProperties?.span || 1;
        const width = child.tableProperties?.width;
        for (let i = 0; i < span; i++) {
          columnDefinitions.push({ width, span: 1 });
        }
      }
    }


    return columnDefinitions;
  }

  private processCaption(dom: BabylonDOM, render: BabylonRender, captionElement: DOMElement, tableMesh: Mesh, styles: StyleRule[]): void {


    // Get table dimensions for caption positioning
    const tableDimensions = dom.context.elementDimensions.get(tableMesh.name);
    if (!tableDimensions) {
      console.warn(`[TABLE DEBUG] No table dimensions found for caption positioning`);
      return;
    }

    // Position caption above table by default (can be overridden by caption-side CSS property)
    // Create layout override for the caption
    const elementStyles = captionElement.id ? dom.context.elementStyles.get(captionElement.id) : undefined;
    const explicitStyle = elementStyles?.normal;
    const typeDefaults = render.actions.style.getElementTypeDefaults(captionElement.type);
    const captionHeight = explicitStyle?.height ? parseFloat(explicitStyle.height as string) : 30;

    const captionLayoutOverride: StyleRule = {
      selector: captionElement.id ? `#${captionElement.id}` : 'caption',
      top: `-${captionHeight + 10}px`,
      left: '0px',
      width: `${tableDimensions.width}px`,
      height: `${captionHeight}px`
    };

    // Store layout overrides in context temporarily
    if (captionElement.id) {
      dom.context.elementStyles.set(captionElement.id, {
        normal: { ...(explicitStyle || {}), ...captionLayoutOverride },
        hover: elementStyles?.hover
      });
    }

    // Create the caption element
    const captionMesh = dom.actions.createElement(dom, render, captionElement, tableMesh, styles);


    // Restore original styles
    if (captionElement.id && elementStyles) {
      dom.context.elementStyles.set(captionElement.id, elementStyles);
    }

    // Process caption children if any
    if (captionElement.children && captionElement.children.length > 0) {
      dom.actions.processChildren(dom, render, captionElement.children, captionMesh, styles, captionElement);
    }
  }
}

interface ColumnDefinition {
  width?: string;
  span: number;
}
