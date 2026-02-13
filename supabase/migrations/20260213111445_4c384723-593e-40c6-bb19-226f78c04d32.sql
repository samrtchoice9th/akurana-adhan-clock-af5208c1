
CREATE TABLE public.hijri_admin_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  hijri_date_snapshot TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hijri_admin_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert hijri_admin_log" ON public.hijri_admin_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read hijri_admin_log" ON public.hijri_admin_log FOR SELECT USING (true);
