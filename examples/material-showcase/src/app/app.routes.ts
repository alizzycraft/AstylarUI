import { Routes } from '@angular/router';
export const routes: Routes = [
  { path: 'compare', loadComponent: () => import('./comparison.component').then((module) => module.ComparisonComponent) },
  { path: 'reference/:family', loadComponent: () => import('./reference.component').then((module) => module.ReferenceComponent) },
  { path: 'astylar/:family', loadComponent: () => import('./astylar.component').then((module) => module.AstylarShowcaseComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'compare' },
  { path: '**', redirectTo: 'compare' },
];
