# Research Log

> Every external fact used in this GTM workspace has a row here with a source. Findings below from the 2026-06-20 research pass (Claude Code WebSearch/WebFetch + claude.ai Research, cross-checked). **Confidence**: High = multiple/primary sources; Med = single/secondary source; Low = aggregator/self-claim. Items marked **VERIFY** drive spend and need primary-source confirmation.

## Findings

| Date | Topic | Finding | Source | Used in | Confidence |
|---|---|---|---|---|---|
| 2026-06-20 | Competitors | InstaCare, Healthwire/HCloud, e-mareez, Lifeline, Oscar, Websol, Moneypex, Asaan, eHospital, Marham, oladoc are real PK-active vendors/marketplaces | [SoftwareSuggest PK](https://www.softwaresuggest.com/clinic-management-software/pakistan), [InstaCare](https://instacare.com.pk/hospital-management-system-software-in-pakistan/), [e-mareez](https://e-mareez.com/products/clinicmanagement), [Oscar](https://oscar.pk/blog/the-best-pharmacy-software-in-pakistan), [Moneypex](https://moneypex.com/pk/pharmacy-management-pos-software) | competitor-analysis | Med |
| 2026-06-20 | Debunked vendors | Medical Lync, Hospital2u, MedixCloud, Trillium, AlphaMD — no real PK HMS product found | claude.ai Research (negative result) | competitor-analysis | Med |
| 2026-06-20 | CureMD | US-only seller; Lahore site is R&D, not local sales | claude.ai Research | competitor-analysis | Med |
| 2026-06-20 | Pricing anchor | ~PKR 1,500/mo lowest published (e-mareez, Websol); most incumbents custom-quote | [e-mareez](https://e-mareez.com/products/clinicmanagement) + aggregator | pricing-strategy | Low |
| 2026-06-20 | Web vs desktop | Cloud ~80% of new EHR purchases (KLAS-cited); PK clinic vendors web-predominant; pharmacy POS still offline/desktop | [GlobeNewswire mkt report](https://www.globenewswire.com/news-release/2025/07/14/3114906/28124/en/U-S-Healthcare-IT-Software-Market-Size-Share-Trends-Analysis-Report-2025-2030-Focus-on-Revenue-Cycle-Management-Tele-Healthcaree-EClinical-Cloud-Based-EHR-EMR-Software.html); claude.ai Research (KLAS/Black Book secondary) | market-landscape, market-direction | Med (VERIFY 80%) |
| 2026-06-20 | Offline need | Offline-first (local DB + sync, optional local server) is the documented answer for intermittent connectivity; PK cloud-only vendors don't solve it | [Simple.org](https://www.simple.org/blog/offline-first-apps/), [Softronic PK](https://softronicsys.com/cloud-vs-onpremise-opd-software-in-pakistan/), [Ezovion](https://ezovion.com/offline-ready-hospital-systems-ensuring-zero-disruption-operations-during-network-downtime/) | market-direction | High |
| 2026-06-20 | WhatsApp | PK ~52M WhatsApp users (WPR 2024); some trackers 95–105M; higher engagement than SMS | claude.ai Research (World Population Review) | market-landscape, market-direction | Med |
| 2026-06-20 | Data law | No enacted general data-protection law; PDP Bill still draft (2023/2025), Cabinet-approved, pending Parliament; would classify health data "sensitive", 72-hr breach, DPO, localization of "critical data" | [ICLG PK](https://iclg.com/practice-areas/data-protection-laws-and-regulations/pakistan/), [MoITT draft](https://moitt.gov.pk/SiteImage/Misc/files/Final%20Draft%20Personal%20Data%20Protection%20Bill%20May%202023.pdf), [Friday Times](https://www.thefridaytimes.com/11-Dec-2025/data-privacy-peril-pakistan-s-legal-vacuum-consequences) | regulatory-checklist | Med (VERIFY localization) |
| 2026-06-20 | PECA 2016 | Operative data law; §38 unauthorized transfer of personal/sensitive data → up to 3 yrs / PKR 1m; FIA Cyber Crime Wing enforces | claude.ai Research (IBA, Global Law Experts secondary) | regulatory-checklist | Med |
| 2026-06-20 | DRAP/pharmacy | Drugs Act 1976 + DRAP Act 2012; Drug Sale License (pharmacist); batch/expiry records, ~3-yr retention, FEFO, controlled-drug quota system | [Courting the Law](https://courtingthelaw.com/2025/06/24/commentary/guest-columnists/regulating-the-remedy-pakistans-legal-prescription-for-digital-health/), [DRAP](https://www.dra.gov.pk/) | regulatory-checklist, product reqs | Med |
| 2026-06-20 | PHC licensing | PHC Act 2010 §13: clinics/hospitals/labs must register + obtain license + meet MSDS; software not licensed but "PHC-ready" is a sales lever | [PHC guide](https://instacare.com.pk/phc-compliance-software-guide/), [Wikipedia PHC](https://en.wikipedia.org/wiki/Punjab_Healthcare_Commission) | regulatory-checklist | Med |
| 2026-06-20 | FBR POS | Tier-1 retailers must integrate POS → real-time invoices + QR (Sales Tax Rules 2006) | [Vohra Law](https://vohralaw.pk/procedure-of-pos-software-integration-in-pakistan-with-fbr-a-complete-guide/), [FBR POS](https://www.fbrpos.com/) | regulatory-checklist, product reqs | Med |
| 2026-06-20 | Tax/registration | SECP incorporation → FBR NTN → Sales Tax → PRA (Punjab services 16% std / 5% reduced); PSEB registration advised (§65F IT export incentives, reportedly extended to 2029) | claude.ai Research (ConSerIC, Waystax secondary) | regulatory-checklist | Med (VERIFY PRA rate + PSEB §65F) |

## VERIFY before betting spend (primary sources)
1. PSEB §65F incentive status + expiry date.
2. PRA service-tax rate for software/SaaS.
3. PDP Bill "critical personal data" localization clause + current legislative status.

## Source-quality note
Several legal/tax facts trace to **secondary** sources (law-firm blogs, aggregators). Good enough for direction; confirm the three VERIFY items against primary law/government text before they drive money or architecture commitments.
