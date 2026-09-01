import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { syncIdentityToProfile } from "@/lib/study";

const NAV = [
  { to: "/today", label: "Home", glyph: "◈" },
  { to: "/timetable", label: "Timetable", glyph: "◷" },
  { to: "/study", label: "Study", glyph: "▶" },
  { to: "/targets", label: "Targets", glyph: "◎" },
  { to: "/history", label: "History", glyph: "◐" },
  { to: "/profile", label: "Profile", glyph: "◑" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: syncIdentityToProfile });

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
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-5 pt-5 pb-3">
        <Link to="/today" className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10">
            <span className="size-3.5 rounded-[3px] bg-brand" />
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
          <Link
            to="/assistant"
            className="grid size-9 place-items-center rounded-lg border border-border font-mono text-[9px] tracking-widest text-muted-foreground uppercase transition-colors hover:text-brand"
          >
            AI
          </Link>
          <Link
            to="/settings"
            className="grid size-9 place-items-center rounded-lg border border-border font-mono text-[11px] text-muted-foreground transition-colors hover:text-brand"
          >
            ⚙
          </Link>
          <button
            onClick={signOut}
            title="Sign out"
            className="grid size-9 place-items-center overflow-hidden rounded-full bg-warm/15 text-[10px] font-semibold text-warm outline-1 -outline-offset-1 outline-border"
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
        </div>
      </header>

      <main className="flex-1 pb-4">{children}</main>

      <nav className="sticky bottom-0 grid grid-cols-5 gap-1 border-t border-border bg-background/95 px-3 py-3 backdrop-blur">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-1.5 py-1 text-muted-foreground"
            activeProps={{ className: "text-brand" }}
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <span
                  className={`grid h-9 w-9 place-items-center rounded-lg font-mono text-xs transition-colors ${
                    isActive ? "bg-brand/15 text-brand" : "text-muted-foreground"
                  }`}
                >
                  {item.glyph}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
