// "<Person> × Impact" — the whole day as a real WhatsApp conversation.
// Messages arrive ONE AT A TIME with typing indicators. Nothing is visible
// until it's that moment's turn. It's a conversation, not an exam form.

import { useEffect, useMemo, useRef, useState } from "react";
import { SelfieCapture } from "@/components/SelfieCapture";
import { WhatsAppCopyBlock } from "@/components/execution/WhatsAppCopyBlock";
import { StartChatCard } from "@/components/execution/chat-reveal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CoreRole } from "@/lib/execution/core-roles";
import type { FlowPhase, PhaseId } from "@/lib/execution/core-tasks";
import {
  toggleStep, saveSelfie, setCount, submitPhase, completePhase, startPhase, type CoreDay,
} from "@/lib/execution/core-progress";
import { buildScript, pick, ACKS, SOFT_ACKS, type Beat } from "@/lib/execution/chat-script";
import { SELFIE_MOMENTS } from "@/lib/execution/phase-selfies";
import {
  Camera, Check, CheckCheck, Send, Trophy, Zap, ChevronDown,
} from "lucide-react";

/* ---------------- primitives ---------------- */

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center my-3 wa-pop">
      <span className="wa-chip px-3 py-1 text-[10px] font-mono uppercase tracking-widest">{children}</span>
    </div>
  );
}

function In({ children, time, avatar }: { children: React.ReactNode; time?: string; avatar?: boolean }) {
  return (
    <div className="flex justify-start items-end gap-1.5">
      {avatar && (
        <span className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 grid place-items-center text-[10px] font-black text-white">
          I
        </span>
      )}
      <div className={`wa-bubble-in wa-pop max-w-[86%] md:max-w-[70%] px-3 py-2 text-sm ${avatar ? "" : "ml-[30px]"}`}>
        {children}
        <div className="text-[10px] wa-meta text-right mt-1">{time || now()}</div>
      </div>
    </div>
  );
}

function Out({ children, time }: { children: React.ReactNode; time?: string }) {
  return (
    <div className="flex justify-end">
      <div className="wa-bubble-out wa-pop max-w-[86%] md:max-w-[70%] mr-2 px-3 py-2 text-sm">
        {children}
        <div className="text-[10px] wa-meta text-right mt-1 flex items-center justify-end gap-1">
          {time || now()} <CheckCheck className="h-3 w-3 text-sky-500" />
        </div>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex justify-start items-end gap-1.5 wa-pop">
      <span className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 grid place-items-center text-[10px] font-black text-white">I</span>
      <div className="wa-bubble-in px-3 py-2.5 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-bounce"
            style={{ animationDelay: `${i * 140}ms`, animationDuration: "900ms" }}
          />
        ))}
      </div>
    </div>
  );
}

// Bold *text* like WhatsApp does.
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <p className="leading-relaxed whitespace-pre-wrap">
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") && p.length > 2
          ? <strong key={i}>{p.slice(1, -1)}</strong>
          : <span key={i}>{p}</span>,
      )}
    </p>
  );
}

/* ---------------- the chat ---------------- */

