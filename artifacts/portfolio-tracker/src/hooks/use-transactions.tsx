import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useUser } from "@clerk/react";

export type TransactionType = "buy" | "sell";

export interface Transaction {
  id: string;
  type: TransactionType;
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  quantity: number;
  pricePerCoin: number;
  date: string;
  note?: string;
}

export interface Holding {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  netQuantity: number;
  averageCostBasis: number;
  totalCostBasis: number;
}

interface TransactionsContextValue {
  transactions: Transaction[];
  holdings: Holding[];
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  editTransaction: (
    id: string,
    updates: Partial<Omit<Transaction, "id">>,
  ) => void;
  deleteTransaction: (id: string) => void;
  isLoaded: boolean;
  userId: string | undefined;
}

function getStorageKey(userId: string) {
  return `pt:${userId}:transactions`;
}

function deriveHoldings(transactions: Transaction[]): Holding[] {
  const map = new Map<string, Holding>();

  // Process chronologically (earliest first) so cost basis is accurate.
  const sortedTxs = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  for (const tx of sortedTxs) {
    if (!map.has(tx.coinId)) {
      map.set(tx.coinId, {
        coinId: tx.coinId,
        symbol: tx.symbol,
        name: tx.name,
        image: tx.image,
        netQuantity: 0,
        averageCostBasis: 0,
        totalCostBasis: 0,
      });
    }

    const h = map.get(tx.coinId)!;

    if (tx.type === "buy") {
      const costOfNew = tx.quantity * tx.pricePerCoin;
      h.totalCostBasis += costOfNew;
      h.netQuantity += tx.quantity;
      h.averageCostBasis =
        h.netQuantity > 0 ? h.totalCostBasis / h.netQuantity : 0;
    } else {
      // Sell: reduce quantity and cost basis at the running average cost.
      h.netQuantity -= tx.quantity;
      h.totalCostBasis -= tx.quantity * h.averageCostBasis;
      // Clean up floating point dust once a position is fully closed.
      if (h.netQuantity < 1e-8) {
        h.netQuantity = 0;
        h.totalCostBasis = 0;
        h.averageCostBasis = 0;
      }
    }
  }

  return Array.from(map.values()).filter((h) => h.netQuantity > 0);
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load (and clear on sign-out / user switch) the per-user ledger from
  // localStorage once Clerk has resolved the current user.
  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      setTransactions([]);
      return;
    }
    try {
      const stored = localStorage.getItem(getStorageKey(userId));
      setTransactions(stored ? (JSON.parse(stored) as Transaction[]) : []);
    } catch {
      setTransactions([]);
    }
  }, [isLoaded, userId]);

  const saveTransactions = useCallback(
    (newTxs: Transaction[]) => {
      if (!userId) return;
      try {
        localStorage.setItem(getStorageKey(userId), JSON.stringify(newTxs));
      } catch {
        // Ignore quota / serialization errors; state still updates in-memory.
      }
      setTransactions(newTxs);
    },
    [userId],
  );

  const addTransaction = useCallback(
    (tx: Omit<Transaction, "id">) => {
      saveTransactions([
        ...transactions,
        { ...tx, id: crypto.randomUUID() },
      ]);
    },
    [transactions, saveTransactions],
  );

  const editTransaction = useCallback(
    (id: string, updates: Partial<Omit<Transaction, "id">>) => {
      saveTransactions(
        transactions.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx)),
      );
    },
    [transactions, saveTransactions],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      saveTransactions(transactions.filter((tx) => tx.id !== id));
    },
    [transactions, saveTransactions],
  );

  const holdings = useMemo(() => deriveHoldings(transactions), [transactions]);

  const value = useMemo(
    () => ({
      transactions,
      holdings,
      addTransaction,
      editTransaction,
      deleteTransaction,
      isLoaded,
      userId,
    }),
    [
      transactions,
      holdings,
      addTransaction,
      editTransaction,
      deleteTransaction,
      isLoaded,
      userId,
    ],
  );

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) {
    throw new Error("useTransactions must be used within a TransactionsProvider");
  }
  return ctx;
}
