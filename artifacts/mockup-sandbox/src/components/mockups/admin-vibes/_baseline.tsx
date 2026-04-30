import './_group.css';
import { useState } from 'react';

function cn(...c: (string | undefined | null | false)[]) {
  return c.filter(Boolean).join(' ');
}

export const MOCK_STATS = {
  totalClients: 142,
  pendingClients: 7,
  totalRequests: 318,
  pendingRequests: 12,
};

export interface MockActivity {
  id: number;
  eventType: string;
  description: string;
  createdAt: string;
}

export const MOCK_ACTIVITY: MockActivity[] = [
  { id: 1, eventType: 'client.created', description: "New client onboarded — Marisol Cheng (KYC pending)", createdAt: '2026-04-30T10:42:00Z' },
  { id: 2, eventType: 'request.approved', description: "Withdrawal request #318 approved — 0.42 BTC to bc1q…7snm", createdAt: '2026-04-30T10:18:00Z' },
  { id: 3, eventType: 'client.updated', description: "Tier upgrade for Aaron Bell — Standard → Priority", createdAt: '2026-04-30T09:55:00Z' },
  { id: 4, eventType: 'request.flagged', description: "Manual review flagged for request #316 — velocity threshold", createdAt: '2026-04-30T09:33:00Z' },
  { id: 5, eventType: 'request.received', description: "Inbound request #318 — Marisol Cheng (0.42 BTC)", createdAt: '2026-04-30T09:21:00Z' },
  { id: 6, eventType: 'client.created', description: "New client onboarded — Liana Park", createdAt: '2026-04-30T08:47:00Z' },
];

export const NAV_ITEMS: { id: string; label: string; path: string; icon: React.ReactNode }[] = [
  { id: 'overview',  label: 'Overview',  path: '/',         icon: <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></Icon> },
  { id: 'clients',   label: 'Clients',   path: '/clients',  icon: <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></Icon> },
  { id: 'requests',  label: 'Requests',  path: '/requests', icon: <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></Icon> },
  { id: 'activity',  label: 'Activity',  path: '/activity', icon: <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></Icon> },
  { id: 'users',     label: 'Users',     path: '/users',    icon: <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></Icon> },
  { id: 'wallets',   label: 'Wallets',   path: '/wallets',  icon: <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></Icon> },
];

export function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{children}</svg>
  );
}

export function eventIcon(type: string): string {
  if (type.includes('client')) return '👤';
  if (type.includes('request')) return '📋';
  return '📌';
}

/**
 * Baseline structure of the admin Overview page, lifted from the real app:
 *   - Fixed left sidebar with logo + nav + Sign Out
 *   - Top bar with mobile-menu trigger + "Monitoring Active" status pill
 *   - Page header (title + subtitle)
 *   - 4-up stat card grid
 *   - "Recent Activity" list
 *
 * Variants must keep this structure intact and re-style the visual layer.
 * The default export renders the current production aesthetic.
 */
export function Baseline() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeId = 'overview';

  return (
    <div className="font-sans antialiased flex h-screen bg-background overflow-hidden text-foreground" style={{ fontFamily: 'var(--app-font-sans)' }}>
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cn("fixed lg:relative inset-y-0 left-0 z-30 w-56 bg-sidebar flex flex-col transition-transform duration-300", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")} style={{ background: 'hsl(var(--sidebar))', color: 'hsl(var(--sidebar-foreground))' }}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--primary))' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <div>
            <p className="text-sm font-bold">Admin Portal</p>
            <p className="text-xs opacity-50">Firm Dashboard</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button key={item.id}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                activeId === item.id ? "bg-[hsl(var(--sidebar-accent))] text-white" : "opacity-70 hover:bg-[hsl(var(--sidebar-accent))]/60 hover:opacity-100")}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-[hsl(var(--sidebar-accent))]/60 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign Out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 h-14 bg-card border-b border-card-border flex-shrink-0" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--card-border))' }}>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors">
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-600">Monitoring Active</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Overview</h2>
              <p className="text-sm opacity-60">Dashboard summary and recent activity</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Clients"    value={MOCK_STATS.totalClients}    color="bg-blue-100"   icon={<svg className="w-6 h-6 text-blue-600"   fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
              <StatCard label="Pending Clients"  value={MOCK_STATS.pendingClients}  color="bg-amber-100"  icon={<svg className="w-6 h-6 text-amber-600"  fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <StatCard label="Total Requests"   value={MOCK_STATS.totalRequests}   color="bg-purple-100" icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
              <StatCard label="Pending Requests" value={MOCK_STATS.pendingRequests} color="bg-red-100"    icon={<svg className="w-6 h-6 text-red-600"    fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
            </div>
            <div className="bg-card border border-card-border rounded-xl" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--card-border))' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                <h3 className="font-semibold text-sm">Recent Activity</h3>
              </div>
              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {MOCK_ACTIVITY.map(a => (
                  <div key={a.id} className="px-5 py-3.5 flex items-start gap-3" style={{ borderTopColor: 'hsl(var(--border))' }}>
                    <span className="text-lg flex-shrink-0 mt-0.5">{eventIcon(a.eventType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{a.description}</p>
                      <p className="text-xs opacity-60 mt-0.5">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
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

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--card-border))' }}>
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", color)}>{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs opacity-60 font-medium">{label}</p>
      </div>
    </div>
  );
}
