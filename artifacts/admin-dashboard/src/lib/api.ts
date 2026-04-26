const API_BASE = import.meta.env.VITE_API_URL || "/api";

export function getToken(): string | null {
  return localStorage.getItem("admin_token");
}

export function setToken(token: string) {
  localStorage.setItem("admin_token", token);
}

export function clearToken() {
  localStorage.removeItem("admin_token");
}

function headers() {
  const token = getToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["x-admin-token"] = token;
  return h;
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/admin${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    req<{ success: boolean; token: string }>("POST", "/login", { username, password }),

  getStats: () =>
    req<{ totalClients: number; pendingClients: number; totalRequests: number; pendingRequests: number; recentActivity: Activity[] }>("GET", "/stats"),

  getClients: () => req<{ clients: Client[] }>("GET", "/clients"),
  createClient: (data: { name: string; email: string; phone?: string; company?: string; notes?: string }) =>
    req<{ client: Client; emailSent: boolean }>("POST", "/clients", data),
  updateClient: (id: number, data: { status: string; notes?: string }) =>
    req<{ client: Client }>("PATCH", `/clients/${id}`, data),

  getRequests: () => req<{ requests: ServiceRequest[] }>("GET", "/requests"),
  createRequest: (data: { clientId: number; type: string; amount?: string; currency?: string; notes?: string }) =>
    req<{ request: ServiceRequest; emailSent: boolean }>("POST", "/requests", data),
  updateRequest: (id: number, data: { status: string }) =>
    req<{ request: ServiceRequest }>("PATCH", `/requests/${id}`, data),

  getActivity: () => req<{ activity: Activity[] }>("GET", "/activity"),

  getUsers: () => req<{ users: User[] }>("GET", "/users"),
};

export interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequest {
  id: number;
  clientId: number;
  type: string;
  amount?: string | null;
  currency: string;
  notes?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  clientName?: string | null;
  clientEmail?: string | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: number;
  eventType: string;
  clientId?: number | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  clientName?: string | null;
}
