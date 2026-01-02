import { Injectable } from '@angular/core';
import { SiteData } from '../types/site-data';

@Injectable({
  providedIn: 'root'
})
export class SiteDataService {

  private siteData: { [key: string]: SiteData } = {
    dashboard: {
      meta: {
        description: 'Advanced features test site showcasing overlapping elements with different types, hover states, and complex styling'
      },
      styles: [
        {
          selector: 'root',
          background: '#2c3e50'
        },

        // ADVANCED FEATURES TEST: Evenly spaced element types with overlapping instances

        // === SECTION ELEMENTS (Left Column) ===
        // Background section with borders and box shadow
        {
          selector: '#section-back',
          top: '20%',
          left: '5%',
          height: '40%',
          width: '25%',
          zIndex: '1',
          borderWidth: '3px',
          borderColor: '#e74c3c',
          borderStyle: 'solid',
          boxShadow: '8px 8px 16px rgba(0,0,0,0.4)',
          // section gets dark blue background from type defaults
        },

        // Overlapping front section with opacity and border radius
        {
          selector: '#section-front',
          top: '30%',
          left: '15%',
          height: '35%',
          width: '20%',
          zIndex: '3',
          opacity: '0.9',
          borderRadius: '12px',
          borderWidth: '2px',
          borderColor: '#c0392b',
          borderStyle: 'dashed'
          // section gets dark blue background from type defaults
        },

        // Hover states for sections
        {
          selector: '#section-back:hover',
          background: '#e74c3c',
          borderColor: '#a93226',
          boxShadow: '12px 12px 24px rgba(0,0,0,0.6)'
        },

        {
          selector: '#section-front:hover',
          opacity: '1.0',
          background: '#c0392b',
          borderRadius: '18px',
          borderStyle: 'solid'
        },

        // === ARTICLE ELEMENTS (Center Column) ===
        // Background article with gradient and shadow
        {
          selector: '#article-back',
          top: '20%',      // Consistent with other back elements
          left: '37.5%',
          height: '40%',   // Consistent with other back elements  
          width: '25%',
          zIndex: '2',
          background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
          borderRadius: '8px',
          boxShadow: '6px 6px 12px rgba(39,174,96,0.3)'
        },

        // Overlapping front article with opacity and different styling
        {
          selector: '#article-front',
          top: '30%',      // Consistent 10% offset from back element
          left: '47.5%',   // Consistent 10% offset from back element
          height: '35%',   // Consistent with other front elements
          width: '20%',
          zIndex: '4',
          opacity: '0.8',
          borderRadius: '15px',
          borderWidth: '2px',
          borderColor: '#f39c12',
          borderStyle: 'dotted'
          // article gets green background from type defaults
        },

        // Hover states for articles
        {
          selector: '#article-back:hover',
          background: 'linear-gradient(135deg, #229954, #28b463)',
          boxShadow: '10px 10px 20px rgba(39,174,96,0.5)',
          borderRadius: '12px'
        },

        {
          selector: '#article-front:hover',
          opacity: '1.0',
          background: '#f39c12',
          borderColor: '#e67e22',
          borderStyle: 'solid',
          borderRadius: '20px'
        },

        // === HEADER ELEMENTS (Right Column) ===
        // Background header with borders
        {
          selector: '#header-back',
          top: '20%',
          left: '70%',
          height: '40%',
          width: '25%',
          zIndex: '1',
          borderWidth: '4px',
          borderColor: '#2980b9',
          borderStyle: 'double',
          boxShadow: '5px 5px 15px rgba(52,152,219,0.4)'
          // header gets blue background from type defaults
        },

        // Overlapping front header with gradient and opacity
        {
          selector: '#header-front',
          top: '30%',      // Consistent 10% offset from back element
          left: '80%',     // Consistent 10% offset from back element (70% + 10%)
          height: '35%',   // Consistent with other front elements
          width: '20%',
          zIndex: '5',
          opacity: '0.85',
          background: 'radial-gradient(circle, #3498db, #5dade2)',
          borderRadius: '10px',
          borderWidth: '1px',
          borderColor: '#85c1e9',
          borderStyle: 'solid'
        },

        // Hover states for headers
        {
          selector: '#header-back:hover',
          background: '#3498db',
          borderColor: '#1b4f72',
          boxShadow: '8px 8px 20px rgba(52,152,219,0.6)'
        },

        {
          selector: '#header-front:hover',
          opacity: '1.0',
          background: 'radial-gradient(circle, #2980b9, #3498db)',
          borderRadius: '15px',
          borderColor: '#2980b9'
        }
      ],
      root: {
        children: [
          // Section elements (left column)
          {
            type: 'section',
            id: 'section-back'
          },
          {
            type: 'section',
            id: 'section-front'
          },
          // Article elements (center column)
          {
            type: 'article',
            id: 'article-back'
          },
          {
            type: 'article',
            id: 'article-front'
          },
          // Header elements (right column)
          {
            type: 'header',
            id: 'header-back'
          },
          {
            type: 'header',
            id: 'header-front'
          }
        ]
      }
    },

    // LIST ELEMENTS TEST SITE
    lists: {
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
    },

    // Add other required sites with minimal data
    settings: {
      meta: {
        description: 'Settings page with minimal content - dark blue-gray background with no visible elements'
      },
      styles: [
        {
          selector: 'root',
          background: '#34495e'
        }
      ],
      root: {
        children: []
      }
    },

    // IMAGE ELEMENTS TEST SITE
    images: {
      meta: {
        description: 'Image rendering test site with different aspect ratios, hover effects, and circular images'
      },
      styles: [
        {
          selector: 'root',
          background: '#3a3a7e' // Dark blue background to make images stand out
        },

        // Portrait image (left side)
        {
          selector: '#portrait-image',
          top: '10%',
          left: '10%',
          width: '35%',
          height: '70%',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          opacity: '1.0', // Full opacity initially
          src: '/images/dark-brown-wood-texture-background-with-design-space.jpg'
        },

        {
          selector: '#portrait-image:hover',
          opacity: '0.7', // Reduced opacity on hover
          transform: 'scale(1.02)', // Slight scale effect
          boxShadow: '0 8px 16px rgba(0,0,0,0.5)'
        },

        // Landscape image (right side)
        {
          selector: '#landscape-image',
          top: '20%',
          left: '55%',
          width: '40%',
          height: '50%',
          borderRadius: '12px',
          boxShadow: '0 6px 12px rgba(0,0,0,0.4)',
          opacity: '1.0', // Full opacity initially
          src: '/images/abstract-gray-oil-paint-textured-background.jpg'
        },

        {
          selector: '#landscape-image:hover',
          opacity: '0.7', // Reduced opacity on hover
          transform: 'scale(1.05)', // More pronounced scale effect
          boxShadow: '0 12px 24px rgba(0,0,0,0.6)'
        },

        // Small circular image (bottom center)
        {
          selector: '#circular-image',
          top: '75%',
          left: '42.5%',
          width: '15%',
          height: '20%',
          borderRadius: '50%', // Make it circular
          boxShadow: '0 4px 8px rgba(0,0,0,0.8)',
          opacity: '1.0',
          src: '/images/abstract-gray-oil-paint-textured-background.jpg'
        },

        {
          selector: '#circular-image:hover',
          opacity: '0.6', // More dramatic opacity change
          transform: 'scale(1.1) rotate(5deg)', // Scale and slight rotation
          boxShadow: '0 8px 16px rgba(255,255,255,0.2)'
        }
      ],
      root: {
        children: [
          {
            type: 'img',
            id: 'portrait-image'
          },
          {
            type: 'img',
            id: 'landscape-image'
          },
          {
            type: 'img',
            id: 'circular-image'
          }
        ]
      }
    },

    links: {
      meta: {
        description: 'Interactive link elements test site with various link types including relative navigation, external links, onclick handlers, and different hover effects with scaling and color changes'
      },
      styles: [
        {
          selector: 'root',
          background: '#2c3e50' // Dark blue-gray background
        },

        // Relative link (same window) - top-left
        {
          selector: '#relative-link',
          background: '#196099',
          top: '15%',
          left: '6.25%',
          width: '25%',
          height: '12%',
          href: '/site/about', // Relative URL to another site
          target: '_self',
          borderWidth: '3px',
          borderColor: '#196099',
          borderStyle: 'solid'
        },

        {
          selector: '#relative-link:hover',
          background: '#2980b9', // Lighter blue on hover
          borderColor: '#3498db',
          borderWidth: '3px',
          borderStyle: 'solid',
          transform: 'scale(1.05)'
        },

        // Absolute link (new window) - top-center
        {
          selector: '#absolute-link',
          top: '15%',
          left: '37.5%',
          width: '25%',
          height: '12%',
          background: '#609919',
          borderColor: '#19bb42',
          href: 'https://www.example.com',
          borderWidth: '15px',
          borderStyle: 'solid',
          target: '_blank'
        },

        {
          selector: '#absolute-link:hover',
          background: '#27ae60', // Green on hover
          borderColor: '#2ecc71',
          borderWidth: '15px',
          borderStyle: 'solid',
          transform: 'scale(1.25)'
        },

        // OnClick handler (no navigation) - top-right
        {
          selector: '#onclick-link',
          top: '15%',
          left: '68.75%',
          width: '25%',
          height: '12%',
          onclick: 'console.log("Custom button clicked!")',
          background: '#e67e22', // Orange background
          borderWidth: '3px',
          borderColor: '#d35400',
          borderStyle: 'solid'
        },

        {
          selector: '#onclick-link:hover',
          background: '#f39c12', // Lighter orange on hover
          borderColor: '#e67e22',
          borderWidth: '15px',
          borderStyle: 'solid',
          transform: 'scale(1.25)'
        },

        // Combined href + onclick - middle-left
        {
          selector: '#combined-link',
          top: '40%',
          left: '6.25%',
          width: '25%',
          height: '12%',
          href: '/site/images',
          target: '_self',
          onclick: 'console.log("Combined link clicked before navigation")',
          background: '#9b59b6', // Purple background
          borderColor: '#8e44ad',
          borderWidth: '10px',
          borderStyle: 'solid',
          borderRadius: '40px'
        },

        {
          selector: '#combined-link:hover',
          background: '#be7bd9', // Lighter purple on hover
          borderColor: '#9b59b6',
          borderWidth: '10px',
          borderStyle: 'solid',
          transform: 'scale(1.25)'
        },

        // External site (new window) - middle-center
        {
          selector: '#external-link',
          top: '40%',
          left: '37.5%',
          width: '25%',
          height: '12%',
          href: 'https://babylonjs.com',
          target: '_blank',
          background: '#e74c3c', // Red background
          borderWidth: '15px',
          borderColor: '#c0392b',
          borderStyle: 'solid'
        },

        {
          selector: '#external-link:hover',
          background: '#c0392b', // Lighter red on hover
          borderColor: '#e74c3c',
          borderWidth: '15px',
          borderStyle: 'solid',
          borderRadius: '60px'
        },

        // Same window absolute - middle-right
        {
          selector: '#same-window-absolute',
          top: '40%',
          left: '68.75%',
          width: '25%',
          height: '12%',
          href: 'https://developer.mozilla.org',
          target: '_self', // Same window even for absolute URL
          background: '#34495e', // Dark gray background
          borderColor: '#2c3e50'
        },

        {
          selector: '#same-window-absolute:hover',
          background: '#5d6d7e', // Lighter gray on hover
          borderColor: '#34495e',
          transform: 'scale(1.25)'
        }
      ],
      root: {
        children: [
          {
            type: 'a',
            id: 'relative-link'
          },
          {
            type: 'a',
            id: 'absolute-link'
          },
          {
            type: 'a',
            id: 'onclick-link'
          },
          {
            type: 'a',
            id: 'combined-link'
          },
          {
            type: 'a',
            id: 'external-link'
          },
          {
            type: 'a',
            id: 'same-window-absolute'
          }
        ]
      }
    },

    about: {
      meta: {
        description: 'About page with minimal content - dark blue-gray background with no visible elements'
      },
      styles: [
        {
          selector: 'root',
          background: '#2c3e50'
        }
      ],
      root: {
        children: []
      }
    },

    // ADVANCED FLEXBOX FEATURES TEST SITE
    'flexbox-advanced': {
      meta: {
        description: 'Advanced flexbox features test site demonstrating align-content with multi-line wrapping, flex-grow/shrink distribution, align-self variations, order property, and complex nested layouts'
      },
      styles: [
        {
          selector: 'root',
          background: '#1a1a2e'
        },

        // === ALIGN-CONTENT TESTS (Multi-line containers) ===

        // Test 1: align-content: space-between with flex-wrap
        {
          selector: '#align-content-space-between',
          top: '10%',
          left: '5%',
          width: '40%',
          height: '20%',
          background: '#16213e',
          borderWidth: '2px',
          borderColor: '#0f3460',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          alignContent: 'space-between',
          padding: '10px'
        },

        // Items for space-between test
        {
          selector: '#ac-sb-1',
          background: '#e74c3c',
          borderRadius: '4px',
          flexBasis: '30%',
          height: '40px',
          margin: '2px'
        },
        {
          selector: '#ac-sb-2',
          background: '#f39c12',
          borderRadius: '4px',
          flexBasis: '35%',
          height: '40px',
          margin: '2px'
        },
        {
          selector: '#ac-sb-3',
          background: '#27ae60',
          borderRadius: '4px',
          flexBasis: '25%',
          height: '40px',
          margin: '2px'
        },
        {
          selector: '#ac-sb-4',
          background: '#3498db',
          borderRadius: '4px',
          flexBasis: '40%',
          height: '40px',
          margin: '2px'
        },
        {
          selector: '#ac-sb-5',
          background: '#9b59b6',
          borderRadius: '4px',
          flexBasis: '30%',
          height: '40px',
          margin: '2px'
        },

        // Test 2: align-content: center with flex-wrap
        {
          selector: '#align-content-center',
          top: '10%',
          left: '55%',
          width: '40%',
          height: '20%',
          background: '#2d1b69',
          borderWidth: '2px',
          borderColor: '#512da8',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          alignContent: 'center',
          padding: '10px',
          gap: '15px'
        },

        // Items for center test
        {
          selector: '#ac-c-1',
          background: '#ff5722',
          borderRadius: '4px',
          flexBasis: '45%',
          height: '35px',
          margin: '3px'
        },
        {
          selector: '#ac-c-2',
          background: '#795548',
          borderRadius: '4px',
          flexBasis: '40%',
          height: '35px',
          margin: '3px'
        },
        {
          selector: '#ac-c-3',
          background: '#607d8b',
          borderRadius: '4px',
          flexBasis: '50%',
          height: '35px',
          margin: '3px'
        },

        // === FLEX ITEM SIZING TESTS ===

        // Test 3: flex-grow distribution
        {
          selector: '#flex-grow-test',
          top: '35%',
          left: '5%',
          width: '40%',
          height: '15%',
          background: '#0d4f3c',
          borderWidth: '2px',
          borderColor: '#16a085',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          padding: '8px'
        },

        // Flex-grow items with different grow values
        {
          selector: '#fg-1',
          background: '#e91e63',
          borderRadius: '4px',
          flexBasis: '50px',
          flexGrow: '1',
          margin: '2px'
        },
        {
          selector: '#fg-2',
          background: '#ff9800',
          borderRadius: '4px',
          flexBasis: '50px',
          flexGrow: '2',
          margin: '2px'
        },
        {
          selector: '#fg-3',
          background: '#4caf50',
          borderRadius: '4px',
          flexBasis: '50px',
          flexGrow: '3',
          margin: '2px'
        },

        // Test 4: flex-shrink reduction
        {
          selector: '#flex-shrink-test',
          top: '35%',
          left: '55%',
          width: '500px', // Larger width to ensure container is processed
          height: '15%',
          background: '#4a148c',
          borderWidth: '2px',
          borderColor: '#7b1fa2',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          padding: '8px'
        },

        // Flex-shrink items with different shrink values
        {
          selector: '#fs-1',
          background: '#f44336',
          borderRadius: '4px',
          flexBasis: '250px', // More reasonable size for clearer math
          flexShrink: '1',
          margin: '2px'
        },
        {
          selector: '#fs-2',
          background: '#ff9800',
          borderRadius: '4px',
          flexBasis: '250px', // More reasonable size for clearer math
          flexShrink: '3', // Much higher shrink factor for clear difference
          margin: '2px'
        },
        {
          selector: '#fs-3',
          background: '#2196f3',
          borderRadius: '4px',
          flexBasis: '250px', // More reasonable size for clearer math
          flexShrink: '0', // Should not shrink at all
          margin: '2px'
        },

        // === ALIGN-SELF TESTS ===

        // Test 5: align-self variations
        {
          selector: '#align-self-test',
          top: '55%',
          left: '5%',
          width: '40%',
          height: '20%',
          background: '#bf360c',
          borderWidth: '2px',
          borderColor: '#d84315',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px'
        },

        // Items with different align-self values
        {
          selector: '#as-1',
          background: '#00bcd4',
          borderRadius: '4px',
          width: '60px',
          height: '40px',
          alignSelf: 'flex-start'
        },
        {
          selector: '#as-2',
          background: '#8bc34a',
          borderRadius: '4px',
          width: '60px',
          height: '60px',
          alignSelf: 'center'
        },
        {
          selector: '#as-3',
          background: '#ffc107',
          borderRadius: '4px',
          width: '60px',
          height: '40px',
          alignSelf: 'flex-end'
        },
        {
          selector: '#as-4',
          background: '#e91e63',
          borderRadius: '4px',
          width: '60px',
          alignSelf: 'stretch'
        },

        // === ORDER TESTS ===

        // Test 6: order property with different values
        {
          selector: '#order-test',
          top: '55%',
          left: '55%',
          width: '40%',
          height: '20%',
          background: '#1b5e20',
          borderWidth: '2px',
          borderColor: '#2e7d32',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px'
        },

        // Items with different order values (visual order will be different from DOM order)
        {
          selector: '#order-1',
          background: '#ff1744',
          borderRadius: '4px',
          width: '50px',
          height: '50px',
          order: '3' // Red - order 3
        },
        {
          selector: '#order-2',
          background: '#00e676',
          borderRadius: '4px',
          width: '50px',
          height: '50px',
          order: '1' // Green - order 1
        },
        {
          selector: '#order-3',
          background: '#2979ff',
          borderRadius: '4px',
          width: '50px',
          height: '50px',
          order: '4' // Blue - order 4
        },
        {
          selector: '#order-4',
          background: '#ff6d00',
          borderRadius: '4px',
          width: '50px',
          height: '50px',
          order: '2' // Orange - order 2
        },

        // === COMPLEX COMBINATION TEST ===

        // Test 7: Combined features
        {
          selector: '#complex-test',
          top: '80%',
          left: '5%',
          width: '90%',
          height: '15%',
          background: '#263238',
          borderWidth: '2px',
          borderColor: '#37474f',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          alignContent: 'space-around',
          padding: '8px'
        },

        // Complex items with multiple properties - simplified for debugging
        {
          selector: '#complex-1',
          background: '#d32f2f',
          borderRadius: '4px',
          flexBasis: '20%', // Small basis to leave lots of room for growth
          flexGrow: '1',
          height: '30px',
          order: '2',
          alignSelf: 'center',
          margin: '2px'
        },
        {
          selector: '#complex-2',
          background: '#1976d2',
          borderRadius: '4px',
          flexBasis: '20%', // Small basis to leave lots of room for growth
          flexGrow: '3', // Much larger grow factor for clear difference
          height: '40px',
          order: '1',
          alignSelf: 'flex-start',
          margin: '2px'
        },
        {
          selector: '#complex-3',
          background: '#388e3c',
          borderRadius: '4px',
          flexBasis: '20%', // Small basis to leave lots of room for growth
          flexGrow: '0', // No growth
          height: '35px',
          order: '3',
          alignSelf: 'flex-end',
          margin: '2px'
        }
      ],
      root: {
        children: [
          // Align-content: space-between test
          {
            type: 'div',
            id: 'align-content-space-between',
            children: [
              { type: 'div', id: 'ac-sb-1' },
              { type: 'div', id: 'ac-sb-2' },
              { type: 'div', id: 'ac-sb-3' },
              { type: 'div', id: 'ac-sb-4' },
              { type: 'div', id: 'ac-sb-5' }
            ]
          },

          // Align-content: center test
          {
            type: 'div',
            id: 'align-content-center',
            children: [
              { type: 'div', id: 'ac-c-1' },
              { type: 'div', id: 'ac-c-2' },
              { type: 'div', id: 'ac-c-3' }
            ]
          },

          // Flex-grow test
          {
            type: 'div',
            id: 'flex-grow-test',
            children: [
              { type: 'div', id: 'fg-1' },
              { type: 'div', id: 'fg-2' },
              { type: 'div', id: 'fg-3' }
            ]
          },

          // Flex-shrink test
          {
            type: 'div',
            id: 'flex-shrink-test',
            children: [
              { type: 'div', id: 'fs-1' },
              { type: 'div', id: 'fs-2' },
              { type: 'div', id: 'fs-3' }
            ]
          },

          // Align-self test
          {
            type: 'div',
            id: 'align-self-test',
            children: [
              { type: 'div', id: 'as-1' },
              { type: 'div', id: 'as-2' },
              { type: 'div', id: 'as-3' },
              { type: 'div', id: 'as-4' }
            ]
          },

          // Order test
          {
            type: 'div',
            id: 'order-test',
            children: [
              { type: 'div', id: 'order-1' },
              { type: 'div', id: 'order-2' },
              { type: 'div', id: 'order-3' },
              { type: 'div', id: 'order-4' }
            ]
          },

          // Complex combination test
          {
            type: 'div',
            id: 'complex-test',
            children: [
              { type: 'div', id: 'complex-1' },
              { type: 'div', id: 'complex-2' },
              { type: 'div', id: 'complex-3' }
            ]
          }
        ]
      }
    },

    flexbox: {
      meta: {
        description: 'Comprehensive flexbox layout test site demonstrating various justify-content, align-items, and flex-direction configurations'
      },
      styles: [
        {
          selector: 'root',
          background: '#2c3e50'
        },

        // === ROW 1: SPACE-BETWEEN LAYOUTS ===

        // Flex container - horizontal space-between (small items)
        {
          selector: '#flex-container-sb-small',
          top: '5%',
          left: '5%',
          width: '40%',
          height: '18%',
          background: '#34495e',
          borderWidth: '2px',
          borderColor: '#5d6d7e',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        },

        // Small flex items
        {
          selector: '#flex-sb-small-1',
          background: '#e74c3c', // Red
          borderWidth: '2px',
          borderColor: '#c0392b',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '15%'
        },
        {
          selector: '#flex-sb-small-2',
          background: '#f39c12', // Orange
          borderWidth: '2px',
          borderColor: '#e67e22',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '20%'
        },
        {
          selector: '#flex-sb-small-3',
          background: '#27ae60', // Green
          borderWidth: '2px',
          borderColor: '#2ecc71',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '12%'
        },
        {
          selector: '#flex-sb-small-4',
          background: '#3498db', // Blue
          borderWidth: '2px',
          borderColor: '#2980b9',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '18%'
        },

        // Flex container - horizontal space-between (large items)
        {
          selector: '#flex-container-sb-large',
          top: '5%',
          left: '55%',
          width: '40%',
          height: '18%',
          background: '#8e44ad',
          borderWidth: '2px',
          borderColor: '#9b59b6',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        },

        // Large flex items
        {
          selector: '#flex-sb-large-1',
          background: '#e91e63', // Pink
          borderWidth: '2px',
          borderColor: '#c2185b',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '25%'
        },
        {
          selector: '#flex-sb-large-2',
          background: '#ff9800', // Deep Orange
          borderWidth: '2px',
          borderColor: '#f57c00',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '35%'
        },
        {
          selector: '#flex-sb-large-3',
          background: '#9c27b0', // Purple
          borderWidth: '2px',
          borderColor: '#7b1fa2',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '20%'
        },

        // === ROW 2: JUSTIFY-CONTENT VARIATIONS ===

        // Flex container - flex-start alignment
        {
          selector: '#flex-container-start',
          top: '28%',
          left: '5%',
          width: '28%',
          height: '18%',
          background: '#16a085',
          borderWidth: '2px',
          borderColor: '#1abc9c',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center'
        },

        // Flex-start items
        {
          selector: '#flex-start-1',
          background: '#f1c40f', // Yellow
          borderWidth: '2px',
          borderColor: '#f39c12',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '25%'
        },
        {
          selector: '#flex-start-2',
          background: '#e67e22', // Orange
          borderWidth: '2px',
          borderColor: '#d35400',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '20%'
        },

        // Flex container - center alignment
        {
          selector: '#flex-container-center',
          top: '28%',
          left: '36%',
          width: '28%',
          height: '18%',
          background: '#2c3e50',
          borderWidth: '2px',
          borderColor: '#34495e',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center'
        },

        // Centered flex items
        {
          selector: '#flex-center-1',
          background: '#95a5a6', // Gray
          borderWidth: '2px',
          borderColor: '#7f8c8d',
          borderStyle: 'solid',
          borderRadius: '50%', // Circular
          flexBasis: '30%'
        },
        {
          selector: '#flex-center-2',
          background: '#e74c3c', // Red
          borderWidth: '2px',
          borderColor: '#c0392b',
          borderStyle: 'solid',
          borderRadius: '50%', // Circular
          flexBasis: '25%'
        },

        // Flex container - flex-end alignment
        {
          selector: '#flex-container-end',
          top: '28%',
          left: '67%',
          width: '28%',
          height: '18%',
          background: '#c0392b',
          borderWidth: '2px',
          borderColor: '#e74c3c',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center'
        },

        // Flex-end items
        {
          selector: '#flex-end-1',
          background: '#3498db', // Blue
          borderWidth: '2px',
          borderColor: '#2980b9',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '22%'
        },
        {
          selector: '#flex-end-2',
          background: '#27ae60', // Green
          borderWidth: '2px',
          borderColor: '#2ecc71',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '28%'
        },

        // === ROW 3: VERTICAL LAYOUTS ===

        // Vertical flex container - space-between
        {
          selector: '#flex-container-v-sb',
          top: '51%',
          left: '5%',
          width: '18%',
          height: '44%',
          background: '#8e44ad',
          borderWidth: '2px',
          borderColor: '#9b59b6',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'stretch'
        },

        // Vertical space-between items
        {
          selector: '#flex-v-sb-1',
          background: '#e74c3c', // Red
          borderWidth: '2px',
          borderColor: '#c0392b',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '20%'
        },
        {
          selector: '#flex-v-sb-2',
          background: '#f39c12', // Orange
          borderWidth: '2px',
          borderColor: '#e67e22',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '15%'
        },
        {
          selector: '#flex-v-sb-3',
          background: '#27ae60', // Green
          borderWidth: '2px',
          borderColor: '#2ecc71',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '25%'
        },

        // Vertical flex container - center
        {
          selector: '#flex-container-v-center',
          top: '51%',
          left: '26%',
          width: '18%',
          height: '44%',
          background: '#16a085',
          borderWidth: '2px',
          borderColor: '#1abc9c',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        },

        // Vertical centered items
        {
          selector: '#flex-v-center-1',
          background: '#3498db', // Blue
          borderWidth: '2px',
          borderColor: '#2980b9',
          borderStyle: 'solid',
          borderRadius: '50%', // Circular
          flexBasis: '25%'
        },
        {
          selector: '#flex-v-center-2',
          background: '#e91e63', // Pink
          borderWidth: '2px',
          borderColor: '#c2185b',
          borderStyle: 'solid',
          borderRadius: '50%', // Circular
          flexBasis: '20%'
        },

        // === ROW 3: COMPLEX NESTED LAYOUT ===

        // Outer flex container - horizontal
        {
          selector: '#flex-container-nested',
          top: '51%',
          left: '47%',
          width: '48%',
          height: '44%',
          background: '#2c3e50',
          borderWidth: '3px',
          borderColor: '#34495e',
          borderStyle: 'solid',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'stretch'
        },

        // Left column in nested container
        {
          selector: '#flex-nested-left',
          background: '#7f8c8d',
          borderWidth: '2px',
          borderColor: '#95a5a6',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '45%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        },

        // Right column in nested container
        {
          selector: '#flex-nested-right',
          background: '#d35400',
          borderWidth: '2px',
          borderColor: '#e67e22',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '45%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'stretch'
        },

        // Items inside left nested column
        {
          selector: '#flex-nested-left-1',
          background: '#f1c40f', // Yellow
          borderWidth: '1px',
          borderColor: '#f39c12',
          borderStyle: 'solid',
          borderRadius: '50%',
          flexBasis: '30%'
        },
        {
          selector: '#flex-nested-left-2',
          background: '#9b59b6', // Purple
          borderWidth: '1px',
          borderColor: '#cccccc', // Added default border color
          borderStyle: 'solid',
          borderRadius: '50%',
          flexBasis: '25%'
        },

        // Items inside right nested column
        {
          selector: '#flex-nested-right-1',
          background: '#e74c3c', // Red
          borderWidth: '1px',
          borderColor: '#c0392b',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '20%'
        },
        {
          selector: '#flex-nested-right-2',
          background: '#27ae60', // Green
          borderWidth: '1px',
          borderColor: '#2ecc71',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '25%'
        },
        {
          selector: '#flex-nested-right-3',
          background: '#3498db', // Blue
          borderWidth: '1px',
          borderColor: '#2980b9',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '15%'
        }
      ],
      root: {
        children: [
          // === ROW 1: SPACE-BETWEEN LAYOUTS ===

          // Horizontal space-between (small items)
          {
            type: 'div',
            id: 'flex-container-sb-small',
            children: [
              {
                type: 'div',
                id: 'flex-sb-small-1'
              },
              {
                type: 'div',
                id: 'flex-sb-small-2'
              },
              {
                type: 'div',
                id: 'flex-sb-small-3'
              },
              {
                type: 'div',
                id: 'flex-sb-small-4'
              }
            ]
          },

          // Horizontal space-between (large items)
          {
            type: 'div',
            id: 'flex-container-sb-large',
            children: [
              {
                type: 'div',
                id: 'flex-sb-large-1'
              },
              {
                type: 'div',
                id: 'flex-sb-large-2'
              },
              {
                type: 'div',
                id: 'flex-sb-large-3'
              }
            ]
          },

          // === ROW 2: JUSTIFY-CONTENT VARIATIONS ===

          // Flex-start alignment
          {
            type: 'div',
            id: 'flex-container-start',
            children: [
              {
                type: 'div',
                id: 'flex-start-1'
              },
              {
                type: 'div',
                id: 'flex-start-2'
              }
            ]
          },

          // Center alignment
          {
            type: 'div',
            id: 'flex-container-center',
            children: [
              {
                type: 'div',
                id: 'flex-center-1'
              },
              {
                type: 'div',
                id: 'flex-center-2'
              }
            ]
          },

          // Flex-end alignment
          {
            type: 'div',
            id: 'flex-container-end',
            children: [
              {
                type: 'div',
                id: 'flex-end-1'
              },
              {
                type: 'div',
                id: 'flex-end-2'
              }
            ]
          },

          // === ROW 3: VERTICAL LAYOUTS ===

          // Vertical space-between
          {
            type: 'div',
            id: 'flex-container-v-sb',
            children: [
              {
                type: 'div',
                id: 'flex-v-sb-1'
              },
              {
                type: 'div',
                id: 'flex-v-sb-2'
              },
              {
                type: 'div',
                id: 'flex-v-sb-3'
              }
            ]
          },

          // Vertical centered
          {
            type: 'div',
            id: 'flex-container-v-center',
            children: [
              {
                type: 'div',
                id: 'flex-v-center-1'
              },
              {
                type: 'div',
                id: 'flex-v-center-2'
              }
            ]
          },

          // === COMPLEX NESTED LAYOUT ===

          // Nested flex container
          {
            type: 'div',
            id: 'flex-container-nested',
            children: [
              // Left column (nested flex container)
              {
                type: 'div',
                id: 'flex-nested-left',
                children: [
                  {
                    type: 'div',
                    id: 'flex-nested-left-1'
                  },
                  {
                    type: 'div',
                    id: 'flex-nested-left-2'
                  }
                ]
              },
              // Right column (nested flex container)
              {
                type: 'div',
                id: 'flex-nested-right',
                children: [
                  {
                    type: 'div',
                    id: 'flex-nested-right-1'
                  },
                  {
                    type: 'div',
                    id: 'flex-nested-right-2'
                  },
                  {
                    type: 'div',
                    id: 'flex-nested-right-3'
                  }
                ]
              }
            ]
          }
        ]
      }
    },

    // FLEX-WRAP TEST SITE
    flexwrap: {
      meta: {
        description: 'Flexbox wrapping test site showcasing flex-wrap, wrap-reverse, column wrapping with gaps, and comparison with nowrap overflow behavior'
      },
      styles: [
        {
          selector: 'root',
          background: '#2c3e50'
        },

        // === TEST 1: Wrap with many items ===
        {
          selector: '#flex-wrap-container',
          top: '15%',
          left: '5%',
          width: '40%',
          height: '30%',
          background: '#34495e',
          borderWidth: '2px',
          borderColor: '#5d6d7e',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          alignContent: 'flex-start',
          flexWrap: 'wrap',
          gap: '10px' // Test gap between items
        },

        // Items that will wrap
        {
          selector: '#wrap-item-1',
          background: '#e74c3c',
          borderWidth: '2px',
          borderColor: '#c0392b',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '30%',
          flexGrow: '0',
          flexShrink: '1',
          height: '60px'
        },
        {
          selector: '#wrap-item-2',
          background: '#f39c12',
          borderWidth: '2px',
          borderColor: '#e67e22',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '35%',
          flexGrow: '0',
          flexShrink: '1',
          height: '60px'
        },
        {
          selector: '#wrap-item-3',
          background: '#27ae60',
          borderWidth: '2px',
          borderColor: '#2ecc71',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '40%',
          flexGrow: '0',
          flexShrink: '1',
          height: '60px'
        },
        {
          selector: '#wrap-item-4',
          background: '#3498db',
          borderWidth: '2px',
          borderColor: '#2980b9',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '25%',
          flexGrow: '0',
          flexShrink: '1',
          height: '60px'
        },
        {
          selector: '#wrap-item-5',
          background: '#9b59b6',
          borderWidth: '2px',
          borderColor: '#8e44ad',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '30%',
          flexGrow: '0',
          flexShrink: '1',
          height: '60px'
        },
        {
          selector: '#wrap-item-6',
          background: '#e91e63',
          borderWidth: '2px',
          borderColor: '#c2185b',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '45%',
          flexGrow: '0',
          flexShrink: '1',
          height: '60px'
        },

        // === TEST 2: Wrap-reverse ===
        {
          selector: '#flex-wrap-reverse-container',
          top: '15%',
          left: '55%',
          width: '40%',
          height: '30%',
          background: '#8e44ad',
          borderWidth: '2px',
          borderColor: '#9b59b6',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          alignContent: 'flex-start',
          flexWrap: 'wrap-reverse',
          rowGap: '15px',
          columnGap: '8px' // Test separate row and column gaps
        },

        // Items for wrap-reverse
        {
          selector: '#wrap-rev-item-1',
          background: '#f1c40f',
          borderWidth: '2px',
          borderColor: '#f39c12',
          borderStyle: 'solid',
          borderRadius: '50%',
          flexBasis: '25%',
          flexGrow: '0',
          flexShrink: '1',
          height: '50px'
        },
        {
          selector: '#wrap-rev-item-2',
          background: '#e67e22',
          borderWidth: '2px',
          borderColor: '#d35400',
          borderStyle: 'solid',
          borderRadius: '50%',
          flexBasis: '30%',
          flexGrow: '0',
          flexShrink: '1',
          height: '50px'
        },
        {
          selector: '#wrap-rev-item-3',
          background: '#95a5a6',
          borderWidth: '2px',
          borderColor: '#7f8c8d',
          borderStyle: 'solid',
          borderRadius: '50%',
          flexBasis: '35%',
          flexGrow: '0',
          flexShrink: '1',
          height: '50px'
        },
        {
          selector: '#wrap-rev-item-4',
          background: '#16a085',
          borderWidth: '2px',
          borderColor: '#1abc9c',
          borderStyle: 'solid',
          borderRadius: '50%',
          flexBasis: '40%',
          flexGrow: '0',
          flexShrink: '1',
          height: '50px'
        },

        // === TEST 3: Column wrap ===
        {
          selector: '#flex-column-wrap-container',
          top: '55%',
          left: '5%',
          width: '40%',
          height: '30%',
          background: '#c0392b',
          borderWidth: '2px',
          borderColor: '#e74c3c',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          alignContent: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px' // Test gap in column layout
        },

        // Items for column wrap
        {
          selector: '#col-wrap-item-1',
          background: '#3498db',
          borderWidth: '1px',
          borderColor: '#2980b9',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '20%',
          flexGrow: '0',
          flexShrink: '1',
          height: '40px'
        },
        {
          selector: '#col-wrap-item-2',
          background: '#27ae60',
          borderWidth: '1px',
          borderColor: '#2ecc71',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '25%',
          flexGrow: '0',
          flexShrink: '1',
          height: '40px'
        },
        {
          selector: '#col-wrap-item-3',
          background: '#f39c12',
          borderWidth: '1px',
          borderColor: '#e67e22',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '30%',
          flexGrow: '0',
          flexShrink: '1',
          height: '40px'
        },
        {
          selector: '#col-wrap-item-4',
          background: '#9b59b6',
          borderWidth: '1px',
          borderColor: '#8e44ad',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '35%',
          flexGrow: '0',
          flexShrink: '1',
          height: '40px'
        },
        {
          selector: '#col-wrap-item-5',
          background: '#e74c3c',
          borderWidth: '1px',
          borderColor: '#c0392b',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '25%',
          flexGrow: '0',
          flexShrink: '1',
          height: '40px'
        },

        // === TEST 4: Nowrap with overflow (comparison) ===
        {
          selector: '#flex-nowrap-container',
          top: '55%',
          left: '55%',
          width: '40%',
          height: '30%',
          background: '#16a085',
          borderWidth: '2px',
          borderColor: '#1abc9c',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          alignContent: 'flex-start',
          flexWrap: 'nowrap'
        },

        // Items that would overflow without wrapping
        {
          selector: '#nowrap-item-1',
          background: '#f1c40f',
          borderWidth: '2px',
          borderColor: '#f39c12',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '30%',
          flexGrow: '0',
          flexShrink: '1'
        },
        {
          selector: '#nowrap-item-2',
          background: '#e91e63',
          borderWidth: '2px',
          borderColor: '#c2185b',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '35%',
          flexGrow: '0',
          flexShrink: '1'
        },
        {
          selector: '#nowrap-item-3',
          background: '#9c27b0',
          borderWidth: '2px',
          borderColor: '#7b1fa2',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '40%',
          flexGrow: '0',
          flexShrink: '1'
        }
      ],
      root: {
        children: [
          // === TEST 1: Basic wrap ===
          {
            type: 'div',
            id: 'flex-wrap-container',
            children: [
              { type: 'div', id: 'wrap-item-1' },
              { type: 'div', id: 'wrap-item-2' },
              { type: 'div', id: 'wrap-item-3' },
              { type: 'div', id: 'wrap-item-4' },
              { type: 'div', id: 'wrap-item-5' },
              { type: 'div', id: 'wrap-item-6' }
            ]
          },

          // === TEST 2: Wrap-reverse ===
          {
            type: 'div',
            id: 'flex-wrap-reverse-container',
            children: [
              { type: 'div', id: 'wrap-rev-item-1' },
              { type: 'div', id: 'wrap-rev-item-2' },
              { type: 'div', id: 'wrap-rev-item-3' },
              { type: 'div', id: 'wrap-rev-item-4' }
            ]
          },

          // === TEST 3: Column wrap ===
          {
            type: 'div',
            id: 'flex-column-wrap-container',
            children: [
              { type: 'div', id: 'col-wrap-item-1' },
              { type: 'div', id: 'col-wrap-item-2' },
              { type: 'div', id: 'col-wrap-item-3' },
              { type: 'div', id: 'col-wrap-item-4' },
              { type: 'div', id: 'col-wrap-item-5' }
            ]
          },

          // === TEST 4: Nowrap comparison ===
          {
            type: 'div',
            id: 'flex-nowrap-container',
            children: [
              { type: 'div', id: 'nowrap-item-1' },
              { type: 'div', id: 'nowrap-item-2' },
              { type: 'div', id: 'nowrap-item-3' }
            ]
          }
        ]
      }
    },


    flexgrowshrink: {
      meta: {
        description: 'Flexbox grow and shrink test site demonstrating flex-grow distribution, flex-shrink reduction, and mixed flex properties with different container widths'
      },
      root: {
        children: [
          {
            type: 'div',
            id: 'page-container',
            children: [
              // Grow Test
              {
                type: 'div',
                id: 'grow-container',
                children: [
                  { type: 'div', id: 'g-item-1' },
                  { type: 'div', id: 'g-item-2' },
                  { type: 'div', id: 'g-item-3' },
                ],
              },
              // Shrink Test
              {
                type: 'div',
                id: 'shrink-container',
                children: [
                  { type: 'div', id: 's-item-1' },
                  { type: 'div', id: 's-item-2' },
                  { type: 'div', id: 's-item-3' },
                ],
              },
              // Mixed Test
              {
                type: 'div',
                id: 'mixed-container',
                children: [
                  { type: 'div', id: 'm-item-1' },
                  { type: 'div', id: 'm-item-2' },
                  { type: 'div', id: 'm-item-3' },
                  { type: 'div', id: 'm-item-4' },
                ],
              },
            ],
          },
        ]
      },
      styles: [
        // Page container
        {
          selector: '#page-container',
          top: '10%',
          left: '10%',
          width: '80%',
          height: '80%',
          display: 'flex',
          flexDirection: 'column',
          gap: '40px',
          padding: '40px',
          background: '#1a1a2e',
        },
        // Individual container styles (split from comma selector)
        {
          selector: '#grow-container',
          height: '100px',
          width: '600px',
          background: '#22223b',
          borderWidth: '2px',
          borderColor: '#4a5568',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          padding: '10px',
          gap: '10px',
        },
        {
          selector: '#shrink-container',
          height: '100px',
          width: '300px',
          background: '#22223b',
          borderWidth: '2px',
          borderColor: '#4a5568',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          padding: '10px',
          gap: '10px',
        },
        {
          selector: '#mixed-container',
          height: '100px',
          width: '600px',
          background: '#22223b',
          borderWidth: '2px',
          borderColor: '#4a5568',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          padding: '10px',
          gap: '10px',
        },
        // General item styles (split from comma selector)
        {
          selector: '#grow-container > div',
          borderWidth: '1px',
          borderColor: '#c1121f',
          borderStyle: 'solid',
          borderRadius: '4px',
        },
        {
          selector: '#shrink-container > div',
          borderWidth: '1px',
          borderColor: '#c1121f',
          borderStyle: 'solid',
          borderRadius: '4px',
        },
        {
          selector: '#mixed-container > div',
          borderWidth: '1px',
          borderColor: '#c1121f',
          borderStyle: 'solid',
          borderRadius: '4px',
        },
        // --- Grow Test ---
        {
          selector: '#grow-container',
          width: '600px',
        },
        {
          selector: '#g-item-1',
          background: '#f94144',
          flexGrow: '1',
          flexShrink: '1', // ADDED
          flexBasis: '80px',
        },
        {
          selector: '#g-item-2',
          background: '#f3722c',
          flexGrow: '2',
          flexShrink: '1', // ADDED
          flexBasis: '80px',
        },
        {
          selector: '#g-item-3',
          background: '#f8961e',
          flexGrow: '1',
          flexShrink: '1', // ADDED
          flexBasis: '80px',
        },
        // --- Shrink Test ---
        {
          selector: '#shrink-container',
          width: '300px',
        },
        {
          selector: '#s-item-1',
          background: '#90be6d',
          flexGrow: '0', // ADDED
          flexShrink: '1',
          flexBasis: '200px',
        },
        {
          selector: '#s-item-2',
          background: '#43aa8b',
          flexGrow: '0', // ADDED
          flexShrink: '2',
          flexBasis: '200px',
        },
        {
          selector: '#s-item-3',
          background: '#4d908e',
          flexGrow: '0', // ADDED
          flexShrink: '0',
          flexBasis: '200px',
        },
        // --- Mixed Test ---
        {
          selector: '#mixed-container',
          width: '600px',
        },
        { selector: '#m-item-1', background: '#577590', flex: '1 1 100px' },
        { selector: '#m-item-2', background: '#277da1', flex: '2 1 100px' },
        { selector: '#m-item-3', background: '#f9c74f', flex: '0 0 250px' },
        { selector: '#m-item-4', background: '#f9844a', flexGrow: '0', flexShrink: '1', flexBasis: '100px' }, // ADDED flexGrow, flexShrink
      ]
    },

    // FLEXBOX GAP FEATURES TEST SITE
    flexgap: {
      meta: {
        description: 'Flexbox gap properties test site demonstrating basic gap, separate row/column gaps, column layouts with gaps, gap interaction with justify-content, and comparison with no-gap layouts'
      },
      styles: [
        {
          selector: 'root',
          background: '#1a202c'
        },

        // === TEST 1: Basic Gap Property ===
        {
          selector: '#basic-gap-container',
          top: '2%',
          left: '2%',
          width: '46%',
          height: '22%',
          background: '#2d3748',
          borderWidth: '2px',
          borderColor: '#4a5568',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: '15px' // Basic gap between items
        },
        {
          selector: '#basic-item-1',
          background: '#3182ce',
          borderWidth: '1px',
          borderColor: '#2c5282',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '80px'
        },
        {
          selector: '#basic-item-2',
          background: '#38a169',
          borderWidth: '1px',
          borderColor: '#2f855a',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '100px'
        },
        {
          selector: '#basic-item-3',
          background: '#d69e2e',
          borderWidth: '1px',
          borderColor: '#b7791f',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '90px'
        },

        // === TEST 2: Row-Gap vs Column-Gap ===
        {
          selector: '#separate-gaps-container',
          top: '2%',
          left: '52%',
          width: '46%',
          height: '22%',
          background: '#744210',
          borderWidth: '2px',
          borderColor: '#975a16',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          rowGap: '20px',    // Large gap between rows
          columnGap: '8px'   // Small gap between columns
        },
        {
          selector: '#sep-item-1',
          background: '#f56565',
          borderWidth: '1px',
          borderColor: '#e53e3e',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '45%'
        },
        {
          selector: '#sep-item-2',
          background: '#ed8936',
          borderWidth: '1px',
          borderColor: '#dd6b20',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '45%'
        },
        {
          selector: '#sep-item-3',
          background: '#9f7aea',
          borderWidth: '1px',
          borderColor: '#805ad5',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '45%'
        },
        {
          selector: '#sep-item-4',
          background: '#4fd1c7',
          borderWidth: '1px',
          borderColor: '#38b2ac',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '45%'
        },

        // === TEST 3: Column Layout with Gap ===
        {
          selector: '#column-gap-container',
          top: '28%',
          left: '2%',
          width: '22%',
          height: '46%',
          background: '#553c9a',
          borderWidth: '2px',
          borderColor: '#6b46c1',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          flexWrap: 'nowrap',
          gap: '12px' // Gap between column items
        },
        {
          selector: '#col-item-1',
          background: '#ec4899',
          borderWidth: '1px',
          borderColor: '#db2777',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '60px'
        },
        {
          selector: '#col-item-2',
          background: '#06b6d4',
          borderWidth: '1px',
          borderColor: '#0891b2',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '80px'
        },
        {
          selector: '#col-item-3',
          background: '#10b981',
          borderWidth: '1px',
          borderColor: '#059669',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '70px'
        },
        {
          selector: '#col-item-4',
          background: '#f59e0b',
          borderWidth: '1px',
          borderColor: '#d97706',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '50px'
        },

        // === TEST 4: Gap with Different Justify-Content Values ===
        {
          selector: '#justify-gap-container',
          top: '28%',
          left: '28%',
          width: '70%',
          height: '22%',
          background: '#92400e',
          borderWidth: '2px',
          borderColor: '#a16207',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: '10px' // Gap with space-between
        },
        {
          selector: '#just-item-1',
          background: '#7c3aed',
          borderWidth: '2px',
          borderColor: '#5b21b6',
          borderStyle: 'solid',
          borderRadius: '8px',
          flexBasis: '80px'
        },
        {
          selector: '#just-item-2',
          background: '#dc2626',
          borderWidth: '2px',
          borderColor: '#991b1b',
          borderStyle: 'solid',
          borderRadius: '8px',
          flexBasis: '80px'
        },
        {
          selector: '#just-item-3',
          background: '#059669',
          borderWidth: '2px',
          borderColor: '#047857',
          borderStyle: 'solid',
          borderRadius: '8px',
          flexBasis: '80px'
        },

        // === TEST 5: Large Gap with Wrap ===
        {
          selector: '#large-gap-container',
          top: '54%',
          left: '28%',
          width: '70%',
          height: '22%',
          background: '#134e4a',
          borderWidth: '2px',
          borderColor: '#0f766e',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '25px' // Large gap to test spacing
        },
        {
          selector: '#large-item-1',
          background: '#fbbf24',
          borderWidth: '2px',
          borderColor: '#f59e0b',
          borderStyle: 'solid',
          borderRadius: '12px',
          flexBasis: '100px'
        },
        {
          selector: '#large-item-2',
          background: '#f472b6',
          borderWidth: '2px',
          borderColor: '#ec4899',
          borderStyle: 'solid',
          borderRadius: '12px',
          flexBasis: '120px'
        },
        {
          selector: '#large-item-3',
          background: '#34d399',
          borderWidth: '2px',
          borderColor: '#10b981',
          borderStyle: 'solid',
          borderRadius: '12px',
          flexBasis: '110px'
        },
        {
          selector: '#large-item-4',
          background: '#60a5fa',
          borderWidth: '2px',
          borderColor: '#3b82f6',
          borderStyle: 'solid',
          borderRadius: '12px',
          flexBasis: '90px'
        },

        // === TEST 6: No Gap Comparison ===
        {
          selector: '#no-gap-container',
          top: '80%',
          left: '2%',
          width: '96%',
          height: '18%',
          background: '#7f1d1d',
          borderWidth: '2px',
          borderColor: '#991b1b',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          flexWrap: 'wrap'
          // No gap property - items will be tightly packed
        },
        {
          selector: '#nogap-item-1',
          background: '#1e40af',
          borderWidth: '1px',
          borderColor: '#1d4ed8',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '120px'
        },
        {
          selector: '#nogap-item-2',
          background: '#be185d',
          borderWidth: '1px',
          borderColor: '#c2185b',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '100px'
        },
        {
          selector: '#nogap-item-3',
          background: '#166534',
          borderWidth: '1px',
          borderColor: '#15803d',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '140px'
        },
        {
          selector: '#nogap-item-4',
          background: '#a16207',
          borderWidth: '1px',
          borderColor: '#ca8a04',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '110px'
        }
      ],

      root: {
        children: [
          // === TEST 1: Basic Gap ===
          {
            type: 'div',
            id: 'basic-gap-container',
            children: [
              { type: 'div', id: 'basic-item-1' },
              { type: 'div', id: 'basic-item-2' },
              { type: 'div', id: 'basic-item-3' }
            ]
          },

          // === TEST 2: Separate Row/Column Gaps ===
          {
            type: 'div',
            id: 'separate-gaps-container',
            children: [
              { type: 'div', id: 'sep-item-1' },
              { type: 'div', id: 'sep-item-2' },
              { type: 'div', id: 'sep-item-3' },
              { type: 'div', id: 'sep-item-4' }
            ]
          },

          // === TEST 3: Column Layout ===
          {
            type: 'div',
            id: 'column-gap-container',
            children: [
              { type: 'div', id: 'col-item-1' },
              { type: 'div', id: 'col-item-2' },
              { type: 'div', id: 'col-item-3' },
              { type: 'div', id: 'col-item-4' }
            ]
          },

          // === TEST 4: Gap with Justify-Content ===
          {
            type: 'div',
            id: 'justify-gap-container',
            children: [
              { type: 'div', id: 'just-item-1' },
              { type: 'div', id: 'just-item-2' },
              { type: 'div', id: 'just-item-3' }
            ]
          },

          // === TEST 5: Large Gap with Wrap ===
          {
            type: 'div',
            id: 'large-gap-container',
            children: [
              { type: 'div', id: 'large-item-1' },
              { type: 'div', id: 'large-item-2' },
              { type: 'div', id: 'large-item-3' },
              { type: 'div', id: 'large-item-4' }
            ]
          },

          // === TEST 6: No Gap Comparison ===
          {
            type: 'div',
            id: 'no-gap-container',
            children: [
              { type: 'div', id: 'nogap-item-1' },
              { type: 'div', id: 'nogap-item-2' },
              { type: 'div', id: 'nogap-item-3' },
              { type: 'div', id: 'nogap-item-4' }
            ]
          }
        ]
      }
    },
    // Flexbox test scenes
    'flexbox-align-content': {
      meta: {
        description: 'Flexbox align-content test site showing all alignment options (flex-start, flex-end, center, space-between, space-around, space-evenly, stretch) with wrapped multi-line layouts'
      },
      styles: [
        {
          selector: 'root',
          background: '#f0f0f0'
        },
        // Flex-start container
        {
          selector: '#align-content-flex-start',
          top: '5%',
          left: '5%',
          width: '90%',
          height: '12%',
          background: 'lightblue',
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'flex-start',
          padding: '10px',
          borderRadius: '5px'
        },
        // Flex-end container
        {
          selector: '#align-content-flex-end',
          top: '20%',
          left: '5%',
          width: '90%',
          height: '12%',
          background: 'mistyrose',
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'flex-end',
          padding: '10px',
          borderRadius: '5px'
        },
        // Center container
        {
          selector: '#align-content-center',
          top: '35%',
          left: '5%',
          width: '90%',
          height: '12%',
          background: 'lightgreen',
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'center',
          padding: '10px',
          borderRadius: '5px'
        },
        // Space-between container
        {
          selector: '#align-content-space-between',
          top: '50%',
          left: '5%',
          width: '90%',
          height: '12%',
          background: 'lightsalmon',
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'space-between',
          padding: '10px',
          borderRadius: '5px'
        },
        // Space-around container
        {
          selector: '#align-content-space-around',
          top: '65%',
          left: '5%',
          width: '90%',
          height: '12%',
          background: 'lightcyan',
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'space-around',
          padding: '10px',
          borderRadius: '5px'
        },
        // Space-evenly container
        {
          selector: '#align-content-space-evenly',
          top: '80%',
          left: '5%',
          width: '90%',
          height: '12%',
          background: 'lavender',
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'space-evenly',
          padding: '10px',
          borderRadius: '5px'
        },
        // Stretch container
        {
          selector: '#align-content-stretch',
          top: '95%',
          left: '5%',
          width: '90%',
          height: '12%',
          background: 'lightblue',
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'stretch',
          padding: '10px',
          borderRadius: '5px'
        },
        // Flex-start items
        {
          selector: '#flex-start-item-1, #flex-start-item-2, #flex-start-item-3, #flex-start-item-4, #flex-start-item-5, #flex-start-item-6, #flex-start-item-7, #flex-start-item-8, #flex-start-item-9, #flex-start-item-10, #flex-start-item-11, #flex-start-item-12',
          width: '60px',
          height: '40px',
          margin: '5px',
          borderRadius: '3px',
          background: '#0066cc'
        },
        // Flex-end items
        {
          selector: '#flex-end-item-1, #flex-end-item-2, #flex-end-item-3, #flex-end-item-4, #flex-end-item-5, #flex-end-item-6, #flex-end-item-7, #flex-end-item-8, #flex-end-item-9, #flex-end-item-10, #flex-end-item-11, #flex-end-item-12',
          width: '60px',
          height: '40px',
          margin: '5px',
          borderRadius: '3px',
          background: '#cc3300'
        },
        // Center items
        {
          selector: '#center-item-1, #center-item-2, #center-item-3, #center-item-4, #center-item-5, #center-item-6, #center-item-7, #center-item-8, #center-item-9, #center-item-10, #center-item-11, #center-item-12',
          width: '60px',
          height: '40px',
          margin: '5px',
          borderRadius: '3px',
          background: '#009933'
        },
        // Space-between items
        {
          selector: '#space-between-item-1, #space-between-item-2, #space-between-item-3, #space-between-item-4, #space-between-item-5, #space-between-item-6, #space-between-item-7, #space-between-item-8, #space-between-item-9, #space-between-item-10, #space-between-item-11, #space-between-item-12',
          width: '60px',
          height: '40px',
          margin: '5px',
          borderRadius: '3px',
          background: '#cc6600'
        },
        // Space-around items
        {
          selector: '#space-around-item-1, #space-around-item-2, #space-around-item-3, #space-around-item-4, #space-around-item-5, #space-around-item-6, #space-around-item-7, #space-around-item-8, #space-around-item-9, #space-around-item-10, #space-around-item-11, #space-around-item-12',
          width: '60px',
          height: '40px',
          margin: '5px',
          borderRadius: '3px',
          background: '#008080'
        },
        // Space-evenly items
        {
          selector: '#space-evenly-item-1, #space-evenly-item-2, #space-evenly-item-3, #space-evenly-item-4, #space-evenly-item-5, #space-evenly-item-6, #space-evenly-item-7, #space-evenly-item-8, #space-evenly-item-9, #space-evenly-item-10, #space-evenly-item-11, #space-evenly-item-12',
          width: '60px',
          height: '40px',
          margin: '5px',
          borderRadius: '3px',
          background: '#6600cc'
        },
        // Stretch items
        {
          selector: '#stretch-item-1, #stretch-item-2, #stretch-item-3, #stretch-item-4, #stretch-item-5, #stretch-item-6, #stretch-item-7, #stretch-item-8, #stretch-item-9, #stretch-item-10, #stretch-item-11, #stretch-item-12',
          width: '60px',
          height: '40px',
          margin: '5px',
          borderRadius: '3px',
          background: '#0066cc'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'align-content-flex-start',
            children: Array.from({ length: 12 }, (_, i) => ({
              type: 'div',
              id: `flex-start-item-${i + 1}`
            }))
          },
          {
            type: 'div',
            id: 'align-content-flex-end',
            children: Array.from({ length: 12 }, (_, i) => ({
              type: 'div',
              id: `flex-end-item-${i + 1}`
            }))
          },
          {
            type: 'div',
            id: 'align-content-center',
            children: Array.from({ length: 12 }, (_, i) => ({
              type: 'div',
              id: `center-item-${i + 1}`
            }))
          },
          {
            type: 'div',
            id: 'align-content-space-between',
            children: Array.from({ length: 12 }, (_, i) => ({
              type: 'div',
              id: `space-between-item-${i + 1}`
            }))
          },
          {
            type: 'div',
            id: 'align-content-space-around',
            children: Array.from({ length: 12 }, (_, i) => ({
              type: 'div',
              id: `space-around-item-${i + 1}`
            }))
          },
          {
            type: 'div',
            id: 'align-content-space-evenly',
            children: Array.from({ length: 12 }, (_, i) => ({
              type: 'div',
              id: `space-evenly-item-${i + 1}`
            }))
          },
          {
            type: 'div',
            id: 'align-content-stretch',
            children: Array.from({ length: 12 }, (_, i) => ({
              type: 'div',
              id: `stretch-item-${i + 1}`
            }))
          }
        ]
      }
    },

    'flexbox-flex-item-sizing': {
      meta: {
        description: 'Flexbox item sizing test site demonstrating flex-grow expansion, flex-shrink compression, and flex-basis initial sizing with different values and combinations'
      },
      styles: [
        {
          selector: 'root',
          background: '#f0f0f0'
        },
        {
          selector: '#flex-grow-container',
          top: '10%',
          left: '5%',
          width: '90%',
          height: '20%',
          display: 'flex',
          padding: '10px',
          background: 'rgba(240, 240, 240, 0.5)',
          borderRadius: '5px',
          gap: '10px'
        },
        {
          selector: '#flex-grow-item-1',
          width: '100px',
          height: '60px',
          flexGrow: '0',
          background: '#0066cc',
          borderRadius: '3px'
        },
        {
          selector: '#flex-grow-item-2',
          width: '100px',
          height: '60px',
          flexGrow: '1',
          background: '#0077dd',
          borderRadius: '3px'
        },
        {
          selector: '#flex-grow-item-3',
          width: '100px',
          height: '60px',
          flexGrow: '2',
          background: '#0088ee',
          borderRadius: '3px'
        },
        {
          selector: '#flex-grow-item-4',
          width: '100px',
          height: '60px',
          flexGrow: '3',
          background: '#0099ff',
          borderRadius: '3px'
        },
        {
          selector: '#flex-shrink-container',
          top: '40%',
          left: '5%',
          width: '90%',
          height: '20%',
          display: 'flex',
          padding: '10px',
          background: 'rgba(240, 240, 240, 0.5)',
          borderRadius: '5px',
          gap: '10px'
        },
        {
          selector: '#flex-shrink-item-1',
          width: '200px',
          height: '60px',
          flexShrink: '0',
          background: '#cc3300',
          borderRadius: '3px'
        },
        {
          selector: '#flex-shrink-item-2',
          width: '200px',
          height: '60px',
          flexShrink: '1',
          background: '#dd4411',
          borderRadius: '3px'
        },
        {
          selector: '#flex-shrink-item-3',
          width: '200px',
          height: '60px',
          flexShrink: '2',
          background: '#ee5522',
          borderRadius: '3px'
        },
        {
          selector: '#flex-shrink-item-4',
          width: '200px',
          height: '60px',
          flexShrink: '3',
          background: '#ff6633',
          borderRadius: '3px'
        },
        {
          selector: '#flex-basis-container',
          top: '70%',
          left: '5%',
          width: '90%',
          height: '20%',
          display: 'flex',
          padding: '10px',
          background: 'rgba(240, 240, 240, 0.5)',
          borderRadius: '5px',
          gap: '10px'
        },
        {
          selector: '#flex-basis-item-1',
          width: '50px',
          height: '60px',
          background: '#009933',
          borderRadius: '3px'
        },
        {
          selector: '#flex-basis-item-2',
          flexBasis: '100px',
          height: '60px',
          background: '#00aa44',
          borderRadius: '3px'
        },
        {
          selector: '#flex-basis-item-3',
          flexBasis: '20%',
          height: '60px',
          background: '#00bb55',
          borderRadius: '3px'
        },
        {
          selector: '#flex-basis-item-4',
          flex: '1 0 0',
          height: '60px',
          background: '#00cc66',
          borderRadius: '3px'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'flex-grow-container',
            children: [
              { type: 'div', id: 'flex-grow-item-1' },
              { type: 'div', id: 'flex-grow-item-2' },
              { type: 'div', id: 'flex-grow-item-3' },
              { type: 'div', id: 'flex-grow-item-4' }
            ]
          },
          {
            type: 'div',
            id: 'flex-shrink-container',
            children: [
              { type: 'div', id: 'flex-shrink-item-1' },
              { type: 'div', id: 'flex-shrink-item-2' },
              { type: 'div', id: 'flex-shrink-item-3' },
              { type: 'div', id: 'flex-shrink-item-4' }
            ]
          },
          {
            type: 'div',
            id: 'flex-basis-container',
            children: [
              { type: 'div', id: 'flex-basis-item-1' },
              { type: 'div', id: 'flex-basis-item-2' },
              { type: 'div', id: 'flex-basis-item-3' },
              { type: 'div', id: 'flex-basis-item-4' }
            ]
          }
        ]
      }
    },

