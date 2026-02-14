
-- Add description column to products
ALTER TABLE public.products ADD COLUMN description text;

-- Create product_images table for gallery
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Everyone can view product images
CREATE POLICY "Product images readable by everyone"
ON public.product_images
FOR SELECT
USING (true);

-- Only admins can manage product images
CREATE POLICY "Admin can insert product images"
ON public.product_images
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admin can update product images"
ON public.product_images
FOR UPDATE
USING (is_admin());

CREATE POLICY "Admin can delete product images"
ON public.product_images
FOR DELETE
USING (is_admin());

-- Index for fast lookups
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
