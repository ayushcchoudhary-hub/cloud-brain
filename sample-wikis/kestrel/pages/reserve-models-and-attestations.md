# Reserve Models and Attestations

> What actually backs each token, who checks it, how often, and what the GENIUS Act and the OCC's final rule will require from January 2027.

## Attestation is not an audit

Most issuers publish **attestations**: an accounting firm examines a point-in-time reserve report and says whether it is fairly stated. That is narrower than a full financial statement audit. It says reserves matched supply on the report date, not what happened in between.

The GENIUS Act makes monthly examination the floor. A permitted issuer must publish its reserve composition every month (total tokens outstanding, amount and type of reserves, average tenor and custody location), have that report examined by a registered public accounting firm, and have its CEO and CFO certify it. Issuers with more than $50B outstanding also need annual audited financial statements. See [[stablecoin-regulatory-status]] for timing.

## Circle (USDC, EURC)

- Most USDC reserves sit in the **Circle Reserve Fund (USDXX)**, an SEC-registered 2a-7 government money market fund. BlackRock publishes the fund's holdings daily.
- The rest is cash, mostly at a handful of very large banks.
- Circle discloses holdings and mint and burn flows **weekly**, and a Big Four firm gives **monthly** assurance that reserves exceed USDC in circulation. Deloitte has been Circle's financial statement auditor since fiscal 2022.
- EURC has its own monthly examination reports, listed on the same transparency page.

The SVB weekend in March 2023 is the case study for bank-cash risk: Circle had $3.3B, about 8.25% of reserves, at Silicon Valley Bank. More on that in [[treasury-risk-comparison]].

## Paxos (PYUSD, USDG, USDP)

- **PYUSD:** reserves are 100% USD deposits, US Treasuries and cash equivalents. Paxos publishes monthly attestation reports. Client assets are held in segregated, bankruptcy-remote accounts.
- **USDG:** Global Dollar says reserves are held in T-bills, money market funds and cash equivalents, with monthly reserve reports. The EU issuer must keep part of the USDG reserve with European banks to meet MiCA.
- Neither public page I read names the attestation firm.

## Bridge (custom coins, USDB)

Bridge is unusual because the **brand chooses the reserve mix**:

- **Cash** at Lead Bank (FDIC-insured bank) for business-hours redemptions.
- **On-chain stablecoins** (USDC, USDB, OUSD and others) for 24/7 redemptions, earning nothing.
- **Treasuries** through BlackRock and Fidelity money market funds, or tokenized via Superstate USTB and BlackRock's BUIDL.

Reserves are held in segregated, bankruptcy-remote accounts. Bridge runs a public transparency endpoint that returns on-chain supply, reserve amounts by type, and a collateralization ratio. Its docs describe independent attestations as **quarterly** and available for an additional fee. That cadence is below the monthly floor GENIUS sets, so I expect it to change before January 2027. That is my inference, not something Bridge has said.

## Ethena (USDe)

USDe is not backed by a pile of dollars. The backing is a portfolio:

- Crypto spot (BTC, ETH and others) paired with short perpetual futures, so price moves roughly cancel.
- Liquid stablecoins held to meet redemptions.
- Lending, tokenized real-world assets, and USDtb (a GENIUS-compliant stablecoin issued by Anchorage Digital Bank).

Checks are different too. Custodians publish **monthly** attestations of assets held for Ethena (the most recent listed is September 2026), and some custody wallets are visible on-chain. A **Reserve Fund** is meant to absorb periods of negative funding. Ethena's docs say the share of revenue currently directed to the Reserve Fund is 0%, with 100% going to rewards and incentives. The current Reserve Fund size is on Ethena's transparency dashboard.

## What the OCC rule adds

The OCC's final rule (21 October 2026) sets numeric limits for federally supervised issuers: at least 5% of reserves in demand deposits or similar, no more than 40% exposed to any one counterparty (US government exposure and centrally cleared repo excluded), stress testing, and a $5M capital floor plus a 12-month operating-expense backstop.

## Comparison

| | Disclosure | Independent check | Who checks |
| --- | --- | --- | --- |
| USDC | Weekly holdings | Monthly | Big Four firm |
| PYUSD | Monthly | Monthly | Not named on page |
| USDG | Monthly reports | Monthly | Not named on page |
| Bridge coins | Real-time API | Quarterly, paid add-on | Independent accountant |
| USDe | Dashboard | Monthly custodian attestations | Custodians |

## Sources

- [Circle transparency page](https://www.circle.com/transparency)
- [Paxos PYUSD page](https://www.paxos.com/pyusd)
- [Global Dollar: about USDG](https://globaldollar.com/about-usdg)
- [Bridge docs: reserve management](https://apidocs.bridge.xyz/platform/issuance/reserve-management)
- [Bridge docs: reporting and transparency](https://apidocs.bridge.xyz/platform/issuance/reporting-and-transparency)
- [Ethena docs: reserve fund](https://docs.ethena.fi/protocol-overview/reserve-fund)
- [Ethena docs: custodian attestations](https://docs.ethena.fi/resources/custodian-attestations)
- [GENIUS Act, enrolled text](https://www.govinfo.gov/content/pkg/BILLS-119s1582enr/html/BILLS-119s1582enr.htm)
- [Skadden: OCC finalizes GENIUS Act rule](https://www.skadden.com/insights/publications/2026/10/occ-finalizes-genius-act-rule)
