import './_group.css';
import { useState } from 'react';
import { MOCK_BALANCE, MOCK_QUICK_STATS, MOCK_PORTFOLIO, MOCK_TXNS, MOCK_SESSIONS, NAV_ITEMS } from './_baseline';

function cn(...c: (string | undefined | null | false)[]) {
  return c.filter(Boolean).join(' ');
}

// Sparkle icon for daily delta
function Sparkle() {
  return (
    <svg className="w-3.5 h-3.5 text-orange-400 inline-block mr-1" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L13.8 8.6L20 10.4L14.6 14.2L16.4 20.8L12 17L7.6 20.8L9.4 14.2L4 10.4L10.2 8.6L12 2Z" />
    </svg>
  );
}

// Custom icons that feel softer
function SoftIcon({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <svg className={cn("w-5 h-5", className)} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function txnIconSoft(type: string) {
  if (type === 'Withdrawal' || type === 'Send') {
    return <SoftIcon className="text-purple-500"><path d="M7 17L17 7M17 7H8M17 7v9" /></SoftIcon>;
  }
  if (type === 'Deposit') {
    return <SoftIcon className="text-teal-500"><path d="M17 7L7 17M7 17h9M7 17V8" /></SoftIcon>;
  }
  return <SoftIcon className="text-blue-500"><path d="M4 4l4 4-4 4M20 12l-4-4 4-4M4 8h12" /></SoftIcon>;
}

function statusColorSoft(s: string) {
  switch (s) {
    case 'Completed':     return 'bg-teal-50 text-teal-700';
    case 'Pending':       return 'bg-orange-50 text-orange-700';
    case 'Processing':    return 'bg-blue-50 text-blue-700';
    case 'Investigation': return 'bg-rose-50 text-rose-700';
    default:              return 'bg-gray-50 text-gray-700';
  }
}

export function SoftConcierge() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const activeId = 'dashboard';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .soft-concierge-theme {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background-color: #f8f7fa;
          color: #2d2936;
        }
        .soft-shadow {
          box-shadow: 0 8px 30px rgba(100, 90, 120, 0.04), 0 4px 10px rgba(100, 90, 120, 0.02);
        }
        .soft-gradient-bg {
          background: linear-gradient(135deg, #fff2eb 0%, #f4effc 100%);
        }
        .soft-card {
          background-color: #ffffff;
          border-radius: 1.5rem; /* 24px */
        }
        .soft-chip {
          border-radius: 9999px;
        }
      `}</style>
      
      <div className="soft-concierge-theme flex h-screen overflow-hidden">
        {mobileOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-20 lg:hidden" onClick={() => setMobileOpen(false)} />}

        <aside className={cn("fixed lg:relative inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300 bg-[#fdfcfd] border-r border-purple-100/50",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
          <div className="flex items-center gap-3 px-6 py-6">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-purple-200 to-pink-200 text-purple-700 shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight text-gray-800">CryptoVault</p>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-2 space-y-1.5">
            {NAV_ITEMS.map(item => {
              const isActive = activeId === item.id;
              return (
                <button key={item.id}
                  className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all text-left",
                    isActive
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800")}>
                  <SoftIcon className={isActive ? "text-purple-600" : "text-gray-400"}>{item.icon.props.children}</SoftIcon>
                  {item.label}
                </button>
              );
            })}
          </nav>
          
          <div className="p-4 mt-auto mb-2">
            <button className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-gray-50 transition-colors border border-gray-100/50 bg-white soft-shadow">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-orange-100 text-orange-700">
                MC
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">Marisol Cheng</p>
                <p className="text-xs text-gray-400 font-medium truncate">marisol@…</p>
              </div>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f7fa]">
          <header className="flex items-center justify-between px-8 h-20 flex-shrink-0">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 -ml-2 rounded-xl text-gray-600 hover:bg-gray-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="ml-auto flex items-center gap-4">
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                      className="text-sm font-bold px-4 py-2 rounded-full border-none bg-white text-gray-700 soft-shadow appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-purple-200">
                <option>USD</option><option>EUR</option><option>CHF</option><option>GBP</option>
              </select>
              
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 soft-shadow">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-sm font-bold text-teal-700">Live prices</span>
              </div>
              
              <button className="w-10 h-10 rounded-full bg-white soft-shadow flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors relative">
                <SoftIcon><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></SoftIcon>
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-pink-500 border-2 border-white" />
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-8 pt-0">
            <div className="max-w-5xl mx-auto space-y-8 pb-12">

              {/* 1. Balance Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-[2rem] p-8 soft-gradient-bg soft-shadow relative overflow-hidden">
                  <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/40 blur-3xl rounded-full pointer-events-none" />
                  <div className="relative z-10">
                    <p className="text-sm font-bold text-gray-500 mb-2">Total Portfolio Value</p>
                    <p className="text-5xl font-extrabold text-gray-800 tracking-tight">{MOCK_BALANCE.usdFormatted}</p>
                    <p className="text-base font-bold mt-2 text-gray-600 flex items-center">
                      <Sparkle />
                      <span className={MOCK_BALANCE.dailyChangePct >= 0 ? 'text-teal-600' : 'text-rose-500'}>
                        +${MOCK_BALANCE.dailyChangeUsd.toLocaleString()} (+{MOCK_BALANCE.dailyChangePct}%)
                      </span>
                      <span className="ml-1 opacity-70">today</span>
                    </p>
                    
                    <div className="flex flex-wrap gap-3 mt-8">
                      {[
                        { label: 'Send', icon: <path d="M7 17L17 7M17 7H8M17 7v9" />, bg: 'bg-purple-100 text-purple-700', hover: 'hover:bg-purple-200' },
                        { label: 'Receive', icon: <path d="M17 7L7 17M7 17h9M7 17V8" />, bg: 'bg-teal-100 text-teal-700', hover: 'hover:bg-teal-200' },
                        { label: 'Withdraw', icon: <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />, bg: 'bg-orange-100 text-orange-700', hover: 'hover:bg-orange-200' },
                        { label: 'Deposit', icon: <path d="M12 4v16m8-8H4" />, bg: 'bg-blue-100 text-blue-700', hover: 'hover:bg-blue-200' }
                      ].map(a => (
                        <button key={a.label} className={cn("flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm transition-colors", a.bg, a.hover)}>
                          <SoftIcon className="w-4 h-4">{a.icon}</SoftIcon>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: '24h Volume', value: MOCK_QUICK_STATS.volume24h, bg: 'bg-purple-50', text: 'text-purple-800', labelCol: 'text-purple-600/70' },
                    { label: 'Active Assets', value: String(MOCK_QUICK_STATS.activeAssets), bg: 'bg-teal-50', text: 'text-teal-800', labelCol: 'text-teal-600/70' },
                    { label: 'Pending', value: String(MOCK_QUICK_STATS.pending), bg: 'bg-orange-50', text: 'text-orange-800', labelCol: 'text-orange-600/70' },
                  ].map(s => (
                    <div key={s.label} className={cn("rounded-3xl p-6 soft-shadow flex flex-col justify-center", s.bg)}>
                      <p className={cn("text-sm font-bold mb-1", s.labelCol)}>{s.label}</p>
                      <p className={cn("text-2xl font-extrabold", s.text)}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Portfolio Assets */}
              <div>
                <h3 className="text-lg font-extrabold text-gray-800 mb-4 px-2">Portfolio Assets</h3>
                <div className="soft-card soft-shadow p-2">
                  {MOCK_PORTFOLIO.map(p => (
                    <div key={p.symbol} className="flex items-center gap-4 p-4 rounded-[1.25rem] bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl bg-orange-100 text-orange-500">
                        ₿
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-extrabold text-gray-800">{p.name}</p>
                        <p className="text-sm font-bold text-gray-400">{p.amount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-extrabold text-gray-800">{p.value}</p>
                        <p className={cn("text-sm font-bold", p.up ? "text-teal-500" : "text-rose-500")}>{p.change}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Recent Activity */}
              <div>
                <h3 className="text-lg font-extrabold text-gray-800 mb-4 px-2">Recent activity</h3>
                <div className="soft-card soft-shadow p-2 space-y-1">
                  {MOCK_SESSIONS.map(s => (
                    <div key={s.id} className="flex items-center gap-4 p-4 rounded-[1.25rem] hover:bg-gray-50 transition-colors">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-50 text-blue-500">
                        <SoftIcon><path d="M9 17l-5-5 5-5M4 12h16" /></SoftIcon>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-gray-800 truncate">{s.device}</p>
                          {s.current && (
                            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 rounded-full bg-teal-100 text-teal-700">
                              This device
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-400 truncate mt-0.5">{s.location} · {s.ip}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-400 shrink-0">{s.when}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Transaction History */}
              <div>
                <h3 className="text-lg font-extrabold text-gray-800 mb-4 px-2">Transaction History</h3>
                <div className="soft-card soft-shadow p-2 space-y-1">
                  {MOCK_TXNS.map(t => (
                    <div key={t.id} className="flex items-center gap-4 p-4 rounded-[1.25rem] hover:bg-gray-50 transition-colors group cursor-pointer">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-50 group-hover:bg-white transition-colors">
                        {txnIconSoft(t.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-gray-800 truncate">
                          {t.type} <span className="text-gray-300 font-bold mx-1">·</span> <span className="text-gray-500 font-semibold">{t.address}</span>
                        </p>
                        <p className="text-sm font-bold text-gray-400 mt-0.5">{t.date}</p>
                      </div>
                      <div className="text-right mr-2">
                        <p className="text-base font-extrabold text-gray-800">{t.amount}</p>
                        <div className="mt-1 flex justify-end">
                          <span className={cn("text-xs font-extrabold px-2.5 py-0.5 soft-chip", statusColorSoft(t.status))}>
                            {t.status}
                          </span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
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
