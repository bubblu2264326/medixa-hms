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
    <div className="rounded-[1.75rem] border border-white/70 bg-white/70 px-5 py-4 shadow-lg shadow-slate-900/5">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className={`mt-3 text-3xl font-black ${tone}`}>{value ?? 0}</p>
    </div>
  );
}

function getVisitAccent(visitId: number) {
  const palette = [
    "border-emerald-200 bg-emerald-50/60",
    "border-sky-200 bg-sky-50/60",
    "border-amber-200 bg-amber-50/60",
    "border-rose-200 bg-rose-50/60",
    "border-violet-200 bg-violet-50/60",
  ];
  return palette[Math.abs(visitId) % palette.length];
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
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Doctor Overview
            </p>
            <h2 className="text-2xl font-black text-slate-800">Doctor Dashboard</h2>
            <p className="text-sm text-slate-500 mt-1">
              Track queue load, checked patients, and visit status history with the same workspace UI.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-500 font-semibold">
              From
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700"
              />
            </label>
            <label className="text-sm text-slate-500 font-semibold">
              To
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
          <SummaryCard
            label="Assigned"
            value={summary?.assigned_total}
            tone="text-slate-900"
          />
          <SummaryCard
            label="Waiting"
            value={summary?.waiting_total}
            tone="text-amber-600"
          />
          <SummaryCard
            label="Checked"
            value={summary?.checked_total}
            tone="text-emerald-600"
          />
          <SummaryCard
            label="Other Progressed"
            value={summary?.other_progressed_total}
            tone="text-sky-600"
          />
        </div>

        {loadingSummary && (
          <p className="mt-4 text-sm text-slate-400">Refreshing dashboard...</p>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6">
        <section className="min-h-[24rem] rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-black text-slate-800">Checked Patients</h3>
              <p className="text-sm text-slate-500">
                Visits that were marked `seen_by_doctor` in the selected date range.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-[0.2em]">
              {checkedPatients.length} patients
            </span>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50/90">
                  <tr className="text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
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
                        className={`border-t border-slate-100 ${
                          expandedVisitId === row.visit_id ? "bg-emerald-50/70" : ""
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-800">{row.patient_name}</div>
                          <div className="text-xs text-slate-500">
                            ID {row.patient_id} • {row.gender} • {row.age ?? "-"} yrs
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-600">#{row.clinic_number ?? "-"}</td>
                        <td className="px-4 py-4 text-slate-600">{row.seen_at || row.checked_at}</td>
                        <td className="px-4 py-4 text-slate-600">{row.current_status}</td>
                        <td className="px-4 py-4 text-slate-600">{row.history_count}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void toggleVisitHistory(row.visit_id);
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                            >
                              {expandedVisitId === row.visit_id ? "Collapse" : "Journey"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openPatientDetails(row)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void editVisit(row);
                              }}
                              className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => softDeleteVisit(row)}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        No checked patients found for this date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="min-h-[24rem] rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <div className="mb-4">
            <h3 className="text-xl font-black text-slate-800">Visit Status History</h3>
            <p className="text-sm text-slate-500">
              Compact, visit-wise patient journeys. Use ← / → keys to switch pages.
            </p>
          </div>

          {loadingHistory && (
            <p className="text-sm text-slate-400">Loading status history...</p>
          )}

          {!loadingHistory && checkedPatients.length === 0 && (
            <p className="text-sm text-slate-400">
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
                    className={`rounded-[1.1rem] border px-3 py-3 ${getVisitAccent(visitRow.visit_id)}`}
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
                          <div className="text-sm font-black text-slate-800">
                            {visitRow.patient_name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Visit #{visitRow.clinic_number ?? visitRow.visit_id} • {visitRow.visit_type} • {visitRow.seen_at}
                          </div>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                          {isExpanded ? "Hide" : "Expand"}
                        </div>
                      </div>
                    </button>

                    {isExpanded && expandedVisitHistory && (
                      <div className="mt-3 space-y-2">
                        <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-xs text-slate-600">
                          Last checked by: {expandedVisitHistory.visit.last_checked_by_doctor_name ?? "-"}
                        </div>

                        {paginatedHistoryEntries.length > 0 ? (
                          <div className="space-y-2">
                            {paginatedHistoryEntries.map((entry) => (
                              <div
                                key={entry.visit_status_id}
                                className="rounded-xl border border-white/80 bg-white px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-black text-slate-800">{entry.status}</span>
                                  <span className="text-[11px] text-slate-500">{entry.updated_at}</span>
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  Doctor: {entry.updated_by_doctor_name ?? "-"} • Staff: {entry.updated_by_staff_name ?? "-"}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 px-3 py-3 text-xs text-slate-500">
                            No status history found for this visit.
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => setExpandedVisitHistoryPage(expandedVisitHistoryPage - 1)}
                            disabled={expandedVisitHistoryPage <= 1}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40"
                          >
                            ← Prev
                          </button>
                          <span className="text-[11px] font-bold text-slate-500">
                            History page {expandedVisitHistoryPage} / {totalHistoryPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedVisitHistoryPage(expandedVisitHistoryPage + 1)}
                            disabled={expandedVisitHistoryPage >= totalHistoryPages}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40"
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
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40"
                  >
                    ← Visits
                  </button>
                  <span className="text-[11px] font-bold text-slate-500">
                    Visit page {visitGroupPage} / {totalVisitPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVisitGroupPage((current) => Math.min(totalVisitPages, current + 1))}
                    disabled={visitGroupPage >= totalVisitPages}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40"
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
