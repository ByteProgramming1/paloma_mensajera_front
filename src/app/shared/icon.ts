import { Component, input } from '@angular/core';

export type IconName = 'gift' | 'envelope' | 'lock' | 'close' | 'menu' | 'search' | 'check' | 'chevron-down' | 'alert' | 'copy' | 'chevron-left' | 'chevron-right';

const PATHS: Record<IconName, string> = {
  gift: 'M20 12v10H4V12M2 7h20v5H2V7ZM12 22V7M12 7C9.5 7 8 5.5 8 3.5S9.5 1 11 1s1 2 1 3M12 7c2.5 0 4-1.5 4-3.5S14.5 1 13 1s-1 2-1 3',
  envelope: 'M3 6h18v12H3V6Zm0 0 9 7 9-7',
  lock: 'M6 11V8a6 6 0 1 1 12 0v3M5 11h14v10H5V11Z',
  close: 'M6 6l12 12M18 6 6 18',
  menu: 'M3 6h18M3 12h18M3 18h18',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35',
  check: 'M4 12l5 5 11-11',
  'chevron-down': 'm6 9 6 6 6-6',
  'chevron-left': 'm15 18-6-6 6-6',
  'chevron-right': 'm9 18 6-6-6-6',
  alert: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01',
  copy: 'M9 9h10v10H9zM5 15V5h10',
};

@Component({
  selector: 'app-icon',
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      [attr.stroke-width]="strokeWidth()"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      class="shrink-0"
    >
      <path [attr.d]="path()" />
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly strokeWidth = input(1.75);

  protected path(): string {
    return PATHS[this.name()];
  }
}
