import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Icon3D } from "@/components/Icon3D";
import {
  DAYS,
  createBlock,
  deleteBlock,
  fetchBlocks,
  fetchSubjects,
  reorderBlocks,
  type Block,
} from "@/lib/study";

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({
    meta: [
      { title: "Timetable — Chronodeck Study OS" },
      {
        name: "description",
        content:
          "Weekly calendar grid to plan reading blocks and online classes, reorder by drag-and-drop and start the study timer.",
      },
      { property: "og:title", content: "Timetable — Chronodeck Study OS" },
      {
        property: "og:description",
        content: "Drag to reorder each day's blocks and start the focus timer straight from your plan.",
      },
    ],
  }),
  component: TimetablePage,
});

const ORDER = [1, 2, 3, 4, 5, 6, 0];

function mins(t: string) {
  const [h = "0", m = "0"] = t.slice(0, 5).split(":");
  return Number(h) * 60 + Number(m);
}

function TimetablePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [day, setDay] = useState<number>(new Date().getDay());
  const [view, setView] = useState<"list" | "calendar">("list");
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<Block[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
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

  const all = blocks.data ?? [];

  useEffect(() => {
    setOrder(all.filter((b) => b.day_of_week === day));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks.data, day]);

  const persistOrder = useMutation({
    mutationFn: (ids: string[]) => reorderBlocks(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

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

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = order.findIndex((b) => b.id === dragId);
    const to = order.findIndex((b) => b.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setOrder(next);
    setDragId(null);
    persistOrder.mutate(next.map((b) => b.id));
  }

  function startBlock(b: Block) {
    navigate({ to: "/study", search: { block: b.id } });
  }

  return (
    <>
      <div className="space-y-6 px-4 py-6 sm:px-5">
        <header className="flex items-center gap-3">
          <Icon3D name="calendar" size={44} priority />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">Timetable</h1>
            <p className="text-xs text-muted-foreground">
              Drag to reorder, tap Start — the timer picks the block's start and end time.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2">
          {(["list", "calendar"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`h-10 rounded-xl border text-xs font-medium capitalize transition-colors ${
                view === v ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground"
              }`}
            >
              {v} view
            </button>
          ))}
        </div>

        {/* week strip */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {ORDER.map((d) => {
            const count = all.filter((b) => b.day_of_week === d).length;
            const active = d === day;
            return (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={`rounded-2xl border p-1.5 text-center transition-colors sm:p-2 ${
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

        {view === "calendar" ? (
          <CalendarWeek blocks={all} onPick={(d) => setDay(d)} onStart={startBlock} />
        ) : (
          <section className="rounded-2xl border border-border bg-panel p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{DAYS[day]} schedule</h2>
              <button
                onClick={() => setOpen(true)}
                className="h-9 shrink-0 rounded-xl bg-brand px-4 text-xs font-semibold text-brand-foreground"
              >
                Add block
              </button>
            </div>

            {order.length ? (
              <ul className="mt-4 space-y-2">
                {order.map((b) => (
                  <li
                    key={b.id}
                    draggable
                    onDragStart={() => setDragId(b.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOn(b.id)}
                    className={`rounded-2xl border p-3 transition-opacity ${
                      dragId === b.id ? "border-brand opacity-50" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="cursor-grab font-mono text-xs text-muted-foreground select-none">⠿</span>
                        <Icon3D name={b.kind === "class" ? "class" : "books"} size={30} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{b.title}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                            {b.location ? ` · ${b.location}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                        <button
                          onClick={() => startBlock(b)}
                          className="h-8 rounded-lg border border-brand/40 px-3 text-[10px] font-semibold text-brand uppercase"
                        >
                          Start
                        </button>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              const i = order.findIndex((x) => x.id === b.id);
                              if (i <= 0) return;
                              const next = [...order];
                              const [m] = next.splice(i, 1);
                              if (!m) return;
                              next.splice(i - 1, 0, m);
                              setOrder(next);
                              persistOrder.mutate(next.map((x) => x.id));
                            }}
                            className="h-8 w-8 rounded-lg border border-border text-[10px] text-muted-foreground"
                            aria-label="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => {
                              const i = order.findIndex((x) => x.id === b.id);
                              if (i < 0 || i >= order.length - 1) return;
                              const next = [...order];
                              const [m] = next.splice(i, 1);
                              if (!m) return;
                              next.splice(i + 1, 0, m);
                              setOrder(next);
                              persistOrder.mutate(next.map((x) => x.id));
                            }}
                            className="h-8 w-8 rounded-lg border border-border text-[10px] text-muted-foreground"
                            aria-label="Move down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => remove.mutate(b.id)}
                            className="h-8 rounded-lg border border-border px-2.5 text-[10px] text-muted-foreground uppercase"
                          >
                            Del
                          </button>
                        </div>
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

            <Link to="/today" className="mt-4 block text-center font-mono text-[10px] text-brand uppercase">
              go to focus timer
            </Link>
          </section>
        )}
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
              className="input mt-1"
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
              className="input mt-1"
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
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">End</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="input mt-1"
                />
              </div>
            </div>

            <label className="mt-4 block text-xs text-muted-foreground">Location / link</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="input mt-1"
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
    </>
  );
}

function CalendarWeek({
  blocks,
  onPick,
  onStart,
}: {
  blocks: Block[];
  onPick: (day: number) => void;
  onStart: (b: Block) => void;
}) {
  const startHour = 6;
  const endHour = 24;
  const span = (endHour - startHour) * 60;

  return (
    <section className="rounded-2xl border border-border bg-panel p-3 sm:p-4">
      <h2 className="text-sm font-semibold">Week calendar</h2>
      <div className="mt-3 overflow-x-auto">
        <div className="flex min-w-[560px] gap-1">
          <div className="w-9 shrink-0">
            <div className="h-6" />
            {Array.from({ length: endHour - startHour }, (_, i) => (
              <div key={i} className="h-8 font-mono text-[9px] text-muted-foreground">
                {String(startHour + i).padStart(2, "0")}
              </div>
            ))}
          </div>
          {ORDER.map((d) => (
            <div key={d} className="min-w-0 flex-1">
              <button
                onClick={() => onPick(d)}
                className="block h-6 w-full font-mono text-[9px] text-muted-foreground uppercase"
              >
                {DAYS[d]}
              </button>
              <div
                className="relative rounded-xl border border-border bg-background/40"
                style={{ height: (endHour - startHour) * 32 }}
              >
                {blocks
                  .filter((b) => b.day_of_week === d)
                  .map((b) => {
                    const top = ((mins(b.start_time) - startHour * 60) / span) * ((endHour - startHour) * 32);
                    const h = Math.max(
                      18,
                      ((mins(b.end_time) - mins(b.start_time)) / span) * ((endHour - startHour) * 32),
                    );
                    return (
                      <button
                        key={b.id}
                        onClick={() => onStart(b)}
                        style={{ top: Math.max(0, top), height: h }}
                        className={`absolute inset-x-0.5 overflow-hidden rounded-lg border px-1 text-left text-[9px] leading-tight ${
                          b.kind === "class"
                            ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                            : "border-brand/40 bg-brand/10 text-brand"
                        }`}
                      >
                        <span className="block truncate font-medium">{b.title}</span>
                        <span className="block truncate font-mono opacity-70">{b.start_time.slice(0, 5)}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Tap a block to start its timer with the planned end time.</p>
    </section>
  );
}
