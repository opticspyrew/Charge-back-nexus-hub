import './_group.css';
import { useState, useEffect } from 'react';
import { MOCK_STATS, MOCK_ACTIVITY, NAV_ITEMS } from './_baseline';

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// Activity severity mapping
function getEventSeverity(type: string) {
  if (type.includes('flagged')) return 'error';
  if (type.includes('pending') || type.includes('received')) return 'warn';
  return 'info';
}

function getEventColor(severity: string) {
  switch (severity) {
    case 'error': return 'text-red-500';
    case 'warn': return 'text-amber-500';
    default: return 'text-emerald-500';
  }
}

export function OperatorsConsole() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeId = 'overview';
  
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
        .font-mono-jb { font-family: 'JetBrains Mono', monospace; }
        .op-bg { background-color: #09090b; color: #a1a1aa; }
        .op-text { color: #e4e4e7; }
        .op-border { border-color: #27272a; }
        .op-sidebar { background-color: #000000; }
        .op-card { background-color: #000000; border: 1px solid #27272a; border-radius: 2px; }
        .led-green { box-shadow: 0 0 6px 1px rgba(16, 185, 129, 0.6); }
        .scanlines {
          background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1));
          background-size: 100% 4px;
        }
      `}</style>
      
      <div className="font-sans antialiased flex h-screen op-bg overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none scanlines z-50 opacity-20"></div>

        {mobileOpen && <div className="fixed inset-0 bg-black/80 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />}
        
        <aside className={cn(
          "fixed lg:relative inset-y-0 left-0 z-30 w-56 op-sidebar border-r op-border flex flex-col transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <div className="flex flex-col gap-1 px-4 py-5 border-b op-border">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-emerald-500 led-green rounded-none"></div>
              <span className="text-xs font-mono-jb font-bold text-white uppercase tracking-widest">SYS_ADMIN</span>
            </div>
            <p className="text-[10px] font-mono-jb text-zinc-500 uppercase tracking-wider">Firm Dashboard v2.4.1</p>
          </div>
          
          <nav className="flex-1 px-2 py-3 space-y-1">
            {NAV_ITEMS.map(item => {
              const isActive = activeId === item.id;
              return (
                <button key={item.id}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-[2px] text-xs font-mono-jb uppercase tracking-wider transition-all text-left",
                    isActive ? "bg-zinc-900 text-emerald-400 border border-zinc-800" : "text-zinc-500 border border-transparent hover:text-zinc-300 hover:bg-zinc-900/50"
                  )}>
                  <span className="opacity-50">[{item.id.charAt(0)}]</span>
                  {item.label}
                </button>
              );
            })}
          </nav>
          
          <div className="p-3 border-t op-border">
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-[2px] text-xs font-mono-jb uppercase tracking-wider text-red-500/80 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20">
              <span>Sign Out</span>
              <span>[X]</span>
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex items-center justify-between px-6 h-12 bg-black border-b op-border flex-shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-1.5 rounded-[2px] text-zinc-400 hover:bg-zinc-800 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <div className="hidden md:block">
                <span className="text-[10px] font-mono-jb text-zinc-500">CURRENT_TIME:</span>
                <span className="ml-2 text-[11px] font-mono-jb text-zinc-300">{formatTime(currentTime)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2 py-1 bg-emerald-950/30 border border-emerald-900/50 rounded-[2px]">
                <span className="w-1.5 h-1.5 bg-emerald-500 led-green animate-pulse" />
                <span className="text-[10px] font-mono-jb text-emerald-500 uppercase tracking-widest">Monitoring Active</span>
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="space-y-6 max-w-6xl mx-auto">
              
              <div className="flex items-end justify-between border-b op-border pb-2">
                <div>
                  <h2 className="text-sm font-mono-jb text-white uppercase tracking-widest">Global Overview</h2>
                  <p className="text-[10px] font-mono-jb text-zinc-500 uppercase mt-1">/status/summary_metrics</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard 
                  label="Total Clients" 
                  value={MOCK_STATS.totalClients} 
                  icon="CLNT_TOT"
                />
                <StatCard 
                  label="Pending Clients" 
                  value={MOCK_STATS.pendingClients} 
                  icon="CLNT_PND"
                  highlight="warn"
                />
                <StatCard 
                  label="Total Requests" 
                  value={MOCK_STATS.totalRequests} 
                  icon="REQ_TOT"
                />
                <StatCard 
                  label="Pending Requests" 
                  value={MOCK_STATS.pendingRequests} 
                  icon="REQ_PND"
                  highlight="warn"
                />
              </div>
              
              <div className="op-card mt-4">
                <div className="px-4 py-2 border-b op-border bg-zinc-950/50 flex justify-between items-center">
                  <h3 className="text-xs font-mono-jb text-zinc-300 uppercase tracking-widest">Event Log</h3>
                  <span className="text-[10px] font-mono-jb text-zinc-500">tail -n 6 /var/log/events.log</span>
                </div>
                <div className="divide-y op-border">
                  {MOCK_ACTIVITY.map(a => {
                    const severity = getEventSeverity(a.eventType);
                    return (
                      <div key={a.id} className="px-4 py-2 flex items-start gap-4 hover:bg-zinc-900/30 transition-colors group">
                        <div className="flex-shrink-0 w-36 pt-[3px]">
                          <p className="text-[11px] font-mono-jb text-zinc-500 group-hover:text-zinc-400">
                            {a.createdAt.replace('T', ' ').replace('Z', '')}
                          </p>
                        </div>
                        <div className="flex-shrink-0 pt-[4px]">
                          <div className={cn("w-1.5 h-1.5 rounded-none", severity === 'error' ? 'bg-red-500' : severity === 'warn' ? 'bg-amber-500' : 'bg-emerald-500')}></div>
                        </div>
                        <div className="flex-shrink-0 w-32 pt-[2px]">
                          <p className={cn("text-[10px] font-mono-jb uppercase tracking-wider", getEventColor(severity))}>
                            [{a.eventType}]
                          </p>
                        </div>
                        <div className="flex-1 min-w-0 pt-[1px]">
                          <p className="text-[12px] font-mono-jb text-zinc-300 truncate">
                            {a.description}
                          </p>
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

function StatCard({ label, value, icon, highlight }: { label: string; value: number; icon: string; highlight?: 'warn' | 'error' }) {
  return (
    <div className="op-card p-4 relative overflow-hidden group hover:border-zinc-700 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-mono-jb text-zinc-600 uppercase">{icon}</span>
        {highlight === 'warn' && <div className="w-1 h-1 bg-amber-500"></div>}
        {highlight === 'error' && <div className="w-1 h-1 bg-red-500"></div>}
      </div>
      <div className="border-t border-zinc-800 pt-2">
        <p className={cn(
          "text-2xl font-mono-jb font-bold",
          highlight === 'warn' ? 'text-amber-400' : highlight === 'error' ? 'text-red-400' : 'text-zinc-100'
        )}>
          {value.toString().padStart(4, '0')}
        </p>
        <p className="text-[10px] font-mono-jb text-zinc-500 uppercase tracking-widest mt-1">
          {label}
        </p>
      </div>
    </div>
  );
}
