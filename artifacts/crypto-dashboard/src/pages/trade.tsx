import { useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { useBalance } from "@/hooks/use-balance";

const pairs = [
  { pair: "BTC/USDT", price: "66,421.50", change: "+2.41%", up: true, high: "67,100.00", low: "64,800.00", vol: "1.24B" },
  { pair: "ETH/USDT", price: "3,285.40", change: "+1.82%", up: true, high: "3,310.00", low: "3,200.00", vol: "841M" },
  { pair: "SOL/USDT", price: "142.86", change: "-0.94%", up: false, high: "148.20", low: "139.50", vol: "312M" },
  { pair: "BNB/USDT", price: "596.30", change: "+0.61%", up: true, high: "600.00", low: "589.00", vol: "195M" },
  { pair: "XRP/USDT", price: "0.5421", change: "+3.14%", up: true, high: "0.556", low: "0.521", vol: "421M" },
];

export default function Trade() {
  const { btcFormatted, usdFormatted } = useBalance();
  const [selectedPair, setSelectedPair] = useState(pairs[0]);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");

  return (
    <DashboardLayout activeTab="trade">
      <div className="max-w-6xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trade</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Buy and sell cryptocurrencies at market or limit price</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Order book / pairs list */}
          <div className="lg:col-span-2 bg-card border border-card-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Market Pairs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Pair</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground">Price</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground">24h Change</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground">24h Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map(pair => (
                    <tr
                      key={pair.pair}
                      onClick={() => setSelectedPair(pair)}
                      className={`border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors ${selectedPair.pair === pair.pair ? "bg-primary/5" : ""}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-400/20 flex items-center justify-center">
                            <span className="text-amber-400 text-xs font-bold">{pair.pair.slice(0, 1)}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">{pair.pair}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-medium text-foreground">${pair.price}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`text-sm font-semibold ${pair.up ? "text-primary" : "text-destructive"}`}>
                          {pair.change}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm text-muted-foreground">${pair.vol}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order form */}
          <div className="bg-card border border-card-border rounded-2xl p-5 flex flex-col gap-4">
            {/* Selected pair info */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Selected Pair</p>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">{selectedPair.pair}</h3>
                <span className={`text-sm font-semibold ${selectedPair.up ? "text-primary" : "text-destructive"}`}>
                  {selectedPair.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">${selectedPair.price}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-muted rounded-xl p-2">
                <p className="text-muted-foreground">24h High</p>
                <p className="text-foreground font-semibold">${selectedPair.high}</p>
              </div>
              <div className="bg-muted rounded-xl p-2">
                <p className="text-muted-foreground">24h Low</p>
                <p className="text-foreground font-semibold">${selectedPair.low}</p>
              </div>
            </div>

            {/* Buy/Sell toggle */}
            <div className="flex bg-muted rounded-xl p-1 gap-1">
              <button
                onClick={() => setSide("buy")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${side === "buy" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Buy
              </button>
              <button
                onClick={() => setSide("sell")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${side === "sell" ? "bg-destructive text-destructive-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Sell
              </button>
            </div>

            {/* Order type */}
            <div className="flex gap-2">
              {(["market", "limit"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${orderType === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {orderType === "limit" && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Limit Price (USDT)</label>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={e => setLimitPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {["25%", "50%", "75%", "100%"].map(pct => (
                <button key={pct} className="py-1.5 bg-muted rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  {pct}
                </button>
              ))}
            </div>

            <button
              className={`w-full py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 ${side === "buy" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}
            >
              {side === "buy" ? "Buy" : "Sell"} {selectedPair.pair.split("/")[0]}
            </button>

            <div className="text-xs text-muted-foreground text-center">
              Available: <span className="text-foreground font-medium">{btcFormatted} BTC (${usdFormatted})</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
