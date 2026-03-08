
CREATE TABLE public.user_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  rating integer DEFAULT 5,
  admin_reply text,
  admin_replied_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own reviews" ON public.user_reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users insert own reviews" ON public.user_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins read all reviews" ON public.user_reviews
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update reviews" ON public.user_reviews
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
