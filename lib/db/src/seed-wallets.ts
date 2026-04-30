import { db, pool } from "./index";
import { cryptoWalletConfigs } from "./schema";
import { count } from "drizzle-orm";

const PLACEHOLDER_ADDRESS = "CONFIGURE_IN_ADMIN_DASHBOARD";

const DEFAULT_WALLET_STUBS = [
  { symbol: "BTC",  network: "Bitcoin",    sortOrder: 10 },
  { symbol: "USDT", network: "TRC20",      sortOrder: 20 },
  { symbol: "USDT", network: "ERC20",      sortOrder: 21 },
  { symbol: "USDC", network: "ERC20",      sortOrder: 30 },
  { symbol: "USDC", network: "SOL",        sortOrder: 31 },
  { symbol: "ETH",  network: "ERC20",      sortOrder: 40 },
  { symbol: "SOL",  network: "Solana",     sortOrder: 50 },
  { symbol: "XRP",  network: "XRP Ledger", sortOrder: 60 },
  { symbol: "BNB",  network: "BEP20",      sortOrder: 70 },
];

async function seedWallets() {
  const [{ value: existing }] = await db.select({ value: count() }).from(cryptoWalletConfigs);
  if (Number(existing) > 0) {
    console.log(`[seed-wallets] ${existing} rows already present — skipping insert.`);
    return;
  }

  await db.insert(cryptoWalletConfigs).values(
    DEFAULT_WALLET_STUBS.map(w => ({
      symbol: w.symbol,
      network: w.network,
      address: PLACEHOLDER_ADDRESS,
      label: "⚠ Admin: replace with real address",
      isActive: true,
      sortOrder: w.sortOrder,
    }))
  );
  console.log(`[seed-wallets] Inserted ${DEFAULT_WALLET_STUBS.length} wallet stub rows — admin must configure real addresses before going live.`);
}

seedWallets()
  .catch(err => { console.error("[seed-wallets] Error:", err); process.exit(1); })
  .finally(() => pool.end());
