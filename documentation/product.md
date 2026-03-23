roduct Overview

Hospital Management System that stitches reception, doctor consults, lab work, and pharmacy/POS into one workspace.
Solves fragmented clinic workflows by coordinating patient intake, visit tracking, diagnostics, and medicine sales so no one juggles spreadsheets and paper queues.
Built for clinics, small hospitals, and their staff roles (receptionists, physicians, lab technicians, pharmacists) who need a single source of truth for patients, visits, and inventory.
Core Features

Queue + patient intake: receptionists register patients, push them into doctor queues, capture vitals, and collect OB/GYN form data so clinical intake stays structured and traceable.
Doctor dashboard: role-gated view of assigned queue, patient charts, prescription/lab ordering, and past visit history so consultations feed documentation and orders directly.
Laboratory workspace: lab techs retrieve orders, log sample results, and surface report views so diagnostics stay linked to visits without bouncing between systems.
Pharmacy POS and inventory: batch-aware medicine search, retail checkout, purchases, returns, and audit/receipt flows let pharmacists honor sales while triggers keep stock math accurate.
Shared helpers & contexts: patient/queue helpers and contexts (e.g., PatientIdContext) keep cross-panel state consistent and reduce repeated lookups.
User Flow

Staff logs in via JWT cookie auth, middleware routes them to their role workspace (receptionist, doctor, lab tech, or pharmacist).
Receptionist searches or registers the patient, records vitals/clinical details, and admits them into the queue with visit creation.
Doctor opens the queue, reviews the patient’s details, issues prescriptions or lab orders, and optionally updates visit status (stored procedures/audit intended).
Lab technicians pull relevant lab orders, enter results, and flag them back to the clinical workflow.
Pharmacists use the POS to search medicines, ring retail sales/purchase/returns, and rely on audit logs plus database triggers for inventory updates.
Unique Capabilities

Database-first logic for inventory (triggers/functions like medicine_transaction, tg_stockquantity_generic, and v_medicine_pos) and visit status auditing makes business rules enforceable even if multiple clients exist.
Role-specific App Router layout groups plus middleware ensure each user lands in the right workspace with tailored navigation and permissions.
Pharmacy POS paired with audit/receipt routes plus views (v_low_stock_medicines, v_daily_sales_summary) gives a near real-time retail control panel uncommon in typical hospital suites.
Tech Insights

Frontend: Next.js 16.1.6 App Router, React 19.1.0, Tailwind CSS 4, Radix UI primitives, react-hot-toast.
Backend: Next.js route handlers hitting pg directly through database/db.ts (no active ORM) with JWT cookies signed via secret_key.
Database: Supabase PostgreSQL 17.6.1 (live schema is authoritative), stored procedures/trigger chains that own inventory math and visit tracking, and dedicated views for POS/search.
Hidden / Advanced Features

OB/GYN-specific clinical forms (menstrual history, obstetric history, para details, current pregnancy) tucked under reception features for maternal health tracking.
Stored procedure update_and_log_visit_status(...) plus related visit status history tables capture workflow transitions even though some routes still update visits directly.
Medicine search vectors and triggers (medicine_search_vector_update) keep pharmacy searches fast, while triggers from purchase/sale detail tables feed medicine_transaction for audit.
Context-aware helpers (e.g., queue and patient helpers) reduce duplicate lookups when switching tabs/panels within a role workspace.
Real-World Use Cases

A busy clinic receptionist uses the patient registry + queue interface to keep the morning walk-in list moving, documenting vitals/clinical screens before handing off to doctors.
A general practitioner opens their queue, reviews past visits, enters prescriptions and lab orders during the consult, and trusts visit status logs for downstream reporting.
A lab technician filters for pending lab orders, enters results, and marks reports as ready for doctors without needing a separate LIS.
A pharmacist runs the POS: scanning batch-aware medicines, honoring returns, and relying on backend triggers for accurate stock counts and audit-ready receipts.
Clinic administrators monitor pharmacy sales views (v_daily_sales_summary, v_low_stock_medicines) to spot low stock or reconcile cash without opening the database directly.

