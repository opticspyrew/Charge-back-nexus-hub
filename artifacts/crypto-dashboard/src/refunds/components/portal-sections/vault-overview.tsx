import { useMemo } from "react";
import {
  CircleDollarSign,
  FolderKanban,
  Inbox,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useMyCases, type PortalCase } from "../../data/api";

const STATUS_TONES: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending review", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  processing: { label: "In progress", cls: "bg-primary/15 text-primary border-primary/30" },
  approved: { label: "Recovered", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  rejected: { label: "Declined", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  closed: { label: "Closed", cls: "bg-card text-muted-foreground border-card-border" },
};

function statusTone(status: string): { label: string; cls: string } {
  const key = (status ?? "").toLowerCase();
  if (STATUS_TONES[key]) return STATUS_TONES[key];
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
  return { label, cls: "bg-card text-muted-foreground border-card-border" };
}

function num(value: string | null): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function usdValue(c: PortalCase): number {
  return c.currency === "USD" ? num(c.amount) : 0;
}

function fmtUsd(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

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

function fmtRelative(iso: string) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const diffMin = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  return `${diffD}d ago`;
}

type FeedItem = {
  id: number;
  title: string;
  detail: string;
  caseRef: string;
  observedAt: string;
  tone: string;
};

function buildFeed(cases: PortalCase[]): FeedItem[] {
  return [...cases]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 6)
    .map((c) => {
      const key = (c.status ?? "").toLowerCase();
      const incident = c.incident ?? "Recovery case";
      if (key === "approved") {
        return {
          id: c.id,
          title: "Recovery approved",
          detail: `${incident} cleared for return to your vault.`,
          caseRef: c.reference,
          observedAt: c.submittedAt,
          tone: "border-emerald-500/30 bg-emerald-500/5",
        };
      }
      if (key === "rejected" || key === "closed") {
        return {
          id: c.id,
          title: key === "rejected" ? "Case declined" : "Case closed",
          detail: `${incident} is no longer being actively investigated.`,
          caseRef: c.reference,
          observedAt: c.submittedAt,
          tone: "border-card-border bg-card/40",
        };
      }
      if (key === "processing") {
        return {
          id: c.id,
          title: "Investigation in progress",
          detail: `Analysts are tracing funds for ${incident}.`,
          caseRef: c.reference,
          observedAt: c.submittedAt,
          tone: "border-primary/30 bg-primary/5",
        };
      }
      return {
        id: c.id,
        title: "Case received",
        detail: `${incident} is queued for analyst review.`,
        caseRef: c.reference,
        observedAt: c.submittedAt,
        tone: "border-amber-500/30 bg-amber-500/5",
      };
    });
}

