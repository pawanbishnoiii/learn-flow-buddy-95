import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Icon3D } from "@/components/Icon3D";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chronodeck — AI Study OS for focused learners" },
      {
        name: "description",
        content:
          "Focus timer, weekly timetable, targets and an AI coach that reads your real study data and tells you what to do next.",
      },
      { property: "og:title", content: "Chronodeck — AI Study OS" },
      {
        property: "og:description",
        content: "Track study time, plan your week, log breaks and let AI manage your study routine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        gsap.from(".hero-line", { y: 40, opacity: 0, duration: 0.9, stagger: 0.12, ease: "power3.out" });
        gsap.from(".hero-icon", { scale: 0.6, opacity: 0, duration: 1, ease: "back.out(1.7)", delay: 0.2 });
        gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
          gsap.from(el, {
            y: 60,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%" },
          });
        });
        gsap.utils.toArray<HTMLElement>(".float").forEach((el, i) => {
          gsap.to(el, { y: -12, duration: 2 + i * 0.3, repeat: -1, yoyo: true, ease: "sine.inOut" });
        });
      }, root);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div ref={root} className="grid-lines min-h-screen">
      <header className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-brand/10">
            <span className="size-3.5 rounded-[3px] bg-brand" />
          </span>
          <span>
            <span className="block text-sm leading-none font-semibold tracking-tight">Chronodeck</span>
            <span className="mt-1 block font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
              Study OS
            </span>
          </span>
        </div>
        <Link
          to="/auth"
          className="h-9 rounded-xl border border-border px-4 text-sm leading-9 font-medium transition-colors hover:border-brand/50"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5">
        <section className="flex min-h-[80vh] flex-col items-center justify-center text-center">
          <div className="hero-icon float">
            <Icon3D name="clock" size={110} priority />
          </div>
          <p className="hero-line mt-8 font-mono text-[11px] tracking-[0.3em] text-brand uppercase">
            AI-powered study tracker
          </p>
          <h1 className="hero-line mt-4 text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
            Time your study.
            <br />
            Let AI run your routine.
          </h1>
          <p className="hero-line mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Full-screen focus timer, weekly timetable grid, break log, target charts and an AI coach that reads
            your real hours — not your intentions.
          </p>
          <Link
            to="/auth"
            className="hero-line mt-8 inline-flex h-13 items-center justify-center rounded-2xl bg-brand px-9 text-sm font-semibold text-brand-foreground transition-transform hover:scale-[1.03]"
          >
            Start studying free
          </Link>
          <span className="hero-line mt-3 font-mono text-[10px] text-muted-foreground">
            Google sign-in · runs in the background
          </span>
        </section>

        <section className="grid gap-4 py-16 sm:grid-cols-3">
          {[
            { i: "clock" as const, t: "Focus mode", d: "Black screen, HH:MM timer, swipe for pause and stop." },
            { i: "calendar" as const, t: "Weekly grid", d: "Pick each day's subjects, classes and reading blocks." },
            { i: "brain" as const, t: "AI manager", d: "It reads your sessions and tells you what to fix." },
          ].map((f) => (
            <div key={f.t} className="reveal rounded-3xl border border-border bg-panel p-6">
              <div className="float">
                <Icon3D name={f.i} size={48} />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{f.t}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>

        <section className="reveal rounded-3xl border border-brand/25 bg-brand/5 p-8 text-center">
          <Icon3D name="trophy" size={64} className="mx-auto" />
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">Padhne ka mann banega</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Daily motivation, monthly magazine reading picks and streak-style analytics keep the habit alive —
            not just another timer.
          </p>
        </section>

        <section className="grid gap-4 py-16 sm:grid-cols-2">
          {[
            { i: "target" as const, t: "Targets that mean something", d: "Daily and weekly hour goals per subject with deadline tracking and completion rings." },
            { i: "books" as const, t: "Every session logged", d: "Subject, topic, notes and break log saved automatically when you exit focus mode." },
            { i: "break" as const, t: "Break log", d: "Pause, sleep or free time — track the gaps, not just the grind." },
            { i: "magazine" as const, t: "Monthly reading", d: "A fresh magazine recommendation each month to widen your base." },
          ].map((f) => (
            <div key={f.t} className="reveal flex gap-4 rounded-3xl border border-border bg-panel p-6">
              <Icon3D name={f.i} size={44} />
              <div>
                <h3 className="text-sm font-semibold">{f.t}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="reveal flex flex-col items-center py-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Aaj se shuru karo</h2>
          <Link
            to="/auth"
            className="mt-6 inline-flex h-13 items-center justify-center rounded-2xl bg-brand px-9 text-sm font-semibold text-brand-foreground"
          >
            Sign in with Google
          </Link>
        </section>
      </main>

      <footer className="px-5 py-8 text-center font-mono text-[10px] text-muted-foreground">
        © {new Date().getFullYear()} Chronodeck · Built for focused learners
      </footer>
    </div>
  );
}
