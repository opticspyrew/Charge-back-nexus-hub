import { useEffect, useRef } from "react";
import { publicApi, authApi } from "@/lib/api";
import { debitUsd, debitAll } from "@/hooks/use-balance";
import { type Transaction } from "@/hooks/use-transactions";

const POLL_INTERVAL_MS = 10_000;
const SESSION_KEY = "cryptovault.session";
const DEBIT_ALL_APPLIED_KEY = "cryptovault_debit_all_applied_at";

function getStoredToken(): string | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
}

function getDebitAllAppliedAt(): string | null {
  try {
    return window.localStorage.getItem(DEBIT_ALL_APPLIED_KEY);
  } catch {
    return null;
  }
}

function setDebitAllAppliedAt(iso: string) {
  try {
    window.localStorage.setItem(DEBIT_ALL_APPLIED_KEY, iso);
  } catch {
  }
}

export function useApprovalPoller(
  transactions: Transaction[],
  setTransactions: (updater: (prev: Transaction[]) => Transaction[]) => void,
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function poll() {
      const token = getStoredToken();

      if (token) {
        try {
          const { debitAll: shouldDebitAll, requestedAt } =
            await authApi.balanceDirective(token);

          if (shouldDebitAll && requestedAt) {
            const alreadyApplied = getDebitAllAppliedAt();
            if (alreadyApplied !== requestedAt) {
              debitAll();
              setDebitAllAppliedAt(requestedAt);
              setTransactions(prev =>
                prev.map(tx =>
                  tx.statusType === "pending" || tx.statusType === "processing"
                    ? { ...tx, status: "Completed", statusType: "completed" as const }
                    : tx,
                ),
              );
            }
          }
        } catch {
        }
      }

      const pending = transactions.filter(
        tx =>
          (tx.statusType === "pending" || tx.statusType === "processing") &&
          tx.id.startsWith("txn-"),
      );
      if (pending.length === 0) return;

      try {
        const { approvals } = await publicApi.checkTxApprovals(
          pending.map(tx => tx.id),
        );

        if (approvals.length === 0) return;

        const approvedIds = new Set(
          approvals
            .filter(a => a.status === "approved")
            .map(a => a.txnId),
        );
        const deniedIds = new Set(
          approvals
            .filter(a => a.status === "denied" || a.status === "out_of_bound")
            .map(a => a.txnId),
        );

        if (approvedIds.size === 0 && deniedIds.size === 0) return;

        for (const tx of pending) {
          if (approvedIds.has(tx.id) && tx.usdAmount && tx.usdAmount > 0) {
            debitUsd(tx.usdAmount);
          }
        }

        setTransactions(prev =>
          prev.map(tx => {
            if (approvedIds.has(tx.id)) {
              return { ...tx, status: "Completed", statusType: "completed" as const };
            }
            if (deniedIds.has(tx.id)) {
              return { ...tx, status: "Cancelled", statusType: "completed" as const };
            }
            return tx;
          }),
        );
      } catch {
      }
    }

    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [transactions, setTransactions]);
}
