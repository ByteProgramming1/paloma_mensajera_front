import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { AddOnOption, ProductAddOnGroup } from './api.models';

@Injectable({ providedIn: 'root' })
export class AddOnGroupsService {
  private readonly api = inject(ApiClientService);

  list() { return this.api.get<ProductAddOnGroup[]>('/addon-groups'); }
  create(name: string) { return this.api.post<ProductAddOnGroup>('/addon-groups', { name }); }

  createOption(groupId: string, name: string) {
    return this.api.post<AddOnOption>('/add-on-options', { groupId, name });
  }
  updateOption(id: string, payload: { name?: string; isActive?: boolean }) {
    return this.api.patch<AddOnOption>(`/add-on-options/${id}`, payload);
  }
  uploadOptionImage(id: string, file: File) {
    return this.api.upload<AddOnOption>(`/add-on-options/${id}/image`, file);
  }
}
