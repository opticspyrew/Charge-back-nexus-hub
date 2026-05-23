import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { kycApi, type KycStatus, type KycStatusResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface KycContextValue {
  status: KycStatus;
  submission: KycStatusResponse["submission"];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setStatus: (status: KycStatus) => void;
}

const KycContext = createContext<KycContextValue | null>(null);

export function KycProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [status, setStatusState] = useState<KycStatus>("none");
  const [submission, setSubmission] = useState<KycStatusResponse["submission"]>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const refresh = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) {
      setStatusState("none");
      setSubmission(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await kycApi.status(t);
      setStatusState(res.status);
      setSubmission(res.submission);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load verification status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      setStatusState("none");
      setSubmission(null);
    }
  }, [isAuthenticated, token, refresh]);

  return (
    <KycContext.Provider
      value={{ status, submission, loading, error, refresh, setStatus: setStatusState }}
    >
      {children}
    </KycContext.Provider>
  );
}

export function useKyc(): KycContextValue {
  const ctx = useContext(KycContext);
  if (!ctx) throw new Error("useKyc must be used within KycProvider");
  return ctx;
}
