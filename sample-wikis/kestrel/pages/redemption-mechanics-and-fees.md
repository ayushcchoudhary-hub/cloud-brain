# Redemption Mechanics, Fees and Timing

> How a company actually turns each token back into bank dollars: who can redeem direct, what it costs on a $5M ticket, how long it takes, and what the OCC rule will force from 2027.

## The two exits

There are always two ways out of a stablecoin:

1. **Primary redemption** with the issuer, 1:1, after onboarding. Slow to set up, no price risk.
2. **Secondary sale** on an exchange or DEX. Fast, but you take whatever the market price is, and on a bad day that is below $1.

For $5M, the primary route matters. Set it up early.

## Circle Mint (USDC, EURC)

- Only Circle Mint account holders can redeem with Circle directly. The USDC terms say Circle commits to redeem 1 USDC for 1 USD, "subject to these Terms, applicable law, and any fees where applicable."
- New pricing took effect 19 October 2026 (existing customers move at their next billing period):
  - **Standard:** no Circle redemption fee, processing within up to 2 business days.
  - **Express:** 0.05% of the gross amount, near-instant processing.
  - Express credits for positive net minting in the billing period: 25%, rising to 75% at $40M and 100% at $100M of net minting. Credits cannot exceed fees paid.
  - The old net-redemption overage fee was removed.
- Sending USDC on-chain out of a Mint account carries separate network fees.
- Circle's terms say it may delay redemptions it reasonably believes are suspicious.

**$5M example:** Standard costs nothing in Circle fees and takes up to 2 business days. Express costs $2,500 before any credits. A company that is not also minting heavily will not see much credit.

## Paxos (PYUSD, USDG, USDP)

- Paxos says minting, holding and redeeming Paxos-issued stablecoins through its own infrastructure carries **zero fees**. That is Paxos's marketing claim, but it is consistent across its pages.
- Mint and redeem run 24/7 on-chain, with same-day fiat windows. Fiat settlement time depends on the rail.
- Institutional access is through the Paxos Dashboard or API. I did not find a published redemption minimum.
- **PYUSD through PayPal:** PayPal charges no fees to buy, sell, hold or transfer PYUSD for eligible users. Converting into non-USD currencies includes a spread. This is a consumer and merchant route, not the institutional one.

## Bridge (custom coins)

Redemption speed depends on how the brand set its reserve mix (see [[reserve-models-and-attestations]]):

| Reserve bucket | Redemption window |
| --- | --- |
| On-chain stablecoins | Instant, 24/7 |
| Off-chain USD (Lead Bank) | Instant during US banking hours |
| Treasuries | Within 1 business day, mostly banking hours |

End users of a Bridge-issued coin redeem into other stablecoins such as USDC or USDT, or into USD, depending on what the brand enables. Bridge's revenue comes from issuance fees netted against reserve rewards. I did not find a published per-redemption fee.

## Ethena (USDe, sUSDe)

- Direct mint and redeem is limited to approved market-making counterparties who pass KYC/KYB. Quotes are valid for short windows.
- Everyone else exits through secondary markets (Curve, Uniswap, centralized exchanges). A treasury holding USDe is effectively relying on market makers to keep the price near $1.
- **sUSDe** has an unstaking cooldown. Ethena's docs say it is currently dynamic, between 1 and 7 days depending on reserve conditions. The contract allows governance to set it as high as 90 days.

## What the OCC rule requires from 18 January 2027

For federally supervised issuers:

- Redemption within **two business days**. The clock starts when the issuer has the request and the holder is onboarded, and stops when the issuer starts the outgoing transfer.
- If redemptions for one brand exceed 10% of its outstanding supply within 24 hours, the issuer must tell the OCC within 24 hours and may ask for an extension.
- Redemption fees are allowed if disclosed. The statute requires 7 days' notice before fees change.

Circle's free tier already sits at that two-day ceiling.

## Practical checklist

- Open the primary account (Circle Mint, Paxos) before buying. Onboarding takes time.
- Run a small test redemption end to end, including the bank wire.
- For USDe, check on-chain liquidity depth for your size before entering.

## Sources

- [Circle USDC terms](https://www.circle.com/legal/usdc-terms)
- [Digital Today: Circle revises USDC redemption fees](https://www.digitaltoday.co.kr/en/view/116755/circle-revises-usdc-redemption-fees-standard-free-express-0-05-percent)
- [Paxos mint and redeem](https://www.paxos.com/mint-and-redeem)
- [PayPal PYUSD page](https://www.paypal.com/us/digital-wallet/manage-money/crypto/pyusd)
- [Bridge docs: reserve management](https://apidocs.bridge.xyz/platform/issuance/reserve-management)
- [Bridge docs: stablecoins FAQ](https://apidocs.bridge.xyz/platform/issuance/faq)
- [Ethena docs: how to stake USDe](https://docs.ethena.fi/video-guides/how-to-stake-usde)
- [Skadden: OCC finalizes GENIUS Act rule](https://www.skadden.com/insights/publications/2026/10/occ-finalizes-genius-act-rule)
- [GENIUS Act, enrolled text](https://www.govinfo.gov/content/pkg/BILLS-119s1582enr/html/BILLS-119s1582enr.htm)
