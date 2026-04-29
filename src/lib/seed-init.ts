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
}
