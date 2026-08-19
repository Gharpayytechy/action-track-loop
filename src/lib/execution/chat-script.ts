// The day as a conversation, not a form.
// One script = an ordered list of "beats". Each beat is either something
// Impact (the coach) says, or one single thing it asks for. Nothing is ever
// shown all at once — the ImpactChat renderer walks this list one beat at a
// time, exactly like a real WhatsApp thread.

import type { CoreRole } from "@/lib/execution/core-roles";
import { targetAt } from "@/lib/execution/core-roles";
import type { FlowPhase, PhaseId } from "@/lib/execution/core-tasks";
import { selfieMomentsFor } from "@/lib/execution/phase-selfies";

export type Beat =
  | { k: "divider"; id: string; text: string }
  | { k: "say"; id: string; text: string; quote?: string; emoji?: string }
  | { k: "step"; id: string; phase: PhaseId; stepId: string; text: string; detail?: string; evidence?: string; yes: string; no: string }
  | { k: "selfie"; id: string; phase: PhaseId; momentId: string; title: string; text: string; why: string }
  | { k: "count"; id: string; phase: PhaseId; metric: string; label: string; target: number; text: string }
  | { k: "field"; id: string; phase: PhaseId; fieldId: string; label: string; kind: "number" | "text" | "long"; placeholder?: string; required: boolean; text: string }
  | { k: "close"; id: string; phase: PhaseId; codename: string; text: string }
  | { k: "wrap"; id: string };

export const QUOTES = [
  "“You do not rise to the level of your goals. You fall to the level of your systems.” — James Clear",
  "“Amateurs sit and wait for inspiration. The rest of us just get up and go to work.” — Chuck Close",
  "“Discipline is choosing between what you want now and what you want most.” — Abraham Lincoln",
  "“The score takes care of itself.” — Bill Walsh",
  "“What gets measured, gets managed.” — Peter Drucker",
  "“Small deeds done are better than great deeds planned.” — Peter Marshall",
  "“Pressure is a privilege.” — Billie Jean King",
  "“Done is better than perfect, and honest is better than done.” — the floor",
];

// Warm, human acknowledgements. Picked deterministically per beat so a replay
// of the same day reads identically.
export const ACKS = [
  "Love it. 🙌",
  "That's the way. 💪",
  "Noted, champion. ✅",
  "Beautiful. Moving on. 😄",
  "Got it — logged. 📝",
  "Clean work. 👏",
  "Yes! Keep that rhythm. 🔥",
  "Perfect, that's on the record. 🧾",
  "Nice. One less thing on your plate. 😌",
  "Solid. I'm right here. 🤝",
];

export const SOFT_ACKS = [
  "No stress — we'll come back to it. 🙂",
  "That's okay. Honesty beats a fake tick. 🤎",
  "Fine. Let's keep moving and pick it up later. 👍",
  "Understood. I'll keep it on the list. 📌",
];

export function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

const PHASE_OPENER: Record<PhaseId, (r: CoreRole) => string[]> = {
  prep: (r) => [
    `Before anything else, let's lock the day. Five small things and you're set. Nothing here takes more than a minute. 🙂`,
    `You own one final result: *${r.finalResult}*. Everything we do today points there.`,
  ],
  p1: () => [
    `Okay — first real block. This is the one that sets the pace for everything after lunch. ⚡`,
    `I'll ask you one thing at a time. Just answer as you go, don't save it up for later.`,
  ],
  p2: () => [
    `Second block. Whatever was stuck at 1 PM either moves now or gets escalated. No third option. 🙂`,
  ],
  p3: () => [
    `Final push. 🌇 Whatever the number says right now, the last three hours are yours.`,
  ],
  eod: () => [
    `Time to close the day properly. This isn't an exam — it's you and me looking at what actually happened. 🤝`,
  ],
};

const PHASE_SIGNOFF: Record<PhaseId, string> = {
  prep: "Day is locked. 🔒 Go get the first one.",
  p1: "Pace block closed. Eat something, breathe, come back sharp. 🍜",
  p2: "Acceleration closed. You've done the hard middle — that's the part most people skip. 👊",
  p3: "Final push closed. Nothing left hanging behind you. 🌙",
  eod: "Day sealed. Rest properly — tomorrow starts from the line you just wrote. 🌙",
};

export function buildScript(role: CoreRole, phases: FlowPhase[], personName: string): Beat[] {
  const first = personName.split(" ")[0];
  const nums = phases.length ? role.targets.map((t) => `${t.eod} ${t.label.toLowerCase()}`).join(" + ") : "";
  const out: Beat[] = [];

  out.push({ k: "divider", id: "d_start", text: "Today" });
  out.push({ k: "say", id: "s_hi", text: `Good morning ${first} 👋 It's me, Impact. Same as every day — I'll walk with you, one step at a time.` });
  out.push({ k: "say", id: "s_quote", text: "", quote: pick(QUOTES, personName + new Date().toDateString()) });
  out.push({ k: "say", id: "s_goal", text: `Today's number is *${nums}*. That's it. Not a mountain — just a number we'll chip at together. 🎯` });

  for (const p of phases) {
    out.push({ k: "divider", id: `d_${p.id}`, text: `${p.codename} · ${p.window}` });
    PHASE_OPENER[p.id](role).forEach((t, i) =>
      out.push({ k: "say", id: `s_${p.id}_open${i}`, text: t }),
    );
    out.push({ k: "say", id: `s_${p.id}_brief`, text: p.brief });

    // Selfie moments belonging to this phase come first — they stamp the phase.
    for (const m of selfieMomentsFor(p.id)) {
      out.push({
        k: "selfie", id: `sf_${m.id}`, phase: p.id, momentId: m.id,
        title: m.title, text: m.cue, why: m.why,
      });
    }

    p.steps.forEach((s, i) => {
      out.push({
        k: "step", id: `st_${s.id}`, phase: p.id, stepId: s.id,
        text: s.label, detail: s.detail, evidence: s.evidence,
        yes: i % 3 === 0 ? "Done ✅" : i % 3 === 1 ? "Yes, done 👍" : "Handled ✅",
        no: "Not yet 🙈",
      });
    });

    if (p.checkpoint) {
      out.push({
        k: "say", id: `s_${p.id}_numq`,
        text: `Now the honest bit — the numbers at ${p.due}. Tell me where you actually are, not where you wish you were. 🙂`,
      });
      for (const t of role.targets) {
        out.push({
          k: "count", id: `ct_${p.id}_${t.id}`, phase: p.id, metric: t.id,
          label: t.label, target: targetAt(t, p.checkpoint),
          text: `How many *${t.label.toLowerCase()}* so far? (${p.due} target: ${targetAt(t, p.checkpoint)})`,
        });
      }
    }

    out.push({
      k: "say", id: `s_${p.id}_rep`,
      text: `Last few lines for ${p.codename} and we're done here. One question at a time, promise. ✍️`,
    });
    for (const f of p.report) {
      out.push({
        k: "field", id: `fl_${p.id}_${f.id}`, phase: p.id, fieldId: f.id,
        label: f.label, kind: f.kind, placeholder: f.placeholder,
        required: f.required !== false, text: f.label,
      });
    }

    out.push({ k: "close", id: `cl_${p.id}`, phase: p.id, codename: p.codename, text: PHASE_SIGNOFF[p.id] });
  }

  out.push({ k: "wrap", id: "wrap" });
  return out;
}
