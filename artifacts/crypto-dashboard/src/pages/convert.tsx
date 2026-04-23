import { useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";

const assets = [
  { symbol: "BTC", name: "Bitcoin", balance: "1.8802", price: 27000 },
  { symbol: "ETH", name: "Ethereum", balance: "0", price: 1550 },
  { symbol: "USDT", name: "Tether", balance: "0", price: 1 },
  { symbol: "SOL", name: "Solana", balance: "0", price: 89 },
];

export default function Convert() {
  const [fromAsset, setFromAsset] = useState("BTC");
  const [toAsset, setToAsset] = useState("ETH");
  const [amount, setAmount] = useState("");
  const [converted, setConverted] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = assets.find(a => a.symbol === fromAsset)!;
  const to = assets.find(a => a.symbol === toAsset)!;

  const rate = from.price / to.price;
  const toAmount = amount ? (parseFloat(amount) * rate).toFixed(6) : "";

  const swap = () => {
    const tmp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(tmp);
    setAmount("");
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    setConverted(true);
  };

  if (converted) {
    return (
      <DashboardLayout activeTab="convert">
        <div className="max-w-lg mx-auto mt-16 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Conversion Successful!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            You converted <strong className="text-foreground">{amount} {fromAsset}</strong> to{" "}
            <strong className="text-foreground">{toAmount} {toAsset}</strong>
          </p>
          <div className="bg-card border border-card-border rounded-2xl p-5 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">From</span>
              <span className="font-medium text-foreground">{amount} {fromAsset}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">To</span>
              <span className="font-medium text-foreground">{toAmount} {toAsset}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rate</span>
              <span className="font-medium text-foreground">1 {fromAsset} = {rate.toFixed(6)} {toAsset}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fee</span>
              <span className="font-medium text-foreground">0.1%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-primary">Completed</span>
            </div>
          </div>
          <button
            onClick={() => { setConverted(false); setAmount(""); }}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Convert Again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab="convert">
      <div className="max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Convert</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Instantly swap between crypto assets at the best rates</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-6">
          <form onSubmit={handleConvert} className="space-y-4">
            {/* From */}
            <div className="bg-muted rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">From</span>
                <span className="text-xs text-muted-foreground">Balance: {from.balance} {fromAsset}</span>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={fromAsset}
                  onChange={e => setFromAsset(e.target.value)}
                  className="bg-card border border-border rounded-xl px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {assets.filter(a => a.symbol !== toAsset).map(a => (
                    <option key={a.symbol} value={a.symbol}>{a.symbol}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-2xl font-bold text-foreground placeholder:text-muted-foreground focus:outline-none text-right"
                  step="any"
                  min="0"
                />
              </div>
              {amount && (
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  ≈ ${(parseFloat(amount) * from.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {/* Swap button */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={swap}
                className="w-10 h-10 bg-muted border border-border rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            {/* To */}
            <div className="bg-muted rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">To</span>
                <span className="text-xs text-muted-foreground">Balance: {to.balance} {toAsset}</span>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={toAsset}
                  onChange={e => setToAsset(e.target.value)}
                  className="bg-card border border-border rounded-xl px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {assets.filter(a => a.symbol !== fromAsset).map(a => (
                    <option key={a.symbol} value={a.symbol}>{a.symbol}</option>
                  ))}
                </select>
                <div className="flex-1 text-right">
                  <span className="text-2xl font-bold text-foreground">{toAmount || "0.00"}</span>
                </div>
              </div>
              {toAmount && (
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  ≈ ${(parseFloat(toAmount) * to.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {/* Rate info */}
            {amount && (
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Rate</span>
                <span>1 {fromAsset} = {rate.toFixed(6)} {toAsset}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !amount}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Converting...
                </>
              ) : "Convert Now"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Conversions are instant and include a 0.1% fee. Rate locks for 30 seconds.
        </p>
      </div>
    </DashboardLayout>
  );
}
