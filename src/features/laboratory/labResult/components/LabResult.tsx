"use client";
import { useLabResults } from "../hooks/useLabResults";
import { ActiveOrder, TestParameters } from "../types";
import { Label } from "@/src/components/ui/Label";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { AlertTriangle } from "lucide-react";

// Result entry is driven by a pending lab order. Rendered standalone (no order)
// it prompts the technician to pick one from the Lab Orders worklist.
export default function LabResult({
  order = null,
  onDone,
}: {
  order?: ActiveOrder | null;
  onDone?: () => void;
}) {
  const {
    testParameters,
    values,
    setResultValue,
    setResultNotes,
    loading,
    error,
    submitting,
    verifying,
    criticalAlerts,
    saved,
    verified,
    saveTestResults,
    verifyOrder,
  } = useLabResults(order);

  if (!order) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Select a pending order from the <strong>Lab Orders</strong> tab and click
        <strong> Enter Results</strong>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Enter Results{order.testName ? ` — ${order.testName}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground">
            Order #{order.orderId}
            {order.patientName ? ` • ${order.patientName}` : ""}
          </p>
        </div>
        {onDone && (
          <Button variant="ghost" onClick={onDone}>
            Close
          </Button>
        )}
      </div>

      {/* Critical-value alert banner */}
      {criticalAlerts.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
          <p className="flex items-center gap-1.5 font-semibold text-sm"><AlertTriangle className="h-4 w-4" aria-hidden /> Critical values</p>
          <ul className="mt-1 list-disc list-inside text-sm">
            {criticalAlerts.map((c, i) => (
              <li key={i}>
                <strong>{c.parameter}</strong>: {c.value}
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <p className="text-center p-8 text-muted-foreground">Loading parameters…</p>
      ) : error ? (
        <p className="text-center p-8 text-destructive">{error}</p>
      ) : testParameters.length === 0 ? (
        <p className="text-center p-8 text-muted-foreground">No parameters configured for this test.</p>
      ) : (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testParameters.map((parameter: TestParameters) => (
              <div key={parameter.parameter_id} className="space-y-1">
                <Label>
                  {parameter.parameter_name}
                  {parameter.unit ? ` (${parameter.unit})` : ""}
                  {parameter.is_critical ? <span className="text-destructive"> *critical</span> : null}
                </Label>
                <Input
                  type={parameter.input_type || "text"}
                  placeholder={
                    parameter.reference_range_min != null && parameter.reference_range_max != null
                      ? `Ref: ${parameter.reference_range_min}–${parameter.reference_range_max}`
                      : parameter.reference_value_text || parameter.parameter_name
                  }
                  value={values[parameter.parameter_id]?.result_value ?? ""}
                  onChange={(e) => setResultValue(parameter.parameter_id, e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Technician notes (optional)"
                  value={values[parameter.parameter_id]?.technician_notes ?? ""}
                  onChange={(e) => setResultNotes(parameter.parameter_id, e.target.value)}
                  className="text-xs"
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={saveTestResults} isLoading={submitting} disabled={loading || testParameters.length === 0}>
          {saved ? "Re-save Results" : "Submit Results"}
        </Button>

        {/* Verify & sign-off becomes available once results are entered. */}
        <Button
          variant="primary"
          onClick={() => verifyOrder("approved")}
          isLoading={verifying}
          disabled={!saved || verified}
        >
          Verify &amp; Sign-off
        </Button>
        <Button
          variant="destructive"
          onClick={() => verifyOrder("rejected")}
          isLoading={verifying}
          disabled={!saved || verified}
        >
          Reject
        </Button>

        {verified && <span className="text-sm font-semibold text-success">Sign-off recorded.</span>}
      </div>
    </div>
  );
}