export function ImpactChat({
  role, phases, day, actorId, personName, counts,
}: {
  role: CoreRole;
  phases: FlowPhase[];
  day: CoreDay;
  actorId: string;
  personName: string;
  counts: Record<string, number>;
}) {
  const beats = useMemo(() => buildScript(role, phases, personName), [role, phases, personName]);

  // Locally-recorded answers that the store can't express on its own.
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const [logged, setLogged] = useState<Record<string, number>>({});
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const p of phases) Object.assign(seed, day.submissions?.[p.id]?.values || {});
    return seed;
  });
  const [selfieFor, setSelfieFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const answered = (b: Beat): boolean => {
    switch (b.k) {
      case "step": return !!day.checks[b.stepId] || !!skipped[b.id];
      case "selfie": return !!day.selfies?.[b.momentId];
      case "count": return logged[b.id] !== undefined || (counts[b.metric] ?? 0) > 0;
      case "field": return String(values[b.fieldId] ?? "").trim() !== "" || (!b.required && !!skipped[b.id]);
      case "close": return !!day.phases[b.phase]?.doneAt;
      default: return true;
    }
  };
  const interactive = (b: Beat) => ["step", "selfie", "count", "field", "close"].includes(b.k);

  // Resume: everything already answered is shown instantly; the conversation
  // continues live from the first thing still open.
  const [revealed, setRevealed] = useState(() => {
    // Replay only what's already been answered; everything after that arrives
    // live, one message at a time, with typing.
    let lastAnswered = -1;
    beats.forEach((b, i) => { if (interactive(b) && answered(b)) lastAnswered = i; });
    return lastAnswered + 1;
  });
  const [typing, setTyping] = useState(false);
  // Same gate as every other thread in the app: nothing shows until you start.
  const [started, setStarted] = useState(false);

  const last = beats[revealed - 1];
  const blocked = !!last && interactive(last) && !answered(last);

  useEffect(() => {
    if (!started || blocked || revealed >= beats.length) return;
    const next = beats[revealed];
    const delay =
      next.k === "divider" ? 220
        : next.k === "say" ? Math.min(1700, 480 + (next.text.length + (next.quote?.length || 0)) * 11)
          : 520;
    setTyping(next.k === "say" || next.k === "wrap");
    const t = setTimeout(() => { setTyping(false); setRevealed((r) => r + 1); }, delay);
    return () => clearTimeout(t);
  }, [started, revealed, blocked, beats]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [revealed, typing]);

  /* ------- answering ------- */

  const maybeSubmitPhase = (phase: PhaseId, next: Record<string, string>) => {
    const p = phases.find((x) => x.id === phase);
    if (!p) return;
    const ready = p.report.every((f) => f.required === false || String(next[f.id] ?? "").trim() !== "");
    if (ready) {
      const vals: Record<string, string> = {};
      for (const f of p.report) vals[f.id] = next[f.id] ?? "";
      submitPhase(actorId, role.id, phase, vals);
    }
  };

  const answerStep = (b: Extract<Beat, { k: "step" }>, yes: boolean) => {
    startPhase(actorId, role.id, b.phase);
    if (yes) toggleStep(actorId, role.id, b.stepId);
    else setSkipped((s) => ({ ...s, [b.id]: true }));
  };

  const answerCount = (b: Extract<Beat, { k: "count" }>, n: number) => {
    setCount(actorId, role.id, b.metric, n);
    setLogged((l) => ({ ...l, [b.id]: n }));
  };

  const answerField = (b: Extract<Beat, { k: "field" }>, v: string) => {
    const next = { ...values, [b.fieldId]: v };
    setValues(next);
    setDraft("");
    maybeSubmitPhase(b.phase, next);
  };

  /* ------- rendering one beat ------- */

  const renderBeat = (b: Beat) => {
    const done = answered(b);
    const ack = pick(ACKS, b.id);

    switch (b.k) {
      case "divider":
        return <Divider key={b.id}>{b.text}</Divider>;

      case "say":
        return (
          <In key={b.id} avatar>
            {b.quote ? (
              <span className="block border-l-[3px] border-emerald-500/70 pl-2.5 italic text-[13px] leading-relaxed">
                {b.quote}
              </span>
            ) : <Rich text={b.text} />}
          </In>
        );

      case "step":
        return (
          <div key={b.id} className="space-y-2">
            <In avatar>
              <Rich text={b.text} />
              {b.detail && <p className="text-xs wa-meta mt-1">{b.detail}</p>}
              {b.evidence && (
                <p className="mt-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-600">
                  proof: {b.evidence}
                </p>
              )}
              {!done && (
                <div className="flex gap-2 mt-2.5">
                  <button className="wa-btn h-8 px-4 text-xs" onClick={() => answerStep(b, true)}>{b.yes}</button>
                  <button className="wa-btn-ghost h-8 px-3 text-xs" onClick={() => answerStep(b, false)}>{b.no}</button>
                </div>
              )}
            </In>
            {done && (
              <>
                <Out time={day.checks[b.stepId] ? new Date(day.checks[b.stepId]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined}>
                  {day.checks[b.stepId] ? b.yes : b.no}
                </Out>
                <In avatar>{day.checks[b.stepId] ? ack : pick(SOFT_ACKS, b.id)}</In>
              </>
            )}
          </div>
        );

      case "selfie": {
        const proof = day.selfies?.[b.momentId];
        return (
          <div key={b.id} className="space-y-2">
            <In avatar>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-600 mb-1">
                <Camera className="h-3 w-3" /> one photo, that's all
              </span>
              <Rich text={b.text} />
              <p className="text-xs wa-meta mt-1">{b.why}</p>
              {!proof && (
                <button className="wa-btn wa-glow h-9 px-4 text-xs mt-2.5 inline-flex items-center" onClick={() => setSelfieFor(b.momentId)}>
                  <Camera className="h-4 w-4 mr-1.5" /> Open camera
                </button>
              )}
            </In>
            {proof && (
              <>
                <Out time={new Date(proof.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}>
                  <img src={proof.img} alt={b.title} className="h-32 w-32 rounded-lg object-cover" />
                  <span className="block text-xs mt-1">📸 {b.title}</span>
                </Out>
                <In avatar>Got your face on the record. {ack}</In>
              </>
            )}
          </div>
        );
      }

      case "count": {
        const val = logged[b.id] ?? counts[b.metric] ?? 0;
        const good = val >= b.target;
        return (
          <div key={b.id} className="space-y-2">
            <In avatar><Rich text={b.text} /></In>
            {!done ? <CountAsk beat={b} onAnswer={(n) => answerCount(b, n)} /> : (
              <>
                <Out>{val} {b.label.toLowerCase()}</Out>
                <In avatar>
                  {good
                    ? `${val}/${b.target} — you're ahead of the line. Brilliant. 🔥`
                    : `${val}/${b.target}. We're ${b.target - val} short. Not a crisis — just something to close in the next stretch. 🙂`}
                </In>
              </>
            )}
          </div>
        );
      }

      case "field":
        return (
          <div key={b.id} className="space-y-2">
            <In avatar>
              <Rich text={b.text} />
              {b.placeholder && <p className="text-xs wa-meta mt-1">e.g. {b.placeholder}</p>}
            </In>
            {done ? (
              <>
                <Out>{values[b.fieldId] || "—"}</Out>
                <In avatar>{ack}</In>
              </>
            ) : (
              <FieldAsk beat={b} draft={draft} setDraft={setDraft} onAnswer={(v) => answerField(b, v)} />
            )}
          </div>
        );

      case "close": {
        const closed = !!day.phases[b.phase]?.doneAt;
        return (
          <div key={b.id} className="space-y-2">
            <In avatar>
              <Rich text={b.text} />
              {!closed && (
                <button className="wa-btn h-9 px-4 text-xs mt-2.5" onClick={() => completePhase(actorId, role.id, b.phase)}>
                  Close {b.codename} ✅
                </button>
              )}
            </In>
            {closed && <Out>Closed {b.codename} ✅</Out>}
          </div>
        );
      }

      case "wrap":
        return <Wrap key={b.id} role={role} phases={phases} day={day} counts={counts} personName={personName} />;
    }
  };

  const total = beats.filter(interactive).length;
  const doneCount = beats.filter((b) => interactive(b) && answered(b)).length;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-xl">
      {/* header — <person> × Impact */}
      <div className="wa-hero px-3 py-2.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-300 to-teal-500 grid place-items-center shadow ring-1 ring-white/30 relative shrink-0">
          <span className="text-[#06281f] font-display font-black">I</span>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#25D366] ring-2 ring-[#075E54]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold leading-tight truncate">{personName} × Impact</p>
          <p className="text-[11px] text-emerald-100/90 leading-tight truncate">
            {typing ? "typing…" : blocked ? "waiting for you" : "online"} · {progress}% of today answered
          </p>
        </div>
        <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300 shrink-0" />
      </div>
      <div className="wa-track h-1"><span style={{ width: `${progress}%` }} /></div>

      <div ref={scrollRef} className="wa-chat-bg px-2 py-4 space-y-2.5 max-h-[76vh] overflow-y-auto">
        {!started ? (
          <StartChatCard
            title={`${personName} × Impact`}
            line="Your whole day as one conversation — goal at 10:35, actuals at 1:15, recovery at 2:00, actuals at 5:00, impact at 8:00."
            onStart={() => setStarted(true)}
          />
        ) : (
          <>
            {beats.slice(0, revealed).map(renderBeat)}
            {typing && <Typing />}
          </>
        )}
        <div ref={endRef} />
      </div>

      {started && blocked && (
        <button
          className="w-full py-1.5 text-[10px] font-mono uppercase tracking-widest wa-meta bg-background border-t border-border flex items-center justify-center gap-1"
          onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
        >
          <ChevronDown className="h-3 w-3" /> Impact is waiting on your reply
        </button>
      )}

      <SelfieCapture
        open={!!selfieFor}
        title={SELFIE_MOMENTS.find((m) => m.id === selfieFor)?.title || "Selfie"}
        subtitle={SELFIE_MOMENTS.find((m) => m.id === selfieFor)?.why}
        onClose={() => setSelfieFor(null)}
        onCapture={(img) => { if (selfieFor) saveSelfie(actorId, role.id, selfieFor, img); setSelfieFor(null); }}
      />
    </div>
  );
}

/* ---------------- reply widgets (WhatsApp-style composer) ---------------- */

function CountAsk({ beat, onAnswer }: { beat: Extract<Beat, { k: "count" }>; onAnswer: (n: number) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex justify-end">
      <div className="wa-bubble-out wa-pop max-w-[86%] mr-2 px-2.5 py-2 w-full sm:w-80">
        <div className="flex gap-1.5 flex-wrap mb-2">
          {[0, Math.round(beat.target / 2), beat.target, beat.target + 2].map((n, i) => (
            <button key={i} className="wa-btn-ghost h-7 px-3 text-xs" onClick={() => onAnswer(n)}>{n}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Input
            inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)}
            placeholder="type the number…" className="h-9 bg-background/80"
            onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) onAnswer(Number(v) || 0); }}
          />
          <button className="wa-btn h-9 w-9 grid place-items-center" disabled={!v.trim()} onClick={() => onAnswer(Number(v) || 0)}>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldAsk({
  beat, draft, setDraft, onAnswer,
}: {
  beat: Extract<Beat, { k: "field" }>;
  draft: string; setDraft: (s: string) => void;
  onAnswer: (v: string) => void;
}) {
  const send = () => { if (draft.trim()) onAnswer(draft.trim()); };
  return (
    <div className="flex justify-end">
      <div className="wa-bubble-out wa-pop max-w-[92%] mr-2 px-2.5 py-2 w-full sm:w-96">
        <div className="flex gap-1.5 items-end">
          {beat.kind === "long" ? (
            <Textarea
              rows={3} value={draft} onChange={(e) => setDraft(e.target.value)}
              placeholder={beat.placeholder || "type your reply…"} className="bg-background/80 resize-none"
            />
          ) : (
            <Input
              inputMode={beat.kind === "number" ? "numeric" : "text"}
              value={draft} onChange={(e) => setDraft(e.target.value)}
              placeholder={beat.placeholder || "type your reply…"} className="h-9 bg-background/80"
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            />
          )}
          <button className="wa-btn h-9 w-9 grid place-items-center shrink-0" disabled={!draft.trim()} onClick={send}>
            <Send className="h-4 w-4" />
          </button>
        </div>
        {!beat.required && (
          <button className="mt-1.5 text-[10px] font-mono uppercase tracking-widest wa-meta" onClick={() => onAnswer("—")}>
            skip this one
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- closing wrap ---------------- */

function Wrap({
  role, phases, day, counts, personName,
}: {
  role: CoreRole; phases: FlowPhase[]; day: CoreDay; counts: Record<string, number>; personName: string;
}) {
  const doneSteps = phases.flatMap((p) => p.steps).filter((s) => day.checks[s.id]).length;
  const allSteps = phases.flatMap((p) => p.steps).length;
  const lines = role.targets.map((t) => `${t.label}: ${counts[t.id] || 0}/${t.eod}`);
  const text = [
    `*${personName} × Impact · EOD*`,
    new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    "",
    `Steps closed: ${doneSteps}/${allSteps}`,
    ...lines.map((l) => `• ${l}`),
    "",
    `Selfies: ${SELFIE_MOMENTS.filter((m) => day.selfies?.[m.id]).length}/${SELFIE_MOMENTS.length}`,
    `Reports filed: ${phases.filter((p) => day.submissions?.[p.id]).length}/${phases.length}`,
  ].join("\n");

  return (
    <div className="space-y-2">
      <Divider>End of the day</Divider>
      <In avatar>
        <div className="flex items-center gap-2 mb-1.5">
          <Trophy className="h-4 w-4 text-emerald-600" />
          <span className="font-semibold">That's your day, {personName.split(" ")[0]}.</span>
        </div>
        <p className="leading-relaxed">
          {doneSteps}/{allSteps} steps closed. Here's the honest scoreboard — no drama, just the record. 🤝
        </p>
        <div className="mt-2 space-y-1 text-xs">
          {role.targets.map((t) => {
            const have = counts[t.id] || 0;
            return (
              <div key={t.id} className="flex items-center gap-2">
                {have >= t.eod ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <span className="h-3.5 w-3.5 text-amber-500">•</span>}
                <span className="flex-1">{t.label}</span>
                <span className="font-mono">{have}/{t.eod}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[13px] italic border-l-[3px] border-emerald-500/70 pl-2.5">
          “Every day you show up and answer honestly, you get one day better.”
        </p>
      </In>
      <div className="px-2"><WhatsAppCopyBlock text={text} label="Copy today's EOD" /></div>
    </div>
  );
}
