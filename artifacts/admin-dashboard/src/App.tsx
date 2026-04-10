import { useState, useEffect, createContext, useContext } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { api, getToken, setToken, clearToken, type Client, type ServiceRequest, type Activity } from "@/lib/api";

interface AuthCtx { token: string | null; login: (t: string) => void; logout: () => void; }
const AuthContext = createContext<AuthCtx>({ token: null, login: () => {}, logout: () => {} });
function useAuth() { return useContext(AuthContext); }

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTok] = useState<string | null>(getToken);
  const login = (t: string) => { setToken(t); setTok(t); };
  const logout = () => { clearToken(); setTok(null); };
  return <AuthContext.Provider value={{ token, login, logout }}>{children}</AuthContext.Provider>;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { token } = useAuth();
  return token ? <Component /> : <Redirect to="/login" />;
}

function cn(...c: (string | undefined | null | false)[]) { return c.filter(Boolean).join(" "); }

function Badge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    denied: "bg-red-100 text-red-800 border-red-200",
    active: "bg-blue-100 text-blue-800 border-blue-200",
    withdrawal: "bg-purple-100 text-purple-800 border-purple-200",
    payment: "bg-blue-100 text-blue-800 border-blue-200",
    other: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return (
    <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full border", styles[status] || styles.other)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card border border-card-border rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, required, ...props }: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1">{label}{required && <span className="text-destructive ml-0.5">*</span>}</label>
      <input className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" {...props} />
    </div>
  );
}

function Select({ label, children, ...props }: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
      <select className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" {...props}>{children}</select>
    </div>
  );
}

function Textarea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
      <textarea className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" rows={3} {...props} />
    </div>
  );
}

function LoginPage() {
  const { login } = useAuth();
  const [, nav] = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { token } = await api.login(form.username, form.password);
      login(token);
      nav("/");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-7 h-7 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Firm Admin Portal</h1>
          <p className="text-slate-400 text-sm mt-1">Internal dashboard — authorized access only</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-xl space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Admin Username</label>
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Enter admin username" required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Enter password" required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-60">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-center text-xs text-slate-500 mt-4">© 2026 Firm Admin System. All rights reserved.</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", color)}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
    </div>
  );
}

