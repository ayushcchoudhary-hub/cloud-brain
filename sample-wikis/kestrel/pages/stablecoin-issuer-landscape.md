# Stablecoin Issuer Landscape: Circle, Paxos, Ethena, Bridge

> Who issues which dollar token, how big each one is, and the core difference in how each holds its peg. Starting point for a company choosing a token to hold or move on-chain.

Notes compiled from public sources, as of November 2026. Not financial advice.

## Scope

Four issuers, looked at from the seat of a company treasury or product team: Circle, Paxos, Ethena and Bridge. Two different asset types sit in this set and should not be compared as if they were the same thing:

- **Fiat-backed payment stablecoins.** USDC, EURC, PYUSD, USDG, USDP and Bridge-issued coins. Each token is meant to be backed 1:1 by cash, Treasuries and money market funds.
- **A synthetic dollar.** Ethena's USDe is backed by crypto assets hedged with short derivatives positions, plus a growing slice of liquid stablecoins and other assets. Its risks are market and counterparty risks, not bank-deposit risks.

## Snapshot

Supply figures from DefiLlama's stablecoin API, pulled 7 November 2026. For scale, USDT was about $176.8B on the same day.

| Token | Issuer | Backing, short version | Supply |
| --- | --- | --- | --- |
| USDC | Circle | Cash at banks plus the Circle Reserve Fund (a government money market fund) | about $70.7B |
| EURC | Circle | Euro reserves | about EUR 518M |
| PYUSD | Paxos, for PayPal | USD deposits, Treasuries, cash equivalents | about $2.7B |
| USDG | Paxos (Singapore and EU entities) | T-bills, money market funds, cash equivalents | about $2.7B |
| USDP | Paxos | Legacy Paxos dollar | about $22M |
| USDe | Ethena | Crypto spot hedged with short perps, liquid stablecoins, other strategies | about $4.9B |
| Custom coins | Bridge (Stripe) | Cash and Treasuries via BlackRock, Fidelity, Superstate, BUIDL | varies per coin |

## Issuer notes

**Circle.** Public company since its 2025 IPO. Q3 2026 results: average USDC in circulation $73.3B, reserve income $658M, distribution and transaction costs $412M. Circle's contract list shows USDC on 38 mainnet chains. EU issuance runs through Circle Internet Financial Europe SAS, which got a French EMI licence in July 2024. Circle received conditional OCC approval for a national trust bank in December 2025.

**Paxos.** Issues PYUSD for PayPal (PayPal's own page says it "is issued by Paxos, not PayPal or Venmo"), USDG for the Global Dollar Network, and the older USDP. Paxos converted its NYDFS trust charter into an OCC national trust charter on 12 December 2025, so its US issuance is now federally supervised. USDG is issued outside the US by Paxos Digital Singapore (MAS) and Paxos Issuance Europe (Finnish FSA). The network reported more than 150 partners in July 2026, including Kraken, OKX and Robinhood.

**Ethena.** USDe is minted against backing assets, with short perpetual futures hedging the price exposure. Assets sit with off-exchange settlement custodians (Copper, Ceffu, Kraken, Anchorage Digital) rather than on exchanges. Only approved, KYC'd market makers can mint or redeem directly. sUSDe is the staked version that receives protocol rewards. Supply fell from $9.3B to $7.1B in November 2025 after an October dislocation on Binance, and sits near $4.9B now.

**Bridge.** Stripe completed the acquisition on 4 February 2025. Two products matter here: an orchestration API for moving between fiat and stablecoins, and Open Issuance, where a company launches its own branded coin with Bridge as issuer of record. Bridge holds the reserves and passes reserve revenue, minus issuance fees, to the brand. It also offers USDB (closed loop) and supports Open USD from Open Standard. Bridge got conditional OCC approval for a national trust bank in February 2026.

## Where the details live

- Backing and audit cadence: [[reserve-models-and-attestations]]
- Getting dollars back out: [[redemption-mechanics-and-fees]]
- GENIUS Act, MiCA, charters: [[stablecoin-regulatory-status]]
- Who keeps the interest: [[yield-and-distribution-economics]]
- A $5M treasury view: [[treasury-risk-comparison]]

## Open items

- Whether Bridge's trust charter has moved from conditional to final. Not confirmed in public sources I found.
- How regulators will classify USDe under the GENIUS Act. Not settled publicly.

## Sources

- [DefiLlama stablecoins API](https://stablecoins.llama.fi/stablecoins)
- [Circle Q3 2026 results](https://www.circle.com/pressroom/circle-reports-third-quarter-2026-results)
- [Circle USDC contract addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses)
- [Paxos completes OCC conversion (Dec 2025)](https://www.paxos.com/newsroom/occ-approves-paxos-application-to-convert-to-occ-trust-paxos-to-complete-conversion-imminently-to-become-a-federally-regulated-blockchain-infrastructure-provider)
- [Global Dollar Network: 150 partners](https://globaldollar.com/newsroom/150-partners)
- [Ethena docs: off-exchange custody](https://docs.ethena.fi/overview/off-exchange-custody)
- [Stripe completes Bridge acquisition](https://stripe.com/newsroom/news/stripe-completes-bridge-acquisition)
- [The Block: Bridge conditional OCC approval](https://www.theblock.co/post/390263/stripe-stablecoin-bridge-wins-conditional-occ-approval-national-bank-charter)
