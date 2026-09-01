import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Icon3D } from "@/components/Icon3D";
import {
  deleteBreak,
  deleteSession,
  fetchBreaks,
  fetchSessions,
  updateBreak,
  updateSession,
  type Break,
  type Session,
} from "@/lib/study";

export const Route = createFileRoute("/_authenticated/history")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "History — Chronodeck Study OS" },
      {
        name: "description",
        content: "Every study session, topic, note and break you logged, grouped day by day — with edit and delete.",
      },
      { property: "og:title", content: "History — Chronodeck Study OS" },
      { property: "og:description", content: "Browse, edit and delete your full study session and break history." },
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

function time(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type Tab = "all" | "reading" | "class" | "break";

function HistoryPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Tab>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [editBreak, setEditBreak] = useState<Break | null>(null);

  const sessions = useQuery({ queryKey: ["sessions", "all"], queryFn: () => fetchSessions() });
  const breaks = useQuery({ queryKey: ["breaks", "all"], queryFn: () => fetchBreaks() });

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["sessions"] }),
      qc.invalidateQueries({ queryKey: ["breaks"] }),
    ]);
  };

  const saveSession = useMutation({
    mutationFn: async (s: Session) =>
      updateSession(s.id, {
        subject_name: s.subject_name,
        topic: s.topic,
        notes: s.notes,
        kind: s.kind,
        duration_minutes: s.duration_minutes,
      }),
    onSuccess: async () => {
      setEditSession(null);
      await invalidate();
      toast.success("Session updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSession = useMutation({
    mutationFn: deleteSession,
    onSuccess: async () => {
      await invalidate();
      toast.success("Session deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBreak = useMutation({
    mutationFn: async (b: Break) =>
      updateBreak(b.id, { kind: b.kind, note: b.note, duration_minutes: b.duration_minutes }),
    onSuccess: async () => {
      setEditBreak(null);
      await invalidate();
      toast.success("Break updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBreak = useMutation({
    mutationFn: deleteBreak,
    onSuccess: async () => {
      await invalidate();
      toast.success("Break deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(
    () =>
      (sessions.data ?? []).filter(
        (s) => !s.is_running && (filter === "all" || filter === "break" || s.kind === filter),
      ),
    [sessions.data, filter],
  );

  const breakRows = useMemo(
    () => (breaks.data ?? []).filter(() => filter === "all" || filter === "break"),
    [breaks.data, filter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { sessions: Session[]; breaks: Break[] }>();
    const get = (k: string) => map.get(k) ?? { sessions: [], breaks: [] };
    for (const s of rows) {
      const k = dayKey(s.started_at);
      const cur = get(k);
      map.set(k, { ...cur, sessions: [...cur.sessions, s] });
    }
    for (const b of breakRows) {
      const k = dayKey(b.started_at);
      const cur = get(k);
      map.set(k, { ...cur, breaks: [...cur.breaks, b] });
    }
    return [...map.entries()];
  }, [rows, breakRows]);

  const totalMinutes = rows.reduce((a, s) => a + (s.duration_minutes ?? 0), 0);
  const breakMinutes = (breaks.data ?? []).reduce((a, b) => a + (b.duration_minutes ?? 0), 0);

  return (
    <AppShell>
      <div className="space-y-6 px-4 py-6 sm:px-5">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.3em] text-brand uppercase">Archive</p>
            <h1 className="truncate text-2xl font-semibold tracking-tight">History</h1>
            <p className="mt-1 text-xs text-muted-foreground">Tap a row for full detail, edit or delete.</p>
          </div>
          <Icon3D name="magazine" size={48} priority />
        </header>

        <section className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { l: "Sessions", v: String(rows.length) },
            { l: "Study", v: `${(totalMinutes / 60).toFixed(1)}h` },
            { l: "Breaks", v: `${(breakMinutes / 60).toFixed(1)}h` },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-border bg-panel p-3 sm:p-4">
              <p className="font-mono text-lg leading-none font-semibold">{s.v}</p>
              <p className="mt-1 text-[10px] tracking-wide text-muted-foreground uppercase">{s.l}</p>
            </div>
          ))}
        </section>

        <div className="flex gap-1.5">
          {(["all", "reading", "class", "break"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`h-10 flex-1 rounded-xl border text-[11px] font-medium capitalize transition-colors ${
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
                    {(items.sessions.reduce((a, s) => a + (s.duration_minutes ?? 0), 0) / 60).toFixed(1)}h
                  </span>
                </div>

                <ul className="mt-2 space-y-2">
                  {items.sessions.map((s) => {
                    const open = openId === s.id;
                    return (
                      <li key={s.id} className="rounded-2xl border border-border bg-panel p-4">
                        <button
                          onClick={() => setOpenId(open ? null : s.id)}
                          className="flex w-full items-start justify-between gap-3 text-left"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{s.subject_name ?? "Study"}</p>
                            {s.topic ? (
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.topic}</p>
                            ) : null}
                          </div>
                          <span className="shrink-0 font-mono text-xs text-brand">{s.duration_minutes ?? 0}m</span>
                        </button>

                        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                          <span className="rounded-md border border-border px-1.5 py-0.5">{s.kind}</span>
                          <span>{time(s.started_at)}</span>
                          {s.ended_at ? <span>→ {time(s.ended_at)}</span> : null}
                          {s.auto_closed ? <span className="text-amber-400">auto-closed</span> : null}
                        </div>

                        {open ? (
                          <div className="mt-3 space-y-3 border-t border-border pt-3">
                            <dl className="grid grid-cols-2 gap-2 text-[11px]">
                              <Detail label="Started" value={new Date(s.started_at).toLocaleString()} />
                              <Detail
                                label="Ended"
                                value={s.ended_at ? new Date(s.ended_at).toLocaleString() : "—"}
                              />
                              <Detail label="Type" value={s.kind} />
                              <Detail label="Break" value={`${s.break_minutes ?? 0}m`} />
                            </dl>
                            {s.notes ? (
                              <p className="text-xs leading-relaxed text-muted-foreground">{s.notes}</p>
                            ) : null}
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditSession(s)}
                                className="h-9 flex-1 rounded-xl border border-brand/40 text-[11px] font-semibold text-brand uppercase"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Delete this session?")) removeSession.mutate(s.id);
                                }}
                                className="h-9 flex-1 rounded-xl border border-destructive/40 text-[11px] font-semibold text-destructive uppercase"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}

                  {items.breaks.map((b) => (
                    <li key={b.id} className="rounded-2xl border border-dashed border-border bg-panel/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium capitalize">{b.kind} break</p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {time(b.started_at)}
                            {b.ended_at ? ` → ${time(b.ended_at)}` : " · running"}
                          </p>
                          {b.note ? (
                            <p className="mt-1 text-xs text-muted-foreground">{b.note}</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 font-mono text-xs text-amber-400">
                          {b.duration_minutes ?? 0}m
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => setEditBreak(b)}
                          className="h-8 flex-1 rounded-lg border border-border text-[10px] uppercase"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this break?")) removeBreak.mutate(b.id);
                          }}
                          className="h-8 flex-1 rounded-lg border border-destructive/40 text-[10px] text-destructive uppercase"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {editSession ? (
        <Sheet title="Edit session" onClose={() => setEditSession(null)}>
          <Field label="Subject">
            <input
              value={editSession.subject_name ?? ""}
              onChange={(e) => setEditSession({ ...editSession, subject_name: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Topic">
            <input
              value={editSession.topic ?? ""}
              onChange={(e) => setEditSession({ ...editSession, topic: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Type">
            <div className="grid grid-cols-2 gap-2">
              {["reading", "class"].map((k) => (
                <button
                  key={k}
                  onClick={() => setEditSession({ ...editSession, kind: k })}
                  className={`h-11 rounded-xl border text-sm capitalize ${
                    editSession.kind === k ? "border-brand bg-brand/10 text-brand" : "border-border"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Duration (minutes)">
            <input
              type="number"
              min={1}
              value={editSession.duration_minutes ?? 0}
              onChange={(e) =>
                setEditSession({ ...editSession, duration_minutes: Number(e.target.value) })
              }
              className="input"
            />
          </Field>
          <Field label="Notes">
            <textarea
              rows={3}
              value={editSession.notes ?? ""}
              onChange={(e) => setEditSession({ ...editSession, notes: e.target.value })}
              className="input h-auto py-2"
            />
          </Field>
          <button
            onClick={() => saveSession.mutate(editSession)}
            disabled={saveSession.isPending}
            className="mt-5 h-12 w-full rounded-2xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            {saveSession.isPending ? "Saving…" : "Save changes"}
          </button>
        </Sheet>
      ) : null}

      {editBreak ? (
        <Sheet title="Edit break" onClose={() => setEditBreak(null)}>
          <Field label="Kind">
            <div className="grid grid-cols-4 gap-2">
              {["pause", "sleep", "free", "meal"].map((k) => (
                <button
                  key={k}
                  onClick={() => setEditBreak({ ...editBreak, kind: k })}
                  className={`h-11 rounded-xl border text-xs capitalize ${
                    editBreak.kind === k ? "border-brand bg-brand/10 text-brand" : "border-border"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Duration (minutes)">
            <input
              type="number"
              min={1}
              value={editBreak.duration_minutes ?? 0}
              onChange={(e) => setEditBreak({ ...editBreak, duration_minutes: Number(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="Note">
            <input
              value={editBreak.note ?? ""}
              onChange={(e) => setEditBreak({ ...editBreak, note: e.target.value })}
              className="input"
            />
          </Field>
          <button
            onClick={() => saveBreak.mutate(editBreak)}
            disabled={saveBreak.isPending}
            className="mt-5 h-12 w-full rounded-2xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            {saveBreak.isPending ? "Saving…" : "Save changes"}
          </button>
        </Sheet>
      ) : null}
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border px-2.5 py-2">
      <dt className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 truncate text-[11px]">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <label className="block text-xs text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
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
