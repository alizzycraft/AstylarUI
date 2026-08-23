import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SiteData } from '../../lib';
import { SiteComponent } from './site.component';

@Component({
  selector: 'app-simple-demo',
  standalone: true,
  imports: [CommonModule, SiteComponent],
  template: `
    <div class="fullscreen-container">
      <canvas #demoCanvas class="babylon-canvas"></canvas>
      <!-- Use astylar-render component but pass our own canvas and data -->
      <astylar-render [canvas]="demoCanvas" [siteData]="SIMPLE_SITE_DATA"></astylar-render>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 0;
      overflow: hidden;
      z-index: 1000;
    }
    
    .fullscreen-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      overflow: hidden;
    }
    
    .babylon-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100% !important;
      height: 100% !important;
      display: block;
      outline: none;
      border: none;
    }
  `]
})
export class SimpleDemoComponent {
  protected readonly SIMPLE_SITE_DATA: SiteData = {
    meta: {
      description: 'List elements test site showcasing unordered and ordered lists with automatic item stacking, different backgrounds, and spacing controls'
    },
    styles: [
      {
        selector: 'root',
        background: '#2c3e50'
      },

      // === UNORDERED LIST (Left Side) ===
      {
        selector: '#unordered-list',
        top: '10%',
        left: '5%',
        width: '40%',
        height: '85%',
        background: 'rgba(52, 73, 94, 0.3)', // Semi-transparent background to see the container
        borderRadius: '8px',
        listItemSpacing: '4px' // Reduced spacing to fit more items
      },

      // List items for unordered list (will be automatically positioned)
      {
        selector: '#ul-item-1',
        height: '100px',
        background: '#f0f0f0', // Added default background for visibility
        // No positioning needed - automatic stacking
      },
      {
        selector: '#ul-item-2',
        height: '100px',
        background: '#3498db', // Custom background for variety
      },
      {
        selector: '#ul-item-3',
        height: '100px',
        borderColor: '#cccccc', // Added default border color
        borderWidth: '2px',
        background: '#f0f0f0', // Added default background for visibility
      },

      // === ORDERED LIST (Right Side) ===
      {
        selector: '#ordered-list',
        top: '10%',
        left: '55%',
        width: '40%',
        height: '85%',
        background: 'rgba(142, 68, 173, 0.3)', // Purple semi-transparent background
        borderRadius: '8px',
        listItemSpacing: '4px' // Reduced spacing to fit more items
      },

      // List items for ordered list (will be automatically positioned)
      {
        selector: '#ol-item-1',
        background: '#e67e22', // Orange background
        height: '65px'
      },
      {
        selector: '#ol-item-2',
        background: '#f0f0f0', // Added default background for visibility
        height: '65px'
        // Default list item styling
      },
      {
        selector: '#ol-item-3',
        background: '#27ae60', // Green background
        opacity: '0.8',
        height: '65px'
      },
      {
        selector: '#ol-item-4',
        background: '#f39c12', // Yellow background
        borderRadius: '12px',
        height: '65px'
      }
    ],
    root: {
      children: [
        // Unordered list container
        {
          type: 'ul',
          id: 'unordered-list',
          children: [
            {
              type: 'li',
              id: 'ul-item-1'
            },
            {
              type: 'li',
              id: 'ul-item-2'
            },
            {
              type: 'li',
              id: 'ul-item-3'
            }
          ]
        },
        // Ordered list container
        {
          type: 'ol',
          id: 'ordered-list',
          children: [
            {
              type: 'li',
              id: 'ol-item-1'
            },
            {
              type: 'li',
              id: 'ol-item-2'
            },
            {
              type: 'li',
              id: 'ol-item-3'
            },
            {
              type: 'li',
              id: 'ol-item-4'
            }
          ]
        }
      ]
    }
  };
}
