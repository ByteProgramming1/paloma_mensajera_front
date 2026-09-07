import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { MetricsSummary, RegisterResponse, StaffRole, StaffUser, UserRole } from './api.models';

interface RawStaffUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  expiresAt?: string | null;
  roleExpiresAt?: string | null;
  createdAt?: string;
  role: { slug: UserRole; name: string };
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiClientService);

  metrics() { return this.api.get<MetricsSummary>('/metrics/summary'); }

  listUsers() {
    return this.api.get<RawStaffUser[]>('/users').pipe(
      map((users) => users.map((user): StaffUser => ({
        id: user.id,
        email: user.email,
        fullName: user.name,
        role: user.role.slug,
        isActive: user.isActive,
        expiresAt: user.expiresAt,
        roleExpiresAt: user.roleExpiresAt,
      }))),
    );
  }

  reassignRole(userId: string, newRole: UserRole, roleExpiresAt: string) {
    return this.api.patch<StaffUser>(`/users/${userId}/role`, { newRole, roleExpiresAt });
  }

  toggleUser(userId: string, isActive: boolean) {
    return this.api.patch<StaffUser>(`/users/${userId}/status`, { isActive });
  }

  createTemporaryUser(payload: { email: string; name: string; roleSlug: StaffRole; expiresAt: string; password?: string }) {
    return this.api.post<RegisterResponse>('/auth/temporary-user', payload);
  }
}
