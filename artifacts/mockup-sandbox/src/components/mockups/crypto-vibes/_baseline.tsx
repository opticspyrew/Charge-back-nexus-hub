import './_group.css';
import { useState } from 'react';

function cn(...c: (string | undefined | null | false)[]) {
  return c.filter(Boolean).join(' ');
}

export const MOCK_BALANCE = {
  usd: 706543,
  btc: 26.1683,
  usdFormatted: '$706,543.00',
  btcFormatted: '26.1683',
  dailyChangeUsd: 8421.55,
  dailyChangePct: 1.21,
};

export const MOCK_QUICK_STATS = {
  volume24h: '$184,302',
  activeAssets: 1,
  pending: 2,
};

export const MOCK_PORTFOLIO = [
  { symbol: 'BTC', name: 'Bitcoin', amount: '26.1683 BTC', value: '$706,543.00', change: '+1.21%', up: true },
];

export interface MockTxn {
  id: string;
  type: 'Withdrawal' | 'Deposit' | 'Trade' | 'Send';
  asset: string;
  amount: string;
  date: string;
  status: 'Completed' | 'Pending' | 'Processing' | 'Investigation';
  address: string;
}

export const MOCK_TXNS: MockTxn[] = [
  { id: 'txn-018', type: 'Withdrawal', asset: 'BTC',  amount: '-0.4200 BTC',  date: 'Apr 30, 2026', status: 'Pending',      address: 'bc1q…7snm' },
  { id: 'txn-017', type: 'Deposit',    asset: 'BTC',  amount: '+0.1500 BTC',  date: 'Apr 28, 2026', status: 'Completed',    address: 'External Wallet' },
  { id: 'txn-016', type: 'Trade',      asset: 'ETH',  amount: '+1.20 ETH',    date: 'Apr 26, 2026', status: 'Completed',    address: 'BTC → ETH' },
  { id: 'txn-015', type: 'Send',       asset: 'USDT', amount: '-1,200 USDT',  date: 'Apr 24, 2026', status: 'Processing',   address: '0x9a…c1f4' },
  { id: 'txn-014', type: 'Deposit',    asset: 'USDT', amount: '+5,000 USDT',  date: 'Apr 21, 2026', status: 'Completed',    address: 'External Wallet' },
];

export interface MockSession {
  id: number;
  current: boolean;
  device: string;
  location: string;
  ip: string;
  when: string;
}

export const MOCK_SESSIONS: MockSession[] = [
  { id: 1, current: true,  device: 'Chrome on macOS',  location: 'Zürich, CH',     ip: '85.218.84.12', when: 'Apr 30, 2026 · 10:42' },
  { id: 2, current: false, device: 'Safari on iPhone', location: 'Zürich, CH',     ip: '85.218.84.12', when: 'Apr 29, 2026 · 18:11' },
  { id: 3, current: false, device: 'Chrome on macOS',  location: 'Frankfurt, DE',  ip: '95.91.220.7',  when: 'Apr 27, 2026 · 09:33' },
];

export const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',    icon: <Icon><path d="M3 12l2-2 7-7 7 7 2 2M5 10v10h4v-6h6v6h4V10" /></Icon> },
  { id: 'trade',        label: 'Trade',        icon: <Icon><path d="M7 16V4M7 4L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" /></Icon> },
  { id: 'convert',      label: 'Convert',      icon: <Icon><path d="M4 4l4 4-4 4M20 12l-4-4 4-4M4 8h12M20 16l-4 4 4 4M20 20H8" /></Icon> },
  { id: 'market',       label: 'Market',       icon: <Icon><path d="M3 3v18h18M7 14l4-4 3 3 6-6" /></Icon> },
  { id: 'link-account', label: 'Link Account', icon: <Icon><path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1m-2 9a5 5 0 01-7 0 5 5 0 010-7l3-3a5 5 0 017 0" /></Icon> },
];

export function Icon({ children }: { children: React.ReactNode }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">{children}</svg>;
}

export function statusColor(s: MockTxn['status']) {
  switch (s) {
    case 'Completed':     return 'text-emerald-400';
    case 'Pending':       return 'text-amber-400';
    case 'Processing':    return 'text-blue-400';
    case 'Investigation': return 'text-rose-400';
  }
}

export function txnIcon(type: MockTxn['type']) {
  if (type === 'Withdrawal' || type === 'Send') {
    return <Icon><path d="M7 17L17 7M17 7H8M17 7v9" /></Icon>;
  }
  if (type === 'Deposit') {
    return <Icon><path d="M17 7L7 17M7 17h9M7 17V8" /></Icon>;
  }
  return <Icon><path d="M4 4l4 4-4 4M20 12l-4-4 4-4M4 8h12" /></Icon>;
}

/**
 * Baseline of the user-facing CryptoVault dashboard.
 * Layout regions in fixed order (variants must preserve structure):
 *   - Left sidebar:  CryptoVault logo, 5 nav items, user pill at bottom
 *   - Top bar:       hamburger (mobile), currency select, "Live" indicator, bell
 *   - Main column (max-w-5xl, space-y-6):
 *       1) Balance Overview row: large hero card (Total Portfolio Value +
 *          daily delta + 4 action buttons Send/Receive/Withdraw/Deposit)
 *          and a 3-up quick-stats column (24h Volume / Active Assets / Pending)
 *       2) Portfolio Assets card (BTC row)
 *       3) Recent activity card (3 sessions)
 *       4) Transaction history card (5 txn rows)
 */
