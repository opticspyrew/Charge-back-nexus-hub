import { useState } from "react";
import { CandlestickChart, CheckCircle2 } from "lucide-react";
import { useBalance } from "@/hooks/use-balance";
import { useTransactions } from "@/hooks/use-transactions";

type TxApi = ReturnType<typeof useTransactions>;

interface Pair {
  pair: string;
  price: number;
  change: string;
  up: boolean;
  high: number;
  low: number;
  vol: string;
}

const PAIRS: Pair[] = [
  { pair: "BTC/USDT", price: 66421.5, change: "+2.41%", up: true, high: 67100, low: 64800, vol: "1.24B" },
  { pair: "ETH/USDT", price: 3285.4, change: "+1.82%", up: true, high: 3310, low: 3200, vol: "841M" },
  { pair: "SOL/USDT", price: 142.86, change: "-0.94%", up: false, high: 148.2, low: 139.5, vol: "312M" },
  { pair: "BNB/USDT", price: 596.3, change: "+0.61%", up: true, high: 600, low: 589, vol: "195M" },
  { pair: "XRP/USDT", price: 0.5421, change: "+3.14%", up: true, high: 0.556, low: 0.521, vol: "421M" },
];

function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Trade({ tx }: { tx: TxApi }) {
  const { addTransaction } = tx;
  const { btcFormatted, usdFormatted } = useBalance();

  const [selectedPair, setSelectedPair] = useState<Pair>(PAIRS[0]);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const base = selectedPair.pair.split("/")[0];
  const parsedAmount = parseFloat(amount);
  const execPrice =
    orderType === "limit" && parseFloat(limitPrice) > 0 ? parseFloat(limitPrice) : selectedPair.price;
  const estUsd = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount * execPrice : 0;

  function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    const usdValue = Math.round(estUsd * 100) / 100;
    addTransaction({
      type: "Trade",
      asset: base,
      amount: `${side === "buy" ? "+" : "-"}${parsedAmount} ${base}`,
      usdAmount: usdValue,
      address: `${side === "buy" ? "Buy" : "Sell"} ${selectedPair.pair} • ${orderType}`,
      status: "Completed",
      statusType: "completed",
    });
    setConfirmation(
      `${side === "buy" ? "Bought" : "Sold"} ${parsedAmount} ${base} (≈ $${fmtUsd(usdValue)}) recorded to your history.`,
    );
    setAmount("");
    setLimitPrice("");
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="refunds-glass rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <CandlestickChart className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Trade</h2>
            <p className="text-xs text-muted-foreground">
              Buy and sell crypto at market or limit price. Every order is recorded to your account history.
            </p>
          </div>
        </div>
      </div>

      {confirmation && (
        <div
          data-testid="trade-success"
          className="flex items-start gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30"
        >
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">{confirmation}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Market pairs */}
        <div className="lg:col-span-2 refunds-glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-card-border">
            <h3 className="text-sm font-semibold text-foreground">Market Pairs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Pair</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground">Price</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground">24h Change</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground">24h Volume</th>
                </tr>
              </thead>
              <tbody>
                {PAIRS.map((p) => (
                  <tr
                    key={p.pair}
                    onClick={() => setSelectedPair(p)}
                    data-testid={`trade-pair-${p.pair.split("/")[0].toLowerCase()}`}
                    className={`border-b border-card-border/50 cursor-pointer hover:bg-muted/30 transition-colors ${
                      selectedPair.pair === p.pair ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                          <span className="text-primary text-xs font-bold">{p.pair.slice(0, 1)}</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{p.pair}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-medium text-foreground">${fmtUsd(p.price)}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`text-sm font-semibold ${p.up ? "text-primary" : "text-destructive"}`}>
                        {p.change}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm text-muted-foreground">${p.vol}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order form */}
        <form onSubmit={handlePlaceOrder} className="refunds-glass rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Selected Pair</p>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">{selectedPair.pair}</h3>
              <span className={`text-sm font-semibold ${selectedPair.up ? "text-primary" : "text-destructive"}`}>
                {selectedPair.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">${fmtUsd(selectedPair.price)}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-muted rounded-xl p-2">
              <p className="text-muted-foreground">24h High</p>
              <p className="text-foreground font-semibold">${fmtUsd(selectedPair.high)}</p>
            </div>
            <div className="bg-muted rounded-xl p-2">
              <p className="text-muted-foreground">24h Low</p>
              <p className="text-foreground font-semibold">${fmtUsd(selectedPair.low)}</p>
            </div>
          </div>

          <div className="flex bg-muted rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setSide("buy")}
              data-testid="trade-side-buy"
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                side === "buy"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              data-testid="trade-side-sell"
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                side === "sell"
                  ? "bg-destructive text-destructive-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sell
            </button>
          </div>

          <div className="flex gap-2">
            {(["market", "limit"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setOrderType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  orderType === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
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
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="any"
                className="w-full px-3 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Amount ({base})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="any"
              data-testid="trade-amount"
              className="w-full px-3 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {estUsd > 0 && (
            <p className="text-xs text-muted-foreground">
              Order value ≈ <span className="text-foreground font-medium">${fmtUsd(estUsd)}</span>
            </p>
          )}

          <button
            type="submit"
            data-testid="trade-place-order"
            className={`w-full py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 ${
              side === "buy"
                ? "bg-primary text-primary-foreground"
                : "bg-destructive text-destructive-foreground"
            }`}
          >
            {side === "buy" ? "Buy" : "Sell"} {base}
          </button>

          <div className="text-xs text-muted-foreground text-center">
            Available: <span className="text-foreground font-medium">{btcFormatted} BTC (${usdFormatted})</span>
          </div>
        </form>
      </div>
    </div>
  );
}
