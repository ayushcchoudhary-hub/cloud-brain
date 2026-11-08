# FDA Pathways for AI-Enabled Medical Devices

> How an AI-enabled device reaches the US market through 510(k), De Novo or PMA, where the Breakthrough Devices Program fits, how many AI devices FDA has authorized as of the latest list update, and how a chest X-ray triage tool has typically been classified.

Research notes from public sources, as of November 2026.

## Risk class drives the pathway

FDA places every device in Class I, II or III, based on the controls needed to give reasonable assurance of safety and effectiveness. The three main premarket pathways are:

- **510(k) premarket notification.** The sponsor shows the device is "substantially equivalent" to a legally marketed device (the predicate): FDA's patient guide describes this as the same intended use and the same technological characteristics as a legally marketed device.
- **De Novo.** For device types never marketed in the US but whose safety profile and technology are now reasonably well understood. The chest X-ray example below shows how one De Novo created a classification regulation that later 510(k) devices use.
- **PMA (premarket approval).** For Class III devices, and for devices found not substantially equivalent. FDA reviews the safety and effectiveness data directly.

## Review clocks

Under the MDUFA V performance goals (fiscal years 2023 to 2027), FDA aims to:

| Pathway | Goal |
|---|---|
| 510(k) | decision within 90 FDA days for 95% of submissions |
| De Novo | decision within 150 FDA days for 70% of requests (can rise in FY2026 and FY2027 if set conditions are met) |
| Original PMA, no advisory panel | decision within 180 FDA days for 90% of submissions |

These are goals in "FDA days", not calendar time.

## The Breakthrough Devices Program

This is a program, not a separate pathway. It applies to devices that go through PMA, 510(k) or De Novo and that offer more effective treatment or diagnosis of life-threatening or irreversibly debilitating conditions. A device must also meet one more criterion, for example breakthrough technology or no approved alternative. It gets more FDA interaction and prioritized review. As of 30 June 2026, FDA had granted 1,320 Breakthrough designations and recorded 210 marketing authorizations for designated devices.

## How many AI devices are on FDA's list

FDA keeps a public list of AI-enabled medical devices. FDA says the list is not comprehensive. Devices are included mainly when AI terms appear in their summaries or classification. FDA also says it will explore tagging devices that use foundation models, including large language models.

- **The Medical Futurist (September 2026)** counted 1,614 devices on the list, up from 1,451 a year earlier. By pathway: 1,553 were 510(k), 40 De Novo and 21 PMA. Radiology accounted for 1,230, about 76%. It counted 235 authorizations in 2024 and 335 in 2025.
- **MedTech Dive** reported more than 1,400 devices as of FDA's 4 March 2026 update.
- The FDA page was last modified on 4 September 2026. The most recent decision date shown was 29 June 2026.

So AI devices go overwhelmingly through 510(k), and most are imaging tools.

## Worked example: chest X-ray triage

Triage software that flags suspected findings so a radiologist reads them sooner has its own classification regulation:

- **21 CFR 892.2080, radiological computer aided triage and notification software.** Class II with special controls. It was created through the De Novo for Viz.ai's ContaCT. The classification applied from 13 February 2018, when FDA issued the order, and was codified in a Federal Register notice in January 2020.
- The special controls require stand-alone performance testing, testing on datasets that show effective triage, and labeling that covers the patient population, compatible imaging hardware, limitations and a summary of performance.
- Later chest X-ray triage tools have used 510(k) under this regulation. For example, Qure.ai's qXR-PTX-PE (K230899, letter dated 22 August 2023, product code QFM) triages pneumothorax and pleural effusion and cited Lunit INSIGHT CXR Triage (K211733) as its predicate.

So a new chest X-ray triage tool with a similar intended use would usually look for a predicate under 892.2080. A tool that diagnoses rather than prioritizes, or that acts autonomously, may not fit that regulation.

## Next steps

- Changing the model after clearance: [[predetermined-change-control-plans]]
- What evidence FDA expects: [[clinical-evidence-and-validation]]
- Selling the same tool in the EU: [[eu-mdr-and-ai-act]]
- After launch: [[postmarket-monitoring-and-recalls]]

## Sources

- [FDA: Step 3, Pathway to Approval](https://www.fda.gov/patients/device-development-process/step-3-pathway-approval)
- [FDA: MDUFA V performance goals and procedures, FY2023 to FY2027](https://www.fda.gov/media/158308/download)
- [FDA: Breakthrough Devices Program](https://www.fda.gov/medical-devices/how-study-and-market-your-device/breakthrough-devices-program)
- [FDA: List of Artificial Intelligence-Enabled Medical Devices](https://www.fda.gov/medical-devices/artificial-intelligence-enabled-medical-devices/list-artificial-intelligence-enabled-medical-devices)
- [The Medical Futurist: The current state of over 1,600 FDA-approved AI-based medical devices (Sep 2026)](https://medicalfuturist.com/the-current-state-of-fda-approved-ai-based-medical-devices)
- [MedTech Dive: AI medtech, tracking new devices (updated May 2026)](https://www.medtechdive.com/news/ai-medtech-track-new-devices-fda/748397/)
- [Federal Register: classification of radiological computer aided triage and notification software (Jan 2020)](https://www.govinfo.gov/content/pkg/FR-2020-01-22/pdf/2020-00496.pdf)
- [FDA: 510(k) summary K230899, qXR-PTX-PE](https://www.accessdata.fda.gov/cdrh_docs/pdf23/K230899.pdf)
