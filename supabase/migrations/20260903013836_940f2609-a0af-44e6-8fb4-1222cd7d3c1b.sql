
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS signup_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS google_auth_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS one_tap_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_auth_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarding_require_subjects boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_daily_goal_hours numeric NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS default_weekly_goal_hours numeric NOT NULL DEFAULT 26,
  ADD COLUMN IF NOT EXISTS announcement_level text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT '#4F46E5';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS sign_in_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS email text;

CREATE TABLE IF NOT EXISTS public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  path text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.app_events TO authenticated;
GRANT ALL ON public.app_events TO service_role;
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own events insert" ON public.app_events;
CREATE POLICY "own events insert" ON public.app_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own events read" ON public.app_events;
CREATE POLICY "own events read" ON public.app_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS app_events_created_idx ON public.app_events (created_at DESC);
CREATE INDEX IF NOT EXISTS app_events_user_idx ON public.app_events (user_id, created_at DESC);

DROP POLICY IF EXISTS "admins read profiles" ON public.profiles;
CREATE POLICY "admins read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read sessions" ON public.study_sessions;
CREATE POLICY "admins read sessions" ON public.study_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read subjects" ON public.subjects;
CREATE POLICY "admins read subjects" ON public.subjects
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.touch_last_seen() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'onboarded_users', (SELECT count(*) FROM public.profiles WHERE onboarded),
    'active_today', (SELECT count(*) FROM public.profiles WHERE last_seen_at > now() - interval '1 day'),
    'active_week', (SELECT count(*) FROM public.profiles WHERE last_seen_at > now() - interval '7 days'),
    'sessions_today', (SELECT count(*) FROM public.study_sessions WHERE started_at > now() - interval '1 day'),
    'minutes_today', (SELECT coalesce(sum(duration_minutes),0) FROM public.study_sessions WHERE started_at > now() - interval '1 day'),
    'minutes_week', (SELECT coalesce(sum(duration_minutes),0) FROM public.study_sessions WHERE started_at > now() - interval '7 days'),
    'total_subjects', (SELECT count(*) FROM public.subjects),
    'events_today', (SELECT count(*) FROM public.app_events WHERE created_at > now() - interval '1 day')
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_overview() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_users(_limit integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  display_name text,
  email text,
  avatar_url text,
  onboarded boolean,
  last_seen_at timestamptz,
  created_at timestamptz,
  total_minutes bigint,
  session_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT p.id, p.display_name, p.email, p.avatar_url, p.onboarded, p.last_seen_at, p.created_at,
         coalesce(s.mins, 0)::bigint, coalesce(s.cnt, 0)::bigint
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id, sum(duration_minutes) AS mins, count(*) AS cnt
    FROM public.study_sessions GROUP BY user_id
  ) s ON s.user_id = p.id
  ORDER BY p.last_seen_at DESC NULLS LAST
  LIMIT _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_users(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_users(integer) TO authenticated;
