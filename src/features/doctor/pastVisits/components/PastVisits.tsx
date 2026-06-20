"use client";

import { usePastVisits } from "../hooks/usePastVisits";

export default function PastVisits() {
  const { visits, previousPrescriptions, previousLabOrders, loading } = usePastVisits();

  if (!visits.length && !previousPrescriptions.length && !previousLabOrders.length && !loading) {
    return (
      <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-border bg-card text-muted-foreground">
        Select a patient to review visit history and previous prescriptions.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Patient-wide history
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Patient Visit History</h2>
            <p className="text-sm text-muted-foreground">Historical visits across all treating doctors for this patient.</p>
          </div>
          {loading && <span className="text-sm text-muted-foreground">Loading...</span>}
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <tr key={visit.visit_id} className="border-t border-border">
                      <td className="px-4 py-4 text-foreground font-medium">{visit.visit_timestamp}</td>
                      <td className="px-4 py-4 text-foreground font-mono tabular-nums">#{visit.clinic_number ?? "-"}</td>
                      <td className="px-4 py-4 text-foreground">{visit.visit_type}</td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs font-semibold">
                          {visit.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{visit.reason || "-"}</td>
                      <td className="px-4 py-4 text-muted-foreground">{visit.doctor_name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No historical visits available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Patient-wide history
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Patient Prescription History</h2>
          <p className="text-sm text-muted-foreground">Persisted prescription lines from all treating doctors for this patient.</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                      className="border-t border-border"
                    >
                      <td className="px-4 py-4 text-foreground font-medium">{prescription.order_date}</td>
                      <td className="px-4 py-4 text-foreground">
                        {prescription.generic_name} / {prescription.brand_name}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {prescription.dosage || "-"}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{prescription.frequency}</td>
                      <td className="px-4 py-4 text-muted-foreground">{prescription.duration}</td>
                      <td className="px-4 py-4 text-muted-foreground font-mono tabular-nums">{prescription.prescribed_quantity}</td>
                      <td className="px-4 py-4 text-muted-foreground">{prescription.prescribed_by || "-"}</td>
                      <td className="px-4 py-4 text-muted-foreground">{prescription.instructions || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      No prescription history available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Patient-wide history
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Patient Lab History</h2>
          <p className="text-sm text-muted-foreground">
            Persisted lab requests from all treating doctors for this patient.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <tr key={order.order_id} className="border-t border-border">
                      <td className="px-4 py-4 text-foreground font-medium">{order.order_date}</td>
                      <td className="px-4 py-4 text-foreground">{order.test_name}</td>
                      <td className="px-4 py-4 text-muted-foreground">{order.category}</td>
                      <td className="px-4 py-4 text-muted-foreground">{order.urgency || "-"}</td>
                      <td className="px-4 py-4 text-muted-foreground">{order.status}</td>
                      <td className="px-4 py-4 text-muted-foreground">{order.ordered_by || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
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
