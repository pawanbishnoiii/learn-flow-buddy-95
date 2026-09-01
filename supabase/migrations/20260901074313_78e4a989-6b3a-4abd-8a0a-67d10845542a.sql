REVOKE ALL ON FUNCTION public.close_stale_sessions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_stale_sessions() TO service_role;