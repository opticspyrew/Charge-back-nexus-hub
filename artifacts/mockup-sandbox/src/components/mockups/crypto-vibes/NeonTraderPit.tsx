import './_group.css';
import { useState, useEffect } from 'react';
import {
  MOCK_BALANCE,
  MOCK_QUICK_STATS,
  MOCK_PORTFOLIO,
  MOCK_TXNS,
  MOCK_SESSIONS,
  NAV_ITEMS,
  Icon,
} from './_baseline';

function cn(...c: (string | undefined | null | false)[]) {
  return c.filter(Boolean).join(' ');
}

// Monospace tags mapping
function getTxnStatusTag(status: string) {
  switch (status) {
    case 'Completed': return '[DONE]';
    case 'Pending': return '[PEND]';
    case 'Processing': return '[PROC]';
    case 'Investigation': return '[INVST]';
    default: return `[${status.substring(0, 4).toUpperCase()}]`;
  }
}

function getTxnStatusColor(status: string) {
  switch (status) {
    case 'Completed': return 'text-[#ccff00] border-[#ccff00] shadow-[0_0_8px_rgba(204,255,0,0.3)]';
    case 'Pending': return 'text-[#00e5ff] border-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.3)]';
    case 'Processing': return 'text-[#00e5ff] border-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.3)]';
    case 'Investigation': return 'text-[#ff0055] border-[#ff0055] shadow-[0_0_8px_rgba(255,0,85,0.3)]';
    default: return 'text-zinc-500 border-zinc-500';
  }
}

