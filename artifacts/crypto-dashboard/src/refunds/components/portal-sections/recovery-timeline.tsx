import { useMemo, useState } from "react";
import { Activity, Inbox, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useMyCases, type PortalCase } from "../../data/api";

const STAGES = [
  { key: "received", title: "Case received", detail: "Your recovery case was logged and queued for review." },
  { key: "review", title: "Under review", detail: "Our intake team is validating the details you submitted." },
  { key: "investigation", title: "Investigation", detail: "Analysts are tracing the on-chain movement of your funds." },
  { key: "resolution", title: "Recovery decision", detail: "A recovery determination is issued for your case." },
  { key: "return", title: "Funds returned", detail: "Approved funds are released back to your vault." },
] as const;

type StageStatus = "complete" | "active" | "pending" | "declined";

function fmtDate(iso: string): string {
  if (!iso) return "Pending";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

// Derive the canonical 5-stage recovery path from the case's terminal status.
// We never fabricate per-stage timestamps: only the real submission time is
// shown (on stage 1); later stages display their state, not invented dates.
function stageStates(status: string): StageStatus[] {
  const s = (status ?? "").toLowerCase();
  if (s === "approved") return ["complete", "complete", "complete", "complete", "complete"];
  if (s === "rejected" || s === "closed") return ["complete", "complete", "complete", "declined", "pending"];
  if (s === "processing") return ["complete", "complete", "active", "pending", "pending"];
  return ["complete", "active", "pending", "pending", "pending"]; // pending / unknown
}

export default function RecoveryTimeline() {
  const { token } = useAuth();
  const { cases, loading, error, reload } = useMyCases(token);
  const [selectedRef, setSelectedRef] = useState<string>("");

  const selected: PortalCase | undefined = useMemo(() => {
    if (cases.length === 0) return undefined;
    return cases.find((c) => c.reference === selectedRef) ?? cases[0];
  }, [cases, selectedRef]);

  const states = selected ? stageStates(selected.status) : [];
  const total = STAGES.length;
  const completed = states.filter((s) => s === "complete").length;
  const activeIdx = states.findIndex((s) => s === "active");
  const activeStage = activeIdx >= 0 ? STAGES[activeIdx] : undefined;
  const isClosed = (selected?.status ?? "").toLowerCase() === "closed";

  if (loading) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="refunds-glass rounded-2xl p-5 animate-pulse">
          <div className="h-4 w-40 bg-muted rounded mb-3" />
          <div className="h-2 w-full bg-muted/60 rounded" />
        </div>
        <div className="refunds-glass rounded-2xl p-5 animate-pulse">
          <div className="h-3 w-2/3 bg-muted rounded mb-2" />
          <div className="h-3 w-1/2 bg-muted rounded" />
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

  if (!selected) {
    return (
      <div className="refunds-glass rounded-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 border border-primary/30 mb-4">
          <Inbox className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No recovery in progress</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your recovery timeline appears once you file a case. Open the{" "}
          <strong className="text-foreground">Case Intake</strong> tab to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="refunds-glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Recovery timeline</h2>
          </div>
          {cases.length > 1 ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-xs uppercase tracking-wider font-semibold">Case</span>
              <select
                value={selected.reference}
                onChange={(e) => setSelectedRef(e.target.value)}
                data-testid="timeline-case-select"
                className="px-3 py-1.5 bg-muted border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              >
                {cases.map((c) => (
                  <option key={c.reference} value={c.reference}>
                    {c.reference} — {c.incident ?? "Recovery case"}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="text-xs font-mono text-muted-foreground">{selected.reference}</span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent"
              style={{ width: `${(completed / total) * 100}%` }}
              aria-hidden="true"
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground tabular-nums">
            {completed}/{total} stages complete
          </span>
        </div>
        {activeStage && (
          <p className="text-xs text-primary mt-2">
            <ShieldCheck className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
            Currently: {activeStage.title}
          </p>
        )}
      </div>

      <div className="refunds-glass rounded-2xl p-5">
        <ol className="relative pl-7">
          <span className="absolute left-2 top-1 bottom-1 w-px bg-card-border" aria-hidden="true" />
          {STAGES.map((st, i) => {
            const stState = states[i];
            const isDeclined = stState === "declined";
            const title = isDeclined ? (isClosed ? "Case closed" : "Recovery declined") : st.title;
            const detail = isDeclined
              ? "After review, this case is no longer being actively pursued for recovery."
              : st.detail;
            const tone =
              stState === "complete"
                ? {
                    ring: "bg-emerald-500",
                    pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
                    label: "Complete",
                  }
                : stState === "active"
                  ? {
                      ring: "bg-primary refunds-pulse-ring",
                      pill: "bg-primary/15 text-primary border-primary/30",
                      label: "Active",
                    }
                  : stState === "declined"
                    ? {
                        ring: "bg-destructive",
                        pill: "bg-destructive/15 text-destructive border-destructive/30",
                        label: "Declined",
                      }
                    : {
                        ring: "bg-card-border",
                        pill: "bg-card text-muted-foreground border-card-border",
                        label: "Pending",
                      };
            const when =
              i === 0
                ? fmtDate(selected.submittedAt)
                : tone.label === "Complete"
                  ? "Completed"
                  : tone.label === "Active"
                    ? "In progress"
                    : tone.label === "Declined"
                      ? "—"
                      : "Pending";
            return (
              <li key={st.key} className="relative pb-6 last:pb-0">
                <span
                  className={`absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2 border-card ${tone.ring}`}
                />
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${tone.pill}`}
                  >
                    {tone.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{detail}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mt-1 font-mono">
                  {when}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
