# Post-Market Monitoring, Drift and Recalls

> What happens after an AI device is on the market: FDA adverse event reporting and recall classes, how often AI devices have been recalled and why, FDA's 2025 request for input on real-world performance and drift, and the EU's post-market duties.

Research notes from public sources, as of November 2026.

## Why AI devices need more than standard monitoring

An AI model can perform worse in the field than in its validation study, even though its code has not changed. FDA's January 2025 draft guidance says AI-enabled devices "can be sensitive to differences in input data (also referred to as data drift)". The last of the 10 Good Machine Learning Practice principles is that "deployed models are monitored for performance and retraining risks are managed" (see [[clinical-evidence-and-validation]]).

## FDA's baseline rules

These apply to every device, AI or not.

**Medical Device Reporting.** Manufacturers must report:
- deaths, serious injuries and malfunctions within 30 calendar days of becoming aware of them
- events that require remedial action to prevent an unreasonable risk of substantial harm to the public health, or that FDA designates, within 5 work days

**Recall classes.**
- **Class I:** a reasonable chance the product will cause serious health problems or death.
- **Class II:** the product may cause a temporary or reversible health problem, or there is a small chance of serious harm.
- **Class III:** the product is not likely to cause any health problem or injury.

A recall can be a correction where the device is used, such as changing settings or relabeling, or a removal. It does not always mean users must stop using the device.

## How often AI devices have been recalled

A study in JAMA Health Forum (22 August 2025) by researchers from Johns Hopkins and Yale, with Tinglong Dai of Johns Hopkins as corresponding author, looked at 950 AI devices authorized by FDA through November 2024:

- 60 devices had been recalled, across 182 recall events.
- About 43% of recalls happened within one year of authorization.
- The most common causes were diagnostic or measurement errors, followed by delay or loss of function.
- Devices with retrospective or prospective clinical validation had fewer recalls.
- Public companies made up about 53% of AI devices on the market but more than 90% of recall events. Public company status was associated with a nearly six times higher chance of a recall event.

Dai pointed to the 510(k) pathway, which most AI devices use and which does not generally require clinical studies (see [[fda-pathways-for-ai-devices]]).

## FDA's request for input on real-world performance

On 30 September 2025, FDA opened a request for public comment on measuring and evaluating the real-world performance of AI-enabled devices (docket FDA-2025-N-4203, comments closed 1 December 2025). It asked about:

- strategies for finding and managing performance drift, such as detecting changes in inputs and outputs
- performance metrics, monitoring triggers and data sources after deployment
- the balance between human review and automated monitoring
- how to respond when performance degrades in the field

Commentators noted that most of FDA's real-world evidence guidance had focused on one-time studies, while this request focused on continuous monitoring.

## What the draft guidance asks for in labeling

Where users need to monitor performance, the January 2025 draft says labeling should describe "any methods or tools to monitor and manage device performance". It also encourages a PCCP for planned changes, so a team can retrain after drift without a new submission if the change stays inside the authorized plan (see [[predetermined-change-control-plans]]).

## EU post-market duties

- **MDR Article 86, Periodic Safety Update Reports.** Class IIb and III devices must update the PSUR at least annually. Class IIa devices must update it when necessary and at least every two years.
- **AI Act.** For high-risk AI medical devices, MDCG 2025-6 says the post-market surveillance system should be extended to track AI performance over time, logs, deployer feedback, interactions with other AI systems and continued compliance with AI Act Articles 8 to 15. Those obligations apply from 2 August 2028 (see [[eu-mdr-and-ai-act]]). The same FAQ lists deployer feedback and logs as inputs to monitoring.

## Sources

- [FDA: Draft guidance PDF, AI-Enabled Device Software Functions (Jan 2025)](https://fda.gov/media/184856/download)
- [GOV.UK: Good machine learning practice guiding principles](https://www.gov.uk/government/publications/good-machine-learning-practice-for-medical-device-development-guiding-principles/good-machine-learning-practice-for-medical-device-development-guiding-principles)
- [FDA: Mandatory reporting requirements for manufacturers, importers and user facilities](https://www.fda.gov/medical-devices/postmarket-requirements-devices/mandatory-reporting-requirements-manufacturers-importers-and-device-user-facilities)
- [FDA: What is a medical device recall?](https://www.fda.gov/medical-devices/medical-device-recalls-and-early-alerts/what-medical-device-recall)
- [Healthcare Dive: AI devices without validation more likely to be recalled (Aug 2025)](https://www.healthcaredive.com/news/ai-medical-devices-no-validation-more-recalls-jama/758998/)
- [Medical Design and Outsourcing: Study links AI medical device recalls to gaps in FDA regulatory process (Aug 2025)](https://www.medicaldesignandoutsourcing.com/study-links-ai-medical-device-recalls-to-gaps-in-fda-regulatory-process/)
- [Covington: FDA requests public comment on real-world evaluation of AI-enabled devices (Oct 2025)](https://www.covingtonblogs.com/2025/10/03/fda-requests-public-comment-on-real-world-evaluation-of-ai-enabled-medical-devices/)
- [Advisera: EU MDR Article 86, periodic safety update report](https://advisera.com/13485academy/mdr/periodic-safety-update-report/)
- [OpenRegulatory: MDCG 2025-6, MDR/IVDR and AI Act interplay, explained](https://openregulatory.com/mdcg/mdcg-2025-6)
