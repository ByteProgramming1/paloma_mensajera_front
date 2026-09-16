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

// Pago combinado "todo o nada" (ver PATCH /orders/groups/:groupId/verify-payment en el
// backend): el pago de un grupo solo se puede confirmar/rechazar cuando TODOS sus pedidos
// llegaron a PAYMENT_PENDING (cada destinatario ya tuvo su dedicatoria aprobada y eligió su
// número de rifa). Si falta uno, el backend rechaza la accion para el grupo completo — se usa
// para avisarlo en la UI en vez de dejar que el botón de confirmar falle con un error confuso.
export function isGroupReadyForPayment(group: OrderGroup): boolean {
  return group.orders.every((order) => order.status === 'PAYMENT_PENDING');
}

// Motivo legible de por qué un pedido del grupo todavía no llega a PAYMENT_PENDING, para
// mostrarle a quien verifica el pago qué falta y de quién, en vez de que el pedido
// simplemente desaparezca de la cola sin explicación.
export function paymentBlockedReason(order: Order): string {
  switch (order.status) {
    case 'MESSAGE_PENDING_REVIEW':
      return 'dedicatoria por revisar';
    case 'MESSAGE_REJECTED':
      return 'dedicatoria rechazada — el comprador debe reenviarla';
    case 'MESSAGE_APPROVED':
      return 'falta elegir número de rifa';
    default:
      return order.status;
  }
}