    'flexbox-align-self': {
      meta: {
        description: 'Flexbox align-self test site showing individual item alignment overrides (auto, flex-start, flex-end, center, baseline, stretch) within different container alignments'
      },
      styles: [
        {
          selector: 'root',
          background: '#f0f0f0'
        },
        {
          selector: '#align-self-stretch',
          top: '5%',
          left: '5%',
          width: '90%',
          height: '25%',
          background: 'lightblue',
          display: 'flex',
          alignItems: 'stretch',
          padding: '10px',
          borderRadius: '5px',
          gap: '10px'
        },
        {
          selector: '#stretch-auto',
          alignSelf: 'auto',
          width: '120px',
          height: '60px',
          background: '#0066cc',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#stretch-flex-start',
          alignSelf: 'flex-start',
          width: '120px',
          height: '60px',
          background: '#0077dd',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#stretch-flex-end',
          alignSelf: 'flex-end',
          width: '120px',
          height: '60px',
          background: '#0088ee',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#stretch-center',
          alignSelf: 'center',
          width: '120px',
          height: '60px',
          background: '#0099ff',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#stretch-baseline',
          alignSelf: 'baseline',
          width: '120px',
          height: '60px',
          background: '#00aaff',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#stretch-stretch',
          alignSelf: 'stretch',
          width: '120px',
          background: '#00bbff',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#align-self-flex-start',
          top: '35%',
          left: '5%',
          width: '90%',
          height: '25%',
          background: 'mistyrose',
          display: 'flex',
          alignItems: 'flex-start',
          padding: '10px',
          borderRadius: '5px',
          gap: '10px'
        },
        {
          selector: '#start-auto',
          alignSelf: 'auto',
          width: '120px',
          height: '60px',
          background: '#cc3300',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#start-flex-start',
          alignSelf: 'flex-start',
          width: '120px',
          height: '60px',
          background: '#dd4411',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#start-flex-end',
          alignSelf: 'flex-end',
          width: '120px',
          height: '60px',
          background: '#ee5522',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#start-center',
          alignSelf: 'center',
          width: '120px',
          height: '60px',
          background: '#ff6633',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#start-baseline',
          alignSelf: 'baseline',
          width: '120px',
          height: '60px',
          background: '#ff7744',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#start-stretch',
          alignSelf: 'stretch',
          width: '120px',
          background: '#ff8855',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#align-self-center',
          top: '65%',
          left: '5%',
          width: '90%',
          height: '25%',
          background: 'lightgreen',
          display: 'flex',
          alignItems: 'center',
          padding: '10px',
          borderRadius: '5px',
          gap: '10px'
        },
        {
          selector: '#center-auto',
          alignSelf: 'auto',
          width: '120px',
          height: '60px',
          background: '#009933',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#center-flex-start',
          alignSelf: 'flex-start',
          width: '120px',
          height: '60px',
          background: '#00aa44',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#center-flex-end',
          alignSelf: 'flex-end',
          width: '120px',
          height: '60px',
          background: '#00bb55',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#center-center',
          alignSelf: 'center',
          width: '120px',
          height: '60px',
          background: '#00cc66',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#center-baseline',
          alignSelf: 'baseline',
          width: '120px',
          height: '60px',
          background: '#00dd77',
          borderRadius: '3px',
          padding: '5px'
        },
        {
          selector: '#center-stretch',
          alignSelf: 'stretch',
          width: '120px',
          background: '#00ee88',
          borderRadius: '3px',
          padding: '5px'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'align-self-stretch',
            children: [
              { type: 'div', id: 'stretch-auto' },
              { type: 'div', id: 'stretch-flex-start' },
              { type: 'div', id: 'stretch-flex-end' },
              { type: 'div', id: 'stretch-center' },
              { type: 'div', id: 'stretch-baseline' },
              { type: 'div', id: 'stretch-stretch' }
            ]
          },
          {
            type: 'div',
            id: 'align-self-flex-start',
            children: [
              { type: 'div', id: 'start-auto' },
              { type: 'div', id: 'start-flex-start' },
              { type: 'div', id: 'start-flex-end' },
              { type: 'div', id: 'start-center' },
              { type: 'div', id: 'start-baseline' },
              { type: 'div', id: 'start-stretch' }
            ]
          },
          {
            type: 'div',
            id: 'align-self-center',
            children: [
              { type: 'div', id: 'center-auto' },
              { type: 'div', id: 'center-flex-start' },
              { type: 'div', id: 'center-flex-end' },
              { type: 'div', id: 'center-center' },
              { type: 'div', id: 'center-baseline' },
              { type: 'div', id: 'center-stretch' }
            ]
          }
        ]
      }
    },

    'flexbox-order': {
      meta: {
        description: 'Flexbox order property test site demonstrating visual reordering of flex items with positive, negative, and zero order values different from DOM order'
      },
      styles: [
        {
          selector: 'root',
          background: '#f0f0f0'
        },
        {
          selector: '#row-order-container',
          top: '10%',
          left: '5%',
          width: '90%',
          height: '20%',
          display: 'flex',
          flexDirection: 'row',
          padding: '10px',
          background: 'rgba(240, 240, 240, 0.5)',
          borderRadius: '5px',
          gap: '10px'
        },
        {
          selector: '#row-item-1',
          order: '3',
          width: '100px',
          height: '60px',
          background: '#0066cc',
          borderRadius: '3px'
        },
        {
          selector: '#row-item-2',
          order: '1',
          width: '100px',
          height: '60px',
          background: '#0077dd',
          borderRadius: '3px'
        },
        {
          selector: '#row-item-3',
          order: '2',
          width: '100px',
          height: '60px',
          background: '#0088ee',
          borderRadius: '3px'
        },
        {
          selector: '#row-item-4',
          order: '5',
          width: '100px',
          height: '60px',
          background: '#0099ff',
          borderRadius: '3px'
        },
        {
          selector: '#row-item-5',
          order: '4',
          width: '100px',
          height: '60px',
          background: '#00aaff',
          borderRadius: '3px'
        },
        {
          selector: '#mixed-order-container',
          top: '40%',
          left: '5%',
          width: '90%',
          height: '20%',
          display: 'flex',
          flexDirection: 'row',
          padding: '10px',
          background: 'rgba(240, 240, 240, 0.5)',
          borderRadius: '5px',
          gap: '10px'
        },
        {
          selector: '#mixed-item-1',
          order: '0',
          width: '100px',
          height: '60px',
          background: '#6600cc',
          borderRadius: '3px'
        },
        {
          selector: '#mixed-item-2',
          order: '-2',
          width: '100px',
          height: '60px',
          background: '#7711dd',
          borderRadius: '3px'
        },
        {
          selector: '#mixed-item-3',
          order: '2',
          width: '100px',
          height: '60px',
          background: '#8822ee',
          borderRadius: '3px'
        },
        {
          selector: '#mixed-item-4',
          order: '-1',
          width: '100px',
          height: '60px',
          background: '#9933ff',
          borderRadius: '3px'
        },
        {
          selector: '#mixed-item-5',
          order: '1',
          width: '100px',
          height: '60px',
          background: '#aa44ff',
          borderRadius: '3px'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'row-order-container',
            children: [
              { type: 'div', id: 'row-item-1' },
              { type: 'div', id: 'row-item-2' },
              { type: 'div', id: 'row-item-3' },
              { type: 'div', id: 'row-item-4' },
              { type: 'div', id: 'row-item-5' }
            ]
          },
          {
            type: 'div',
            id: 'mixed-order-container',
            children: [
              { type: 'div', id: 'mixed-item-1' },
              { type: 'div', id: 'mixed-item-2' },
              { type: 'div', id: 'mixed-item-3' },
              { type: 'div', id: 'mixed-item-4' },
              { type: 'div', id: 'mixed-item-5' }
            ]
          }
        ]
      }
    },

    'flexbox-debug-simple': {
      meta: {
        description: 'Simple flexbox debug test site with bright colored elements (red container, blue/green/yellow items) for easy visual debugging of flex layout issues'
      },
      styles: [
        {
          selector: 'root',
          background: '#f0f0f0'
        },
        {
          selector: '#debug-container',
          top: '10%',
          left: '10%',
          width: '80%',
          height: '30%',
          background: 'red', // Should be clearly visible
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'flex-start',
          alignItems: 'center',
          padding: '10px'
        },
        {
          selector: '#debug-item-1',
          width: '200px',
          height: '100px',
          margin: '50px',
          background: 'blue' // Should be clearly visible
        },
        {
          selector: '#debug-item-2',
          width: '200px',
          height: '100px',
          margin: '50px',
          background: 'green' // Should be clearly visible
        },
        {
          selector: '#debug-item-3',
          width: '200px',
          height: '100px',
          margin: '50px',
          background: 'yellow' // Should be clearly visible
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'debug-container',
            children: [
              { type: 'div', id: 'debug-item-1' },
              { type: 'div', id: 'debug-item-2' },
              { type: 'div', id: 'debug-item-3' }
            ]
          }
        ]
      }
    },

    'flex-test': {
      meta: {
        description: 'Comprehensive flex test site with multiple containers showing space-between, center, and column layouts with rounded borders, gaps, and various flex-basis values'
      },
      styles: [
        {
          selector: 'root',
          background: '#2c3e50'
        },
        // Main flex container
        {
          selector: '#flex-container',
          top: '20%',
          left: '20%',
          width: '60%',
          height: '20%',
          background: '#34495e',
          borderWidth: '2px',
          borderColor: '#2c3e50',
          borderStyle: 'solid',
          borderRadius: '15px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          padding: '10px'
        },
        // Flex items with different flex-basis values
        {
          selector: '#flex-item-1',
          background: '#e74c3c',
          borderWidth: '8px',
          borderColor: '#c0392b',
          borderStyle: 'solid',
          borderRadius: '30px',
          flexBasis: '22%',
          height: '90%'
        },
        {
          selector: '#flex-item-2',
          background: '#f39c12',
          borderWidth: '8px',
          borderColor: '#e67e22',
          borderStyle: 'solid',
          borderRadius: '30px',
          flexBasis: '28%',
          height: '90%'
        },
        {
          selector: '#flex-item-3',
          background: '#27ae60',
          borderWidth: '8px',
          borderColor: '#2ecc71',
          borderStyle: 'solid',
          borderRadius: '30px',
          flexBasis: '25%',
          height: '90%'
        },
        {
          selector: '#flex-item-4',
          background: '#3498db',
          borderWidth: '8px',
          borderColor: '#2980b9',
          borderStyle: 'solid',
          borderRadius: '30px',
          flexBasis: '20%',
          height: '90%'
        },
        // Additional test containers for different flex properties
        {
          selector: '#flex-center-container',
          top: '50%',
          left: '10%',
          width: '35%',
          height: '15%',
          background: '#8e44ad',
          borderWidth: '2px',
          borderColor: '#9b59b6',
          borderStyle: 'solid',
          borderRadius: '40px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '5px',
          padding: '8px'
        },
        {
          selector: '#center-item-1',
          background: '#e91e63',
          borderWidth: '6px',
          borderColor: '#c2185b',
          borderStyle: 'solid',
          borderRadius: '15px',
          flexBasis: '32%',
          height: '85%'
        },
        {
          selector: '#center-item-2',
          background: '#ff9800',
          borderWidth: '6px',
          borderColor: '#f57c00',
          borderStyle: 'solid',
          borderRadius: '15px',
          flexBasis: '36%',
          height: '85%'
        },
        {
          selector: '#center-item-3',
          background: '#9c27b0',
          borderWidth: '6px',
          borderColor: '#7b1fa2',
          borderStyle: 'solid',
          borderRadius: '15px',
          flexBasis: '28%',
          height: '85%'
        },
        // Column flex container
        {
          selector: '#flex-column-container',
          top: '50%',
          left: '55%',
          width: '35%',
          height: '15%',
          background: '#16a085',
          borderWidth: '2px',
          borderColor: '#1abc9c',
          borderStyle: 'solid',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          alignItems: 'stretch',
          gap: '5px',
          padding: '8px'
        },
        {
          selector: '#column-item-1',
          background: '#f1c40f',
          borderWidth: '6px',
          borderColor: '#f39c12',
          borderStyle: 'solid',
          borderRadius: '25px',
          flexBasis: '28%'
        },
        {
          selector: '#column-item-2',
          background: '#e67e22',
          borderWidth: '6px',
          borderColor: '#d35400',
          borderStyle: 'solid',
          borderRadius: '25px',
          flexBasis: '40%'
        },
        {
          selector: '#column-item-3',
          background: '#95a5a6',
          borderWidth: '6px',
          borderColor: '#7f8c8d',
          borderStyle: 'solid',
          borderRadius: '25px',
          flexBasis: '28%'
        }
      ],
      root: {
        children: [
          // Main flex container with space-between
          {
            type: 'div',
            id: 'flex-container',
            children: [
              { type: 'div', id: 'flex-item-1' },
              { type: 'div', id: 'flex-item-2' },
              { type: 'div', id: 'flex-item-3' },
              { type: 'div', id: 'flex-item-4' }
            ]
          },
          // Center-aligned flex container
          {
            type: 'div',
            id: 'flex-center-container',
            children: [
              { type: 'div', id: 'center-item-1' },
              { type: 'div', id: 'center-item-2' },
              { type: 'div', id: 'center-item-3' }
            ]
          },
          // Column flex container
          {
            type: 'div',
            id: 'flex-column-container',
            children: [
              { type: 'div', id: 'column-item-1' },
              { type: 'div', id: 'column-item-2' },
              { type: 'div', id: 'column-item-3' }
            ]
          }
        ]
      }
    },
    tabletest: {
      meta: {
        description: 'Basic table test site with two tables - one content-sized with fixed cell dimensions, another container-sized that stretches to fill available space'
      },
      styles: [
        // Container styles
        {
          selector: '#table1-container',
          top: '10%',
          left: '10%',
          width: '40%',
          height: '60%',
          background: '#ff1744',
          borderWidth: '2px',
          borderColor: '#aaa',
          borderStyle: 'solid'
        },
        {
          selector: '#table2-container',
          top: '10%',
          left: '55%',
          width: '30%',
          height: '40%',
          background: '#ffea00',
          borderWidth: '2px',
          borderColor: '#aaa',
          borderStyle: 'solid'
        },
        // Table 1: No explicit size
        {
          selector: '#table1',
          background: '#fff',
          borderWidth: '1px',
          borderColor: '#333',
          borderStyle: 'solid'
        },
        {
          selector: '#table1-tbody',
        },
        // Table 2: Explicit size
        {
          selector: '#table2',
          width: '100%',
          height: '100%',
          background: '#fff',
          borderWidth: '1px',
          borderColor: '#333',
          borderStyle: 'solid'
        },
        {
          selector: '#table2-tbody',
          width: '100%',
          height: '100%',
        },
        // Fixed size divs for table 1 cells
        {
          selector: '.table1-cell-content',
          width: '120px',
          height: '40px',
          background: '#2979ff',
          borderWidth: '5px',
          borderStyle: 'solid',
          borderColor: '#212121'
        },
        // Table 2 cell content stretches
        {
          selector: '.table2-cell-content',
          background: '#ffe676',
          borderWidth: '5px',
          borderStyle: 'solid',
          borderColor: '#545454'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'table1-container',
            children: [
              {
                type: 'table',
                id: 'table1',
                children: [
                  {
                    type: 'tbody',
                    id: 'table1-tbody',
                    children: [
                      // Table 1 rows
                      {
                        type: 'tr',
                        children: [
                          {
                            type: 'th',
                            id: 'table1-th1',
                            children: [
                              { type: 'div', class: 'table1-cell-content', id: 'table1-th1-content' }
                            ]
                          },
                          {
                            type: 'th',
                            id: 'table1-th2',
                            children: [
                              { type: 'div', class: 'table1-cell-content', id: 'table1-th2-content' }
                            ]
                          }
                        ]
                      },
                      {
                        type: 'tr',
                        children: [
                          {
                            type: 'td',
                            id: 'table1-td1',
                            children: [
                              { type: 'div', class: 'table1-cell-content', id: 'table1-td1-content' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'table1-td2',
                            children: [
                              { type: 'div', class: 'table1-cell-content', id: 'table1-td2-content' }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            type: 'div',
            id: 'table2-container',
            children: [
              {
                type: 'table',
                id: 'table2',
                children: [
                  {
                    type: 'tbody',
                    id: 'table2-tbody',
                    children: [
                      // Table 2 rows
                      {
                        type: 'tr',
                        children: [
                          {
                            type: 'th',
                            id: 'table2-th1',
                            children: [
                              { type: 'div', class: 'table2-cell-content', id: 'table2-th1-content' }
                            ]
                          },
                          {
                            type: 'th',
                            id: 'table2-th2',
                            children: [
                              { type: 'div', class: 'table2-cell-content', id: 'table2-th2-content' }
                            ]
                          }
                        ]
                      },
                      {
                        type: 'tr',
                        children: [
                          {
                            type: 'td',
                            id: 'table2-td1',
                            children: [
                              { type: 'div', class: 'table2-cell-content', id: 'table2-td1-content' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'table2-td2',
                            children: [
                              { type: 'div', class: 'table2-cell-content', id: 'table2-td2-content' }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    },

    // Complex table test site with various features
    'tablecomplex': {
      meta: {
        description: 'Complex table test site featuring thead/tbody/tfoot sections, alternating row colors, bordered cells with different styling, and a smaller content-based table'
      },
      styles: [
        // Container styles
        {
          selector: '#complex-container',
          top: '20%',
          left: '5%',
          width: '90%',
          height: '70%',
          background: '#f8f9fa',
          borderWidth: '2px',
          borderColor: '#dee2e6',
          borderStyle: 'solid',
          borderRadius: '8px'
        },

        // Main table with explicit dimensions
        {
          selector: '#complex-table',
          top: '15%',
          width: '100%',
          height: '70%',
          background: '#ffffff',
          borderWidth: '1px',
          borderColor: '#495057',
          borderStyle: 'solid',
          borderRadius: '4px'
        },

        // Table sections
        {
          selector: '#complex-thead',
          background: '#e9ecef'
        },
        {
          selector: '#complex-tbody',
          background: '#ffffff'
        },
        {
          selector: '#complex-tfoot',
          background: '#f8f9fa'
        },

        // Header cells
        {
          selector: '.complex-th',
          background: '#6c757d',
          borderWidth: '8px',
          borderStyle: 'solid',
          borderColor: '#495057',
          borderRadius: '12px'
        },

        // Data cells - alternating colors
        {
          selector: '.complex-td-even',
          background: '#f8f9fa',
          borderWidth: '4px',
          borderStyle: 'solid',
          borderColor: '#dee2e6'
        },
        {
          selector: '.complex-td-odd',
          background: '#ffffff',
          borderWidth: '4px',
          borderStyle: 'solid',
          borderColor: '#dee2e6'
        },

        // Footer cells
        {
          selector: '.complex-tf',
          background: '#e9ecef',
          borderWidth: '8px',
          borderStyle: 'solid',
          borderColor: '#adb5bd'
        },

        // Cell content styles
        {
          selector: '.header-content',
          width: '90%',
          height: '80%',
          background: '#343a40',
          borderWidth: '6px',
          borderStyle: 'solid',
          borderColor: '#ffffff',
          borderRadius: '8px'
        },
        {
          selector: '.data-content',
          width: '80%',
          height: '60%',
          background: '#007bff',
          borderWidth: '4px',
          borderStyle: 'solid',
          borderColor: '#0056b3',
          borderRadius: '10px'
        },
        {
          selector: '.footer-content',
          width: '90%',
          height: '80%',
          background: '#6c757d',
          borderWidth: '6px',
          borderStyle: 'solid',
          borderColor: '#495057'
        },

        // Small content-based table
        {
          selector: '#small-table',
          background: '#fff3cd',
          borderWidth: '6px',
          borderColor: '#856404',
          borderStyle: 'solid'
        },
        {
          selector: '.small-cell-content',
          width: '80px',
          height: '30px',
          background: '#ffc107',
          borderWidth: '4px',
          borderStyle: 'solid',
          borderColor: '#e0a800'
        }
      ],

      root: {
        children: [{
          type: 'div',
          id: 'complex-container',
          children: [
            // Main complex table
            {
              type: 'table',
              id: 'complex-table',
              children: [
                // Table header
                {
                  type: 'thead',
                  id: 'complex-thead',
                  children: [
                    {
                      type: 'tr',
                      id: 'header-row',
                      children: [
                        {
                          type: 'th',
                          id: 'th-1',
                          class: 'complex-th',
                          children: [
                            { type: 'div', class: 'header-content', id: 'th-1-content' }
                          ]
                        },
                        {
                          type: 'th',
                          id: 'th-2',
                          class: 'complex-th',
                          children: [
                            { type: 'div', class: 'header-content', id: 'th-2-content' }
                          ]
                        },
                        {
                          type: 'th',
                          id: 'th-3',
                          class: 'complex-th',
                          children: [
                            { type: 'div', class: 'header-content', id: 'th-3-content' }
                          ]
                        },
                        {
                          type: 'th',
                          id: 'th-4',
                          class: 'complex-th',
                          children: [
                            { type: 'div', class: 'header-content', id: 'th-4-content' }
                          ]
                        }
                      ]
                    }
                  ]
                },

                // Table body with multiple rows
                {
                  type: 'tbody',
                  id: 'complex-tbody',
                  children: [
                    // Row 1
                    {
                      type: 'tr',
                      id: 'data-row-1',
                      children: [
                        {
                          type: 'td',
                          id: 'td-1-1',
                          class: 'complex-td-odd',
                          children: [
                            { type: 'div', class: 'data-content', id: 'td-1-1-content' }
                          ]
                        },
                        {
                          type: 'td',
                          id: 'td-1-2',
                          class: 'complex-td-odd',
                          children: [
                            { type: 'div', class: 'data-content', id: 'td-1-2-content' }
                          ]
                        },
                        {
                          type: 'td',
                          id: 'td-1-3',
                          class: 'complex-td-odd',
                          children: [
                            { type: 'div', class: 'data-content', id: 'td-1-3-content' }
                          ]
                        },
                        {
                          type: 'td',
                          id: 'td-1-4',
                          class: 'complex-td-odd',
                          children: [
                            { type: 'div', class: 'data-content', id: 'td-1-4-content' }
                          ]
                        }
                      ]
                    },

                    // Row 2
                    {
                      type: 'tr',
                      id: 'data-row-2',
                      children: [
                        {
                          type: 'td',
                          id: 'td-2-1',
                          class: 'complex-td-even',
                          children: [
                            { type: 'div', class: 'data-content', id: 'td-2-1-content' }
                          ]
                        },
                        {
                          type: 'td',
                          id: 'td-2-2',
                          class: 'complex-td-even',
                          children: [
                            { type: 'div', class: 'data-content', id: 'td-2-2-content' }
                          ]
                        },
                        {
                          type: 'td',
                          id: 'td-2-3',
                          class: 'complex-td-even',
                          children: [
                            { type: 'div', class: 'data-content', id: 'td-2-3-content' }
                          ]
                        },
                        {
                          type: 'td',
                          id: 'td-2-4',
                          class: 'complex-td-even',
                          children: [
                            { type: 'div', class: 'data-content', id: 'td-2-4-content' }
                          ]
                        }
                      ]
                    },

                    // Row 3
                    {
                      type: 'tr',
                      id: 'data-row-3',
                      children: [
                        {
                          type: 'td',
                          id: 'td-3-1',
                          class: 'complex-td-odd',
                          children: [
                            { type: 'div', class: 'data-content', id: 'td-3-1-content' }
                          ]
                        },
                        {
                          type: 'td',
                          id: 'td-3-2',
                          class: 'complex-td-odd',
                          children: [
                            { type: 'div', class: 'data-content', id: 'td-3-2-content' }
                          ]
                        },
                        {
                          type: 'td',
                          id: 'td-3-3',
                          class: 'complex-td-odd',
                          children: [
                            { type: 'div', class: 'data-content', id: 'td-3-3-content' }
                          ]
                        },
                        {
                          type: 'td',
                          id: 'td-3-4',
                          class: 'complex-td-odd',
                          children: [
                            { type: 'div', class: 'data-content', id: 'td-3-4-content' }
                          ]
                        }
                      ]
                    }
                  ]
                },

                // Table footer
                {
                  type: 'tfoot',
                  id: 'complex-tfoot',
                  children: [
                    {
                      type: 'tr',
                      id: 'footer-row',
                      children: [
                        {
                          type: 'td',
                          id: 'tf-1',
                          class: 'complex-tf',
                          children: [
                            { type: 'div', class: 'footer-content', id: 'tf-1-content' }
                          ]
                        },
                        {
                          type: 'td',
                          id: 'tf-2',
                          class: 'complex-tf',
                          children: [
                            { type: 'div', class: 'footer-content', id: 'tf-2-content' }
                          ]
                        },
                        {
                          type: 'td',
                          id: 'tf-3',
                          class: 'complex-tf',
                          children: [
                            { type: 'div', class: 'footer-content', id: 'tf-3-content' }
                          ]
                        },
                        {
                          type: 'td',
                          id: 'tf-4',
                          class: 'complex-tf',
                          children: [
                            { type: 'div', class: 'footer-content', id: 'tf-4-content' }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },

            // Small content-based table (no explicit dimensions)
            {
              type: 'table',
              id: 'small-table',
              children: [
                {
                  type: 'tbody',
                  id: 'small-tbody',
                  children: [
                    {
                      type: 'tr',
                      id: 'small-row-1',
                      children: [
                        {
                          type: 'td',
                          id: 'small-td-1',
                          children: [
                            { type: 'div', class: 'small-cell-content', id: 'small-content-1' }
                          ]
                        },
                        {
                          type: 'td',
                          id: 'small-td-2',
                          children: [
                            { type: 'div', class: 'small-cell-content', id: 'small-content-2' }
                          ]
                        }
                      ]
                    },
                    {
                      type: 'tr',
                      id: 'small-row-2',
                      children: [
                        {
                          type: 'td',
                          id: 'small-td-3',
                          children: [
                            { type: 'div', class: 'small-cell-content', id: 'small-content-3' }
                          ]
                        },
                        {
                          type: 'td',
                          id: 'small-td-4',
                          children: [
                            { type: 'div', class: 'small-cell-content', id: 'small-content-4' }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
        ]
      }
    },

    // Complete table features test site
    'table-complete': {
      meta: {
        description: 'Complete table features test site with caption, colgroup, thead/tbody/tfoot, colspan/rowspan cells, and comprehensive table structure demonstration'
      },
      styles: [
        // Container
        {
          selector: '#complete-container',
          top: '5%',
          left: '5%',
          width: '90%',
          height: '90%',
          background: 'rgba(230, 230, 230, 1)',
          borderRadius: '12px',
          padding: '24px'
        },

        // Table with column definitions
        {
          selector: '#complete-table',
          top: '10%',
          left: '0%',
          width: '100%',
          height: '80%',
          background: '#ffffff',
          borderWidth: '3px',
          borderColor: '#2c3e50',
          borderStyle: 'solid',
          borderRadius: '8px'
        },

        // Caption styling
        {
          selector: '#table-caption',
          background: 'rgba(52, 152, 219, 0.9)',
          color: '#ffffff',
          borderWidth: '2px',
          borderColor: '#2980b9',
          borderStyle: 'solid',
          borderRadius: '8px 8px 0 0',
          padding: '12px'
        },

        // Header cells
        {
          selector: '.complete-th',
          background: 'rgba(41, 128, 185, 0.95)',
          color: '#ffffff',
          borderWidth: '2px',
          borderColor: '#2471a3',
          borderStyle: 'solid',
          padding: '12px'
        },

        // Data cells
        {
          selector: '.complete-td',
          background: '#ffffff',
          borderWidth: '1px',
          borderColor: '#bdc3c7',
          borderStyle: 'solid',
          padding: '10px'
        },

        // Spanning cell highlight
        {
          selector: '.spanning-cell',
          background: 'rgba(241, 196, 15, 0.95)',
          borderWidth: '3px',
          borderColor: '#f39c12',
          borderStyle: 'solid'
        },

        // Cell content
        {
          selector: '.cell-content',
          width: '100%',
          height: '100%',
          padding: '4px',
          background: 'transparent'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'complete-container',
            children: [
              {
                type: 'table',
                id: 'complete-table',
                children: [
                  // Caption
                  {
                    type: 'caption',
                    id: 'table-caption',
                    children: [
                      { type: 'div', class: 'cell-content' }
                    ]
                  },

                  // Column definitions
                  {
                    type: 'colgroup',
                    id: 'col-group',
                    children: [
                      { type: 'col', tableProperties: { width: '25%' } },
                      { type: 'col', tableProperties: { width: '25%' } },
                      { type: 'col', tableProperties: { width: '25%' } },
                      { type: 'col', tableProperties: { width: '25%' } }
                    ]
                  },

                  // Table header
                  {
                    type: 'thead',
                    id: 'complete-thead',
                    children: [
                      {
                        type: 'tr',
                        id: 'header-row',
                        children: [
                          {
                            type: 'th',
                            id: 'th-1',
                            class: 'complete-th',
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          },
                          {
                            type: 'th',
                            id: 'th-2',
                            class: 'complete-th',
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          },
                          {
                            type: 'th',
                            id: 'th-3',
                            class: 'complete-th',
                            colspan: 2,
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          }
                        ]
                      }
                    ]
                  },

                  // Table body
                  {
                    type: 'tbody',
                    id: 'complete-tbody',
                    children: [
                      {
                        type: 'tr',
                        id: 'data-row-1',
                        children: [
                          {
                            type: 'td',
                            id: 'td-1-1',
                            class: 'complete-td',
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'td-1-2',
                            class: 'complete-td spanning-cell',
                            rowspan: 2,
                            children: [
                              { type: 'div', id: 'td-1-2-content', class: 'cell-content', textContent: 'Rowspan Cell' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'td-1-3',
                            class: 'complete-td',
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'td-1-4',
                            class: 'complete-td',
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          }
                        ]
                      },
                      {
                        type: 'tr',
                        id: 'data-row-2',
                        children: [
                          {
                            type: 'td',
                            id: 'td-2-1',
                            class: 'complete-td',
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          },
                          // td-2-2 is spanned by td-1-2
                          {
                            type: 'td',
                            id: 'td-2-3',
                            class: 'complete-td spanning-cell',
                            colspan: 2,
                            children: [
                              { type: 'div', id: 'td-2-3-content', class: 'cell-content', textContent: 'Colspan Cell' }
                            ]
                          }
                        ]
                      },
                      {
                        type: 'tr',
                        id: 'data-row-3',
                        children: [
                          {
                            type: 'td',
                            id: 'td-3-1',
                            class: 'complete-td',
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'td-3-2',
                            class: 'complete-td',
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'td-3-3',
                            class: 'complete-td',
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'td-3-4',
                            class: 'complete-td',
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          }
                        ]
                      }
                    ]
                  },

                  // Table footer
                  {
                    type: 'tfoot',
                    id: 'complete-tfoot',
                    children: [
                      {
                        type: 'tr',
                        id: 'footer-row',
                        children: [
                          {
                            type: 'td',
                            id: 'tf-1',
                            class: 'complete-td',
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'tf-2',
                            class: 'complete-td',
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'tf-3',
                            class: 'complete-td',
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'tf-4',
                            class: 'complete-td',
                            children: [
                              { type: 'div', class: 'cell-content' }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    },

    // Simple table test for basic functionality
    'table-simple': {
      meta: {
        description: 'Simple table test site with bright colored cells (red headers, green data cells) in a basic 3x3 grid layout for easy visual verification'
      },
      styles: [
        {
          selector: '#simple-container',
          top: '10%',
          left: '10%',
          width: '80%',
          height: '80%',
          background: 'rgba(248, 249, 250, 0.95)',
          borderRadius: '8px',
          padding: '20px'
        },
        {
          selector: '#simple-table',
          top: '0%',
          left: '0%',
          width: '100%',
          height: '100%',
          background: 'white',
          borderWidth: '1px',
          borderColor: '#dee2e6',
          borderStyle: 'solid'
        },
        {
          selector: '.simple-cell',
          borderWidth: '1px',
          borderColor: '#dee2e6',
          borderStyle: 'solid',
          padding: '12px',
          background: '#00ff00' // Bright green for regular cells
        },
        {
          selector: '.simple-header',
          background: '#ff0000', // Bright red for header cells
          borderWidth: '2px',
          borderColor: '#ff0000',
          borderStyle: 'solid'
        },
        // Specific ID-based styling to ensure it works
        {
          selector: '#simple-th-1',
          background: '#ff0000' // Very bright red
        },
        {
          selector: '#simple-th-2',
          background: '#ff0000' // Very bright red
        },
        {
          selector: '#simple-th-3',
          background: '#ff0000' // Very bright red
        },
        {
          selector: '#simple-td-1',
          background: '#00ff00' // Very bright green
        },
        {
          selector: '#simple-td-2',
          background: '#00ff00' // Very bright green
        },
        {
          selector: '#simple-td-3',
          background: '#00ff00' // Very bright green
        },
        {
          selector: '#simple-td-4',
          background: '#00ff00' // Very bright green
        },
        {
          selector: '#simple-td-5',
          background: '#00ff00' // Very bright green
        },
        {
          selector: '#simple-td-6',
          background: '#00ff00' // Very bright green
        },
        // Style the content divs
        {
          selector: '.header-content',
          background: '#ff0000', // Red background for header content
          width: '100%',
          height: '100%',
          padding: '4px'
        },
        {
          selector: '.cell-content',
          background: '#00ff00', // Green background for cell content
          width: '100%',
          height: '100%',
          padding: '4px'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'simple-container',
            children: [
              {
                type: 'table',
                id: 'simple-table',
                children: [
                  {
                    type: 'tbody',
                    id: 'simple-tbody',
                    children: [
                      {
                        type: 'tr',
                        id: 'simple-row-1',
                        children: [
                          {
                            type: 'th',
                            id: 'simple-th-1',
                            class: 'simple-cell simple-header',
                            children: [
                              { type: 'div', id: 'header-content-1', class: 'header-content' }
                            ]
                          },
                          {
                            type: 'th',
                            id: 'simple-th-2',
                            class: 'simple-cell simple-header',
                            children: [
                              { type: 'div', id: 'header-content-2', class: 'header-content' }
                            ]
                          },
                          {
                            type: 'th',
                            id: 'simple-th-3',
                            class: 'simple-cell simple-header',
                            children: [
                              { type: 'div', id: 'header-content-3', class: 'header-content' }
                            ]
                          }
                        ]
                      },
                      {
                        type: 'tr',
                        id: 'simple-row-2',
                        children: [
                          {
                            type: 'td',
                            id: 'simple-td-1',
                            class: 'simple-cell',
                            children: [
                              { type: 'div', id: 'cell-content-1', class: 'cell-content' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'simple-td-2',
                            class: 'simple-cell',
                            children: [
                              { type: 'div', id: 'cell-content-2', class: 'cell-content' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'simple-td-3',
                            class: 'simple-cell',
                            children: [
                              { type: 'div', id: 'cell-content-3', class: 'cell-content' }
                            ]
                          }
                        ]
                      },
                      {
                        type: 'tr',
                        id: 'simple-row-3',
                        children: [
                          {
                            type: 'td',
                            id: 'simple-td-4',
                            class: 'simple-cell',
                            children: [
                              { type: 'div', id: 'cell-content-4', class: 'cell-content' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'simple-td-5',
                            class: 'simple-cell',
                            children: [
                              { type: 'div', id: 'cell-content-5', class: 'cell-content' }
                            ]
                          },
                          {
                            type: 'td',
                            id: 'simple-td-6',
                            class: 'simple-cell',
                            children: [
                              { type: 'div', id: 'cell-content-6', class: 'cell-content' }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    },

    // Multi-line text rendering test site
    'text-multiline': {
      meta: {
        description: 'Multi-line text rendering test site demonstrating text wrapping, white-space handling, text overflow with ellipsis, and line positioning'
      },
      styles: [
        {
          selector: 'root',
          background: '#f8f9fa'
        },

        {
          selector: '#main-container',
          top: '10%',
          left: '5%',
          width: '90%',
          height: '80%',
          background: '#ffffff',
          borderStyle: 'solid',
          padding: '20px'
        },

        // === TEST 1: Normal Text Wrapping ===
        {
          selector: '#normal-wrap-container',
          top: '5%',
          left: '5%',
          width: '40%',
          height: '15%',
          background: '#ffffff',
          borderWidth: '2px',
          borderColor: '#007bff',
          borderStyle: 'solid',
          padding: '10px'
        },

        // === TEST 2: No-wrap Text ===
        {
          selector: '#nowrap-container',
          top: '25%',
          left: '5%',
          width: '40%',
          height: '15%',
          background: '#ffffff',
          borderWidth: '2px',
          borderColor: '#28a745',
          borderStyle: 'solid',
          padding: '10px'
        },

        // === TEST 3: Text with Ellipsis Overflow ===
        {
          selector: '#ellipsis-container',
          top: '45%',
          left: '5%',
          width: '40%',
          height: '15%',
          background: '#ffffff',
          borderWidth: '2px',
          borderColor: '#ffc107',
          borderStyle: 'solid',
          padding: '10px'
        },

        // === TEST 4: Pre-formatted Text ===
        {
          selector: '#pre-container',
          top: '65%',
          left: '5%',
          width: '40%',
          height: '25%',
          background: '#ffffff',
          borderWidth: '2px',
          borderColor: '#6f42c1',
          borderStyle: 'solid',
          padding: '10px'
        },

        // === TEST 5: Different Line Heights ===
        {
          selector: '#lineheight-container',
          top: '5%',
          left: '55%',
          width: '40%',
          height: '20%',
          background: '#ffffff',
          borderWidth: '2px',
          borderColor: '#dc3545',
          borderStyle: 'solid',
          padding: '10px'
        },

        // === TEST 6: Text Alignment Variations ===
        {
          selector: '#alignment-container',
          top: '30%',
          left: '55%',
          width: '40%',
          height: '25%',
          background: '#ffffff',
          borderWidth: '2px',
          borderColor: '#17a2b8',
          borderStyle: 'solid',
          padding: '10px'
        },

        // === TEST 7: Break-word Behavior ===
        {
          selector: '#breakword-container',
          top: '60%',
          left: '55%',
          width: '40%',
          height: '20%',
          background: '#ffffff',
          borderWidth: '2px',
          borderColor: '#fd7e14',
          borderStyle: 'solid',
          padding: '10px'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'main-container',
            children: [


              // === TEST 1: Normal Text Wrapping ===
              {
                type: 'div',
                id: 'normal-wrap-container',
                textContent: 'This is a long text that should automatically wrap to multiple lines when it exceeds the container width. The text should break at word boundaries and create multiple lines with proper spacing.',
                style: {
                  fontSize: '14px',
                  fontFamily: 'Arial, sans-serif',
                  color: '#333333',
                  whiteSpace: 'normal',
                  wordWrap: 'normal',
                  textAlign: 'left',
                  lineHeight: '1.4'
                }
              },

              // === TEST 2: No-wrap Text ===
              {
                type: 'div',
                id: 'nowrap-container',
                textContent: 'This text should not wrap even if it exceeds the container width because white-space is set to nowrap.',
                style: {
                  fontSize: '14px',
                  fontFamily: 'Arial, sans-serif',
                  color: '#333333',
                  whiteSpace: 'nowrap',
                  textAlign: 'left',
                  lineHeight: '1.4'
                }
              },

              // === TEST 3: Text with Ellipsis Overflow ===
              {
                type: 'div',
                id: 'ellipsis-container',
                textContent: 'This is a very long text that should be truncated with ellipsis when it overflows the container boundaries both horizontally and vertically.',
                style: {
                  fontSize: '14px',
                  fontFamily: 'Arial, sans-serif',
                  color: '#333333',
                  whiteSpace: 'normal',
                  textOverflow: 'ellipsis',
                  textAlign: 'left',
                  lineHeight: '1.4'
                }
              },

              // === TEST 4: Pre-formatted Text ===
              {
                type: 'div',
                id: 'pre-container',
                textContent: 'This   text   has   multiple   spaces\nand line breaks\n    that should be\n        preserved exactly\nas they appear in the source.',
                style: {
                  fontSize: '12px',
                  fontFamily: 'Courier New, monospace',
                  color: '#333333',
                  whiteSpace: 'pre',
                  textAlign: 'left',
                  lineHeight: '1.2'
                }
              },

              // === TEST 5: Different Line Heights ===
              {
                type: 'div',
                id: 'lineheight-container',
                textContent: 'This text demonstrates different line height settings. The lines should have increased spacing between them for better readability and visual separation.',
                style: {
                  fontSize: '14px',
                  fontFamily: 'Arial, sans-serif',
                  color: '#333333',
                  whiteSpace: 'normal',
                  textAlign: 'left',
                  lineHeight: '2.0'
                }
              },

              // === TEST 6: Text Alignment Variations ===
              {
                type: 'div',
                id: 'alignment-container',
                textContent: 'This text is center-aligned and should wrap properly while maintaining the center alignment for each line. Multiple lines should all be centered within the container.',
                style: {
                  fontSize: '14px',
                  fontFamily: 'Arial, sans-serif',
                  color: '#333333',
                  whiteSpace: 'normal',
                  textAlign: 'center',
                  lineHeight: '1.5'
                }
              },

              // === TEST 7: Break-word Behavior ===
              {
                type: 'div',
                id: 'breakword-container',
                textContent: 'This text contains verylongwordsthatexceedthecontainerwidthandshouldbebrokenatnecessarypoints when word-wrap is set to break-word.',
                style: {
                  fontSize: '14px',
                  fontFamily: 'Arial, sans-serif',
                  color: '#333333',
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                  textAlign: 'left',
                  lineHeight: '1.4'
                }
              }
            ]
          }
        ]
      }
    },

    // TEXT RENDERING TEST SITE
    'text-basic': {
      meta: {
        description: 'Basic text rendering test with various fonts, sizes, and colors'
      },
      styles: [
        {
          selector: 'root',
          background: '#eeeeee'
        },

        {
          selector: '#main-container',
          top: '10%',
          left: '5%',
          width: '90%',
          height: '80%',
          background: '#ffffff',
          borderStyle: 'solid',
          padding: '20px'
        },

        // Title text
        {
          selector: '#title',
          top: '10%',
          left: '10%',
          width: '80%',
          height: '15%',
          background: '#343a40',
          color: '#ffffff',
          fontSize: '32px',
          fontWeight: 'bold',
          textAlign: 'center',
          borderRadius: '8px'
        },
        // Subtitle text
        {
          selector: '#subtitle',
          top: '30%',
          left: '10%',
          width: '80%',
          height: '10%',
          background: '#6c757d',
          color: '#ffffff',
          fontSize: '18px',
          textAlign: 'center',
          fontStyle: 'italic'
        },
        // Body text
        {
          selector: '#body-text',
          top: '45%',
          left: '10%',
          width: '35%',
          height: '40%',
          background: '#ffffff',
          color: '#212529',
          fontSize: '14px',
          textAlign: 'left',
          borderWidth: '1px',
          borderColor: '#dee2e6',
          borderStyle: 'solid',
          borderRadius: '4px'
        },
        // Styled text
        {
          selector: '#styled-text',
          top: '45%',
          left: '55%',
          width: '35%',
          height: '40%',
          background: '#e3f2fd',
          color: '#1976d2',
          fontSize: '16px',
          fontWeight: 'bold',
          textAlign: 'right',
          textDecoration: 'underline',
          borderWidth: '2px',
          borderColor: '#2196f3',
          borderStyle: 'solid',
          borderRadius: '8px'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'main-container',
            children: [
              {
                type: 'div',
                id: 'title',
                textContent: 'Text Rendering Test'
              },
              {
                type: 'div',
                id: 'subtitle',
                textContent: 'Testing basic text display capabilities in ASTYLARUI'
              },
              {
                type: 'div',
                id: 'body-text',
                textContent: 'This is a longer text block to test multi-line text rendering and wrapping capabilities. The text should wrap properly within the element boundaries and maintain proper spacing and alignment.'
              },
              {
                type: 'div',
                id: 'styled-text',
                textContent: 'This text demonstrates various styling options including bold weight, underline decoration, and right alignment.'
              }
            ]
          }
        ]
      }
    },

    // INPUT ELEMENTS TEST SITE
    'input-elements': {
      meta: {
        description: 'Comprehensive input elements test site showcasing text inputs, buttons, checkboxes, radio buttons, and select dropdowns with validation and keyboard navigation'
      },
      styles: [
        {
          selector: 'root',
          background: '#1a1a2e',
          padding: '10%'
        },

        // Container for all inputs
        {
          selector: '#input-container',
          // Removed manual positioning/sizing to let root padding control the layout
          // top: '5%', left: '5%', width: '90%', height: '90%'
          background: '#eeeeee',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        },

        // === TEXT INPUTS SECTION ===
        {
          selector: '#text-input-1',
          background: '#ffffff',
          borderRadius: '6px',
          borderWidth: '2px',
          borderColor: '#3498db',
          borderStyle: 'solid',
          padding: '10px',
          height: '40px',
          fontSize: '16px',
          color: '#2c3e50'
        },

        {
          selector: '#text-input-2',
          background: '#ffffff',
          borderRadius: '6px',
          borderWidth: '2px',
          borderColor: '#27ae60',
          borderStyle: 'solid',
          padding: '10px',
          height: '40px',
          fontSize: '16px',
          color: '#2c3e50'
        },

        {
          selector: '#email-input',
          background: '#ffffff',
          borderRadius: '6px',
          borderWidth: '2px',
          borderColor: '#9b59b6',
          borderStyle: 'solid',
          padding: '10px',
          height: '40px',
          fontSize: '16px',
          color: '#2c3e50'
        },

        // === BUTTONS SECTION ===
        {
          selector: '#button-1',
          background: '#3498db',
          borderRadius: '8px',
          padding: '12px 24px',
          height: '45px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#ffffff',
          cursor: 'pointer'
        },

        {
          selector: '#button-1:hover',
          background: '#2980b9',
          transform: 'scale(1.05)'
        },

        {
          selector: '#button-2',
          background: '#27ae60',
          borderRadius: '8px',
          padding: '12px 24px',
          height: '45px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#ffffff',
          cursor: 'pointer'
        },

        {
          selector: '#button-2:hover',
          background: '#229954',
          transform: 'scale(1.05)'
        },

        {
          selector: '#submit-button',
          background: '#e74c3c',
          borderRadius: '8px',
          padding: '12px 24px',
          height: '45px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#ffffff',
          cursor: 'pointer'
        },

        {
          selector: '#submit-button:hover',
          background: '#c0392b',
          transform: 'scale(1.05)'
        },

        // === CHECKBOXES SECTION ===
        {
          selector: '#checkbox-1',
          background: '#ffffff',
          borderRadius: '4px',
          borderWidth: '2px',
          borderColor: '#3498db',
          borderStyle: 'solid',
          width: '24px',
          height: '24px'
        },

        {
          selector: '#checkbox-2',
          background: '#ffffff',
          borderRadius: '4px',
          borderWidth: '2px',
          borderColor: '#27ae60',
          borderStyle: 'solid',
          width: '24px',
          height: '24px'
        },

        {
          selector: '#checkbox-3',
          background: '#ffffff',
          borderRadius: '4px',
          borderWidth: '2px',
          borderColor: '#f39c12',
          borderStyle: 'solid',
          width: '24px',
          height: '24px'
        },

        // === RADIO BUTTONS SECTION ===
        {
          selector: '#radio-1',
          background: '#ffffff',
          borderRadius: '50%',
          borderWidth: '2px',
          borderColor: '#9b59b6',
          borderStyle: 'solid',
          width: '24px',
          height: '24px'
        },

        {
          selector: '#radio-2',
          background: '#ffffff',
          borderRadius: '50%',
          borderWidth: '2px',
          borderColor: '#9b59b6',
          borderStyle: 'solid',
          width: '24px',
          height: '24px'
        },

        {
          selector: '#radio-3',
          background: '#ffffff',
          borderRadius: '50%',
          borderWidth: '2px',
          borderColor: '#9b59b6',
          borderStyle: 'solid',
          width: '24px',
          height: '24px'
        },

        // === SELECT DROPDOWN ===
        {
          selector: '#select-dropdown',
          background: '#ffffff',
          borderRadius: '6px',
          borderWidth: '2px',
          borderColor: '#e67e22',
          borderStyle: 'solid',
          padding: '10px',
          height: '40px',
          fontSize: '16px',
          color: '#2c3e50',
          cursor: 'pointer'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'input-container',
            children: [
              // Text Input 1
              {
                type: 'input',
                id: 'text-input-1',
                inputType: 'text',
                placeholder: 'Enter your name...',
                maxLength: 50,
                required: true,
                validationRules: [
                  {
                    type: 'required',
                    message: 'Name is required'
                  },
                  {
                    type: 'minLength',
                    value: 3,
                    message: 'Name must be at least 3 characters'
                  }
                ]
              },

              // Text Input 2
              {
                type: 'input',
                id: 'text-input-2',
                inputType: 'text',
                placeholder: 'Enter a message...',
                maxLength: 100
              },

              // Email Input
              {
                type: 'input',
                id: 'email-input',
                inputType: 'email',
                placeholder: 'Enter your email...',
                required: true,
                validationRules: [
                  {
                    type: 'required',
                    message: 'Email is required'
                  },
                  {
                    type: 'email',
                    message: 'Please enter a valid email address'
                  }
                ]
              },

              // Button 1
              {
                type: 'button',
                id: 'button-1',
                inputType: 'button',
                value: 'Click Me',
                onclick: 'console.log("Button 1 clicked!")'
              },

              // Button 2
              {
                type: 'button',
                id: 'button-2',
                inputType: 'button',
                value: 'Action Button',
                onclick: 'console.log("Action button clicked!")'
              },

              // Submit Button
              {
                type: 'button',
                id: 'submit-button',
                inputType: 'submit',
                value: 'Submit Form'
              },

              // Checkbox 1
              {
                type: 'input',
                id: 'checkbox-1',
                inputType: 'checkbox',
                value: 'option1',
                name: 'preferences'
              },

              // Checkbox 2
              {
                type: 'input',
                id: 'checkbox-2',
                inputType: 'checkbox',
                value: 'option2',
                name: 'preferences'
              },

              // Checkbox 3
              {
                type: 'input',
                id: 'checkbox-3',
                inputType: 'checkbox',
                value: 'option3',
                name: 'preferences'
              },

              // Radio Button 1
              {
                type: 'input',
                id: 'radio-1',
                inputType: 'radio',
                value: 'choice1',
                name: 'radioGroup'
              },

              // Radio Button 2
              {
                type: 'input',
                id: 'radio-2',
                inputType: 'radio',
                value: 'choice2',
                name: 'radioGroup'
              },

              // Radio Button 3
              {
                type: 'input',
                id: 'radio-3',
                inputType: 'radio',
                value: 'choice3',
                name: 'radioGroup'
              },

              // Select Dropdown
              {
                type: 'input',
                id: 'select-dropdown',
                inputType: 'select',
                options: [
                  { value: 'option1', label: 'Option 1' },
                  { value: 'option2', label: 'Option 2' },
                  { value: 'option3', label: 'Option 3' },
                  { value: 'option4', label: 'Option 4' }
                ]
              }
            ]
          }
        ]
      }
    },

    // HTML KITCHEN SINK TEST SITE
    'html-kitchen-sink': {
      meta: {
        description: 'HTML kitchen sink test site showcasing various HTML text formatting and semantic tags'
      },
      styles: [
        {
          selector: 'root',
          background: '#2c3e50'
        },

        // Main container
        {
          selector: '#main-container',
          top: '15%',
          left: '5%',
          width: '90%',
          height: '90%',
          background: '#34495e',
          borderRadius: '8px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        },

        // Section containers
        {
          selector: '.section',
          background: '#3a4a5c',
          borderRadius: '6px',
          padding: '15px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        },

        // Section headers
        {
          selector: '.section-header',
          color: '#ffffff',
          padding: '8px 12px',
          borderRadius: '4px',
          height: '30px'
        },

        {
          selector: '#text-header',
          background: '#e74c3c'
        },

        {
          selector: '#code-header',
          background: '#3498db'
        },

        {
          selector: '#semantic-header',
          background: '#27ae60'
        },

        {
          selector: '#interactive-header',
          background: '#9b59b6'
        },

        // Row containers
        {
          selector: '.element-row',
          display: 'flex',
          flexDirection: 'row',
          gap: '10px',
          flexWrap: 'wrap'
        },

        // Element styling - minimal overrides, rely on defaults
        {
          selector: '.test-element',
          borderRadius: '4px'
        },

        {
          selector: '.text-element',
          background: '#ecf0f1'
        },

        {
          selector: '.code-element',
          background: '#2c3e50',
          color: '#ecf0f1'
        },

        {
          selector: '.semantic-element',
          background: '#e67e22',
          color: '#ffffff'
        },

        {
          selector: '.interactive-element',
          background: '#f39c12',
          color: '#ffffff'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'main-container',
            children: [
              // Text Formatting Section
              {
                type: 'div',
                id: 'text-section',
                class: 'section',
                children: [
                  {
                    type: 'div',
                    id: 'text-header',
                    class: 'section-header',
                    textContent: 'Text Formatting'
                  },
                  {
                    type: 'div',
                    class: 'element-row',
                    children: [
                      { type: 'b', id: 'test-b', class: 'test-element text-element', textContent: 'Bold' },
                      { type: 'strong', id: 'test-strong', class: 'test-element text-element', textContent: 'Strong' },
                      { type: 'i', id: 'test-i', class: 'test-element text-element', textContent: 'Italic' },
                      { type: 'em', id: 'test-em', class: 'test-element text-element', textContent: 'Emphasis' },
                      { type: 'u', id: 'test-u', class: 'test-element text-element', textContent: 'Underline' }
                    ]
                  },
                  {
                    type: 'div',
                    class: 'element-row',
                    children: [
                      { type: 'small', id: 'test-small', class: 'test-element text-element', textContent: 'Small' },
                      { type: 'mark', id: 'test-mark', class: 'test-element', textContent: 'Marked' },
                      { type: 'del', id: 'test-del', class: 'test-element text-element', textContent: 'Deleted' },
                      { type: 'ins', id: 'test-ins', class: 'test-element', textContent: 'Inserted' }
                    ]
                  }
                ]
              },

              // Code Section
              {
                type: 'div',
                id: 'code-section',
                class: 'section',
                children: [
                  {
                    type: 'div',
                    id: 'code-header',
                    class: 'section-header',
                    textContent: 'Code & Preformatted'
                  },
                  {
                    type: 'div',
                    class: 'element-row',
                    children: [
                      { type: 'code', id: 'test-code', class: 'test-element code-element', textContent: 'code()' },
                      { type: 'kbd', id: 'test-kbd', class: 'test-element code-element', textContent: 'Ctrl+C' },
                      { type: 'samp', id: 'test-samp', class: 'test-element code-element', textContent: 'Output' },
                      { type: 'var', id: 'test-var', class: 'test-element code-element', textContent: 'variable' }
                    ]
                  }
                ]
              },

              // Semantic Section
              {
                type: 'div',
                id: 'semantic-section',
                class: 'section',
                children: [
                  {
                    type: 'div',
                    id: 'semantic-header',
                    class: 'section-header',
                    textContent: 'Semantic Elements'
                  },
                  {
                    type: 'div',
                    class: 'element-row',
                    children: [
                      { type: 'cite', id: 'test-cite', class: 'test-element semantic-element', textContent: 'Citation' },
                      { type: 'abbr', id: 'test-abbr', class: 'test-element semantic-element', textContent: 'HTML' },
                      { type: 'dfn', id: 'test-dfn', class: 'test-element semantic-element', textContent: 'Definition' }
                    ]
                  }
                ]
              },

              // Interactive Section
              {
                type: 'div',
                id: 'interactive-section',
                class: 'section',
                children: [
                  {
                    type: 'div',
                    id: 'interactive-header',
                    class: 'section-header',
                    textContent: 'Interactive & Labels'
                  },
                  {
                    type: 'div',
                    class: 'element-row',
                    children: [
                      { type: 'label', id: 'test-label', class: 'test-element interactive-element', textContent: 'Label' },
                      { type: 'legend', id: 'test-legend', class: 'test-element interactive-element', textContent: 'Legend' },
                      { type: 'summary', id: 'test-summary', class: 'test-element interactive-element', textContent: 'Summary' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  };

  getSiteData(siteName: string): SiteData | undefined {
    return this.siteData[siteName];
  }

  getSiteMeta(siteName: string): { description?: string } | undefined {
    return this.siteData[siteName]?.meta;
  }

  hasSiteData(siteName: string): boolean {
    return siteName in this.siteData;
  }

  getAllSiteNames(): string[] {
    return Object.keys(this.siteData);
  }
}

