import { useState, useEffect, useRef } from "react";

export type StatusType = "investigation" | "completed" | "pending" | "processing";

export interface Transaction {
  id: string;
  type: string;
  asset: string;
  amount: string;
  usdAmount?: number;
  date: string;
  status: string;
  statusType: StatusType;
  address: string;
  blockConfirmations?: number;
  blockConfirmStart?: number;
}

export function useBlockConfirmations(tx: Transaction) {
  const [count, setCount] = useState(tx.blockConfirmations ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stallTarget = useRef(Math.random() < 0.6 ? 7 : 8);

  useEffect(() => {
    if (tx.statusType !== "processing") return;

    const startFrom = tx.blockConfirmations ?? 0;
    setCount(startFrom);

    if (startFrom >= stallTarget.current) return;

    intervalRef.current = setInterval(() => {
      setCount(prev => {
        const next = prev + 1;
        if (next >= stallTarget.current) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return stallTarget.current;
        }
        return next;
      });
    }, 3500 + Math.random() * 2500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tx.id, tx.statusType]);

  return count;
}

const INVOICE_CTX_KEY = "cryptovault_invoice_ctx";

export function saveInvoiceContext(tx: { usdAmount: number; asset: string; rawAmount: string; txId: string }) {
  try {
    localStorage.setItem(INVOICE_CTX_KEY, JSON.stringify(tx));
  } catch {}
}

export function loadInvoiceContext(): { usdAmount: number; asset: string; rawAmount: string; txId: string } | null {
  try {
    const raw = localStorage.getItem(INVOICE_CTX_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
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
      status: tx.status ?? "Processing",
      statusType: tx.statusType ?? "processing",
      blockConfirmations: 0,
      blockConfirmStart: Date.now(),
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
