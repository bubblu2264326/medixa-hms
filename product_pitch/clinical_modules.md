# Clinical & Diagnostic Modules

The Clinical module is the central nervous system of the HMS, providing doctors and lab technicians with a high-bandwidth, multi-pane workspace for modern patient care.

## 1. The Doctor Workspace (Parallel Interface)
Built using Next.js Parallel Routes, the Doctor workspace allows clinicians to manage multiple aspects of a patient visit simultaneously without losing context.

- **Dynamic Patient Queue**: A real-time, collapsible sidebar that shows the live status of patients (e.g., `Waiting`, `With Nurse`, `Ready for Doctor`).
- **Synchronized Viewports**: 
  - **Clinical History**: Instant access to previous visits, vitals trends, and chronic conditions.
  - **Live Consultation**: Direct entry for `Chef Complaints`, `Observations`, and `ICD-10 Based Diagnosis`.
- **Stale Visit Protection**: A safety layer that prevents doctors from acting on patients who have been moved or discharged by other staff, ensuring data integrity.

## 2. Integrated Prescription & Pharmacy Ordering
Prescriptions are no longer just "notes"; they are digital orders that drive the hospital's supply chain.

- **Template-Based Entry**: Rapid selection of medicines with pre-filled dosages, frequencies, and durations.
- **Real-Time Stock Interaction**: Doctors can see if a medicine is out of stock in the pharmacy *before* finalizing the prescription.
- **Auto-Routing**: Finalized prescriptions are instantly beamed to the Pharmacy retail POS for dispensing.

## 3. Laboratory Diagnostics & Workflow
The Lab module handles the entire lifecycle of a diagnostic request, from collection to verified result.

- **Digital Lab Orders**: Requests from doctors appear in the Lab Technician's queue with priority markers.
- **Result Lifecycle**:
  - `Drafting`: Data entry for test results.
  - `Review`: Senior technician or doctor verification of values.
  - `Finalized`: Results are locked and instantly visible in the Doctor's workspace.
- **Visual Result Indicators**: Automated flagging of results that fall outside of role-defined "Normal" ranges (Critical Alerts).

## 4. Continuity of Care (The Timeline)
- **Visit Archiving**: Every interaction (prescriptions, lab tests, doctor notes) is bound to a unique `Visit ID`.
- **The Longitudinal Record**: A unified timeline view across modules allows any authorized clinician to see the full "story" of a patient's treatment.

---
*Architecture Hint: The Clinical module leverages a "Workspace Context" to maintain state across independent UI slots, ensuring that selecting a patient in the @queue instantly refreshes the @patientDetails and @pharmacyOrder slots.*
