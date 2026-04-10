import { useState, useEffect } from "react";

export type StatusType = "investigation" | "completed" | "pending";

export interface Transaction {
  id: string;
  type: string;
  asset: string;
  amount: string;
  date: string;
  status: string;
  statusType: StatusType;
  address: string;
}

const STORAGE_KEY = "cryptovault_transactions";

const seedTransactions: Transaction[] = [
  {
    id: "txn-002",
    type: "Deposit",
    asset: "BTC",
    amount: "+0.1500 BTC",
    date: "Apr 05, 2026",
    status: "Completed",
    statusType: "completed",
    address: "External Wallet",
  },
  {
    id: "txn-003",
    type: "Trade",
    asset: "ETH",
    amount: "+1.20 ETH",
    date: "Apr 02, 2026",
    status: "Completed",
    statusType: "completed",
    address: "BTC → ETH",
  },
  {
    id: "txn-004",
    type: "Deposit",
    asset: "USDT",
    amount: "+5,000 USDT",
    date: "Mar 29, 2026",
    status: "Completed",
    statusType: "completed",
    address: "Bank Transfer",
  },
];

function loadFromStorage(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveToStorage(seedTransactions);
      return seedTransactions;
    }
    const parsed = JSON.parse(raw) as Transaction[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveToStorage(seedTransactions);
      return seedTransactions;
    }
    return parsed;
  } catch {
    saveToStorage(seedTransactions);
    return seedTransactions;
  }
}

function saveToStorage(txns: Transaction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txns));
  } catch {
  }
}

function escalatePending(txns: Transaction[]): { txns: Transaction[]; changed: boolean } {
  let changed = false;
  const updated = txns.map(tx => {
    if (tx.statusType === "pending") {
      changed = true;
      return { ...tx, statusType: "investigation" as StatusType, status: "Under Investigation" };
    }
    return tx;
  });
  return { txns: updated, changed };
}

export function useTransactions() {
  const [transactions, setTransactionsState] = useState<Transaction[]>(() => {
    const loaded = loadFromStorage();
    const { txns, changed } = escalatePending(loaded);
    if (changed) saveToStorage(txns);
    return txns;
  });

  function setTransactions(updater: Transaction[] | ((prev: Transaction[]) => Transaction[])) {
    setTransactionsState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveToStorage(next);
      return next;
    });
  }

  function addTransaction(tx: Omit<Transaction, "id" | "date" | "status" | "statusType"> & Partial<Pick<Transaction, "status" | "statusType">>) {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const newTx: Transaction = {
      id: `txn-${Date.now()}`,
      date: dateStr,
      status: tx.status ?? "Pending",
      statusType: tx.statusType ?? "pending",
      ...tx,
    };
    setTransactions(prev => [newTx, ...prev]);
    return newTx.id;
  }

  function cancelTransaction(id: string) {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  }

  return { transactions, addTransaction, cancelTransaction, setTransactions };
}
