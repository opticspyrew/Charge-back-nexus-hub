import { useMemo, useState } from "react";
import { Inbox, Network, Radar, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useMyCases, type PortalCase } from "../../data/api";

function fmtAmount(amount: string | null, currency: string): string {
  if (!amount) return "—";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  const formatted = n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === "USD" ? `$${formatted}` : `${formatted} ${currency}`;
}

const STATUS_TONES: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending review", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  processing: { label: "In progress", cls: "bg-primary/15 text-primary border-primary/30" },
  approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  rejected: { label: "Declined", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  closed: { label: "Closed", cls: "bg-card text-muted-foreground border-card-border" },
};

function statusTone(status: string): { label: string; cls: string } {
  const key = (status ?? "").toLowerCase();
  if (STATUS_TONES[key]) return STATUS_TONES[key];
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
  return { label, cls: "bg-card text-muted-foreground border-card-border" };
}

// Stylized SVG "tx graph" — an illustrative diagram of how analysts trace funds,
// not real chain data. Labelled as illustrative so it is never mistaken for the
// client's actual transactions.
function TxGraph() {
  return (
    <svg
      viewBox="0 0 320 180"
      className="w-full h-44"
      role="img"
      aria-label="Illustration of how recovered funds are traced across the chain"
    >
      <defs>
        <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(180 95% 55%)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <g stroke="url(#edge)" strokeWidth="1.2" fill="none">
        <path d="M40 90 C 100 60, 160 60, 220 90" />
        <path d="M40 90 C 100 130, 160 130, 220 90" />
        <path d="M220 90 C 260 70, 290 60, 300 50" />
        <path d="M220 90 C 260 110, 290 130, 300 140" />
      </g>
      {[
        { cx: 40, cy: 90, fill: "hsl(195 25% 96%)", label: "Source" },
        { cx: 220, cy: 90, fill: "hsl(38 95% 55%)", label: "Mixer" },
        { cx: 300, cy: 50, fill: "hsl(0 84% 60%)", label: "Cluster" },
        { cx: 300, cy: 140, fill: "hsl(152 70% 45%)", label: "Exchange" },
      ].map((n, i) => (
        <g key={i}>
          <circle cx={n.cx} cy={n.cy} r="6" fill={n.fill} stroke="hsl(222 60% 5%)" strokeWidth="2" />
          <text
            x={n.cx}
            y={n.cy + 20}
            textAnchor="middle"
            fontSize="9"
            fill="hsl(215 15% 70%)"
            fontFamily="JetBrains Mono, monospace"
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function BlockchainWidgets() {
  const { token } = useAuth();
  const { cases, loading, error, reload } = useMyCases(token);
  const [selectedRef, setSelectedRef] = useState<string>("");

  const selected: PortalCase | undefined = useMemo(() => {
    if (cases.length === 0) return undefined;
    return cases.find((c) => c.reference === selectedRef) ?? cases[0];
  }, [cases, selectedRef]);

  const activeCount = useMemo(
    () => cases.filter((c) => ["pending", "processing"].includes((c.status ?? "").toLowerCase())).length,
    [cases],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4" aria-hidden="true">
        <div className="xl:col-span-2 refunds-glass rounded-2xl p-5 animate-pulse">
          <div className="h-4 w-40 bg-muted rounded mb-4" />
          <div className="h-40 w-full bg-muted/60 rounded-xl" />
        </div>
        <div className="refunds-glass rounded-2xl p-5 animate-pulse">
          <div className="h-4 w-28 bg-muted rounded mb-3" />
          <div className="h-3 w-2/3 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="refunds-glass rounded-2xl p-6 text-center" role="alert">
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="refunds-glass rounded-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 border border-primary/30 mb-4">
          <Inbox className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">Nothing to monitor yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          On-chain monitoring activates once you file a recovery case. Submit one from the{" "}
          <strong className="text-foreground">Case Intake</strong> tab and the assets you report
          will be tracked here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <section className="xl:col-span-2 refunds-glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Path of funds</h2>
          </div>
          {cases.length > 1 ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-[10px] uppercase tracking-wider font-semibold">Case</span>
              <select
                value={selected?.reference ?? ""}
                onChange={(e) => setSelectedRef(e.target.value)}
                data-testid="chain-case-select"
                className="px-3 py-1.5 bg-muted border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              >
                {cases.map((c) => (
                  <option key={c.reference} value={c.reference}>
                    {c.reference} — {c.chain ?? "—"}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {selected?.reference} • {selected?.chain ?? "—"}
            </span>
          )}
        </div>
        <div className="refunds-scan-line rounded-xl border border-card-border bg-card/40 p-3 mb-3">
          <TxGraph />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Illustrative trace for{" "}
          <span className="font-mono text-foreground">{selected?.reference}</span>. Detailed forensic
          findings are shared with you by your analyst as the investigation progresses.
        </p>
      </section>

      <div className="space-y-4">
        <section className="refunds-glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Radar className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Monitoring status</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-card-border bg-card/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Cases monitored
              </p>
              <p className="text-2xl font-semibold text-foreground tabular-nums mt-1">{cases.length}</p>
            </div>
            <div className="rounded-lg border border-card-border bg-card/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Active watch
              </p>
              <p className="text-2xl font-semibold text-primary tabular-nums mt-1">{activeCount}</p>
            </div>
          </div>
        </section>

        <section className="refunds-glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-[hsl(var(--refunds-alert))]" />
            <h2 className="text-base font-semibold text-foreground">Monitored assets</h2>
          </div>
          <ul className="space-y-2.5" data-testid="chain-monitored-list">
            {cases.map((c) => {
              const tone = statusTone(c.status);
              return (
                <li key={c.id} className="rounded-lg border border-card-border bg-card/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {c.asset ?? "—"} • {c.chain ?? "—"}
                    </p>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${tone.cls}`}
                    >
                      {tone.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                    {c.reference} • {fmtAmount(c.amount, c.currency)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
