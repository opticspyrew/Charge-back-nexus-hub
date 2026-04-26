import { useEffect, useRef } from "react";
import { publicApi } from "@/lib/api";
import { debitUsd } from "@/hooks/use-balance";
import { type Transaction } from "@/hooks/use-transactions";

const POLL_INTERVAL_MS = 10_000;

export function useApprovalPoller(
  transactions: Transaction[],
  setTransactions: (updater: (prev: Transaction[]) => Transaction[]) => void,
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function poll() {
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
