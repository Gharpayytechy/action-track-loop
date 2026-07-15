// Idempotent boot — seeds every store and runs once per page load.
import { ensureDemoSeed } from "./attendance-store";
import { ensureNotifSeed } from "./notification-store";
import { ensureKudosSeed } from "./kudos-store";
import { ensureTaskSeed } from "./task-store";
import { ensureLeaveSeed } from "./leave-store";
import { ensureCalSeed } from "./calendar-store";
import { ensureOneOnOneSeed } from "./oneonone-store";
import { ensureRecruitingSeed } from "./recruiting-store";
import { ensureConsoleSeed } from "./console-store";
import { ensureXPSeed, awardXP, xpFor } from "./xp-engine";
import { ensureCoinsSeed, awardCoins, coinsFor } from "./coins";
import { ensureQuestSeed } from "./quests-store";
import { ensureDynSeed } from "./execution/dyn-seed";
import { EMPLOYEES } from "@/data/seed";

let booted = false;

export function bootArena() {
  if (booted) return;
  if (typeof window === "undefined") return;
  booted = true;
  ensureDemoSeed();
  ensureNotifSeed();
  ensureKudosSeed();
  ensureTaskSeed();
  ensureLeaveSeed();
  ensureCalSeed();
  ensureOneOnOneSeed();
  ensureRecruitingSeed();
  ensureConsoleSeed();
  ensureXPSeed();
  ensureCoinsSeed();
  ensureQuestSeed();
  ensureDynSeed();

  // Seed XP/coins so the leaderboard isn't empty on first visit.
  for (const emp of EMPLOYEES) {
    if (xpFor(emp.id) === 0) {
      const base = Math.round((emp.performance + emp.consistency) * 8 + emp.streakDays * 30);
      awardXP(emp.id, "PERFECT_ATTENDANCE", { amount: base, note: "Season carry-over" });
    }
    if (coinsFor(emp.id) === 0) {
      awardCoins(emp.id, Math.round(emp.streakDays * 25 + emp.performance * 4), "Season carry-over");
    }
  }
}

