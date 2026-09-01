import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon3D } from "@/components/Icon3D";
import { fetchBreaks, fetchSessions } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/history")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "History — Chronodeck Study OS" },
      {
        name: "description",
        content: "Every study session, topic, note and break you logged, grouped day by day.",
      },
      { property: "og:title", content: "History — Chronodeck Study OS" },
      { property: "og:description", content: "Browse your full study session and break history." },
    ],
  }),
  component: HistoryPage,
});

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function HistoryPage() {
  const [filter, setFilter] = useState<"all" | "reading" | "class">("all");
  const sessions = useQuery({ queryKey: ["sessions", "all"], queryFn: () => fetchSessions() });
  const breaks = useQuery({ queryKey: ["breaks", "all"], queryFn: () => fetchBreaks() });

  const rows = useMemo(
    () =>
      (sessions.data ?? []).filter((s) => !s.is_running && (filter === "all" || s.kind === filter)),
    [sessions.data, filter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const s of rows) {
      const k = dayKey(s.started_at);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()];
  }, [rows]);

  const totalMinutes = rows.reduce((a, s) => a + (s.duration_minutes ?? 0), 0);
  const breakMinutes = (breaks.data ?? []).reduce((a, b) => a + (b.duration_minutes ?? 0), 0);

  return (
    <AppShell>
      <div className="space-y-6 px-5 py-6">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.3em] text-brand uppercase">Archive</p>
            <h1 className="truncate text-2xl font-semibold tracking-tight">History</h1>
          </div>
          <Icon3D name="magazine" size={48} priority />
        </header>

        <section className="grid grid-cols-3 gap-3">
          {[
            { l: "Sessions", v: String(rows.length) },
            { l: "Study", v: `${(totalMinutes / 60).toFixed(1)}h` },
            { l: "Breaks", v: `${(breakMinutes / 60).toFixed(1)}h` },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-border bg-panel p-4">
              <p className="font-mono text-lg leading-none font-semibold">{s.v}</p>
              <p className="mt-1 text-[10px] tracking-wide text-muted-foreground uppercase">{s.l}</p>
            </div>
          ))}
        </section>

        <div className="flex gap-2">
          {(["all", "reading", "class"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`h-10 flex-1 rounded-xl border text-xs font-medium capitalize transition-colors ${
                filter === k ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {sessions.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading history…</p>
        ) : grouped.length === 0 ? (
          <div className="rounded-3xl border border-border bg-panel p-6 text-center">
            <Icon3D name="clock" size={44} className="mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              No sessions yet. Start the timer and your history will build itself.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(([day, items]) => (
              <section key={day}>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold">{day}</h2>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {(items.reduce((a, s) => a + (s.duration_minutes ?? 0), 0) / 60).toFixed(1)}h
                  </span>
                </div>
                <ul className="mt-2 space-y-2">
                  {items.map((s) => (
                    <li key={s.id} className="rounded-2xl border border-border bg-panel p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{s.subject_name ?? "Study"}</p>
                          {s.topic ? (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.topic}</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 font-mono text-xs text-brand">
                          {s.duration_minutes ?? 0}m
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                        <span className="rounded-md border border-border px-1.5 py-0.5">{s.kind}</span>
                        <span>
                          {new Date(s.started_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {s.auto_closed ? <span className="text-amber-400">auto-closed</span> : null}
                      </div>
                      {s.notes ? (
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
