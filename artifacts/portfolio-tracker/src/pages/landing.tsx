import { Link } from "wouter";
import { Wallet, ShieldCheck, TrendingUp } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans">
      <header className="px-6 py-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary rounded-lg">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Portfolio</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity shadow-sm"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-3xl mx-auto w-full">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-card-foreground mb-6 text-balance">
          A calm, honest view of your crypto holdings.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl text-balance leading-relaxed">
          Your personal financial journal. Enter your transactions, see real-time market prices, and track your true performance without the noise.
        </p>

        <Link
          href="/sign-up"
          className="bg-primary text-primary-foreground text-lg font-medium px-8 py-4 rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          Start tracking for free
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-24 text-left w-full">
          <div className="flex gap-4 items-start p-6 rounded-2xl bg-card border border-border shadow-sm">
            <div className="p-3 bg-secondary rounded-xl shrink-0">
              <ShieldCheck className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground mb-1">Private & Secure</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your data is stored locally in your browser. We don't connect to your wallets or exchanges. You maintain complete control over what you track.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start p-6 rounded-2xl bg-card border border-border shadow-sm">
            <div className="p-3 bg-secondary rounded-xl shrink-0">
              <TrendingUp className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground mb-1">Real-time Clarity</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Powered by live CoinGecko market data. See your true cost basis, accurate unrealized gains, and a clear breakdown of your asset allocation.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border">
        <p>© {new Date().getFullYear()} Portfolio Tracker. All rights reserved.</p>
      </footer>
    </div>
  );
}
