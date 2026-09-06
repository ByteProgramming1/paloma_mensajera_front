import { Component, computed, signal } from '@angular/core';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { CatalogBannerComponent } from './components/catalog-banner/catalog-banner';
import { CatalogFiltersComponent, CatalogFilterState } from './components/catalog-filters/catalog-filters';
import { ProductGalleryComponent } from './components/product-gallery/product-gallery';
import { Product } from '../../core/api.models';

@Component({
  selector: 'page-catalog',
  imports: [NavbarComponent, CatalogBannerComponent, CatalogFiltersComponent, ProductGalleryComponent],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css'
})
export class Catalog {
  protected readonly products = signal<Product[]>([
    {
      id: '1',
      name: 'Combo Especial',
      type: 'combos',
      imageUrl: 'assets/products/combo-especial.png',
      description: 'Caja con chocolates, una rosa y una carta personalizada.',
      price: 25000,
      stock: 18,
      isActive: true
    },
    {
      id: '2',
      name: 'Combo Enamorados',
      type: 'combos',
      imageUrl: 'assets/products/combo-enamorados.png',
      description: 'Peluche, dulces surtidos y dedicatoria en tarjeta premium.',
      price: 45000,
      stock: 18,
      isActive: false
    }
  ]);

  protected readonly filters = signal<CatalogFilterState>({
    searchTerm: '',
    onlyAvailable: false,
    category: 'todos'
  });

  protected readonly filteredProducts = computed(() => {
    const { searchTerm, onlyAvailable, category } = this.filters();

    return this.products().filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = category === 'todos' || product.type === category;
      const matchesAvailability = !onlyAvailable || product.isActive;

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  });

  protected onFiltersChange(state: CatalogFilterState): void {
    this.filters.set(state);
  }

  protected onAddToCart(productId: string): void {
    console.log('Agregar al carrito:', productId);
  }
}