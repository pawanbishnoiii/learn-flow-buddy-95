import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Icon3D } from "@/components/Icon3D";
import {
  fetchBlocks,
  fetchBreaks,
  fetchSessions,
  fetchSubjects,
  fetchTargets,
  isAdmin,
  minutesInRange,
  startOfToday,
  startOfWeek,
  subjectProgress,
} from "@/lib/study";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Chronodeck Study OS" },
      {
        name: "description",
        content: "Admin console for Chronodeck: study data health, subject load and session records.",
      },
      { property: "og:title", content: "Admin — Chronodeck Study OS" },
      { property: "og:description", content: "Operational view of study sessions, subjects and targets." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: isAdmin });
  const sessions = useQuery({ queryKey: ["sessions", "all"], queryFn: () => fetchSessions() });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const blocks = useQuery({ queryKey: ["blocks"], queryFn: fetchBlocks });
  const targets = useQuery({ queryKey: ["targets"], queryFn: fetchTargets });
  const breaks = useQuery({ queryKey: ["breaks", "all"], queryFn: () => fetchBreaks() });

  const all = sessions.data ?? [];
  const rows = subjectProgress(all, subjects.data ?? [], new Date(0));

  if (admin.isLoading) {
    return (
      <AppShell>
        <p className="px-5 py-10 text-sm text-muted-foreground">Checking access…</p>
      </AppShell>
    );
  }

  if (!admin.data) {
    return (
      <AppShell>
        <div className="px-5 py-10">
          <div className="rounded-3xl border border-border bg-panel p-6">
            <Icon3D name="target" size={44} />
            <h1 className="mt-4 text-xl font-semibold tracking-tight">Admin only</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This console is limited to accounts with the admin role.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  const stats = [
    { l: "Sessions", v: String(all.filter((s) => !s.is_running).length) },
    { l: "Today", v: `${(minutesInRange(all, startOfToday()) / 60).toFixed(1)}h` },
    { l: "Week", v: `${(minutesInRange(all, startOfWeek()) / 60).toFixed(1)}h` },
    { l: "Subjects", v: String(subjects.data?.length ?? 0) },
    { l: "Blocks", v: String(blocks.data?.length ?? 0) },
    { l: "Targets", v: String(targets.data?.length ?? 0) },
    { l: "Breaks", v: String(breaks.data?.length ?? 0) },
    { l: "Auto-closed", v: String(all.filter((s) => s.auto_closed).length) },
  ];

  return (
    <AppShell>
      <div className="space-y-6 px-5 py-6">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.3em] text-brand uppercase">Console</p>
            <h1 className="truncate text-2xl font-semibold tracking-tight">Admin</h1>
          </div>
          <Icon3D name="trophy" size={48} priority />
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="rounded-2xl border border-border bg-panel p-4">
              <p className="font-mono text-lg leading-none font-semibold">{s.v}</p>
              <p className="mt-1 text-[10px] tracking-wide text-muted-foreground uppercase">{s.l}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-border bg-panel p-5">
          <h2 className="text-sm font-semibold">Subject load (all time)</h2>
          <ul className="mt-3 space-y-2">
            {rows.length ? (
              rows.map((r) => (
                <li key={r.name} className="flex items-center justify-between text-xs">
                  <span className="truncate">{r.name}</span>
                  <span className="ml-3 shrink-0 font-mono text-muted-foreground">
                    {r.sessions} · {(r.minutes / 60).toFixed(1)}h
                  </span>
                </li>
              ))
            ) : (
              <li className="text-xs text-muted-foreground">No sessions recorded yet.</li>
            )}
          </ul>
        </section>

        <section className="rounded-3xl border border-border bg-panel p-5">
          <h2 className="text-sm font-semibold">Recent sessions</h2>
          <ul className="mt-3 space-y-2">
            {all.slice(0, 15).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate">
                  {s.subject_name ?? "Study"}
                  {s.topic ? <span className="text-muted-foreground"> · {s.topic}</span> : null}
                </span>
                <span className="shrink-0 font-mono text-muted-foreground">
                  {new Date(s.started_at).toLocaleDateString()} ·{" "}
                  {s.is_running ? "running" : `${s.duration_minutes ?? 0}m`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
