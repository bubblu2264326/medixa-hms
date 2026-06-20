# Competitor Analysis

> Researched 2026-06-20 (Claude Code + claude.ai Research, cross-checked). Vendors below are **real and verified** unless flagged. Pricing is mostly custom-quote; concrete PKR figures are **indicative** (often from vendor/aggregator pages, not contracts). Self-reported claims (e.g. customer counts) flagged. Full sources in [../05-research/research-log.md](../05-research/research-log.md).

## Key finding
The market is **crowded at the directory level but thin on vendors purpose-built for small-city, low-connectivity, price-sensitive buyers.** Dominant local cloud players concentrate on Karachi / Lahore / Islamabad. **South Punjab is effectively uncontested** for a locally-present vendor with on-ground support, Urdu, offline resilience, and transparent pricing.

## Verified vendor landscape

### A. Local cloud HMS / clinic suites (the direct competitors)
| Vendor | Origin | Segment | Web/Desktop | SaaS/On-prem | Pricing (confidence) |
|---|---|---|---|---|---|
| **InstaCare** | PK (Lahore) | Clinics, hospitals, labs, pharmacies; markets 50+ cities | Web | Cloud (100%) | Custom quote only |
| **Healthwire / HCloud** | PK | Clinics, hospitals, pharmacies, labs | Web | Cloud | Custom quote |
| **e-mareez** | PK (Rawalpindi) | Small clinics, dental, pharmacy; Urdu/multilingual | Web | Cloud | **~PKR 1,500/mo** (indicative), 10-day trial |
| **Lifeline HMS** | Markets to PK (⚠️ UK address in footer — verify base) | Single-doctor → multi-branch; claims low-connectivity tolerance + Urdu | Web | Cloud | PKR but no public figure |
| **iTack / iClinic** | PK | Clinics + mid hospitals | Web | Cloud | Custom |

### B. Pharmacy / POS specialists (our wedge competitors)
| Vendor | Web/Desktop | Offline? | Notable | Pricing |
|---|---|---|---|---|
| **Oscar (oscar.pk)** | Web/cloud | — | Pharmacy POS, FBR integration | Custom |
| **Websol / pointofsale.pk** | Desktop + cloud | ✅ **offline billing** | FBR integration, WhatsApp contact | **~PKR 1,500/mo** (indicative) |
| **Moneypex** | Web | — | 25,000+ pre-loaded PK medicines, batch/expiry, FBR Tier-1 | Custom |
| **Asaan Pharmacy (AsaanPOS)** | Desktop/tablet (Win/Android) | ✅ local | POS, inventory, roles | Custom |

### C. Enterprise / foreign (not core SMB competitors here)
- **eHospital Systems (Adroit)** — USA/India; full HIS; **cloud OR on-premise**; hospitals.
- **CureMD** — ⚠️ **US-only seller**; Lahore site is R&D, not a local sales channel. Do not list as a PK competitor.

### D. Patient-facing marketplaces (adjacent, not HMS)
- **Marham**, **oladoc** — booking/telemedicine marketplaces + light doctor tools; **20,000+ PMC-verified doctors** (Marham, self-reported). Adjacent threat for appointments, not full HMS.

### ⚠️ Debunked / unverifiable (do NOT cite as PK vendors)
Medical Lync, Hospital2u, MedixCloud, Trillium, AlphaMD — searches found no real Pakistani HMS product by these names (matches were unrelated foreign entities). These were earlier guesses; treat as non-existent until proven otherwise.

## Table-stakes vs differentiation gaps

**Table-stakes (everyone has):** cloud/web access, EMR/records, appointments, billing/invoicing, SMS reminders, pharmacy inventory w/ batch+expiry, FBR POS integration, role-based access, basic reporting.

**Under-served gaps (our openings):**
1. **Genuine offline / low-connectivity resilience** — cloud-only incumbents need stable internet; only some pharmacy POS tools (Websol, Asaan) do true offline. A *clinical HMS* that is local-first + sync is rare.
2. **Deep Urdu / Roman-Urdu UI** — claimed by a few, inconsistently delivered.
3. **WhatsApp-native** appointments/reminders — most still use SMS; WhatsApp is the higher-engagement channel in-region (see market-landscape).
4. **Pharmacy-first + DB-enforced stock integrity** — our architectural edge.
5. **Transparent low PKR pricing** — incumbents hide behind custom quotes; transparency builds trust.
6. **Small-city / South Punjab local presence + support** — essentially uncontested.

## So what (for strategy)
Beachhead **Multan-first** with on-ground support; lead with **offline-resilient, pharmacy-first, Urdu+WhatsApp, transparently-priced**. See [market-direction.md](market-direction.md).
