import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chronodeck — AI Study OS" },
      {
        name: "description",
        content: "Track study time, build your timetable, set targets and let AI coach your schedule.",
      },
      { property: "og:title", content: "Chronodeck — AI Study OS" },
      {
        property: "og:description",
        content: "Personal study timer, timetable and AI manager for serious learners.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="grid-lines flex min-h-screen flex-col">
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
          className="h-9 rounded-xl border border-border px-4 text-sm font-medium leading-9 transition-colors hover:border-brand/50"
        >
          Sign in
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <div className="max-w-xl">
          <p className="font-mono text-[11px] tracking-[0.25em] text-brand uppercase">AI-powered study tracker</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Time your study. Build your timetable. Let AI coach your day.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Chronodeck runs a live study timer in the background, saves every session with subject and topic, and uses
            an AI manager to compare your real hours against targets and timetable.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/auth"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-8 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
            >
              Start studying
            </Link>
            <span className="font-mono text-[10px] text-muted-foreground">Google sign-in · free to use</span>
          </div>
        </div>

        <div className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { n: "01", t: "Live timer", d: "Start a session and it keeps running even if you close the app." },
            { n: "02", t: "Timetable", d: "Schedule reading blocks and online classes for every weekday." },
            { n: "03", t: "AI coach", d: "Ask the AI why you're behind and what to focus on next." },
          ].map((f) => (
            <div key={f.n} className="rounded-2xl border border-border bg-panel p-5 text-left">
              <span className="font-mono text-[10px] text-brand">{f.n}</span>
              <h3 className="mt-2 text-sm font-semibold">{f.t}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-5 py-5 text-center font-mono text-[10px] text-muted-foreground">
        © {new Date().getFullYear()} Chronodeck · Built for focused learners
      </footer>
    </div>
  );
}
