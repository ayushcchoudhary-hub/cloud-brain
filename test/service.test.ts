import assert from "node:assert/strict";
import { test } from "node:test";

import { buyerUsage, checkSpend, nextReputation, priceFor } from "../src/pricing.js";
import type { Payment } from "../src/types.js";
import { sampleService, STORY } from "./helpers.js";

test("pricing stays in the $2 to $5 band and reputation stays in 0..5", () => {
  assert.equal(priceFor(0, 0), 2);
  assert.equal(priceFor(1, 5), 5);
  assert.equal(nextReputation(5, true, 5), 5);
  assert.equal(nextReputation(0, false, 1), 0);
});

test("spend checks: per-pull cap, monthly budget, hourly rate", () => {
  const limits = { perPullMaxUsdc: 4, monthlyBudgetUsdc: 10, maxPullsPerHour: 2 };
  assert.equal(checkSpend(4.5, { monthlySpendUsdc: 0, pullsLastHour: 0 }, limits).ok, false);
  assert.equal(checkSpend(3, { monthlySpendUsdc: 8, pullsLastHour: 0 }, limits).ok, false);
  assert.equal(checkSpend(3, { monthlySpendUsdc: 0, pullsLastHour: 2 }, limits).ok, false);
  assert.equal(checkSpend(3, { monthlySpendUsdc: 0, pullsLastHour: 0 }, limits).ok, true);
  const old: Payment = { receiptId: "sim_old", query: "q", buyerId: "b", contributorId: "c", contributorDisplayName: "C", amountUsdc: 9, matchedPagePath: "p", matchedPageTitle: "t", createdAt: "2020-01-01T00:00:00.000Z" };
  assert.deepEqual(buyerUsage([old]), { monthlySpendUsdc: 0, pullsLastHour: 0 });
});

test("network pull: citations, simulated USDC receipt, seller earnings, feedback", async () => {
  const { service } = await sampleService();
  const outcome = await service.pull(STORY.network, { contributorHandle: "kestrel" });
  assert.equal(outcome.status, "delivered");
  if (outcome.status !== "delivered") return;
  assert.equal(outcome.source, "network");
  assert.ok(outcome.citations.length >= 1);
  assert.match(outcome.synthesis, /\[S1\]/);
  assert.ok(outcome.receipt);
  assert.match(outcome.receipt.receiptId, /^sim_[0-9a-f]{12}$/);
  assert.equal(outcome.receipt.currency, "USDC");
  assert.equal(outcome.receipt.simulated, true);

  const [kestrel] = (await service.summary()).topContributors;
  assert.equal(kestrel?.handle, "kestrel");
  assert.equal(kestrel?.totalPulls, 1);
  assert.equal(kestrel?.totalEarningsUsdc, outcome.receipt.amountUsdc);

  const fb = await service.feedback({ receiptId: outcome.receipt.receiptId, useful: true, rating: 5 });
  assert.ok((fb.reputation ?? 0) > 3);
  await assert.rejects(service.feedback({ receiptId: outcome.receipt.receiptId, useful: false }), /already/);
});

test("own pull is free and has no receipt", async () => {
  const { service } = await sampleService();
  const outcome = await service.pull(STORY.own);
  assert.equal(outcome.status, "delivered");
  if (outcome.status === "delivered") {
    assert.equal(outcome.source, "own");
    assert.equal(outcome.receipt, undefined);
  }
  assert.equal((await service.history()).length, 0);
});

test("budget and per-pull cap block a pull and charge nothing", async () => {
  const { service } = await sampleService({ MONTHLY_BUDGET_USDC: "5" });
  assert.equal((await service.pull(STORY.network, { contributorHandle: "kestrel" })).status, "delivered");
  const second = await service.pull(STORY.budget, { contributorHandle: "kestrel" });
  assert.equal(second.status, "blocked_by_limit");
  const capped = await service.pull(STORY.network, { contributorHandle: "kestrel", maxPriceUsdc: 1 });
  assert.equal(capped.status, "blocked_by_limit");
  assert.equal((await service.history()).length, 1);
});

test("quote then settle charges the quoted amount once", async () => {
  const { service } = await sampleService();
  const quote = await service.createQuote(STORY.network);
  assert.ok(quote);
  const settled = await service.settleQuote(quote.id);
  assert.equal(settled.status, "delivered");
  if (settled.status === "delivered") assert.equal(settled.receipt?.amountUsdc, quote.amountUsdc);
  assert.equal((await service.settleQuote(quote.id)).status, "quote_invalid");
});

test("a receipt seed makes receipt ids repeatable, without one they differ", async () => {
  const pullOnce = async (env: Record<string, string>) => {
    const { service } = await sampleService(env);
    const outcome = await service.pull(STORY.network, { contributorHandle: "kestrel" });
    assert.equal(outcome.status, "delivered");
    return outcome.status === "delivered" ? outcome.receipt?.receiptId : undefined;
  };
  const a = await pullOnce({ RECEIPT_SEED: "seed" });
  assert.match(a ?? "", /^sim_[0-9a-f]{12}$/);
  assert.equal(await pullOnce({ RECEIPT_SEED: "seed" }), a);
  assert.notEqual(await pullOnce({}), await pullOnce({}));
});
