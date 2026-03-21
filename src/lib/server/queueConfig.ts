export const ACTIVE_QUEUE_STATUSES = [
  "waiting",
  "seen_by_doctor",
  "medicines_dispensed",
  "lab_tests_done",
  "payment_done",
] as const;

export const QUEUE_STATEMENT_TIMEOUT_MS = 5000;
