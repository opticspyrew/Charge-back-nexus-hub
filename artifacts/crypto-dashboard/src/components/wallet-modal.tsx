import { useState } from "react";

interface WalletModalProps {
  type: "send" | "receive" | "withdraw" | "deposit";
  onClose: () => void;
  onConfirmed?: (tx: { type: string; asset: string; amount: string; address: string }) => void;
}

const cryptos = [
  { symbol: "BTC", name: "Bitcoin", balance: "0.4821 BTC" },
  { symbol: "ETH", name: "Ethereum", balance: "3.21 ETH" },
  { symbol: "USDT", name: "Tether", balance: "8,450 USDT" },
  { symbol: "SOL", name: "Solana", balance: "42.5 SOL" },
];

export default function WalletModal({ type, onClose, onConfirmed }: WalletModalProps) {
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const [network, setNetwork] = useState("Bitcoin Network");
  const [loading, setLoading] = useState(false);

  const receiveAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

  const typeConfig = {
    send: { title: "Send Crypto", action: "Send", color: "text-blue-400" },
    receive: { title: "Receive Crypto", action: "Copy Address", color: "text-primary" },
    withdraw: { title: "Withdraw Funds", action: "Withdraw", color: "text-amber-400" },
    deposit: { title: "Deposit Funds", action: "Deposit", color: "text-primary" },
  };

  const config = typeConfig[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "receive") return;
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    setStep("success");
    if (onConfirmed && (type === "send" || type === "withdraw")) {
      onConfirmed({
        type: type === "withdraw" ? "Withdrawal" : "Send",
        asset: selectedCrypto,
        amount,
        address,
      });
    }
  };

  const handleDone = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-card-border">
          <h2 className="text-lg font-bold text-foreground">{config.title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {step === "success" ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {type === "deposit" ? "Deposit initiated!" : type === "withdraw" ? "Withdrawal submitted!" : "Transaction sent!"}
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                {type === "deposit"
                  ? "Your deposit is being processed. Funds will appear shortly."
                  : "Your transaction is pending. It will appear in your history below."}
              </p>
              <div className="bg-muted rounded-xl p-4 text-left mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-foreground font-medium">{amount} {selectedCrypto}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-amber-400 font-medium">Pending</span>
                </div>
              </div>
              <button
                onClick={handleDone}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                View Transaction
              </button>
            </div>
          ) : step === "confirm" ? (
            <div>
              <h3 className="text-base font-semibold text-foreground mb-4">Confirm Transaction</h3>
              <div className="bg-muted rounded-xl p-4 space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Asset</span>
                  <span className="text-foreground font-medium">{selectedCrypto}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-foreground font-medium">{amount}</span>
                </div>
                {address && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">To</span>
                    <span className="text-foreground font-medium font-mono text-xs">{address.slice(0, 12)}...{address.slice(-8)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Network</span>
                  <span className="text-foreground font-medium">{network}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Fee</span>
                  <span className="text-foreground font-medium">~$2.50</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("form")}
                  className="flex-1 py-2.5 bg-muted text-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Edit
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </>
                  ) : "Confirm"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {type === "receive" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Asset</label>
                    <select
                      value={selectedCrypto}
                      onChange={e => setSelectedCrypto(e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {cryptos.map(c => (
                        <option key={c.symbol} value={c.symbol}>{c.symbol} — {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Your {selectedCrypto} Address</label>
                    <div className="relative">
                      <div className="w-full px-4 py-3 bg-muted border border-input rounded-xl text-foreground text-xs font-mono pr-20 break-all">
                        {receiveAddress}
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(receiveAddress)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="bg-muted/50 border border-border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-xs text-muted-foreground">Only send {selectedCrypto} to this address. Sending other assets may result in permanent loss.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Asset</label>
                    <select
                      value={selectedCrypto}
                      onChange={e => setSelectedCrypto(e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {cryptos.map(c => (
                        <option key={c.symbol} value={c.symbol}>{c.symbol} — {c.name} ({c.balance})</option>
                      ))}
                    </select>
                  </div>

                  {(type === "send" || type === "withdraw") && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        {type === "withdraw" ? "Bank Account / Wallet Address" : "Recipient Address"}
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder={type === "withdraw" ? "Enter bank account or wallet" : "Enter wallet address"}
                        className="w-full px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary pr-20"
                        required
                        min="0"
                        step="any"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">{selectedCrypto}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Network</label>
                    <select
                      value={network}
                      onChange={e => setNetwork(e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option>Bitcoin Network</option>
                      <option>Ethereum (ERC-20)</option>
                      <option>BNB Smart Chain (BEP-20)</option>
                      <option>Solana</option>
                      <option>Polygon</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    {config.action}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
