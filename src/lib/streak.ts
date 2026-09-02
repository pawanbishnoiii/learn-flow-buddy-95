import { dailyMinutes, type Session } from "@/lib/study";

function key(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Consecutive days (ending today or yesterday) where the daily goal was hit.
 * Presentation-only helper — reads sessions already in the query cache.
 */
export function dailyHitStreak(sessions: Session[], dailyGoalHours: number) {
  if (dailyGoalHours <= 0) return 0;
  const perDay = dailyMinutes(sessions);
  const goal = dailyGoalHours * 60;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // Today not finished yet — allow the streak to start at yesterday.
  if ((perDay[key(cursor)] ?? 0) < goal) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while ((perDay[key(cursor)] ?? 0) >= goal) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
