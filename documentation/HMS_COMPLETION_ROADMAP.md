# HMS Completion Roadmap

**Purpose:** take the HMS from a hardened-but-partial product to a *complete* HMS for our ICP — small/mid clinics, standalone pharmacy/lab, and small hospitals in Pakistan / South Asia. Grounded in (a) the post-stabilization codebase, (b) web research into real-world deployed HMS/pharmacy/lab software (8 module studies, June 2026), and (c) the canonical schema (93 tables).

**Status of this doc:** PLAN for review. Nothing here is implemented yet except where noted. Sequencing follows the owner's stated priority: finish leftovers → **frontend↔backend↔DB sync first** → real-world gap-fill → IPD/admitted patients → HR/Admin overhaul.

---

## 0. Where we are (post-stabilization)

- Backend hardened: RBAC unified, JWT fail-fast, 25 data routes authenticated, real-actor audit, DB integrity guards, live-server scenario suite (16/16) + 8 invariants. See [REFACTOR_REPORT.md](../REFACTOR_REPORT.md). Merged to `main` (PR #3).
- **The system is broad, not thin.** 93 tables across 8 modules with a strong DB-first design (trigger-driven stock, stored-proc visit lifecycle, audit sink). The HR and Admin backends are *extensive* (credentialing, document lifecycle, leave quotas, roster with 1,332 assignments, payroll, granular permission tables).
- **But:** many HR/Admin tables are empty (0 rows) — the schema/backend exist but are **not wired to a usable UI**. That is what "rusty" means here: a UI/UX + integration problem, not a missing-backend problem. And there is one true hard gap — **no in-patient (IPD) domain at all**.

---

## 1. Leftover items — recommended decisions (for sign-off)

| # | Item | Recommendation | Why (incl. web research) |
|---|---|---|---|
| **M3** | Sale-return refund not recorded (stock restored, no money leg) → revenue overstated | Model a sale return as its own document linked to the original sale (already true), and post a **refund cashier transaction** (negative) against the bill/sale. **Default = cash refund** (matches cash-first PK retail); add **credit-note / store-credit** as an option later. Keep stock returning to the *original batch* (already true). | Real pharmacy POS systems record returns through a dedicated **Sales-Returns (contra-revenue)** path linked to the source sale, with a settlement leg (cash vs store credit) — never as a bare delete. Cash refund is the retail-counter default. We already have `cashier_payment_txn`; a refund txn type fits cleanly and makes the ledger reconcile. |
| **H2** | Payment reversal doesn't revert status on `completed`/`discharged` visits | Keep terminal states untouched by default; allow reversal on a terminal visit **only via explicit admin override + audit** (reopening a closed encounter is significant). Non-terminal revert already works. | Reversing a closed encounter is a material action; gating it behind admin + audit matches "sensitive-action audit" norms. |
| **RBAC** | Routes are authenticated but not finely role-gated (any valid staff) | Move to a **role × module × action permission matrix**, enforced in-route — leveraging the **existing `staff_permissions` / `staff_permission_policies` tables** (84 policies already seeded). | Every researched HMS treats granular RBAC (cashier can post but not void; receptionist can register but not see lab results) as standard. Infra already exists — this is wiring + enforcement, not new tables. |
| **Stubs** | `lab/testParameters/route.ts` and `doctor/route.ts` are 0-byte | **Implement** `lab/testParameters` (there's a `lab_test_parameters` table with reference ranges/units — the lab catalog needs it). **Delete or repurpose** `doctor/route.ts` (doctor listing already served by `getAllDoctors`). | Reference ranges are must-have for result flagging; the doctor stub is redundant. |

---

## 2. Real-world gap analysis (per module)

Legend: ✅ have · 🟡 partial / not wired to UI · ❌ missing. Tiers from the research (must-have / standard / advanced).

### Pharmacy / Inventory / POS — **strongest module**
- ✅ Medicine master, batch+expiry, stock in/out (trigger chain), purchase + purchase-return, sales + sale-return, supplier (party) ledger + payments, POS view, low-stock view, held transactions, receipt config, audit.
- 🟡 Refund accounting (M3 above), barcode (verify in UI), profit/valuation reports (data present; reporting UI?).
- ❌ **Controlled-drug / narcotics register (DRAP)**, **FEFO enforcement** (verify), demand forecasting, multi-location stock, FBR e-invoicing.

### Laboratory (LIS)
- ✅ Test catalog (`lab_test`, `lab_test_parameters`), orders (`lab_order`), results (`lab_result`, `lab_test_results`), result approvals table.
- 🟡 Reference-range flagging (parameters table exists; wire it — see stub), report printing/delivery, TAT.
- ❌ **Sample accessioning + barcode**, **critical-value alerts**, **result verification/sign-off workflow** (table exists, wire it), analyzer interfacing (HL7/ASTM), QC (Levey-Jennings/Westgard), referral/outsourced tests, WhatsApp report delivery. *(ISO 15189 / PNAC makes QC + audit + critical-value logging load-bearing for accredited labs.)*

### Doctor / EMR (OPD)
- ✅ Encounter notes, vitals, prescriptions (+ medicines), lab ordering, visit history, queue integration, gynae/ANC clinical detail (pregnancy, obstetric, menstrual, para).
- 🟡 Diagnosis capture (verify ICD-10 coding), prescription print (PMDC number?), templates/favorites.
- ❌ **Problem list**, **allergy list + drug-interaction/allergy checks (CDSS)**, ICD-10 coded diagnosis, follow-up scheduling, medical certificates, pediatrics growth charts, referral notes, attachments.

### Reception / Registration / OPD queue
- ✅ Registration (CNIC unique, validation), patient search, visit creation (OPD/Emergency), SSE token queue, vitals capture.
- 🟡 Duplicate detection (CNIC unique helps; add name+mobile match), patient card/print.
- ❌ **Appointment scheduling** (no appointment table — fully walk-in/queue today), SMS/WhatsApp reminders, panel/insurance patient flagging, referral-source capture.

### Billing / Cashier
- ✅ Consolidated bill, bill items, payments, allocations, settlement drafts, **cashier shift**, idempotency, reversal/correction, outstanding/overdue, receipts, audit.
- 🟡 Discounts (verify approval workflow), part-payment (present), advance/deposit (needed for IPD — partial).
- ❌ **Corporate-panel / split billing**, **FBR/PRAL e-invoicing (QR + 22-digit number)**, mobile-wallet (JazzCash/Easypaisa) capture, credit notes (tie to M3).

### HR / Workforce — **rich backend, weak UI**
- ✅ Staff+doctor directory, attendance (staff+doctor), **roster + shift templates**, **leave (types/requests/approvals/balances/quotas)**, **payroll (runs + line items)**, **compensation profiles + allowances**, **credentialing + document lifecycle** tables, finance (assets/expenses), employee self-service routes (`/attendance/me`, `/employee/me`).
- 🟡 Almost everything above is **schema+API present but tables empty / UI rusty** — needs wiring + a real UX.
- ❌ Doctor fee-share auto-computation from billing (verify), credential-expiry alerting (table exists; add alerts), biometric attendance device integration.

### Admin / Reporting / Config
- ✅ Staff/doctor provisioning (v2 directory), **granular permission tables**, security/sessions, audit logs (+ stream), system settings, dashboard summary, cashier KPIs, patient analytics, finance masters, payroll runs.
- 🟡 Dashboards (basic; need role-aware executive vs operational), permission **enforcement** (tables exist; not enforced per-action), report library (partial).
- ❌ **Report builder / full report library**, multi-branch/facility model, **FBR compliance reporting**, notification/template config (SMS/WhatsApp), backup/export UI, **good admin/HR UX** (IA, KPI tiles with drill-down, permission-matrix grid).

### In-Patient (IPD) / Nursing — **entirely missing (the big gap)**
- ❌ No ward/room/bed, no admission, no bed-transfer, no MAR (medication administration), no nursing notes, no intake/output, no patient_allergy, no inpatient running-bill. `visit.status` has `admitted`/`discharged` placeholders but no domain behind them.

---

## 3. Phased roadmap (sequenced per owner priority)

> Each phase = its own branch → PR → verify gate (build/tsc/tests/lint + scenario suite + invariants) → merge. DB changes via migrations with `.down` + pre-apply backup. Supabase never touched. Frontend correctness verified against the running app.

### Phase 1 — Frontend ↔ Backend ↔ Database sync (FIRST)
**Goal:** every screen's data contract matches its API and the DB; no dead buttons, no shape mismatches, no silent failures. This is correctness, not new features.
- Per module, walk each screen → the API it calls → the tables/columns it reads/writes. Record mismatches (FE expects a field the API doesn't return; API writes a column the FE never sends; routes the FE calls that 404/500; empty-state/loading/error not handled).
- Fix the mismatches; surface the new `400/401/403/409` states added during stabilization (e.g. patient dup-CNIC `409`, validation `400`).
- Deliverable: a FE↔BE↔DB conformance matrix + fixes. Extend the scenario suite with the key read/write happy-paths per module.
- **Why first:** everything else builds on a trustworthy UI/data contract; the owner flagged this as the priority.

### Phase 2 — Close the leftover items (§1)
M3 refund accounting · H2 admin-gated terminal reversal · RBAC granular enforcement (wire `staff_permission_policies`) · implement `lab/testParameters`, remove `doctor/route.ts` stub. Small, high-confidence, mostly decided.

### Phase 3 — In-Patient (IPD) / Nursing / admitted-patient module *(largest new build)*
**Dual-loop design (non-negotiable):** OPD stays a short loop (register → consult → pay → leave; no bed, no admission). **Admission is an explicit, optional conversion** of a visit. Most patients never get an admission row.
- **Data model:** `ward`, `room`, `bed`, `admission` (refs `visit`), `bed_transfer`, `doctor_order` (+`order_set`), `medication_order`, `medication_administration` (MAR), `vitals`(inpatient), `nursing_note`, `intake_output`, `patient_allergy`, `ip_advance`, `ip_charge`/`ip_bill_item`, `ip_final_bill`.
- **Backend:** admission/discharge/transfer (reuse `update_and_log_visit_status` for `admitted`/`discharged`), bed occupancy, **nurse route** for MAR + vitals + nursing notes, running-bill accrual (daily room-rent via DB job/trigger, consistent with the existing trigger-chain pattern), advance handling.
- **Patient safety (designed in):** MAR ties to an active doctor order; five-rights confirmation; allergy surfaced at order + administration; only authenticated nurse roles can chart; append-only audit. *(Depends on Phase 2 RBAC + the already-fixed real-actor audit — a hardcoded actor cannot back a legal MAR.)*
- **Frontend:** bed/occupancy board, nursing station worklist, MAR timeline, admission/discharge screens, running-bill view.

### Phase 4 — HR + Admin functional + UX overhaul
The backend is largely there; this is **wiring + UX**, not a rebuild.
- HR: make the rich schema usable — staff record (profile+role+schedule+attendance+payroll in one), roster planner, leave workflow, payroll run UX, **credential-expiry alerts** (90/60/30 days). Doctor fee-share computed from billing.
- Admin: role-aware **executive vs operational dashboards** with KPI tiles + drill-down, **permission-matrix grid** (role×module×action), master-data CRUD screens, report library, audit visibility.
- Apply a consistent list→detail→edit pattern and the dashboard IA from the research (inverted-pyramid, progressive disclosure).

### Phase 5 — Real-world gap-fill (prioritized)
1. **Patient allergies + basic drug-interaction/allergy checks** (clinical safety; also unblocks IPD MAR) — pull earlier if IPD needs it.
2. **Appointment scheduling** (doctor calendars/slots) layered over the existing queue.
3. **FBR / PRAL e-invoicing** (QR + 22-digit number) — compliance wedge + sales differentiator in PK.
4. **WhatsApp/SMS notifications** (reminders, lab-report-ready, receipts) — dominant PK channel.
5. **Lab depth:** accessioning/barcode, critical-value alerts, result sign-off workflow, QC.
6. **Pharmacy:** controlled-drug/narcotics register (DRAP), FEFO enforcement.
7. Corporate-panel split billing; mobile-wallet capture.

---

## 4. Working method & guardrails (unchanged from stabilization)
- Branch-per-phase; PR to `main`; never commit to `main` directly except a confirmed merge; pin `gh` account on push (`gh auth switch --user bubblu2264326`).
- DB: local `hms` only; Supabase paused/untouched; every migration ships forward + `.down`, with a pre-apply backup; consistency test after apply.
- Verify gate every unit: build · tsc · tests · lint · scenario suite · invariants. Extend the scenario suite as features land.
- No fabrication; claims trace to code; honor the timezone-helper and no-`SELECT *` conventions.

---

## 5. Open questions for the owner
1. **Refund policy (M3):** confirm cash-refund default (credit-note later)? 
2. **Phase order:** keep as above (sync → leftovers → IPD → HR/Admin → gap-fill), or pull HR/Admin UX earlier since it's "rusty"?
3. **IPD scope for v1:** full MAR + nursing + running-bill, or a leaner v1 (admission + bed + running-bill) with MAR/nursing in v2?
4. **FBR e-invoicing:** in scope now (compliance wedge) or later? It's a meaningful build.
5. **Branch/PR cadence:** one PR per phase (big reviews) or per sub-unit (frequent small PRs, as in stabilization)?
