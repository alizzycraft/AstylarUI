import { Routes } from '@angular/router';
import { ExamplesComponent } from './components/examples.component';
import { SiteComponent } from './components/site.component';
import { SimpleDemoComponent } from './components/simple-demo.component';
import { ParityAstylarComponent } from '../parity/parity-astylar.component';
import { ParityReferenceComponent } from '../parity/parity-reference.component';

export const routes: Routes = [
  { path: '', component: ExamplesComponent, title: 'AstylarUI - Demo Gallery' },
  { path: 'site/:siteId', component: SiteComponent, title: 'AstylarUI Demo' },
  { path: 'simple-demo', component: SimpleDemoComponent, title: 'AstylarUI Simple Demo' },
  {
    path: 'parity/reference/:fixtureId',
    component: ParityReferenceComponent,
    title: 'AstylarUI Parity Reference'
  },
  {
    path: 'parity/astylar/:fixtureId',
    component: ParityAstylarComponent,
    title: 'AstylarUI Parity Render'
  },
  { path: '**', redirectTo: '' }
];
