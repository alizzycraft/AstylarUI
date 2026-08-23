import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ReferenceComponent } from './reference.component';

describe('ReferenceComponent', () => {
  it('exposes the reference button through the official Material harness', async () => {
    await TestBed.configureTestingModule({
      imports: [ReferenceComponent, NoopAnimationsModule],
      providers: [
        provideNativeDateAdapter(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'button' } } } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReferenceComponent);
    fixture.detectChanges();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const buttons = await loader.getAllHarnesses(MatButtonHarness);
    expect(await Promise.all(buttons.map((button) => button.getText()))).toContain('Primary action');
  });
});
