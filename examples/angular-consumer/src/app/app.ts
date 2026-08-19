import {
  Component,
  computed,
  inject,
  NgZone,
  signal,
} from '@angular/core';
import {
  AstylarSurfaceComponent,
  type AstylarRenderOptions,
  type AstylarSurface,
  type SiteData,
} from 'astylarui';

@Component({
  selector: 'app-root',
  imports: [AstylarSurfaceComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly zone = inject(NgZone);
  private primarySurface?: AstylarSurface;
  private secondarySurface?: AstylarSurface;

  protected readonly revision = signal(1);
  protected readonly secondaryRevision = signal(1);
  protected readonly dialogOpen = signal(false);
  protected readonly primaryVisible = signal(true);
  protected readonly status = signal('Waiting for the browser renderer.');
  protected readonly primaryData = computed(() => this.createSiteData(
    this.revision(),
    this.dialogOpen(),
  ));
  protected readonly secondaryData = computed(() => this.createSiteData(
    this.secondaryRevision(),
    false,
  ));
  protected readonly primaryOptions: AstylarRenderOptions = {
    events: {
      handlers: {
        'add-item': { click: () => this.zone.run(() => this.refreshData()) },
        'item-one-action': {
          click: () => this.zone.run(() => this.status.set('Primary nested table action activated.')),
        },
        'dialog-close': { click: () => this.zone.run(() => this.toggleDialog()) },
        'search': {
          keydown: (event) => this.zone.run(() => {
            this.status.set(`Primary keyboard input: ${event.key}`);
          }),
        },
      },
    },
    navigation: {
      onNavigate: (outcome) => this.zone.run(() => {
        this.status.set(`Navigation accepted: ${outcome.href}`);
      }),
    },
  };
  protected readonly secondaryOptions: AstylarRenderOptions = {
    events: {
      handlers: {
        'add-item': { click: () => this.zone.run(() => this.refreshSecondaryData()) },
      },
    },
    navigation: {
      onNavigate: (outcome) => this.zone.run(() => {
        this.status.set(`Secondary navigation accepted: ${outcome.href}`);
      }),
    },
  };

  protected onMounted(kind: 'primary' | 'secondary', surface: AstylarSurface): void {
    if (kind === 'primary') this.primarySurface = surface;
    else this.secondarySurface = surface;
    this.status.set(`${kind === 'primary' ? 'Primary' : 'Secondary'} renderer settled and ready.`);
  }

  protected onFailed(error: unknown): void {
    this.status.set(`Renderer error: ${error instanceof Error ? error.message : String(error)}`);
  }

  protected refreshData(): void {
    this.revision.update((value) => value + 1);
    this.status.set(`Applying revision ${this.revision()}.`);
  }

  protected refreshSecondaryData(): void {
    this.secondaryRevision.update((value) => value + 1);
    this.status.set(`Applying secondary revision ${this.secondaryRevision()}.`);
  }

  protected togglePrimarySurface(): void {
    this.primaryVisible.update((visible) => !visible);
    if (!this.primaryVisible()) this.primarySurface = undefined;
    this.status.set(this.primaryVisible() ? 'Remounting the primary surface.' : 'Disposed the primary surface; secondary remains active.');
  }

  protected toggleDialog(): void {
    this.dialogOpen.update((open) => !open);
    this.status.set(this.dialogOpen() ? 'Opening details dialog.' : 'Closing details dialog.');
  }

  protected resizeSurface(kind: 'primary' | 'secondary'): void {
    const resize = (kind === 'primary' ? this.primarySurface : this.secondarySurface)?.resize();
    if (resize) {
      void resize.then(() => this.zone.run(() => this.status.set('Explicit resize completed.')));
    }
  }

  private createSiteData(revision: number, dialogOpen: boolean): SiteData {
    return {
      root: {
        children: [
          {
            type: 'div', id: 'workspace', children: [
              {
                type: 'aside', id: 'sidebar', children: [
                  { type: 'h2', id: 'brand', textContent: 'Northstar' },
                  {
                    type: 'nav', id: 'primary-nav', ariaLabel: 'Primary navigation', children: [
                      { type: 'a', id: 'nav-overview', href: '#overview', textContent: 'Overview' },
                      { type: 'a', id: 'nav-inventory', href: '#inventory', ariaCurrent: 'page', textContent: 'Inventory' },
                      { type: 'a', id: 'nav-reports', href: '#reports', textContent: 'Reports' },
                    ],
                  },
                ],
              },
              {
                type: 'main', id: 'content', children: [
                  {
                    type: 'header', id: 'page-header', children: [
                      { type: 'div', id: 'page-heading', children: [
                        { type: 'p', id: 'kicker', textContent: `Inventory / revision ${revision}` },
                        { type: 'h1', id: 'title', textContent: 'Warehouse overview' },
                      ] },
                      { type: 'button', id: 'add-item', value: 'Add item' },
                    ],
                  },
                  {
                    type: 'form', id: 'filters', children: [
                      { type: 'label', id: 'search-label', for: 'search', textContent: 'Search inventory' },
                      { type: 'input', inputType: 'text', id: 'search', name: 'search', placeholder: 'Product or SKU', value: '' },
                      { type: 'label', id: 'status-label', for: 'status', textContent: 'Status' },
                      {
                        type: 'select', id: 'status', name: 'status', value: 'all', options: [
                          { value: 'all', label: 'All stock' },
                          { value: 'ready', label: 'Ready' },
                          { value: 'low', label: 'Low stock' },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'section', id: 'summary-grid', ariaLabel: 'Inventory summary', children: [
                      { type: 'article', id: 'summary-total', children: [
                        { type: 'p', id: 'summary-total-label', textContent: 'Tracked items' },
                        { type: 'strong', id: 'summary-total-value', textContent: String(128 + revision) },
                      ] },
                      { type: 'article', id: 'summary-low', children: [
                        { type: 'p', id: 'summary-low-label', textContent: 'Low stock' },
                        { type: 'strong', id: 'summary-low-value', textContent: String(4 + (revision % 3)) },
                      ] },
                    ],
                  },
                  {
                    type: 'div', id: 'table-scroll', children: [
                      {
                        type: 'table', id: 'inventory-table', children: [
                          { type: 'thead', id: 'table-head', children: [
                            { type: 'tr', id: 'head-row', children: [
                              { type: 'th', id: 'head-item', textContent: 'Item' },
                              { type: 'th', id: 'head-status', textContent: 'Status' },
                              { type: 'th', id: 'head-action', textContent: 'Action' },
                            ] },
                          ] },
                          { type: 'tbody', id: 'table-body', children: [
                            { type: 'tr', id: 'row-one', children: [
                              { type: 'td', id: 'item-one', children: [
                                { type: 'img', id: 'item-one-image', src: '/consumer-product.svg', alt: '' },
                                { type: 'span', id: 'item-one-name', textContent: 'Canvas travel pack' },
                              ] },
                              { type: 'td', id: 'item-one-status', textContent: revision % 2 ? 'Ready' : 'Review' },
                              { type: 'td', id: 'item-one-action-cell', children: [
                                { type: 'button', id: 'item-one-action', value: 'Inspect' },
                              ] },
                            ] },
                            { type: 'tr', id: 'row-two', children: [
                              { type: 'td', id: 'item-two', textContent: 'Field notebook' },
                              { type: 'td', id: 'item-two-status', textContent: 'Low stock' },
                              { type: 'td', id: 'item-two-action-cell', children: [
                                { type: 'button', id: 'item-two-action', value: 'Inspect' },
                              ] },
                            ] },
                          ] },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'dialog', id: 'details-dialog', modal: true, open: dialogOpen, children: [
                      { type: 'h2', id: 'dialog-title', textContent: 'Item details' },
                      { type: 'p', id: 'dialog-copy', textContent: 'This modal is rendered and reconciled by the installed AstylarUI package.' },
                      { type: 'button', id: 'dialog-close', value: 'Close', autofocus: true },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      styles: [
        { selector: '#workspace', display: 'flex', width: '100%', height: '100%', background: '#eef2f7', color: '#172033', fontFamily: 'Arial', fontSize: '16px' },
        { selector: '#sidebar', width: '220px', padding: '28px 20px', background: '#15223a', color: '#f8fafc' },
        { selector: '#brand', margin: '0 0 28px 0', fontSize: '24px' },
        { selector: '#primary-nav', display: 'flex', flexDirection: 'column', gap: '10px' },
        { selector: '#primary-nav a', padding: '10px 12px', color: '#dbeafe', textDecoration: 'none', borderRadius: '8px' },
        { selector: '#nav-inventory', background: '#27456f', color: '#ffffff' },
        { selector: '#content', flex: '1', padding: '28px', overflow: 'auto' },
        { selector: '#page-header', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
        { selector: '#kicker', margin: '0 0 6px 0', color: '#526079', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' },
        { selector: '#title', margin: '0', fontSize: '30px', lineHeight: '36px' },
        { selector: 'button', padding: '10px 14px', background: '#2367d1', color: '#ffffff', borderWidth: '0', borderRadius: '7px' },
        { selector: '#filters', display: 'grid', gridTemplateColumns: '140px minmax(180px, 1fr) 70px 180px', gap: '10px', alignItems: 'center', padding: '16px', marginBottom: '18px', background: '#ffffff', borderRadius: '10px' },
        { selector: '#filters input', padding: '9px 10px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#c8d2e1', borderRadius: '6px' },
        { selector: '#filters select', padding: '9px 10px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#c8d2e1', borderRadius: '6px' },
        { selector: '#summary-grid', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', marginBottom: '18px' },
        { selector: '#summary-grid article', padding: '18px', background: '#ffffff', borderRadius: '10px' },
        { selector: '#summary-grid p', margin: '0 0 8px 0', color: '#526079' },
        { selector: '#summary-grid strong', fontSize: '26px' },
        { selector: '#table-scroll', overflow: 'auto', maxHeight: '80px', background: '#ffffff', borderRadius: '10px' },
        { selector: '#inventory-table', width: '100%', background: '#ffffff' },
        { selector: '#inventory-table th', padding: '12px', textAlign: 'left', background: '#e3eaf4', fontWeight: '700' },
        { selector: '#inventory-table td', padding: '12px', borderWidth: '0 0 1px 0', borderStyle: 'solid', borderColor: '#d9e1ec' },
        { selector: '#item-one', display: 'flex', alignItems: 'center', gap: '10px' },
        { selector: '#item-one-image', width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px' },
        { selector: '#details-dialog', position: 'fixed', width: '360px', padding: '24px', background: '#ffffff', borderWidth: '1px', borderStyle: 'solid', borderColor: '#9aabc2', borderRadius: '12px', boxShadow: '0 14px 36px rgba(15, 23, 42, 0.3)' },
        { selector: '#dialog-title', margin: '0 0 12px 0' },
        { selector: '#dialog-copy', margin: '0 0 18px 0', lineHeight: '24px' },
        { selector: '#sidebar', mediaMaxWidth: '700px', width: '150px', padding: '20px 12px' },
        { selector: '#content', mediaMaxWidth: '700px', padding: '18px' },
        { selector: '#filters', mediaMaxWidth: '700px', gridTemplateColumns: '1fr', gap: '7px' },
        { selector: '#summary-grid', mediaMaxWidth: '520px', gridTemplateColumns: '1fr' },
      ],
      meta: {
        description: 'A package-boundary consumer covering responsive layout, controls, tables, images, scrolling, navigation, updates, and a modal.',
      },
    };
  }
}
