import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Menu, X } from "lucide-react";
import RefundsLogo from "../refunds-logo";

const NAV_LINKS = [
  { label: "Process", href: "#process" },
  { label: "Intelligence", href: "#intelligence" },
  { label: "Operations", href: "#operations" },
  { label: "Statistics", href: "#statistics" },
  { label: "FAQ", href: "#faq" },
];

export default function HomeNav() {
  const [, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "refunds-glass border-b border-card-border/70 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="px-6 lg:px-10 flex items-center justify-between max-w-7xl mx-auto">
        <button
          onClick={() => navigate("/refunds")}
          className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Refunds.site home"
        >
          <RefundsLogo size={34} />
        </button>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-card/60 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2">
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
            Open portal <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden p-2 rounded-lg border border-card-border bg-card/40 text-foreground"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="sm:hidden px-6 mt-3 max-w-7xl mx-auto">
          <div className="refunds-glass rounded-2xl p-3 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-card/60"
              >
                {l.label}
              </a>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                navigate("/refunds/sign-in");
              }}
              className="mt-1 px-3 py-2 text-sm text-left text-foreground rounded-lg border border-card-border bg-card/40"
            >
              Client sign-in
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/refunds/sign-up");
              }}
              className="px-3 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground inline-flex items-center justify-center gap-1.5"
            >
              Open portal <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
