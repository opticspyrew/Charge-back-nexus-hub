import { CalendarClock, Inbox, RefreshCw, ShieldCheck, UserCog } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useMyCases } from "../../data/api";

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
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

function currentFocus(status: string): string {
  switch ((status ?? "").toLowerCase()) {
    case "pending":
      return "Awaiting analyst assignment";
    case "processing":
      return "Tracing on-chain movement of funds";
    case "approved":
      return "Recovery approved — preparing fund return";
    case "rejected":
      return "Case declined after review";
    case "closed":
      return "Case closed";
    default:
      return "Queued for review";
  }
}

export default function InvestigatorPanel() {
  const { token } = useAuth();
  const { cases, loading, error, reload } = useMyCases(token);

  return (
    <div className="space-y-6">
      <div className="refunds-glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <UserCog className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">Investigator workspace</h2>
              <p className="text-xs text-muted-foreground">
                The analyst console for the cases you have submitted. Each card reflects the live
                status of your own case — nothing else.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            data-testid="investigator-refresh"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-card-border text-muted-foreground hover:text-foreground hover:bg-card/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="refunds-glass rounded-2xl p-5 animate-pulse">
              <div className="h-4 w-32 bg-muted rounded mb-3" />
              <div className="h-3 w-2/3 bg-muted rounded mb-2" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
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
      )}

      {!loading && !error && cases.length === 0 && (
        <div className="refunds-glass rounded-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 border border-primary/30 mb-4">
            <Inbox className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No active investigations</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Once you file a recovery case from the{" "}
            <strong className="text-foreground">Case Intake</strong> tab, its investigator workspace
            will appear here.
          </p>
        </div>
      )}

      {!loading && !error && cases.length > 0 && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="investigator-list">
          {cases.map((c) => {
            const tone = statusTone(c.status);
            return (
              <article key={c.id} className="refunds-glass rounded-2xl p-5">
                <header className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-primary/90">{c.reference}</p>
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {c.incident ?? "Recovery case"}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded border ${tone.cls}`}
                  >
                    {tone.label}
                  </span>
                </header>

                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-card/60 border border-card-border p-3">
                    <dt className="uppercase tracking-wider text-muted-foreground font-semibold">Asset</dt>
                    <dd className="mt-1 text-foreground">{c.asset ?? "—"}</dd>
                  </div>
                  <div className="rounded-lg bg-card/60 border border-card-border p-3">
                    <dt className="uppercase tracking-wider text-muted-foreground font-semibold">Chain</dt>
                    <dd className="mt-1 text-foreground">{c.chain ?? "—"}</dd>
                  </div>
                  <div className="rounded-lg bg-card/60 border border-card-border p-3">
                    <dt className="uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3" /> Reported loss
                    </dt>
                    <dd className="mt-1 text-foreground font-mono">{fmtAmount(c.amount, c.currency)}</dd>
                  </div>
                  <div className="rounded-lg bg-card/60 border border-card-border p-3">
                    <dt className="uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                      <CalendarClock className="w-3 h-3" /> Submitted
                    </dt>
                    <dd className="mt-1 text-foreground font-mono">{fmtDate(c.submittedAt)}</dd>
                  </div>
                </dl>

                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Current focus
                  </p>
                  <p className="text-sm text-foreground mt-0.5">{currentFocus(c.status)}</p>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
