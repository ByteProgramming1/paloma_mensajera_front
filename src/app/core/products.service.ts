import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { AddOnOption, Product, ProductAddOnGroup } from './api.models';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly api = inject(ApiClientService);
  list() { return this.api.get<Product[]>('/products'); }
  create(payload: Partial<Product>) { return this.api.post<Product>('/products', payload); }
  update(id: string, payload: Partial<Product>) { return this.api.patch<Product>(`/products/${id}`, payload); }
  uploadImage(id: string, file: File) { return this.api.upload<Product>(`/products/${id}/image`, file); }

  createAddOnGroup(productId: string, name: string) {
    return this.api.post<ProductAddOnGroup>(`/products/${productId}/addon-groups`, { name });
  }
  createAddOnOption(groupId: string, name: string) {
    return this.api.post<AddOnOption>('/add-on-options', { groupId, name });
  }
  updateAddOnOption(id: string, payload: { name?: string; isActive?: boolean }) {
    return this.api.patch<AddOnOption>(`/add-on-options/${id}`, payload);
  }
  uploadAddOnOptionImage(id: string, file: File) {
    return this.api.upload<AddOnOption>(`/add-on-options/${id}/image`, file);
  }
}
