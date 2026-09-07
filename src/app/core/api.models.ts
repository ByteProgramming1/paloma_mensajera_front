export type UserRole = 'admin' | 'seller' | 'delivery' | 'comprador' | 'verifier';

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

export type ProductType = 'combos' | 'cartas' | 'dulces' | 'rosas' | 'otras';
export interface Product {
  id: string;
  name: string;
  type: ProductType;
  description: string;
  price: number;
  stock: number;
  isActive: boolean;
  imageUrl?: string | null;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface CreateOrderRequest {
  buyerFullName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerType: string;
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
  salesChannel: string;
}

export interface OrderQuery {
  view?: 'message';
  search?: string;
  recipientName?: string;
}

export interface RaffleDrawRequest {
  drawBatchId?: string;
}

export interface ApiError {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export type OrderStatus = 'pendiente' | 'pagado' | 'en_camino' | 'entregado';

export interface Order {
  id: string;
  description: string;
  price: number;
  status: OrderStatus;
}

interface StatusVisual {
  label: string;
  badgeClass: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusVisual> = {
  pendiente: { label: 'Pendiente de verificación', badgeClass: 'item-badge--pendiente' },
  pagado: { label: 'Pagado', badgeClass: 'item-badge--pagado' },
  en_camino: { label: 'En camino', badgeClass: 'item-badge--en-camino' },
  entregado: { label: 'Entregado', badgeClass: 'item-badge--entregado' },
};