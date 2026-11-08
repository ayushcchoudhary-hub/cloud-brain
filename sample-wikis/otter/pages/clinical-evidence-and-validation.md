# Clinical Evidence and Validation Expectations

> What FDA expects in the performance data for an AI-enabled device: independent test sets, multiple sites, subgroup results with confidence intervals, a defensible reference standard, and the 10 Good Machine Learning Practice principles. Includes what published reviews found about retrospective evidence.

Research notes from public sources, as of November 2026.

## The key document is still a draft

FDA's main AI guidance, "Artificial Intelligence-Enabled Device Software Functions: Lifecycle Management and Marketing Submission Recommendations", was issued in draft in January 2025 (docket FDA-2024-D-4488). As of November 2026 it is still a draft. CDRH's fiscal year 2027 guidance agenda, announced on 1 October 2026, lists finalizing it as a top priority. FDA guidance is non-binding, and a draft is labeled "not for implementation".

## What the draft asks for

**Independent test data.**
- Test data should be independent of training data, for example from different clinical sites.
- Test data should be sequestered from model developers. FDA links data leakage to uncertainty about true performance.

**More than one site.**
- "Reliance on a single site is generally not appropriate" for showing that data are representative.
- At least three geographically diverse US clinical sites or health systems "may be appropriate" for clinical validation.
- With data from outside the US, sponsors should explain how it compares with the US population and practice. AI devices "may require higher proportion of U.S. data".

**Subgroups.**
- Report performance across important subgroups, generally including sex, age, race, ethnicity, disease severity, clinical site and data collection equipment.
- Give results at each operating point, including subgroups.

**Statistics and reference standard.**
- All performance estimates should come with confidence intervals.
- Describe the uncertainty in the reference standard. Where clinicians define the truth, report inter- and intra-reader variability.

**Users and transparency.**
- Show that users can interact with and understand the device as intended, through human factors and usability work.
- FDA suggests a model card in labeling and a description of all known limitations.

## Retrospective vs prospective evidence

Published reviews found most AI devices were cleared on retrospective data.

- An analysis in Nature Medicine (April 2021) reviewed 130 FDA-cleared AI devices. 126 were based on retrospective data. None of the 54 high-risk devices had been evaluated prospectively. Among the 71 devices that reported a patient count, the median was 300.
- The 510(k) pathway does not generally require clinical studies. Tinglong Dai of Johns Hopkins, an author of a 2025 recall study (see [[postmarket-monitoring-and-recalls]]), said of clinical validation: "it's not required, and so people don't do it."

A retrospective standalone study measures the algorithm on stored cases. Human factors evidence and GMLP principle 7 (below) address how people use it.

## A real example of a 510(k) performance summary

Qure.ai's chest X-ray triage tool qXR-PTX-PE (K230899, 2023) reported, for pneumothorax, 613 scans (201 positive) from US hospitals, with AUC 98.94, sensitivity 94.53% and specificity 96.36%, each with 95% confidence intervals. It broke results down by sex and four age bands, and listed scan counts by US region. Three ABR-certified thoracic radiologists set the ground truth. Its training data were 74% from India and 3.9% from the US, while its test data came from US sites. The summary shows several elements the draft asks for: confidence intervals, subgroup results, multiple US regions and a described reference standard (see [[fda-pathways-for-ai-devices]]).

## Good Machine Learning Practice (GMLP)

FDA, Health Canada and the UK MHRA published 10 guiding principles on 27 October 2021. The IMDRF finalized a nearly identical set in January 2025. The 10 principles:

1. Multidisciplinary expertise is used throughout the total product life cycle.
2. Good software engineering and security practices are implemented.
3. Clinical study participants and data sets represent the intended patient population.
4. Training data sets are independent of test sets.
5. Selected reference datasets are based on the best available methods.
6. Model design is tailored to the available data and reflects the intended use.
7. Focus is placed on the performance of the human-AI team.
8. Testing shows device performance during clinically relevant conditions.
9. Users get clear, essential information.
10. Deployed models are monitored for performance and retraining risks are managed.

Principle 10 links to [[predetermined-change-control-plans]].

## Sources

- [FDA: Draft guidance, AI-Enabled Device Software Functions (Jan 2025)](https://fda.gov/regulatory-information/search-fda-guidance-documents/artificial-intelligence-enabled-device-software-functions-lifecycle-management-and-marketing)
- [FDA: Draft guidance PDF](https://fda.gov/media/184856/download)
- [RAPS: FDA's device center releases guidance agenda for FY 2027 (Oct 2026)](https://www.raps.org/resource/fda-s-device-center-releases-guidance-agenda-for-fy-2027.html)
- [AHA: Study finds new commercial AI devices often lack key performance data (Apr 2021)](https://www.aha.org/aha-center-health-innovation-market-scan/2021-04-20-study-finds-new-commercial-ai-devices-often)
- [Healthcare Dive: AI devices without validation more likely to be recalled (Aug 2025)](https://www.healthcaredive.com/news/ai-medical-devices-no-validation-more-recalls-jama/758998/)
- [FDA: 510(k) summary K230899, qXR-PTX-PE](https://www.accessdata.fda.gov/cdrh_docs/pdf23/K230899.pdf)
- [GOV.UK: Good machine learning practice for medical device development, guiding principles](https://www.gov.uk/government/publications/good-machine-learning-practice-for-medical-device-development-guiding-principles/good-machine-learning-practice-for-medical-device-development-guiding-principles)
- [FDA: GMLP guiding principles page](https://www.fda.gov/medical-devices/artificial-intelligence-enabled-medical-devices/good-machine-learning-practice-medical-device-development-guiding-principles)
- [RAPS: IMDRF finalizes good machine learning practice (Jan 2025)](https://www.raps.org/resource/imdrf-finalizes-good-machine-learning-practice-so.html)
