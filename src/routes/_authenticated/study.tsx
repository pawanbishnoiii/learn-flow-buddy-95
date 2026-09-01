import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import FlipClock from "@/components/ui/flip-clock";
import {
  currentBlock,
  endBreak,
  fetchBlocks,
  fetchOpenBreak,
  fetchRunningSession,
  fetchSubjects,
  localTimeToIsoToday,
  startBreak,
  startSession,
  stopSession,
} from "@/lib/study";

/** A single session can never exceed 8 hours. */
const MAX_SESSION_SECONDS = 8 * 3600;

const NUDGES = [
  "Bas thodi der aur — 10 minute aur nikaal le.",
  "Abhi rukega to kal phir zero se shuru karna padega.",
  "Ek chapter aur. Future tu thank you bolega.",
  "Itni jaldi thak gaya? Tere andar isse zyada dum hai.",
  "Break lena hai to break le — par session mat maar.",
];

export const Route = createFileRoute("/_authenticated/study")({
  head: () => ({
    meta: [
      { title: "Study Mode — Chronodeck" },
      {
        name: "description",
        content:
          "Distraction-free study mode with a flip-clock timer, break logging and automatic session saving.",
      },
      { property: "og:title", content: "Study Mode — Chronodeck" },
      {
        property: "og:description",
        content: "Full-screen flip clock focus timer that keeps running in the background.",
      },
    ],
  }),
  component: StudyModePage,
});

function StudyModePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/study" }) as { block?: string };
  const [controls, setControls] = useState(true);
  const [stopped, setStopped] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [nudgeLine, setNudgeLine] = useState("");
  const [saving, setSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* fullscreen unsupported on this device */
    }
  }
  const [tick, setTick] = useState(0);
  const [form, setForm] = useState({
    subject_id: "",
    subject_name: "",
    topic: "",
    kind: "reading",
    planned_end_at: "",
  });
  const [saveForm, setSaveForm] = useState({ topic: "", notes: "" });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchY = useRef<number | null>(null);

  const running = useQuery({ queryKey: ["running"], queryFn: fetchRunningSession, refetchInterval: 60_000 });
  const openBreak = useQuery({ queryKey: ["open-break"], queryFn: fetchOpenBreak });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const blocks = useQuery({ queryKey: ["blocks"], queryFn: fetchBlocks });

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const runningId = running.data?.id ?? null;
  useEffect(() => {
    // Only lock scrolling once the timer is live — the setup form must stay scrollable.
    if (!runningId) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [runningId]);

  /** Auto-fill subject + kind from the timetable block covering the current time or selected by URL. */
  useEffect(() => {
    if (running.data || form.subject_id || form.subject_name || !blocks.data) return;
    const selected = search.block ? blocks.data.find((b) => b.id === search.block) : null;
    const b = selected || currentBlock(blocks.data);
    if (b) {
      setForm((f) => ({
        ...f,
        subject_id: b.subject_id ?? "",
        subject_name: b.subject_id ? "" : b.title,
        kind: b.kind === "class" ? "class" : "reading",
        topic: f.topic || b.title,
        planned_end_at: b.end_time,
      }));
    }
  }, [blocks.data, running.data, form.subject_id, form.subject_name, search.block]);

  const start = useMutation({
    mutationFn: async () => {
      const subj = (subjects.data ?? []).find((s) => s.id === form.subject_id);
      const plannedEnd = form.planned_end_at ? localTimeToIsoToday(form.planned_end_at) : null;
      await startSession({
        subject_id: subj?.id ?? null,
        subject_name: subj?.name ?? (form.subject_name.trim() || "Study"),
        topic: form.topic.trim() || null,
        kind: form.kind,
        planned_end_at: plannedEnd,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["running"] });
      reveal();
      toast.success("Study mode on");
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
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["running"] }),
        qc.invalidateQueries({ queryKey: ["sessions", "8w"] }),
        qc.invalidateQueries({ queryKey: ["open-break"] }),
        qc.invalidateQueries({ queryKey: ["breaks"] }),
      ]);
      toast.success("Session saved");
      navigate({ to: "/today" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function reveal() {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), 6000);
  }

  const s = running.data;
  const elapsed = s ? Math.max(0, Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000)) : 0;
  void tick;

  // Hard cap: a single session can never run longer than 8 hours — it auto-saves itself.
  const autoStopped = useRef(false);
  useEffect(() => {
    if (!s || autoStopped.current) return;
    if (elapsed >= MAX_SESSION_SECONDS) {
      autoStopped.current = true;
      toast.message("8 hour limit reached — session saved automatically");
      save.mutate();
    }
  }, [s, elapsed, save]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto overscroll-contain bg-black bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--accent-start)_14%,transparent),transparent)] text-white"
      onClick={reveal}
      onTouchStart={(e) => {
        touchY.current = e.touches[0]?.clientY ?? null;
      }}
      onTouchMove={(e) => {
        const st = touchY.current;
        const y = e.touches[0]?.clientY ?? 0;
        if (st !== null && Math.abs(y - st) > 30) reveal();
      }}
    >
      {!s ? (
        <div className="w-full max-w-sm px-6" onClick={(e) => e.stopPropagation()}>
          <p className="font-mono text-[10px] tracking-[0.4em] text-white/40 uppercase">study mode</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Set up your session</h1>

          <select
            value={form.subject_id}
            onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
            className="mt-5 h-12 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white"
          >
            <option value="" className="text-black">
              Custom subject…
            </option>
            {(subjects.data ?? []).map((x) => (
              <option key={x.id} value={x.id} className="text-black">
                {x.name}
              </option>
            ))}
          </select>
          {!form.subject_id ? (
            <input
              value={form.subject_name}
              onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
              placeholder="Subject"
              className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/30"
            />
          ) : null}
          <input
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Topic / chapter"
            className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/30"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { k: "reading", l: "Reading" },
              { k: "class", l: "Online class" },
            ].map((o) => (
              <button
                key={o.k}
                onClick={() => setForm({ ...form, kind: o.k })}
                className={`h-11 rounded-xl border text-sm transition-colors ${
                  form.kind === o.k ? "border-white bg-white text-black" : "border-white/20 text-white/70"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <button
            onClick={() => start.mutate()}
            disabled={start.isPending}
            className="gradient-ring mt-5 h-14 w-full rounded-2xl text-sm font-semibold text-brand-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {start.isPending ? "Starting…" : "Start timer"}
          </button>
          <button
            onClick={() => navigate({ to: "/today" })}
            className="mt-2 h-11 w-full rounded-2xl border border-white/15 text-sm text-white/60"
          >
            Back to home
          </button>
        </div>
      ) : (
        <>
          <p className="font-mono text-[10px] tracking-[0.4em] text-white/35 uppercase">
            {openBreak.data ? `on ${openBreak.data.kind}` : "focus"}
          </p>

          <motion.div
            animate={{ opacity: openBreak.data ? 0.4 : 1 }}
            transition={{ duration: 0.4 }}
            className="mt-6 w-full px-3"
          >
            <FlipClock seconds={elapsed} />
          </motion.div>

          {s.planned_end_at ? (
            <PlannedEndCountdown plannedEnd={s.planned_end_at} onReached={reveal} />
          ) : null}

          <p className="mt-8 text-sm font-medium text-white/70">{s.subject_name ?? "Study"}</p>
          {s.topic ? <p className="mt-1 text-xs text-white/35">{s.topic}</p> : null}

          <AnimatePresence>
            {controls ? (
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-6 pb-10"
                onClick={(e) => e.stopPropagation()}
              >
                {saving ? (
                  <div className="w-full max-w-sm">
                    <input
                      value={saveForm.topic}
                      onChange={(e) => setSaveForm({ ...saveForm, topic: e.target.value })}
                      placeholder="Topic covered"
                      className="h-12 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/30"
                    />
                    <textarea
                      value={saveForm.notes}
                      onChange={(e) => setSaveForm({ ...saveForm, notes: e.target.value })}
                      rows={2}
                      placeholder="Notes"
                      className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white placeholder:text-white/30"
                    />
                    <button
                      onClick={() => save.mutate()}
                      disabled={save.isPending}
                      className="mt-3 h-12 w-full rounded-2xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
                    >
                      {save.isPending ? "Saving…" : "Exit & save session"}
                    </button>
                    <button
                      onClick={() => {
                        setSaving(false);
                        setStopped(false);
                      }}
                      className="mt-2 h-11 w-full text-xs text-white/40 underline"
                    >
                      Keep studying
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex w-full max-w-sm gap-2">
                      {openBreak.data ? (
                        <button
                          onClick={() => resume.mutate()}
                          className="h-12 flex-1 rounded-2xl bg-white text-sm font-semibold text-black"
                        >
                          Resume
                        </button>
                      ) : (
                        ["pause", "sleep", "free"].map((k) => (
                          <button
                            key={k}
                            onClick={() => pause.mutate(k)}
                            className="h-12 flex-1 rounded-2xl border border-white/20 text-sm font-medium text-white/80 capitalize"
                          >
                            {k}
                          </button>
                        ))
                      )}
                    </div>
                    {nudge ? (
                      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-white/5 p-4 text-center">
                        <p className="text-sm leading-relaxed text-white/85">{nudgeLine}</p>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => setNudge(false)}
                            className="h-12 flex-1 rounded-2xl bg-brand text-sm font-semibold text-brand-foreground"
                          >
                            Thodi der aur
                          </button>
                          <button
                            onClick={() => {
                              setNudge(false);
                              setStopped(true);
                              setSaving(true);
                              setSaveForm({ topic: s.topic ?? "", notes: "" });
                            }}
                            className="h-12 flex-1 rounded-2xl border border-white/20 text-sm font-medium text-white/80"
                          >
                            Stop anyway
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setNudgeLine(NUDGES[Math.floor(Math.random() * NUDGES.length)] ?? NUDGES[0]!);
                          setNudge(true);
                          reveal();
                        }}
                        className="h-12 w-full max-w-sm rounded-2xl bg-white/10 text-sm font-semibold text-white"
                      >
                        Stop
                      </button>
                    )}
                    <div className="flex w-full max-w-sm items-center justify-between gap-3 pt-1">
                      <button
                        onClick={() => navigate({ to: "/today" })}
                        className="text-[11px] text-white/35 underline"
                      >
                        Minimise — timer keeps running
                      </button>
                      <button
                        onClick={toggleFullscreen}
                        className="flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-[11px] text-white/60 transition-colors hover:text-white"
                      >
                        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          {isFullscreen ? (
                            <path d="M9 3v6H3M15 21v-6h6M3 15h6v6M21 9h-6V3" />
                          ) : (
                            <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
                          )}
                        </svg>
                        {isFullscreen ? "Exit full screen" : "Full screen"}
                      </button>
                    </div>
                  </>
                )}
                <p className="pt-1 font-mono text-[9px] tracking-[0.3em] text-white/20 uppercase">
                  {stopped ? "exit to save" : "swipe anywhere for controls"}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

function PlannedEndCountdown({ plannedEnd, onReached }: { plannedEnd: string; onReached: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(plannedEnd).getTime() - Date.now()));
  const fired = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      const remaining = Math.max(0, new Date(plannedEnd).getTime() - Date.now());
      setLeft(remaining);
      if (remaining === 0 && !fired.current) {
        fired.current = true;
        onReached();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [plannedEnd, onReached]);

  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  if (left === 0)
    return (
      <p className="mt-2 animate-pulse font-mono text-[10px] text-brand uppercase">block ended · stop to save</p>
    );
  return (
    <p className="mt-2 font-mono text-[10px] text-white/40 uppercase">
      ends in {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </p>
  );
}

