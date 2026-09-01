import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/today", label: "Today", glyph: "REC" },
  { to: "/timetable", label: "Timetable", glyph: "◷" },
  { to: "/targets", label: "Targets", glyph: "◎" },
  { to: "/settings", label: "Settings", glyph: "◑" },
] as const;

export function AppShell({
  children,
  initials = "ST",
}: {
  children: ReactNode;
  initials?: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-5 pt-5 pb-3">
        <Link to="/today" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-brand/10">
            <span className="size-3.5 rounded-[3px] bg-brand" />
          </span>
          <span>
            <span className="block text-sm leading-none font-semibold tracking-tight">
              Chronodeck
            </span>
            <span className="mt-1 block font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
              Study OS
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/assistant"
            className="grid size-9 place-items-center rounded-lg border border-border font-mono text-[9px] tracking-widest text-muted-foreground uppercase transition-colors hover:text-brand"
          >
            AI
          </Link>
          <button
            onClick={signOut}
            title="Sign out"
            className="grid size-9 place-items-center rounded-full bg-warm/15 text-[10px] font-semibold text-warm outline-1 -outline-offset-1 outline-border"
          >
            {initials}
          </button>
        </div>
      </header>

      <main className="flex-1 pb-4">{children}</main>

      <nav className="sticky bottom-0 grid grid-cols-4 gap-1 border-t border-border bg-background/95 px-5 py-3 backdrop-blur">
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
                  className={`grid h-9 w-9 place-items-center rounded-lg font-mono text-xs ${
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
