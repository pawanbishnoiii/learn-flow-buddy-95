import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Icon3D } from "@/components/Icon3D";
import { AvatarPicker } from "@/components/AvatarPicker";
import { PushToggle } from "@/components/PushToggle";
import {
  fetchSessions,
  fmtHM,
  isAdmin,
  minutesInRange,
  saveOnboarding,
  startOfWeek,
  syncIdentityToProfile,
} from "@/lib/study";

export const Route = createFileRoute("/_authenticated/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Profile — Chronodeck Study OS" },
      {
        name: "description",
        content: "Your Chronodeck profile: Google identity, personal details and lifetime study stats.",
      },
      { property: "og:title", content: "Profile — Chronodeck Study OS" },
      { property: "og:description", content: "Manage your details and see your study record." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: syncIdentityToProfile });
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: isAdmin });
  const sessions = useQuery({ queryKey: ["sessions", "all"], queryFn: () => fetchSessions() });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    gender: "",
    age: "",
    phone: "",
    avg_study_hours: "3",
  });

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setForm({
      first_name: p.first_name ?? "",
      last_name: p.last_name ?? "",
      gender: p.gender ?? "",
      age: p.age ? String(p.age) : "",
      phone: p.phone ?? "",
      avg_study_hours: String(p.avg_study_hours ?? 3),
    });
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () =>
      saveOnboarding({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        gender: form.gender,
        age: Number(form.age) || 0,
        phone: form.phone.trim(),
        avg_study_hours: Number(form.avg_study_hours) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = sessions.data ?? [];
  const total = all.reduce((a, s) => a + (s.duration_minutes ?? 0), 0);
  const week = minutesInRange(all, startOfWeek());
  const field = "h-12 w-full rounded-xl border border-border bg-background px-3 text-sm";

  return (
    <>
      <div className="space-y-6 px-5 py-6">
        <section className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border bg-panel p-5 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {profile.data?.avatar_url ? (
              <img
                src={profile.data.avatar_url}
                alt={`${profile.data.display_name ?? "Your"} avatar`}
                className="size-14 shrink-0 rounded-full object-cover outline-1 outline-border"
              />
            ) : (
              <Icon3D name="brain" size={52} priority />
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {profile.data?.display_name ?? "Your profile"}
              </h1>
              <p className="truncate font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                {admin.data ? "admin" : "student"}
              </p>
            </div>
          </div>
          {admin.data ? (
            <Link
              to="/admin"
              className="shrink-0 rounded-xl border border-brand/40 px-3 py-2 font-mono text-[10px] text-brand uppercase"
            >
              Admin
            </Link>
          ) : null}
        </section>

        <AvatarPicker
          avatarUrl={profile.data?.avatar_url}
          displayName={profile.data?.display_name}
        />

        <PushToggle />

        <section className="grid grid-cols-3 gap-3">
          {[
            { l: "Lifetime", v: fmtHM(total) },
            { l: "This week", v: fmtHM(week) },
            { l: "Sessions", v: String(all.filter((s) => !s.is_running).length) },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-border bg-panel p-4">
              <p className="font-mono text-lg leading-none font-semibold">{s.v}</p>
              <p className="mt-1 text-[10px] tracking-wide text-muted-foreground uppercase">{s.l}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-panel p-5">
          <h2 className="text-sm font-semibold">Personal details</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <input
              className={field}
              placeholder="First name"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
            <input
              className={field}
              placeholder="Last name"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
          </div>
          <select
            className={`${field} mt-2`}
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
          >
            <option value="">Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              className={field}
              inputMode="numeric"
              placeholder="Age"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
            />
            <input
              className={field}
              inputMode="tel"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <label className="mt-4 block text-xs text-muted-foreground">
            Average study time · {form.avg_study_hours}h/day
          </label>
          <input
            type="range"
            min={1}
            max={14}
            step={0.5}
            value={form.avg_study_hours}
            onChange={(e) => setForm({ ...form, avg_study_hours: e.target.value })}
            className="mt-2 w-full accent-[var(--brand)]"
          />
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="mt-5 h-12 w-full rounded-2xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            {save.isPending ? "Saving…" : "Save profile"}
          </button>
        </section>
      </div>
    </>
  );
}
