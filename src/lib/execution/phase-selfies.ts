// The fixed selfie moments of the day. Deliberately few: one in the morning,
// one before each break, one at EOD. Nothing is asked when people come back
// from a break — that would be pushing at 1:15 PM for no reason.

import type { PhaseId } from "@/lib/execution/core-tasks";

export interface SelfieMoment {
  id: string;
  phase: PhaseId;
  title: string;
  cue: string;          // the energetic one-liner in the chat
  why: string;
  when: string;         // human clock label
  required: boolean;    // blocks closing the phase
}

export const SELFIE_MOMENTS: SelfieMoment[] = [
  {
    id: "morning",
    phase: "prep",
    title: "Morning check-in selfie",
    cue: "Good morning champion — one selfie and the day is officially yours.",
    why: "This is your attendance proof for the shift.",
    when: "10:35 AM",
    required: true,
  },
  {
    id: "break1",
    phase: "p1",
    title: "Break start selfie",
    cue: "Phase 1 actuals filed. Break 1 starts — selfie now, nothing asked when you return at 2:00.",
    why: "Break 1 start (1:15–2:00) is stamped here. No selfie needed after the break.",
    when: "1:15 PM",
    required: true,
  },
  {
    id: "break2",
    phase: "p2",
    title: "Break start selfie",
    cue: "5:00 PM — Phase 2 actuals filed. Stamp Break 2 with one selfie and go recharge.",
    why: "Break 2 start (5:00–5:20). Coming back needs nothing.",
    when: "5:00 PM",
    required: true,
  },
  {
    id: "eod",
    phase: "eod",
    title: "Day-close selfie",
    cue: "Last frame of the day — close it with your face on the record.",
    why: "Seals your EOD report as yours.",
    when: "8:00 PM",
    required: true,
  },
];

export function selfieMomentsFor(phase: PhaseId): SelfieMoment[] {
  return SELFIE_MOMENTS.filter((m) => m.phase === phase);
}
