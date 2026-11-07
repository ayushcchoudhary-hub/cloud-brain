import type { Payment } from "./types.js";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Placeholder pricing: $2 base, up to +$2 for page depth, up to +$1 for reputation.
 * Always between $2 and $5 USDC. Payments are simulated.
 */
export function priceFor(depthScore: number, reputation: number): number {
  const price = 2 + clamp(depthScore, 0, 1) * 2 + clamp(reputation, 0, 5) / 5;
  return Number(clamp(price, 2, 5).toFixed(2));
}

export interface SpendLimits {
  /** Pulls above this price need explicit approval. */
  perPullMaxUsdc: number;
  monthlyBudgetUsdc: number;
  maxPullsPerHour: number;
}

export interface BuyerUsage {
  monthlySpendUsdc: number;
  pullsLastHour: number;
}

export function buyerUsage(payments: Payment[], now = new Date()): BuyerUsage {
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const hourAgo = now.getTime() - 60 * 60 * 1000;
  let monthlySpendUsdc = 0;
  let pullsLastHour = 0;
  for (const payment of payments) {
    const at = new Date(payment.createdAt).getTime();
    if (at >= monthStart) monthlySpendUsdc += payment.amountUsdc;
    if (at >= hourAgo) pullsLastHour += 1;
  }
  return { monthlySpendUsdc: Number(monthlySpendUsdc.toFixed(2)), pullsLastHour };
}

export type SpendDecision =
  | { ok: true }
  | { ok: false; reason: "over_per_pull_limit" | "over_monthly_budget" | "rate_limited"; message: string };

/** Decide if a simulated charge can go ahead without asking the user. */
export function checkSpend(amountUsdc: number, usage: BuyerUsage, limits: SpendLimits): SpendDecision {
  if (amountUsdc > limits.perPullMaxUsdc) {
    return {
      ok: false,
      reason: "over_per_pull_limit",
      message: `Price $${amountUsdc.toFixed(2)} USDC is above the per-pull limit of $${limits.perPullMaxUsdc.toFixed(2)}.`
    };
  }
  if (usage.monthlySpendUsdc + amountUsdc > limits.monthlyBudgetUsdc) {
    return {
      ok: false,
      reason: "over_monthly_budget",
      message: `Monthly spend would reach $${(usage.monthlySpendUsdc + amountUsdc).toFixed(2)}, over the $${limits.monthlyBudgetUsdc.toFixed(2)} budget.`
    };
  }
  if (usage.pullsLastHour >= limits.maxPullsPerHour) {
    return {
      ok: false,
      reason: "rate_limited",
      message: `Already ${usage.pullsLastHour} pulls in the last hour (limit ${limits.maxPullsPerHour}).`
    };
  }
  return { ok: true };
}

/** Feedback nudges reputation: useful +0.05, not useful -0.08, rating adds (rating-3)*0.02. */
export function nextReputation(current: number, useful: boolean, rating?: number): number {
  const ratingAdj = typeof rating === "number" ? (clamp(Math.round(rating), 1, 5) - 3) * 0.02 : 0;
  const usefulAdj = useful ? 0.05 : -0.08;
  return Number(clamp(current + usefulAdj + ratingAdj, 0, 5).toFixed(3));
}
