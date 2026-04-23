import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/dashboard-layout";
import { useTransactions } from "@/hooks/use-transactions";
import { useAuth } from "@/lib/auth-context";
import { publicApi } from "@/lib/api";

const ASSET_PRICES: Record<string, number> = {
  BTC: 27000,
  ETH: 1550,
  USDT: 1,
  SOL: 89,
};

const cryptos = [
  { symbol: "BTC", name: "Bitcoin", balance: "1.8519", color: "bg-amber-400" },
];

const networks = [
  "Bitcoin Network",
  "Ethereum (ERC-20)",
  "BNB Smart Chain (BEP-20)",
  "Solana",
  "Polygon",
];

type Step = "form" | "review" | "success";

export default function Withdraw() {
  const [, navigate] = useLocation();
  const { addTransaction } = useTransactions();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("form");
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState("Bitcoin Network");
  const [loading, setLoading] = useState(false);

  const selected = cryptos.find(c => c.symbol === selectedCrypto)!;

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("review");
  };

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    const rawNum = parseFloat(amount) || 0;
    const usdAmount = Math.round(rawNum * (ASSET_PRICES[selectedCrypto] ?? 1) * 100) / 100;
    addTransaction({
      type: "Withdrawal",
      asset: selectedCrypto,
      amount: `-${amount} ${selectedCrypto}`,
      usdAmount,
      address: destination ? `${destination.slice(0, 8)}...` : "Bank Transfer",
      status: "Pending",
      statusType: "pending",
    });
    if (user) {
      publicApi.submitRequest({
        name: user.name,
        email: user.email,
        type: "withdrawal",
        amount: usdAmount.toFixed(2),
        currency: "USD",
        notes: `Withdraw ${amount} ${selectedCrypto} via ${network}${destination ? ` to ${destination.slice(0, 12)}...` : ""}`,
      }).catch(() => {});
    }
    setLoading(false);
    setStep("success");
  };

  const handleDone = () => navigate("/dashboard");

  return (
    <DashboardLayout activeTab="dashboard">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => step === "review" ? setStep("form") : navigate("/dashboard")}
            className="p-2 rounded-xl bg-card border border-card-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Withdraw Funds</h1>
            <p className="text-sm text-muted-foreground">Transfer to your bank or external wallet</p>
          </div>
        </div>

        {step === "success" ? (
          <div className="bg-card border border-card-border rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Withdrawal Submitted</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your withdrawal is now pending review. You can track or cancel it in your transaction history.
            </p>
            <div className="bg-muted rounded-xl p-4 text-left mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-foreground font-semibold">{amount} {selectedCrypto}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Destination</span>
                <span className="text-foreground font-mono text-xs max-w-[180px] truncate">{destination.slice(0, 14)}...</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="text-blue-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Pending
                </span>
              </div>
            </div>
            <button
              onClick={handleDone}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              View in Transaction History
            </button>
          </div>
        ) : step === "review" ? (
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-card-border">
              <h2 className="text-base font-semibold text-foreground">Review Withdrawal</h2>
              <p className="text-xs text-muted-foreground mt-1">Please confirm the details before submitting</p>
            </div>
            <div className="p-6 space-y-4">
              {/* Asset preview */}
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                <div className={`w-10 h-10 rounded-full ${selected.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-xs font-bold">{selectedCrypto.slice(0, 2)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">Balance: {selected.balance} {selectedCrypto}</p>
                </div>
                <p className="text-lg font-bold text-foreground">{amount}</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-border/50 text-sm">
                  <span className="text-muted-foreground">Destination</span>
                  <span className="text-foreground font-mono text-xs max-w-[180px] truncate">{destination}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50 text-sm">
                  <span className="text-muted-foreground">Network</span>
                  <span className="text-foreground font-medium">{network}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50 text-sm">
                  <span className="text-muted-foreground">Estimated Fee</span>
                  <span className="text-foreground font-medium">~$2.50</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-muted-foreground">Status after submit</span>
                  <span className="text-blue-400 font-medium">Pending review</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-amber-300">
                  Withdrawals are subject to compliance review. Your transaction may be placed under investigation before funds are released.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("form")}
                  className="flex-1 py-3 bg-muted text-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Edit
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </>
                  ) : "Confirm Withdrawal"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReview} className="space-y-4">
            {/* Asset selector */}
            <div className="bg-card border border-card-border rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Select Asset to Withdraw</h2>
              <div className="grid grid-cols-2 gap-3">
                {cryptos.map(c => (
                  <button
                    key={c.symbol}
                    type="button"
                    onClick={() => setSelectedCrypto(c.symbol)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      selectedCrypto === c.symbol
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-border bg-muted/30 hover:bg-muted/60"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${c.color} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-xs font-bold">{c.symbol.slice(0, 2)}</span>
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-semibold text-foreground">{c.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.balance}</p>
                    </div>
                    {selectedCrypto === c.symbol && (
                      <svg className="w-4 h-4 text-amber-400 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Withdrawal details */}
            <div className="bg-card border border-card-border rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Withdrawal Details</h2>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Bank Account or Wallet Address
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  placeholder="Enter bank account number or wallet address"
                  required
                  className="w-full px-4 py-3 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    min="0"
                    step="any"
                    className="w-full px-4 py-3 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 pr-20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                    {selectedCrypto}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {selected.balance} {selectedCrypto}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Network</label>
                <select
                  value={network}
                  onChange={e => setNetwork(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-input rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {networks.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Review Withdrawal
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
