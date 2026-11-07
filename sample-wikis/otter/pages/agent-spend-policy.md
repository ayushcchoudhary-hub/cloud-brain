# Agent Spend Policy: When to Pay for a Tool Call or Context

> A working policy for an agent that meets a paywall mid-task: what to check in the 402 response, which limits to enforce in code, when to stop and ask the user, and how to avoid paying twice or paying for nothing.

## The decision in one line

Pay when expected value is clearly above price plus fees, the payee and terms check out, and the payment fits inside limits the user set in advance. Otherwise ask, or route around it.

## 1. Read the offer before signing

An x402 402 response lists what the server accepts (see [[x402-protocol-and-settlement]]). Check each field before producing a signature:

- `amount` in atomic units. USDC has 6 decimals, so `10000` is $0.01. Agents misreading decimals is the obvious failure.
- `payTo`: is this the payee you expected for this domain? Unknown payees deserve a lower cap.
- `network` and `asset`: only chains and tokens you hold and allow.
- `scheme`: `exact` is a fixed charge; `upto` lets the seller charge up to the stated maximum, so treat the maximum as the price.

## 2. Enforce limits in code, not in the prompt

A model can be talked into things; a wallet wrapper cannot. Coinbase's CDP SDK spend controls show the useful shape:

- `maxAmountPerPayment`: hard per-payment cap.
- `maxCumulativeSpend` with `maxCumulativeSpendWindow` (for example `"24h"`): rolling budget.
- `allowedNetworks`, `allowedAssets`, `allowedPayees`: allowlists.
- `onApproachingLimit` with thresholds: a hook to warn before the budget runs out.
- An append-only spend ledger for audit.

Their example caps payments at 10,000 atomic USDC ($0.01) each and $0.05 per 24 hours on Base. A blocked payment throws an error instead of signing.

Google's AP2 expresses the same idea at a higher level: an **Intent Mandate** signed up front states price limits and timing, and the agent can only act inside it. See [[agent-payment-landscape]].

## 3. Know when to ask the user

A pattern that works (this is a design suggestion, not a standard):

| Situation | Action |
| --- | --- |
| Under per-call cap, inside session budget, known payee | Pay silently, log it |
| Under cap, unknown payee | Pay only if the cap for unknown payees allows; log |
| Over per-call cap, or would cross the session budget | Ask, with price, payee and why |
| Price is high relative to the task, or the content cannot be previewed | Ask, and offer the free alternative |

MCP has a mechanism for asking mid-task: **elicitation**. A server can request structured input through the client, and the user can accept, decline or cancel. The spec says servers must not use it to request sensitive information, and clients should make clear which server is asking. A good prompt states dollars, payee, what is bought, and the free alternative.

## 4. Do not pay twice

- **Retries:** use the `payment-identifier` extension so a retried request with the same ID returns the cached response.
- **Pending settlement:** if a facilitator returns `settlement_pending`, the payment may still confirm. Coinbase explicitly says do not create a new payment until you reconcile the original.
- **Repeat access:** the Sign-In-With-X extension lets a wallet that already paid prove it and get the resource again without paying.

## 5. Plan for refunds before you need them

- `exact` and `upto` payments are final once settled. There are no chargebacks. A refund is a voluntary transfer back from the seller.
- `auth-capture` holds funds in escrow and lets the seller capture, void or refund after serving. Prefer sellers who offer it for larger tickets.
- `batch-settlement` deposits can be refunded when a channel goes idle, but only after outstanding vouchers are claimed.

If a purchase is useless, the realistic remedy is reputation, not reversal. See [[trust-for-paid-context]].

## Budget sizing

Tie the budget to what the alternative costs: a fraction of the compute or user time the step would otherwise burn. Fee math is in [[micropayment-economics]].

## Checklist

1. Parse the offer; convert to dollars.
2. Check payee, network, asset against allowlists.
3. Check per-call cap and rolling budget.
4. Ask if over a threshold or unknown; otherwise pay.
5. Attach an idempotency ID.
6. Log price, payee, receipt, and whether the result was useful.

## Sources

- [CDP SDK: SpendControls](https://docs.cdp.coinbase.com/sdks/cdp-sdks-v2/typescript/x402/type-aliases/SpendControls)
- [CDP: settlement pending and reconciliation](https://docs.cdp.coinbase.com/x402/seller/settlement-pending)
- [CDP x402 FAQ (refunds)](https://docs.cdp.coinbase.com/x402/support/faq)
- [x402 docs: payment schemes](https://docs.x402.org/schemes/overview)
- [x402 docs: payment-identifier](https://docs.x402.org/extensions/payment-identifier)
- [x402 docs: Sign-In-With-X](https://docs.x402.org/extensions/sign-in-with-x)
- [x402 docs: batch settlement](https://docs.x402.org/schemes/batch-settlement)
- [MCP spec: elicitation](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation)
- [Google Cloud: announcing AP2](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol)
