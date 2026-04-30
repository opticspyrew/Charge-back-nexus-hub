import './_group.css';
import { useState } from 'react';
import { MOCK_STATS, MOCK_ACTIVITY, NAV_ITEMS, eventIcon } from './_baseline';

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function QuietEditorial() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeId = 'overview';

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
          
          .font-serif {
            font-family: 'Cormorant Garamond', serif;
          }
          .font-sans {
            font-family: 'Inter', sans-serif;
          }
          
          .bg-editorial-paper {
            background-color: #F9F8F6;
          }
          .text-editorial-ink {
            color: #2C2A29;
          }
          .text-editorial-muted {
            color: #7A7571;
          }
          .border-editorial-hairline {
            border-color: #EAE8E5;
          }
          .border-editorial-dark {
            border-color: #D4D2CF;
          }
          .bg-editorial-sidebar {
            background-color: #F4F2EE;
          }
          
          /* Custom scrollbar for webkit to match the vibe */
          ::-webkit-scrollbar {
            width: 4px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background: #EAE8E5;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #D4D2CF;
          }
        `}
      </style>
      
      <div className="font-sans antialiased flex h-screen bg-editorial-paper text-editorial-ink overflow-hidden selection:bg-[#EAE8E5] selection:text-[#2C2A29]">
        {mobileOpen && <div className="fixed inset-0 bg-[#2C2A29]/20 z-20 lg:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />}
        
        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:relative inset-y-0 left-0 z-30 w-64 bg-editorial-sidebar flex flex-col transition-transform duration-500 ease-out border-r border-editorial-hairline",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <div className="flex items-center justify-center pt-12 pb-10 border-b border-editorial-hairline mx-8">
            <div className="text-center">
              <h1 className="font-serif text-2xl font-medium tracking-tight">Admin Portal</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-editorial-muted mt-2">Firm Dashboard</p>
            </div>
          </div>
          
          <nav className="flex-1 px-6 py-8 flex flex-col gap-1">
            {NAV_ITEMS.map(item => {
              const isActive = activeId === item.id;
              return (
                <button 
                  key={item.id}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 text-[13px] tracking-wide transition-all duration-300 relative group",
                    isActive ? "text-editorial-ink font-medium" : "text-editorial-muted hover:text-editorial-ink"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 w-0.5 h-4 bg-editorial-ink" />
                  )}
                  <span className={cn("transition-transform duration-300", isActive ? "translate-x-1" : "group-hover:translate-x-1")}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
          
          <div className="px-8 pb-8 pt-6">
            <button className="flex items-center gap-3 text-[13px] tracking-wide text-editorial-muted hover:text-editorial-ink transition-colors duration-300">
              <span>Sign Out</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Topbar */}
          <header className="flex items-center justify-between px-10 h-20 flex-shrink-0">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-editorial-ink">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="hidden lg:block" /> {/* Spacer */}
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.15em] text-editorial-muted">
              <span>Monitoring Active</span>
              <span className="w-1.5 h-1.5 rounded-full bg-editorial-ink/40" />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-6 sm:px-12 lg:px-20 pb-20">
            <div className="max-w-5xl mx-auto space-y-16">
              
              {/* Page Header */}
              <div className="pt-4 border-b border-editorial-hairline pb-8">
                <h2 className="font-serif text-5xl font-normal text-editorial-ink">Overview</h2>
                <p className="text-[13px] tracking-wide text-editorial-muted mt-4 font-light">Dashboard summary & recent activity ledger.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-12">
                <StatItem label="Total Clients" value={MOCK_STATS.totalClients} />
                <StatItem label="Pending Clients" value={MOCK_STATS.pendingClients} />
                <StatItem label="Total Requests" value={MOCK_STATS.totalRequests} />
                <StatItem label="Pending Requests" value={MOCK_STATS.pendingRequests} />
              </div>

              {/* Activity Ledger */}
              <div className="pt-8">
                <div className="flex items-baseline justify-between border-b border-editorial-dark pb-4 mb-6">
                  <h3 className="text-[11px] uppercase tracking-[0.2em] font-medium text-editorial-ink">Recent Activity</h3>
                  <span className="text-[11px] uppercase tracking-[0.15em] text-editorial-muted">April 2026</span>
                </div>
                
                <div className="space-y-0">
                  {MOCK_ACTIVITY.map((a, i) => (
                    <div 
                      key={a.id} 
                      className={cn(
                        "py-5 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 group hover:bg-editorial-sidebar/30 transition-colors px-2 -mx-2",
                        i !== MOCK_ACTIVITY.length - 1 ? "border-b border-editorial-hairline" : ""
                      )}
                    >
                      <div className="w-32 flex-shrink-0 text-[12px] tabular-nums tracking-wider text-editorial-muted pt-0.5">
                        {new Date(a.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                      <div className="flex-1 text-[14px] leading-relaxed font-light text-editorial-ink">
                        {a.description}
                      </div>
                      <div className="w-32 flex-shrink-0 text-right text-[10px] uppercase tracking-[0.15em] text-editorial-muted pt-1">
                        {a.eventType.replace('.', ' ')}
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

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col relative">
      <span className="text-[10px] uppercase tracking-[0.2em] text-editorial-muted mb-4">{label}</span>
      <div className="font-serif text-5xl sm:text-6xl font-light text-editorial-ink tabular-nums tracking-tight">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
