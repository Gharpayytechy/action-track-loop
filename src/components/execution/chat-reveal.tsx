// One shared "one message at a time" engine for every WhatsApp-style surface in
// the app: WhatsApp PHASES, Reporting OS thread and Chat with Impact all use
// this, so the behaviour is identical everywhere.
//
// Rules it enforces:
//  1. Nothing is visible until the person taps "Start the chat now".
//  2. After that, exactly ONE new block arrives at a time (typing → bubble).
//  3. The next block only arrives when the current one is answered/continued.

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, MessageCircle, PlayCircle } from "lucide-react";

export interface ChatReveal {
  started: boolean;
  start: () => void;
  /** How many blocks are visible right now. */
  shown: number;
  /** Reveal the next block (no-op when everything is already out). */
  next: () => void;
  /** Jump the thread forward to a specific block (used by the phase rail). */
  goTo: (index: number) => void;
  /** True while the "typing…" indicator should show. */
  typing: boolean;
  atEnd: boolean;
}

/**
 * @param total     number of blocks in the thread
 * @param resumeAt  how many blocks are already answered (replayed instantly on
 *                  a return visit so nobody re-taps through finished work)
 */
export function useChatReveal(total: number, resumeAt = 0): ChatReveal {
  const [started, setStarted] = useState(false);
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);

  const start = useCallback(() => {
    setStarted(true);
    setShown(Math.max(1, Math.min(total, resumeAt + 1)));
  }, [total, resumeAt]);

  const next = useCallback(() => {
    setShown((s) => {
      if (s >= total) return s;
      setTyping(true);
      return s;
    });
  }, [total]);

  const goTo = useCallback((index: number) => {
    setStarted(true);
    setShown((s) => Math.max(s, Math.min(total, index + 1)));
  }, [total]);

  // typing → then the message lands
  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => {
      setTyping(false);
      setShown((s) => Math.min(total, s + 1));
    }, 620);
    return () => clearTimeout(t);
  }, [typing, total]);

  return { started, start, shown, next, goTo, typing, atEnd: shown >= total };
}

/** The gate everybody sees first. Same copy, same button, everywhere. */
export function StartChatCard({
  title, line, cta = "Start the chat now", onStart,
}: {
  title: string;
  line: string;
  cta?: string;
  onStart: () => void;
}) {
  return (
    <div className="flex justify-center py-8 px-3">
      <div className="wa-bubble-in wa-pop max-w-[92%] md:max-w-[70%] px-4 py-4 text-sm text-center">
        <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15">
          <MessageCircle className="h-5 w-5 text-emerald-600" />
        </span>
        <p className="font-semibold leading-snug">{title}</p>
        <p className="wa-meta mt-1 leading-relaxed">{line}</p>
        <p className="wa-meta mt-2 text-[11px]">
          One message at a time. Nothing else opens until you answer the one in front of you.
        </p>
        <button onClick={onStart} className="wa-btn wa-glow mt-3 inline-flex h-10 items-center px-5 text-xs">
          <PlayCircle className="mr-1.5 h-4 w-4" /> {cta}
        </button>
      </div>
    </div>
  );
}

/** The three-dot typing bubble. */
export function TypingBubble({ initial = "I" }: { initial?: string }) {
  return (
    <div className="wa-pop flex items-end justify-start gap-1.5">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-[10px] font-black text-white">
        {initial}
      </span>
      <div className="wa-bubble-in flex items-center gap-1 px-3 py-2.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-40"
            style={{ animationDelay: `${i * 140}ms`, animationDuration: "900ms" }}
          />
        ))}
      </div>
    </div>
  );
}

/** The single "next message" control at the foot of every thread. */
export function ContinueBar({
  label = "Next message", waiting, onNext, hint,
}: {
  label?: string;
  /** True when the current block still needs an answer — then we nudge, not advance. */
  waiting: boolean;
  onNext: () => void;
  hint?: string;
}) {
  if (waiting) {
    return (
      <div className="flex justify-center py-2">
        <span className="wa-chip px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest">
          <ChevronDown className="mr-1 inline h-3 w-3" /> {hint || "answer this one to continue"}
        </span>
      </div>
    );
  }
  return (
    <div className="flex justify-center py-2">
      <button onClick={onNext} className="wa-btn wa-glow inline-flex h-10 items-center px-5 text-xs">
        {label} →
      </button>
    </div>
  );
}
