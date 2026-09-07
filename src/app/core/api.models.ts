// Roles reales según el SDD (sección 6): el rol VERIFIER no existe como rol independiente.
// El Vendedor (seller) revisa dedicatorias y hace entregas; el Administrador (admin) verifica pagos
// y gestiona roles/catálogo. Las cuentas pueden rotar temporalmente entre estos roles.
export type StaffRole = 'admin' | 'seller';
export type UserRole = StaffRole | 'comprador';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
  roleSlug: UserRole;
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export type ProductType = 'COMBO' | 'ADICIONAL';

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  price: number;
  stock: number;
  isActive: boolean;
  imageUrl?: string | null;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export type BuyerType = 'ESTUDIANTE' | 'PROFESOR' | 'ADMINISTRATIVO';
export type SalesChannel = 'ONLINE' | 'PRESENCIAL';

export interface CreateOrderRequest {
  buyerFullName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerType: BuyerType;
  buyerCareerOrArea: string;
  assistedBySellerId?: string;
  selfPickup: boolean;
  recipientFullName?: string;
  recipientCareerOrArea?: string;
  recipientTeamsUser?: string;
  deliveryNotes?: string;
  cartItems: CartItem[];
  letterContent: string;
  isAnonymous: boolean;
  salesChannel: SalesChannel;
}

export interface OrderQuery {
  view?: 'message';
  search?: string;
  recipientName?: string;
}

// Estados del pedido — sección 8 del SDD (ORDER.status)
export type OrderStatus =
  | 'MESSAGE_PENDING_REVIEW'
  | 'MESSAGE_APPROVED'
  | 'MESSAGE_REJECTED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_REJECTED'
  | 'IN_PREPARATION'
  | 'IN_ROUTE'
  | 'DELIVERED'
  | 'CANCELLED';

export type MessageReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface OrderItem {
  id: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
}

export interface MessageReview {
  humanReviewStatus: MessageReviewStatus;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
}

export interface PaymentTransaction {
  id?: string;
  orderId?: string;
  paymentMethod: 'NEQUI';
  verified: boolean;
  verifiedByAdminId?: string | null;
  verifiedAt?: string | null;
  verificationNotes?: string | null;
}

// Forma real devuelta por el backend: todos los campos van planos sobre el pedido,
// no anidados bajo un `deliveryDetail` (a diferencia de como lo sugiere el ERD del SDD).
export interface Order {
  id: string;
  orderCode: string;
  status: OrderStatus;
  totalAmount: number;
  salesChannel: SalesChannel;
  assistedBySellerId?: string | null;
  createdAt: string;
  items: OrderItem[];
  raffleNumber: number | null;
  buyerFullName?: string | null; // omitido para SELLER si isAnonymous = true
  buyerEmail?: string;
  buyerPhone?: string;
  buyerType?: BuyerType;
  buyerCareerOrArea?: string;
  selfPickup: boolean;
  recipientFullName: string;
  recipientCareerOrArea?: string | null;
  recipientTeamsUser?: string | null;
  deliveryNotes?: string | null;
  letterContent: string;
  isAnonymous: boolean;
  teamsNotificationSent?: boolean;
  payment?: PaymentTransaction | null;
  messageReview?: MessageReview | null;
}

// GET /orders?view=message — vista reducida y buscable de la cola de dedicatorias (sección 3.2 del SDD).
export interface OrderMessageQueueItem {
  orderId: string;
  orderCode: string;
  buyerFullName: string;
  recipientFullName: string;
  letterContent: string;
  isAnonymous: boolean;
  selfPickup: boolean;
  deliveryNotes?: string | null;
}

export interface RaffleNumber {
  id: string;
  number: number;
  status: 'AVAILABLE' | 'ASSIGNED';
  orderId?: string | null;
  drawnAsWinner: boolean;
  drawBatchId?: string | null;
  drawnAt?: string | null;
}

export interface RaffleDrawRequest {
  drawBatchId?: string;
}

export interface RaffleConfigureResult {
  totalNumbers: number;
  numbersCreated: number;
}

// POST /raffle-numbers/draw y GET /raffle-numbers/draw-history usan formas distintas entre sí
// (verificado contra el server real, no coinciden con lo que sugiere el SDD).

// Respuesta de POST /raffle-numbers/draw: plana, sin envolver en `order`.
export interface RaffleDrawItem { productName: string; quantity: number; }

export interface RaffleDrawResult {
  raffleNumber: number;
  drawBatchId: string;
  drawnAt: string;
  buyerFullName?: string | null;
  recipientFullName: string;
  items: RaffleDrawItem[];
}

// Respuesta de GET /raffle-numbers/draw-history: sí anida bajo order.deliveryDetail.
export interface RaffleDrawHistoryOrderSummary {
  id: string;
  orderCode: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryDetail: {
    buyerFullName?: string | null;
    recipientFullName: string;
    selfPickup: boolean;
    isAnonymous: boolean;
  };
}

export interface RaffleDrawHistoryEntry {
  id: string;
  drawBatchId: string;
  raffleNumberId: string;
  orderId: string;
  drawnAt: string;
  drawnByAdminId?: string | null;
  raffleNumber: { number: number };
  order: RaffleDrawHistoryOrderSummary;
}

export type DeliveryStatus = 'IN_PREPARATION' | 'IN_ROUTE' | 'DELIVERED' | 'UNDELIVERED_RETRY' | 'CANCELLED';

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  expiresAt?: string | null;
  roleAssignedAt?: string | null;
  roleExpiresAt?: string | null;
}

export type NotificationMode = 'MANUAL' | 'AUTOMATIC';

export interface SalesChannelMetric { count: number; totalAmount: number; }

export interface MetricsSummary {
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  ordersBySalesChannel: Partial<Record<SalesChannel, SalesChannelMetric>>;
  totalRevenue: number;
}

export interface ApiError {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}
