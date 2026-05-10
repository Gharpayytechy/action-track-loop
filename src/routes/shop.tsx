import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Coins, Lock, ShoppingBag } from "lucide-react";
import { useAttendanceState } from "@/hooks/useAttendance";
import { SHOP_CATALOG, coinsFor, redeem, unlockedThemesFor, useCoinState } from "@/lib/coins";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Reward Shop — GHARPAYY Arena" },
      { name: "description", content: "Spend GHARp on perks: time off, lunch, shoutouts, themes." },
    ],
  }),
  component: ShopPage,
});

const CATS: Array<("All" | "Time" | "Food" | "Recognition" | "Flexibility" | "Theme")> = ["All", "Time", "Food", "Recognition", "Flexibility", "Theme"];

function ShopPage() {
  useCoinState();
  const { actor } = useAttendanceState();
  const balance = coinsFor(actor.id);
  const unlocked = unlockedThemesFor(actor.id);
  const [cat, setCat] = useState<typeof CATS[number]>("All");
  const [msg, setMsg] = useState<string>("");

  const items = SHOP_CATALOG.filter((i) => cat === "All" || i.category === cat);

  return (
    <div className="px-4 md:px-6 py-6 max-w-6xl mx-auto">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">Reward Shop</div>
          <h1 className="font-display text-2xl md:text-4xl font-semibold">Earn the day. Spend the night.</h1>
          <p className="text-muted-foreground text-sm mt-1">Convert wins into perks. Some need manager approval.</p>
        </div>
        <div className="rounded-lg bg-card border border-border px-4 py-2 flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Balance</div>
            <div className="font-display text-xl font-semibold tabular-nums">{balance.toLocaleString()} GHARp</div>
          </div>
        </div>
      </header>

      <div className="flex gap-2 flex-wrap mb-5">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-3 h-8 rounded-md text-xs font-mono uppercase tracking-widest border ${cat === c ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {msg && <div className="mb-4 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">{msg}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => {
          const isThemeOwned = it.category === "Theme" && unlocked.includes(it.id);
          const canAfford = balance >= it.cost && !isThemeOwned;
          return (
            <div key={it.id} className="rounded-lg bg-card border border-border p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{it.category}</span>
              </div>
              <div className="font-display font-semibold mt-2">{it.name}</div>
              <div className="text-xs text-muted-foreground flex-1 mt-0.5">{it.desc}</div>
              <div className="flex items-center justify-between mt-3">
                <div className="font-mono text-sm font-semibold tabular-nums">{it.cost} GHARp</div>
                {isThemeOwned ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-emerald-400"><Lock className="h-3 w-3" /> Owned</span>
                ) : (
                  <button
                    disabled={!canAfford}
                    onClick={() => {
                      const r = redeem(actor.id, it);
                      setMsg(r.ok ? `Redeemed ${it.name}${it.needsApproval ? " — pending approval" : ""}` : (r.reason ?? "Failed"));
                      window.setTimeout(() => setMsg(""), 3500);
                    }}
                    className="h-8 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Redeem
                  </button>
                )}
              </div>
              {it.needsApproval && !isThemeOwned && <div className="text-[10px] text-muted-foreground mt-2 font-mono uppercase tracking-widest">Needs manager approval</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
