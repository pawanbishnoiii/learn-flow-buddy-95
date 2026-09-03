import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { GoogleOneTap, promptGoogleOneTap } from "@/components/GoogleOneTap";
import teacher from "@/assets/auth-teacher.png";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
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

const float = (delay: number) => ({
  animate: { y: [0, -10, 0] },
  transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const, delay },
});

export function AuthScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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

  const inputCls =
    "h-14 w-full rounded-2xl bg-[#F4F2FB] px-5 text-[15px] font-medium text-[#111827] placeholder:text-[#9CA3AF] outline-none ring-1 ring-transparent transition focus:ring-2 focus:ring-[#8B5CF6]/40";

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-gradient-to-b from-[#E4DDFB] via-[#DCD6F7] to-[#CFC7F3]">
      <GoogleOneTap />

      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -left-20 size-64 rounded-full bg-white/40 blur-2xl" />
      <div className="pointer-events-none absolute top-24 -right-16 size-56 rounded-full bg-[#FACC15]/25 blur-2xl" />

      <header className="relative z-10 flex items-center justify-between px-6 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#111827] text-white shadow-lg shadow-[#8B5CF6]/25">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 2M9 2h6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-[19px] leading-none font-extrabold tracking-tight text-[#111827]">Chronodeck</span>
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="grid size-11 place-items-center rounded-full border border-white/70 bg-white/60 text-[#111827] backdrop-blur"
        >
          <Bell className="size-5" />
        </button>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6">
        <motion.img
          src={teacher}
          alt="3D illustration of a teacher beside a whiteboard with books"
          width={1024}
          height={1024}
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-h-[38svh] w-auto object-contain drop-shadow-[0_24px_40px_rgba(80,50,160,0.28)]"
        />
        <motion.span
          {...float(0.2)}
          className="absolute top-4 left-7 size-3 rounded-full bg-[#F472B6] shadow-lg"
          aria-hidden
        />
        <motion.span
          {...float(0.8)}
          className="absolute right-8 bottom-10 size-4 rounded-full bg-[#A3E635] shadow-lg"
          aria-hidden
        />
        <motion.span
          {...float(1.4)}
          className="absolute top-14 right-14 size-2.5 rounded-full bg-[#FACC15] shadow-lg"
          aria-hidden
        />
      </div>

      <motion.section
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="relative z-10 mt-auto rounded-t-[40px] bg-white px-6 pt-7 pb-[calc(1.75rem+env(safe-area-inset-bottom))] shadow-[0_-20px_50px_rgba(76,45,140,0.18)]"
      >
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#E5E7EB]" />

        <h1 className="text-[26px] leading-[1.15] font-extrabold tracking-tight text-[#111827]">
          {mode === "signin" ? "Welcome back 👋" : mode === "signup" ? "Create your deck" : "Reset password"}
        </h1>
        <p className="mt-1.5 text-sm font-medium text-[#6B7280]">
          {mode === "forgot"
            ? "Email daalo — hum reset link bhej denge."
            : "Timer, timetable, targets aur AI study manager — ek tap mein."}
        </p>

        <button
          onClick={google}
          disabled={busy}
          className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-full border border-[#E5E7EB] bg-white text-[15px] font-bold text-[#111827] shadow-sm transition active:scale-[0.98] disabled:opacity-60"
        >
          <GoogleMark />
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-[11px] font-bold tracking-widest text-[#9CA3AF] uppercase">
          <span className="h-px flex-1 bg-[#EEF0F4]" /> or <span className="h-px flex-1 bg-[#EEF0F4]" />
        </div>

        <form onSubmit={withEmail} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className={inputCls}
          />
          {mode !== "forgot" ? (
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`${inputCls} pr-14`}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute top-1/2 right-4 -translate-y-1/2 text-[#9CA3AF]"
              >
                {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          ) : null}

          {mode !== "forgot" ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-[13px] font-semibold text-[#8B5CF6]"
              >
                Forgot password?
              </button>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="flex h-15 w-full items-center justify-center gap-2 rounded-full bg-[#111827] py-4 text-[15px] font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "signin" ? "Sign in with Email" : mode === "signup" ? "Sign up with Email" : "Send reset link"}
          </button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-1">
          <AnimatePresence mode="wait">
            <motion.button
              key={mode}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-[13px] font-semibold text-[#6B7280]"
            >
              {mode === "signin" ? (
                <>
                  No account? <span className="text-[#8B5CF6]">Create one</span>
                </>
              ) : (
                <>
                  Already have an account? <span className="text-[#8B5CF6]">Sign in</span>
                </>
              )}
            </motion.button>
          </AnimatePresence>
          <Link to="/welcome" className="text-[12px] font-medium text-[#9CA3AF]">
            What is Chronodeck? →
          </Link>
        </div>
      </motion.section>
    </div>
  );
}
