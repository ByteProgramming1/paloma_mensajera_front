import { Component, effect, output, signal } from '@angular/core';

export type CatalogCategory = 'todos' | 'combos' | 'cartas' | 'dulces' | 'rosas' | 'otras';

export interface CatalogFilterState {
  searchTerm: string;
  onlyAvailable: boolean;
  category: CatalogCategory;
}

@Component({
  selector: 'app-catalog-filters',
  templateUrl: './catalog-filters.html',
  styleUrl: './catalog-filters.css'
})
export class CatalogFiltersComponent {
  protected readonly searchTerm = signal('');
  protected readonly onlyAvailable = signal(false);
  protected readonly activeCategory = signal<CatalogCategory>('todos');

  readonly filtersChange = output<CatalogFilterState>();

  protected readonly categories: { id: CatalogCategory; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'combos', label: 'Combos' },
    { id: 'cartas', label: 'Cartas' },
    { id: 'dulces', label: 'Dulces' },
    { id: 'rosas', label: 'Rosas' },
    { id: 'otras', label: 'Otras' },
  ];

  constructor() {
    effect(() => {
      this.filtersChange.emit({
        searchTerm: this.searchTerm(),
        onlyAvailable: this.onlyAvailable(),
        category: this.activeCategory()
      });
    });
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected toggleAvailable(): void {
    this.onlyAvailable.update((value) => !value);
  }

  protected setCategory(category: CatalogCategory): void {
    this.activeCategory.set(category);
  }
}