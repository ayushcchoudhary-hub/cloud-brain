# Trust for Pay-Before-You-See Goods

> Information goods have to be paid for before they can be judged, and agent payments have no chargebacks. Notes on the mechanisms that exist so far (signed receipts, on-chain reputation, previews, escrow) and how they fit together.

## The core problem

Context, research and data are classic "experience goods": you only know if it was worth it after you have it, and once you have it you cannot give it back. Add two facts about agent payments:

- `exact` and `upto` x402 payments are irreversible once settled. No chargebacks.
- Buyers are often software, deciding in seconds, with no human reading reviews.

So the question shifts from "can I get my money back" to "how do I know before I pay".

## Mechanism 1: show enough before charging

The cheapest trust tool is a free preview that lets the buyer judge relevance without getting the value. Examples of what can be shown for free: title, summary, table of contents, how many sources, how recently updated, a coverage score against the query. The buyer pays for the body.

Rule of thumb: preview **what it covers**, never **what it says**.

## Mechanism 2: signed offers and receipts

The x402 **Offer and Receipt** extension has the server sign an offer on every 402 (committing to terms) and a receipt on every 200 (confirming delivery). Signatures use EIP-712 (wallet keys) or JWS (any asymmetric key, identity via `did:web`). The docs name the uses directly:

- reputation systems, as a "Verified Purchase" equivalent for the open web;
- dispute resolution, since the offer proves terms and the receipt proves delivery;
- auditing, without exposing transaction details.

The docs also advise a dedicated signing key separate from the `payTo` wallet.

## Mechanism 3: on-chain identity and reputation (ERC-8004)

ERC-8004, "Trustless Agents", is a draft Ethereum standard created 13 August 2025. Going by the listed emails and handles, its authors come from MetaMask, the Ethereum Foundation, Google and Coinbase. It defines three registries:

- **Identity:** each agent is an ERC-721 token pointing to a registration file.
- **Reputation:** any client address can post feedback (a score, tags, a link to an off-chain file). The agent's own owner cannot rate itself. Reads require a list of client addresses to filter, to limit Sybil spam.
- **Validation:** an agent can ask a validator (re-execution, zkML, TEE, or a judge) to score its work from 0 to 100.

The link to payments: the optional feedback file has a `proofOfPayment` field (from, to, chain, transaction hash) that can carry an x402 payment proof. Feedback tied to a real payment is harder to fake than a free review.

Status note: it is still a draft. Treat production reliance as early.

## Mechanism 4: escrow and refundable schemes

x402's `auth-capture` scheme holds funds in escrow and lets the seller capture, void or refund after the resource is served. It does not decide disputes, but it makes a refund path possible without a manual transfer. See [[agent-spend-policy]].

## Mechanism 5: a trusted intermediary

Cloudflare's pay per crawl puts Cloudflare in the middle as merchant of record, and Visa's Trusted Agent Protocol has Visa vet agents before merchants trust them. Both trade decentralization for a party that can be held accountable. Details in [[agent-payment-landscape]].

## Putting it together for paid context

A layered setup for an agent buying compiled research mid-session:

1. **Before paying:** free preview of coverage and sources; seller identity and reputation looked up; price checked against the agent's cap.
2. **At payment:** signed offer stored; idempotency ID attached.
3. **After delivery:** signed receipt stored; agent rates usefulness, ideally tied to the payment proof.
4. **Over time:** sellers with low usefulness ratings get lower caps or are skipped.

The weak point is step 3. A rating is only as good as the buyer's judgment, and agents grading their own purchases are a new source of noise. Whether reputation signals from agents converge on quality is not yet shown in public data I could find.

## Sources

- [x402 docs: signed offers and receipts](https://docs.x402.org/extensions/offer-receipt)
- [x402 docs: payment schemes](https://docs.x402.org/schemes/overview)
- [CDP x402 FAQ (refunds and chargebacks)](https://docs.cdp.coinbase.com/x402/support/faq)
- [ERC-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004)
- [Cloudflare: introducing pay per crawl](https://blog.cloudflare.com/introducing-pay-per-crawl/)
- [VentureBeat: Visa Trusted Agent Protocol](https://venturebeat.com/ai/visa-just-launched-a-protocol-to-secure-the-ai-shopping-boom-heres-what-it)
