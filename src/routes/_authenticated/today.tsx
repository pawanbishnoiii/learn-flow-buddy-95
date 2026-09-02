import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  YAxis,
} from "recharts";
import { FocusMode } from "@/components/FocusMode";
import {
  ChartDrawIn,
  CountUp,
  Reveal,
  Shimmer,
  StaggerGrid,
  useIdleGlow,
} from "@/components/motion/gsap-bits";
import { Mascot, mascotState } from "@/components/Mascot";
import { dailyHitStreak } from "@/lib/streak";
import { Icon3D } from "@/components/Icon3D";
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
  fmtHM,
  hourlyHeat,
  localTimeToIsoToday,
  minutesInRange,
  monthlyHistory,
  reorderBlocks,
  subjectProgress,
  updateSubject,
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
  const [subjScope, setSubjScope] = useState<"1D" | "1W" | "1M">("1D");
  const [editSubject, setEditSubject] = useState<{ id: string; name: string; hours: string } | null>(null);

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
  const monthly = useMemo(() => monthlyHistory(all, weeklyGoal), [all, weeklyGoal]);
  const perDay = useMemo(() => dailyMinutes(all), [all]);
  const ctaRef = useIdleGlow<HTMLButtonElement>();
  const noData = !sessions.isLoading && all.length === 0;
  const streak = useMemo(() => dailyHitStreak(all, dailyGoal), [all, dailyGoal]);
  const heroMood = mascotState({ goalHit: todayMin >= dailyGoal * 60, streak });


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
  const subjWindow = useMemo(() => {
    if (subjScope === "1D") return { since: startOfToday(), scale: 1 / 7, label: "today" };
    if (subjScope === "1W") return { since: startOfWeek(), scale: 1, label: "this week" };
    return { since: monthStart, scale: 4.345, label: "this month" };
  }, [subjScope, monthStart]);

  const progress = useMemo(
    () => subjectProgress(all, subjects.data ?? [], subjWindow.since, subjWindow.scale),
    [all, subjects.data, subjWindow],
  );

  const saveSubjectTarget = useMutation({
    mutationFn: async (v: { id: string; hours: number }) =>
      updateSubject(v.id, { weekly_target_hours: v.hours }),
    onSuccess: async () => {
      setEditSubject(null);
      await qc.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Target updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderBlocks(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const start = useMutation({
    mutationFn: async () => {
      const subj = (subjects.data ?? []).find((s) => s.id === form.subject_id);
      const now = new Date();
      const current = (blocks.data ?? []).find((b) => b.day_of_week === now.getDay() && b.start_time <= `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}` && b.end_time >= `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
      const plannedEnd = current ? localTimeToIsoToday(current.end_time) : null;
      await startSession({
        subject_id: subj?.id ?? null,
        subject_name: subj?.name ?? form.subject_name.trim() ?? null,
        topic: form.topic.trim() || null,
        kind: form.kind,
        planned_end_at: plannedEnd,
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
    <>
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

      <div className="space-y-6 px-4 py-6">
        {/* Hero — the one loud element on this screen */}
        <section className="gradient-border relative overflow-hidden rounded-2xl p-6">
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="num text-[10px] tracking-[0.3em] text-brand uppercase">Start study</p>
              <h1 className="mt-2 text-2xl leading-tight font-semibold tracking-tight">
                {todayMin > 0 ? `${fmtHM(todayMin)} done today` : "Aaj ka pehla session shuru karo"}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Daily target {fmtHM(dailyGoal * 60)} ·{" "}
                {Math.min(100, Math.round((todayMin / 60 / dailyGoal) * 100))}% complete
              </p>
            </div>
            <Mascot state={heroMood} size={72} className="shrink-0" />
          </div>

          <div className="relative mt-6 h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div
              className="gradient-bar h-full rounded-full transition-[width] duration-1000 ease-out"
              style={{ width: `${Math.min(100, (todayMin / 60 / dailyGoal) * 100)}%` }}
            />
          </div>

          <button
            ref={ctaRef}
            onClick={() => navigate({ to: "/study" })}
            className="gradient-bar relative mt-6 h-14 w-full rounded-xl text-sm font-semibold text-[#04140d] transition-transform active:scale-[0.98]"
          >
            {running.data ? "Back to running session" : "Start study"}
          </button>
        </section>

        {/* Stats — deliberately quiet next to the hero */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: "Today", minutes: todayMin },
            { label: "This week", minutes: weekMin },
            { label: "This month", minutes: monthMin },
          ].map((s) => (
            <div key={s.label} className="glass-panel p-4">
              {noData ? (
                <>
                  <Shimmer className="h-5 w-14" />
                  <Shimmer className="mt-2 h-2.5 w-10" />
                </>
              ) : (
                <>
                  <p className="num text-lg leading-none font-semibold">
                    <CountUp value={Math.floor(s.minutes / 60)} decimals={0} suffix="h" />
                    <span className="ml-1 text-xs text-muted-foreground">
                      {String(Math.round(s.minutes % 60)).padStart(2, "0")}m
                    </span>
                  </p>
                  <p className="num mt-2 text-[10px] tracking-wide text-muted-foreground uppercase">
                    {s.label}
                  </p>
                </>
              )}
            </div>
          ))}
        </section>

        {/* Analytics calendar */}
        <Reveal className="glass-panel rounded-2xl p-5">
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
                  className={`rounded-lg px-3 py-1 font-mono text-[10px] uppercase transition-all duration-300 ${
                    scope === s ? "gradient-bar text-[#04140d]" : "text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <p className="num mt-4 text-3xl font-semibold">
            {fmtHM(scope === "day" ? todayMin : scope === "week" ? weekMin : monthMin)}
          </p>

          <div className="mt-5 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <ScopeChart scope={scope} sessions={all} dailyGoal={dailyGoal} weeklyGoal={weeklyGoal} />
            </ResponsiveContainer>
          </div>

          <MonthGrid perDay={perDay} dailyGoal={dailyGoal} />
        </Reveal>

        {/* Hourly heatmap */}
        <Reveal className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <Icon3D name="clock" size={32} />
            <h2 className="text-sm font-semibold">Hour by hour</h2>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground uppercase">today</span>
          </div>
          <StaggerGrid selector=".hour-cell">
            <HourGrid hours={hours} />
          </StaggerGrid>
          <div className="mt-3 flex items-center gap-4 font-mono text-[9px] text-muted-foreground uppercase">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-brand" /> studied
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-destructive/70" /> missed
            </span>
          </div>
        </Reveal>

        {/* Subject progress */}
        <Reveal className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <Icon3D name="books" size={32} />
            <h2 className="text-sm font-semibold">Subject progress</h2>
            <div className="ml-auto flex gap-1 rounded-xl bg-background p-1">
              {(["1D", "1W", "1M"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setSubjScope(k)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-[10px] transition-all duration-300 ${
                    subjScope === k ? "gradient-bar text-[#04140d]" : "text-muted-foreground"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            target {subjWindow.label}
          </p>
          {progress.length ? (
            <ul className="mt-4 space-y-3">
              {progress.map((p) => (
                <li key={p.name}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate font-medium">{p.name}</span>
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {p.sessions} sess · {fmtHM(p.minutes)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background">
                    <div
                      className="gradient-bar h-full rounded-full transition-[width] duration-1000 ease-out"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {p.targetHours > 0
                        ? `${p.pct}% of ${fmtHM(p.targetHours * 60)} · ${fmtHM(p.remainingHours * 60)} left`
                        : "no target set"}
                    </p>
                    {p.id ? (
                      <button
                        onClick={() =>
                          setEditSubject({
                            id: p.id!,
                            name: p.name,
                            hours: String(
                              (subjects.data ?? []).find((x) => x.id === p.id)?.weekly_target_hours ?? 0,
                            ),
                          })
                        }
                        className="font-mono text-[10px] text-brand uppercase"
                      >
                        edit
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Add subjects and finish a session to see per-subject progress.
            </p>
          )}
        </Reveal>


        {/* Day planner with drag & drop */}
        <DayPlanner
          blocks={blocks.data ?? []}
          targets={activeTargets}
          onReorder={(ids) => reorder.mutate(ids)}
        />

        {/* Weekly progress chart */}
        <section className="rounded-2xl border border-border bg-panel p-5">
          <h2 className="text-sm font-semibold">Weekly target progress</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Last 8 weeks vs your {weeklyGoal}h weekly goal
          </p>
          <ChartDrawIn className="mt-4 h-44" deps={[history]}>
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
                <Bar dataKey="hours" fill="rgba(255,255,255,0.14)" radius={[6, 6, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="goal"
                  stroke="var(--accent-end)"
                  strokeWidth={2}
                  dot={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartDrawIn>
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
        <section className="rounded-2xl border border-border bg-panel p-5">
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
        <section className="rounded-2xl border border-border bg-panel p-5">
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
        <section className="rounded-2xl border border-border bg-panel p-5">
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

        {/* Monthly progress */}
        <section className="rounded-2xl border border-border bg-panel p-5">
          <h2 className="text-sm font-semibold">Monthly progress</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Last 6 months of real sessions vs your pro-rated goal
          </p>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="monthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  fill="url(#monthFill)"
                />
                <Line type="monotone" dataKey="goal" stroke="var(--warm)" dot={false} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            this month {monthly.at(-1)?.hours ?? 0}h · {monthly.at(-1)?.pct ?? 0}% of goal
          </p>
        </section>




        {/* Motivation + magazine */}
        <section className="grid gap-3">
          {quote ? (
            <div className="rounded-2xl border border-border bg-panel p-5">
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
            <div className="rounded-2xl border border-warm/25 bg-warm/5 p-5">
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

      {/* Edit subject target sheet */}
      {editSubject ? (
        <Sheet title={`Edit ${editSubject.name} target`} onClose={() => setEditSubject(null)}>
          <label className="block text-xs text-muted-foreground">Weekly target (hours)</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={editSubject.hours}
            onChange={(e) => setEditSubject({ ...editSubject, hours: e.target.value })}
            className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
          <p className="mt-2 text-[10px] text-muted-foreground">
            This becomes the subject's weekly goal. Daily and monthly targets scale from it automatically.
          </p>
          <button
            onClick={() => saveSubjectTarget.mutate({ id: editSubject.id, hours: Number(editSubject.hours) || 0 })}
            disabled={saveSubjectTarget.isPending}
            className="mt-5 h-12 w-full rounded-2xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            {saveSubjectTarget.isPending ? "Saving…" : "Save target"}
          </button>
        </Sheet>
      ) : null}
    </>

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
        {label} · {fmtHM(done)}/{fmtHM(goal * 60)}
      </p>
    </div>
  );
}

function ScopeChart({
  scope,
  sessions,
  dailyGoal,
  weeklyGoal,
}: {
  scope: "day" | "week" | "month";
  sessions: { started_at: string; duration_minutes: number | null }[];
  dailyGoal: number;
  weeklyGoal: number;
}) {
  if (scope === "day") {
    const hours = Array.from({ length: 24 }, (_, i) => ({ h: String(i).padStart(2, "0") + ":00", m: 0 }));
    for (const s of sessions) {
      const d = new Date(s.started_at);
      if (dayKey(d) !== dayKey(new Date())) continue;
      const h = d.getHours();
      hours[h]!.m += s.duration_minutes ?? 0;
    }
    return (
      <BarChart data={hours}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="h" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={3} />
        <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
        <Bar dataKey="m" fill="var(--brand)" radius={[4, 4, 0, 0]} />
      </BarChart>
    );
  }

  if (scope === "week") {
    const days = [];
    const start = startOfWeek();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push({ label: DAYS[d.getDay()], h: (perDayFromSessions(sessions, d) / 60).toFixed(1), goal: dailyGoal });
    }
    return (
      <BarChart data={days}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
        <Bar dataKey="h" fill="var(--brand)" radius={[6, 6, 0, 0]} />
        <Line type="monotone" dataKey="goal" stroke="var(--warm)" dot={false} strokeDasharray="4 4" />
      </BarChart>
    );
  }

  // month
  const weeks = [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  for (let w = 0; w < 5; w++) {
    const ws = new Date(monthStart);
    ws.setDate(ws.getDate() + w * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    if (ws > monthEnd) break;
    let m = 0;
    for (const s of sessions) {
      const d = new Date(s.started_at);
      if (d >= ws && d <= we) m += s.duration_minutes ?? 0;
    }
    weeks.push({ label: `W${w + 1}`, h: (m / 60).toFixed(1), goal: weeklyGoal });
  }
  return (
    <AreaChart data={weeks}>
      <defs>
        <linearGradient id="monthFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.35} />
          <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke="var(--border)" />
      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
      <YAxis hide />
      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
      <Area type="monotone" dataKey="h" stroke="var(--brand)" fill="url(#monthFill)" />
      <Line type="monotone" dataKey="goal" stroke="var(--warm)" dot={false} strokeDasharray="4 4" />
    </AreaChart>
  );
}

function perDayFromSessions(sessions: { started_at: string; duration_minutes: number | null }[], d: Date) {
  let m = 0;
  for (const s of sessions) {
    if (dayKey(new Date(s.started_at)) === dayKey(d)) m += s.duration_minutes ?? 0;
  }
  return m;
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
              title={`${d.getDate()} · ${fmtHM(mins)}`}
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
    <div className="fixed inset-0 z-50 flex items-end bg-foreground/25 backdrop-blur-sm" onClick={onClose}>
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
    <section className="rounded-2xl border border-border bg-panel p-5">
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
