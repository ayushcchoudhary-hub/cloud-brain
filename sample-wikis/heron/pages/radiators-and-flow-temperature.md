# Radiators and Flow Temperature

> Why heat pumps want low flow temperatures, how much output a radiator loses when the water is cooler, and how to decide which radiators in a Victorian terrace need upsizing.

## Why flow temperature matters

A heat pump is most efficient when the water it heats is only a little warmer than the room needs. Every degree of flow temperature it can drop improves its seasonal efficiency, and efficiency is what decides running cost against gas (see [[running-costs-vs-gas]]).

Old gas systems were typically designed around much hotter water. Radiators sized for that will not heat the same room at heat pump temperatures. That is the whole radiator problem in one line.

## How radiator output falls

Radiator output is rated at **Delta T 50**: the difference between mean water temperature and room temperature is 50 degrees. Mean water temperature is roughly the average of flow and return.

Output does not fall in a straight line as Delta T drops. The common fit is:

**output = rated output × (Delta T / 50) ^ 1.3**

The 1.3 exponent is typical for standard panel radiators; other designs differ, so manufacturer data wins where it exists.

| Delta T | Share of rated output |
| --- | --- |
| 50 | 100% |
| 40 | 75% |
| 35 | 63% |
| 30 | 52% |
| 25 | 41% |
| 20 | 30% |

## What that means in practice

Take a 21°C living room:

- **45°C flow, 40°C return:** mean water 42.5°C, Delta T about 21. Output about 33% of rated.
- **50°C flow, 45°C return:** mean water 47.5°C, Delta T about 26.5. Output about 44% of rated.
- **35°C flow, 30°C return:** mean water 32.5°C, Delta T about 11.5. Output about 15% of rated.

So a radiator labelled 2,000 W at Delta T 50 gives roughly 670 W at a 45°C flow. If the room's design heat loss is 1,200 W, that radiator is not enough.

Bedrooms designed at 18°C get a slightly larger Delta T for the same water, which helps.

## Deciding which radiators to change

1. Start from the room-by-room heat loss (see [[heat-loss-and-sizing]]).
2. Pick a target flow temperature. Installers often design around 45°C or lower for a good efficiency balance; lower is better if the radiators allow it.
3. For each room, convert existing radiator rated outputs to that Delta T using the table.
4. Where output falls short of the room's heat loss, the options are: a larger radiator in the same spot, a double or triple panel instead of a single, an extra radiator, or a fan-assisted radiator.
5. Rooms that fall far short drive the whole system. One undersized room can force the flow temperature up for the entire house.

In a typical terrace, the rooms most likely to need work are the ones with the most exposed surface: a back extension with three external walls and a roof, a bay-windowed front room, and top-floor rooms under the roof.

## Pipes and controls

- **Pipe size.** Lower flow temperatures mean more water flow for the same heat. Very small pipework (microbore) can limit this. Ask the installer to check, rather than assuming it all needs replacing.
- **Weather compensation.** Most heat pumps adjust flow temperature to outside temperature, running cooler on mild days. Make sure it is set up and tuned in the first winter.
- **Run it low and long.** Heat pumps work best running steadily, not in short bursts like a boiler on a timer.

## What to ask an installer

- What design flow temperature, in writing?
- Which radiators change, and what is each room's output at that flow temperature versus its heat loss?
- What seasonal efficiency does the MCS estimate give at that flow temperature?
- Who tunes weather compensation after the first cold spell?

## Sources

- [Trystan Lea: heat pump radiator sizing](https://trystanlea.org.uk/heatpumpradiators)
- [Zehnder: Delta T correction factors](https://www.zehnder.co.uk/en/decorative-radiators/resources/correction-factors-delta-t-conversion)
- [MCS heat load calculator: design conditions](https://heatloadcalculator.mcscertified.com/docs/reference-sources/design-conditions)
