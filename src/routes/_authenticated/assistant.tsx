import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { askStudyAi, getDailyInsight } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — Chronodeck Study OS" },
      {
        name: "description",
        content: "Ask your AI study manager about schedule balance, targets and next steps.",
      },
      { property: "og:title", content: "AI Assistant — Chronodeck Study OS" },
      {
        property: "og:description",
        content: "AI study coach that reads your timetable, targets and sessions.",
      },
    ],
  }),
  component: AssistantPage,
});

type ChatMessage = { role: "user" | "assistant"; content: string };

function AssistantPage() {
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const insight = useQuery({
    queryKey: ["insight"],
    queryFn: () => getDailyInsight(),
    staleTime: 15 * 60_000,
    retry: false,
  });

  const chat = useQuery({
    queryKey: ["ai_chat"],
    queryFn: async () => {
      const { reply } = await askStudyAi({ message: "Give me a quick study tip based on my data." });
      return [{ role: "assistant" as const, content: reply }] as ChatMessage[];
    },
    staleTime: Infinity,
    retry: false,
  });

  const sendM = useMutation({
    mutationFn: async (message: string) => {
      const { reply } = await askStudyAi({ message });
      return reply;
    },
    onMutate: (message) => {
      const prev = chat.data ?? [];
      qc.setQueryData(["ai_chat"], [...prev, { role: "user" as const, content: message }]);
      return { prev };
    },
    onSuccess: (reply, message, context) => {
      qc.setQueryData(["ai_chat"], [...(context?.prev ?? []), { role: "user", content: message }, { role: "assistant", content: reply }]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.data, sendM.isPending]);

  const messages = chat.data ?? [];

  return (
    <AppShell>
      <section className="px-5 pt-6">
        <h1 className="text-xl font-semibold tracking-tight">AI Study Manager</h1>
        <p className="mt-1 text-xs text-muted-foreground">Ask about your schedule, targets or what to study next.</p>
      </section>

      <section className="mt-4 px-5">
        <div className="rounded-2xl border border-brand/20 bg-brand/8 p-4">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-brand/15 font-mono text-[10px] text-brand">
              AI
            </span>
            <p className="text-xs font-semibold text-brand">Daily insight</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-foreground/70">
            {insight.isLoading
              ? "Reading your study data…"
              : (insight.data?.insight ?? "Log a session and I'll start coaching your schedule.")}
          </p>
        </div>
      </section>

      <section className="mt-4 flex-1 px-5 pb-24">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-brand text-brand-foreground"
                  : "bg-panel text-foreground"
              }`}
            >
              {m.content}
            </div>
          ))}
          {sendM.isPending && (
            <div className="w-fit rounded-2xl bg-panel px-4 py-3 text-sm text-muted-foreground">
              <span className="inline-block size-2 animate-pulse rounded-full bg-brand" />
              <span className="ml-2 text-xs">thinking…</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </section>

      <div className="fixed bottom-20 left-0 right-0 px-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            sendM.mutate(input.trim());
            setInput("");
          }}
          className="flex items-center gap-2 rounded-2xl border border-border bg-panel p-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your study plan…"
            className="h-11 flex-1 rounded-xl bg-transparent px-3 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={sendM.isPending || !input.trim()}
            className="h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </div>
    </AppShell>
  );
}
