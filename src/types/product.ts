export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  image_url?: string;
  cost: number;
  price_direct: number;
  price_pv: number;
  is_active: boolean;
  unit?: string; // e.g., 'per person', 'per hour', 'flat fee'
  created_at?: string;
  updated_at?: string;
}

export type CreateProductDTO = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type UpdateProductDTO = Partial<CreateProductDTO>;
