# Treasury Risk Comparison for a $5M Holding

> Side-by-side risk notes for a company holding about $5M in USDC, PYUSD, USDG, a Bridge-issued coin or USDe: depeg history, counterparty and custody exposure, chain support, and common setup patterns with their tradeoffs.

Research notes from public sources, as of November 2026. Not financial advice.

## Depeg history

| Token | Worst known event | What happened |
| --- | --- | --- |
| USDC | March 2023, low of about $0.88 | Circle disclosed $3.3B (about 8.25% of reserves) stuck at Silicon Valley Bank. About $2.3B was burned in 24 hours as holders redeemed. The peg later recovered. |
| PYUSD | 15 October 2025, brief wobble | Paxos minted 300 trillion PYUSD by mistake and burned it within about 30 minutes. Price moved briefly off $1; Aave froze PYUSD markets as a precaution. |
| USDe | October 2025, $0.65 on Binance | Ethena blamed a Binance-specific oracle problem and said backing was unaffected. Supply fell from about $14.7B before the event to about $9.4B by 1 November, then a further 24% in November 2025 as holders redeemed. |
| USDG, Bridge coins | None found | Shorter history. Absence of an event is not evidence of safety. |

Prices on DefiLlama on 7 November 2026: USDC 0.9998, PYUSD 0.9996, USDG 0.9999, USDe 0.9987.

## Counterparty and structural risk

**Bank concentration (fiat-backed coins).** SVB showed that a single bank holding a slice of reserves can break the peg for a weekend. The OCC's final rule now caps exposure to any one counterparty at 40% of reserves, excluding US government exposure and centrally cleared repo.

**Issuer insolvency.** The GENIUS Act gives stablecoin holders priority over other claims on reserves if a permitted issuer fails, and amends the bankruptcy code to match. Paxos and Bridge both describe reserves as held in segregated, bankruptcy-remote accounts. None of these tokens is a bank deposit; PayPal's page says plainly that PYUSD balances are not deposits.

**Synthetic structure (USDe).** Risks stack differently: funding rates can turn negative, a custodian or exchange can fail between settlement cycles, and redemptions depend on approved market makers. Ethena's Reserve Fund is the buffer, and it currently receives 0% of revenue. Ethena can freeze and redistribute sUSDe at restricted addresses.

**Regulatory status.** From 18 January 2027, US platforms will need to sort tokens into authorized and not. Paxos says it is OCC-supervised. Circle has final OCC approval (July 2026) for a national trust bank that starts with custody only. Bridge holds a conditional approval (February 2026). USDe's status is unclear. See [[stablecoin-regulatory-status]].

## Custody choices

- **Issuer account** (Circle Mint, Paxos): cleanest path to redemption, but balances held there are a claim on the platform.
- **Qualified custodian:** adds a layer of segregation and audit trail, at a fee.
- **Self-custody wallet:** no platform risk, but key management falls on the holder. Issuers keep the ability to block addresses: Bridge lists allow and block lists as a configurable feature of issued coins, and Ethena's docs say its sUSDe freeze controls are "extremely similar" to what Circle implements for USDC.

## Chain support

| Token | Native chains (from issuer pages) |
| --- | --- |
| USDC | 38 mainnets on Circle's contract list, including Ethereum, Solana, Base, Arbitrum, Polygon, Stellar |
| PYUSD | Ethereum, Solana, Arbitrum, X Layer, Stellar, Polygon, Stable |
| USDG | Ethereum, Solana, Arbitrum, Ink, Mantle, Robinhood Chain, X Layer |
| USDe | Ethereum, with LayerZero OFT deployments listed for other chains |
| Bridge coins | Chosen by the brand |

Bridged versions (for example USDC.e) are not the issuer's token and add bridge risk on top of issuer risk. The issuer pages above list native contracts only.

## Cost of getting out

On $5M: Circle Standard redemption has no Circle fee and takes up to 2 business days; Express costs $2,500 before credits. Paxos says direct redemption is free. USDe exits through secondary markets for anyone who is not an approved market maker, so cost is slippage. Detail in [[redemption-mechanics-and-fees]].

## Setup patterns and their tradeoffs

Patterns that appear in the sources, with what each trades off. Not a recommendation:

1. **Fiat-backed coin with a direct redemption account.** Gives a 1:1 exit with no price risk; costs onboarding time and a tested bank path.
2. **Balances split across two issuers.** Limits exposure to one issuer's bad weekend; costs a second onboarding and more monitoring.
3. **Yield-bearing positions (sUSDe, rewards programs) kept apart from cash.** The return comes with market, custody or regulatory risk that cash balances do not carry. See [[yield-and-distribution-economics]].
4. **Public signals.** Monthly reserve reports and charter status are the published data points through 2027.

## Sources

- [The Block: USDC at about $0.90 after SVB disclosure](https://www.theblock.co/post/218993/usdc-and-dai-remain-at-about-0-90-following-circles-disclosure-of-funds-at-svb)
- [The Block: Paxos mistakenly mints $300 trillion PYUSD](https://www.theblock.co/post/374870/paxos-mistakenly-mints-300-trillion)
- [Cointelegraph via Pulse: USDe contracts after October 2025](https://www.pulse.bot/crypto/news/ethenas-synthetic-usde-contracts-sharply-as-dollar-backed-stablecoins-expand-e2e7018e-e1de-4733-bb02-a0788db8328a/)
- [DefiLlama stablecoins API](https://stablecoins.llama.fi/stablecoins)
- [DefiLlama USDe supply history](https://stablecoins.llama.fi/stablecoin/146)
- [The Block: Circle wins final OCC approval (Jul 2026)](https://www.theblock.co/news/regulation/2026-07-10-stablecoin-firm-circle-wins-final-occ-approval-to-open-national-trust-bank-407876)
- [Skadden: OCC finalizes GENIUS Act rule](https://www.skadden.com/insights/publications/2026/10/occ-finalizes-genius-act-rule)
- [GENIUS Act, enrolled text](https://www.govinfo.gov/content/pkg/BILLS-119s1582enr/html/BILLS-119s1582enr.htm)
- [Circle USDC contract addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses)
- [Paxos PYUSD page](https://www.paxos.com/pyusd)
- [Global Dollar: about USDG](https://globaldollar.com/about-usdg)
- [Ethena docs: risks](https://docs.ethena.fi/protocol-overview/risks)
- [Bridge docs: issuance options](https://apidocs.bridge.xyz/platform/issuance/issuance-options)