export default function VaultOverview() {
  const { token } = useAuth();
  const { cases, loading, error, reload } = useMyCases(token);

  const summary = useMemo(() => {
    const reportedLossUsd = cases.reduce((s, c) => s + usdValue(c), 0);
    const recoveredUsd = cases.reduce(
      (s, c) => s + ((c.status ?? "").toLowerCase() === "approved" ? usdValue(c) : 0),
      0,
    );
    const atRiskUsd = cases.reduce((s, c) => {
      const k = (c.status ?? "").toLowerCase();
      return s + (k === "pending" || k === "processing" ? usdValue(c) : 0);
    }, 0);
    const activeCases = cases.filter((c) => {
      const k = (c.status ?? "").toLowerCase();
      return k === "pending" || k === "processing";
    }).length;
    const pending = cases.filter((c) => (c.status ?? "").toLowerCase() === "pending").length;
    const inProgress = cases.filter((c) => (c.status ?? "").toLowerCase() === "processing").length;
    return {
      totalCases: cases.length,
      activeCases,
      pending,
      inProgress,
      reportedLossUsd,
      recoveredUsd,
      atRiskUsd,
      recoveryRatePct:
        reportedLossUsd === 0 ? 0 : Math.round((recoveredUsd / reportedLossUsd) * 100),
    };
  }, [cases]);

  const feed = useMemo(() => buildFeed(cases), [cases]);

  const kpiCards = [
    {
      label: "Recovered to vault",
      value: fmtUsd(summary.recoveredUsd),
      sub: `${summary.recoveryRatePct}% of reported loss`,
      icon: <ShieldCheck className="w-5 h-5 text-[hsl(var(--refunds-success))]" />,
      accent: "from-emerald-500/15 to-transparent",
    },
    {
      label: "At-risk balance",
      value: fmtUsd(summary.atRiskUsd),
      sub: `${summary.activeCases} active investigation${summary.activeCases === 1 ? "" : "s"}`,
      icon: <ShieldAlert className="w-5 h-5 text-[hsl(var(--refunds-alert))]" />,
      accent: "from-amber-500/15 to-transparent",
    },
    {
      label: "Reported loss",
      value: fmtUsd(summary.reportedLossUsd),
      sub: `${summary.totalCases} case${summary.totalCases === 1 ? "" : "s"} on file`,
      icon: <CircleDollarSign className="w-5 h-5 text-accent" />,
      accent: "from-sky-500/15 to-transparent",
    },
    {
      label: "Case status",
      value: `${summary.activeCases} / ${summary.totalCases}`,
      sub: `${summary.pending} pending • ${summary.inProgress} in progress`,
      icon: <FolderKanban className="w-5 h-5 text-primary" />,
      accent: "from-primary/15 to-transparent",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6" aria-hidden="true">
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="refunds-glass rounded-2xl p-5 animate-pulse">
              <div className="h-3 w-24 bg-muted rounded mb-4" />
              <div className="h-6 w-28 bg-muted rounded mb-2" />
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
          ))}
        </section>
        <div className="refunds-glass rounded-2xl p-5 animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mb-4" />
          <div className="h-3 w-2/3 bg-muted rounded mb-2" />
          <div className="h-3 w-1/3 bg-muted rounded" />
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

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((c) => (
          <div
            key={c.label}
            className="relative refunds-glass rounded-2xl p-5 overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${c.accent} pointer-events-none`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {c.label}
                </p>
                {c.icon}
              </div>
              <p className="text-2xl font-semibold text-foreground tabular-nums">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 refunds-glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Your cases</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recovery cases linked to your account.
              </p>
            </div>
            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-card-border text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {cases.length === 0 ? (
            <div className="py-10 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 border border-primary/30 mb-4">
                <Inbox className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No cases yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                You haven't submitted any recovery cases. Open the{" "}
                <strong className="text-foreground">Case Intake</strong> tab to file your first
                case — it will appear here once submitted.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-card-border">
                    <th className="text-left font-semibold py-2 pr-3">Reference</th>
                    <th className="text-left font-semibold py-2 pr-3">Case</th>
                    <th className="text-left font-semibold py-2 pr-3">Status</th>
                    <th className="text-right font-semibold py-2 pr-3">Reported loss</th>
                    <th className="text-right font-semibold py-2 pl-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => {
                    const tone = statusTone(c.status);
                    return (
                      <tr key={c.id} className="border-b border-card-border/60 last:border-0">
                        <td className="py-3 pr-3 font-mono text-xs text-primary/90">
                          {c.reference}
                        </td>
                        <td className="py-3 pr-3">
                          <p className="text-foreground font-medium leading-tight">
                            {c.incident ?? "Recovery case"}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {[c.asset, c.chain].filter(Boolean).join(" • ") || "—"}
                          </p>
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`inline-flex items-center w-fit px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${tone.cls}`}
                          >
                            {tone.label}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-right font-mono tabular-nums text-foreground">
                          {fmtAmount(c.amount, c.currency)}
                        </td>
                        <td className="py-3 pl-3 text-right text-xs text-muted-foreground">
                          {fmtRelative(c.submittedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="refunds-glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radar className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Monitoring feed</h2>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Your account
            </span>
          </div>
          {feed.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No monitoring activity yet. Updates appear here as your cases progress.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {feed.map((a) => (
                <li key={a.id} className={`rounded-xl border ${a.tone} p-3`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{a.detail}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mt-2 font-mono">
                      {a.caseRef} • {fmtRelative(a.observedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
