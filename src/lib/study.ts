import { supabase } from "@/integrations/supabase/client";

export type Subject = {
  id: string;
  name: string;
  color: string;
  weekly_target_hours: number;
};

export type Session = {
  id: string;
  subject_id: string | null;
  subject_name: string | null;
  topic: string | null;
  notes: string | null;
  kind: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  is_running: boolean;
  auto_closed: boolean;
};

export type Block = {
  id: string;
  subject_id: string | null;
  title: string;
  kind: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string | null;
};

export type Target = {
  id: string;
  subject_id: string | null;
  title: string;
  daily_hours: number;
  weekly_hours: number;
  deadline: string | null;
  is_active: boolean;
};

export type Settings = {
  user_id: string;
  auto_stop_hours: number;
  daily_goal_hours: number;
  weekly_goal_hours: number;
  ai_tone: string;
  ai_autopilot: boolean;
  week_starts_monday: boolean;
};

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // monday-first
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function fmtDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

export function fmtHours(minutes: number) {
  return (minutes / 60).toFixed(1);
}

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export async function fetchSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("id,name,color,weekly_target_hours")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Subject[];
}

export async function createSubject(input: {
  name: string;
  color: string;
  weekly_target_hours: number;
}) {
  const user_id = await uid();
  const { error } = await supabase.from("subjects").insert({ ...input, user_id });
  if (error) throw error;
}

export async function deleteSubject(id: string) {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchRunningSession(): Promise<Session | null> {
  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("is_running", true)
    .maybeSingle();
  if (error) throw error;
  return (data as Session) ?? null;
}

export async function fetchSessions(sinceIso?: string): Promise<Session[]> {
  let q = supabase
    .from("study_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(200);
  if (sinceIso) q = q.gte("started_at", sinceIso);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Session[];
}

export async function startSession(input: {
  subject_id: string | null;
  subject_name: string | null;
  topic: string | null;
  kind: string;
}) {
  const user_id = await uid();
  const { error } = await supabase.from("study_sessions").insert({
    ...input,
    user_id,
    is_running: true,
    started_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function stopSession(
  id: string,
  startedAt: string,
  patch: { subject_id: string | null; subject_name: string | null; topic: string; notes: string; kind: string },
) {
  const ended = new Date();
  const minutes = Math.max(
    1,
    Math.round((ended.getTime() - new Date(startedAt).getTime()) / 60000),
  );
  const { error } = await supabase
    .from("study_sessions")
    .update({
      ...patch,
      is_running: false,
      ended_at: ended.toISOString(),
      duration_minutes: minutes,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function discardSession(id: string) {
  const { error } = await supabase.from("study_sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchBlocks(): Promise<Block[]> {
  const { data, error } = await supabase
    .from("timetable_blocks")
    .select("*")
    .order("day_of_week")
    .order("start_time");
  if (error) throw error;
  return (data ?? []) as Block[];
}

export async function createBlock(input: Omit<Block, "id">) {
  const user_id = await uid();
  const { error } = await supabase.from("timetable_blocks").insert({ ...input, user_id });
  if (error) throw error;
}

export async function deleteBlock(id: string) {
  const { error } = await supabase.from("timetable_blocks").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTargets(): Promise<Target[]> {
  const { data, error } = await supabase
    .from("targets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Target[];
}

export async function createTarget(input: {
  title: string;
  subject_id: string | null;
  daily_hours: number;
  weekly_hours: number;
  deadline: string | null;
}) {
  const user_id = await uid();
  const { error } = await supabase.from("targets").insert({ ...input, user_id });
  if (error) throw error;
}

export async function toggleTarget(id: string, is_active: boolean) {
  const { error } = await supabase.from("targets").update({ is_active }).eq("id", id);
  if (error) throw error;
}

export async function deleteTarget(id: string) {
  const { error } = await supabase.from("targets").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchSettings(): Promise<Settings> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user_id)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as Settings;
  const { data: created, error: insErr } = await supabase
    .from("user_settings")
    .insert({ user_id })
    .select("*")
    .single();
  if (insErr) throw insErr;
  return created as Settings;
}

export async function saveSettings(patch: Partial<Settings>) {
  const user_id = await uid();
  const { error } = await supabase
    .from("user_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", user_id);
  if (error) throw error;
}

export async function fetchProfile() {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url,timezone")
    .eq("id", user_id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(patch: { display_name?: string; timezone?: string }) {
  const user_id = await uid();
  const { error } = await supabase.from("profiles").upsert({ id: user_id, ...patch });
  if (error) throw error;
}

/** minutes grouped per weekday index (0=Sun) for the current week */
export function weeklyLoad(sessions: Session[]) {
  const start = startOfWeek();
  const buckets = new Array(7).fill(0) as number[];
  for (const s of sessions) {
    if (s.is_running || !s.duration_minutes) continue;
    const d = new Date(s.started_at);
    if (d < start) continue;
    buckets[d.getDay()] = (buckets[d.getDay()] ?? 0) + s.duration_minutes;
  }
  return buckets;
}

export function minutesInRange(sessions: Session[], since: Date, kind?: string) {
  return sessions.reduce((acc, s) => {
    if (s.is_running || !s.duration_minutes) return acc;
    if (kind && s.kind !== kind) return acc;
    return new Date(s.started_at) >= since ? acc + s.duration_minutes : acc;
  }, 0);
}
