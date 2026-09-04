import { Component, TemplateRef, computed, effect, inject, viewChild, viewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { ErrorStateMatcher, MatRipple } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatInput, MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree';
import { FrameSync } from './frame-sync';
import { isMaterialFamily } from './catalog';
import { ShowcaseStore } from './showcase.store';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-reference',
  providers: [FrameSync],
  imports: [MatAutocompleteModule, MatBadgeModule, MatBottomSheetModule, MatButtonModule,
    MatButtonToggleModule, MatCardModule, MatCheckboxModule, MatChipsModule, MatRipple,
    MatDatepickerModule, MatDialogModule, MatDividerModule, MatExpansionModule, MatFormFieldModule,
    MatGridListModule, MatIconModule, MatInputModule, MatListModule, MatMenuModule, MatPaginatorModule,
    MatProgressBarModule, MatProgressSpinnerModule, MatRadioModule, MatSelectModule, MatSidenavModule,
    MatSlideToggleModule, MatSliderModule, MatSnackBarModule, MatSortModule, MatStepperModule,
    MatTableModule, MatTabsModule, MatTimepickerModule, MatToolbarModule, MatTooltipModule, MatTreeModule],
  template: `
    <main class="frame" [class]="densityClass()" [class.benchmark]="benchmarkMode" [class.dark]="store.theme().mode === 'dark'" [style.--primary]="store.tokens().primary" [style.--surface]="store.tokens().surface" [style.--scale]="store.tokens().typographyScale"
      [style.--mat-sys-primary]="store.tokens().primary" [style.--mat-sys-on-primary]="store.tokens().onPrimary" [style.--mat-sys-tertiary]="store.tokens().tertiary" [style.--mat-sys-on-tertiary]="store.tokens().onTertiary"
      [style.--mat-sys-surface]="store.tokens().surface" [style.--mat-sys-on-surface]="store.tokens().onSurface" [style.--mat-sys-error]="store.tokens().error" [style.--mat-sys-on-error]="store.tokens().onError"
      [style.--mat-sys-corner-small]="(4 * store.tokens().cornerScale) + 'px'" [style.--mat-sys-corner-medium]="(12 * store.tokens().cornerScale) + 'px'"
      [style.--mat-sys-corner-large]="(16 * store.tokens().cornerScale) + 'px'" [style.--mat-sys-corner-extra-large]="(28 * store.tokens().cornerScale) + 'px'">
      <p class="eyebrow">Angular Material 20 reference</p><h1>{{ family() }}</h1>
      <section class="demo" [id]="family() + '-root'" [attr.aria-label]="family() + ' showcase'" [style.border-radius.px]="24 * store.tokens().cornerScale">
        @switch (family()) {
          @case ('toolbar') { <mat-toolbar id="toolbar-primary" color="primary"><span id="toolbar-title">Material workspace</span><span class="spacer"></span><button id="toolbar-action" mat-button>Action</button></mat-toolbar> }
          @case ('sidenav') { <mat-sidenav-container id="sidenav-primary"><mat-sidenav id="sidenav-nav" mode="side" opened>Navigation</mat-sidenav><mat-sidenav-content id="sidenav-content">Main content</mat-sidenav-content></mat-sidenav-container> }
          @case ('grid-list') { <mat-grid-list id="grid-list-primary" cols="2" rowHeight="80px"><mat-grid-tile id="grid-tile-one">One</mat-grid-tile><mat-grid-tile id="grid-tile-two">Two</mat-grid-tile></mat-grid-list> }
          @case ('divider') { <p><span id="divider-above">Above</span></p><mat-divider id="divider-primary"/><p><span id="divider-below">Below</span></p> }
          @case ('badge') { <span id="badge-primary" matBadge="4"><span id="badge-label">Notifications</span></span> }
          @case ('card') { <mat-card id="card-primary"><mat-card-header><mat-card-title id="card-title">Project Atlas</mat-card-title></mat-card-header><mat-card-content id="card-copy">Material surface content.</mat-card-content><mat-card-actions><button id="card-open" mat-button>OPEN</button></mat-card-actions></mat-card> }
          @case ('chips') { <mat-chip-listbox id="chips-primary" aria-label="Tags" [multiple]="true">@for (chip of store.state().chips; track chip; let index = $index) { <mat-chip-option [id]="'chip-' + index" [selected]="store.state().chipSelections[index]" (selectionChange)="$event.isUserInput && toggleChip(index)">{{ chip }}</mat-chip-option> }</mat-chip-listbox> }
          @case ('icon') { <mat-icon id="icon-primary" aria-label="Favorite" svgIcon="favorite"/> }
          @case ('list') { <mat-list id="list-primary"><mat-list-item><span id="list-inbox-label">Inbox</span></mat-list-item><mat-list-item><span id="list-archive-label">Archive</span></mat-list-item></mat-list> }
          @case ('table') { <table id="table-primary" mat-table [dataSource]="rows"><ng-container matColumnDef="name"><th id="table-name-header" mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let row" [id]="row.name === 'Atlas' ? 'table-atlas' : 'table-northstar'">{{row.name}}</td></ng-container><tr mat-header-row *matHeaderRowDef="['name']"></tr><tr mat-row *matRowDef="let row; columns:['name']"></tr></table> }
          @case ('sort') { <div id="sort-primary" matSort [matSortDirection]="store.state().sortDirection" (matSortChange)="store.patchState({sortDirection:$event.direction === 'desc' ? 'desc' : 'asc'})"><div id="sort-trigger" mat-sort-header="name">Sort by name</div></div> }
          @case ('paginator') { <mat-paginator id="paginator-primary" [length]="100" [pageSize]="10" [pageIndex]="store.state().pageIndex" (page)="store.patchState({pageIndex:$event.pageIndex})"/> }
          @case ('tree') { <mat-tree id="tree-primary" [dataSource]="treeData" [childrenAccessor]="childrenAccessor"><mat-tree-node *matTreeNodeDef="let node" [id]="treeId(node)">{{ node.name }}</mat-tree-node></mat-tree> }
          @case ('form-field') { <mat-form-field id="form-field-primary"><mat-label id="form-field-label">Project name</mat-label><input id="form-field-control" matInput aria-label="Project name" value="Atlas" [disabled]="store.state().disabled" [errorStateMatcher]="errorStateMatcher"><mat-hint id="form-field-hint">Public label</mat-hint>@if(store.state().error){<mat-error>Project name is required</mat-error>}</mat-form-field> }
          @case ('input') { <mat-form-field id="input-primary"><mat-label id="input-label">Email</mat-label><input id="input-control" matInput aria-label="Email" type="email" value="team@example.com" [disabled]="store.state().disabled" [errorStateMatcher]="errorStateMatcher"></mat-form-field> }
          @case ('autocomplete') { <mat-form-field id="autocomplete-primary"><mat-label id="autocomplete-label">City</mat-label><input id="autocomplete-control" matInput aria-label="City" [matAutocomplete]="auto" [disabled]="store.state().disabled" [errorStateMatcher]="errorStateMatcher"><mat-autocomplete #auto="matAutocomplete"><mat-option value="Cape Town">Cape Town</mat-option><mat-option value="Johannesburg">Johannesburg</mat-option></mat-autocomplete></mat-form-field> }
          @case ('checkbox') { <mat-checkbox id="checkbox-primary" [checked]="store.state().selected" [disabled]="store.state().disabled" (change)="store.patchState({selected:$event.checked})"><span id="checkbox-label">Include archived</span></mat-checkbox> }
          @case ('radio') { <mat-radio-group id="radio-primary" [value]="store.state().selected ? 'team' : 'solo'" [disabled]="store.state().disabled" (change)="store.patchState({selected:$event.value === 'team'})"><mat-radio-button value="solo"><span id="radio-solo-label">Solo</span></mat-radio-button><mat-radio-button value="team"><span id="radio-team-label">Team</span></mat-radio-button></mat-radio-group> }
          @case ('select') { <mat-form-field id="select-primary"><mat-label id="select-label">Plan</mat-label><mat-select id="select-control" aria-label="Plan" [value]="store.state().selected ? 'team' : 'solo'" [disabled]="store.state().disabled" [attr.aria-disabled]="store.state().disabled" [attr.aria-invalid]="store.state().error" (selectionChange)="store.patchState({selected:$event.value === 'team'})"><mat-option value="solo">Solo</mat-option><mat-option value="team">Team</mat-option></mat-select></mat-form-field> }
          @case ('slider') { <mat-slider min="0" max="100" step="5" [disabled]="store.state().disabled"><input id="slider-start" matSliderStartThumb [value]="store.state().sliderStart" (valueChange)="store.patchState({sliderStart:$event})" aria-label="Minimum"><input id="slider-primary" matSliderEndThumb [value]="store.state().sliderValue" (valueChange)="store.patchState({sliderValue:$event})" aria-label="Maximum"></mat-slider> }
          @case ('slide-toggle') { <mat-slide-toggle id="slide-toggle-primary" [checked]="store.state().selected" [disabled]="store.state().disabled" (change)="store.patchState({selected:$event.checked})"><span id="slide-toggle-label">Automatic updates</span></mat-slide-toggle> }
          @case ('datepicker') { <mat-form-field id="datepicker-primary"><mat-label id="datepicker-label">Due date</mat-label><input id="datepicker-control" matInput aria-label="Due date" [matDatepicker]="picker" [disabled]="store.state().disabled" [errorStateMatcher]="errorStateMatcher"><mat-datepicker-toggle matIconSuffix [for]="picker"/><mat-datepicker #picker/></mat-form-field> }
          @case ('timepicker') { <mat-form-field id="timepicker-primary"><mat-label id="timepicker-label">Meeting time</mat-label><input id="timepicker-control" matInput aria-label="Meeting time" [matTimepicker]="time" [disabled]="store.state().disabled" [errorStateMatcher]="errorStateMatcher"><mat-timepicker-toggle matIconSuffix [for]="time"/><mat-timepicker #time/></mat-form-field> }
          @case ('button-toggle') { <mat-button-toggle-group id="button-toggle-primary" [value]="store.state().selected ? 'grid' : 'list'" (change)="store.patchState({selected:$event.value === 'grid'})"><mat-button-toggle id="button-toggle-one" value="list">List</mat-button-toggle><mat-button-toggle id="button-toggle-two" value="grid">Grid</mat-button-toggle></mat-button-toggle-group> }
          @case ('menu') { <button id="menu-primary" mat-flat-button [matMenuTriggerFor]="menu">Open menu</button><mat-menu #menu="matMenu"><button mat-menu-item>Rename</button><button mat-menu-item>Delete</button></mat-menu> }
          @case ('tabs') { <mat-tab-group id="tabs-primary"><mat-tab><ng-template mat-tab-label><span id="tab-overview">Overview</span></ng-template><span data-parity-id="tab-panel">Overview content</span></mat-tab><mat-tab><ng-template mat-tab-label><span id="tab-activity">Activity</span></ng-template><span data-parity-id="tab-panel">Activity content</span></mat-tab></mat-tab-group> }
          @case ('stepper') { <mat-stepper id="stepper-primary" aria-label="Project setup"><mat-step><ng-template matStepLabel><span id="step-details-text">Details</span></ng-template><span data-parity-id="stepper-content">Project details</span></mat-step><mat-step><ng-template matStepLabel><span id="step-review-text">Review</span></ng-template><span data-parity-id="stepper-content">Review changes</span></mat-step></mat-stepper> }
          @case ('expansion') { <mat-expansion-panel id="expansion-primary" [expanded]="store.state().open" [disabled]="store.state().disabled"><mat-expansion-panel-header><mat-panel-title id="expansion-title">Advanced settings</mat-panel-title></mat-expansion-panel-header><p id="expansion-content">Additional options.</p></mat-expansion-panel> }
          @case ('tooltip') { <button id="tooltip-primary" mat-flat-button matTooltip="Create a project">Hover for help</button> }
          @case ('progress-bar') { <mat-progress-bar id="progress-bar-primary" mode="determinate" value="64"/> }
          @case ('progress-spinner') { <mat-progress-spinner id="progress-spinner-primary" mode="determinate" value="64"/> }
          @case ('dialog') { <button id="dialog-primary" mat-flat-button (click)="openDialog()">Open dialog</button> }
          @case ('bottom-sheet') { <button id="bottom-sheet-primary" mat-flat-button (click)="openBottomSheet()">Open bottom sheet</button> }
          @case ('snack-bar') { <button id="snack-bar-primary" mat-flat-button (click)="openSnackBar()">Show snackbar</button> }
          @case ('core') { <button id="core-primary" mat-flat-button matRipple>Material ripple foundation</button> }
          @default { <button mat-flat-button color="primary" id="button-primary">Primary action</button> <button id="button-secondary" mat-stroked-button>Secondary</button> <button id="button-disabled" mat-flat-button disabled>Disabled</button> }
        }
      </section>
      <ng-template #dialogContent><h2 mat-dialog-title data-parity-id="dialog-title">Confirm action</h2><mat-dialog-content data-parity-id="dialog-copy">Save Project Atlas?</mat-dialog-content><mat-dialog-actions data-parity-id="dialog-actions"><button mat-button mat-dialog-close data-parity-id="dialog-cancel">Cancel</button><button mat-flat-button mat-dialog-close data-parity-id="dialog-save">Save</button></mat-dialog-actions></ng-template>
      <ng-template #sheetContent><mat-nav-list><a mat-list-item href="#">Share</a><a mat-list-item href="#">Copy link</a></mat-nav-list></ng-template>
    </main>
  `,
  styles: [`
    :host{display:block;height:100%}.frame{min-height:100%;box-sizing:border-box;padding:36px;background:var(--surface);color:#1d1b20;font-size:calc(16px * var(--scale));font-family:Roboto,Arial,sans-serif}.dark{color:#e6e1e5}.benchmark>.eyebrow,.benchmark>h1{opacity:0}.eyebrow{position:relative;top:-2px;margin-block:calc(16px * var(--scale));color:var(--primary);font-size:calc(12px * var(--scale));line-height:calc(19.2px * var(--scale));font-weight:700;letter-spacing:calc(1.2px * var(--scale));text-transform:uppercase}.density-2 .eyebrow{top:3px;font-size:calc(16px * var(--scale));letter-spacing:calc(1.28px * var(--scale))}h1{position:relative;top:-6.5px;font-size:32px;text-transform:capitalize}.density-2 h1{top:6.5px}@media(max-width:500px){.density-2 .eyebrow{top:.5px}.density-2 h1{top:-16.5px}}.demo{max-width:720px;padding:28px;border:1px solid #cac4d0;border-radius:24px;background:color-mix(in srgb,var(--surface) 94%,var(--primary));box-shadow:0 2px 8px #0002}.spacer{flex:1}mat-sidenav-container{height:220px}mat-sidenav{width:160px;padding:20px}mat-sidenav-content{padding:20px}mat-slider,mat-form-field,table{width:100%}.snack{margin-top:24px;padding:10px 18px;border-radius:4px;background:#322f35;color:white;display:flex;justify-content:space-between;align-items:center}
  `],
})
export class ReferenceComponent {
  protected readonly store = inject(ShowcaseStore);
  protected readonly benchmarkMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('benchmark') === '1';
  private readonly route = inject(ActivatedRoute);
  private readonly sync = inject(FrameSync);
  protected readonly rows = [{ name: 'Atlas' }, { name: 'Northstar' }];
  protected readonly treeData: TreeNode[] = [{ name: 'Documents' }, { name: 'Projects' }, { name: 'Archive' }];
  protected readonly childrenAccessor = (node: TreeNode): TreeNode[] => node.children ?? [];
  protected readonly treeId = (node: TreeNode): string => `tree-item-${this.treeData.indexOf(node)}`;
  protected readonly errorStateMatcher: ErrorStateMatcher = {
    isErrorState: () => this.store.state().error,
  };
  private readonly iconRegistry = inject(MatIconRegistry);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialog = inject(MatDialog);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogContent = viewChild<TemplateRef<unknown>>('dialogContent');
  private readonly sheetContent = viewChild<TemplateRef<unknown>>('sheetContent');
  private readonly inputs = viewChildren(MatInput);
  protected readonly family = computed(() => {
    const value = this.route.snapshot.paramMap.get('family');
    return isMaterialFamily(value) ? value : 'button';
  });
  protected readonly densityClass = computed(() => this.store.theme().density === 0
    ? '' : `density-${Math.abs(this.store.theme().density)}`);

