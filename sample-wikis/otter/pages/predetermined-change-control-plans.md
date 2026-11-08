# Predetermined Change Control Plans (PCCPs)

> What a PCCP is, the legal basis, the status of FDA's AI-specific guidance (final, revised August 2025) and the all-devices guidance (still draft), what a PCCP can and cannot cover, and how it maps to the EU AI Act.

Research notes from public sources, as of November 2026.

## The problem it solves

Teams often want to retrain a cleared model, add a scanner model or tune a threshold. Without a plan, such changes can need a new 510(k), De Novo or PMA supplement. A PCCP lets the sponsor describe planned changes up front, have FDA authorize the plan with the device, and then make those changes without a new submission.

## Legal basis

Section 515C of the FD&C Act gives FDA this power. It was added by section 3308 of the Food and Drug Omnibus Reform Act of 2022 (FDORA), enacted on 29 December 2022.

## Guidance status, November 2026

| Document | Status | Dates |
|---|---|---|
| Marketing Submission Recommendations for a PCCP for AI-Enabled Device Software Functions | Final | issued 4 Dec 2024; current version dated 18 Aug 2025 |
| Predetermined Change Control Plans for Medical Devices (all device types) | Draft | issued 22 Aug 2024, docket FDA-2024-D-2338 |

CDRH's fiscal year 2027 guidance agenda, announced on 1 October 2026, lists finalizing PCCP guidance as a top priority.

## Which submissions can include one

The final AI guidance covers:

- **510(k):** traditional and abbreviated. A special 510(k) may be appropriate to modify an existing PCCP.
- **De Novo:** original requests.
- **PMA:** original, modular, 180-day supplement, panel-track supplement and real-time supplement.

## The three parts of a PCCP

1. **Description of Modifications.** The specific planned changes, and the performance and characteristics the device will have after each change.
2. **Modification Protocol.** The verification and validation methods, with acceptance criteria set in advance.
3. **Impact Assessment.** The benefits and risks of the changes, and how risks will be mitigated.

## What a PCCP can cover

Changes that maintain or improve safety or effectiveness and can be verified and validated. FDA's examples include:

- performance improvements from retraining the model
- changes to device inputs and compatibility, such as support for new acquisition hardware
- some use and performance changes, such as use within a specific subpopulation

## What it cannot cover

- **Intended use.** "Modifications included in a PCCP must maintain the device within the device's intended use."
- **Most indications changes.** FDA says most changes to the indications for use would be difficult to assess prospectively. Narrow ones, such as use with an additional device, may work. FDA suggests discussing these through the Q-Submission Program.
- **Changes outside the plan.** Deviating from the authorized PCCP, or making significant changes outside it, would likely need a new marketing submission. Changes made under the plan must still go through the manufacturer's quality system.

## Labeling and predicates

- Labeling should say the device uses machine learning and has an authorized PCCP. When changes are made, labeling should describe them and how users will be told.
- Labeling should not describe changes that have not yet been made.
- When a later device uses a PCCP device as its predicate, it is compared with the version cleared or approved before the PCCP changes.

## Example: chest X-ray triage (illustrative only)

Using FDA's own example categories, for a triage tool cleared under 21 CFR 892.2080 (see [[fda-pathways-for-ai-devices]]), plausible PCCP items would be retraining on more data with fixed sensitivity and specificity floors, or adding compatible X-ray systems with a stated test protocol. Moving from "prioritize for review" to "diagnose" would change the intended use, so it falls outside a PCCP.

## How this maps to the EU

The EU AI Act takes a similar approach. In the MDCG and AI Board FAQ on the MDR and the AI Act (see [[eu-mdr-and-ai-act]]), changes that were clearly set out in the original technical documentation and assessed during the first conformity assessment do not count as substantial modifications. Other substantial changes need a new conformity assessment.

## Related

- Validation design for acceptance criteria: [[clinical-evidence-and-validation]].
- Monitoring that triggers a retrain: [[postmarket-monitoring-and-recalls]].

## Sources

- [FDA: Final guidance, Marketing Submission Recommendations for a PCCP for AI-Enabled Device Software Functions](https://www.fda.gov/media/166704/download)
- [FDA: Draft guidance, Predetermined Change Control Plans for Medical Devices](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/predetermined-change-control-plans-medical-devices)
- [RAPS: FDA's device center releases guidance agenda for FY 2027 (Oct 2026)](https://www.raps.org/resource/fda-s-device-center-releases-guidance-agenda-for-fy-2027.html)
- [OpenRegulatory: MDCG 2025-6, MDR/IVDR and AI Act interplay, explained](https://openregulatory.com/mdcg/mdcg-2025-6)
