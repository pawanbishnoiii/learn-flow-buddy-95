import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Flame,
  History as HistoryIcon,
  LayoutDashboard,
  LogOut,
  Play,
  Settings as SettingsIcon,
  ShieldCheck,
  Target,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchSessions,
  fetchSettings,
  isAdmin,
  minutesInRange,
  startOfToday,
  syncIdentityToProfile,
  touchLastSeen,
  logEvent,
} from "@/lib/study";
import { dailyHitStreak } from "@/lib/streak";
import { CinematicThemeSwitcher } from "@/components/ui/cinematic-theme-switcher";
import { LimelightNav } from "@/components/ui/limelight-nav";


const NAV = [
  { to: "/today", label: "Home", Icon: LayoutDashboard },
  { to: "/timetable", label: "Timetable", Icon: CalendarDays },
  { to: "/study", label: "Study", Icon: Play, center: true },
  { to: "/targets", label: "Targets", Icon: Target },
  { to: "/history", label: "History", Icon: HistoryIcon },
] as const;

const EIGHT_WEEKS = new Date(Date.now() - 8 * 7 * 864e5).toISOString();

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const profile = useQuery({ queryKey: ["profile"], queryFn: syncIdentityToProfile });
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: isAdmin });
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const sessions = useQuery({
    queryKey: ["sessions", "8w"],
    queryFn: () => fetchSessions(EIGHT_WEEKS),
  });
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const dailyGoal = settings.data?.daily_goal_hours ?? 4;
  const all = useMemo(() => sessions.data ?? [], [sessions.data]);
  const todayPct = Math.min(
    100,
    Math.round((minutesInRange(all, startOfToday()) / (dailyGoal * 60)) * 100),
  );
  const streak = useMemo(() => dailyHitStreak(all, dailyGoal), [all, dailyGoal]);

  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  // Presence heartbeat + lightweight page-view telemetry for the admin console.
  useEffect(() => {
    void touchLastSeen().catch(() => {});
    void logEvent("page_view", pathname).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void touchLastSeen().catch(() => {});
    }, 120_000);
    return () => window.clearInterval(id);
  }, []);

  // Sticky mini progress reveals itself once the hero card scrolls away.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 220);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials =
    (profile.data?.first_name?.[0] ?? profile.data?.display_name?.[0] ?? "S") +
    (profile.data?.last_name?.[0] ?? "T");

  return (
    <div className="app-backdrop flex min-h-screen flex-col text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-4 pt-4 pb-3 backdrop-blur-xl sm:px-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <Link to="/today" className="flex min-w-0 items-center gap-3">
          <span className="gradient-ring grid size-9 shrink-0 place-items-center rounded-xl p-[1.5px]">
            <span className="grid size-full place-items-center rounded-[10px] bg-background">
              <span className="gradient-ring size-3 rounded-[4px] shadow-[var(--shadow-glow)]" />
            </span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm leading-none font-semibold tracking-tight">
              Chronodeck
            </span>
            <span className="mt-1 block font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
              Study OS
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <CinematicThemeSwitcher />

          {streak > 2 ? (
            <span
              title={`${streak} day streak`}
              className="flex items-center gap-1 rounded-xl border border-[color-mix(in_oklab,var(--state-partial)_40%,transparent)] bg-[color-mix(in_oklab,var(--state-partial)_12%,transparent)] px-2 py-1"
              style={{ color: "var(--state-partial)" }}
            >
              <Flame className="size-3.5" strokeWidth={2} />
              <span className="num text-[11px] font-semibold">{streak}</span>
            </span>
          ) : null}
          <IconLink to="/settings" label="Settings">
            <SettingsIcon className="size-4" />
          </IconLink>
          <div className="relative">
            <button
              onClick={() => setMenu((v) => !v)}
              aria-label="Account menu"
              aria-expanded={menu}
              className="grid size-9 place-items-center overflow-hidden rounded-full bg-warm/15 text-[10px] font-semibold text-warm outline-1 -outline-offset-1 outline-border transition-transform active:scale-95"
            >
              {profile.data?.avatar_url ? (
                <img
                  src={profile.data.avatar_url}
                  alt="Your avatar"
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                initials.toUpperCase()
              )}
            </button>

            {menu ? (
              <>
                <button
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setMenu(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-2xl"
                >
                  <MenuLink to="/profile" Icon={UserIcon} label="Profile" />
                  <MenuLink to="/settings" Icon={SettingsIcon} label="Settings" />
                  {admin.data ? <MenuLink to="/admin" Icon={ShieldCheck} label="Admin console" /> : null}
                  <button
                    onClick={signOut}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </motion.div>
              </>
            ) : null}
          </div>
        </div>
        </div>

        <AnimatePresence initial={false}>
          {scrolled ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 pt-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div
                    className="gradient-bar h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: `${todayPct}%` }}
                  />
                </div>
                <span className="num text-[11px] text-muted-foreground">{todayPct}%</span>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 pb-36 lg:max-w-5xl">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.6rem+env(safe-area-inset-bottom))]">
        <LimelightNav
          className="glass-panel pointer-events-auto mx-auto max-w-md"
          activeIndex={Math.max(
            0,
            NAV.findIndex((n) => n.to === pathname),
          )}
          onTabChange={(i) => {
            const target = NAV[i];
            if (target) navigate({ to: target.to });
          }}
          items={NAV.map(({ to, label, Icon, ...rest }) => {
            const active = pathname === to;
            const center = "center" in rest && rest.center;
            return {
              id: to,
              label,
              icon: <Icon />,
              center,
              content: center ? (
                <>
                  <motion.span
                    whileTap={{ scale: 0.9 }}
                    className={`grid size-12 -translate-y-3 place-items-center rounded-2xl transition-colors duration-300 ${
                      active
                        ? "gradient-ring text-brand-foreground shadow-[var(--shadow-glow)]"
                        : "bg-brand/15 text-brand ring-1 ring-brand/25"
                    }`}
                  >
                    <Icon className="size-5" />
                  </motion.span>
                  <span
                    className={`-mt-2 text-[10px] font-medium transition-colors ${
                      active ? "text-brand" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </>
              ) : undefined,
            };
          })}
        />
      </nav>


    </div>
  );
}

function IconLink({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand"
    >
      {children}
    </Link>
  );
}

function MenuLink({
  to,
  Icon,
  label,
}: {
  to: string;
  Icon: typeof UserIcon;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
