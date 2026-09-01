import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Icon3D } from "@/components/Icon3D";
import {
  DAYS,
  createBlock,
  deleteBlock,
  fetchBlocks,
  fetchSubjects,
  startSession,
  type Block,
} from "@/lib/study";

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({
    meta: [
      { title: "Timetable — Chronodeck Study OS" },
      {
        name: "description",
        content: "Weekly grid to plan reading blocks and online classes for every day, linked to the study timer.",
      },
      { property: "og:title", content: "Timetable — Chronodeck Study OS" },
      {
        property: "og:description",
        content: "Pick each day's subjects and blocks and start the focus timer straight from your plan.",
      },
    ],
  }),
  component: TimetablePage,
});

const ORDER = [1, 2, 3, 4, 5, 6, 0];

function TimetablePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [day, setDay] = useState<number>(new Date().getDay());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    subject_id: "",
    title: "",
    kind: "study",
    start_time: "18:00",
    end_time: "19:30",
    location: "",
  });

  const blocks = useQuery({ queryKey: ["blocks"], queryFn: fetchBlocks });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });

  const add = useMutation({
    mutationFn: async () => {
      const subj = (subjects.data ?? []).find((s) => s.id === form.subject_id);
      await createBlock({
        subject_id: subj?.id ?? null,
        title: form.title.trim() || subj?.name || "Study block",
        kind: form.kind,
        day_of_week: day,
        start_time: form.start_time,
        end_time: form.end_time,
        location: form.location.trim() || null,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setForm({ ...form, title: "", location: "" });
      await qc.invalidateQueries({ queryKey: ["blocks"] });
      toast.success("Block added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteBlock,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocks"] }),
  });

  const quickStart = useMutation({
    mutationFn: (b: Block) =>
      startSession({
        subject_id: b.subject_id,
        subject_name: b.title,
        topic: null,
        kind: b.kind === "class" ? "class" : "reading",
      }),
    onSuccess: () => toast.success("Timer started — open Today"),
    onError: (e: Error) => toast.error(e.message),
  });

  const all = blocks.data ?? [];
  const dayBlocks = all.filter((b) => b.day_of_week === day);

  return (
    <AppShell>
      <div className="space-y-6 px-5 py-6">
        <header className="flex items-center gap-3">
          <Icon3D name="calendar" size={44} priority />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Timetable</h1>
            <p className="text-xs text-muted-foreground">Plan every weekday, start the timer from a block.</p>
          </div>
        </header>

        {/* week grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {ORDER.map((d) => {
            const count = all.filter((b) => b.day_of_week === d).length;
            const active = d === day;
            return (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={`rounded-2xl border p-2 text-center transition-colors ${
                  active ? "border-brand bg-brand/10" : "border-border bg-panel"
                }`}
              >
                <span
                  className={`block font-mono text-[9px] uppercase ${active ? "text-brand" : "text-muted-foreground"}`}
                >
                  {DAYS[d]}
                </span>
                <span className="mt-1 block text-sm font-semibold">{count}</span>
              </button>
            );
          })}
        </div>

        <section className="rounded-3xl border border-border bg-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{DAYS[day]} schedule</h2>
            <button
              onClick={() => setOpen(true)}
              className="h-9 rounded-xl bg-brand px-4 text-xs font-semibold text-brand-foreground"
            >
              Add block
            </button>
          </div>

          {dayBlocks.length ? (
            <ul className="mt-4 space-y-2">
              {dayBlocks.map((b) => (
                <li key={b.id} className="rounded-2xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Icon3D name={b.kind === "class" ? "class" : "books"} size={30} />
                      <div>
                        <p className="text-sm font-medium">{b.title}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                          {b.location ? ` · ${b.location}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate({ to: "/study", search: { block: b.id } })}
                        className="h-8 rounded-lg border border-brand/40 px-3 text-[10px] font-semibold text-brand uppercase"
                      >
                        Start
                      </button>
                      <button
                        onClick={() => remove.mutate(b.id)}
                        className="h-8 rounded-lg border border-border px-3 text-[10px] text-muted-foreground uppercase"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              Nothing planned for {DAYS[day]}. Add a reading block or online class.
            </p>
          )}

          <Link
            to="/today"
            className="mt-4 block text-center font-mono text-[10px] text-brand uppercase"
          >
            go to focus timer
          </Link>
        </section>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-panel p-5 pb-8"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <h3 className="text-sm font-semibold">New block · {DAYS[day]}</h3>

            <label className="mt-4 block text-xs text-muted-foreground">Subject</label>
            <select
              value={form.subject_id}
              onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
              className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="">No subject</option>
              {(subjects.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-xs text-muted-foreground">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Physics revision"
              className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { k: "study", l: "Reading" },
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

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-muted-foreground">Start</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">End</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                />
              </div>
            </div>

            <label className="mt-4 block text-xs text-muted-foreground">Location / link</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            />

            <button
              onClick={() => add.mutate()}
              disabled={add.isPending}
              className="mt-5 h-12 w-full rounded-2xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
            >
              {add.isPending ? "Saving…" : "Add to timetable"}
            </button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
