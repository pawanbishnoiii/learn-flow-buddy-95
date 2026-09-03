import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { enablePush, pushCopy } from "@/lib/push";

const DISMISS_KEY = "chronodeck.push-prompt.dismissed";

/**
 * Login ke 4 second baad ek non-blocking sheet jo user ko notifications
 * subscribe karne ke liye kehti hai. Sirf tab dikhti hai jab permission abhi
 * granted nahi hai aur user ne ise dismiss nahi kiya.
 */
export function PushPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, []);

  function close(permanent = false) {
    if (permanent) localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function allow() {
    setBusy(true);
    try {
      const result = await enablePush();
      if (result.status === "registered") {
        toast.success(pushCopy.registered);
        close(true);
      } else {
        toast.error(pushCopy[result.status]);
        close(result.status === "denied" || result.status === "unsupported");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Notifications enable nahi hui");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[70] rounded-[28px] border border-border bg-panel p-5 shadow-2xl"
        >
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => close(true)}
            className="absolute top-4 right-4 text-muted-foreground"
          >
            <X className="size-4" />
          </button>
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
              <Bell className="size-5" />
            </span>
            <div className="min-w-0 pr-6">
              <h3 className="text-sm font-extrabold tracking-tight">Notifications on karo</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Study reminders, session summary aur admin announcements seedha is device par.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => close(false)}
              className="h-11 flex-1 rounded-full border border-border text-xs font-semibold"
            >
              Later
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void allow()}
              className="h-11 flex-[2] rounded-full bg-foreground text-xs font-bold text-background disabled:opacity-60"
            >
              {busy ? "Enabling…" : "Allow notifications"}
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
