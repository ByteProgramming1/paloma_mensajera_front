import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LandingPage } from './landing/landing-page';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', async () => {
    const harness = await RouterTestingHarness.create();
    const landing = await harness.navigateByUrl('/', LandingPage);
    expect(landing).toBeTruthy();
  });

  it('should render the institutional login on the landing route', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    const compiled = harness.routeNativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Haz llegar un detalle');
    expect(compiled.querySelector('button')?.textContent).toContain('Ingresar');
  });
});