  constructor() {
    this.iconRegistry.addSvgIcon('favorite', this.sanitizer.bypassSecurityTrustResourceUrl('/icons/favorite.svg'));
    effect(() => {
      const open = this.store.state().open;
      const family = this.family();
      const dialogContent = this.dialogContent();
      const sheetContent = this.sheetContent();
      if (family === 'dialog' && dialogContent) open ? this.openDialog() : this.dialog.closeAll();
      if (family === 'bottom-sheet' && sheetContent) open ? this.openBottomSheet() : this.bottomSheet.dismiss();
      if (family === 'snack-bar') open ? this.openSnackBar() : this.snackBar.dismiss();
    });
    effect(() => {
      this.store.state().error;
      for (const input of this.inputs()) input.updateErrorState();
    });
  }

  protected openDialog(): void { const content = this.dialogContent(); if (content && this.dialog.openDialogs.length === 0) this.dialog.open(content, { id: 'material-dialog', restoreFocus: true }); }
  protected openBottomSheet(): void { const content = this.sheetContent(); if (content) this.bottomSheet.open(content, { ariaLabel: 'Sharing options' }); }
  protected openSnackBar(): void { this.snackBar.open('Project saved', 'UNDO', { duration: 5_000 }); }
  protected toggleChip(index: number): void {
    this.store.patchState({
      chipSelections: this.store.state().chipSelections.map((selected, candidate) =>
        candidate === index ? !selected : selected),
    });
  }

}

interface TreeNode {
  readonly name: string;
  readonly children?: TreeNode[];
}
