// One WhatsApp message per phase, written in the employee's own voice.
// Replaces the four stacked, template-looking blocks with a single readable update
// that says: this is what I did, this is what I'll do better.

import type { DynDayRecord } from "@/lib/execution/dyn-store";

export interface PhaseMsgContext {
  name: string;
  role: string;
  zone?: string;
  date: string;      // yyyy-mm-dd
  phaseId: string;   // morning | midday | evening | eod | more
  phaseTitle: string;
  stageIds: string[];
}

type Bag = Record<string, unknown>;

function collect(rec: DynDayRecord | undefined, stageIds: string[]): { bag: Bag; nums: Record<string, number>; lastTs?: number } {
  const bag: Bag = {};
  const nums: Record<string, number> = {};
  let lastTs: number | undefined;
  if (!rec) return { bag, nums, lastTs };
  for (const id of stageIds) {
    const sub = rec.submissions[id];
    if (!sub) continue;
    if (sub.ts && (!lastTs || sub.ts > lastTs)) lastTs = sub.ts;
    for (const [k, v] of Object.entries(sub.values || {})) {
      if (v === undefined || v === null || v === "") continue;
      const n = typeof v === "number" ? v : Number(v);
      if (!isNaN(n) && String(v).trim() !== "" && typeof v !== "boolean" && /^\s*-?\d+(\.\d+)?\s*$/.test(String(v))) {
        nums[k] = (nums[k] || 0) + n;
      } else {
        const prev = bag[k];
        const s = String(v).trim();
        if (!prev) bag[k] = s;
        else if (String(prev) !== s) bag[k] = `${prev}; ${s}`;
      }
      if (bag[k] === undefined && nums[k] !== undefined) bag[k] = nums[k];
    }
  }
  return { bag, nums, lastTs };
}

const txt = (bag: Bag, key: string): string | undefined => {
  const v = bag[key];
  if (v === undefined || v === null || String(v).trim() === "") return undefined;
  return String(v).trim();
};

function fmtDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" });
}
function fmtTime(ts?: number): string {
  return new Date(ts || Date.now()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function line(label: string, value?: string | number): string | null {
  if (value === undefined || value === null || value === "" || value === "—") return null;
  return `${label}: ${value}`;
}

function section(title: string, lines: (string | null)[]): string | null {
  const body = lines.filter(Boolean) as string[];
  if (!body.length) return null;
  return `${title}\n${body.join("\n")}`;
}

/** Compose the single message an employee sends after finishing a phase. */
export function composePhaseMessage(rec: DynDayRecord | undefined, ctx: PhaseMsgContext): string {
  const { bag, nums, lastTs } = collect(rec, ctx.stageIds);
  const who = [ctx.name, ctx.role, ctx.zone].filter(Boolean).join(" · ");
  const header = `*GHARPAYY · ${ctx.phaseTitle.toUpperCase()}*\n${who}\n${fmtDate(ctx.date)} · updated ${fmtTime(lastTs)}`;

  const calls = nums.cold_calls ?? nums.calls;
  const connected = nums.connected_calls ?? nums.connected;
  const toursPlanned = nums.doors_sched ?? nums.tours_sched;
  const toursDone = nums.doors_initiated ?? nums.tours_done;

  const activity = section("What I got done", [
    calls !== undefined ? line("Calls placed", calls) : null,
    connected !== undefined ? line("Calls connected", connected) : null,
    toursPlanned !== undefined ? line("Visits planned", toursPlanned) : null,
    toursDone !== undefined ? line("Visits done", toursDone) : null,
    nums.checks_drafted !== undefined ? line("Prep list drafted", nums.checks_drafted) : null,
    nums.bbd !== undefined ? line("Beds booked", nums.bbd) : null,
    nums.quotations !== undefined ? line("Quotations sent", nums.quotations) : null,
    nums.leads_generated !== undefined ? line("Leads generated", nums.leads_generated) : null,
  ]);

  const blocks: (string | null)[] = [header];

  if (ctx.phaseId === "morning") {
    const priorities = ["mission_1", "mission_2", "mission_3"]
      .map((k) => txt(bag, k))
      .filter(Boolean)
      .map((p, i) => `${i + 1}. ${p}`);
    blocks.push(`I'm on the floor and here is how I'm running today.`);
    if (priorities.length) blocks.push(`My three priorities\n${priorities.join("\n")}`);
    blocks.push(section("Numbers I'm committing to", [
      line("Calls", nums.target_calls ?? bag.target_calls as number),
      line("Visits", nums.target_tours ?? bag.target_tours as number),
      line("Prebookings", nums.target_prebooks ?? bag.target_prebooks as number),
      line("Move-ins", nums.target_moveins ?? bag.target_moveins as number),
      line("Beds booked", nums.bbd),
      line("Quotations", nums.quotations),
    ]));
    blocks.push(section("How I see the day", [
      line("Main goal", txt(bag, "goal")),
      line("Where I could get stuck", txt(bag, "biggest_risk")),
      line("I'll finish by", txt(bag, "expected_finish")),
      line("Energy", txt(bag, "energy")),
    ]));
    blocks.push(activity);
  } else if (ctx.phaseId === "midday") {
    blocks.push(`Halfway mark. Here's my honest read on the first half.`);
    blocks.push(activity);
    blocks.push(section("How it went", [
      line("What worked", txt(bag, "wins")),
      line("What slowed me down", txt(bag, "blockers")),
      line("What I'll do differently after the break", txt(bag, "tomorrow_priority") || txt(bag, "cycle_note")),
      line("Back on the floor by", txt(bag, "expected_finish")),
    ]));
  } else if (ctx.phaseId === "evening") {
    blocks.push(`Second half update, straight from the field.`);
    blocks.push(activity);
    blocks.push(section("How it went", [
      line("What worked", txt(bag, "wins")),
      line("What slowed me down", txt(bag, "blockers")),
      line("My call for the final push", txt(bag, "cycle_note") || txt(bag, "tomorrow_priority")),
    ]));
  } else if (ctx.phaseId === "eod") {
    blocks.push(`Day closed. This is what I delivered and what I own for tomorrow.`);
    blocks.push(activity);
    blocks.push(section("My reflection", [
      line("What I'm proud of", txt(bag, "wins")),
      line("What held me back", txt(bag, "blockers")),
      line("What I learned", txt(bag, "learning")),
      line("Mistake I'm fixing", txt(bag, "mistake")),
      line("My number one for tomorrow", txt(bag, "tomorrow_priority")),
    ]));
  } else {
    blocks.push(`Extra work logged outside the standard flow.`);
    blocks.push(activity);
    blocks.push(section("Notes", [
      line("What worked", txt(bag, "wins")),
      line("What slowed me down", txt(bag, "blockers")),
    ]));
  }

  return blocks.filter(Boolean).join("\n\n");
}

// ---- "message sent" flags, so a phase only closes once the update is shared ----
const SENT_KEY = "gp_phase_sent_v1";

const listeners = new Set<() => void>();
let ver = 0;
const notify = () => { ver++; listeners.forEach((l) => l()); };
export function subscribePhaseSent(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function phaseSentVersion() { return ver; }

function readSent(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(SENT_KEY) || "{}"); } catch { return {}; }
}
const sentKey = (employeeId: string, date: string, phaseId: string) => `${employeeId}|${date}|${phaseId}`;

export function isPhaseSent(employeeId: string, date: string, phaseId: string): boolean {
  return !!readSent()[sentKey(employeeId, date, phaseId)];
}
export function markPhaseSent(employeeId: string, date: string, phaseId: string) {
  const all = readSent();
  all[sentKey(employeeId, date, phaseId)] = Date.now();
  localStorage.setItem(SENT_KEY, JSON.stringify(all));
  notify();
}
export function phaseSentAt(employeeId: string, date: string, phaseId: string): number | undefined {
  return readSent()[sentKey(employeeId, date, phaseId)];
}
