const API_BASE = "/api";
const PUBLIC_BASE = `${API_BASE}/public`;
const AUTH_BASE = `${API_BASE}/auth`;

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

function post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

export const publicApi = {
  getExchangeRates: async (): Promise<Record<string, number>> => {
    const res = await fetch(`${PUBLIC_BASE}/exchange-rates`);
    if (!res.ok) throw new Error("Failed to fetch exchange rates");
    const data = (await res.json()) as { rates: Record<string, number> };
    return data.rates;
  },

  registerClient: (data: { name: string; email: string }) =>
    // The server intentionally never echoes back the existing client row for
    // an already-registered email (that previously leaked phone, company,
    // status, and internal admin notes to anyone on the internet). For brand
    // new registrations we still receive `{ client: { id } }`, so callers
    // that need it can read it; the only consumer here just fires-and-forgets.
    post<{ client?: { id: number }; alreadyExists: boolean; emailSent: boolean }>(
      `${PUBLIC_BASE}/register`,
      data,
    ),

  submitRequest: (data: {
    name: string;
    email: string;
    type: string;
    amount: string;
    currency: string;
    notes?: string;
    txnId?: string;
  }) => post<{ request: { id: number; publicToken: string }; emailSent: boolean }>(
    `${PUBLIC_BASE}/request`,
    data,
  ),

  checkTxApprovals: async (txnIds: string[]): Promise<{ approvals: { txnId: string; status: string }[] }> => {
    if (txnIds.length === 0) return { approvals: [] };
    const res = await fetch(`${PUBLIC_BASE}/tx-approvals?txnIds=${encodeURIComponent(txnIds.join(","))}`);
    if (!res.ok) return { approvals: [] };
    return res.json();
  },

  submitPaymentConfirmation: (data: {
    name: string;
    email: string;
    amount: string;
    currency: string;
    notes?: string;
  }) => post<{ request: { id: number; publicToken: string }; emailSent: boolean }>(
    `${PUBLIC_BASE}/payment-confirmation`,
    data,
  ),

  // Status polling is keyed by the unguessable `publicToken` we receive from
  // the matching POST. The previous version used the serial primary key,
  // which let anyone enumerate other users' requests by sweeping numeric ids.
  getRequestStatus: async (token: string): Promise<{ id: number; status: string; type: string }> => {
    const res = await fetch(`${PUBLIC_BASE}/request-status/${encodeURIComponent(token)}`);
    if (!res.ok) throw new Error("Failed to fetch request status");
    return res.json();
  },

  getWalletConfigs: async (): Promise<{ configs: WalletConfig[]; coinOrder: string[] }> => {
    const res = await fetch(`${PUBLIC_BASE}/wallet-configs`);
    if (!res.ok) return { configs: [], coinOrder: [] };
    const data = (await res.json()) as { configs: WalletConfig[]; coinOrder?: string[] };
    return { configs: data.configs, coinOrder: data.coinOrder ?? [] };
  },
};

export interface WalletConfig {
  id: number;
  symbol: string;
  network: string;
  address: string;
  label: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
}

export interface AuthSessionResponse {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

export interface AuthSessionRecord {
  id: number;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  location: string | null;
  countryCode: string | null;
  current: boolean;
}

export const authApi = {
  signup: (data: { name: string; email: string; password: string; initialBalanceUsd?: number }) =>
    post<AuthSessionResponse>(`${AUTH_BASE}/signup`, data),

  login: (data: { email: string; password: string }) =>
    post<AuthSessionResponse>(`${AUTH_BASE}/login`, data),

  logout: (token: string) =>
    post<{ ok: boolean }>(`${AUTH_BASE}/logout`, {}, { Authorization: `Bearer ${token}` }),

  me: async (token: string): Promise<AuthUser | null> => {
    const res = await fetch(`${AUTH_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error("Failed to load session");
    const data = (await res.json()) as { user: AuthUser };
    return data.user;
  },

  sessions: async (token: string): Promise<AuthSessionRecord[]> => {
    const res = await fetch(`${AUTH_BASE}/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to load recent activity");
    }
    const data = (await res.json()) as { sessions: AuthSessionRecord[] };
    return data.sessions;
  },

  revokeSession: async (token: string, id: number): Promise<void> => {
    const res = await fetch(`${AUTH_BASE}/sessions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to sign out that device");
    }
  },

  exists: (email: string) =>
    post<{ exists: boolean }>(`${AUTH_BASE}/exists`, { email }),

  changePassword: (token: string, data: { currentPassword: string; newPassword: string }) =>
    post<{ ok: boolean }>(`${AUTH_BASE}/change-password`, data, {
      Authorization: `Bearer ${token}`,
    }),

  forgotPassword: (email: string) =>
    post<{ ok: boolean }>(`${AUTH_BASE}/forgot-password`, { email }),

  balanceDirective: async (token: string): Promise<{ debitAll: boolean; requestedAt: string | null }> => {
    const res = await fetch(`${AUTH_BASE}/balance-directive`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { debitAll: false, requestedAt: null };
    return res.json();
  },

  getBalance: async (token: string): Promise<number | null> => {
    const res = await fetch(`${AUTH_BASE}/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { balanceBtc: number };
    return data.balanceBtc;
  },

  setBalance: async (token: string, balanceBtc: number): Promise<void> => {
    await fetch(`${AUTH_BASE}/balance`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ balanceBtc }),
    });
  },

  validateResetToken: async (
    token: string,
  ): Promise<{ valid: boolean; email?: string; expiresAt?: string; error?: string }> => {
    const res = await fetch(
      `${AUTH_BASE}/reset-password?token=${encodeURIComponent(token)}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        valid: false,
        error:
          (data as { error?: string }).error ||
          "This password reset link is invalid or has expired.",
      };
    }
    return data as { valid: boolean; email?: string; expiresAt?: string };
  },

  resetPassword: (data: { token: string; newPassword: string }) =>
    post<AuthSessionResponse>(`${AUTH_BASE}/reset-password`, data),
};
