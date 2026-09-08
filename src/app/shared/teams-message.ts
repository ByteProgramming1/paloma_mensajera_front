import { Order } from '../core/api.models';

/** Mensaje manual por Teams para avisarle al destinatario que pase por el punto de entrega — usado mientras el envío automático por Graph no esté configurado. */
export function buildTeamsPickupMessage(order: Order): string {
  return `Hola ${order.recipientFullName}, tienes un detalle de Paloma Mensajera esperándote. Pasa por el punto de entrega a recogerlo. ¡Te esperamos! (Pedido ${order.orderCode})`;
}
