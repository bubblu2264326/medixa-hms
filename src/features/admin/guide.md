# Admin Module: Comprehensive User Guide

Welcome to the **HMS Admin Portal**. This guide provides a deep dive into the 16+ sub-modules and 4 main functional groups that allow total control over hospital operations.

---

## 1. Dashboard & Real-Time Analytics
The Admin Dashboard is your mission control center.

### **Live Stat Cards**
- **Cash Collected (30D)**: Total gross revenue from all modules (Pharmacy, Reception, Clinical).
- **Daily Patients**: Real-time counter of unique patient registrations/check-ins.
- **Active Staff**: Count of staff currently clocked in vs. scheduled.
- **Critical Stock**: Number of pharmacy items below the "Safe Minimum" threshold.

### **Revenue Visualization**
- **Interactive Chart**: Uses a *Monotone Cubic Spline* to visualize financial trends.
- **Ranges**: Toggle between **7D**, **30D**, **1Y**, **5Y**, and **Lifetime** views.
- **Hovers**: Hover over any point to see exact revenue for that specific day/period.

### **Pulse Feed**
A real-time "heartbeat" of the hospital:
- **Green**: Successful transactions or clock-ins.
- **Amber**: Low stock alerts or "Late" attendance markings.
- **Rose**: Security breaches, deleted records, or critical errors.

---

## 2. Staff Management Group
Centralized directory and workforce optimization.

### **Directory & Onboarding**
- **Registering Staff**: Add name, contact, and unique **User Code**.
- **Role Selection**: Roles (ADMIN, DOCTOR, NURSE, RECEPTION, PHARMACIST) dictate default access.
- **Credentialing**: Upload and track medical licenses, certifications, and expiry dates.
- **Lifecycle Tracking**: Transition staff between *Active*, *On Leave*, *Suspended*, or *Resigned* states.

### **Attendance, Roster & Leave**
- **Roster Management**: Assign weekly shifts and holiday rotations.
- **Live Attendance**: Monitor clock-ins/outs with derived statuses (Late, Half-Day).
- **Manual Overrides**: Correct errors with mandatory "Audit Reason" logging.
- **Leave Approvals**: Centralized queue for approving/rejecting staff time-off requests.

### **Access & Security**
- **RBAC (Role Based Access Control)**: Granularly toggle module visibility for specific users.
- **Security Sessions**: View and terminate active device sessions if an account is compromised.

---

## 3. Pharmacy & Inventory Group
Integrated stock control and financial oversight.

- **Inventory Monitor**: Real-time tracking of drug stock, batch numbers, and expiry alerts.
- **Pharmacy Financials (Cashier)**: Oversight of daily sales and cash flow restricted to the pharmacy retail window.
- **Stock Audit**: Reconcile physical counts with system records to detect leakage or errors.

---

## 4. Financials Group
Holistic hospital revenue management.

- **System Finance**: Unified view of all revenue streams (Consultation fees, Lab tests, Pharmacy sales).
- **Payroll Runs**: Monthly execution of payroll.
- **Automatic Adjustments**: Payroll is adjusted based on:
  - Calculated attendance (Late deductions, OT bonuses).
  - Contractual base salary.
  - Approved leave days.

---

## 5. General System & Forensics
Configuration and audit capabilities.

- **Global Settings**: 
  - **Attendance Policies**: Set Grace minutes (default: 15m) and Half-day thresholds.
  - **Hospital Defaults**: Clinic name, branding images, and contact info.
  - **System Timezone**: Global clock for all appointment and log timestamps.
- **Audit Logs**: A forensically-sound history of **every** change made in the system. Searchable by User, Action Type, or Date.

---

## Support & Emergency
- **IT Desk**: `support@hospital-system.com`
- **Internal Dial**: Ext. 101 (Systems Admin)
- **Security**: Ext. 911
