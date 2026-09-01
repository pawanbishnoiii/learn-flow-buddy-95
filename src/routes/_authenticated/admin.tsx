import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Icon3D } from "@/components/Icon3D";
import {
  DAYS,
  createSubject,
  deleteBlock,
  deleteSubject,
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
  updateBlock,
  updateSubject,
  type Block,
  type Subject,
} from "@/lib/study";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Chronodeck Study OS" },
      {
        name: "description",
        content: "Admin console for Chronodeck: edit subjects and timetable blocks, inspect study data health.",
      },
      { property: "og:title", content: "Admin — Chronodeck Study OS" },
      { property: "og:description", content: "Edit subjects and timetable, review sessions, targets and breaks." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: isAdmin });
  const sessions = useQuery({ queryKey: ["sessions", "all"], queryFn: () => fetchSessions() });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const blocks = useQuery({ queryKey: ["blocks"], queryFn: fetchBlocks });
  const targets = useQuery({ queryKey: ["targets"], queryFn: fetchTargets });
  const breaks = useQuery({ queryKey: ["breaks", "all"], queryFn: () => fetchBreaks() });

  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [editBlock, setEditBlock] = useState<Block | null>(null);
  const [newSubject, setNewSubject] = useState({ name: "", color: "#34D399", weekly_target_hours: 6 });

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["subjects"] }),
      qc.invalidateQueries({ queryKey: ["blocks"] }),
      qc.invalidateQueries({ queryKey: ["sessions"] }),
    ]);
  };

  const addSubject = useMutation({
    mutationFn: async () =>
      createSubject({
        name: newSubject.name.trim(),
        color: newSubject.color,
        weekly_target_hours: Number(newSubject.weekly_target_hours) || 0,
      }),
    onSuccess: async () => {
      setNewSubject({ name: "", color: "#34D399", weekly_target_hours: 6 });
      await refresh();
      toast.success("Subject added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveSubject = useMutation({
    mutationFn: async (s: Subject) =>
      updateSubject(s.id, {
        name: s.name,
        color: s.color,
        weekly_target_hours: Number(s.weekly_target_hours) || 0,
      }),
    onSuccess: async () => {
      setEditSubject(null);
      await refresh();
      toast.success("Subject updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSubject = useMutation({
    mutationFn: deleteSubject,
    onSuccess: async () => {
      await refresh();
      toast.success("Subject deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBlock = useMutation({
    mutationFn: async (b: Block) =>
      updateBlock(b.id, {
        title: b.title,
        kind: b.kind,
        day_of_week: b.day_of_week,
        start_time: b.start_time,
        end_time: b.end_time,
        location: b.location,
      }),
    onSuccess: async () => {
      setEditBlock(null);
      await refresh();
      toast.success("Block updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBlock = useMutation({
    mutationFn: deleteBlock,
    onSuccess: async () => {
      await refresh();
      toast.success("Block deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
              This console is limited to accounts with the admin role. Ask an owner to grant your account the
              admin role, then reload this page.
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
      <div className="space-y-6 px-4 py-6 sm:px-5">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.3em] text-brand uppercase">Console</p>
            <h1 className="truncate text-2xl font-semibold tracking-tight">Admin</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Edit subjects and timetable — the dashboard heatmap and progress update instantly.
            </p>
          </div>
          <Icon3D name="trophy" size={48} priority />
        </header>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {stats.map((s) => (
            <div key={s.l} className="rounded-2xl border border-border bg-panel p-3 sm:p-4">
              <p className="font-mono text-lg leading-none font-semibold">{s.v}</p>
              <p className="mt-1 text-[10px] tracking-wide text-muted-foreground uppercase">{s.l}</p>
            </div>
          ))}
        </section>

        {/* Subjects editor */}
        <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Subjects</h2>
          <ul className="mt-3 space-y-2">
            {(subjects.data ?? []).map((s) => (
              <li key={s.id} className="rounded-2xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-3 shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="truncate text-sm">{s.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {s.weekly_target_hours}h/wk
                    </span>
                    <button
                      onClick={() => setEditSubject(s)}
                      className="h-8 rounded-lg border border-brand/40 px-3 text-[10px] font-semibold text-brand uppercase"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${s.name}?`)) removeSubject.mutate(s.id);
                      }}
                      className="h-8 rounded-lg border border-border px-3 text-[10px] text-muted-foreground uppercase"
                    >
                      Del
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <input
              value={newSubject.name}
              onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
              placeholder="New subject"
              className="input"
            />
            <input
              type="number"
              min={0}
              value={newSubject.weekly_target_hours}
              onChange={(e) =>
                setNewSubject({ ...newSubject, weekly_target_hours: Number(e.target.value) })
              }
              className="input sm:w-24"
            />
            <input
              type="color"
              value={newSubject.color}
              onChange={(e) => setNewSubject({ ...newSubject, color: e.target.value })}
              className="h-11 w-full rounded-xl border border-border bg-background sm:w-14"
            />
            <button
              onClick={() => addSubject.mutate()}
              disabled={!newSubject.name.trim() || addSubject.isPending}
              className="h-11 rounded-xl bg-brand px-4 text-xs font-semibold text-brand-foreground disabled:opacity-60"
            >
              Add
            </button>
          </div>
        </section>

        {/* Timetable editor */}
        <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Timetable blocks</h2>
          <ul className="mt-3 space-y-2">
            {(blocks.data ?? []).map((b) => (
              <li key={b.id} className="rounded-2xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{b.title}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {DAYS[b.day_of_week]} · {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)} · {b.kind}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setEditBlock(b)}
                      className="h-8 rounded-lg border border-brand/40 px-3 text-[10px] font-semibold text-brand uppercase"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this block?")) removeBlock.mutate(b.id);
                      }}
                      className="h-8 rounded-lg border border-border px-3 text-[10px] text-muted-foreground uppercase"
                    >
                      Del
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {(blocks.data ?? []).length === 0 ? (
              <li className="text-xs text-muted-foreground">No timetable blocks yet.</li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
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

        <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
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

      {editSubject ? (
        <Sheet title="Edit subject" onClose={() => setEditSubject(null)}>
          <label className="mt-4 block text-xs text-muted-foreground">Name</label>
          <input
            value={editSubject.name}
            onChange={(e) => setEditSubject({ ...editSubject, name: e.target.value })}
            className="input mt-1"
          />
          <label className="mt-4 block text-xs text-muted-foreground">Weekly target (hours)</label>
          <input
            type="number"
            min={0}
            value={editSubject.weekly_target_hours}
            onChange={(e) =>
              setEditSubject({ ...editSubject, weekly_target_hours: Number(e.target.value) })
            }
            className="input mt-1"
          />
          <label className="mt-4 block text-xs text-muted-foreground">Colour</label>
          <input
            type="color"
            value={editSubject.color}
            onChange={(e) => setEditSubject({ ...editSubject, color: e.target.value })}
            className="mt-1 h-11 w-full rounded-xl border border-border bg-background"
          />
          <button
            onClick={() => saveSubject.mutate(editSubject)}
            disabled={saveSubject.isPending}
            className="mt-5 h-12 w-full rounded-2xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            {saveSubject.isPending ? "Saving…" : "Save subject"}
          </button>
        </Sheet>
      ) : null}

      {editBlock ? (
        <Sheet title="Edit block" onClose={() => setEditBlock(null)}>
          <label className="mt-4 block text-xs text-muted-foreground">Title</label>
          <input
            value={editBlock.title}
            onChange={(e) => setEditBlock({ ...editBlock, title: e.target.value })}
            className="input mt-1"
          />
          <label className="mt-4 block text-xs text-muted-foreground">Day</label>
          <select
            value={editBlock.day_of_week}
            onChange={(e) => setEditBlock({ ...editBlock, day_of_week: Number(e.target.value) })}
            className="input mt-1"
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-muted-foreground">Start</label>
              <input
                type="time"
                value={editBlock.start_time.slice(0, 5)}
                onChange={(e) => setEditBlock({ ...editBlock, start_time: e.target.value })}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">End</label>
              <input
                type="time"
                value={editBlock.end_time.slice(0, 5)}
                onChange={(e) => setEditBlock({ ...editBlock, end_time: e.target.value })}
                className="input mt-1"
              />
            </div>
          </div>
          <label className="mt-4 block text-xs text-muted-foreground">Location / link</label>
          <input
            value={editBlock.location ?? ""}
            onChange={(e) => setEditBlock({ ...editBlock, location: e.target.value })}
            className="input mt-1"
          />
          <button
            onClick={() => saveBlock.mutate(editBlock)}
            disabled={saveBlock.isPending}
            className="mt-5 h-12 w-full rounded-2xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            {saveBlock.isPending ? "Saving…" : "Save block"}
          </button>
        </Sheet>
      ) : null}
    </AppShell>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-panel p-5 pb-8"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h3 className="text-sm font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}
