# Micropayment Economics: Fees vs Ticket Size

> Worked numbers on what it costs to collect a payment at different ticket sizes across cards, processor stablecoin pricing, the x402 facilitator, and batched settlement. The short answer: fixed per-transaction fees decide everything below a dollar.

## Why fixed fees dominate

Any fee with a fixed part becomes a huge percentage on small tickets. Card pricing is the clearest example: Stripe's standard US domestic card rate is **2.9% + 30 cents**. The 30 cents does all the damage.

## Fee as a share of the ticket

Using published prices (Stripe pricing page; CDP Facilitator pricing after the free tier). Card and processor fees are what the seller pays. The facilitator fee is per on-chain settlement and covers gas.

| Ticket | Card (2.9% + $0.30) | Processor stablecoin (1.5%) | x402 via CDP, one settlement ($0.001) | x402 batched, 1,000 per settlement |
| --- | --- | --- | --- | --- |
| $0.001 | about 30,000% | 1.5% | 100% | 0.1% |
| $0.01 | 3,003% | 1.5% | 10% | 0.01% |
| $0.10 | 303% | 1.5% | 1% | about 0% |
| $1.00 | 32.9% | 1.5% | 0.1% | about 0% |
| $3.00 | 12.9% | 1.5% | 0.03% | about 0% |
| $10.00 | 5.9% | 1.5% | 0.01% | about 0% |

Notes on the table:

- The first 1,000 CDP settlements each month are free, so a small seller pays nothing at all at low volume.
- Batched settlement assumes the seller claims 1,000 vouchers in one on-chain transaction. Coinbase says one transaction "can process thousands of payments."
- Stripe's 1.5% stablecoin rate includes fiat conversion, screening and gas sponsorship. A separate Link stablecoin rate of 0.8% is promotional through 1 January 2027.

## Reading the numbers

- **Below about $4, cards are a bad fit.** At $4.23 the card fee is about 10% of the ticket; below that it climbs fast.
- **Between $0.01 and $1, a single x402 settlement works.** $0.001 against a $0.01 call is 10%, which is high but tolerable; at $0.10 it is 1%.
- **Below $0.01, settle in batches** or aggregate like Cloudflare does. Per-request on-chain settlement stops making sense.
- **Percentage pricing (1.5%) never breaks on small tickets,** but someone is still paying gas underneath. That works because the processor batches or subsidises.

## What real prices look like

- CoinGecko launched x402 endpoints at **$0.01 USDC per request** (February 2026).
- The CDP Facilitator reports over 100 million transactions and **$28M** in volume across Base and Solana. That is an average of about **$0.28** per payment.
- Cloudflare's pay per crawl avoids per-request settlement entirely: it records billing events and charges crawlers in aggregate, as merchant of record.

## Costs that are not in the fee line

- **Capital lock-up.** Batched settlement needs a deposit. The x402 batch scheme defaults to 5 times the per-request maximum (minimum 3), or 10 times if the server sends a `minDeposit` hint. A cap of $0.05 per call means locking $0.25 to $0.50 per channel.
- **Cash delay.** Batching saves gas but delays when the seller gets paid. The x402 docs give example cadences of claims every 60 seconds and settlement every 300 seconds.
- **On and off ramps.** Getting USDC in and out of a bank account has its own cost. Direct issuer accounts can be cheap; processors bundle conversion into their percentage.
- **Failed and duplicate payments.** Retries without idempotency can double-charge. The `payment-identifier` extension exists for this.
- **No chargebacks.** Good for sellers, bad for buyers. Cost of a bad purchase falls fully on the buyer, which is why spend limits matter. See [[agent-spend-policy]].

## The other side of the ledger

The buyer's decision is not "is the fee small" but "is the thing worth more than price plus fee". For an agent, the alternative cost is usually its own compute and time: re-fetching, re-deriving, or asking the user. A $0.01 data call that saves a few thousand tokens is cheap. A $3 compiled answer is worth it only if it replaces substantially more work and is actually relevant, which is the trust problem in [[trust-for-paid-context]].

## Sources

- [Stripe pricing](https://stripe.com/pricing)
- [CDP Facilitator pricing](https://docs.cdp.coinbase.com/x402/seller/facilitator)
- [CDP x402 FAQ](https://docs.cdp.coinbase.com/x402/support/faq)
- [x402 docs: batch settlement](https://docs.x402.org/schemes/batch-settlement)
- [x402 docs: payment-identifier extension](https://docs.x402.org/extensions/payment-identifier)
- [The Block: Stripe x402 preview and CoinGecko endpoints](https://www.theblock.co/post/389352/stripe-adds-x402-integration-usdc-agent-payments)
- [Cloudflare: introducing pay per crawl](https://blog.cloudflare.com/introducing-pay-per-crawl/)