export function Baseline() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const activeId = 'dashboard';

  return (
    <div className="font-sans antialiased flex h-screen overflow-hidden text-foreground"
         style={{ background: 'hsl(var(--background))', fontFamily: 'var(--app-font-sans)', color: 'hsl(var(--foreground))' }}>
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={cn("fixed lg:relative inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}
        style={{ background: 'hsl(var(--sidebar))', color: 'hsl(var(--sidebar-foreground))', borderRight: '1px solid hsl(var(--sidebar-border))' }}>
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--primary))' }}>
            <svg className="w-5 h-5" fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-base font-bold tracking-tight">CryptoVault</p>
            <p className="text-[11px] opacity-50">Wealth · Self-custody</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button key={item.id}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                activeId === item.id
                  ? "bg-[hsl(var(--sidebar-accent))] text-white"
                  : "opacity-70 hover:bg-[hsl(var(--sidebar-accent))]/60 hover:opacity-100")}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-[hsl(var(--sidebar-accent))]/60 transition-colors">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>MC</div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Marisol Cheng</p>
              <p className="text-[11px] opacity-50">marisol@…</p>
            </div>
            <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 h-16 flex-shrink-0"
                style={{ background: 'hsl(var(--card))', borderBottom: '1px solid hsl(var(--card-border))' }}>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg hover:bg-muted">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="ml-auto flex items-center gap-3">
            <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border bg-transparent"
                    style={{ borderColor: 'hsl(var(--card-border))', color: 'hsl(var(--foreground))' }}>
              <option>USD</option><option>EUR</option><option>CHF</option><option>GBP</option>
            </select>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                 style={{ background: 'hsl(168 84% 45% / 0.12)', border: '1px solid hsl(168 84% 45% / 0.3)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'hsl(var(--primary))' }} />
              <span className="text-xs font-medium" style={{ color: 'hsl(var(--primary))' }}>Live</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-muted relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--destructive))' }} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* 1. Balance Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl p-6 border"
                   style={{ background: 'linear-gradient(135deg, hsl(168 84% 45% / 0.18), hsl(220 80% 50% / 0.10))', borderColor: 'hsl(var(--card-border))' }}>
                <p className="text-xs uppercase tracking-wider opacity-60">Total Portfolio Value</p>
                <p className="text-4xl font-bold mt-1.5">{MOCK_BALANCE.usdFormatted}</p>
                <p className="text-sm mt-1" style={{ color: MOCK_BALANCE.dailyChangePct >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))' }}>
                  +${MOCK_BALANCE.dailyChangeUsd.toLocaleString()} (+{MOCK_BALANCE.dailyChangePct}%) today
                </p>
                <div className="grid grid-cols-4 gap-2 mt-5">
                  {['Send', 'Receive', 'Withdraw', 'Deposit'].map(a => (
                    <button key={a} className="px-3 py-2.5 rounded-xl text-sm font-medium border hover:bg-[hsl(var(--muted))]/40"
                            style={{ borderColor: 'hsl(var(--card-border))', background: 'hsl(var(--card) / 0.5)' }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: '24h Volume',    value: MOCK_QUICK_STATS.volume24h },
                  { label: 'Active Assets', value: String(MOCK_QUICK_STATS.activeAssets) },
                  { label: 'Pending',       value: String(MOCK_QUICK_STATS.pending) },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-4 border"
                       style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--card-border))' }}>
                    <p className="text-xs opacity-60">{s.label}</p>
                    <p className="text-xl font-bold mt-1">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Portfolio Assets */}
            <div className="rounded-2xl p-6 border"
                 style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--card-border))' }}>
              <h3 className="text-sm font-semibold opacity-80 mb-3">Portfolio Assets</h3>
              {MOCK_PORTFOLIO.map(p => (
                <div key={p.symbol} className="flex items-center gap-3 py-2.5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                       style={{ background: 'hsl(38 92% 50% / 0.15)', color: 'hsl(38 92% 60%)' }}>₿</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs opacity-60">{p.amount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{p.value}</p>
                    <p className="text-xs" style={{ color: p.up ? 'hsl(var(--primary))' : 'hsl(var(--destructive))' }}>{p.change}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 3. Recent Activity (sessions) */}
            <div className="rounded-2xl border"
                 style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--card-border))' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: 'hsl(var(--card-border))' }}>
                <h3 className="text-sm font-semibold opacity-80">Recent activity</h3>
              </div>
              <div>
                {MOCK_SESSIONS.map(s => (
                  <div key={s.id} className="px-6 py-3 flex items-center gap-3 border-b last:border-b-0" style={{ borderColor: 'hsl(var(--card-border))' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--muted))' }}>
                      <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17l-5-5 5-5M4 12h16" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.device} {s.current && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--primary) / 0.18)', color: 'hsl(var(--primary))' }}>This device</span>}</p>
                      <p className="text-xs opacity-60">{s.location} · {s.ip}</p>
                    </div>
                    <p className="text-xs opacity-50">{s.when}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Transaction History */}
            <div className="rounded-2xl p-6 border"
                 style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--card-border))' }}>
              <h3 className="text-sm font-semibold opacity-80 mb-2">Transaction History</h3>
              <div className="divide-y" style={{ borderColor: 'hsl(var(--card-border))' }}>
                {MOCK_TXNS.map(t => (
                  <div key={t.id} className="py-3 flex items-center gap-3" style={{ borderTopColor: 'hsl(var(--card-border))' }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--muted))' }}>
                      {txnIcon(t.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t.type} · <span className="opacity-60">{t.address}</span></p>
                      <p className="text-xs opacity-60">{t.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono">{t.amount}</p>
                      <p className={cn("text-xs font-medium", statusColor(t.status))}>{t.status}</p>
                    </div>
                    <svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
