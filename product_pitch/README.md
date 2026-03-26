# HMS Product Pitch: The Modern Healthcare Operating System

Welcome to the HMS Product Documentation. This suite provides a high-level overview of the Hospital Management System's capabilities, designed for both business evaluation and technical onboarding.

## Executive Summary
HMS is a full-stack, real-time healthcare ecosystem that bridges the gap between patient care and administrative excellence. Built on a modern tech stack (Next.js, Supabase, Tailwind CSS), it offers unprecedented speed, data integrity, and user experience.

## Documentation Modules

### 1. [Reception & Patient Gateway](reception_module.md)
*Focus: First Impressions & Flow Control*
- Automated queue management.
- Precision vitals capture and OB/GYN specialty support.
- Streamlined registration and cross-visit search.

### 2. [Administrative Command Center](admin_module.md)
*Focus: Integrity & Oversight*
- Staff HR, roster, and leave management.
- Multi-tier financial approvals and cashier sessions.
- Comprehensive audit trails and system-wide security.

### 3. [Pharmacy & POS Ecosystem](pharmacy_pos_module.md)
*Focus: Precision & Profitability*
- High-volume Retail POS with barcode/hardware support.
- FEFO/FIFO batch-level inventory tracking.
- Seamless "Closed-Loop" prescription dispensing.

### 4. [Clinical & Diagnostic Modules](clinical_modules.md)
*Focus: High-Bandwidth Patient Care*
- Parallel-route Doctor Workspace for context-aware consultations.
- Integrated Lab Diagnostic ordering and result tracking.
- Longitudinal patient records with critical alert flagging.

---

## Technical Foundations
- **Front-end**: Next.js 14/15 (App Router) with Parallel and Intercepting Routes.
- **Back-end**: PostgreSQL (Supabase) with heavy use of Database Triggers for stock integrity and audit logging.
- **Styling**: Modern Vanilla CSS and Tailwind CSS for a premium, responsive "Glassmorphism" aesthetic.
- **State Management**: Context Providers for module-specific workspace coordination.

---
*Created by Antigravity for the DeepMind Advanced Agentic Coding Team.*
