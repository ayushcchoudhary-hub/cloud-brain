# The Same Device in the EU: MDR Rule 11 and the AI Act

> How the EU Medical Device Regulation classifies AI software under Rule 11, when the AI Act treats that device as high-risk, how the two conformity assessments combine, and the AI Act timeline after the 2026 "AI Omnibus" moved the medical device date to 2 August 2028.

Research notes from public sources, as of November 2026.

## Two laws, one assessment

Unlike FDA clearance (see [[fda-pathways-for-ai-devices]]), EU market access for an AI medical device rests on two laws: the Medical Device Regulation (MDR, Regulation (EU) 2017/745) and, if it is high-risk, the AI Act (Regulation (EU) 2024/1689). Both run through one notified body conformity assessment.

## MDR Rule 11: how software is classified

Rule 11 in MDR Annex VIII says:

- Software that provides information used to take decisions for diagnosis or therapy is **Class IIa**, unless those decisions could cause:
  - death or an irreversible deterioration of health: **Class III**
  - a serious deterioration of health or a surgical intervention: **Class IIb**
- Software that monitors physiological processes is **Class IIa**, or **Class IIb** if it monitors vital parameters where changes could put the patient in immediate danger.
- All other software is **Class I**.

Guidance MDCG 2019-11 applies the rule using the IMDRF approach, weighing how much the information matters to the decision against how serious the condition is. Commentators note the effect: nearly all software medical devices end up Class IIa or higher, which needs a notified body.

For a chest X-ray triage tool, the class depends on the decision impact it claims. IIa is the floor for decision-informing software.

## When the AI Act calls it high-risk

Under Article 6(1), an AI system is high-risk if both conditions hold:

1. it is a product, or a safety component of a product, covered by the EU laws listed in AI Act Annex I, which include the MDR and IVDR; and
2. that product needs a third-party conformity assessment.

Per MDCG 2025-6:

- MDR Class IIa, IIb and III AI devices are high-risk.
- Class I sterile, measuring or reusable surgical devices are high-risk, because a notified body is involved.
- Other Class I devices, and in-house devices under Article 5(5), are not high-risk under Article 6(1).
- The AI Act does not move a device into a higher MDR class.

## How the two fit together

MDCG 2025-6 is an FAQ adopted jointly by the MDCG and the AI Board and published on 26 June 2025. Its main points:

- The MDR or IVDR conformity procedure applies, and the notified body checks the AI Act requirements inside that same procedure.
- Manufacturers can extend their existing quality system and technical documentation. They do not need parallel systems.
- The AI Act adds areas the MDR covers less directly: data governance (quality, representativeness, bias), logging, human oversight, transparency to deployers, AI literacy and AI-specific cybersecurity.
- Changes described in advance in the technical documentation and assessed at the first conformity assessment are not substantial modifications. Compare [[predetermined-change-control-plans]].

## Timeline as of November 2026

The AI Act applies in stages. The "AI Omnibus", Regulation (EU) 2026/1744, changed them:

- Agreed 7 May 2026, adopted by Parliament (16 June) and Council (29 June), published 24 July 2026, in force 27 July 2026.
- **Annex I high-risk systems, including AI medical devices:** obligations apply from **2 August 2028**, moved from 2 August 2027.
- **Annex III high-risk systems** (for example employment or credit): from 2 December 2027, moved from 2 August 2026.
- Transparency obligations, such as telling people they are interacting with AI, still apply from 2 August 2026. Generative AI systems already on the market before that date have until 2 December 2026 to meet the machine-readable marking requirement. General-purpose AI model obligations are unchanged.
- According to Sidley's summary of the provisional deal, it also narrows the "safety component" definition, so an AI feature that only assists users or optimises performance is not automatically high-risk if its failure poses no health or safety risk.

## Practical notes

- Evidence built for FDA, such as subgroup analyses and independent test sets (see [[clinical-evidence-and-validation]]), overlaps with what the AI Act asks for on data governance.
- Post-market duties under both laws are in [[postmarket-monitoring-and-recalls]].

## Sources

- [Bristows: Deciphering Rule 11, guidance on software classification under the EU MDR](https://www.bristows.com/news/deciphering-rule-11-new-guidance-on-the-classification-of-software-medical-devices-under-the-eu-mdr)
- [OpenRegulatory: MDCG 2025-6, MDR/IVDR and AI Act interplay, explained](https://openregulatory.com/mdcg/mdcg-2025-6)
- [NSF: MDCG 2025-6, EU Commission publishes FAQ on MDR/IVDR and AI Act interplay](https://www.nsf.org/au/en/life-science-regulatory-news/mdcg-2025-6-eu-commission-publishes-faq-on-interplay-between-mdr-ivdr-and-ai-act)
- [National Law Review: EU Digital Omnibus on AI enters into force](https://natlawreview.com/article/eu-digital-omnibus-ai-enters-force)
- [Secure Privacy: AI Act Digital Omnibus, new high-risk deadlines after Council approval](https://secureprivacy.ai/blog/eu-ai-act-digital-omnibus-the-new-high-risk-ai-deadlines-after-council-approval)
- [Sidley Data Matters: provisional agreement to delay key AI Act obligations (Jun 2026)](https://datamatters.sidley.com/2026/06/22/eu-lawmakers-reach-provisional-agreement-to-delay-key-eu-ai-act-obligations/)
