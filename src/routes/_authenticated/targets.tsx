import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  fetchSubjects,
  fetchTargets,
  createTarget,
  toggleTarget,
  deleteTarget,
  fetchSessions,
  fetchSettings,
  fmtHM,
  minutesInRange,
  startOfWeek,
} from "@/lib/study";
import { ProgressRing } from "@/components/motion/gsap-bits";

const EIGHT_WEEKS = new Date(Date.now() - 8 * 7 * 864e5).toISOString();

export const Route = createFileRoute("/_authenticated/targets")({
  head: () => ({
    meta: [
      { title: "Targets — Chronodeck Study OS" },
      {
        name: "description",
        content: "Set daily and weekly study targets so the AI coach can measure your progress.",
      },
      { property: "og:title", content: "Targets — Chronodeck Study OS" },
      {
        property: "og:description",
        content: "Daily and weekly study goals with AI-tracked progress.",
      },
    ],
  }),
  component: TargetsPage,
});

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand/60";

function TargetsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const targets = useQuery({ queryKey: ["targets"], queryFn: fetchTargets });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const sessions = useQuery({ queryKey: ["sessions", "8w"], queryFn: () => fetchSessions(EIGHT_WEEKS) });
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const weeklyGoal = settings.data?.weekly_goal_hours ?? 26;
  const weekMin = minutesInRange(sessions.data ?? [], startOfWeek());
  const weekPct = weeklyGoal > 0 ? Math.min(100, Math.round((weekMin / (weeklyGoal * 60)) * 100)) : 0;

  const createM = useMutation({
    mutationFn: createTarget,
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries();
      toast.success("Target added.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleM = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => toggleTarget(id, is_active),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: deleteTarget,
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Target deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <section className="px-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Targets</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Daily and weekly goals the AI compares against real study time.
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="h-10 shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold whitespace-nowrap text-brand-foreground"
          >
            New target
          </button>
        </div>

        {/* Hero — weekly completion ring */}
        <div className="gradient-border mt-5 rounded-2xl p-6">
          <ProgressRing
            pct={weekPct}
            label="This week"
            sub={`${fmtHM(weekMin)} / ${fmtHM(weeklyGoal * 60)}`}
          />
        </div>
      </section>

      <section className="mt-5 px-4">
        <SubjectsManager />
      </section>

      <section className="mt-5 space-y-3 px-5">
        {(targets.data ?? []).length === 0 && (
          <div className="rounded-2xl border border-border bg-panel p-6 text-center">
            <p className="text-sm text-muted-foreground">No targets yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">Add your first goal to unlock AI insights.</p>
          </div>
        )}
        {(targets.data ?? []).map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${t.is_active ? "bg-brand" : "bg-muted-foreground"}`}
                  />
                  <h3 className={`text-sm font-semibold ${t.is_active ? "" : "text-muted-foreground"}`}>
                    {t.title}
                  </h3>
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {t.daily_hours}h daily · {t.weekly_hours}h weekly
                  {t.deadline ? ` · due ${new Date(t.deadline).toLocaleDateString()}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => toggleM.mutate({ id: t.id, is_active: !t.is_active })}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {t.is_active ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => deleteM.mutate(t.id)}
                  className="text-[10px] text-muted-foreground hover:text-destructive"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {open && (
        <AddTargetSheet
          subjects={subjects.data ?? []}
          busy={createM.isPending}
          onClose={() => setOpen(false)}
          onAdd={(v) => createM.mutate(v)}
        />
      )}
    </>
  );
}

function AddTargetSheet({
  subjects,
  busy,
  onClose,
  onAdd,
}: {
  subjects: { id: string; name: string }[];
  busy: boolean;
  onClose: () => void;
  onAdd: (v: {
    title: string;
    subject_id: string | null;
    daily_hours: number;
    weekly_hours: number;
    deadline: string | null;
  }) => void;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [custom, setCustom] = useState("");
  const [daily, setDaily] = useState("1");
  const [weekly, setWeekly] = useState("7");
  const [deadline, setDeadline] = useState("");

  const title = subjectId ? subjects.find((s) => s.id === subjectId)?.name : custom;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-foreground/25 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-panel p-5">
        <h3 className="text-base font-semibold tracking-tight">New target</h3>
        <div className="mt-4 space-y-3">
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
            <option value="">Custom title</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {!subjectId && (
            <input
              className={inputCls}
              placeholder="target title"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-mono text-[10px] text-muted-foreground uppercase">
                Daily hours
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={daily}
                onChange={(e) => setDaily(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] text-muted-foreground uppercase">
                Weekly hours
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={weekly}
                onChange={(e) => setWeekly(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] text-muted-foreground uppercase">
              Deadline (optional)
            </label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="h-11 flex-1 rounded-xl border border-border text-sm">
              Cancel
            </button>
            <button
              disabled={busy}
              onClick={() =>
                onAdd({
                  title: title || custom || "Study goal",
                  subject_id: subjectId || null,
                  daily_hours: Number(daily) || 0,
                  weekly_hours: Number(weekly) || 0,
                  deadline: deadline || null,
                })
              }
              className="h-11 flex-[2] rounded-xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
            >
              Save target
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
