# Running Costs: Heat Pump vs Gas at the Current Price Cap

> Worked running-cost comparison using the Ofgem cap for October to December 2026, real-world heat pump efficiency from UK field trials, and the break-even efficiency that decides whether a heat pump is cheaper than gas.

## Prices used

Ofgem default tariff cap, 1 October to 31 December 2026, Direct Debit, Great Britain average:

| | Unit rate | Standing charge |
| --- | --- | --- |
| Electricity | 26.32p per kWh | 54.83p per day |
| Gas | 7.97p per kWh | 29.68p per day |

Two details matter:

- The electricity figures **exclude VAT**, because the government removed VAT from electricity bills from 1 October 2026 to 31 March 2027. Gas includes 5% VAT. The comparison below is therefore more favourable to heat pumps this winter than it will be after March 2027.
- Ofgem says the typical dual fuel bill rose 4% for this quarter. Uswitch puts the typical annual bill at £1,723. Caps change every quarter.

## The one ratio that decides it

A gas boiler turns 1 kWh of gas into less than 1 kWh of heat. A heat pump turns 1 kWh of electricity into several kWh of heat. The heat pump is cheaper when:

**heat pump efficiency (SPF) > electricity price / (gas price / boiler efficiency)**

With this quarter's prices:

| Boiler seasonal efficiency | Cost of 1 kWh of heat from gas | Break-even heat pump SPF |
| --- | --- | --- |
| 84% | 9.49p | 2.77 |
| 90% | 8.86p | 2.97 |

The Electrification of Heat comparison used 84% as typical for fossil fuel systems, so 2.77 is a fair central break-even.

## What heat pumps actually achieve

The UK Electrification of Heat field trial (742 heat pumps across Scotland, north east and south east England) reported in its interim analysis of 291 air source installs a **median SPF of 2.80**, with the middle half of homes between **2.53 and 3.09**. It found that **home age had no statistically significant effect** on performance, which is relevant for a Victorian house. Performance still varied a lot between installs, and the report linked that to design and installation quality.

So at today's prices, a median install roughly matches gas. A good install beats it; a poor one costs more.

## Worked example

Illustrative house needing **10,000 kWh of heat** a year (space heating plus hot water). Unit costs only, then standing charges separately.

| Scenario | Energy bought | Annual unit cost |
| --- | --- | --- |
| Gas boiler at 84% | 11,905 kWh gas | £949 |
| Heat pump, SPF 2.5 (weak install) | 4,000 kWh electricity | £1,053 |
| Heat pump, SPF 2.8 (trial median) | 3,571 kWh electricity | £940 |
| Heat pump, SPF 3.5 (good install) | 2,857 kWh electricity | £752 |

**Standing charges:** the electricity standing charge (about £200 a year) is paid either way. The gas standing charge (about £108 a year) is saved only if you remove the gas supply entirely, which means also changing a gas hob.

Putting it together for an all-electric switch at SPF 3.5: about £197 a year lower unit costs plus £108 in standing charge, so roughly £300 a year cheaper than gas at this cap. At SPF 2.8 the saving is mostly the standing charge.

## After March 2027

If VAT returns to electricity at 5% and nothing else changes, 26.32p becomes about 27.6p, and break-even at 84% boiler efficiency rises to about **2.91**. This is arithmetic on today's cap, not a forecast of future prices.

## How to move the numbers

- **Lower flow temperature** raises SPF. This is the biggest lever. See [[radiators-and-flow-temperature]].
- **Correct sizing** avoids short-cycling. See [[heat-loss-and-sizing]].
- **Time-of-use or heat pump tariffs** from some suppliers offer cheaper periods for running the heat pump and heating hot water. I have not verified current rates, so they are not in the table.
- **Check the installer's estimate.** The performance estimate on an MCS quote should give an SPF; plug it into the break-even table above. See [[boiler-upgrade-scheme-and-installers]].

## Sources

- [Ofgem: price cap 1 October to 31 December 2026](https://www.ofgem.gov.uk/news/changes-energy-price-cap-between-1-october-and-31-december-2026)
- [Uswitch: October 2026 price cap](https://www.uswitch.com/gas-electricity/news/october-energy-price-cap-to-increase-by-four-percent/)
- [Energy Systems Catapult: Electrification of Heat reports](https://es.catapult.org.uk/report/electrification-of-heat-summary-reports-and-datasets/)
- [Earth Notes: summary of EoH interim insights](https://www.earth.org.uk/bibliography/ESC2023interim.html)
- [Heat Pump Association: EoH report findings](https://heatpumps.org.uk/?p=7172)
