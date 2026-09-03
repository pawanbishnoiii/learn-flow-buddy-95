import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { sendNotification } from "@/lib/notifications.functions";

/** Admin composer: broadcast an in-app notification + Firebase push to every device. */
export function AdminPushPanel() {
  const send = useServerFn(sendNotification);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [actionPath, setActionPath] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      send({
        data: {
          title: title.trim(),
          body: body.trim(),
          ...(actionPath.trim() ? { actionPath: actionPath.trim() } : {}),
        },
      }),
    onSuccess: (r) => {
      setTitle("");
      setBody("");
      setActionPath("");
      toast.success(
        r.pushEnabled
          ? `Sent to ${r.stored} users · ${r.delivered} devices`
          : `Saved for ${r.stored} users (push admin settings me off hai)`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disabled = !title.trim() || !body.trim() || mutation.isPending;

  return (
    <section className="glass-panel p-4 sm:p-5">
      <h2 className="text-sm font-bold tracking-tight">Send notification</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Web aur Android app — dono par jaayega.
      </p>
      <input
        className="input mt-3 rounded-full"
        placeholder="Title"
        maxLength={120}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="mt-2 min-h-20 w-full rounded-3xl border border-border bg-background p-3 text-sm"
        placeholder="Message"
        maxLength={400}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <input
        className="input mt-2 rounded-full"
        placeholder="Open path (optional) e.g. /today"
        value={actionPath}
        onChange={(e) => setActionPath(e.target.value)}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => mutation.mutate()}
        className="mt-3 h-12 w-full rounded-full bg-foreground text-sm font-semibold text-background transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50"
      >
        {mutation.isPending ? "Sending…" : "Send to everyone"}
      </button>
    </section>
  );
}
