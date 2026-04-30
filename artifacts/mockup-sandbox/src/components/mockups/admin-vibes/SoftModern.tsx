import './_group.css';
import { useState } from 'react';
import { MOCK_STATS, MOCK_ACTIVITY, NAV_ITEMS, eventIcon } from './_baseline';

function cn(...c: (string | undefined | null | false)[]) {
  return c.filter(Boolean).join(' ');
}

const STAT_THEMES = [
  {
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-100',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    bg: 'bg-orange-50/50',
    border: 'border-orange-100',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-500',
  },
  {
    bg: 'bg-indigo-50/50',
    border: 'border-indigo-100',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-500',
  },
  {
    bg: 'bg-rose-50/50',
    border: 'border-rose-100',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-500',
  },
];

function getEventTheme(type: string) {
  if (type.includes('client')) return 'border-emerald-200 bg-emerald-50/30';
  if (type.includes('request.flagged')) return 'border-rose-200 bg-rose-50/30';
  if (type.includes('request')) return 'border-indigo-200 bg-indigo-50/30';
  return 'border-slate-200 bg-slate-50/30';
}

export function SoftModern() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeId = 'overview';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>
      <div className="font-jakarta antialiased flex h-screen bg-slate-50/50 text-slate-800 overflow-hidden relative">
        {/* Soft background gradient washes */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

        {mobileOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-20 lg:hidden" onClick={() => setMobileOpen(false)} />}
        
        <aside className={cn(
          "fixed lg:relative inset-y-0 left-0 z-30 w-[260px] bg-white/60 backdrop-blur-md border-r border-slate-200/60 flex flex-col transition-transform duration-300 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <div className="flex items-center gap-3 px-8 py-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-slate-800 tracking-tight">Admin Portal</p>
              <p className="text-xs font-medium text-slate-500">Firm Dashboard</p>
            </div>
          </div>
          
          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
            {NAV_ITEMS.map(item => {
              const isActive = activeId === item.id;
              return (
                <button key={item.id}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-semibold transition-all duration-200",
                    isActive 
                      ? "bg-white text-indigo-600 shadow-sm border border-slate-100" 
                      : "text-slate-500 hover:bg-white/50 hover:text-slate-700 border border-transparent"
                  )}>
                  <div className={cn("transition-transform duration-200", isActive && "scale-110")}>
                    {item.icon}
                  </div>
                  {item.label}
                </button>
              );
            })}
          </nav>
          
          <div className="p-4 mb-4">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[15px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all duration-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sign Out
            </button>
          </div>
        </aside>
        
        <div className="flex-1 flex flex-col min-w-0 z-10 relative">
          <header className="flex items-center justify-between px-8 md:px-12 h-20 flex-shrink-0">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="ml-auto">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </div>
                <span className="text-xs font-bold tracking-wide text-slate-600 uppercase">Monitoring Active</span>
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto px-8 md:px-12 pb-12">
            <div className="max-w-6xl mx-auto space-y-10">
              
              <div className="pt-4">
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Overview</h2>
                <p className="text-base text-slate-500 font-medium mt-1">Dashboard summary and recent activity</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Clients" value={MOCK_STATS.totalClients} theme={STAT_THEMES[0]} icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
                <StatCard label="Pending Clients" value={MOCK_STATS.pendingClients} theme={STAT_THEMES[1]} icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <StatCard label="Total Requests" value={MOCK_STATS.totalRequests} theme={STAT_THEMES[2]} icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
                <StatCard label="Pending Requests" value={MOCK_STATS.pendingRequests} theme={STAT_THEMES[3]} icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
              </div>
              
              <div className="bg-white rounded-3xl p-2 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100">
                <div className="px-6 py-6 border-b border-slate-100/80">
                  <h3 className="font-bold text-lg text-slate-800">Recent Activity</h3>
                </div>
                <div className="p-4 space-y-3">
                  {MOCK_ACTIVITY.map(a => {
                    const theme = getEventTheme(a.eventType);
                    return (
                      <div key={a.id} className={cn("group flex items-center gap-4 p-4 rounded-2xl border-l-4 transition-colors hover:bg-slate-50", theme)}>
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-105 transition-transform">
                          {eventIcon(a.eventType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-medium text-slate-700">{a.description}</p>
                          <p className="text-xs font-semibold text-slate-400 mt-1">{new Date(a.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, theme, icon }: { label: string; value: number; theme: any; icon: React.ReactNode }) {
  return (
    <div className={cn("relative overflow-hidden bg-white rounded-3xl p-6 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border transition-transform hover:-translate-y-1 duration-300", theme.border)}>
      <div className="flex flex-col gap-5">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner", theme.iconBg, theme.iconColor)}>
          {icon}
        </div>
        <div>
          <p className="text-4xl font-extrabold text-slate-800 tracking-tight">{value}</p>
          <p className="text-sm font-semibold text-slate-500 mt-1">{label}</p>
        </div>
      </div>
    </div>
  );
}
