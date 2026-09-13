import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopNav } from './top-nav';
import { FooterComponent } from '../footer/footer';
import { Toast } from './toast';

@Component({
  selector: 'app-shell',
  imports: [TopNav, RouterOutlet, FooterComponent, Toast],
  template: `
    <div class="app-shell bg-bg-base">
      <app-top-nav />
      <main class="mx-auto w-full max-w-[1180px] flex-1 px-6 py-10">
        <router-outlet />
      </main>
      <app-footer />
    </div>
    <app-toast />
  `,
})
export class AppShell {}
