"use client";

import { usePastVisits } from "../hooks/usePastVisits";

export default function PastVisits() {
  const { visits, previousPrescriptions, previousLabOrders, loading } = usePastVisits();

  if (!visits.length && !previousPrescriptions.length && !previousLabOrders.length && !loading) {
    return (
      <div className="h-full flex items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white/60 text-slate-500">
        Select a patient to review visit history and previous prescriptions.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Patient-wide history
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-800">Patient Visit History</h2>
            <p className="text-sm text-slate-500">Historical visits across all treating doctors for this patient.</p>
          </div>
          {loading && <span className="text-sm text-slate-400">Loading...</span>}
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/90">
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <th className="px-4 py-3">Visit</th>
                  <th className="px-4 py-3">Clinic No</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Complaint</th>
                  <th className="px-4 py-3">Doctor</th>
                </tr>
              </thead>
              <tbody>
                {visits.length > 0 ? (
                  visits.map((visit) => (
                    <tr key={visit.visit_id} className="border-t border-slate-100">
                      <td className="px-4 py-4 text-slate-700 font-medium">{visit.visit_timestamp}</td>
                      <td className="px-4 py-4 text-slate-700">#{visit.clinic_number ?? "-"}</td>
                      <td className="px-4 py-4 text-slate-700">{visit.visit_type}</td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                          {visit.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{visit.reason || "-"}</td>
                      <td className="px-4 py-4 text-slate-600">{visit.doctor_name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                      No historical visits available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <div className="mb-4">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
            Patient-wide history
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-800">Patient Prescription History</h2>
          <p className="text-sm text-slate-500">Persisted prescription lines from all treating doctors for this patient.</p>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/90">
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Dose</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Prescribed By</th>
                  <th className="px-4 py-3">Instructions</th>
                </tr>
              </thead>
              <tbody>
                {previousPrescriptions.length > 0 ? (
                  previousPrescriptions.map((prescription) => (
                    <tr
                      key={`${prescription.prescription_id}-${prescription.order_date}-${prescription.brand_name}`}
                      className="border-t border-slate-100"
                    >
                      <td className="px-4 py-4 text-slate-700 font-medium">{prescription.order_date}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {prescription.generic_name} / {prescription.brand_name}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {prescription.dosage || "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{prescription.frequency}</td>
                      <td className="px-4 py-4 text-slate-600">{prescription.duration}</td>
                      <td className="px-4 py-4 text-slate-600">{prescription.prescribed_quantity}</td>
                      <td className="px-4 py-4 text-slate-600">{prescription.prescribed_by || "-"}</td>
                      <td className="px-4 py-4 text-slate-600">{prescription.instructions || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      No prescription history available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <div className="mb-4">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
            Patient-wide history
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-800">Patient Lab History</h2>
          <p className="text-sm text-slate-500">
            Persisted lab requests from all treating doctors for this patient.
          </p>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/90">
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Urgency</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ordered By</th>
                </tr>
              </thead>
              <tbody>
                {previousLabOrders.length > 0 ? (
                  previousLabOrders.map((order) => (
                    <tr key={order.order_id} className="border-t border-slate-100">
                      <td className="px-4 py-4 text-slate-700 font-medium">{order.order_date}</td>
                      <td className="px-4 py-4 text-slate-700">{order.test_name}</td>
                      <td className="px-4 py-4 text-slate-600">{order.category}</td>
                      <td className="px-4 py-4 text-slate-600">{order.urgency || "-"}</td>
                      <td className="px-4 py-4 text-slate-600">{order.status}</td>
                      <td className="px-4 py-4 text-slate-600">{order.ordered_by || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                      No lab order history available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
