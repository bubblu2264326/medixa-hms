type VisitScopedRecord = {
  visit_id: string | number;
};

export function groupHistoryByVisit<T extends VisitScopedRecord>(records: T[]) {
  const grouped = new Map<string, T[]>();

  for (const record of records) {
    const visitId = String(record.visit_id);
    const existing = grouped.get(visitId);
    if (existing) {
      existing.push(record);
      continue;
    }
    grouped.set(visitId, [record]);
  }

  return Array.from(grouped.entries()).map(([visitId, items]) => ({
    visitId,
    items,
  }));
}

const VISIT_TINT_CLASSES = [
  "bg-sky-50/70 border-sky-200",
  "bg-emerald-50/70 border-emerald-200",
  "bg-amber-50/70 border-amber-200",
  "bg-rose-50/70 border-rose-200",
  "bg-violet-50/70 border-violet-200",
  "bg-cyan-50/70 border-cyan-200",
] as const;

export function getVisitColor(visitId: string | number) {
  const normalized = String(visitId);
  let hash = 0;

  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }

  return VISIT_TINT_CLASSES[hash % VISIT_TINT_CLASSES.length];
}
