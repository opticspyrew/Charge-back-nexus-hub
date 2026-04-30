import { db, pool } from "./index";
import { cryptoWalletConfigs } from "./schema";
import { count } from "drizzle-orm";

const DEFAULT_WALLETS = [
  { symbol: "BTC",  network: "Bitcoin",    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kjfjep9nq", sortOrder: 10 },
  { symbol: "USDT", network: "TRC20",      address: "TQn9Y2khEsLJW1ChVWFMxshSbQnvtCzEEm",        sortOrder: 20 },
  { symbol: "USDT", network: "ERC20",      address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", sortOrder: 21 },
  { symbol: "USDC", network: "ERC20",      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", sortOrder: 30 },
  { symbol: "USDC", network: "SOL",        address: "4zMMC9srt5Ri5X14GAgXbNwikMBFXuNknbhmY1L3xqRu", sortOrder: 31 },
  { symbol: "ETH",  network: "ERC20",      address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", sortOrder: 40 },
  { symbol: "SOL",  network: "Solana",     address: "9WzDXwBbmkg8ZTbNMqUxNfXGSpKkMBFnuoJnhVPRLMpk", sortOrder: 50 },
  { symbol: "XRP",  network: "XRP Ledger", address: "rEb8TK3gBgk5auZkwc6sHSGMLypR65b31o",          sortOrder: 60 },
  { symbol: "BNB",  network: "BEP20",      address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", sortOrder: 70 },
];

async function seedWallets() {
  const [{ value: existing }] = await db.select({ value: count() }).from(cryptoWalletConfigs);
  if (Number(existing) > 0) {
    console.log(`[seed-wallets] ${existing} rows already present — skipping insert.`);
    return;
  }

  await db.insert(cryptoWalletConfigs).values(
    DEFAULT_WALLETS.map(w => ({
      symbol: w.symbol,
      network: w.network,
      address: w.address,
      label: null,
      isActive: true,
      sortOrder: w.sortOrder,
    }))
  );
  console.log(`[seed-wallets] Inserted ${DEFAULT_WALLETS.length} default wallet rows.`);
}

seedWallets()
  .catch(err => { console.error("[seed-wallets] Error:", err); process.exit(1); })
  .finally(() => pool.end());
