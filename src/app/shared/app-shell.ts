import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopNav } from './top-nav';
import { FooterComponent } from '../footer/footer';

@Component({
  selector: 'app-shell',
  imports: [TopNav, RouterOutlet, FooterComponent],
  template: `
    <div class="app-shell bg-bg-base">
      <app-top-nav />
      <main class="mx-auto w-full max-w-[1180px] flex-1 px-6 py-10">
        <router-outlet />
      </main>
      <app-footer />
    </div>
  `,
})
export class AppShell {}
