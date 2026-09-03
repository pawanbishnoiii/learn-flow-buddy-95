import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Icon3D } from "@/components/Icon3D";
import { fetchMyProfile, saveOnboarding, syncIdentityToProfile } from "@/lib/study";
import { AvatarPicker } from "@/components/AvatarPicker";
import { SubjectsManager } from "@/components/SubjectsManager";

export const Route = createFileRoute("/_authenticated/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set up your profile — Chronodeck" },
      {
        name: "description",
        content: "Tell Chronodeck your name, age and average study time so the AI can plan your week.",
      },
      { property: "og:title", content: "Set up your profile — Chronodeck" },
      { property: "og:description", content: "A 30 second setup before your study dashboard opens." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const profile = useQuery({ queryKey: ["profile"], queryFn: syncIdentityToProfile });
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    gender: "",
    age: "",
    phone: "",
    avg_study_hours: "3",
  });

  useEffect(() => {
    if (!profile.data) return;
    if (profile.data.onboarded) {
      navigate({ to: "/today", replace: true });
      return;
    }
    setForm((f) => ({
      ...f,
      first_name: f.first_name || (profile.data?.first_name ?? ""),
      last_name: f.last_name || (profile.data?.last_name ?? ""),
    }));
  }, [profile.data, navigate]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.first_name.trim()) throw new Error("First name is required");
      await saveOnboarding({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        gender: form.gender,
        age: Number(form.age) || 0,
        phone: form.phone.trim(),
        avg_study_hours: Number(form.avg_study_hours) || 0,
      });
    },
    onSuccess: async () => {
      await fetchMyProfile();
      toast.success("Welcome to Chronodeck");
      navigate({ to: "/today", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const field = "h-12 w-full rounded-xl border border-border bg-background px-3 text-sm";

  return (
    <div className="grid-lines min-h-screen px-5 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-panel p-6">
        <div className="flex items-center gap-3">
          {profile.data?.avatar_url ? (
            <img
              src={profile.data.avatar_url}
              alt="Your profile"
              className="size-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <Icon3D name="brain" size={44} priority />
          )}
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.3em] text-brand uppercase">Onboarding</p>
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {profile.data?.display_name ? `Hi ${profile.data.display_name}` : "Tell us about you"}
            </h1>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
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
          Average study time per day · {form.avg_study_hours}h
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

        <div className="mt-6">
          <AvatarPicker avatarUrl={profile.data?.avatar_url} displayName={profile.data?.display_name} />
        </div>

        <div className="mt-4">
          <SubjectsManager
            title="Your subjects"
            subtitle="Jo subjects padhte ho unhe abhi add kar lo — timer aur targets inhi par chalenge."
          />
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="mt-6 h-13 w-full rounded-2xl bg-brand py-4 text-sm font-semibold text-brand-foreground disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : "Finish & open dashboard"}
        </button>
      </div>
    </div>
  );
}
