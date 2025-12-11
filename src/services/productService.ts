import { supabase } from '../lib/supabase';
import type { Product, CreateProductDTO, UpdateProductDTO } from '../types/product';

export const productService = {
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapToProduct);
  },

  async getProduct(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return mapToProduct(data);
  },

  async createProduct(product: CreateProductDTO): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        description: product.description,
        category: product.category,
        cost: product.cost,
        price_direct: product.price_direct,
        price_pv: product.price_pv,
        is_active: product.is_active,
        unit: product.unit,
        image_url: product.image_url
      })
      .select()
      .single();

    if (error) throw error;

    return mapToProduct(data);
  },

  async updateProduct(id: string, product: UpdateProductDTO): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...product,
        // updated_at: new Date().toISOString() // TODO: Add updated_at column to DB
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return mapToProduct(data);
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Helper to map DB result to Product type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToProduct(data: any): Product {
  return {
    ...data,
    description: data.description || '',
    image_url: data.image_url || undefined,
    unit: data.unit || undefined,
    is_active: data.is_active ?? true,
    updated_at: data.created_at // Fallback
  };
}
