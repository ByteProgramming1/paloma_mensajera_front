import { Component, input, output } from '@angular/core';
import { ProductCardComponent } from '../product-card/product-card';
import { Product } from '../../../../core/api.models';

@Component({
  selector: 'app-product-gallery',
  imports: [ProductCardComponent],
  templateUrl: './product-gallery.html',
  styleUrl: './product-gallery.css'
})
export class ProductGalleryComponent {
  readonly products = input.required<Product[]>();
  readonly addToCart = output<string>();
}