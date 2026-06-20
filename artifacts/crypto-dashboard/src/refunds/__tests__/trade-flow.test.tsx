/**
 * Verifies the unified /refunds wallet exposes Trade and that placing an order
 * records it to the per-account transaction ledger.
 *
 *   - The Wallet section (funds.tsx) surfaces a "Trade" quick action that routes
 *     into the Trade section (onTrade callback).
 *   - The Trade section (trade.tsx) places buy/sell orders that call
 *     addTransaction with a "Trade" row (buy => +, sell => -), at the selected
 *     pair's price, and shows a confirmation.
 *
 * use-balance / use-kyc / wouter are stubbed so the components render without
 * their providers (matching the existing refunds test pattern).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/hooks/use-balance", () => ({
  BTC_PRICE_USD: 27000,
  useBalance: () => ({ btcFormatted: "0.00000000", usdFormatted: "0.00", usd: 0, btc: 0 }),
}));

vi.mock("@/hooks/use-kyc", () => ({
  useKyc: () => ({ status: "approved" }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

vi.mock("@/components/wallet-modal", () => ({ default: () => null }));
vi.mock("@/components/kyc-modal", () => ({ default: () => null }));

import Funds from "../components/portal-sections/funds";
import Trade from "../components/portal-sections/trade";

function makeTx() {
  return {
    transactions: [],
    addTransaction: vi.fn(() => "txn_test"),
    cancelTransaction: vi.fn(),
    setTransactions: vi.fn(),
  };
}

afterEach(() => {
  cleanup();
});

describe("Refunds unified wallet → Trade", () => {
  it("Wallet exposes a Trade action that opens the Trade section", () => {
    const tx = makeTx();
    const onTrade = vi.fn();
    render(<Funds tx={tx as never} onTrade={onTrade} />);

    const tradeBtn = screen.getByTestId("funds-action-trade");
    expect(tradeBtn).toBeTruthy();
    fireEvent.click(tradeBtn);
    expect(onTrade).toHaveBeenCalledTimes(1);
  });

  it("placing a Buy order records a completed Trade transaction", () => {
    const tx = makeTx();
    render(<Trade tx={tx as never} />);

    fireEvent.change(screen.getByTestId("trade-amount"), { target: { value: "0.5" } });
    fireEvent.click(screen.getByTestId("trade-place-order"));

    expect(tx.addTransaction).toHaveBeenCalledTimes(1);
    expect(tx.addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "Trade",
        asset: "BTC",
        amount: "+0.5 BTC",
        statusType: "completed",
        status: "Completed",
        usdAmount: 33210.75, // 0.5 * 66421.50
      }),
    );
    expect(screen.getByTestId("trade-success")).toBeTruthy();
  });

  it("placing a Sell order records a negative Trade transaction", () => {
    const tx = makeTx();
    render(<Trade tx={tx as never} />);

    fireEvent.click(screen.getByTestId("trade-side-sell"));
    fireEvent.change(screen.getByTestId("trade-amount"), { target: { value: "2" } });
    fireEvent.click(screen.getByTestId("trade-place-order"));

    expect(tx.addTransaction).toHaveBeenCalledTimes(1);
    const arg = tx.addTransaction.mock.calls[0][0] as { amount: string; type: string };
    expect(arg.type).toBe("Trade");
    expect(arg.amount.startsWith("-")).toBe(true);
  });

  it("does not record an order when amount is empty or zero", () => {
    const tx = makeTx();
    render(<Trade tx={tx as never} />);

    fireEvent.click(screen.getByTestId("trade-place-order"));
    expect(tx.addTransaction).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId("trade-amount"), { target: { value: "0" } });
    fireEvent.click(screen.getByTestId("trade-place-order"));
    expect(tx.addTransaction).not.toHaveBeenCalled();
  });
});
