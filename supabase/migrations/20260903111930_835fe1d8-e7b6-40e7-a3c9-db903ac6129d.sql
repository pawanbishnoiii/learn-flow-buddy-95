REVOKE EXECUTE ON FUNCTION public.award_session_xp() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_profile_from_auth() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_stale_sessions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_overview() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_users(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_last_seen() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_users(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_stale_sessions() TO service_role;