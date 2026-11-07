# Stablecoin Regulatory Status: GENIUS Act, MiCA, Charters

> Where US implementation of the GENIUS Act stands in November 2026, which charter each issuer holds, and how MiCA treats each token in the EU.

## GENIUS Act: the dates

- **Signed:** 18 July 2025.
- **Effective:** the earlier of 18 months after enactment or 120 days after regulators issue final rules. That works out to **18 January 2027**. The OCC's final rule came out on 21 October 2026, and 120 days from then is later than 18 January, so the 18-month date holds.
- **After 18 January 2027:** issuing a payment stablecoin in the US without federal or state authorization is unlawful, and restrictions on foreign-issued stablecoins begin.
- **18 July 2028:** digital asset service providers may no longer deal in non-compliant payment stablecoins.

## Implementation status, November 2026

Regulators missed the July 2026 deadline the statute set for final rules. Where each agency stands:

| Agency | Status |
| --- | --- |
| OCC | Final rule issued 21 Oct 2026 (Bulletin 2026-50), plus Bulletin 2026-51 on applications and waivers |
| FDIC | Proposed 4 Apr 2026, not yet final |
| Federal Reserve | Proposed 29 Sep 2026 |
| Treasury (FinCEN, OFAC) | AML and sanctions rules proposed April 2026 |
| Treasury | Principles for state regimes proposed April 2026 |

**Applying under the OCC rule:** an existing US issuer needs a substantially complete application pending by 18 January 2027 to qualify for a waiver of up to 12 months. A substantially complete application is deemed approved on day 120 unless denied. Draft licensing forms were posted 28 October 2026 with comments due 23 November 2026. Filing only opens after OMB approval, which the OCC will announce.

**State route:** issuers with $10B or less outstanding can opt for a state regime instead of federal supervision.

**Yield:** the statute bans issuers from paying interest or yield "solely in connection with" holding a payment stablecoin. Detail in [[yield-and-distribution-economics]].

**Wider market structure bill:** the CLARITY Act had stalled as of August 2026, with treatment of stablecoin rewards one of the sticking points.

## Issuer by issuer (US)

- **Circle:** conditional OCC approval for a national trust bank, December 2025.
- **Paxos:** converted its NYDFS limited purpose trust charter into an OCC national trust charter, completed 12 December 2025. All of Paxos Trust Company's US activity, including PYUSD, is now under OCC supervision. NYDFS appears on PayPal's page only for PayPal's own New York virtual currency licence.
- **Bridge:** conditional OCC approval for a national trust bank, 17 February 2026. Bridge's current FAQ describes it as a registered MSB with state money transmitter licences. I could not confirm final charter approval.
- **Ethena:** USDe is a synthetic dollar, not a fiat-reserve token. Ethena's docs treat the US as a restricted jurisdiction for staking (US addresses cannot stake into sUSDe). For partner products that need a GENIUS-compliant asset, Ethena points to USDtb, issued by Anchorage Digital Bank. Whether USDe itself falls inside the GENIUS definition of a payment stablecoin has not been settled publicly. Treat as uncertain.

## EU: MiCA

- **USDC and EURC:** Circle Internet Financial Europe SAS got an EMI licence from France's ACPR and announced MiCA compliance on 1 July 2024.
- **USDG:** issued in the EU by Paxos Issuance Europe OY, supervised by the Finnish FSA, live for EU users from 1 July 2025. Part of its reserves must sit with European banks.
- **PYUSD:** no MiCA issuance route found in my reading.
- **USDe:** in March 2025 Germany's BaFin found "serious deficiencies" in Ethena GmbH's authorization, ordered it to stop offering USDe, and Ethena said its MiCA application would not be approved. Ethena's docs now say sUSDe is not offered to persons resident in the EU or EEA.
- **CASPs:** the MiCA grandfathering window for crypto-asset service providers ended 1 July 2026, so EU venues now need full authorization.

## Singapore

USDG's main issuer, Paxos Digital Singapore, is a Major Payments Institution supervised by the Monetary Authority of Singapore.

## What this means for a holder

By late January 2027 the US picture splits into authorized issuers (or those with a pending application and waiver) and everything else. For a treasury, the practical questions are in [[treasury-risk-comparison]].

## Sources

- [GENIUS Act, enrolled text](https://www.govinfo.gov/content/pkg/BILLS-119s1582enr/html/BILLS-119s1582enr.htm)
- [Skadden: OCC finalizes GENIUS Act rule](https://www.skadden.com/insights/publications/2026/10/occ-finalizes-genius-act-rule)
- [Winston Taylor: OCC final rule summary](https://www.winstontaylor.com/insights/occ-finalizes-genius-act-rules-for-stablecoin-issuers)
- [The Block: OCC races to finalize rules (Aug 2026)](https://theblock.co/news/regulation/2026-08-19-occ-races-to-finalize-genius-act-stablecoin-rules-by-november-412240)
- [Paxos completes OCC conversion](https://www.paxos.com/newsroom/occ-approves-paxos-application-to-convert-to-occ-trust-paxos-to-complete-conversion-imminently-to-become-a-federally-regulated-blockchain-infrastructure-provider)
- [The Block: Bridge conditional OCC approval](https://www.theblock.co/post/390263/stripe-stablecoin-bridge-wins-conditional-occ-approval-national-bank-charter)
- [Circle MiCA announcement](https://www.circle.com/pressroom/circle-is-first-global-stablecoin-issuer-to-comply-with-mica-eus-landmark-crypto-law)
- [Paxos: USDG launches in the EU](https://www.paxos.com/newsroom/global-dollar-(usdg)-launches-in-the-eu)
- [The Block: BaFin halts Ethena GmbH](https://www.theblock.co/post/347532/regulator-halts-ethenas-usde-stablecoin-offering-in-germany-over-concerns)
- [ESMA: MiCA overview](https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica)
