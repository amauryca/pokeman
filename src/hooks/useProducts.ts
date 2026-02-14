import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  status: string;
  image_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  product_images?: ProductImage[];
}

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Sort product_images by sort_order
      return (data as any[]).map(p => ({
        ...p,
        product_images: (p.product_images || []).sort((a: ProductImage, b: ProductImage) => a.sort_order - b.sort_order),
      })) as Product[];
    },
  });
};