function OverviewPage() {
  const [stats, setStats] = useState<{ totalClients: number; pendingClients: number; totalRequests: number; pendingRequests: number; recentActivity: Activity[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  function eventIcon(type: string) {
    if (type.includes("client")) return "👤";
    if (type.includes("request")) return "📋";
    return "📌";
  }

  if (loading) return <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Overview</h2>
        <p className="text-sm text-muted-foreground">Dashboard summary and recent activity</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={stats?.totalClients || 0} color="bg-blue-100" icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
        <StatCard label="Pending Clients" value={stats?.pendingClients || 0} color="bg-amber-100" icon={<svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard label="Total Requests" value={stats?.totalRequests || 0} color="bg-purple-100" icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
        <StatCard label="Pending Requests" value={stats?.pendingRequests || 0} color="bg-red-100" icon={<svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
      </div>
      <div className="bg-card border border-card-border rounded-xl">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Recent Activity</h3>
        </div>
        <div className="divide-y divide-border">
          {(stats?.recentActivity || []).length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">No activity yet</p>
          ) : stats?.recentActivity.map(a => (
            <div key={a.id} className="px-5 py-3.5 flex items-start gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">{eventIcon(a.eventType)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{a.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", notes: "" });
  const [editStatus, setEditStatus] = useState("pending");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => api.getClients().then(r => setClients(r.clients)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg("");
    try {
      const r = await api.createClient(form);
      setMsg(r.emailSent ? "✓ Client added. Notification email sent." : "✓ Client added. (Email not configured — check SMTP_USER & SMTP_PASS env vars)");
      setShowAdd(false); setForm({ name: "", email: "", phone: "", company: "", notes: "" });
      load();
    } catch (err: any) { setMsg(`Error: ${err.message}`); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!showEdit) return;
    setSaving(true);
    try {
      await api.updateClient(showEdit.id, { status: editStatus, notes: editNotes });
      setShowEdit(null); load();
    } catch (err: any) { setMsg(`Error: ${err.message}`); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Clients</h2>
          <p className="text-sm text-muted-foreground">Manage registered firm clients</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Client
        </button>
      </div>
      {msg && <div className={cn("p-3 rounded-lg text-sm border", msg.startsWith("Error") ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>{msg}</div>}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                {["Name", "Email", "Phone", "Company", "Status", "Registered", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">No clients yet. Add your first client above.</td></tr>
              ) : clients.map(c => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">{c.name.charAt(0).toUpperCase()}</div><span className="text-sm font-medium text-foreground">{c.name}</span></div></td>
                  <td className="px-4 py-3 text-sm text-foreground">{c.email}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{c.company || "—"}</td>
                  <td className="px-4 py-3"><Badge status={c.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setShowEdit(c); setEditStatus(c.status); setEditNotes(c.notes || ""); }} className="text-xs font-medium text-primary hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Client">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Full Name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. John Smith" />
          <Input label="Email Address" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555-0000" />
            <Input label="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Corp" />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
          <p className="text-xs text-muted-foreground">An approval notification will be sent to Opticapycrew@gmail.com automatically.</p>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm font-medium text-foreground bg-muted border border-border rounded-lg hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">{saving ? "Adding..." : "Add Client"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title={`Edit Client — ${showEdit?.name}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          <Select label="Status" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </Select>
          <Textarea label="Admin Notes" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Internal notes..." />
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={() => setShowEdit(null)} className="px-4 py-2 text-sm font-medium text-foreground bg-muted border border-border rounded-lg hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function RequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ clientId: "", type: "withdrawal", amount: "", currency: "USD", notes: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    Promise.all([api.getRequests(), api.getClients()])
      .then(([r, c]) => { setRequests(r.requests); setClients(c.clients); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg("");
    try {
      const r = await api.createRequest({ clientId: parseInt(form.clientId), type: form.type, amount: form.amount, currency: form.currency, notes: form.notes });
      setMsg(r.emailSent ? "✓ Request submitted. Notification email sent." : "✓ Request submitted. (Email not configured — check SMTP_USER & SMTP_PASS env vars)");
      setShowAdd(false); setForm({ clientId: "", type: "withdrawal", amount: "", currency: "USD", notes: "" });
      load();
    } catch (err: any) { setMsg(`Error: ${err.message}`); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: number, status: string) => {
    try { await api.updateRequest(id, { status }); load(); }
    catch (err: any) { setMsg(`Error: ${err.message}`); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Service Requests</h2>
          <p className="text-sm text-muted-foreground">Manage withdrawal, payment, and other requests</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Request
        </button>
      </div>
      {msg && <div className={cn("p-3 rounded-lg text-sm border", msg.startsWith("Error") ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>{msg}</div>}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                {["Client", "Type", "Amount", "Notes", "Status", "Submitted", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">No requests yet.</td></tr>
              ) : requests.map(r => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3"><div className="text-sm font-medium text-foreground">{r.clientName || "—"}</div><div className="text-xs text-muted-foreground">{r.clientEmail || ""}</div></td>
                  <td className="px-4 py-3"><Badge status={r.type} /></td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">{r.amount ? `${r.currency} ${Number(r.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[140px] truncate">{r.notes || "—"}</td>
                  <td className="px-4 py-3"><Badge status={r.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {r.status === "pending" && (
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(r.id, "approved")} className="text-xs font-semibold text-emerald-600 hover:underline">Approve</button>
                        <button onClick={() => updateStatus(r.id, "denied")} className="text-xs font-semibold text-red-600 hover:underline">Deny</button>
                      </div>
                    )}
                    {r.status !== "pending" && <span className="text-xs text-muted-foreground capitalize">{r.status}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Service Request">
        <form onSubmit={handleAdd} className="space-y-4">
          <Select label="Client" required value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
            <option value="">Select a client...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
          </Select>
          <Select label="Request Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="withdrawal">Withdrawal</option>
            <option value="payment">Payment</option>
            <option value="other">Other</option>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            <Select label="Currency" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
              {["USD","EUR","GBP","CAD","AUD","CHF","JPY","CNY","AED","SGD","NGN","GHS","KES","ZAR"].map(c => <option key={c}>{c}</option>)}
            </Select>
          </div>
          <Textarea label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Request details..." />
          <p className="text-xs text-muted-foreground">A notification email will be sent to Opticapycrew@gmail.com automatically.</p>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm font-medium text-foreground bg-muted border border-border rounded-lg hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" disabled={saving || !form.clientId} className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">{saving ? "Submitting..." : "Submit Request"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ActivityPage() {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getActivity().then(r => setActivity(r.activity)).finally(() => setLoading(false)); }, []);

  const typeColor: Record<string, string> = {
    client_registered: "bg-blue-100 text-blue-700",
    client_status_changed: "bg-purple-100 text-purple-700",
    service_request_submitted: "bg-amber-100 text-amber-700",
    request_status_changed: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Activity Log</h2>
        <p className="text-sm text-muted-foreground">Chronological record of all events</p>
      </div>
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        {loading ? (
          <p className="px-5 py-8 text-center text-muted-foreground text-sm">Loading...</p>
        ) : activity.length === 0 ? (
          <p className="px-5 py-8 text-center text-muted-foreground text-sm">No activity recorded yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {activity.map(a => (
              <div key={a.id} className="px-5 py-4 flex items-start gap-4">
                <div className={cn("px-2 py-0.5 text-xs font-semibold rounded-md flex-shrink-0 mt-0.5", typeColor[a.eventType] || "bg-gray-100 text-gray-700")}>
                  {a.eventType.replace(/_/g, " ")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{a.description}</p>
                  {a.clientName && <p className="text-xs text-muted-foreground mt-0.5">Client: {a.clientName}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: "overview", label: "Overview", path: "/", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
  { id: "clients", label: "Clients", path: "/clients", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { id: "requests", label: "Requests", path: "/requests", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
  { id: "activity", label: "Activity Log", path: "/activity", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
];

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [location, nav] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cn("fixed lg:relative inset-y-0 left-0 z-30 w-56 bg-sidebar flex flex-col transition-transform duration-300", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-sidebar-border">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground">Admin Portal</p>
            <p className="text-xs text-sidebar-foreground/50">Firm Dashboard</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { nav(item.path); setMobileOpen(false); }}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                location === item.path ? "bg-sidebar-accent text-white" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-sidebar-accent/60 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign Out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 h-14 bg-card border-b border-card-border flex-shrink-0">
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
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function DashboardRouter() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={OverviewPage} />
        <Route path="/clients" component={ClientsPage} />
        <Route path="/requests" component={RequestsPage} />
        <Route path="/activity" component={ActivityPage} />
        <Route component={OverviewPage} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route component={() => <ProtectedRoute component={DashboardRouter} />} />
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </AuthProvider>
  );
}
