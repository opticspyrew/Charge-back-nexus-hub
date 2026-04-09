import { useLocation } from "wouter";

const invoiceItems = [
  {
    id: 1,
    description: "Ledger Nano X — Hardware Wallet",
    detail: "Model 2026 Pro Edition, Bluetooth-enabled cold storage",
    quantity: 1,
    unitPrice: 149.00,
  },
  {
    id: 2,
    description: "MetaMask Institutional License",
    detail: "Annual enterprise subscription — unlimited wallets",
    quantity: 1,
    unitPrice: 299.00,
  },
  {
    id: 3,
    description: "CoinTracker Pro — Tax & Portfolio Software",
    detail: "12-month license, unlimited transactions, CPA export",
    quantity: 1,
    unitPrice: 499.00,
  },
  {
    id: 4,
    description: "TradingView Premium Plan",
    detail: "Annual plan — advanced charting, 8 charts, alerts, replay",
    quantity: 1,
    unitPrice: 468.00,
  },
  {
    id: 5,
    description: "Crypto Portfolio Tracker API Access",
    detail: "Professional tier, 1M API calls/month, real-time data",
    quantity: 1,
    unitPrice: 360.00,
  },
  {
    id: 6,
    description: "DeFi Security Audit Tool — BlockSec Shield",
    detail: "12-month subscription, smart contract monitoring",
    quantity: 1,
    unitPrice: 480.00,
  },
  {
    id: 7,
    description: "KYC/AML Compliance Verification",
    detail: "Enhanced identity verification processing fee",
    quantity: 1,
    unitPrice: 120.00,
  },
  {
    id: 8,
    description: "Crypto Exchange Network Fee",
    detail: "International wire transfer + blockchain settlement",
    quantity: 1,
    unitPrice: 125.00,
  },
];

const subtotal = invoiceItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
const tax = 0;
const total = subtotal + tax;

