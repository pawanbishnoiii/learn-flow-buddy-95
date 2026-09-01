import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getDailyInsight } from "@/lib/ai.functions";
import {
  DAYS,
  fetchBlocks,
  fetchRunningSession,
  fetchSessions,
  fetchSettings,
  fetchSubjects,
  fmtDuration,
  minutesInRange,
  startOfToday,
  startOfWeek,
  startSession,
  stopSession,
  weeklyLoad,
} from "@/lib/study";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today — Chronodeck Study OS" },
      {
        name: "description",
        content: "Live study timer, today's plan, weekly load and AI insight in one command center.",
      },
      { property: "og:title", content: "Today — Chronodeck Study OS" },
      {
        property: "og:description",
        content: "Run the study timer, log subjects and topics, track hours against your targets.",
      },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const qc = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [stopOpen, setStopOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);

  const running = useQuery({ queryKey: ["running"], queryFn: fetchRunningSession, refetchInterval: 30_000 });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const blocks = useQuery({ queryKey: ["blocks"], queryFn: fetchBlocks });
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const sessions = useQuery({
    queryKey: ["sessions", "week"],
    queryFn: () => fetchSessions(startOfWeek().toISOString()),
  });

  const insightFn = useServerFn(getDailyInsight);
  const insight = useQuery({
    queryKey: ["insight"],
    queryFn: () => insightFn({}),
    staleTime: 15 * 60_000,
    retry: false,
  });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const active = running.data;
  const elapsed = active ? (now - new Date(active.started_at).getTime()) / 1000 : 0;

  const all = sessions.data ?? [];
  const todayMin = minutesInRange(all, startOfToday()) + (active ? elapsed / 60 : 0);
  const classMin = minutesInRange(all, startOfToday(), "class");
  const goalHours = Number(settings.data?.daily_goal_hours ?? 4);
  const pct = Math.min(100, (todayMin / 60 / goalHours) * 100);
  const load = useMemo(() => weeklyLoad(all), [all]);
  const maxLoad = Math.max(60, ...load);
  const weekMin = load.reduce((a, b) => a + b, 0);
  const todayIdx = new Date().getDay();

  const todayBlocks = (blocks.data ?? []).filter((b) => b.day_of_week === todayIdx);
  const recent = all.filter((s) => !s.is_running).slice(0, 4);

  const startM = useMutation({
    mutationFn: startSession,
    onSuccess: () => {
      setStartOpen(false);
      qc.invalidateQueries();
      toast.success("Timer running — it keeps counting even if you close the app.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stopM = useMutation({
    mutationFn: (v: {
      subject_id: string | null;
      subject_name: string | null;
      topic: string;
      notes: string;
      kind: string;
    }) => stopSession(active!.id, active!.started_at, v),
    onSuccess: () => {
      setStopOpen(false);
      qc.invalidateQueries();
      toast.success("Session saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      {/* HERO — start study */}
      <section className="px-5 pt-6">
        <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] uppercase">
          <span
            className={`size-1.5 rounded-full ${active ? "animate-pulse bg-brand" : "bg-muted-foreground"}`}
          />
          <span className={active ? "text-brand" : "text-muted-foreground"}>
            {active ? "Active session" : "No session running"}
          </span>
        </div>
        <p className="mt-2 font-mono text-[34px] leading-none font-medium tracking-tight">
          {fmtDuration(elapsed)}
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block size-2 rounded-full bg-warm" />
          <span className="font-semibold text-foreground">
            {active?.subject_name ?? "Start study"}
          </span>
          <span className="opacity-40">/</span>
          <span>{active?.topic ?? "pick a subject and go"}</span>
        </div>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand/40 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>
            {(todayMin / 60).toFixed(1)}h / {goalHours}h goal
          </span>
          <span>{pct >= 100 ? "goal hit" : pct > 50 ? "on track" : "behind"}</span>
        </div>

        <button
          onClick={() => (active ? setStopOpen(true) : setStartOpen(true))}
          className={`mt-4 h-12 w-full rounded-xl text-sm font-semibold transition-colors ${
            active
              ? "border border-border text-foreground hover:border-brand/50"
              : "bg-brand text-brand-foreground"
          }`}
        >
          {active ? "Stop & save session" : "Start study"}
        </button>
      </section>

      {/* stats */}
      <section className="mt-4 grid grid-cols-3 gap-2 px-5">
        {[
          { k: "Read", v: `${((todayMin - classMin) / 60).toFixed(1)}h` },
          { k: "Class", v: `${(classMin / 60).toFixed(1)}h` },
          { k: "Week", v: `${(weekMin / 60).toFixed(1)}h` },
        ].map((s) => (
          <div key={s.k} className="rounded-2xl border border-border bg-panel p-3">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              {s.k}
            </p>
            <p className="mt-1 font-mono text-xl">{s.v}</p>
          </div>
        ))}
      </section>

      {/* today's plan */}
      <section className="mt-4 px-5">
        <div className="rounded-2xl border border-border bg-panel p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">Today's plan</h3>
            <span className="font-mono text-[10px] text-muted-foreground">
              {DAYS[todayIdx]} · {todayBlocks.length} blocks
            </span>
          </div>
          <div className="mt-3 space-y-2.5">
            {todayBlocks.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nothing scheduled — add blocks on the Timetable page.
              </p>
            )}
            {todayBlocks.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <span
                  className={`size-2.5 shrink-0 rounded-full ${b.kind === "class" ? "bg-warm" : "bg-brand"}`}
                />
                <div className="flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground/80">{b.title}</span>
                    <span className="font-mono text-muted-foreground">
                      {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {b.kind === "class" ? "Class" : "Study"}
                    {b.location ? ` · ${b.location}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* weekly load */}
      <section className="mt-4 px-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">Weekly load</h3>
          <span className="font-mono text-[10px] text-muted-foreground">
            {(weekMin / 60).toFixed(1)}h
          </span>
        </div>
        <div className="mt-3 flex h-20 items-end gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <div key={d} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-sm ${d === todayIdx ? "bg-warm" : "bg-brand/70"}`}
                style={{ height: `${Math.max(4, ((load[d] ?? 0) / maxLoad) * 100)}%` }}
              />
              <span
                className={`font-mono text-[9px] ${d === todayIdx ? "text-warm" : "text-muted-foreground"}`}
              >
                {DAYS[d]?.[0]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* recent sessions */}
      <section className="mt-5 px-5">
        <h3 className="text-sm font-semibold tracking-tight">Recent sessions</h3>
        <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-panel">
          {recent.length === 0 && (
            <p className="p-4 text-xs text-muted-foreground">No saved sessions yet.</p>
          )}
          {recent.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.subject_name ?? "Untitled"}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">
                  {s.topic ?? "no topic"} · {s.kind}
                  {s.auto_closed ? " · auto-closed" : ""}
                </p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {s.duration_minutes ?? 0}m
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* AI insight */}
      <section className="mt-5 px-5">
        <div className="rounded-2xl border border-brand/20 bg-brand/8 p-4">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-brand/15 font-mono text-[10px] text-brand">
              AI
            </span>
            <p className="text-xs font-semibold text-brand">AI insight</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-foreground/70">
            {insight.isLoading
              ? "Reading your study data…"
              : (insight.data?.insight ?? "Log a session and I'll start coaching your schedule.")}
          </p>
        </div>
      </section>

      {startOpen && (
        <StartDialog
          subjects={subjects.data ?? []}
          busy={startM.isPending}
          onClose={() => setStartOpen(false)}
          onStart={(v) => startM.mutate(v)}
        />
      )}
      {stopOpen && active && (
        <StopDialog
          subjects={subjects.data ?? []}
          defaults={{
            subject_id: active.subject_id,
            subject_name: active.subject_name ?? "",
            topic: active.topic ?? "",
            kind: active.kind,
          }}
          busy={stopM.isPending}
          onClose={() => setStopOpen(false)}
          onSave={(v) => stopM.mutate(v)}
        />
      )}
    </AppShell>
  );
}

function Sheet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-panel p-5">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <div className="mt-4 space-y-3">{children}</div>
      </div>
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand/60";

function StartDialog({
  subjects,
  busy,
  onClose,
  onStart,
}: {
  subjects: { id: string; name: string }[];
  busy: boolean;
  onClose: () => void;
  onStart: (v: {
    subject_id: string | null;
    subject_name: string | null;
    topic: string | null;
    kind: string;
  }) => void;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [custom, setCustom] = useState("");
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState("reading");

  return (
    <Sheet title="Start study">
      <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
        <option value="">Custom subject</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {!subjectId && (
        <input
          className={inputCls}
          placeholder="subject name"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
      )}
      <input
        className={inputCls}
        placeholder="topic (optional)"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        {["reading", "class"].map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`h-11 rounded-xl border text-sm font-medium capitalize ${
              kind === k ? "border-brand/60 bg-brand/10 text-brand" : "border-border text-muted-foreground"
            }`}
          >
            {k === "class" ? "Online class" : "Book reading"}
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="h-11 flex-1 rounded-xl border border-border text-sm">
          Cancel
        </button>
        <button
          disabled={busy}
          onClick={() =>
            onStart({
              subject_id: subjectId || null,
              subject_name: subjectId ? (subjects.find((s) => s.id === subjectId)?.name ?? null) : custom || "Study",
              topic: topic || null,
              kind,
            })
          }
          className="h-11 flex-[2] rounded-xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
        >
          Start timer
        </button>
      </div>
    </Sheet>
  );
}

function StopDialog({
  subjects,
  defaults,
  busy,
  onClose,
  onSave,
}: {
  subjects: { id: string; name: string }[];
  defaults: { subject_id: string | null; subject_name: string; topic: string; kind: string };
  busy: boolean;
  onClose: () => void;
  onSave: (v: {
    subject_id: string | null;
    subject_name: string | null;
    topic: string;
    notes: string;
    kind: string;
  }) => void;
}) {
  const [subjectId, setSubjectId] = useState(defaults.subject_id ?? "");
  const [custom, setCustom] = useState(defaults.subject_name);
  const [topic, setTopic] = useState(defaults.topic);
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState(defaults.kind);

  return (
    <Sheet title="What did you study?">
      <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
        <option value="">Custom subject</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {!subjectId && (
        <input
          className={inputCls}
          placeholder="subject"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
      )}
      <input
        className={inputCls}
        placeholder="topic covered"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />
      <textarea
        className="min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-brand/60"
        placeholder="notes — what you understood, what's pending"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        {["reading", "class"].map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`h-11 rounded-xl border text-sm font-medium ${
              kind === k ? "border-brand/60 bg-brand/10 text-brand" : "border-border text-muted-foreground"
            }`}
          >
            {k === "class" ? "Online class" : "Book reading"}
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="h-11 flex-1 rounded-xl border border-border text-sm">
          Keep running
        </button>
        <button
          disabled={busy}
          onClick={() =>
            onSave({
              subject_id: subjectId || null,
              subject_name: subjectId
                ? (subjects.find((s) => s.id === subjectId)?.name ?? null)
                : custom || "Study",
              topic,
              notes,
              kind,
            })
          }
          className="h-11 flex-[2] rounded-xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
        >
          Save session
        </button>
      </div>
    </Sheet>
  );
}
