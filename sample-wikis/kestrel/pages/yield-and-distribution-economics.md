# Yield and Distribution Economics

> Who keeps the interest on stablecoin reserves, how much flows to distributors, what holders can actually earn, and where sUSDe's yield comes from and what can break it.

Research notes from public sources, as of November 2026. Not financial advice.

## The basic split

Reserves earn roughly the short-term Treasury rate. Holders of a fiat-backed coin get no interest by default. The question is who gets that spread: issuer, distributor, or holder.

## Circle: most of the spread goes to distribution

- Q3 2026: reserve income $658M, down 8% year on year because the reserve return rate fell 61 bps.
- Distribution, transaction and other costs: $412M in the same quarter, so roughly 63% of reserve income went back out.
- The biggest recipient is Coinbase. Under the collaboration agreement, Coinbase gets 100% of reserve income on USDC held on its platform and 50% of the residual on USDC held elsewhere. The agreement renewed on existing terms and runs through 2029.
- USDC terms: holders "are not entitled to any interest or other returns earned on such funds."

## Paxos: yield is passed to partners by design

- **PYUSD via PayPal:** PayPal's page advertised 4% annual rewards on PYUSD held in eligible accounts as of 7 November 2026. The rate is variable, calculated on average daily balance, paid monthly in PYUSD, requires opting in and holding at least 1 PYUSD. PayPal pays it, not Paxos. I could not confirm whether business accounts are eligible.
- **USDG:** Global Dollar Network partners can keep up to the full reserve yield on USDG held on their platforms, plus extra rewards for growing the network. The network said in July 2026 that tens of millions of dollars had been paid out.

## Bridge: the brand keeps the yield

When Bridge issues a coin for a company, the company receives reserve revenue minus issuance fees. Bridge's published reward guide (rates move with the Fed):

| Reserve bucket | Approximate reward |
| --- | --- |
| Treasuries | Effective Fed Funds Rate minus about 20 bps |
| Off-chain USD | EFFR minus about 200 bps |
| On-chain stablecoins | 0% |

Bridge's own examples on $100M: a 50/50 liquid and Treasury split earns about 2.2%; a 10/90 split earns about 3.3%. Rewards are paid by the 5th business day of the next month, as new tokens or fiat. The trade is redemption speed against yield, covered in [[redemption-mechanics-and-fees]].

## Ethena sUSDe: yield from derivatives and more

Sources of protocol revenue, per Ethena's docs:

- Funding and basis on short perpetual and futures positions (longs pay shorts when markets are bullish).
- Staking rewards on liquid staking tokens.
- Lending, tokenized real-world assets, and rewards on liquid stablecoin holdings.

Rewards flow into the staking contract every 8 hours and vest linearly over 8 hours, so the sUSDe to USDe rate rises over time. Recent numbers from Ethena's yield API (as of 4 November 2026):

- 30-day average sUSDe yield: 5.00%
- 90-day average: 4.77%
- Average since inception: 10.23%

Yield follows crypto leverage demand, hence the gap. Risks named in Ethena's own docs include negative funding, custodian failure, exchange failure, and backing-asset risk. Negative periods are meant to be absorbed by the Reserve Fund, but the current share of revenue going into that fund is 0%. Ethena can also freeze and redistribute sUSDe held by sanctioned or restricted addresses, and US addresses cannot stake at all.

## GENIUS Act limits

The statute bars issuers from paying holders interest or yield "solely in connection with" holding, using or retaining a payment stablecoin. The OCC's final rule:

- does not define "interest" or "yield" and will look at economic substance;
- offers no safe harbor for pre-Act rewards programs, de minimis payments or white-label partners;
- dropped a proposed presumption against affiliate arrangements, and expects a later clarifying rule;
- excludes bank deposits, including tokenized deposits.

So rewards like PayPal's and partner sharing like USDG's are not banned outright, but sit under case-by-case review. Any advertised rate sits under that review.

## Published rates side by side

Rates as published on the dates shown. They change often and are not a forecast of returns.

| Option | Published rate | Main catch |
| --- | --- | --- |
| USDC held directly | 0% (USDC terms) | Issuer and distributors keep the spread |
| PYUSD with PayPal rewards | 4%, variable (PayPal page, 7 Nov 2026) | Eligibility rules; business accounts unconfirmed; case-by-case GENIUS review |
| Own Bridge coin | 2.2% to 3.3% (Bridge's $100M examples) | Needs a product reason to issue |
| sUSDe | 5.00% 30-day average (Ethena API, 4 Nov 2026) | Past average only; market, custody, funding risk; US restricted |

## Sources

- [Circle Q3 2026 results](https://www.circle.com/pressroom/circle-reports-third-quarter-2026-results)
- [KuCoin: Circle and Coinbase agreement renewed through 2029](https://www.kucoin.com/blog/circle-renews-usdc-revenue-sharing-agreement-with-coinbase-through-2029)
- [Circle USDC terms](https://www.circle.com/legal/usdc-terms)
- [PayPal PYUSD page](https://www.paypal.com/us/digital-wallet/manage-money/crypto/pyusd)
- [Global Dollar Network: 150 partners](https://globaldollar.com/newsroom/150-partners)
- [Bridge docs: earning rewards](https://apidocs.bridge.xyz/platform/issuance/rewards)
- [Bridge docs: reserve management](https://apidocs.bridge.xyz/platform/issuance/reserve-management)
- [Ethena docs: risks](https://docs.ethena.fi/protocol-overview/risks)
- [Ethena yield API](https://ethena.fi/api/yields/protocol-and-staking-yield)
- [Skadden: OCC finalizes GENIUS Act rule](https://www.skadden.com/insights/publications/2026/10/occ-finalizes-genius-act-rule)