export default function Invoice() {
  const [, navigate] = useLocation();

  const invoiceDate = "April 08, 2026";
  const dueDate = "April 15, 2026";
  const invoiceNumber = "INV-2026-04-8821";
  const referenceId = "WDL-20000-001";

  return (
    <div className="min-h-screen bg-[#0f1117] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation back */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        {/* Invoice Card */}
        <div className="bg-[#161b27] border border-[#242d42] rounded-2xl overflow-hidden shadow-2xl">
          {/* Invoice Header */}
          <div className="bg-gradient-to-r from-[#0d2137] to-[#0b1d30] px-8 py-8 border-b border-[#242d42]">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Brand */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">C</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">CryptoVault</h1>
                    <p className="text-emerald-400 text-xs font-medium tracking-wide uppercase">Digital Asset Platform</p>
                  </div>
                </div>
                <div className="text-sm text-slate-400 space-y-0.5">
                  <p>100 Wall Street, Suite 2100</p>
                  <p>New York, NY 10005</p>
                  <p>United States</p>
                  <p>billing@cryptovault.io</p>
                  <p>+1 (800) 555-CRYPTO</p>
                </div>
              </div>

              {/* Invoice meta */}
              <div className="md:text-right">
                <h2 className="text-4xl font-bold text-white mb-4">INVOICE</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex md:flex-row-reverse items-center gap-2">
                    <span className="text-white font-semibold">{invoiceNumber}</span>
                    <span className="text-slate-400">Invoice No:</span>
                  </div>
                  <div className="flex md:flex-row-reverse items-center gap-2">
                    <span className="text-white font-semibold">{referenceId}</span>
                    <span className="text-slate-400">Reference:</span>
                  </div>
                  <div className="flex md:flex-row-reverse items-center gap-2">
                    <span className="text-white font-semibold">{invoiceDate}</span>
                    <span className="text-slate-400">Date:</span>
                  </div>
                  <div className="flex md:flex-row-reverse items-center gap-2">
                    <span className="text-amber-400 font-semibold">{dueDate}</span>
                    <span className="text-slate-400">Due Date:</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="px-8 py-6 border-b border-[#242d42] bg-[#141920]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">Bill To</p>
                <p className="text-white font-semibold text-base">Account Holder</p>
                <p className="text-slate-400 text-sm">CryptoVault Member</p>
                <p className="text-slate-400 text-sm">Account ID: CVP-2026-7748821</p>
                <p className="text-slate-400 text-sm">Verified KYC Level 3</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">Payment Context</p>
                <div className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <span className="text-slate-400 min-w-[110px]">Transaction:</span>
                    <span className="text-white font-mono text-xs">WDL-20000-001</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-400 min-w-[110px]">Withdrawal:</span>
                    <span className="text-white font-semibold">$20,000.00 USD</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-400 min-w-[110px]">Status:</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-400 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Under Investigation
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-400 min-w-[110px]">Required:</span>
                    <span className="text-white">Settlement fee payment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="px-8 py-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a3550]">
                    <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-8">#</th>
                    <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="text-center py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Qty</th>
                    <th className="text-right py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Unit Price</th>
                    <th className="text-right py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2738]">
                  {invoiceItems.map(item => (
                    <tr key={item.id} className="hover:bg-[#1a2235] transition-colors">
                      <td className="py-4 text-sm text-slate-600">{item.id}</td>
                      <td className="py-4">
                        <p className="text-sm font-semibold text-white">{item.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                      </td>
                      <td className="py-4 text-center text-sm text-slate-300">{item.quantity}</td>
                      <td className="py-4 text-right text-sm text-slate-300">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-4 text-right text-sm font-semibold text-white">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="px-8 pb-8">
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between items-center text-sm py-1.5">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-white font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1.5">
                  <span className="text-slate-400">Tax (0%)</span>
                  <span className="text-white font-medium">$0.00</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1.5">
                  <span className="text-slate-400">Processing Fee</span>
                  <span className="text-white font-medium">$0.00</span>
                </div>
                <div className="border-t border-[#2a3550] pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-white">Total Due</span>
                    <span className="text-2xl font-bold text-emerald-400">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 text-right">USD — United States Dollar</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment methods */}
          <div className="border-t border-[#242d42] px-8 py-6 bg-[#141920]">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-4">Payment Methods Accepted</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  method: "Cryptocurrency",
                  detail: "BTC, ETH, USDT, BNB",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
                {
                  method: "Bank Wire Transfer",
                  detail: "SWIFT / ACH / SEPA",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  )
                },
                {
                  method: "Credit / Debit Card",
                  detail: "Visa, Mastercard, AMEX",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  )
                },
              ].map(pm => (
                <div key={pm.method} className="flex items-center gap-3 p-3 bg-[#1a2235] border border-[#2a3550] rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    {pm.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{pm.method}</p>
                    <p className="text-xs text-slate-500">{pm.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer notes */}
          <div className="border-t border-[#242d42] px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Important Notice</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This invoice must be settled within 7 days to release the pending withdrawal of $20,000.00 USD from your CryptoVault account. Failure to pay may result in account suspension per our Terms of Service, Section 14.3 (Compliance & AML).
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Contact & Support</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  For billing inquiries, contact our compliance team at billing@cryptovault.io or call +1 (800) 555-CRYPTO. Reference your invoice number {invoiceNumber} in all communications.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#1e2738] flex flex-col md:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">C</span>
                </div>
                <span className="text-sm font-semibold text-white">CryptoVault</span>
                <span className="text-slate-500 text-xs">© 2026 All rights reserved.</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Reg. No: CV-2019-88421</span>
                <span>•</span>
                <span>FinCEN Licensed MSB</span>
                <span>•</span>
                <span>SEC Registered</span>
              </div>
            </div>
          </div>
        </div>

        {/* Print button */}
        <div className="flex justify-center mt-6 gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-muted border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Invoice
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
