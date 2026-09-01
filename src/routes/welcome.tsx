import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Icon3D } from "@/components/Icon3D";
import heroImg from "@/assets/illus-hero.jpg";
import focusImg from "@/assets/illus-focus.jpg";
import aiImg from "@/assets/illus-ai.jpg";

export const Route = createFileRoute("/welcome")({
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

const STATS = [
  { n: 8, suffix: "h", l: "Max session cap" },
  { n: 7, suffix: "d", l: "Weekly grid" },
  { n: 3, suffix: "", l: "Break types" },
  { n: 100, suffix: "%", l: "Your data, private" },
];

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
        // 1 — hero copy stagger
        gsap.from(".hero-line", { y: 44, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out" });

        // 2 — hero art mask reveal
        gsap.from(".hero-art", {
          clipPath: "inset(0% 0% 100% 0%)",
          scale: 1.08,
          duration: 1.2,
          ease: "power4.out",
        });

        // 3 — hero art parallax on scroll
        gsap.to(".hero-art img", {
          yPercent: 14,
          ease: "none",
          scrollTrigger: { trigger: ".hero-art", start: "top top", end: "bottom top", scrub: 0.6 },
        });

        // 4 — scroll progress bar
        gsap.to(".scroll-bar", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.3 },
        });

        // 5 — generic section reveals
        gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
          gsap.from(el, {
            y: 60,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%" },
          });
        });

        // 6 — card grids fly in with 3D tilt
        gsap.utils.toArray<HTMLElement>(".card-grid").forEach((grid) => {
          gsap.from(grid.children, {
            y: 70,
            opacity: 0,
            rotateX: -12,
            transformOrigin: "50% 100%",
            duration: 0.7,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: { trigger: grid, start: "top 85%" },
          });
        });

        // 7 — counting stat numbers
        gsap.utils.toArray<HTMLElement>(".count").forEach((el) => {
          const target = Number(el.dataset["to"] ?? 0);
          const obj = { v: 0 };
          gsap.to(obj, {
            v: target,
            duration: 1.4,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 92%" },
            onUpdate: () => {
              el.textContent = String(Math.round(obj.v));
            },
          });
        });

        // 8 — pinned focus showcase that scales as you scroll through it
        gsap.to(".pin-art", {
          scale: 1.12,
          ease: "none",
          scrollTrigger: { trigger: ".pin-section", start: "top 80%", end: "bottom top", scrub: 0.5 },
        });

        // 9 — infinite marquee
        gsap.to(".marquee-track", { xPercent: -50, duration: 22, repeat: -1, ease: "none" });

        // 10 — floating icons
        gsap.utils.toArray<HTMLElement>(".float").forEach((el, i) => {
          gsap.to(el, { y: -12, duration: 2 + i * 0.3, repeat: -1, yoyo: true, ease: "sine.inOut" });
        });

        // 11 — final CTA pop
        gsap.from(".cta-pop", {
          scale: 0.86,
          opacity: 0,
          duration: 0.8,
          ease: "back.out(1.6)",
          scrollTrigger: { trigger: ".cta-pop", start: "top 90%" },
        });

        // 12 — glow orb drift
        gsap.to(".orb", {
          xPercent: 12,
          yPercent: -10,
          duration: 9,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });

        // 13 — headings blur-in on scroll
        gsap.utils.toArray<HTMLElement>("h2").forEach((el) => {
          gsap.from(el, {
            y: 26,
            opacity: 0,
            filter: "blur(10px)",
            duration: 0.75,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 90%" },
          });
        });

        // 14 — alternating side-slide for feature cards
        gsap.utils.toArray<HTMLElement>(".card-grid").forEach((grid) => {
          gsap.from(grid.children, {
            xPercent: (i) => (i % 2 === 0 ? -6 : 6),
            duration: 0.9,
            ease: "power2.out",
            scrollTrigger: { trigger: grid, start: "top 88%" },
          });
        });

        // 15 — showcase image rotates subtly while scrubbing
        gsap.fromTo(
          ".pin-art",
          { rotate: -1.2 },
          {
            rotate: 1.2,
            ease: "none",
            scrollTrigger: { trigger: ".pin-section", start: "top bottom", end: "bottom top", scrub: 0.8 },
          },
        );

        // 16 — sticky header shrinks after the hero
        gsap.to(".site-head", {
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: "color-mix(in oklab, var(--background) 92%, transparent)",
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top+=120 top", end: "top+=260 top", scrub: 0.4 },
        });

        // 17 — footer fade-up
        gsap.from("footer", {
          opacity: 0,
          y: 24,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: { trigger: "footer", start: "top 98%" },
        });

      }, root);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div ref={root} className="grid-lines min-h-screen overflow-x-hidden">
      <div className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left scale-x-0 bg-brand scroll-bar" />

      <header className="site-head fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-border/50 bg-background/70 px-5 pt-4 pb-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-brand/10">
            <svg viewBox="0 0 24 24" className="size-4 text-brand" fill="none" stroke="currentColor" strokeWidth="2">
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
        </div>
        <Link
          to="/auth"
          className="h-9 rounded-xl border border-border px-4 text-sm leading-9 font-medium transition-colors hover:border-brand/50"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-5 pt-24">
        <section className="relative flex min-h-[88vh] flex-col items-center justify-center text-center">
          <div className="orb pointer-events-none absolute -top-10 left-1/2 -z-10 size-[420px] -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]" />
          <div className="hero-art relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-border">
            <img
              src={heroImg}
              alt="Student studying at night with a glowing focus timer"
              width={1280}
              height={960}
              className="h-[240px] w-full object-cover sm:h-[340px]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
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
          <div className="hero-line mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              to="/auth"
              className="inline-flex h-13 items-center justify-center rounded-2xl bg-brand px-9 text-sm font-semibold text-brand-foreground transition-transform hover:scale-[1.03]"
            >
              Start studying free
            </Link>
            <a
              href="#features"
              className="inline-flex h-13 items-center justify-center rounded-2xl border border-border px-7 text-sm font-medium transition-colors hover:border-brand/50"
            >
              See how it works
            </a>
          </div>
          <span className="hero-line mt-3 font-mono text-[10px] text-muted-foreground">
            Google sign-in · runs in the background
          </span>
        </section>

        <section className="card-grid grid grid-cols-2 gap-3 py-10 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.l} className="rounded-2xl border border-border bg-panel p-4 text-center">
              <p className="font-mono text-2xl leading-none font-semibold text-brand">
                <span className="count" data-to={s.n}>
                  0
                </span>
                {s.suffix}
              </p>
              <p className="mt-2 text-[10px] tracking-wide text-muted-foreground uppercase">{s.l}</p>
            </div>
          ))}
        </section>

        <div className="reveal my-6 overflow-hidden rounded-2xl border border-border bg-panel/60 py-3">
          <div className="marquee-track flex w-max gap-8 font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 gap-8">
                {["focus mode", "weekly grid", "break log", "targets", "ai coach", "analytics", "streaks"].map(
                  (w) => (
                    <span key={w}>{w} ·</span>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>

        <section id="features" className="card-grid grid gap-4 py-16 sm:grid-cols-3">
          {[
            { i: "clock" as const, t: "Focus mode", d: "Black screen, flip-clock timer, swipe for pause and stop." },
            { i: "calendar" as const, t: "Weekly grid", d: "Pick each day's subjects, classes and reading blocks." },
            { i: "brain" as const, t: "AI manager", d: "It reads your sessions and tells you what to fix." },
          ].map((f) => (
            <div
              key={f.t}
              className="rounded-3xl border border-border bg-panel p-6 transition-all hover:-translate-y-1 hover:border-brand/40"
            >
              <div className="float">
                <Icon3D name={f.i} size={48} />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{f.t}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>

        <section className="pin-section reveal overflow-hidden rounded-[28px] border border-border bg-panel">
          <div className="overflow-hidden">
            <img
              src={focusImg}
              alt="Phone running the black-screen focus timer on a night desk"
              loading="lazy"
              width={1280}
              height={960}
              className="pin-art h-[220px] w-full object-cover sm:h-[320px]"
            />
          </div>
          <div className="p-7">
            <p className="font-mono text-[10px] tracking-[0.3em] text-brand uppercase">Built for real life</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Phone rakh, timer chalu</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              One tap enters a black-screen focus mode with a full-screen flip clock. Swipe to pause, sleep or log
              free time. Exit only when you are done — every minute is saved against the subject and topic you
              chose, and a session never runs past 8 hours.
            </p>
          </div>
        </section>

        <section className="card-grid grid gap-4 py-16 sm:grid-cols-2">
          {[
            { i: "target" as const, t: "Targets that mean something", d: "Daily and weekly hour goals per subject with deadline tracking and completion rings." },
            { i: "books" as const, t: "Every session logged", d: "Subject, topic, notes and break log saved automatically when you exit focus mode." },
            { i: "break" as const, t: "Break log", d: "Pause, sleep or free time — track the gaps, not just the grind." },
            { i: "magazine" as const, t: "Monthly reading", d: "A fresh magazine recommendation each month to widen your base." },
          ].map((f) => (
            <div
              key={f.t}
              className="flex gap-4 rounded-3xl border border-border bg-panel p-6 transition-all hover:-translate-y-1 hover:border-brand/40"
            >
              <Icon3D name={f.i} size={44} />
              <div>
                <h3 className="text-sm font-semibold">{f.t}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="reveal grid items-center gap-6 rounded-[28px] border border-brand/25 bg-brand/5 p-7 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] text-brand uppercase">AI study manager</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Padhne ka mann banega</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Daily insight from your real sessions and targets, motivation when you slack, monthly magazine picks
              and streak-style analytics keep the habit alive — not just another timer.
            </p>
          </div>
          <img
            src={aiImg}
            alt="AI coach reading a weekly calendar and study charts"
            loading="lazy"
            width={1280}
            height={960}
            className="h-[190px] w-full rounded-2xl border border-border object-cover"
          />
        </section>

        <section className="cta-pop flex flex-col items-center py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Aaj se shuru karo</h2>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Sign in with Google, add your subjects and timetable, then let the AI coach keep you on track.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex h-13 items-center justify-center rounded-2xl bg-brand px-9 text-sm font-semibold text-brand-foreground transition-transform hover:scale-[1.03]"
          >
            Sign in with Google
          </Link>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 text-center font-mono text-[10px] text-muted-foreground">
        © {new Date().getFullYear()} Chronodeck · Built for focused learners
      </footer>
    </div>
  );
}
