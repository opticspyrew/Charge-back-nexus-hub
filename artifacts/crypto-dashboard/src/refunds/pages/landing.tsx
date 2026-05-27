import { useLocation } from "wouter";
import {
  ArrowRight,
  FileCheck2,
  Gavel,
  Lock,
  Network,
  Radar,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import RefundsLogo from "../components/refunds-logo";

const CAPABILITIES = [
  {
    icon: <Network className="w-5 h-5 text-primary" />,
    title: "On-chain path analysis",
    body: "We trace the movement of stolen assets across chains and identify the regulated counterparties where recovery may be possible.",
  },
  {
    icon: <Radar className="w-5 h-5 text-primary" />,
    title: "Continuous monitoring",
    body: "Active cases stay under live address monitoring so analysts are alerted the moment funds move or settle into a known venue.",
  },
  {
    icon: <FileCheck2 className="w-5 h-5 text-primary" />,
    title: "Evidence-grade reporting",
    body: "Every artifact is hashed, sealed, and logged to a chain of custody fit for counsel, regulators, or law-enforcement liaison.",
  },
  {
    icon: <Gavel className="w-5 h-5 text-primary" />,
    title: "Coordinated recovery actions",
    body: "When authorized, we coordinate with exchanges, custodians, and your counsel — never acting unilaterally on your behalf.",
  },
];

const COMPLIANCE = [
  { label: "SOC 2 Type II", detail: "Controls audited annually" },
  { label: "ISO 27001", detail: "Information security management" },
  { label: "AML/KYC", detail: "Sanctions screening on every counterparty" },
  { label: "GDPR / CCPA", detail: "Data minimization by default" },
];

export default function RefundsLanding() {
  const [, navigate] = useLocation();

  return (
    <div className="refunds-scope min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10 refunds-radial" />
      <div className="absolute inset-0 -z-10 refunds-grid-bg opacity-50" />

      <header className="px-6 lg:px-10 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <RefundsLogo size={36} />
        <nav className="flex items-center gap-3">
          <button
            onClick={() => navigate("/refunds/brand")}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-card/60 transition-colors"
          >
            <Sparkles className="w-4 h-4" /> Brand system
          </button>
          <button
            onClick={() => navigate("/refunds/sign-in")}
            className="px-3 py-2 text-sm text-foreground rounded-lg border border-card-border bg-card/40 hover:bg-card/70 transition-colors"
          >
            Client sign-in
          </button>
          <button
            onClick={() => navigate("/refunds/sign-up")}
            data-testid="landing-cta-portal"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Open secure portal <ArrowRight className="w-4 h-4" />
          </button>
        </nav>
      </header>

      <section className="px-6 lg:px-10 pt-10 pb-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] uppercase tracking-wider font-semibold bg-primary/10 border border-primary/25 text-primary">
              <ScanLine className="w-3.5 h-3.5" /> Digital asset recovery & cyber intelligence
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight text-foreground leading-[1.05]">
              The secure operating console for
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                digital asset recovery.
              </span>
            </h1>
            <p className="mt-5 text-base text-muted-foreground max-w-xl leading-relaxed">
              Refunds.site is an enterprise platform for tracing, investigating, and
              coordinating the recovery of stolen or misdirected digital assets.
              Analysts work cases under SOC 2 controls. Outcomes depend on
              jurisdiction, counterparty cooperation, and the underlying asset —
              we never guarantee recovery.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/refunds/sign-up")}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Open secure portal <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/refunds/brand")}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-lg border border-card-border text-foreground hover:bg-card/60 transition-colors"
              >
                Review brand system
              </button>
            </div>

            <dl className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Chains analyzed</dt>
                <dd className="text-xl font-semibold text-foreground tabular-nums mt-1">17</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Avg. triage</dt>
                <dd className="text-xl font-semibold text-foreground tabular-nums mt-1">&lt; 6h</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Controls audit</dt>
                <dd className="text-xl font-semibold text-foreground tabular-nums mt-1">SOC 2</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="refunds-glass rounded-3xl p-6 refunds-scan-line">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary refunds-pulse-ring" />
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-primary">
                    Live recovery vault
                  </span>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">RF-2026-0184</span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-card/60 border border-card-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Recovered</p>
                  <p className="text-base font-semibold text-[hsl(var(--refunds-success))] tabular-nums">$88.2K</p>
                </div>
                <div className="rounded-xl bg-card/60 border border-card-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">At-risk</p>
                  <p className="text-base font-semibold text-[hsl(var(--refunds-alert))] tabular-nums">$324.3K</p>
                </div>
                <div className="rounded-xl bg-card/60 border border-card-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Risk score</p>
                  <p className="text-base font-semibold text-primary tabular-nums">78/100</p>
                </div>
              </div>

              <div className="rounded-xl bg-card/60 border border-card-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Path of funds</p>
                <svg viewBox="0 0 320 80" className="w-full h-16" aria-hidden="true">
                  <defs>
                    <linearGradient id="lp-edge" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(180 95% 55%)" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>
                  <g stroke="url(#lp-edge)" strokeWidth="1.2" fill="none">
                    <path d="M20 40 C 80 10, 160 10, 200 40" />
                    <path d="M20 40 C 80 70, 160 70, 200 40" />
                    <path d="M200 40 C 240 20, 280 10, 300 5" />
                    <path d="M200 40 C 240 60, 280 70, 300 75" />
                  </g>
                  {[
                    { cx: 20, cy: 40, fill: "hsl(195 25% 96%)" },
                    { cx: 200, cy: 40, fill: "hsl(38 95% 55%)" },
                    { cx: 300, cy: 5, fill: "hsl(0 84% 60%)" },
                    { cx: 300, cy: 75, fill: "hsl(152 70% 45%)" },
                  ].map((n, i) => (
                    <circle key={i} cx={n.cx} cy={n.cy} r="5" fill={n.fill} stroke="hsl(222 60% 5%)" strokeWidth="2" />
                  ))}
                </svg>
              </div>

              <p className="mt-4 text-[11px] text-muted-foreground">
                Illustrative — no real client data.
              </p>
            </div>
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-primary/10 via-transparent to-accent/10 blur-2xl" />
          </div>
        </div>
      </section>

      <section className="px-6 lg:px-10 py-12 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Platform capabilities</h2>
          <span className="hidden sm:inline-block text-xs text-muted-foreground">
            Forensic. Compliance-oriented. Read-only by default.
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {CAPABILITIES.map((c) => (
            <article key={c.title} className="refunds-glass rounded-2xl p-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center mb-3">
                {c.icon}
              </div>
              <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{c.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 lg:px-10 py-12 max-w-7xl mx-auto">
        <div className="refunds-glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-sm uppercase tracking-wider text-primary font-semibold">Compliance posture</h2>
          </div>
          <p className="text-foreground text-base sm:text-lg mt-1 max-w-3xl">
            Every case is handled under formal controls. The platform is designed for
            firms and individuals who require a documented, auditable recovery process.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {COMPLIANCE.map((c) => (
              <li key={c.label} className="rounded-xl border border-card-border bg-card/40 p-4">
                <p className="text-xs uppercase tracking-wider text-primary font-semibold">{c.label}</p>
                <p className="text-sm text-foreground mt-1">{c.detail}</p>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground mt-5">
            Refunds.site does not custody assets, does not contact counterparties
            without your written authorization, and cannot reverse on-chain
            transactions.
          </p>
        </div>
      </section>

      <footer className="px-6 lg:px-10 py-8 max-w-7xl mx-auto border-t border-card-border/60 mt-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <RefundsLogo size={28} />
            <span className="text-xs text-muted-foreground">© 2026 Refunds.site — synthetic demonstration data.</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5" />
            <span>All sessions are E2EE-AES-256.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
