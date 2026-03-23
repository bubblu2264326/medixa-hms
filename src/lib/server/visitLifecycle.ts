export const VISIT_STATUSES = [
  "waiting",
  "seen_by_doctor",
  "dispensing",
  "medicines_dispensed",
  "lab_tests_done",
  "payment_done",
  "completed",
  "discharged",
] as const;

export type VisitStatus = (typeof VISIT_STATUSES)[number];

const VISIT_STATUS_SET = new Set<string>(VISIT_STATUSES);

const TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
  waiting: ["seen_by_doctor", "dispensing", "discharged"],
  seen_by_doctor: ["waiting", "dispensing", "medicines_dispensed", "lab_tests_done", "discharged"],
  dispensing: ["seen_by_doctor", "medicines_dispensed", "discharged"],
  medicines_dispensed: ["lab_tests_done", "payment_done", "completed", "discharged"],
  lab_tests_done: ["payment_done", "completed", "discharged"],
  payment_done: ["completed", "discharged"],
  completed: [],
  discharged: [],
};

export const HARD_LOCK_VISIT_STATUSES: VisitStatus[] = ["completed", "discharged"];

export const ACTIVE_QUEUE_VISIT_STATUSES: VisitStatus[] = ["waiting"];

export const ACTIVE_ENCOUNTER_BLOCKING_VISIT_STATUSES: VisitStatus[] = ["waiting", "dispensing"];

export function isVisitStatus(value: string): value is VisitStatus {
  return VISIT_STATUS_SET.has(value);
}

export function parseVisitStatus(value: string): VisitStatus | null {
  return isVisitStatus(value) ? value : null;
}

export function canTransitionVisitStatus(from: VisitStatus, to: VisitStatus) {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function assertVisitStatusTransition(
  currentStatus: string,
  nextStatus: string,
  context = "visit workflow"
) {
  const from = parseVisitStatus(currentStatus);
  const to = parseVisitStatus(nextStatus);

  if (!from || !to) {
    throw new Error(`Invalid ${context} status transition`);
  }

  if (!canTransitionVisitStatus(from, to)) {
    throw new Error(`Invalid ${context} status transition: ${from} → ${to}`);
  }

  return { from, to };
}

export function isQueueActiveVisitStatus(status: string) {
  const parsed = parseVisitStatus(status);
  return parsed ? ACTIVE_QUEUE_VISIT_STATUSES.includes(parsed) : false;
}

export function canCreateNewEncounterWithExistingStatus(status: string) {
  const parsed = parseVisitStatus(status);
  if (!parsed) return false;
  return !ACTIVE_ENCOUNTER_BLOCKING_VISIT_STATUSES.includes(parsed);
}

export function canDoctorEditPrescriptions(status: string) {
  const parsed = parseVisitStatus(status);
  if (!parsed) return false;
  return !HARD_LOCK_VISIT_STATUSES.includes(parsed);
}

export function canDoctorEditLabOrders(status: string) {
  const parsed = parseVisitStatus(status);
  if (!parsed) return false;
  return !HARD_LOCK_VISIT_STATUSES.includes(parsed);
}

export function canDoctorSoftDeleteVisit(status: string) {
  const parsed = parseVisitStatus(status);
  if (!parsed) return false;
  return !HARD_LOCK_VISIT_STATUSES.includes(parsed);
}

export function shouldCreateNewPrescriptionThread(status: string) {
  const parsed = parseVisitStatus(status);
  if (!parsed) return false;
  return parsed === "lab_tests_done" || parsed === "payment_done";
}

export function canAppendPrescriptionThread(status: string) {
  const parsed = parseVisitStatus(status);
  if (!parsed) return false;
  return !shouldCreateNewPrescriptionThread(parsed) && !HARD_LOCK_VISIT_STATUSES.includes(parsed);
}

export function getDoctorVisitLockReason(status: string) {
  const parsed = parseVisitStatus(status);
  if (!parsed) {
    return "Unknown visit status";
  }

  switch (parsed) {
    case "dispensing":
      return "Medicines are being dispensed in pharmacy";
    case "medicines_dispensed":
      return "Medicines are already dispensed";
    case "lab_tests_done":
      return "Lab workflow already progressed for this encounter";
    case "payment_done":
      return "Billing workflow already completed for this encounter";
    case "completed":
      return "Encounter is hard-locked (completed)";
    case "discharged":
      return "Encounter is hard-locked (discharged)";
    default:
      return null;
  }
}
