import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createSubject, deleteSubject, fetchSubjects, type Subject } from "@/lib/study";

export const SUBJECT_COLORS = ["#8B5CF6", "#FACC15", "#A3E635", "#F472B6", "#38BDF8", "#FB923C"];

/**
 * Single place where a user creates and manages their own subjects.
 * Used on Targets, Study and Onboarding — there is no "custom subject" concept.
 */
export function SubjectsManager({
  selectedId,
  onSelect,
  title = "Manage subjects",
  subtitle = "Apne subjects banao — poori app inhi ko use karti hai.",
}: {
  selectedId?: string;
  onSelect?: (s: Subject) => void;
  title?: string;
  subtitle?: string;
}) {
  const qc = useQueryClient();
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]!);
  const [weekly, setWeekly] = useState("5");

  const addM = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Subject ka naam likho");
      return createSubject({
        name: name.trim(),
        color,
        weekly_target_hours: Number(weekly) || 0,
      });
    },
    onSuccess: () => {
      setName("");
      setWeekly("5");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = subjects.data ?? [];

  return (
    <section className="rounded-[28px] border border-border bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-extrabold tracking-tight">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background active:scale-95"
        >
          <Plus className="size-4" />
          Add subject
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3 rounded-2xl border border-border bg-background p-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Subject name (e.g. Physics)"
                className="h-12 w-full rounded-xl border border-border bg-panel px-4 text-sm font-medium outline-none focus:border-brand/60"
              />
              <div className="flex items-center gap-2">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    onClick={() => setColor(c)}
                    style={{ background: c }}
                    className={`grid size-8 place-items-center rounded-full transition-transform ${
                      color === c ? "scale-110 ring-2 ring-foreground/60" : ""
                    }`}
                  >
                    {color === c ? <Check className="size-4 text-white" /> : null}
                  </button>
                ))}
              </div>
              <label className="block text-xs font-medium text-muted-foreground">
                Weekly target · {weekly}h
              </label>
              <input
                type="range"
                min={0}
                max={30}
                step={0.5}
                value={weekly}
                onChange={(e) => setWeekly(e.target.value)}
                className="w-full accent-[var(--brand)]"
              />
              <button
                type="button"
                disabled={addM.isPending}
                onClick={() => addM.mutate()}
                className="h-12 w-full rounded-full bg-brand text-sm font-bold text-brand-foreground disabled:opacity-60"
              >
                {addM.isPending ? "Saving…" : "Save subject"}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-4 flex flex-wrap gap-2">
        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground">Abhi koi subject nahi — pehla subject add karo.</p>
        ) : null}
        {list.map((s) => {
          const active = selectedId === s.id;
          return (
            <span
              key={s.id}
              className={`group flex items-center gap-2 rounded-full border py-2 pr-2 pl-3 text-xs font-semibold transition ${
                active ? "border-transparent bg-foreground text-background" : "border-border bg-background"
              }`}
            >
              <button type="button" onClick={() => onSelect?.(s)} className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                {s.name}
                <span className={active ? "text-background/60" : "text-muted-foreground"}>
                  {s.weekly_target_hours}h
                </span>
              </button>
              <button
                type="button"
                aria-label={`Delete ${s.name}`}
                onClick={() => delM.mutate(s.id)}
                className="rounded-full p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          );
        })}
      </div>
    </section>
  );
}
