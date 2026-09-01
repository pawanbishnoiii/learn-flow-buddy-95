import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DAYS, fetchBlocks, fetchSubjects, createBlock, deleteBlock } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({
    meta: [
      { title: "Timetable — Chronodeck Study OS" },
      {
        name: "description",
        content: "Plan your weekly study blocks and classes. Build a rhythm the AI coach can track.",
      },
      { property: "og:title", content: "Timetable — Chronodeck Study OS" },
      {
        property: "og:description",
        content: "Weekly study blocks and class schedule for focused learning.",
      },
    ],
  }),
  component: TimetablePage,
});

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand/60";

function TimetablePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const blocks = useQuery({ queryKey: ["blocks"], queryFn: fetchBlocks });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });

  const createM = useMutation({
    mutationFn: createBlock,
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries();
      toast.success("Block added.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: deleteBlock,
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Block removed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const byDay = Array.from({ length: 7 }, (_, d) =>
    (blocks.data ?? [])
      .filter((b) => b.day_of_week === d)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  );

  return (
    <AppShell>
      <section className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Timetable</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Weekly blocks the AI uses to compare plan vs reality.
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground"
          >
            Add block
          </button>
        </div>
      </section>

      <section className="mt-5 space-y-4 px-5">
        {byDay.map((list, d) => (
          <div key={d} className="rounded-2xl border border-border bg-panel p-4">
            <h3 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">{DAYS[d]}</h3>
            <div className="mt-3 space-y-2.5">
              {list.length === 0 && (
                <p className="text-xs text-muted-foreground">No blocks scheduled.</p>
              )}
              {list.map((b) => (
                <div key={b.id} className="flex items-center gap-3">
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${b.kind === "class" ? "bg-warm" : "bg-brand"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate">{b.title}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {b.kind === "class" ? "Class" : "Study"}
                      {b.location ? ` · ${b.location}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteM.mutate(b.id)}
                    disabled={deleteM.isPending}
                    className="shrink-0 text-[10px] text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {open && (
        <AddBlockSheet
          subjects={subjects.data ?? []}
          busy={createM.isPending}
          onClose={() => setOpen(false)}
          onAdd={(v) => createM.mutate(v)}
        />
      )}
    </AppShell>
  );
}

function AddBlockSheet({
  subjects,
  busy,
  onClose,
  onAdd,
}: {
  subjects: { id: string; name: string }[];
  busy: boolean;
  onClose: () => void;
  onAdd: (v: {
    subject_id: string | null;
    title: string;
    kind: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    location: string | null;
  }) => void;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [custom, setCustom] = useState("");
  const [kind, setKind] = useState<"reading" | "class">("reading");
  const [day, setDay] = useState(new Date().getDay());
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [location, setLocation] = useState("");

  const subjectName = subjectId ? subjects.find((s) => s.id === subjectId)?.name : custom || "Study";

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-panel p-5">
        <h3 className="text-base font-semibold tracking-tight">Add block</h3>
        <div className="mt-4 space-y-3">
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
          <div className="grid grid-cols-2 gap-2">
            {[
              { k: "reading", label: "Book reading" },
              { k: "class", label: "Online class" },
            ].map(({ k, label }) => (
              <button
                key={k}
                onClick={() => setKind(k as "reading" | "class")}
                className={`h-11 rounded-xl border text-sm font-medium ${
                  kind === k ? "border-brand/60 bg-brand/10 text-brand" : "border-border text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <select value={day} onChange={(e) => setDay(Number(e.target.value))} className={inputCls}>
            {DAYS.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </div>
          <input
            className={inputCls}
            placeholder="location / link (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="h-11 flex-1 rounded-xl border border-border text-sm">
              Cancel
            </button>
            <button
              disabled={busy}
              onClick={() =>
                onAdd({
                  subject_id: subjectId || null,
                  title: subjectName || "Study",
                  kind,
                  day_of_week: day,
                  start_time: `${start}:00`,
                  end_time: `${end}:00`,
                  location: location || null,
                })
              }
              className="h-11 flex-[2] rounded-xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
            >
              Add to timetable
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
