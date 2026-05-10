import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Coins, Sparkles, Target } from "lucide-react";
import { useAttendanceState } from "@/hooks/useAttendance";
import { DAILY_QUESTS, WEEKLY_QUESTS, claimQuest, progressFor, useQuestState } from "@/lib/quests-store";
import { coinsFor } from "@/lib/coins";
import { levelProgress, streakFor, xpFor } from "@/lib/xp-engine";

export const Route = createFileRoute("/quests")({
  head: () => ({
    meta: [
      { title: "Daily & Weekly Quests — GHARPAYY Arena" },
      { name: "description", content: "Tour-first quests. Complete daily and weekly missions to earn XP and GHARp." },
    ],
  }),
  component: QuestsPage,
});

function QuestsPage() {
  useQuestState();
  const { actor } = useAttendanceState();
  const lp = levelProgress(xpFor(actor.id));
  const coins = coinsFor(actor.id);
  const streak = streakFor(actor.id);

  return (
    <div className="px-4 md:px-6 py-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">Quests</div>
        <h1 className="font-display text-2xl md:text-4xl font-semibold">Win the day. Win the week.</h1>
        <p className="text-muted-foreground mt-1 text-sm">Five daily quests. Three weekly. All tied to tour velocity.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="Level" value={`L${lp.level}`} sub={lp.title} />
        <Stat label="XP to next" value={lp.xpToNext.toLocaleString()} sub={`${lp.pct}% there`} />
        <Stat label="GHARp" value={coins.toLocaleString()} sub="Spend in /shop" icon={<Coins className="h-3.5 w-3.5 text-primary" />} />
        <Stat label="Streak" value={`${streak}d`} sub="Keep it alive" icon={<Sparkles className="h-3.5 w-3.5 text-primary" />} />
      </div>

      <Section title="Today's Quests" subtitle="Reset at midnight">
        <div className="grid md:grid-cols-2 gap-3">
          {DAILY_QUESTS.map((q) => <QuestCard key={q.id} actorId={actor.id} q={q} />)}
        </div>
      </Section>

      <Section title="This Week" subtitle="Reset every Monday">
        <div className="grid md:grid-cols-3 gap-3">
          {WEEKLY_QUESTS.map((q) => <QuestCard key={q.id} actorId={actor.id} q={q} />)}
        </div>
      </Section>
    </div>
  );
}

function Stat({ label, value, sub, icon }: { label: string; value: string; sub: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-card border border-border p-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">{icon}{label}</div>
      <div className="font-display text-2xl font-semibold tabular-nums mt-1">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <div>
            <h2 className="font-display text-lg font-semibold leading-tight">{title}</h2>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{subtitle}</div>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function QuestCard({ actorId, q }: { actorId: string; q: typeof DAILY_QUESTS[number] }) {
  const p = progressFor(actorId, q);
  const pct = Math.min(100, Math.round((p.count / q.target) * 100));
  const ready = p.count >= q.target && !p.claimed;
  const done = p.claimed;

  return (
    <div className={`rounded-lg border p-4 transition-colors ${done ? "bg-emerald-500/5 border-emerald-500/30" : ready ? "bg-primary/5 border-primary/40" : "bg-card border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display font-semibold leading-tight">{q.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{q.detail}</div>
        </div>
        {done && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span>{p.count}/{q.target}</span>
          <span>+{q.xp} XP · +{q.coins} GHARp</span>
        </div>
        <div className="mt-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className={`h-full ${done ? "bg-emerald-400" : "bg-primary"} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {ready && (
        <button
          onClick={() => claimQuest(actorId, q)}
          className="mt-3 w-full h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
        >
          Claim reward
        </button>
      )}
    </div>
  );
}
