import { Order } from '../core/api.models';

export interface OrderGroup {
  groupId: string | null;
  orders: Order[];
  totalAmount: number;
}

// Agrupa pedidos que comparten groupId (creados en un mismo checkout multi-destinatario con un
// solo pago combinado). Un pedido sin groupId produce su propio grupo de un solo elemento, así
// que el caso de siempre (pedidos individuales) queda idéntico a como se veía antes de agrupar.
export function groupOrders(orders: Order[]): OrderGroup[] {
  const groups: OrderGroup[] = [];
  const byGroupId = new Map<string, OrderGroup>();

  for (const order of orders) {
    if (!order.groupId) {
      groups.push({ groupId: null, orders: [order], totalAmount: order.totalAmount });
      continue;
    }
    const existing = byGroupId.get(order.groupId);
    if (existing) {
      existing.orders.push(order);
      existing.totalAmount += order.totalAmount;
    } else {
      const group: OrderGroup = { groupId: order.groupId, orders: [order], totalAmount: order.totalAmount };
      byGroupId.set(order.groupId, group);
      groups.push(group);
    }
  }

  return groups;
}
