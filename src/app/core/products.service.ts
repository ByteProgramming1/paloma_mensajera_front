import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Product } from './api.models';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly api = inject(ApiClientService);
  list() { return this.api.get<Product[]>('/products'); }
  create(payload: Partial<Product>) { return this.api.post<Product>('/products', payload); }
  update(id: string, payload: Partial<Product>) { return this.api.patch<Product>(`/products/${id}`, payload); }
  uploadImage(id: string, file: File) { return this.api.upload<Product>(`/products/${id}/image`, file); }

  associateAddOnGroup(productId: string, groupId: string) {
    return this.api.post<Product>(`/products/${productId}/addon-groups/${groupId}`);
  }
  dissociateAddOnGroup(productId: string, groupId: string) {
    return this.api.delete<Product>(`/products/${productId}/addon-groups/${groupId}`);
  }
}
