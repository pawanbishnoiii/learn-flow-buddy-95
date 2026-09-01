import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchProfile, fetchSettings, fetchSubjects, saveProfile, saveSettings, type Settings } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Chronodeck Study OS" },
      {
        name: "description",
        content: "Configure study goals, AI coach tone, auto-stop timer and weekly start day.",
      },
      { property: "og:title", content: "Settings — Chronodeck Study OS" },
      {
        property: "og:description",
        content: "Personalize your study goals, AI tone and timer preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand/60";

function SettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const profile = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });

  const [draft, setDraft] = useState<Partial<Settings>>({});
  const [name, setName] = useState("");

  useEffect(() => {
    if (settings.data) setDraft(settings.data);
  }, [settings.data]);

  useEffect(() => {
    if (profile.data?.display_name) setName(profile.data.display_name);
  }, [profile.data]);

  const saveM = useMutation({
    mutationFn: async () => {
      await saveSettings({
        daily_goal_hours: Number(draft.daily_goal_hours ?? 4),
        weekly_goal_hours: Number(draft.weekly_goal_hours ?? 20),
        auto_stop_hours: Number(draft.auto_stop_hours ?? 6),
        ai_tone: draft.ai_tone ?? "coach",
        ai_autopilot: Boolean(draft.ai_autopilot),
        week_starts_monday: Boolean(draft.week_starts_monday),
      });
      if (name.trim()) await saveProfile({ display_name: name.trim() });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Settings saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <section className="px-5 pt-6">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-xs text-muted-foreground">Tune goals, AI tone and timer behaviour.</p>
      </section>

      <section className="mt-5 space-y-4 px-5">
        <div className="rounded-2xl border border-border bg-panel p-4">
          <h3 className="text-sm font-semibold tracking-tight">Profile</h3>
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block font-mono text-[10px] text-muted-foreground uppercase">Display name</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4">
          <h3 className="text-sm font-semibold tracking-tight">Goals</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-mono text-[10px] text-muted-foreground uppercase">Daily hours</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={draft.daily_goal_hours ?? 4}
                onChange={(e) => setDraft({ ...draft, daily_goal_hours: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] text-muted-foreground uppercase">Weekly hours</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={draft.weekly_goal_hours ?? 20}
                onChange={(e) => setDraft({ ...draft, weekly_goal_hours: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4">
          <h3 className="text-sm font-semibold tracking-tight">Timer</h3>
          <div className="mt-3">
            <label className="mb-1 block font-mono text-[10px] text-muted-foreground uppercase">
              Auto-stop after (hours)
            </label>
            <input
              type="number"
              min={1}
              max={24}
              step={1}
              value={draft.auto_stop_hours ?? 6}
              onChange={(e) => setDraft({ ...draft, auto_stop_hours: Number(e.target.value) })}
              className={inputCls}
            />
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Background job closes any session left running past this limit.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4">
          <h3 className="text-sm font-semibold tracking-tight">AI coach</h3>
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block font-mono text-[10px] text-muted-foreground uppercase">Tone</label>
              <select
                value={draft.ai_tone ?? "coach"}
                onChange={(e) => setDraft({ ...draft, ai_tone: e.target.value })}
                className={inputCls}
              >
                <option value="coach">Focused coach</option>
                <option value="friend">Supportive friend</option>
                <option value="strict">Strict mentor</option>
                <option value="teacher">Patient teacher</option>
              </select>
            </div>
            <label className="flex items-center justify-between">
              <span className="text-sm">Week starts Monday</span>
              <input
                type="checkbox"
                checked={Boolean(draft.week_starts_monday)}
                onChange={(e) => setDraft({ ...draft, week_starts_monday: e.target.checked })}
                className="size-5 accent-brand"
              />
            </label>
          </div>
        </div>

        <button
          disabled={saveM.isPending}
          onClick={() => saveM.mutate()}
          className="h-12 w-full rounded-xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
        >
          Save settings
        </button>
      </section>
    </>
  );
}
