import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
}

const DISPLAY_MS = 3000;

/** Confirmación breve de que una acción (aprobar, confirmar, marcar entregado, etc.) se realizó. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly messages = signal<ToastMessage[]>([]);

  success(text: string): void {
    const id = this.nextId++;
    this.messages.update((current) => [...current, { id, text }]);
    setTimeout(() => this.dismiss(id), DISPLAY_MS);
  }

  dismiss(id: number): void {
    this.messages.update((current) => current.filter((message) => message.id !== id));
  }
}
