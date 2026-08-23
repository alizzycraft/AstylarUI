import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SiteDataService } from '../services/site-data.service';

/**
 * ExamplesComponent - Gallery component identical to LandingComponent
 * but links to the functional /site/:siteId routes.
 */
@Component({
  selector: 'app-examples',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="app-container">
      <main class="app-main">
        <section class="router-section">
          <h2>Functional API Demos</h2>
          
          <div class="navigation-demo">
            <h3>Site Navigation (Functional)</h3>
            <p>Test the functional <code>astylar.render()</code> API by clicking below:</p>
            
            <div class="site-links">
              <a routerLink="/" class="site-link home-link">
                🏠 Home
              </a>
              @for (siteName of availableSites(); track siteName) {
                <a [routerLink]="['/site', siteName]" 
                   class="site-link demo-link"
                   (mouseenter)="onSiteHover(siteName)"
                   (mouseleave)="onSiteLeave()">
                  <span class="icon">{{ getSiteIcon(siteName) }}</span>
                  {{ getSiteDisplayName(siteName) }}
                </a>
              }
            </div>
          </div>
          
          <div class="description-area">
            @if (hoveredSiteDescription()) {
              <div class="site-description">
                <h4>Site Description</h4>
                <p>{{ hoveredSiteDescription() }}</p>
              </div>
            } @else {
              <div class="placeholder-description">
                <p>Hover over a functional demo link above to see its description</p>
              </div>
            }
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 100vh;
      background: linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%);
      padding: 1rem;
      box-sizing: border-box;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .app-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 2rem);
      max-width: 1300px;
      margin: 0 auto;
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      box-sizing: border-box;
      overflow: hidden;
    }

    .app-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      overflow: hidden;
    }

    .router-section {
      background: #f1f5f9;
      border-radius: 10px;
      padding: 0.75rem 1rem;
      border: 1px solid #e2e8f0;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;

      h2 {
        margin: 0 0 0.5rem 0;
        color: #1e1b4b;
        font-size: 1.4rem;
        font-weight: 600;
      }
    }

    .navigation-demo {
      background: white;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-bottom: 110px;
      border: 1px solid #e5e7eb;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;

      h3 {
        margin: 0 0 0.25rem 0;
        color: #374151;
        font-size: 1.1rem;
        font-weight: 700;
      }

      p {
        color: #6b7280;
        margin-bottom: 0.75rem;
        font-size: 0.85rem;
      }

      code {
        background: #f1f5f9;
        padding: 1px 4px;
        border-radius: 3px;
        font-family: monospace;
      }
    }

    .site-links {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      overflow-y: auto;
      padding: 0.5rem;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: #fafafa;
      flex: 1;

      &::-webkit-scrollbar {
        width: 6px;
      }
      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      &::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
        &:hover { background: #a8a8a8; }
      }
    }

    .site-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0.75rem;
      background: linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      transition: all 0.2s ease;
      text-align: center;
      justify-content: center;
      font-size: 0.85rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 15px rgba(109, 40, 217, 0.3);
      }

      &.home-link {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        &:hover { box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3); }
      }

      .icon {
        font-size: 1rem;
      }
    }

    .description-area {
      position: absolute;
      bottom: 0.75rem;
      left: 1rem;
      right: 1rem;
      height: 90px;
      display: flex;
      align-items: stretch;
      background: white;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      padding: 0.5rem 0.75rem;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      z-index: 10;
    }

    .site-description {
      background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
      border-radius: 4px;
      padding: 0.5rem 0.75rem;
      border: 1px solid #8b5cf6;
      border-left: 3px solid #7c3aed;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;

      h4 {
        margin: 0 0 0.15rem 0;
        color: #4c1d95;
        font-size: 0.85rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 0.25rem;

        &::before {
          content: "📝";
          font-size: 0.9rem;
        }
      }

      p {
        margin: 0;
        color: #1e1b4b;
        font-size: 0.8rem;
        line-height: 1.3;
        font-style: italic;
      }
    }

    .placeholder-description {
      background: #f8fafc;
      border-radius: 4px;
      padding: 0.5rem;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;

      p {
        margin: 0;
        color: #64748b;
        font-size: 0.8rem;
        font-style: italic;
      }
    }
  `]
})
export class ExamplesComponent {
  private siteDataService = inject(SiteDataService);
  protected hoveredSite = signal<string | null>(null);

  protected availableSites = computed(() => this.siteDataService.getAllSiteNames());

  protected hoveredSiteDescription = computed(() => {
    const siteName = this.hoveredSite();
    if (!siteName) return null;
    return this.siteDataService.getSiteMeta(siteName)?.description || null;
  });

  protected onSiteHover(siteName: string): void {
    this.hoveredSite.set(siteName);
  }

  protected onSiteLeave(): void {
    this.hoveredSite.set(null);
  }

  protected getSiteDisplayName(siteName: string): string {
    const siteDisplayNames: Record<string, string> = {
      'dashboard': 'Dashboard Site',
      'lists': 'Lists Site',
      'settings': 'Settings Site',
      'images': 'Images Site',
      'links': 'Links Site',
      'about': 'About Site',
      'flexbox-advanced': 'Advanced Flexbox Site',
      'flexbox': 'Flexbox Site',
      'flexwrap': 'Flex Wrap Site',
      'flexgrowshrink': 'Flex Grow/Shrink Site',
      'flexgap': 'Flex Gap Site',
      'flexbox-align-content': 'Align Content Site',
      'flexbox-flex-item-sizing': 'Flex Item Sizing Site',
      'flexbox-align-self': 'Align Self Site',
      'flexbox-order': 'Flexbox-order Site',
      'flexbox-debug-simple': 'Flexbox-debug-simple Site',
      'flex-test': 'Flex-test Site',
      'tabletest': 'Tabletest Site',
      'tablecomplex': 'Tablecomplex Site',
      'html-kitchen-sink': 'HTML5 Kitchen Sink'
    };
    return siteDisplayNames[siteName] || `${siteName.charAt(0).toUpperCase() + siteName.slice(1)} Site`;
  }

  protected getSiteIcon(siteName: string): string {
    const icons: Record<string, string> = {
      'dashboard': '📊',
      'lists': '📜',
      'settings': '⚙️',
      'images': '🖼️',
      'links': '🔗',
      'about': 'ℹ️',
      'flexbox-advanced': '🛠️',
      'flexbox': '📐',
      'flexwrap': '🔄',
      'flexgrowshrink': '📏',
      'flexgap': '📊',
      'flexbox-align-content': '📜',
      'flexbox-flex-item-sizing': '📐',
      'flexbox-align-self': '🎯',
      'flexbox-order': '🌐',
      'flexbox-debug-simple': '🌐',
      'flex-test': '🌐',
      'tabletest': '🌐',
      'tablecomplex': '🌐',
      'html-kitchen-sink': '🧪'
    };
    return icons[siteName] || '🌐';
  }
}
