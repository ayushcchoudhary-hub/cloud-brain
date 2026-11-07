# Heat Loss and Heat Pump Sizing for a Victorian Terrace

> How an MCS heat loss calculation works, what inputs matter most in a solid-wall Victorian terrace, why default wall values often overstate heat loss, and how to sanity-check an installer's sizing.

## Why sizing matters

An oversized heat pump short-cycles and costs more up front. An undersized one cannot hold temperature on the coldest days. For a grant-funded install the calculation is not optional: MCS requires a heat load calculation under its heat pump design standard (MIS 3005-D), and MCS launched its own room-by-room calculator for installers in December 2024, compliant with BS EN 12831-1:2017.

## How the calculation works

For each room, heat loss is roughly:

- **Fabric loss:** area of each wall, window, floor and ceiling, times its U-value, times the temperature difference between inside and outside.
- **Ventilation loss:** air changes per hour times room volume times the same temperature difference.

Add the rooms up for the house total at design conditions. That total, in kW, is what the heat pump must deliver on a design-cold day.

## Design conditions

The MCS calculator documents its defaults:

- **Outside:** based on CIBSE Guide A, using the nearest of 14 UK weather stations, minus 0.6°C for each whole 100 m above the station. London Heathrow is -3.0°C at the 99.6% level (-1.7°C at 99%). Manchester Woodford is -4.5°C (-2.7°C).
- **Inside, for older houses:** living and dining rooms 21°C, bathrooms 22°C, bedrooms, kitchen, hall and landing 18°C. Newer houses use 21°C throughout.

So for a London living room the design temperature difference is about 24 degrees. Bedrooms are lower.

## What makes a Victorian terrace different

**Solid brick walls.** Victorian terraces typically have solid brick walls with no cavity. RdSAP, the method behind EPCs, uses a default U-value of about 2.1 W/m²K for these walls. A BRE study for the government (2014) measured real walls in English homes and found an average of about **1.6 W/m²K** for standard solid walls and **1.3** for non-standard ones. That is 25 to 40% better than the default. If an installer's calculation uses defaults, wall losses may be overstated.

**Shared party walls.** A mid-terrace has two neighbours who are usually heating too. Party walls lose little heat compared with external walls, which is one reason mid-terraces often need smaller units than their age suggests. An end-terrace has one more exposed wall.

**Draughts.** Suspended timber floors, old sash windows and open chimneys raise air change rates. This is often the cheapest thing to fix before sizing: blocking unused flues and draught-proofing sashes reduces the ventilation term.

**Room-by-room matters.** Back extensions, bay windows and top-floor rooms under a poorly insulated roof each behave differently. The room numbers drive radiator sizing (see [[radiators-and-flow-temperature]]), not just the total.

## Sanity checks on a quote

- Ask for the room-by-room report, not just a headline kW figure.
- Check which U-values were used for walls. Measured or adjusted values are a sign of care; pure defaults are common but conservative.
- Check the outside design temperature matches your location.
- Ask what air change rates were assumed and whether chimneys were treated as open.
- Compare with real gas use. Annual gas kWh times boiler efficiency gives annual heat demand. This is a useful cross-check on the calculation, though it reflects how you heated the house, not design conditions.

## Illustrative only

A rough worked shape, not a real house: if a mid-terrace calculation lands at 6 kW at -3°C outside, a 6 kW class unit is in range, and a quote for 10 kW should come with an explanation. Real numbers vary widely with size, glazing and floor type.

## Next steps

- Grant rules and choosing an installer: [[boiler-upgrade-scheme-and-installers]]
- What it will cost to run: [[running-costs-vs-gas]]

## Sources

- [MCS heat load calculator: design conditions](https://heatloadcalculator.mcscertified.com/docs/reference-sources/design-conditions)
- [Fix Radio: MCS launches heat load calculator](https://fixradio.co.uk/fix-feed/construction-news/post/mcs-launches-new-heat-load-calculator-tool-for-installers)
- [BRE for DECC: in-situ measurements of wall U-values](https://assets.publishing.service.gov.uk/media/5a804b9eed915d74e33f99a7/In-situ_u-values_final_report.pdf)
- [MCS heat load calculator: U-values](https://heatloadcalculator.mcscertified.com/docs/reference-sources/u-values)
