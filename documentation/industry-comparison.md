# Industry Comparison: Custom HMS vs Open-Source & Commercial Alternatives (2026)

A feature-by-feature reference comparing this clinic's custom Hospital Management
System (Next.js + Supabase, OPD/retail focus) against the major open-source EMR/HMS
distributions and the SaaS products most relevant in South Asia and the United
States. Built to clarify two questions:

1. What gaps would matter if we evaluated against the field today?
2. What does this stack actually do *better* than the field?

## Sources & Methodology

This document references the publicly documented feature sets of each product as
described on its official project site and source repository through Q1 2026. The
canonical references used (and recommended as the authoritative sources for any
updates to this document) are:

- OpenMRS — [openmrs.org](https://openmrs.org/), [wiki.openmrs.org](https://wiki.openmrs.org/),
  [github.com/openmrs](https://github.com/openmrs)
- Bahmni — [bahmni.org](https://bahmni.org/), [bahmni.atlassian.net/wiki](https://bahmni.atlassian.net/wiki/spaces/BAH/overview),
  [github.com/Bahmni](https://github.com/Bahmni)
- HospitalRun — [hospitalrun.io](https://hospitalrun.io/),
  [github.com/HospitalRun](https://github.com/HospitalRun)
- OpenEMR — [open-emr.org](https://www.open-emr.org/),
  [github.com/openemr/openemr](https://github.com/openemr/openemr)
- GNU Health — [gnuhealth.org](https://www.gnuhealth.org/),
  [docs.gnuhealth.org](https://docs.gnuhealth.org/)
- ERPNext Healthcare — [docs.erpnext.com/docs/user/manual/en/healthcare](https://docs.erpnext.com/docs/user/manual/en/healthcare),
  [github.com/frappe/healthcare](https://github.com/frappe/healthcare)
- OpenClinic GA — [sourceforge.net/projects/open-clinic](https://sourceforge.net/projects/open-clinic/)
- Practo Ray — [practo.com/ray](https://www.practo.com/ray)
- Halemind — [halemind.com](https://halemind.com/);
  Mocdoc — [mocdoc.in](https://mocdoc.in/)
- ClinicMaster — [clinicmaster.net](https://clinicmaster.net/)
- DocPulse — [docpulse.com](https://docpulse.com/)
- eHospital Systems — [adroitinfosystems.com/products/ehospital-systems](https://adroitinfosystems.com/products/ehospital-systems/)
- CareCloud — [carecloud.com](https://www.carecloud.com/)
- athenahealth — [athenahealth.com](https://www.athenahealth.com/)

Where a feature is described as "supported" below, it reflects the project's
documented module catalog, not a live functional audit. The comparison is
written for a small-to-mid outpatient clinic context (Dr Fauzia Ishaq Clinic /
Pakistan); items that only matter for tertiary hospitals or US-payer environments
are flagged explicitly as "not relevant for this scope."

## Baseline: What the Custom HMS Has Today

For reference when reading the comparison columns below. Detail in
[`features.md`](./features.md) and [`product.md`](./product.md).

- **Clinical workflow** — patient registry, OPD/Emergency visits with per-day
  clinic numbering, vitals, OB/GYN intake, real-time SSE queue, doctor encounter
  notes, prescriptions, lab orders with parameter-based result entry and
  approval, dispense actions.
- **Retail/pharmacy** — POS with batch-aware sale, sub-unit sales
  (`sub_units_per_unit`), held carts, purchase intake, sale & purchase returns,
  receipt print, hardware hooks, append-only `medicine_transaction` journal with
  trigger-enforced stock math.
- **Cashier** — multi-bill allocation, settlement drafts, reversal/correction,
  shift open/close, idempotency keys, dedicated `cashier_audit_event` stream.
- **Workforce** — staff & doctor directories, RBAC v2 (84 permission policies),
  shift templates + date-keyed roster (1,332 live rows), policy-snapshotted
  attendance, leave with role quotas + per-employee overrides, payroll runs,
  credentialing with expiry windows, document store with review, lifecycle
  templates (ONBOARD_STD / OFFBOARD_STD), employee self-service portal.
- **Audit & ops** — multi-stream audit (`audit_logs`, `pos_audit_log`,
  `cashier_audit_event`, `staff_permission_audit`, `visit_status_history`),
  system-timezone setting, scrypt password storage with lockout, session
  versioning, force-logout.
- **Deliberately out of scope** — ICD/SNOMED coding, HL7/FHIR interop, insurance
  & claims, inpatient bed/ward management, patient self-service portal,
  appointment self-booking, telemedicine, i18n.

---

## Open-Source HMS / EMR

### OpenMRS (openmrs.org)

**Core scope.** A modular EMR platform written in Java, with a React-based
"O3" frontend. Conceptually closer to a clinical data platform than a full HMS
— pharmacy, billing, and HR are not in core and require community modules or
distributions (Bahmni is the most popular).

**Parity with custom HMS.**

- Patient registry & demographics (with rich identifier types).
- Visit / encounter model (encounters are first-class).
- Allergy / problem list / clinical notes.
- Roles & privileges (their own RBAC primitive).
- Audit logging at the encounter/observation level.
- Lab orders via the Orders module (analogous shape to ours).

**Gaps in custom HMS that OpenMRS has.**

- **Concept dictionary** — every clinical observation is coded against a
  configurable terminology that maps to CIEL/SNOMED/LOINC. This is what makes
  exports analyzable. Custom HMS records free-text encounter notes.
- **HL7 v2 / FHIR R4 endpoints** — first-class via the FHIR module. Custom HMS
  has none.
- **HIV/TB program management** — purpose-built program enrollment and reporting.
- **Form engine** — declarative form definitions (HTML Form Entry / O3 forms).
- **Cohort builder & reporting module** — ad-hoc patient cohorting.
- **Inpatient (Bed Management) module** — bed assignment, ADT.

**Not relevant for small-mid clinic scope.** Concept dictionary, cohort builder,
HIV/TB program reporting, full HL7 v2 listener — these are tertiary-hospital
and public-health-program needs.

**Effort to close relevant gaps.** A minimal FHIR Patient/Encounter/Observation
export shim is ~1–2 weeks. A real coded-concept system that maps every
prescription line and encounter note is multi-month work; not justified at this
clinic's scale.

### Bahmni (bahmni.org)

**Core scope.** A distribution that bundles OpenMRS (clinical) + OpenELIS (lab)
+ OpenERP/Odoo (pharmacy, billing, inventory) into a unified HMS. The most
common reference architecture for clinics in India / sub-Saharan Africa.

**Parity with custom HMS.**

- Registration with patient identifiers (similar to clinic_number).
- OPD consultation with templated observations.
- Lab order → result workflow (via OpenELIS).
- Pharmacy POS with inventory.
- Billing & receipts.
- Inpatient management (ours doesn't do this).

**Gaps in custom HMS that Bahmni has.**

- Drug-level inventory across multiple stores/warehouses.
- Radiology orders & PACS hooks.
- Inpatient bed/ward management with admission/discharge.
- Document upload against an encounter (Bahmni's "Document Upload" tab).
- Program enrollment workflows.
- Insurance/claims billing.
- Built-in form designer.

**Not relevant for small-mid clinic.** Multi-store inventory transfers,
PACS/DICOM integration, program management — these are larger-facility needs.

**What custom HMS does better.** Bahmni inherits Odoo's accounting-style
inventory, which is powerful but heavyweight and runs in a separate process.
Custom HMS's trigger-enforced single-database inventory is leaner and removes a
sync surface.

**Effort to close relevant gaps.**

- Bed/ward management (status, admission, discharge): ~3–4 weeks if scoped to
  the outpatient/short-stay case the clinic actually has.
- Per-encounter document upload: ~3–5 days, reusing existing document store.
- Form designer: weeks-to-months; usually not worth it — hardcoded encounter
  forms are faster to evolve than a meta-engine.

### HospitalRun (hospitalrun.io)

**Status.** The v2 rewrite (`hospitalrun-frontend` on GitHub) has been
effectively inactive for several years — README states the project is on hold
and seeking maintainers. The original CouchDB v1 release ([archive](https://github.com/HospitalRun/hospitalrun-server))
is similarly dormant. **Treat as abandoned for production decisions.**

**What it intended.** Offline-first EMR (PouchDB / CouchDB sync) aimed at
low-connectivity clinics. The offline model is the only feature truly novel
versus the rest of the field.

**Gaps in custom HMS that HospitalRun had.** Offline-first via CRDT-style sync —
custom HMS is online-only.

**Verdict.** Worth referencing only if true offline-capable operation becomes a
business requirement (e.g., outreach camps). Otherwise skip.

### OpenEMR (open-emr.org)

**Core scope.** PHP/MySQL EMR with ONC Health-IT certification (US Meaningful
Use). One of the most feature-broad open-source EMRs; the price is a sprawling
legacy codebase. Latest stable as of early 2026 is the 7.x series.

**Parity with custom HMS.**

- Patient registration & demographics.
- Encounter notes & SOAP forms.
- Prescription / e-Rx (US: SureScripts; export only outside US).
- Lab orders & results.
- Billing & receipts.
- Calendar with appointments.
- Roles & ACL.
- Audit log of patient access.

**Gaps in custom HMS that OpenEMR has.**

- **ICD-10 / CPT / SNOMED coding** baked in.
- **CCDA import/export, HL7 v2, FHIR R4** — required for ONC.
- **Insurance / claims** (837P, ERA 835).
- **Patient portal** with self-booking, secure messaging, intake forms.
- **Telehealth** module (free integration with several video vendors).
- **Appointment self-booking** workflow.
- **Multilingual UI** (60+ languages shipped).
- **Clinical decision support rules.**

**Not relevant for small-mid Pakistani clinic.** US-specific payer pieces
(837P/ERA, SureScripts e-Rx, ONC reporting). Don't build these.

**Effort to close the relevant gaps.**

- Patient portal MVP (login, view visits/prescriptions/lab results, book OPD
  slot): ~4–6 weeks.
- Telehealth (video room URL stamped on visit, basic chat): ~1–2 weeks with a
  vendor like Daily.co / Twilio / Jitsi.
- Multilingual UI (Urdu + English): ~2–3 weeks with `next-intl` once UI strings
  are centralized.

### GNU Health (gnuhealth.org)

**Core scope.** A health/hospital information system built on top of the
Tryton ERP framework (Python). Distinctive in that it explicitly targets
social/family medicine and public-health use cases. Used by WHO collaborating
centers and by national pilots in several countries.

**Parity with custom HMS.**

- Patient demographics & family/social context.
- Encounters, diagnoses.
- Prescription generation.
- Lab orders & results.
- Inpatient (Bed Management) module.
- Stock management (inherited from Tryton).
- HR & payroll (inherited from Tryton).

**Gaps in custom HMS that GNU Health has.**

- ICD-10 / SNOMED coding (deep — this is its strongest area).
- Family & social-determinants tracking (genetics, occupation, household).
- Federation server (cross-facility patient lookup).
- Pediatric growth charts & age-specific protocols.

**Not relevant for small-mid clinic.** Federation server, social-determinants
research module, ICD-10 depth — these matter for public-health programs and
research, not for a single OPD clinic.

**What custom HMS does better.** A real POS-grade pharmacy with sub-unit
sales — Tryton's stock module treats pharmacy like a warehouse.

### ERPNext Healthcare (frappe/healthcare)

**Core scope.** A Healthcare app sitting on top of ERPNext / Frappe (Python +
JS). Brings ERPNext's HR, accounting, inventory, and POS to a clinic workflow.

**Parity with custom HMS.**

- Patient registry, encounters, prescriptions.
- Lab orders & sample workflow.
- POS, inventory, batch & expiry.
- HR (employee directory, attendance, leave, payroll).
- Roles & permissions.
- Document attachment.

**Gaps in custom HMS that ERPNext Healthcare has.**

- Full double-entry accounting with chart-of-accounts (a real general ledger).
- Multi-currency.
- Inpatient encounters & bed management.
- Insurance claim records.
- Workflow engine for any document.

**Not relevant for small-mid clinic.** Double-entry GL is overkill if the clinic
uses external accounting; multi-currency irrelevant for a PKR-only clinic.

**What custom HMS does better.** ERPNext's healthcare module is famously
generic — the patient record feels like a "Customer" with a healthcare-shaped
hat. Domain-specific UX (parameter-based lab result entry, sub-unit pharmacy
POS, policy-snapshot attendance) is materially tighter in the custom HMS.

### OpenClinic GA (sourceforge.net/projects/open-clinic)

**Core scope.** Java-based open-source HIS used by smaller hospitals in Africa,
Latin America, and parts of Asia. Pre-modern UI; SourceForge-era release
cadence. Best understood as a "complete but dated" alternative.

**Parity with custom HMS.** Registration, encounters, prescriptions, lab,
billing, basic stock, basic HR.

**Gaps in custom HMS that OpenClinic GA has.** ICD coding; inpatient ward
management; multi-lingual UI.

**Verdict.** Useful as a feature-checklist reference; not a serious
modern alternative because of the UI/UX gap.

---

## Commercial & SaaS — South Asia Focus

### Practo Ray (practo.com/ray)

**Core scope.** Clinic SaaS aimed at solo practitioners and small clinics in
India. Strong on appointments, marketing (Practo Search), and patient
communication; lighter on inventory and inpatient.

**Parity with custom HMS.**

- Patient registry.
- Visit / consultation notes.
- Prescriptions.
- Basic billing.
- Calendar.
- SMS reminders.

**Gaps in custom HMS that Practo Ray has.**

- **Online appointment booking** (Practo marketplace + clinic widget).
- **SMS / WhatsApp reminders** as a first-class feature.
- **Patient-facing app** for prescriptions and history.
- **Templated consultation forms by specialty.**
- **Inbuilt SaaS analytics dashboards.**

**Not relevant for small-mid clinic.** Practo marketplace listing only matters
if the clinic wants to acquire patients via Practo.

**Effort to close.** SMS reminders + booking widget MVP: ~3–4 weeks (Twilio /
local SMS gateway + a public `/book` route gated by available slots).

### Halemind / Mocdoc (halemind.com / mocdoc.in)

**Core scope.** Full HMS SaaS popular with mid-sized Indian hospitals. Cover
OPD + IPD + pharmacy + lab + billing + insurance.

**Parity with custom HMS.** Outpatient flow, pharmacy POS, lab, billing,
staff/role management.

**Gaps in custom HMS.** IPD, OT scheduling, insurance/TPA integration,
radiology, ambulance, kitchen/diet, biomedical-equipment AMC tracking — all
typical of a 50-bed-and-up Indian hospital. None justified for a single OPD
clinic.

### ClinicMaster (clinicmaster.net)

**Core scope.** East-Africa-focused HMIS. Comparable feature scope to Bahmni
but proprietary.

**Parity with custom HMS.** Patient, visit, prescription, lab, pharmacy,
billing.

**Gaps.** NHIF / insurance integration, mortuary module, ambulance — again
hospital-scale.

### DocPulse (docpulse.com)

**Core scope.** Indian HMS aimed at clinics and small hospitals. Strong on
appointment + queue + WhatsApp; mid on pharmacy/inventory.

**Gaps in custom HMS that DocPulse has.**

- WhatsApp Business templated messages out of the box.
- Patient app.
- Online booking.
- Telehealth.

**Effort to close.** WhatsApp templates: ~1 week with WhatsApp Cloud API. Patient
app + telehealth: as estimated under OpenEMR.

### eHospital Systems (Adroit Infosystems)

**Core scope.** Modular HIS marketed to mid-to-large hospitals; rich
brochure-ware module list (OPD, IPD, Lab, Pharmacy, Radiology, OT, Blood Bank,
HR, Insurance). Implementation-heavy commercial product.

**Verdict.** Useful only as a feature checklist for what a "complete" hospital
suite advertises; not a peer to a focused single-clinic system.

---

## Commercial & SaaS — US Benchmarks

### CareCloud (carecloud.com)

**Core scope.** Cloud EHR + practice management + RCM (revenue cycle
management) for US ambulatory practices.

**Relevant features beyond custom HMS.**

- Patient portal & online intake.
- Telehealth.
- Real-time eligibility & claims (US-payer).
- Patient experience tooling (recall, surveys).

**Use this for.** Benchmarking patient-experience and revenue-cycle
breadth — but most of the revenue-cycle features are US-payer-specific and
should not be cloned.

### athenahealth (athenahealth.com)

**Core scope.** Network-effect EHR + RCM. The benchmark for "what a fully
loaded ambulatory practice product looks like."

**Relevant features beyond custom HMS.**

- Population health analytics.
- Network-based payer rules engine.
- Patient outreach automation.
- Quality-measure reporting (MIPS).

**Use this for.** Aspirational reference for analytics depth; same caveat —
the payer pieces are not portable to Pakistan.

---

## Cross-Cutting Feature Matrix

Legend: **+** in custom HMS, **−** missing, **n/a** out of declared scope.

| Capability | Custom HMS | OpenMRS | Bahmni | OpenEMR | GNU Health | ERPNext HC | Practo Ray | Halemind | DocPulse |
|---|---|---|---|---|---|---|---|---|---|
| Patient registry | + | + | + | + | + | + | + | + | + |
| OPD visit/encounter | + | + | + | + | + | + | + | + | + |
| Real-time queue (SSE) | + | − | + | − | − | − | − | + | + |
| Doctor encounter notes | + | + | + | + | + | + | + | + | + |
| Lab orders (parameter-based) | + | + | + | + | + | + | partial | + | + |
| Lab result approval workflow | + | + | + | + | partial | partial | − | + | + |
| Prescription writing | + | + | + | + | + | + | + | + | + |
| Pharmacy POS | + | − | + | + | partial | + | partial | + | partial |
| Batch-aware inventory | + | − | + | partial | + | + | − | + | − |
| Sub-unit sales | + | − | − | − | − | − | − | partial | − |
| Sale + purchase returns | + | − | + | partial | + | + | − | + | − |
| Cashier multi-bill allocation | + | − | partial | + | − | + | − | + | − |
| Cashier shifts | + | − | − | partial | − | − | − | + | − |
| RBAC w/ audited policies | + | + | + | + | + | + | + | + | + |
| Staff directory + HR profile | + | − | partial | partial | + | + | partial | + | + |
| Shift templates + roster | + | − | − | partial | + | + | − | + | − |
| Policy-snapshot attendance | + | − | − | − | − | partial | − | partial | − |
| Leave w/ role quotas | + | − | − | partial | + | + | partial | + | partial |
| Payroll | + | − | − | partial | + | + | − | + | − |
| Credentialing | + | − | − | − | partial | partial | − | partial | − |
| Onboarding/offboarding templates | + | − | − | − | partial | partial | − | partial | − |
| Document store + review | + | + | + | + | + | + | partial | + | + |
| Employee self-service portal | + | − | − | − | partial | + | − | + | − |
| Multi-stream audit logs | + | + | + | + | + | + | partial | + | partial |
| ICD/SNOMED coding | − | + | + | + | + | + | − | + | partial |
| HL7 v2 / FHIR endpoints | − | + | + | + | partial | partial | − | + | − |
| Insurance & claims | − | − | + | + | partial | + | − | + | + |
| Inpatient / bed management | − | partial | + | + | + | + | − | + | partial |
| Patient portal | − | partial | − | + | partial | partial | + | + | + |
| Online appointment booking | − | − | − | + | partial | + | + | + | + |
| Telehealth | − | − | − | + | − | partial | + | + | + |
| SMS / WhatsApp templates | − | partial | partial | + | − | + | + | + | + |
| Multilingual UI (i18n) | − | + | + | + | + | + | + | + | + |

(Cells marked "partial" indicate the feature exists but in a narrower form than
the reference implementation.)

---

## Verdict: Top 5–7 Features to Build Next

Ordered by ratio of clinic-business value to engineering effort, given the
existing schema and stack.

1. **SMS / WhatsApp templated notifications.** Visit-ready, prescription-ready,
   lab-result-ready, payment-receipt. Every commercial peer ships this; it
   moves the patient experience needle more than any other single feature.
   ~1–2 weeks with WhatsApp Cloud API + Twilio fallback; stubs already exist
   in `/api/email` and `/api/integrations`.

2. **Patient self-service portal (read-only first).** View past visits,
   prescriptions, lab results, outstanding balance. Login via OTP to mobile.
   Reuses existing read APIs. ~3–4 weeks. Foundation for everything else
   patient-facing.

3. **Online appointment self-booking.** Public `/book` route, slot grid driven
   by doctor roster, OTP confirmation. Slots into the existing visit table on
   confirmation. ~2–3 weeks once #2 ships. This is the single feature that
   Practo / DocPulse / Halemind market hardest.

4. **Urdu + English internationalization.** A clinic in Pakistan should be
   bilingual in UI. `next-intl` + a string-extraction pass across
   `src/features/*`. ~2–3 weeks. Low risk, high goodwill.

5. **Minimal FHIR R4 export shim** (Patient, Encounter, Observation,
   MedicationRequest, DiagnosticReport). Read-only, JSON over `/api/fhir/*`.
   Closes the single biggest credibility gap when the clinic talks to any
   referral lab, insurer, or hospital system later. ~1–2 weeks for read-only,
   no resource graph traversal beyond direct references.

6. **Telehealth handoff.** Stamp a video room URL on a visit when its type is
   `Telemedicine`. Daily.co / Jitsi Meet embeddable room. ~1 week, no schema
   change beyond a new visit_type and a `meeting_url` column.

7. **ICD-10 quick-pick on encounter notes.** Optional structured diagnosis
   field alongside the free-text note. Use a static ICD-10 JSON dataset, no
   licensing required. ~1 week. Doesn't pretend to be a full concept dictionary,
   but unlocks future analytics.

Deliberately *not* on this list: insurance/claims (no payer ecosystem to
integrate with), inpatient bed management (clinic is OPD), full ICD/SNOMED
concept dictionary (months of work for marginal benefit at this scale),
prescription drug-interaction checking (requires licensed clinical content).

---

## What This System Does Better Than the Field

Five capabilities where the custom HMS is genuinely ahead of, or differently
better than, the products surveyed above.

### 1. Database-first inventory with trigger-enforced stock math

Most peers — including Bahmni (via Odoo), ERPNext, OpenEMR — push inventory
calculation into application code, then snapshot it onto rows. The custom HMS
puts every stock-changing event (`purchase`, `sale`, `purchase_return`,
`sale_return`, `adjustment`) through a single append-only `medicine_transaction`
journal whose trigger chain (`fn_tg_stockquantity_generic`) recomputes
`medicine_batch.stock_quantity` and `stock_sub_quantity` atomically. Result:
concurrent POS sales, returns, and purchases cannot drift, and no application
route can "forget" to update stock. This is the single architectural decision a
small team should be most proud of.

### 2. Sub-unit sales as a first-class catalog concept

Selling four tablets out of a strip of ten is the daily reality of Pakistani
retail pharmacy, and every general-purpose ERP fakes it via UoM conversions
that hide rounding errors. The custom HMS models `sub_unit`,
`sub_units_per_unit`, `sub_unit_price`, and `allow_sub_unit_sale` explicitly on
`medicine` and `medicine_batch`, and the triggers normalize stock math in both
units consistently. This is materially better than ERPNext's UoM and Bahmni's
Odoo-stock approach for this market.

### 3. Policy-snapshotted attendance

Every `staff_attendance` / `doctor_attendance` row freezes the active policy
(`timezone`, `grace_minutes`, `half_day_minutes`, `overtime_minutes`,
`early_leave_minutes`) at write time into a `policy_snapshot` JSONB column.
Retroactive policy changes therefore cannot rewrite history — last month's
"late" stays "late" by last month's rules. Commercial HR products (and ERPNext)
typically recompute against the *current* policy, which silently corrupts
historical reports. This is a small architectural choice with large audit
consequences.

### 4. Append-only, domain-segmented audit streams

Most EMRs have a single `audit_log` table that grows into a blob nobody reads.
The custom HMS keeps domain streams separate: `audit_logs` (general),
`pos_audit_log` (POS), `cashier_audit_event` (cashier), `staff_permission_audit`
(RBAC), `visit_status_history` (visit lifecycle). Each retains its own shape,
its own retention story, and its own consumer. The cashier and RBAC streams in
particular are richer than what OpenEMR or Bahmni ship by default — and the
visit-status history is updated by a single procedure
(`update_and_log_visit_status`) so the log can never disagree with the row.

### 5. Multi-allocation cashier settlement with drafts and idempotency

Settlement is the place real clinics quietly lose money. The custom HMS models
it as: shift open → draft (stage, review) → commit → optional reversal /
correction, each step with an idempotency key and a dedicated audit event.
Multi-bill allocation lets one payment apply across visits. Most OSS HMS
products treat billing as "one payment, one invoice" and leave the rest to
external accounting. Among the surveyed products, only Halemind and ERPNext
Healthcare's accounts module reach a comparable level — and they require a
full ERP underneath to do it.

### Honorable mentions

- **RBAC v2 with 84 policy rows and a permission-change audit log** is more
  expressive than OpenEMR's ACL and more auditable than ERPNext's role
  permissions UI.
- **Lifecycle templates** (`ONBOARD_STD`, `OFFBOARD_STD`) generating per-employee
  task lists is rare outside dedicated HRIS products.
- **The cross-source cash ledger view** (`admin_cash_collected_ledger_v1`)
  unioning cashier and pharmacy revenue is exactly the report a clinic owner
  asks for daily, and is purpose-built rather than pieced together in Excel.

---

## How to Use This Document

- Treat the **gap rows** in the matrix as a candidate-feature backlog, not a
  to-do list. Most are correctly out of scope for this clinic.
- Use the **Verdict** section as the prioritized roadmap input for the next
  one-to-two quarters.
- Use the **What This System Does Better** section as the talking points when
  defending the build-vs-buy decision against any of the SaaS products above.
- Revisit this document annually, or whenever a peer product ships a feature
  the clinic's clinicians explicitly ask for.
