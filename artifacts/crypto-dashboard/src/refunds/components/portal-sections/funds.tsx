import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Banknote,
  Plus,
  Repeat,
  Send,
  Wallet as WalletIcon,
} from "lucide-react";
import WalletModal from "@/components/wallet-modal";
import KycModal from "@/components/kyc-modal";
import { useKyc } from "@/hooks/use-kyc";
import { useBalance, BTC_PRICE_USD } from "@/hooks/use-balance";
import {
  saveInvoiceContext,
  useBlockConfirmations,
  useTransactions,
  type Transaction,
} from "@/hooks/use-transactions";

type TxApi = ReturnType<typeof useTransactions>;
type ModalType = "send" | "receive" | "withdraw" | "deposit" | null;

function BlockConfirmationLabel({ tx }: { tx: Transaction }) {
  const count = useBlockConfirmations(tx);
  return (
    <p className="text-xs font-semibold text-red-400 mt-1 font-mono tracking-wide">
      Block Confirmation {count}/10
    </p>
  );
}

export default function Funds({ tx }: { tx: TxApi }) {
  const [, navigate] = useLocation();
  const { transactions, addTransaction, cancelTransaction } = tx;
  const { btcFormatted, usdFormatted } = useBalance();
  const { status: kycStatus } = useKyc();

  const [modal, setModal] = useState<ModalType>(null);
  const [kycModal, setKycModal] = useState<{ open: boolean; reason?: string }>({ open: false });
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertAmount, setConvertAmount] = useState("");

  const requireKyc = (action: "Send" | "Withdraw", run: () => void) => {
    if (kycStatus === "approved") {
      run();
      return;
    }
    const reason =
      kycStatus === "pending"
        ? `Your identity verification is still under review. ${action} will be enabled once approved.`
        : kycStatus === "rejected"
          ? `Your last verification was rejected. Please re-submit to ${action.toLowerCase()}.`
          : `Identity verification is required before you can ${action.toLowerCase()}.`;
    setKycModal({ open: true, reason });
  };

  function handleCancel(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    cancelTransaction(id);
    if (expandedTx === id) setExpandedTx(null);
  }

  function handleVerify(t: Transaction) {
    const rawNum = t.usdAmount ?? 20000;
    saveInvoiceContext({ usdAmount: rawNum, asset: t.asset, rawAmount: t.amount, txId: t.id });
    navigate("/invoice");
  }

  function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(convertAmount);
    if (!Number.isFinite(n) || n <= 0) return;
    const usdValue = Math.round(n * BTC_PRICE_USD * 100) / 100;
    addTransaction({
      type: "Conversion",
      asset: "USDT",
      amount: `+${usdValue.toFixed(2)} USDT`,
      usdAmount: usdValue,
      address: "Instant convert • BTC → USDT",
      status: "Completed",
      statusType: "completed",
    });
    setConvertAmount("");
    setConvertOpen(false);
  }

  const actions = [
    { label: "Send", icon: <Send className="w-4 h-4" />, onClick: () => requireKyc("Send", () => setModal("send")) },
    { label: "Receive", icon: <ArrowDownToLine className="w-4 h-4" />, onClick: () => setModal("receive") },
    { label: "Withdraw", icon: <ArrowUpRight className="w-4 h-4" />, onClick: () => requireKyc("Withdraw", () => setModal("withdraw")) },
    { label: "Deposit", icon: <Plus className="w-4 h-4" />, onClick: () => setModal("deposit") },
    { label: "Convert", icon: <Repeat className="w-4 h-4" />, onClick: () => setConvertOpen((v) => !v) },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <KycModal
        open={kycModal.open}
        reason={kycModal.reason}
        onClose={() => setKycModal({ open: false })}
      />
      {modal && (
        <WalletModal
          type={modal}
          onClose={() => setModal(null)}
          onConfirmed={(t) => {
            const num = parseFloat(t.amount);
            const usdValue = Number.isFinite(num) ? Math.round(num * BTC_PRICE_USD * 100) / 100 : 0;
            const isOutflow = t.type === "Send" || t.type === "Withdrawal";
            addTransaction({
              type: t.type,
              asset: t.asset,
              amount: `${isOutflow ? "-" : "+"}${t.amount} ${t.asset}`,
              usdAmount: usdValue,
              address: t.address || (t.type === "Deposit" ? "Bank Transfer" : "External Wallet"),
              status: isOutflow ? "Pending" : "Completed",
              statusType: isOutflow ? "pending" : "completed",
            });
          }}
        />
      )}

      {/* Balance + quick actions */}
      <section className="relative refunds-glass rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <WalletIcon className="w-4 h-4 text-primary" />
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Vault balance
            </p>
          </div>
          <p className="text-3xl font-semibold text-foreground tabular-nums" data-testid="funds-balance-usd">
            ${usdFormatted}
          </p>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{btcFormatted} BTC</p>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                data-testid={`funds-action-${a.label.toLowerCase()}`}
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl refunds-glass-soft hover:bg-muted transition-colors text-sm font-medium text-foreground"
              >
                <span className="text-primary">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>

          {convertOpen && (
            <form onSubmit={handleConvert} className="mt-4 rounded-xl border border-card-border bg-card/50 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Convert BTC → USDT
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="any"
                    data-testid="funds-convert-amount"
                    className="w-full px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                    BTC
                  </span>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Convert
                </button>
              </div>
              {convertAmount && Number(convertAmount) > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  ≈{" "}
                  {(Number(convertAmount) * BTC_PRICE_USD).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  USDT
                </p>
              )}
            </form>
          )}
        </div>
      </section>

      {/* Transaction history */}
      <section className="refunds-glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Transaction history</h2>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Your account
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-10 text-center" data-testid="funds-history-empty">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 border border-primary/30 mb-4">
              <WalletIcon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No transactions yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your activity is empty. Deposits, receipts, conversions, sends and withdrawals will
              appear here as you make them.
            </p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="funds-history-list">
            {transactions.map((t) => (
              <div key={t.id} className="rounded-xl border border-card-border bg-card/40 overflow-hidden">
                <button
                  onClick={() => setExpandedTx(expandedTx === t.id ? null : t.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{t.type}</p>
                      {t.statusType === "processing" && (
                        <span className="px-2 py-0.5 bg-red-500/15 text-red-400 text-xs font-medium rounded-full border border-red-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Processing
                        </span>
                      )}
                      {t.statusType === "investigation" && (
                        <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 text-xs font-medium rounded-full border border-amber-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Under Investigation
                        </span>
                      )}
                      {t.statusType === "pending" && (
                        <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 text-xs font-medium rounded-full border border-blue-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Pending
                        </span>
                      )}
                      {t.statusType === "completed" && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.date} • {t.address}
                    </p>
                    {t.statusType === "processing" && <BlockConfirmationLabel tx={t} />}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-sm font-bold ${
                        t.statusType === "investigation"
                          ? "text-amber-400"
                          : t.statusType === "processing"
                            ? "text-red-400"
                            : t.statusType === "pending"
                              ? "text-blue-400"
                              : "text-foreground"
                      }`}
                    >
                      {t.amount}
                    </p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${
                      expandedTx === t.id ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedTx === t.id && (
                  <div className="border-t border-card-border bg-muted/20 p-4">
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Transaction ID</p>
                        <p className="text-foreground font-mono text-xs break-all">{t.id.toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Asset</p>
                        <p className="text-foreground font-medium">{t.asset}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Date</p>
                        <p className="text-foreground">{t.date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                        <p
                          className={`font-medium ${
                            t.statusType === "investigation"
                              ? "text-amber-400"
                              : t.statusType === "processing"
                                ? "text-red-400"
                                : t.statusType === "pending"
                                  ? "text-blue-400"
                                  : "text-primary"
                          }`}
                        >
                          {t.status}
                        </p>
                      </div>
                    </div>

                    {(t.statusType === "pending" ||
                      t.statusType === "processing" ||
                      t.statusType === "investigation") && (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                          <svg
                            className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <p className="text-xs text-amber-300">
                            This transaction requires billing verification before your funds can be
                            released. Cancel it, or verify to proceed.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={(e) => handleCancel(t.id, e)}
                            className="flex-1 py-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold text-sm rounded-xl border border-destructive/20 transition-colors"
                          >
                            Cancel Transaction
                          </button>
                          <button
                            onClick={() => handleVerify(t)}
                            data-testid={`funds-verify-${t.id}`}
                            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Verify Transaction
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
