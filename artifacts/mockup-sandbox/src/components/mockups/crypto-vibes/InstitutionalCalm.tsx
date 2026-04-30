import './_group.css';
import React, { useState } from 'react';
import {
  MOCK_BALANCE,
  MOCK_QUICK_STATS,
  MOCK_PORTFOLIO,
  MOCK_TXNS,
  MOCK_SESSIONS,
  NAV_ITEMS,
  Icon,
  MockTxn
} from './_baseline';

function cn(...c: (string | undefined | null | false)[]) {
  return c.filter(Boolean).join(' ');
}

// Institutional Calm specific helpers
function txnIconStyle(type: MockTxn['type']) {
  if (type === 'Withdrawal' || type === 'Send') {
    return <Icon><path d="M7 17L17 7M17 7H8M17 7v9" /></Icon>;
  }
  if (type === 'Deposit') {
    return <Icon><path d="M17 7L7 17M7 17h9M7 17V8" /></Icon>;
  }
  return <Icon><path d="M4 4l4 4-4 4M20 12l-4-4 4-4M4 8h12" /></Icon>;
}

export function InstitutionalCalm() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const activeId = 'dashboard';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
        
        .inst-theme {
          --inst-bg: #0B101E; /* Deep midnight navy */
          --inst-surface: #0F1626;
          --inst-border: #1C2438;
          --inst-text-main: #F4EFE6; /* Ivory/champagne */
          --inst-text-muted: #9AA4B8;
          --inst-accent: #C7A76D; /* Restrained gold/brass */
          --inst-accent-hover: #DBC08C;
        }
        
        .inst-root {
          background-color: var(--inst-bg);
          color: var(--inst-text-main);
          font-family: 'Inter', sans-serif;
          font-weight: 300;
        }

        .inst-serif {
          font-family: 'Playfair Display', serif;
        }

        .inst-border {
          border-color: var(--inst-border);
        }

        .inst-hairline-bottom {
          border-bottom: 1px solid var(--inst-border);
        }

        .inst-hairline-right {
          border-right: 1px solid var(--inst-border);
        }

        .inst-surface {
          background-color: var(--inst-surface);
        }

        /* Plaque buttons */
        .inst-plaque-btn {
          border: 1px solid var(--inst-border);
          color: var(--inst-accent);
          text-transform: uppercase;
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          transition: all 0.2s ease;
          background: transparent;
        }
        
        .inst-plaque-btn:hover {
          border-color: var(--inst-accent);
          color: var(--inst-accent-hover);
        }

        /* Nav links */
        .inst-nav-link {
          color: var(--inst-text-muted);
          transition: all 0.2s ease;
        }
        .inst-nav-link:hover {
          color: var(--inst-text-main);
        }
        .inst-nav-link.active {
          color: var(--inst-accent);
        }

        /* Scrollbar styling for a cleaner look */
        .inst-root ::-webkit-scrollbar {
          width: 6px;
        }
        .inst-root ::-webkit-scrollbar-track {
          background: transparent;
        }
        .inst-root ::-webkit-scrollbar-thumb {
          background: var(--inst-border);
          border-radius: 3px;
        }
      `}</style>

      <div className="inst-theme inst-root flex h-screen overflow-hidden antialiased">
        {mobileOpen && <div className="fixed inset-0 bg-black/80 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />}

        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:relative inset-y-0 left-0 z-30 w-64 flex flex-col inst-hairline-right inst-bg transition-transform duration-500 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "bg-[#0B101E]"
        )}>
          <div className="flex items-center gap-4 px-8 py-8">
            <div className="w-8 h-8 border border-[#C7A76D] flex items-center justify-center p-1">
              <div className="w-full h-full bg-[#C7A76D]" />
            </div>
            <div>
              <p className="inst-serif text-lg tracking-wide text-[#F4EFE6]">CryptoVault</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#9AA4B8] mt-1">Private Wealth</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {NAV_ITEMS.map(item => (
              <button key={item.id}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 text-xs tracking-wide",
                  activeId === item.id ? "text-[#C7A76D]" : "text-[#9AA4B8] hover:text-[#F4EFE6] transition-colors"
                )}>
                <span className="opacity-80">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-6 inst-hairline-top border-t border-[#1C2438]">
            <button className="w-full flex items-center gap-4 text-left group">
              <div className="w-8 h-8 border border-[#1C2438] flex items-center justify-center text-xs text-[#C7A76D] inst-serif">
                MC
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#F4EFE6] tracking-wide group-hover:text-[#C7A76D] transition-colors">Marisol Cheng</p>
                <p className="text-[10px] text-[#9AA4B8] mt-0.5">marisol@…</p>
              </div>
              <svg className="w-4 h-4 text-[#9AA4B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0B101E]">
          {/* Header */}
          <header className="flex items-center justify-between px-10 h-20 flex-shrink-0 inst-hairline-bottom border-b border-[#1C2438]">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 -ml-2 text-[#F4EFE6]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="hidden lg:block">
               {/* Optional breadcrumb or title could go here, keeping it clean */}
            </div>
            
            <div className="ml-auto flex items-center gap-8">
              <div className="flex items-center gap-2">
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                        className="text-xs tracking-wider bg-transparent border-none text-[#9AA4B8] hover:text-[#F4EFE6] cursor-pointer outline-none appearance-none">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="CHF">CHF</option>
                  <option value="GBP">GBP</option>
                </select>
                <svg className="w-3 h-3 text-[#9AA4B8] pointer-events-none -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" /></svg>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C7A76D]" />
                <span className="text-[9px] uppercase tracking-[0.15em] text-[#9AA4B8]">Markets Live</span>
              </div>
              
              <button className="relative text-[#9AA4B8] hover:text-[#F4EFE6] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-[#C7A76D]" />
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-10 lg:px-12 lg:py-12">
            <div className="max-w-5xl mx-auto space-y-12">
              
              {/* 1. Balance Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Hero Balance */}
                <div className="lg:col-span-2 flex flex-col justify-center">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#9AA4B8] mb-6">Total Portfolio Value</p>
                  <h1 className="inst-serif text-6xl lg:text-7xl font-normal text-[#F4EFE6] tracking-tight mb-4">
                    {MOCK_BALANCE.usdFormatted}
                  </h1>
                  <p className="text-sm tracking-wide text-[#9AA4B8] flex items-center gap-3">
                    <span className={MOCK_BALANCE.dailyChangePct >= 0 ? "text-[#C7A76D]" : "text-rose-400"}>
                      {MOCK_BALANCE.dailyChangePct >= 0 ? '+' : ''}${MOCK_BALANCE.dailyChangeUsd.toLocaleString()} 
                      ({MOCK_BALANCE.dailyChangePct >= 0 ? '+' : ''}{MOCK_BALANCE.dailyChangePct}%)
                    </span>
                    <span className="text-[#9AA4B8] text-xs">Today</span>
                  </p>
                  
                  <div className="flex flex-wrap gap-4 mt-12">
                    {['Send', 'Receive', 'Withdraw', 'Deposit'].map(a => (
                      <button key={a} className="inst-plaque-btn px-6 py-3 min-w-[120px]">
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-1 gap-6 border-l border-[#1C2438] pl-8">
                  {[
                    { label: '24h Volume', value: MOCK_QUICK_STATS.volume24h },
                    { label: 'Active Assets', value: String(MOCK_QUICK_STATS.activeAssets) },
                    { label: 'Pending', value: String(MOCK_QUICK_STATS.pending) },
                  ].map((s, i) => (
                    <div key={s.label} className={cn("py-2", i !== 0 && "border-t border-[#1C2438] pt-6")}>
                      <p className="text-[9px] uppercase tracking-[0.15em] text-[#9AA4B8] mb-2">{s.label}</p>
                      <p className="inst-serif text-2xl text-[#F4EFE6]">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Portfolio Assets */}
              <div className="pt-8 border-t border-[#1C2438]">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#9AA4B8] mb-6">Portfolio Assets</h3>
                <div className="border border-[#1C2438]">
                  {MOCK_PORTFOLIO.map(p => (
                    <div key={p.symbol} className="flex items-center gap-6 p-6 hover:bg-[#0F1626] transition-colors">
                      <div className="w-10 h-10 border border-[#C7A76D]/30 flex items-center justify-center text-[#C7A76D] inst-serif text-lg">
                        ₿
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-[#F4EFE6] tracking-wide mb-1">{p.name}</p>
                        <p className="text-[10px] uppercase tracking-[0.1em] text-[#9AA4B8]">{p.amount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-[#F4EFE6] tracking-wide mb-1">{p.value}</p>
                        <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: p.up ? '#C7A76D' : '#e17055' }}>
                          {p.change}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. & 4. Lower sections in a grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8 border-t border-[#1C2438]">
                
                {/* 3. Recent Activity */}
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#9AA4B8] mb-6">Recent Activity</h3>
                  <div className="border border-[#1C2438] divide-y divide-[#1C2438]">
                    {MOCK_SESSIONS.map(s => (
                      <div key={s.id} className="p-5 flex items-start gap-4 hover:bg-[#0F1626] transition-colors">
                        <div className="w-6 h-6 border border-[#1C2438] flex items-center justify-center text-[#9AA4B8] mt-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17l-5-5 5-5M4 12h16" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#F4EFE6] tracking-wide mb-1 flex items-center gap-3">
                            {s.device} 
                            {s.current && <span className="text-[8px] uppercase tracking-[0.1em] border border-[#C7A76D] text-[#C7A76D] px-1.5 py-0.5">Current</span>}
                          </p>
                          <p className="text-[10px] text-[#9AA4B8] tracking-wide">{s.location} · {s.ip}</p>
                        </div>
                        <p className="text-[10px] text-[#9AA4B8] tracking-wide text-right">{s.when}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Transaction History */}
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#9AA4B8] mb-6">Transaction History</h3>
                  <div className="border border-[#1C2438] divide-y divide-[#1C2438]">
                    {MOCK_TXNS.map(t => (
                      <div key={t.id} className="p-5 flex items-center gap-4 hover:bg-[#0F1626] transition-colors">
                        <div className="w-6 h-6 flex items-center justify-center text-[#9AA4B8]">
                          <span className="opacity-70 scale-75">{txnIconStyle(t.type)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#F4EFE6] tracking-wide mb-1">{t.type} · <span className="text-[#9AA4B8]">{t.address}</span></p>
                          <p className="text-[10px] text-[#9AA4B8] tracking-wide">{t.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[#F4EFE6] tracking-wide mb-1">{t.amount}</p>
                          <p className="text-[8px] uppercase tracking-[0.1em] text-[#9AA4B8]">{t.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </main>
        </div>
      </div>
    </>
  );
}
