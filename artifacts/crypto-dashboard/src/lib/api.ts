const API_BASE = "/api/public";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const publicApi = {
  registerClient: (data: { name: string; email: string }) =>
    post<{ client: { id: number }; alreadyExists: boolean; emailSent: boolean }>("/register", data),

  submitRequest: (data: {
    name: string;
    email: string;
    type: string;
    amount: string;
    currency: string;
    notes?: string;
  }) => post<{ request: { id: number }; emailSent: boolean }>("/request", data),

  submitPaymentConfirmation: (data: {
    name: string;
    email: string;
    amount: string;
    currency: string;
    notes?: string;
  }) => post<{ request: { id: number }; emailSent: boolean }>("/payment-confirmation", data),

  getRequestStatus: async (id: number): Promise<{ id: number; status: string; type: string }> => {
    const res = await fetch(`${API_BASE}/request-status/${id}`);
    if (!res.ok) throw new Error("Failed to fetch request status");
    return res.json();
  },
};
