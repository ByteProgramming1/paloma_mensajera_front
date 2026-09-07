import { Component } from '@angular/core';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { SectionHeaderComponent } from '../../shared/section-header/section-header';
import { OrdersOrderTableComponent } from './order-table/order-table';

@Component({
  selector: 'app-orders',
  imports: [NavbarComponent, SectionHeaderComponent, OrdersOrderTableComponent],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {}
