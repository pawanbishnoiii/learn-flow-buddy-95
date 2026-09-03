-- device tokens
CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'web',
  device_label text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO authenticated;
GRANT ALL ON public.device_tokens TO service_role;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own device tokens" ON public.device_tokens FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read device tokens" ON public.device_tokens FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER device_tokens_updated_at BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- avatar presets
CREATE TABLE public.avatar_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.avatar_presets TO anon;
GRANT SELECT ON public.avatar_presets TO authenticated;
GRANT ALL ON public.avatar_presets TO service_role;
ALTER TABLE public.avatar_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avatar presets readable" ON public.avatar_presets FOR SELECT USING (true);
CREATE POLICY "admins manage avatar presets" ON public.avatar_presets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER avatar_presets_updated_at BEFORE UPDATE ON public.avatar_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- background jobs
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  run_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_status_run_at_idx ON public.jobs (status, run_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage jobs" ON public.jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- app settings: android app + push controls
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS avatar_upload_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS android_min_version text,
  ADD COLUMN IF NOT EXISTS android_latest_version text,
  ADD COLUMN IF NOT EXISTS android_update_url text,
  ADD COLUMN IF NOT EXISTS android_force_update boolean NOT NULL DEFAULT false;

-- notifications: admin broadcast + push tracking
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS push_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS action_path text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE POLICY "admins insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins read notifications" ON public.notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- XP: award on session completion
CREATE OR REPLACE FUNCTION public.award_session_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE gained integer;
BEGIN
  IF NEW.is_running = false AND (OLD.is_running = true OR OLD IS NULL) AND coalesce(NEW.duration_minutes,0) > 0 THEN
    gained := GREATEST(1, NEW.duration_minutes);
    INSERT INTO public.user_xp (user_id, total_xp, level, updated_at)
    VALUES (NEW.user_id, gained, 1, now())
    ON CONFLICT (user_id) DO UPDATE
      SET total_xp = public.user_xp.total_xp + gained,
          level = GREATEST(1, ((public.user_xp.total_xp + gained) / 500) + 1),
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS user_xp_user_id_key ON public.user_xp (user_id);

CREATE TRIGGER study_sessions_award_xp AFTER UPDATE ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.award_session_xp();