import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarDays,
  History as HistoryIcon,
  LayoutDashboard,
  LogOut,
  Play,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Target,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin, syncIdentityToProfile } from "@/lib/study";

const NAV = [
  { to: "/today", label: "Home", Icon: LayoutDashboard },
  { to: "/timetable", label: "Timetable", Icon: CalendarDays },
  { to: "/study", label: "Study", Icon: Play, center: true },
  { to: "/targets", label: "Targets", Icon: Target },
  { to: "/history", label: "History", Icon: HistoryIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const profile = useQuery({ queryKey: ["profile"], queryFn: syncIdentityToProfile });
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: isAdmin });
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    setMenu(false);
  }, [pathname]);

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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-background/80 px-4 pt-4 pb-3 backdrop-blur-xl sm:px-5">
        <Link to="/today" className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/10 ring-1 ring-brand/25">
            <span className="size-3.5 rounded-[4px] bg-brand shadow-[0_0_16px_var(--brand)]" />
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
          <IconLink to="/assistant" label="AI assistant">
            <Sparkles className="size-4" />
          </IconLink>
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
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 pb-32 lg:max-w-5xl">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(0.6rem+env(safe-area-inset-bottom))]">
        <motion.div
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="mx-auto grid max-w-md grid-cols-5 items-end gap-1 rounded-[26px] border border-border/70 bg-panel/70 px-2 py-2 shadow-[0_24px_60px_-30px_rgb(0_0_0/0.9)] backdrop-blur-2xl"
        >
          {NAV.map(({ to, label, Icon, ...rest }) => {
            const active = pathname === to;
            const center = "center" in rest && rest.center;

            if (center) {
              return (
                <Link key={to} to={to} aria-label={label} className="flex flex-col items-center gap-1">
                  <motion.span
                    whileTap={{ scale: 0.9 }}
                    className={`grid size-12 -translate-y-3 place-items-center rounded-2xl transition-colors duration-300 ${
                      active
                        ? "bg-brand text-brand-foreground shadow-[0_10px_30px_-8px_var(--brand)]"
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
                </Link>
              );
            }

            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                className="relative flex flex-col items-center gap-1 py-1"
              >
                <motion.span
                  whileTap={{ scale: 0.9 }}
                  className={`relative grid h-9 w-full max-w-[58px] place-items-center rounded-2xl transition-colors duration-300 ${
                    active ? "text-brand" : "text-muted-foreground"
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="nav-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-2xl bg-brand/15 ring-1 ring-brand/25"
                    />
                  ) : null}
                  <Icon className="relative size-[18px]" />
                </motion.span>
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    active ? "text-brand" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </motion.div>
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