export function NeonTraderPit() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const activeId = 'dashboard';

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
          
          .font-mono-jb { font-family: 'JetBrains Mono', monospace; }
          
          .bg-noise {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
            opacity: 0.03;
            pointer-events: none;
            position: absolute;
            inset: 0;
            z-index: 50;
          }
          
          .scanlines {
            background: linear-gradient(
              to bottom,
              rgba(255,255,255,0),
              rgba(255,255,255,0) 50%,
              rgba(0,0,0,0.1) 50%,
              rgba(0,0,0,0.1)
            );
            background-size: 100% 4px;
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 49;
            opacity: 0.3;
          }

          .ticker-track {
            display: inline-flex;
            animation: ticker 30s linear infinite;
            white-space: nowrap;
          }

          @keyframes ticker {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          
          .neon-glow {
            box-shadow: 0 0 10px rgba(0, 229, 255, 0.15), inset 0 0 10px rgba(0, 229, 255, 0.05);
          }
          .neon-glow-primary {
            box-shadow: 0 0 10px rgba(204, 255, 0, 0.15), inset 0 0 10px rgba(204, 255, 0, 0.05);
          }
          
          .panel-border {
            border: 1px solid #1a1a1a;
            background: #050505;
          }
        `}
      </style>
      <div className="font-sans antialiased flex h-screen overflow-hidden bg-black text-white relative">
        <div className="bg-noise mix-blend-overlay"></div>
        <div className="scanlines"></div>

        {mobileOpen && <div className="fixed inset-0 bg-black/80 z-20 lg:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />}

        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:relative inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300 border-r border-[#1a1a1a] bg-black",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <div className="flex items-center gap-3 px-5 py-5 border-b border-[#1a1a1a]">
            <div className="w-8 h-8 flex items-center justify-center border border-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.4)] text-[#00e5ff] font-mono-jb font-bold text-sm bg-[#00e5ff]/10 rounded-sm">
              CV
            </div>
            <div>
              <p className="text-sm font-bold tracking-widest text-[#00e5ff] uppercase">CryptoVault</p>
              <p className="text-[10px] font-mono-jb text-zinc-500">SYS_CUSTODY_V1</p>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {NAV_ITEMS.map(item => (
              <button key={item.id}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-mono-jb tracking-wide transition-all text-left border border-transparent",
                  activeId === item.id
                    ? "bg-[#ccff00]/10 text-[#ccff00] border-[#ccff00]/30 shadow-[inset_2px_0_0_#ccff00]"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                )}>
                <span className={activeId === item.id ? "opacity-100" : "opacity-50"}>{item.icon}</span>
                {item.label.toUpperCase()}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-[#1a1a1a]">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-xs border border-transparent hover:border-[#1a1a1a] hover:bg-zinc-900 transition-colors">
              <div className="w-8 h-8 flex items-center justify-center text-xs font-mono-jb font-bold border border-zinc-700 text-zinc-300 rounded-sm bg-zinc-900">
                MC
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-200">Marisol Cheng</p>
                <p className="text-[10px] font-mono-jb text-zinc-500">marisol@...</p>
              </div>
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          <header className="flex flex-col flex-shrink-0 border-b border-[#1a1a1a] bg-black">
            <div className="flex items-center justify-between px-6 h-16">
              <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-zinc-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <div className="ml-auto flex items-center gap-4">
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                        className="text-xs font-mono-jb px-2 py-1 bg-black border border-zinc-800 text-zinc-300 rounded-sm outline-none focus:border-[#00e5ff]">
                  <option>USD</option><option>EUR</option><option>CHF</option><option>GBP</option>
                </select>
                <div className="flex items-center gap-2 px-2 py-1 border border-[#ff0055]/30 bg-[#ff0055]/10 shadow-[0_0_8px_rgba(255,0,85,0.2)] rounded-sm">
                  <span className="w-2 h-2 rounded-full bg-[#ff0055] shadow-[0_0_5px_#ff0055] animate-pulse" />
                  <span className="text-[10px] font-mono-jb font-bold tracking-widest text-[#ff0055]">LIVE</span>
                </div>
                <button className="p-2 relative text-zinc-400 hover:text-white border border-transparent hover:border-zinc-800 rounded-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#00e5ff] shadow-[0_0_5px_#00e5ff]" />
                </button>
              </div>
            </div>
            <div className="h-6 border-t border-[#1a1a1a] bg-[#050505] flex items-center overflow-hidden text-[10px] font-mono-jb text-zinc-500 whitespace-nowrap px-4">
              <div className="ticker-track">
                <span className="mr-8">BTC/USD 706,543.00 <span className="text-[#ccff00]">+1.21%</span></span>
                <span className="mr-8">ETH/USD 3,842.10 <span className="text-[#ff0055]">-0.42%</span></span>
                <span className="mr-8">SOL/USD 142.50 <span className="text-[#ccff00]">+2.10%</span></span>
                <span className="mr-8">USDT/USD 1.00 <span className="text-zinc-400">0.00%</span></span>
                <span className="mr-8">BTC/USD 706,543.00 <span className="text-[#ccff00]">+1.21%</span></span>
                <span className="mr-8">ETH/USD 3,842.10 <span className="text-[#ff0055]">-0.42%</span></span>
                <span className="mr-8">SOL/USD 142.50 <span className="text-[#ccff00]">+2.10%</span></span>
                <span className="mr-8">USDT/USD 1.00 <span className="text-zinc-400">0.00%</span></span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <div className="max-w-5xl mx-auto space-y-6">

              {/* 1. Balance Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 panel-border p-6 rounded-sm flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#ccff00] opacity-5 blur-[80px] rounded-full pointer-events-none"></div>
                  
                  <p className="text-[10px] font-mono-jb text-zinc-500 mb-2">TOTAL_PORTFOLIO_VALUE</p>
                  <p className="text-5xl font-mono-jb font-bold text-white tracking-tight">{MOCK_BALANCE.usdFormatted}</p>
                  <p className={cn("text-xs font-mono-jb mt-3 flex items-center gap-2", MOCK_BALANCE.dailyChangePct >= 0 ? "text-[#ccff00]" : "text-[#ff0055]")}>
                    <span className="inline-block w-1.5 h-1.5 bg-current rounded-sm shadow-[0_0_5px_currentColor]"></span>
                    {MOCK_BALANCE.dailyChangePct >= 0 ? '+' : '-'}${Math.abs(MOCK_BALANCE.dailyChangeUsd).toLocaleString()} ({MOCK_BALANCE.dailyChangePct >= 0 ? '+' : ''}{MOCK_BALANCE.dailyChangePct}%) 24H
                  </p>
                  <div className="mt-8 grid grid-cols-4 gap-3">
                    {['Send', 'Receive', 'Withdraw', 'Deposit'].map(a => (
                      <button key={a} className="uppercase text-[10px] font-mono-jb tracking-widest font-bold border border-zinc-800 bg-black hover:border-[#00e5ff] hover:text-[#00e5ff] hover:shadow-[0_0_10px_rgba(0,229,255,0.2)] transition-all py-3 rounded-sm">
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: '24H_VOLUME', value: MOCK_QUICK_STATS.volume24h },
                    { label: 'ACTIVE_ASSETS', value: String(MOCK_QUICK_STATS.activeAssets) },
                    { label: 'PENDING_TXNS', value: String(MOCK_QUICK_STATS.pending), highlight: true },
                  ].map(s => (
                    <div key={s.label} className={cn("panel-border p-4 rounded-sm flex flex-col justify-center", s.highlight && "border-[#00e5ff]/50 neon-glow")}>
                      <p className="text-[10px] font-mono-jb text-zinc-500 mb-1">{s.label}</p>
                      <p className={cn("text-xl font-mono-jb font-bold tracking-tight", s.highlight ? "text-[#00e5ff]" : "text-white")}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Portfolio Assets */}
              <div className="panel-border rounded-sm">
                <div className="px-6 py-3 border-b border-[#1a1a1a]">
                  <h3 className="text-[10px] font-mono-jb text-zinc-500">PORTFOLIO_ASSETS</h3>
                </div>
                <div className="p-4">
                  {MOCK_PORTFOLIO.map(p => (
                    <div key={p.symbol} className="flex items-center gap-4 py-2 hover:bg-white/[0.02] px-2 -mx-2 rounded-sm transition-colors group cursor-pointer">
                      <div className="w-10 h-10 border border-[#f7931a]/50 bg-[#f7931a]/10 text-[#f7931a] flex items-center justify-center font-bold text-lg rounded-sm shadow-[0_0_10px_rgba(247,147,26,0.2)]">
                        ₿
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold uppercase tracking-wider">{p.name}</p>
                        <p className="text-xs font-mono-jb text-zinc-400">{p.amount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono-jb font-bold text-white">{p.value}</p>
                        <p className={cn("text-xs font-mono-jb", p.up ? "text-[#ccff00]" : "text-[#ff0055]")}>{p.change}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Recent Activity */}
              <div className="panel-border rounded-sm">
                <div className="px-6 py-3 border-b border-[#1a1a1a]">
                  <h3 className="text-[10px] font-mono-jb text-zinc-500">SESSION_LOGS</h3>
                </div>
                <div>
                  {MOCK_SESSIONS.map(s => (
                    <div key={s.id} className="px-6 py-4 flex items-center gap-4 border-b border-[#1a1a1a] last:border-b-0 hover:bg-white/[0.02] transition-colors">
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                        <div>
                          <p className="text-xs font-mono-jb text-zinc-200">
                            {s.device.toUpperCase()}
                            {s.current && <span className="ml-3 text-[9px] px-1.5 py-0.5 border border-[#00e5ff] text-[#00e5ff] bg-[#00e5ff]/10 rounded-sm">THIS_DEVICE</span>}
                          </p>
                          <p className="text-[10px] font-mono-jb text-zinc-500 mt-1">{s.location} // {s.ip}</p>
                        </div>
                      </div>
                      <p className="text-[10px] font-mono-jb text-zinc-600">{s.when.toUpperCase()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Transaction History */}
              <div className="panel-border rounded-sm">
                <div className="px-6 py-3 border-b border-[#1a1a1a]">
                  <h3 className="text-[10px] font-mono-jb text-zinc-500">TXN_HISTORY</h3>
                </div>
                <div className="divide-y divide-[#1a1a1a]">
                  {MOCK_TXNS.map(t => (
                    <div key={t.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors group cursor-pointer">
                      <div className="w-10 h-10 border border-zinc-800 bg-zinc-900 flex items-center justify-center rounded-sm text-zinc-400 group-hover:text-white transition-colors">
                        {t.type === 'Withdrawal' || t.type === 'Send' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H8M17 7v9" /></svg> :
                         t.type === 'Deposit' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7L7 17M7 17h9M7 17V8" /></svg> :
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l4 4-4 4M20 12l-4-4 4-4M4 8h12" /></svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-200">{t.type} <span className="text-zinc-600 font-mono-jb mx-1">::</span> <span className="font-mono-jb text-zinc-400 font-normal">{t.address}</span></p>
                        <p className="text-[10px] font-mono-jb text-zinc-600 mt-1">{t.date.toUpperCase()}</p>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="text-sm font-mono-jb font-bold text-white">{t.amount}</p>
                          <div className="mt-1 flex justify-end">
                            <span className={cn("text-[9px] font-mono-jb px-1.5 py-0.5 border rounded-sm", getTxnStatusColor(t.status))}>
                              {getTxnStatusTag(t.status)}
                            </span>
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-zinc-700 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>
    </>
  );
}
