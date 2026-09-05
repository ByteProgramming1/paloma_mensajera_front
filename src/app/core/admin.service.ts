import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiClientService);
  metrics() { return this.api.get('/metrics/summary'); }
  listRoles() { return this.api.get('/roles'); }
  createRole(payload: { name: string; slug: string; permissionSlugs: string[] }) { return this.api.post('/roles', payload); }
  reassignRole(userId: string, newRole: string) { return this.api.patch(`/users/${userId}/role`, { newRole }); }
  toggleUser(userId: string, isActive: boolean) { return this.api.patch(`/users/${userId}/status`, { isActive }); }
  createTemporaryUser(payload: { email: string; name: string; roleSlug: string; expiresAt: string; password?: string }) { return this.api.post('/auth/temporary-user', payload); }
  updateNotificationMode(notificationMode: 'MANUAL' | 'AUTOMATIC') { return this.api.patch('/settings/notification-mode', { notificationMode }); }
}