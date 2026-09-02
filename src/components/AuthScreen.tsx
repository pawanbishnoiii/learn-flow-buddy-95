import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { GoogleOneTap } from "@/components/GoogleOneTap";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C36.9 40.2 44 35 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}

export function AuthScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const routed = useRef(false);

  useEffect(() => {
    async function route(userId: string | undefined) {
      if (!userId || routed.current) return;
      routed.current = true;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", userId)
        .maybeSingle();
      navigate({ to: profile?.onboarded ? "/today" : "/onboarding", replace: true });
    }

    supabase.auth.getSession().then(({ data }) => void route(data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        routed.current = false;
        return;
      }
      void route(session?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function google() {
    setBusy(true);
    try {
      // Preferred path: Google One Tap card — no page redirect at all.
      const shown = await promptGoogleOneTap();
      if (shown) {
        setBusy(false);
        return;
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed. Try again.");
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarded")
          .eq("id", data.user.id)
          .maybeSingle();
        routed.current = true;
        navigate({ to: profile?.onboarded ? "/today" : "/onboarding", replace: true });
      } else {
        setBusy(false);
      }
    } catch {
      toast.error("Google sign-in failed. Try again.");
      setBusy(false);
    }
  }

  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link bhej diya — apna inbox check karo.");
        setMode("signin");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="grid-lines relative flex min-h-[100svh] flex-col overflow-hidden bg-background px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <GoogleOneTap />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-brand/10 blur-[130px]"
        animate={{ x: [0, 30, -20, 0], y: [0, 24, -12, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 size-[420px] rounded-full bg-warm/[0.07] blur-[140px]"
        animate={{ x: [0, -24, 16, 0], y: [0, -18, 10, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex items-center gap-3"
      >
        <span className="grid size-10 place-items-center rounded-2xl bg-brand/10 ring-1 ring-brand/25">
          <svg viewBox="0 0 24 24" className="size-5 text-brand" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2.5 2M9 2h6" strokeLinecap="round" />
          </svg>
        </span>
        <span>
          <span className="block text-sm leading-none font-semibold tracking-tight">Chronodeck</span>
          <span className="mt-1 block font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
            Study OS
          </span>
        </span>
      </motion.header>

      <main className="flex flex-1 flex-col justify-center py-8">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel mx-auto w-full max-w-sm p-6"
        >
          <p className="font-mono text-[10px] tracking-[0.3em] text-brand uppercase">
            {mode === "signin" ? "Welcome back" : mode === "signup" ? "Get started" : "Password reset"}
          </p>
          <h1 className="mt-2 text-[28px] leading-[1.1] font-semibold tracking-tight">
            {mode === "signin"
              ? "Sign in to your deck"
              : mode === "signup"
                ? "Create your deck"
                : "Reset your password"}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {mode === "forgot"
              ? "Email daalo — hum reset link bhej denge."
              : "Timer, timetable, targets and your AI study manager — all behind one tap."}
          </p>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={google}
            disabled={busy}
            className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] text-sm font-semibold text-brand-foreground transition-opacity disabled:opacity-60"
          >
            <GoogleMark />
            {busy ? "Please wait…" : "Continue with Google"}
          </motion.button>

          <div className="my-5 flex items-center gap-3 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-border" /> or email <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={withEmail} className="space-y-2.5">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="h-12 w-full rounded-xl border border-border bg-secondary px-4 text-sm outline-none transition-colors focus:border-brand/60"
            />
            {mode !== "forgot" ? (
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                className="h-12 w-full rounded-xl border border-border bg-secondary px-4 text-sm outline-none transition-colors focus:border-brand/60"
              />
            ) : null}
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-xl border border-border text-sm font-medium transition-colors hover:border-brand/50 disabled:opacity-60"
            >
              {mode === "signin"
                ? "Sign in with email"
                : mode === "signup"
                  ? "Sign up with email"
                  : "Send reset link"}
            </motion.button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2">
            <AnimatePresence mode="wait">
              <motion.button
                key={mode}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="w-full text-center font-mono text-[11px] text-muted-foreground transition-colors hover:text-brand"
              >
                {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
              </motion.button>
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setMode(mode === "forgot" ? "signin" : "forgot")}
              className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-brand"
            >
              {mode === "forgot" ? "Back to sign in" : "Forgot password?"}
            </button>
          </div>
        </motion.div>
      </main>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-center font-mono text-[10px] text-muted-foreground"
      >
        <Link to="/welcome" className="transition-colors hover:text-brand">
          What is Chronodeck? →
        </Link>
      </motion.footer>
    </div>
  );
}
