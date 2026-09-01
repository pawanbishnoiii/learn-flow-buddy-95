ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS planned_end_at timestamptz;

CREATE OR REPLACE FUNCTION public.close_stale_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_ts timestamptz := now();
BEGIN
  -- Close sessions that reached their planned end time.
  UPDATE public.study_sessions
  SET is_running = false,
      ended_at = planned_end_at,
      duration_minutes = GREATEST(1, EXTRACT(EPOCH FROM (planned_end_at - started_at)) / 60)::integer,
      auto_closed = true
  WHERE is_running = true
    AND planned_end_at IS NOT NULL
    AND planned_end_at <= now_ts;

  -- Safety net: close any session running longer than 12 hours.
  UPDATE public.study_sessions
  SET is_running = false,
      ended_at = now_ts,
      duration_minutes = GREATEST(1, EXTRACT(EPOCH FROM (now_ts - started_at)) / 60)::integer,
      auto_closed = true
  WHERE is_running = true
    AND started_at < now_ts - interval '12 hours'
    AND (planned_end_at IS NULL OR planned_end_at > now_ts);
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_stale_sessions() TO service_role;