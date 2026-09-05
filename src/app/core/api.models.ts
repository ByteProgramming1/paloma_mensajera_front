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

export interface Product {
  id: string;
  name: string;
  type: string;
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
