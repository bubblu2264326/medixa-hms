"use client";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ActiveOrder, CriticalAlert, ResultInput, TestParameters } from "../types";
import { fetchTestParameters, postLabResults, verifyLabOrder } from "../api";

type ValueEntry = { result_value: string; technician_notes: string };

// Drives result entry for a single pending lab order. The parameter grid is
// loaded from the order's test_id; saveTestResults posts the entered values and
// surfaces any critical-value alerts; verifyOrder performs sign-off.
export function useLabResults(order: ActiveOrder | null) {
  const [testParameters, setTestParameters] = useState<TestParameters[]>([]);
  const [values, setValues] = useState<Record<number, ValueEntry>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([]);
  const [saved, setSaved] = useState<boolean>(false);
  const [verified, setVerified] = useState<boolean>(false);

  useEffect(() => {
    setValues({});
    setCriticalAlerts([]);
    setSaved(false);
    setVerified(false);
    setError(null);
    if (!order?.testId) {
      setTestParameters([]);
      return;
    }
    let active = true;
    setLoading(true);
    fetchTestParameters(order.testId)
      .then((rows) => {
        if (active) setTestParameters(rows);
      })
      .catch((err) => {
        console.error(err);
        if (active) setError("Failed to load test parameters");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [order?.testId, order?.orderId]);

  const setResultValue = useCallback((parameterId: number, result_value: string) => {
    setValues((prev) => ({
      ...prev,
      [parameterId]: { result_value, technician_notes: prev[parameterId]?.technician_notes ?? "" },
    }));
  }, []);

  const setResultNotes = useCallback((parameterId: number, technician_notes: string) => {
    setValues((prev) => ({
      ...prev,
      [parameterId]: { result_value: prev[parameterId]?.result_value ?? "", technician_notes },
    }));
  }, []);

  const saveTestResults = useCallback(async () => {
    if (!order?.orderId) return;
    const results: ResultInput[] = testParameters
      .map((p): ResultInput | null => {
        const entry = values[p.parameter_id];
        const result_value = (entry?.result_value ?? "").trim();
        if (result_value === "") return null;
        return {
          parameter_id: p.parameter_id,
          result_value,
          technician_notes: entry?.technician_notes?.trim() || undefined,
        };
      })
      .filter((r): r is ResultInput => r !== null);

    if (results.length === 0) {
      toast.error("Enter at least one result value");
      return;
    }

    setSubmitting(true);
    try {
      const res = await postLabResults(order.orderId, results);
      if (res.ok) {
        setCriticalAlerts(res.critical_alerts ?? []);
        setSaved(true);
        toast.success(`Saved ${res.entered ?? results.length} result(s)`);
      } else {
        toast.error(res.error || "Failed to enter results");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while saving results");
    } finally {
      setSubmitting(false);
    }
  }, [order?.orderId, testParameters, values]);

  const verifyOrder = useCallback(
    async (approvalStatus: "approved" | "rejected") => {
      if (!order?.orderId) return;
      setVerifying(true);
      try {
        const res = await verifyLabOrder(order.orderId, approvalStatus);
        if (res.ok) {
          setVerified(true);
          toast.success(approvalStatus === "approved" ? "Results signed off" : "Results rejected");
        } else {
          toast.error(res.error || "Failed to verify results");
        }
      } catch (err) {
        console.error(err);
        toast.error("Network error while verifying");
      } finally {
        setVerifying(false);
      }
    },
    [order?.orderId]
  );

  return {
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
  };
}
