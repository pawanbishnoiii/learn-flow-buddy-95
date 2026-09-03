CREATE TABLE IF NOT EXISTS public.email_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  provider text NOT NULL DEFAULT 'lovable',
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_user text,
  smtp_password text,
  from_email text,
  from_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.email_settings TO authenticated;
GRANT ALL ON public.email_settings TO service_role;

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read email settings" ON public.email_settings;
CREATE POLICY "admins read email settings" ON public.email_settings
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admins insert email settings" ON public.email_settings;
CREATE POLICY "admins insert email settings" ON public.email_settings
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admins update email settings" ON public.email_settings;
CREATE POLICY "admins update email settings" ON public.email_settings
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.email_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;