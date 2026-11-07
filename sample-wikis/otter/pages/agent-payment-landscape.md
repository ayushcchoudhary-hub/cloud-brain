# Agent Payment Landscape Beyond x402

> The other serious efforts to let software agents pay: Google's AP2, Stripe and OpenAI's Agentic Commerce Protocol, Stripe's x402 support, Visa's Trusted Agent Protocol, and Cloudflare's pay per crawl. What each one actually solves and where they overlap.

## Two different problems

Most confusion comes from mixing two jobs:

1. **Agent buys something for a person** (a flight, a pair of shoes). Large tickets, card rails, merchant fraud rules, returns. The hard part is proving the person authorized it.
2. **Agent pays a machine for a machine thing** (an API call, a page, a dataset). Tiny tickets, no human in the loop, no returns. The hard part is cost per transaction and speed.

x402 (see [[x402-protocol-and-settlement]]) is aimed squarely at job 2. Most card-network work is aimed at job 1.

## Google AP2 (Agent Payments Protocol)

- Announced 16 September 2025, with more than 60 organizations including Adyen, American Express, Coinbase, Mastercard, PayPal and Salesforce.
- Payment-method agnostic: cards, stablecoins, real-time bank transfers.
- Core idea is **mandates**: signed digital contracts backed by verifiable credentials.
  - An **Intent Mandate** captures what the user asked for, with rules such as price limits and timing, signed up front for delegated tasks.
  - A **Cart Mandate** records the exact items and price the user (or the agent, within the intent rules) approved.
- The chain intent, cart, payment gives a non-repudiable audit trail for disputes.
- Works as an extension of A2A and MCP. Google, Coinbase, the Ethereum Foundation and MetaMask also shipped an A2A x402 extension for stablecoin payments.

AP2's mandate idea is directly useful for spend policy. See [[agent-spend-policy]].

## Stripe and OpenAI: Agentic Commerce Protocol (ACP)

- Announced 29 September 2025 alongside Instant Checkout in ChatGPT (US users buying from US Etsy merchants first).
- ACP is an open standard co-developed by Stripe and OpenAI so a merchant can sell through multiple agents with one integration. It works with payment providers other than Stripe.
- Stripe's **Shared Payment Token** lets the agent app start a payment without seeing the buyer's card details. Tokens are scoped to one merchant and one cart total.
- Merchants keep the customer relationship: they accept or decline orders, charge the payment method, handle tax, fulfilment and returns.

## Stripe machine payments (x402)

- Preview announced 10 February 2026. Developers can charge agents for API calls, MCP calls and HTTP requests through Stripe's PaymentIntents API using x402, starting with USDC on Base.
- Stripe generates a deposit address per PaymentIntent; tax, refunds and reporting run through existing Stripe tools.
- Same day, CoinGecko launched x402 endpoints at $0.01 USDC per request.

It puts an x402 seller path inside a mainstream processor.

## Visa Trusted Agent Protocol

- Announced 14 October 2025, co-developed with Cloudflare.
- Approved agents get signing keys. When an agent visits a merchant, it signs requests with intent, consumer recognition data and optional payment information. Merchants or CDNs verify against Visa's registry.
- Built on HTTP Message Signatures (RFC 9421) and aligned with Web Bot Auth.
- Agents are vetted through Visa Intelligent Commerce; criteria and fees were not public in coverage I read.

The point is identity: telling a real shopping agent from a scraper.

## Cloudflare pay per crawl

- Announced 1 July 2025, private beta.
- Publishers set one per-request price for the whole site, and per crawler choose free, charge, or block.
- Crawlers authenticate with Web Bot Auth (Ed25519 keys, signed requests).
- A crawler hitting a paid URL gets **402** with a `crawler-price` header and retries with `crawler-exact-price`. Or it sends `crawler-max-price` up front and gets a 200 with `crawler-charged` if the price fits.
- Cloudflare is merchant of record: it aggregates billing, charges crawlers and pays publishers.

The design choice is aggregated billing through a trusted middleman instead of one on-chain payment per request, which sidesteps per-transaction fees (see [[micropayment-economics]]).

## Comparison

| Effort | Main job | Rail | Who carries trust |
| --- | --- | --- | --- |
| x402 | Machine pays per request | Stablecoins on-chain | Signed authorization, facilitator screening |
| AP2 | Agent buys for a person | Any | Signed mandates |
| ACP | Agent checkout with merchants | Cards via processor | Scoped payment token, merchant |
| Visa TAP | Agent identity at merchants | Card network | Visa registry |
| Pay per crawl | Crawler pays publisher | Cloudflare billing | Cloudflare as merchant of record |

## Sources

- [Google Cloud: announcing AP2](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol)
- [Stripe: Instant Checkout and ACP](https://stripe.com/newsroom/news/stripe-openai-instant-checkout)
- [The Block: Stripe adds x402 integration](https://www.theblock.co/post/389352/stripe-adds-x402-integration-usdc-agent-payments)
- [VentureBeat: Visa Trusted Agent Protocol](https://venturebeat.com/ai/visa-just-launched-a-protocol-to-secure-the-ai-shopping-boom-heres-what-it)
- [Cloudflare: introducing pay per crawl](https://blog.cloudflare.com/introducing-pay-per-crawl/)
- [Decrypt: x402 Foundation launch](https://decrypt.co/363173/coinbase-linux-foundation-launch-x402-foundation)
