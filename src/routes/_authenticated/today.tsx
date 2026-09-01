import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { FocusMode } from "@/components/FocusMode";
import { Icon3D } from "@/components/Icon3D";
import { getDailyInsight } from "@/lib/ai.functions";
import {
  DAYS,
  dailyMinutes,
  dayKey,
  endBreak,
  fetchBlocks,
  fetchBreaks,
  fetchMotivations,
  fetchOpenBreak,
  fetchRunningSession,
  fetchSessions,
  fetchSettings,
  fetchSubjects,
  fetchTargets,
  hourlyHeat,
  minutesInRange,
  reorderBlocks,
  subjectProgress,
  startBreak,
  startOfToday,
  startOfWeek,
  startSession,
  stopSession,
  weeklyHistory,
} from "@/lib/study";
import type { Block, Target } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today — Chronodeck Study OS" },
      {
        name: "description",
        content:
          "Live focus timer, weekly progress charts, calendar analytics, targets and AI coaching in one study dashboard.",
      },
      { property: "og:title", content: "Today — Chronodeck Study OS" },
      {
        property: "og:description",
        content: "Run the focus timer, log breaks, track hours against your daily and weekly targets.",
      },
    ],
  }),
  component: TodayPage,
});

const EIGHT_WEEKS = new Date(Date.now() - 8 * 7 * 864e5).toISOString();

function TodayPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [startOpen, setStartOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [scope, setScope] = useState<"day" | "week" | "month">("week");

  const [form, setForm] = useState({ subject_id: "", subject_name: "", topic: "", kind: "reading" });
  const [saveForm, setSaveForm] = useState({ topic: "", notes: "" });

  const running = useQuery({ queryKey: ["running"], queryFn: fetchRunningSession, refetchInterval: 60_000 });
  const openBreak = useQuery({ queryKey: ["open-break"], queryFn: fetchOpenBreak });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const blocks = useQuery({ queryKey: ["blocks"], queryFn: fetchBlocks });
  const targets = useQuery({ queryKey: ["targets"], queryFn: fetchTargets });
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const motivations = useQuery({ queryKey: ["motivations"], queryFn: fetchMotivations, staleTime: 60 * 60_000 });
  const breaks = useQuery({
    queryKey: ["breaks"],
    queryFn: () => fetchBreaks(startOfWeek().toISOString()),
  });
  const sessions = useQuery({
    queryKey: ["sessions", "8w"],
    queryFn: () => fetchSessions(EIGHT_WEEKS),
  });

  const insightFn = useServerFn(getDailyInsight);
  const insight = useQuery({
    queryKey: ["insight"],
    queryFn: () => insightFn({}),
    staleTime: 15 * 60_000,
    retry: false,
  });

  const all = sessions.data ?? [];
  const dailyGoal = settings.data?.daily_goal_hours ?? 4;
  const weeklyGoal = settings.data?.weekly_goal_hours ?? 26;

  const todayMin = minutesInRange(all, startOfToday());
  const weekMin = minutesInRange(all, startOfWeek());
  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);
  const monthMin = minutesInRange(all, monthStart);

  const history = useMemo(() => weeklyHistory(all, weeklyGoal), [all, weeklyGoal]);
  const perDay = useMemo(() => dailyMinutes(all), [all]);

  const todayIdx = new Date().getDay();
  const tomorrowIdx = (todayIdx + 1) % 7;
  const todayBlocks = (blocks.data ?? []).filter((b) => b.day_of_week === todayIdx);
  const tomorrowBlocks = (blocks.data ?? []).filter((b) => b.day_of_week === tomorrowIdx);
  const activeTargets = (targets.data ?? []).filter((t) => t.is_active);

  const quote = useMemo(() => {
    const qs = (motivations.data ?? []).filter((m) => m.kind === "quote");
    if (!qs.length) return null;
    return qs[new Date().getDate() % qs.length] ?? null;
  }, [motivations.data]);

  const magazine = useMemo(() => {
    const ms = (motivations.data ?? []).filter((m) => m.kind === "magazine");
    if (!ms.length) return null;
    const month = new Date().getMonth() + 1;
    return ms.find((m) => m.month === month) ?? ms[month % ms.length] ?? null;
  }, [motivations.data]);

  const hours = useMemo(() => hourlyHeat(all), [all]);
  const progress = useMemo(
    () => subjectProgress(all, subjects.data ?? []),
    [all, subjects.data],
  );

  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderBlocks(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const start = useMutation({
    mutationFn: async () => {
      const subj = (subjects.data ?? []).find((s) => s.id === form.subject_id);
      await startSession({
        subject_id: subj?.id ?? null,
        subject_name: subj?.name ?? form.subject_name.trim() ?? null,
        topic: form.topic.trim() || null,
        kind: form.kind,
      });
    },
    onSuccess: async () => {
      setStartOpen(false);
      await qc.invalidateQueries({ queryKey: ["running"] });
      toast.success("Focus mode on");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pause = useMutation({
    mutationFn: (kind: string) => startBreak(running.data?.id ?? null, kind),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["open-break"] }),
  });

  const resume = useMutation({
    mutationFn: async () => {
      const b = openBreak.data;
      if (b) await endBreak(b.id, b.started_at);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["open-break"] });
      qc.invalidateQueries({ queryKey: ["breaks"] });
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const s = running.data;
      if (!s) return;
      const b = openBreak.data;
      if (b) await endBreak(b.id, b.started_at);
      await stopSession(s.id, s.started_at, {
        subject_id: s.subject_id,
        subject_name: s.subject_name,
        topic: saveForm.topic.trim() || s.topic || "",
        notes: saveForm.notes.trim(),
        kind: s.kind,
      });
    },
    onSuccess: async () => {
      setSaveOpen(false);
      setSaveForm({ topic: "", notes: "" });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["running"] }),
        qc.invalidateQueries({ queryKey: ["sessions", "8w"] }),
        qc.invalidateQueries({ queryKey: ["open-break"] }),
        qc.invalidateQueries({ queryKey: ["breaks"] }),
      ]);
      toast.success("Session saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const inFocus = !!running.data && !saveOpen;

  return (
    <AppShell>
      {inFocus && running.data ? (
        <FocusMode
          startedAt={running.data.started_at}
          subject={running.data.subject_name ?? "Study"}
          topic={running.data.topic}
          paused={!!openBreak.data}
          breakKind={openBreak.data?.kind ?? null}
          onPause={(k) => pause.mutate(k)}
          onResume={() => resume.mutate()}
          onExit={() => {
            setSaveForm({ topic: running.data?.topic ?? "", notes: "" });
            setSaveOpen(true);
          }}
        />
      ) : null}

      <div className="space-y-8 px-5 py-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-panel p-6">
          <div className="pointer-events-none absolute -top-16 -right-10 size-52 rounded-full bg-brand/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] text-brand uppercase">Start study</p>
              <h1 className="mt-2 text-2xl leading-tight font-semibold tracking-tight">
                {todayMin > 0
                  ? `${(todayMin / 60).toFixed(1)}h done today`
                  : "Aaj ka pehla session shuru karo"}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Daily target {dailyGoal}h · {Math.min(100, Math.round((todayMin / 60 / dailyGoal) * 100))}%
                complete
              </p>
            </div>
            <Icon3D name="clock" size={64} priority />
          </div>

          <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-brand transition-all duration-700"
              style={{ width: `${Math.min(100, (todayMin / 60 / dailyGoal) * 100)}%` }}
            />
          </div>

          <button
            onClick={() => navigate({ to: "/study" })}
            className="relative mt-5 h-14 w-full rounded-2xl bg-brand text-sm font-semibold text-brand-foreground transition-transform active:scale-[0.98]"
          >
            {running.data ? "Back to running session" : "Start study"}
          </button>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: "Today", value: `${(todayMin / 60).toFixed(1)}h`, icon: "books" as const },
            { label: "This week", value: `${(weekMin / 60).toFixed(1)}h`, icon: "target" as const },
            { label: "This month", value: `${(monthMin / 60).toFixed(1)}h`, icon: "trophy" as const },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-panel p-4">
              <Icon3D name={s.icon} size={28} />
              <p className="mt-3 font-mono text-lg leading-none font-semibold">{s.value}</p>
              <p className="mt-1 text-[10px] tracking-wide text-muted-foreground uppercase">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Analytics calendar */}
        <section className="rounded-3xl border border-border bg-panel p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon3D name="calendar" size={32} />
              <h2 className="text-sm font-semibold">Analytics</h2>
            </div>
            <div className="flex gap-1 rounded-xl bg-background p-1">
              {(["day", "week", "month"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`rounded-lg px-3 py-1 font-mono text-[10px] uppercase transition-colors ${
                    scope === s ? "bg-brand text-brand-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-4 font-mono text-3xl font-semibold">
            {scope === "day"
              ? (todayMin / 60).toFixed(1)
              : scope === "week"
                ? (weekMin / 60).toFixed(1)
                : (monthMin / 60).toFixed(1)}
            <span className="ml-1 text-sm text-muted-foreground">h</span>
          </p>

          <MonthGrid perDay={perDay} />
        </section>

        {/* Hourly heatmap */}
        <section className="rounded-3xl border border-border bg-panel p-5">
          <div className="flex items-center gap-3">
            <Icon3D name="clock" size={32} />
            <h2 className="text-sm font-semibold">Hour by hour</h2>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground uppercase">today</span>
          </div>
          <HourGrid hours={hours} />
          <div className="mt-3 flex items-center gap-4 font-mono text-[9px] text-muted-foreground uppercase">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-brand" /> studied
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-destructive/70" /> missed
            </span>
          </div>
        </section>

        {/* Subject progress */}
        <section className="rounded-3xl border border-border bg-panel p-5">
          <div className="flex items-center gap-3">
            <Icon3D name="books" size={32} />
            <h2 className="text-sm font-semibold">Subject progress</h2>
            <Link to="/targets" className="ml-auto font-mono text-[10px] text-brand uppercase">
              subjects
            </Link>
          </div>
          {progress.length ? (
            <ul className="mt-4 space-y-3">
              {progress.map((p) => (
                <li key={p.name}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate font-medium">{p.name}</span>
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {p.sessions} sess · {(p.minutes / 60).toFixed(1)}h
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-700"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {p.targetHours > 0
                      ? `${p.pct}% of ${p.targetHours}h · ${p.remainingHours.toFixed(1)}h left`
                      : "no weekly target set"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Add subjects and finish a session to see per-subject progress.
            </p>
          )}
        </section>

        {/* Day planner with drag & drop */}
        <DayPlanner
          blocks={blocks.data ?? []}
          targets={activeTargets}
          onReorder={(ids) => reorder.mutate(ids)}
        />

        {/* Weekly progress chart */}
        <section className="rounded-3xl border border-border bg-panel p-5">
          <h2 className="text-sm font-semibold">Weekly target progress</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Last 8 weeks vs your {weeklyGoal}h weekly goal
          </p>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  cursor={{ fill: "var(--accent)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="hours" fill="var(--brand)" radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="goal" stroke="var(--warm)" dot={false} strokeDasharray="4 4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 h-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <Area
                  type="monotone"
                  dataKey="pct"
                  stroke="var(--warm)"
                  fill="color-mix(in oklab, var(--warm) 25%, transparent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">% of weekly goal completed</p>
        </section>

        {/* Targets */}
        <section className="rounded-3xl border border-border bg-panel p-5">
          <div className="flex items-center gap-3">
            <Icon3D name="target" size={32} />
            <h2 className="text-sm font-semibold">Targets</h2>
            <Link to="/targets" className="ml-auto font-mono text-[10px] text-brand uppercase">
              manage
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Ring label="Daily" done={todayMin / 60} goal={dailyGoal} />
            <Ring label="Weekly" done={weekMin / 60} goal={weeklyGoal} />
          </div>
          {activeTargets.length ? (
            <ul className="mt-4 space-y-2">
              {activeTargets.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t.title}</span>
                  <span className="font-mono">
                    {t.daily_hours}h/d · {t.weekly_hours}h/w
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              No targets yet — add one on the Targets page.
            </p>
          )}
        </section>

        {/* Tomorrow plan */}
        <section className="rounded-3xl border border-border bg-panel p-5">
          <div className="flex items-center gap-3">
            <Icon3D name="books" size={32} />
            <h2 className="text-sm font-semibold">Next day plan</h2>
            <Link to="/timetable" className="ml-auto font-mono text-[10px] text-brand uppercase">
              timetable
            </Link>
          </div>
          <p className="mt-3 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Today · {DAYS[todayIdx]}
          </p>
          <BlockList items={todayBlocks} empty="No blocks scheduled for today." />
          <p className="mt-4 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Tomorrow · {DAYS[tomorrowIdx]}
          </p>
          <BlockList items={tomorrowBlocks} empty="Tomorrow is open — plan a reading block." />
        </section>

        {/* Breaks */}
        <section className="rounded-3xl border border-border bg-panel p-5">
          <div className="flex items-center gap-3">
            <Icon3D name="break" size={32} />
            <h2 className="text-sm font-semibold">Break log</h2>
          </div>
          {breaks.data?.length ? (
            <ul className="mt-3 space-y-2">
              {breaks.data.slice(0, 6).map((b) => (
                <li key={b.id} className="flex items-center justify-between text-xs">
                  <span className="capitalize">{b.kind}</span>
                  <span className="font-mono text-muted-foreground">
                    {new Date(b.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {b.duration_minutes ? ` · ${b.duration_minutes}m` : " · open"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Pause, sleep or free time logged during focus mode appears here.
            </p>
          )}
        </section>

        {/* AI insight */}
        <section className="rounded-3xl border border-brand/25 bg-brand/5 p-5">
          <div className="flex items-center gap-3">
            <Icon3D name="brain" size={32} />
            <h2 className="text-sm font-semibold">AI coach</h2>
            <Link to="/assistant" className="ml-auto font-mono text-[10px] text-brand uppercase">
              chat
            </Link>
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            {insight.isLoading ? "Reading your study data…" : (insight.data?.insight ?? "AI is warming up.")}
          </p>
        </section>

        {/* Motivation + magazine */}
        <section className="grid gap-3">
          {quote ? (
            <div className="rounded-3xl border border-border bg-panel p-5">
              <div className="flex items-center gap-3">
                <Icon3D name="trophy" size={32} />
                <h2 className="text-sm font-semibold">{quote.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{quote.body}</p>
              {quote.author ? (
                <p className="mt-2 font-mono text-[10px] text-brand uppercase">— {quote.author}</p>
              ) : null}
            </div>
          ) : null}
          {magazine ? (
            <div className="rounded-3xl border border-warm/25 bg-warm/5 p-5">
              <div className="flex items-center gap-3">
                <Icon3D name="magazine" size={32} />
                <h2 className="text-sm font-semibold">{magazine.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{magazine.body}</p>
            </div>
          ) : null}
        </section>
      </div>

      {/* Start sheet */}
      {startOpen ? (
        <Sheet title="Start study" onClose={() => setStartOpen(false)}>
          <label className="block text-xs text-muted-foreground">Subject</label>
          <select
            value={form.subject_id}
            onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
            className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="">Custom subject…</option>
            {(subjects.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {!form.subject_id ? (
            <input
              value={form.subject_name}
              onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
              placeholder="e.g. Physics"
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            />
          ) : null}

          <label className="mt-4 block text-xs text-muted-foreground">Topic</label>
          <input
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Chapter / topic"
            className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />

          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { k: "reading", l: "Reading" },
              { k: "class", l: "Online class" },
            ].map((o) => (
              <button
                key={o.k}
                onClick={() => setForm({ ...form, kind: o.k })}
                className={`h-11 rounded-xl border text-sm ${
                  form.kind === o.k ? "border-brand bg-brand/10 text-brand" : "border-border"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>

          <button
            onClick={() => start.mutate()}
            disabled={start.isPending}
            className="mt-5 h-12 w-full rounded-2xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            {start.isPending ? "Starting…" : "Start timer"}
          </button>
        </Sheet>
      ) : null}

      {/* Save sheet */}
      {saveOpen ? (
        <Sheet title="Save session" onClose={() => setSaveOpen(false)}>
          <p className="text-xs text-muted-foreground">
            {running.data?.subject_name ?? "Study"} ·{" "}
            {running.data
              ? `${Math.round((Date.now() - new Date(running.data.started_at).getTime()) / 60000)} min`
              : ""}
          </p>
          <label className="mt-4 block text-xs text-muted-foreground">Topic covered</label>
          <input
            value={saveForm.topic}
            onChange={(e) => setSaveForm({ ...saveForm, topic: e.target.value })}
            className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
          <label className="mt-4 block text-xs text-muted-foreground">Notes</label>
          <textarea
            value={saveForm.notes}
            onChange={(e) => setSaveForm({ ...saveForm, notes: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm"
          />
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="mt-5 h-12 w-full rounded-2xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            {save.isPending ? "Saving…" : "Complete session"}
          </button>
          <button
            onClick={() => setSaveOpen(false)}
            className="mt-2 h-11 w-full rounded-2xl border border-border text-sm"
          >
            Back to timer
          </button>
        </Sheet>
      ) : null}
    </AppShell>
  );
}

function BlockList({ items, empty }: { items: Array<{ id: string; title: string; kind: string; start_time: string; end_time: string }>; empty: string }) {
  if (!items.length) return <p className="mt-2 text-xs text-muted-foreground">{empty}</p>;
  return (
    <ul className="mt-2 space-y-2">
      {items.map((b) => (
        <li
          key={b.id}
          className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs"
        >
          <span>
            {b.title}
            <span className="ml-2 text-muted-foreground capitalize">{b.kind}</span>
          </span>
          <span className="font-mono text-muted-foreground">
            {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Ring({ label, done, goal }: { label: string; done: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0;
  return (
    <div className="rounded-2xl border border-border p-4">
      <div
        className="mx-auto grid size-20 place-items-center rounded-full"
        style={{
          background: `conic-gradient(var(--brand) ${pct * 3.6}deg, var(--accent) 0deg)`,
        }}
      >
        <div className="grid size-16 place-items-center rounded-full bg-panel font-mono text-sm font-semibold">
          {pct}%
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] tracking-widest text-muted-foreground uppercase">
        {label} · {done.toFixed(1)}/{goal}h
      </p>
    </div>
  );
}

function MonthGrid({ perDay, dailyGoal }: { perDay: Record<string, number>; dailyGoal: number }) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(now.getFullYear(), now.getMonth(), i + 1)),
  ];
  return (
    <div className="mt-5">
      <div className="grid grid-cols-7 gap-1.5 font-mono text-[9px] text-muted-foreground">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-center">
            {d}
          </span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const mins = perDay[dayKey(d)] ?? 0;
          const isFuture = d > now;
          const isToday = dayKey(d) === dayKey(now);
          const hit = mins >= dailyGoal * 60;
          const partial = mins > 0 && !hit;
          const bg = isFuture
            ? "var(--accent)"
            : hit
              ? "color-mix(in oklab, var(--success) 65%, var(--accent))"
              : partial
                ? "color-mix(in oklab, var(--warning) 55%, var(--accent))"
                : "color-mix(in oklab, var(--destructive) 45%, var(--accent))";
          return (
            <div
              key={dayKey(d)}
              title={`${d.getDate()} · ${(mins / 60).toFixed(1)}h`}
              className={`grid aspect-square place-items-center rounded-md font-mono text-[9px] transition-colors ${
                isToday ? "outline-1 -outline-offset-1 outline-brand" : ""
              }`}
              style={{
                background: bg,
                color: hit || partial ? "var(--background)" : "var(--muted-foreground)",
              }}
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 font-mono text-[9px] text-muted-foreground uppercase">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--success)]" /> hit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--warning)]" /> partial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--destructive)]" /> missed
        </span>
      </div>
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
        className="max-h-[88vh] w-full animate-[slide-in-right_0.001s] overflow-y-auto rounded-t-3xl border-t border-border bg-panel p-5 pb-8"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function HourGrid({ hours }: { hours: number[] }) {
  const nowHour = new Date().getHours();
  return (
    <div className="mt-4 grid grid-cols-8 gap-1.5 sm:grid-cols-12">
      {hours.map((mins, h) => {
        const future = h > nowHour;
        const bg = future
          ? "var(--accent)"
          : mins >= 20
            ? `color-mix(in oklab, var(--brand) ${Math.min(100, 40 + mins)}%, var(--accent))`
            : "color-mix(in oklab, var(--destructive) 45%, var(--accent))";
        return (
          <div
            key={h}
            title={`${String(h).padStart(2, "0")}:00 · ${mins}m`}
            className="grid aspect-square place-items-center rounded-md font-mono text-[9px] transition-colors"
            style={{ background: bg, color: "var(--foreground)" }}
          >
            {h}
          </div>
        );
      })}
    </div>
  );
}

function DayPlanner({
  blocks,
  targets,
  onReorder,
}: {
  blocks: Block[];
  targets: Target[];
  onReorder: (ids: string[]) => void;
}) {
  const [day, setDay] = useState(new Date().getDay());
  const [dragId, setDragId] = useState<string | null>(null);
  const items = blocks.filter((b) => b.day_of_week === day);

  function drop(overId: string) {
    if (!dragId || dragId === overId) return;
    const ids = items.map((b) => b.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(overId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    onReorder(ids);
    setDragId(null);
  }

  return (
    <section className="rounded-3xl border border-border bg-panel p-5">
      <div className="flex items-center gap-3">
        <Icon3D name="calendar" size={32} />
        <h2 className="text-sm font-semibold">Day calendar</h2>
        <Link to="/timetable" className="ml-auto font-mono text-[10px] text-brand uppercase">
          edit
        </Link>
      </div>

      <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`h-9 shrink-0 rounded-xl px-3 font-mono text-[11px] transition-colors ${
              day === d ? "bg-brand text-brand-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            {DAYS[d]}
          </button>
        ))}
      </div>

      {items.length ? (
        <ul className="mt-4 space-y-2">
          {items.map((b) => (
            <li
              key={b.id}
              draggable
              onDragStart={() => setDragId(b.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(b.id)}
              className={`flex cursor-grab items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-xs transition-opacity active:cursor-grabbing ${
                dragId === b.id ? "opacity-50" : ""
              }`}
            >
              <span className="font-mono text-muted-foreground">⠿</span>
              <span className="min-w-0 flex-1 truncate">
                {b.title}
                <span className="ml-2 text-muted-foreground capitalize">{b.kind}</span>
              </span>
              <span className="shrink-0 font-mono text-muted-foreground">
                {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">No blocks for this day yet.</p>
      )}

      <p className="mt-4 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        Targets
      </p>
      {targets.length ? (
        <ul className="mt-2 space-y-1.5">
          {targets.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate">{t.title}</span>
              <span className="shrink-0 font-mono text-muted-foreground">{t.daily_hours}h today</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No active targets.</p>
      )}
    </section>
  );
}
