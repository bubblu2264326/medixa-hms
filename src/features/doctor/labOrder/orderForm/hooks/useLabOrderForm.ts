"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";

import { usePatient } from "@/contexts/PatientIdContext";
import { useDoctorWorkspace } from "@/src/features/doctor/workspace/DoctorWorkspaceContext";

import * as api from "../api";
import { LabOrderFormValues, LabTest } from "../types";

function buildLabDraftRow(test: LabTest) {
  return {
    test_id: test.test_id,
    test_name: test.test_name,
    category: test.category,
    price: test.price,
  };
}

export function useLabOrderForm() {
  const { patientId, selectedVisitId } = usePatient();
  const { selectedVisitStatus, staleVisitSelection } = useDoctorWorkspace();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, watch, reset } = useForm<LabOrderFormValues>({
    defaultValues: { tests: [] },
  });

  const { fields, append, remove, replace: replaceFieldArray } = useFieldArray({
    control,
    name: "tests",
  });

  const watchTests = watch("tests");

  useEffect(() => {
    async function fetchTests() {
      try {
        const data = await api.fetchAllLabTests();
        setTests(data);
      } catch (err: unknown) {
        console.error(err);
        toast.error("Failed to fetch lab tests");
      }
    }
    fetchTests();
  }, []);

  useEffect(() => {
    reset({ tests: [] });
    setSearchQuery("");
  }, [patientId, reset]);

  const filteredTests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return tests.filter((test) =>
      [test.test_name, test.category, String(test.price)].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [searchQuery, tests]);

  const selectedTestIds = useMemo(
    () => new Set(watchTests.map((item) => String(item.test_id))),
    [watchTests]
  );

  const addTest = (test: LabTest) => {
    if (selectedTestIds.has(String(test.test_id))) {
      toast.error("Test already added to this order");
      return;
    }

    append(buildLabDraftRow(test));
    setSearchQuery("");
  };

  const clearTests = () => {
    replaceFieldArray([]);
    setSearchQuery("");
  };

  const isDraftValid = watchTests.length > 0 && watchTests.every((test) => Boolean(test.test_id));
  const isVisitActionable =
    Boolean(selectedVisitId) &&
    !staleVisitSelection &&
    (!selectedVisitStatus ||
      !["completed", "discharged"].includes(selectedVisitStatus));

  const onSubmit = async (data: LabOrderFormValues) => {
    if (!patientId || !selectedVisitId || !isVisitActionable) {
      toast.error("Select a patient visit before ordering tests");
      return;
    }

    try {
      setIsSubmitting(true);

      const testDetails = data.tests.map((item) => ({
        test_id: item.test_id,
        urgency: "Routine",
      }));

      await api.createLabOrder(patientId, selectedVisitId, testDetails);
      toast.success("Lab order created successfully!");
      clearTests();
      window.dispatchEvent(new Event("refresh-queue"));
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to create lab order";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    handleSubmit,
    searchQuery,
    setSearchQuery,
    filteredTests,
    fields,
    watchTests,
    addTest,
    remove,
    clearTests,
    isDraftValid,
    isVisitActionable,
    selectedTestIds,
    onSubmit,
    isSubmitting,
  };
}
