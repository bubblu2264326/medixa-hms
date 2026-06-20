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

export function getVisitColor(_visitId: string | number) {
  // Visit-group separator: a single neutral, token-based tint.
  // Decorative per-visit color rotation was removed for the clinical design system.
  return "bg-muted/60 border-border";
}
