import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SDK_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID = import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string | undefined;

declare global {
  interface Window {
    google?: any;
  }
}

function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") return reject(new Error("no document"));
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gsi failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gsi failed"));
    document.head.appendChild(s);
  });
}

/**
 * Google One Tap — no full-page redirect.
 * Shows the native One Tap prompt (top-right) for signed-out visitors and
 * exchanges the returned Google JWT for a Supabase session in the background.
 * Silently does nothing when VITE_GOOGLE_CLIENT_ID is not configured.
 */
export function GoogleOneTap({ onSignedIn }: { onSignedIn?: () => void }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !CLIENT_ID) return;
    started.current = true;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session || cancelled) return;
        await loadSdk();
        if (cancelled || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,
          callback: async (response: { credential?: string }) => {
            if (!response?.credential) return;
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: response.credential,
            });
            if (error) {
              toast.error("Google sign-in failed. Try the button below.");
              return;
            }
            onSignedIn?.();
          },
        });

        // Prompt failures (dismissed, unsupported, cooldown) must never break the UI.
        window.google.accounts.id.prompt();
      } catch {
        /* One Tap unavailable — the regular Google button still works. */
      }
    })();

    return () => {
      cancelled = true;
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* noop */
      }
    };
  }, [onSignedIn]);

  return null;
}
