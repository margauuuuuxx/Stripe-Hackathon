export interface StripeProduct {
  id: string;
  name: string;
  description?: string;
  images: string[];
  metadata: Record<string, string>;
  active: boolean;
  created: number;
  updated: number;
  url?: string;
  default_price?: {
    id: string;
    unit_amount: number | null;
    currency: string;
  } | null;
}

export interface ProductListResponse {
  products: StripeProduct[];
  total: number;
  url: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}