"use client";

import { useDoctorDashboard } from "../hooks/useDoctorDashboard";

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | undefined;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-3 text-3xl font-semibold font-mono tabular-nums ${tone}`}>{value ?? 0}</p>
    </div>
  );
}

function getVisitAccent(_visitId: number) {
  return "border-border bg-muted/40";
}

export default function DoctorDashboard() {
  const {
    fromDate,
    toDate,
    setFromDate,
    setToDate,
    summary,
    checkedPatients,
    expandedVisitId,
    expandedVisitHistory,
    paginatedHistoryEntries,
    expandedVisitHistoryPage,
    totalHistoryPages,
    setExpandedVisitHistoryPage,
    visitGroupPage,
    totalVisitPages,
    paginatedVisitGroups,
    setVisitGroupPage,
    loadingSummary,
    loadingHistory,
    openPatientDetails,
    editVisit,
    softDeleteVisit,
    toggleVisitHistory,
  } = useDoctorDashboard();

  return (
    <div className="space-y-6 h-full">
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Doctor Overview
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Doctor Dashboard</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Track queue load, checked patients, and visit status history with the same workspace UI.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground font-semibold">
              From
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-foreground"
              />
            </label>
            <label className="text-sm text-muted-foreground font-semibold">
              To
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-foreground"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
          <SummaryCard
            label="Assigned"
            value={summary?.assigned_total}
            tone="text-foreground"
          />
          <SummaryCard
            label="Waiting"
            value={summary?.waiting_total}
            tone="text-warning-foreground"
          />
          <SummaryCard
            label="Checked"
            value={summary?.checked_total}
            tone="text-success"
          />
          <SummaryCard
            label="Other Progressed"
            value={summary?.other_progressed_total}
            tone="text-info"
          />
        </div>

        {loadingSummary && (
          <p className="mt-4 text-sm text-muted-foreground">Refreshing dashboard...</p>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6">
        <section className="min-h-[24rem] rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-foreground">Checked Patients</h3>
              <p className="text-sm text-muted-foreground">
                Visits that were marked `seen_by_doctor` in the selected date range.
              </p>
            </div>
            <span className="px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide">
              {checkedPatients.length} patients
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Clinic No</th>
                    <th className="px-4 py-3">Seen At</th>
                    <th className="px-4 py-3">Current Status</th>
                    <th className="px-4 py-3">History</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {checkedPatients.length > 0 ? (
                    checkedPatients.map((row) => (
                      <tr
                        key={row.visit_id}
                        className={`border-t border-border ${
                          expandedVisitId === row.visit_id ? "bg-accent" : ""
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="font-semibold text-foreground">{row.patient_name}</div>
                          <div className="text-xs text-muted-foreground">
                            ID {row.patient_id} • {row.gender} • {row.age ?? "-"} yrs
                          </div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground font-mono tabular-nums">#{row.clinic_number ?? "-"}</td>
                        <td className="px-4 py-4 text-muted-foreground">{row.seen_at || row.checked_at}</td>
                        <td className="px-4 py-4 text-muted-foreground">{row.current_status}</td>
                        <td className="px-4 py-4 text-muted-foreground font-mono tabular-nums">{row.history_count}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void toggleVisitHistory(row.visit_id);
                              }}
                              className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
                            >
                              {expandedVisitId === row.visit_id ? "Collapse" : "Journey"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openPatientDetails(row)}
                              className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void editVisit(row);
                              }}
                              className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => softDeleteVisit(row)}
                              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/15"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        No checked patients found for this date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="min-h-[24rem] rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">Visit Status History</h3>
            <p className="text-sm text-muted-foreground">
              Compact, visit-wise patient journeys. Use ← / → keys to switch pages.
            </p>
          </div>

          {loadingHistory && (
            <p className="text-sm text-muted-foreground">Loading status history...</p>
          )}

          {!loadingHistory && checkedPatients.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Select a checked patient to inspect visit status history.
            </p>
          )}

          {checkedPatients.length > 0 && (
            <div className="space-y-3">
              {paginatedVisitGroups.map((visitRow) => {
                const isExpanded = expandedVisitId === visitRow.visit_id;
                return (
                  <div
                    key={visitRow.visit_id}
                    className={`rounded-md border px-3 py-3 ${getVisitAccent(visitRow.visit_id)}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        void toggleVisitHistory(visitRow.visit_id);
                      }}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {visitRow.patient_name}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Visit #{visitRow.clinic_number ?? visitRow.visit_id} • {visitRow.visit_type} • {visitRow.seen_at}
                          </div>
                        </div>
                        <div className="rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {isExpanded ? "Hide" : "Expand"}
                        </div>
                      </div>
                    </button>

                    {isExpanded && expandedVisitHistory && (
                      <div className="mt-3 space-y-2">
                        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                          Last checked by: {expandedVisitHistory.visit.last_checked_by_doctor_name ?? "-"}
                        </div>

                        {paginatedHistoryEntries.length > 0 ? (
                          <div className="space-y-2">
                            {paginatedHistoryEntries.map((entry) => (
                              <div
                                key={entry.visit_status_id}
                                className="rounded-md border border-border bg-card px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-foreground">{entry.status}</span>
                                  <span className="text-[11px] text-muted-foreground">{entry.updated_at}</span>
                                </div>
                                <div className="mt-1 text-[11px] text-muted-foreground">
                                  Doctor: {entry.updated_by_doctor_name ?? "-"} • Staff: {entry.updated_by_staff_name ?? "-"}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-md border border-dashed border-border bg-card px-3 py-3 text-xs text-muted-foreground">
                            No status history found for this visit.
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => setExpandedVisitHistoryPage(expandedVisitHistoryPage - 1)}
                            disabled={expandedVisitHistoryPage <= 1}
                            className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground disabled:opacity-40 hover:bg-accent"
                          >
                            ← Prev
                          </button>
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            History page {expandedVisitHistoryPage} / {totalHistoryPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedVisitHistoryPage(expandedVisitHistoryPage + 1)}
                            disabled={expandedVisitHistoryPage >= totalHistoryPages}
                            className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground disabled:opacity-40 hover:bg-accent"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {totalVisitPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setVisitGroupPage((current) => Math.max(1, current - 1))}
                    disabled={visitGroupPage <= 1}
                    className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground disabled:opacity-40 hover:bg-accent"
                  >
                    ← Visits
                  </button>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Visit page {visitGroupPage} / {totalVisitPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVisitGroupPage((current) => Math.min(totalVisitPages, current + 1))}
                    disabled={visitGroupPage >= totalVisitPages}
                    className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground disabled:opacity-40 hover:bg-accent"
                  >
                    Visits →
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
