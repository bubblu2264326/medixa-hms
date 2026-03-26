# 📋 Reception Module: The Gateway to Patient Care

The Reception Module is the first point of contact in the HMS ecosystem. It is designed for high-speed, accurate patient onboarding and visit management.

## 🌟 The Experience (User Story)

Imagine a busy clinic morning. A new patient arrives:
1. **Onboarding**: The receptionist quickly opens the **Register** tab. With a few keystrokes, they capture the patient's identity. If it's a returning patient, the **Shared Search** bar finds them instantly across all modules.
2. **Clinical Readiness**: Once identified, the patient is "active." The receptionist switches to the **Vitals** tab. Real-time validation ensures that blood pressure, temperature, and weight are recorded before the patient even sees the doctor.
3. **Queue Entry**: Finally, the receptionist hits **Queue**. They pick an available doctor, assign a clinic number (automatically generated), and the patient's visit is officially live.
4. **Visibility**: The patient now appears on the **Doctor's Dashboard** and the **Live Queue Sidebar**, ready for consultation.

---

## 🚀 Feature Highlights

- **Intelligent Onboarding**: Multi-step registration with real-time duplication checks.
- **Clinical Primes**: Dedicated vitals recording that links directly to the patient's visit.
- **OB/GYN Specialization**: Integrated forms for Menstrual and Obstetric history (Para details, current pregnancy tracking).
- **Dynamic Queueing**: Instant assignment of patients to doctors with automated status updates.
- **Role-Based Context**: Using a global `PatientIdContext`, the selected patient stays focused even as the receptionist switches between different task panels.

---

## 🛠️ Under the Hood (Technical Deep Dive)

### 🧩 UI Architecture: Parallel Routing
The Receptionist portal is a masterclass in modern Next.js architecture. It uses **Parallel Routes** to allow multiple independent workspaces to exist in the same layout without losing state.

- **Main Layout**: [layout.tsx](file:///home/oops/projects/hms/src/app/receptionist/layout.tsx)
- **Workspaces**:
  - `@patientRegistration`: [components/](file:///home/oops/projects/hms/src/features/reception/patientRegistration/components)
  - `@patientVitals`: [components/](file:///home/oops/projects/hms/src/features/reception/patientVitals/components)
  - `@queueManagement`: [components/](file:///home/oops/projects/hms/src/features/reception/queueManagement/components)
  - `@clinicalDetails`: [components/](file:///home/oops/projects/hms/src/features/reception/clinicalDetails/components)

### 📡 Logic & Data Flow
- **State Coordination**: The `PatientIdContext` ensures that once a patient is searched or registered, their ID is available to the Vitals and Clinical forms instantly.
- **API Services**:
  - `addPatient`: Handles core registration logic.
  - `createPatientVitals`: Persists clinical baseline data.
  - `createVisit`: Generates the clinical encounter and clinic number.

### 💾 Data Persistence (Source of Truth)
The lifeblood of this module resides in the following Supabase tables:
- `patient`: Core identity records.
- `visit`: The primary record for every encounter (OPD/Emergency).
- `patient_vitals`: Linked records for clinical readings.
- `obstetric_history`, `para_details`: Specialized women's health records.

---

## 💎 Premium Touches
- **Glassmorphic Design**: The interface uses subtle backdrops and gradients for a premium, clean look.
- **Micro-Animations**: Tabs and patient badges use smooth `animate-in` transitions to reduce cognitive load.
- **Predictive Search**: The `SharedSearch` component provides instant feedback, making patient retrieval effortless.
