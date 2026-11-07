# x402: HTTP 402 Payments and How They Settle

> How the x402 protocol turns the unused HTTP 402 status code into a pay-per-request flow: who built it, the exact header exchange, what a facilitator does, and how a payment lands on-chain.

## Background

RFC 9110 still says only: "The 402 (Payment Required) status code is reserved for future use." x402 is the most widely adopted attempt to give it a job.

- **May 2025:** Coinbase's developer platform launched x402. Launch collaborators named in the announcement included AWS, Anthropic, Circle and NEAR.
- **April 2026:** Coinbase and the Linux Foundation launched the x402 Foundation to govern the standard. Google, Stripe, Visa, Mastercard, Shopify, Cloudflare and the Solana Foundation were among the participants. The Coinbase GitHub repo is now a development fork of the foundation's repo.

## The flow, step by step

This is the current (v2) flow from the spec:

1. Client requests a resource.
2. Server replies **402 Payment Required** with a base64 `PAYMENT-REQUIRED` header listing one or more accepted options (`accepts`). Each option names a `scheme`, a `network` (CAIP-2 id, for example `eip155:8453` for Base), an `amount` in atomic units, the token `asset`, a `payTo` address and a timeout.
3. Client picks an option and signs a payment payload.
4. Client retries the request with a `PAYMENT-SIGNATURE` header.
5. Server verifies, locally or by calling a facilitator's `/verify`.
6. Server does the work.
7. Server settles, directly on-chain or via the facilitator's `/settle`.
8. Server returns **200** with the resource and a `PAYMENT-RESPONSE` header holding the settlement result.

## What the client actually signs

On EVM chains the default `exact` scheme uses **EIP-3009 `transferWithAuthorization`**, which USDC supports. The client signs an authorization (from, to, value, validity window, nonce). The facilitator submits it and pays gas, but it cannot change the amount or destination. Other ERC-20s fall back to **Permit2**, which needs a one-time approval. Solana uses SPL transfers.

## Schemes

- **exact:** a fixed price per request.
- **upto:** the client authorizes a maximum, the seller charges actual usage.
- **batch-settlement:** the client deposits once into an escrow channel and signs cumulative off-chain vouchers per request; the seller claims many vouchers in one transaction.
- **auth-capture:** funds are held in escrow and captured, voided or refunded after the resource is served. It makes refunds a protocol feature.

## Facilitators

A facilitator verifies signatures, screens transactions, submits settlement, and reports back. It is optional: a server can self-facilitate. Coinbase's CDP Facilitator is the largest. Its published terms, as of November 2026:

- Networks: Base, Polygon, Arbitrum, Monad, World and Solana (plus testnets).
- Price: first 1,000 on-chain settlements per month free, then $0.001 each. Verification is free. Failed settlements are not billed.
- Screening: every payment is checked against OFAC lists and KYT risk signals at verify and settle. A blocked payment fails with `kyt_risk_detected`.
- Scale: over 100 million transactions and $28M in volume across Base and Solana. That is an average ticket of roughly $0.28.

## Chains and tokens

The protocol is chain-agnostic. The x402 docs list EVM, Solana, TON, Algorand, Stellar, Aptos, Hedera, NEAR, XRPL, Cardano, Sui, Canton and others. In practice USDC dominates: Circle reported that 99.3% of x402 agent payment volume settled in USDC (Q2 2026). The Solana Foundation said Solana carried nearly 65% of x402 transaction volume in early 2026.

## Settlement edge cases worth knowing

- **settlement_pending.** The CDP Facilitator can return a 500 with `settlement_pending` when it broadcast the transaction but did not see confirmation in time. Coinbase warns not to treat this as failure and not to create a new payment, since that can charge the buyer twice. The canonical SDKs retry once with the same payload.
- **Idempotency.** The `payment-identifier` extension lets a client attach a payment ID so retries return the cached response instead of paying again.
- **Finality.** `exact` and `upto` payments are irreversible once settled. No chargebacks. Refunds are a manual transfer back, unless the seller uses `auth-capture`.

How an agent should decide whether to send that signed payment at all is in [[agent-spend-policy]]. Fee math is in [[micropayment-economics]]. Other protocols are in [[agent-payment-landscape]].

## Sources

- [RFC 9110, section 15.5.3](https://www.rfc-editor.org/rfc/rfc9110#section-15.5.3)
- [Coinbase: launching x402 (May 2025)](https://www.coinbase.com/developer-platform/discover/launches/x402)
- [Decrypt: Coinbase and Linux Foundation launch x402 Foundation](https://decrypt.co/363173/coinbase-linux-foundation-launch-x402-foundation)
- [x402 repo README](https://github.com/coinbase/x402)
- [x402 spec: exact scheme on EVM](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md)
- [x402 docs: payment schemes](https://docs.x402.org/schemes/overview)
- [x402 docs: networks and tokens](https://docs.x402.org/core-concepts/network-and-token-support)
- [CDP Facilitator docs](https://docs.cdp.coinbase.com/x402/seller/facilitator)
- [CDP x402 FAQ](https://docs.cdp.coinbase.com/x402/support/faq)
- [CDP: settlement pending and reconciliation](https://docs.cdp.coinbase.com/x402/seller/settlement-pending)
- [Circle Q2 2026 results](https://www.circle.com/pressroom/circle-reports-second-quarter-2026-results)
