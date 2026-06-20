# Regulatory & Legal Checklist — Pakistan / Punjab

> ⚠️ **Research, not legal advice.** Confirm with a Pakistani lawyer + accountant before go-to-market. Researched 2026-06-20; sources + confidence in [../05-research/research-log.md](../05-research/research-log.md). Three items marked **VERIFY** need primary-source confirmation before driving spend.

## The landscape in one line
**No enacted general data-protection law yet** (PDP Bill still draft) — but **PECA 2016 is operative today**, and your *customers* (clinics/pharmacies) are heavily regulated (PHC, DRAP, PMC, FBR). Build compliance in as a **feature and sales lever**.

## Checklist

| Area | Regulator / law | What it means for us | Status |
|---|---|---|---|
| **Personal data protection** | PDP Bill (draft) / NCPDP | Will classify health data as "sensitive": consent, 72-hr breach notice, DPO if "significant", **localization of "critical data"**. Design for it now. | ⚠️ pending — **VERIFY** localization clause |
| **Operative data law** | **PECA 2016**, FIA Cyber Crime Wing | §38: transferring personal/sensitive data without consent → up to 3 yrs / PKR 1m. Enforce access control + consent + audit logging. | ✅ in force |
| **Pharmacy / drugs** | Drugs Act 1976 + DRAP Act 2012 | Customer needs Drug Sale License (pharmacist). Module must support batch/expiry, FEFO, **~3-yr record retention**, controlled-substance logging. | ✅ in force |
| **Facility licensing** | PHC Act 2010 §13 (Punjab) | Clinics/hospitals/labs must register + meet **MSDS**. We're not licensed, but sell **"PHC-ready"** record-keeping/audit trails. | ✅ in force |
| **Practitioner registration** | PMC / PMDC | Doctors must be registered (affects credentialing module). ⚠️ regulator's legal status has been contested — confirm current standing. | ✅ (confirm body) |
| **FBR POS / e-invoicing** | FBR, Sales Tax Rules 2006 | Tier-1 retailers integrate POS → real-time invoices + QR. Relevant to billing/pharmacy modules. | ✅ in force |
| **Business + tax** | SECP / FBR / PRA | Incorporate (SECP) → NTN (FBR) → Sales Tax reg → PRA (Punjab services **16% std / 5% reduced**). | ✅ — **VERIFY** rate |
| **IT tax incentive** | PSEB | Registration → §65F IT-export incentives + credibility (reportedly extended to 2029). Needs SECP+FBR first. | ⚠️ **VERIFY** §65F |
| **EHR standards** | — (none binding) | No mandated EHR format; adopt **HL7/FHIR** voluntarily to pre-empt future mandates. | regulatory whitespace |

## Must-handle before first sale (priority order)
1. **Harden auth/security** (passwords, real session identity) + audit logging + consent capture — PECA liability exists *today*.
2. **In-country data hosting** by default (anticipate PDP localization).
3. **FBR POS integration** for billing/pharmacy.
4. **DRAP-compliant pharmacy**: batch/expiry, FEFO, 3-yr retention, controlled-substance logging.
5. **PHC-MSDS record-keeping readiness** as a marketed feature.
6. **Business setup**: SECP → FBR → PRA → PSEB before first invoice.

## How this feeds the product
Items 1–5 are **build requirements**, not just legal boxes — carry them into the upcoming functionality/integration audits and the roadmap. See [market-direction.md](market-direction.md) "product implications".
