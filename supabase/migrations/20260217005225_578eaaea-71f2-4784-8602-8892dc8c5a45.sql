
CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can view subscribers" ON public.newsletter_subscribers
  FOR SELECT USING (is_admin());

CREATE POLICY "Admin can update subscribers" ON public.newsletter_subscribers
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admin can delete subscribers" ON public.newsletter_subscribers
  FOR DELETE USING (is_admin());
