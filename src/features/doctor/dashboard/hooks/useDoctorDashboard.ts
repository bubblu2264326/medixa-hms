"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { usePatient } from "@/contexts/PatientIdContext";
import * as api from "../api";
import {
  CheckedPatientRow,
  DashboardSummary,
  VisitHistoryResponse,
} from "../types";

function getToday() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function useDoctorDashboard() {
  const { setPatientVisit } = usePatient();
  const today = useMemo(() => getToday(), []);
  const VISITS_PER_PAGE = 4;
  const HISTORY_ENTRIES_PER_PAGE = 5;
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [checkedPatients, setCheckedPatients] = useState<CheckedPatientRow[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [expandedVisitId, setExpandedVisitId] = useState<number | null>(null);
  const [visitHistoryByVisitId, setVisitHistoryByVisitId] = useState<
    Record<number, VisitHistoryResponse | undefined>
  >({});
  const [visitHistoryPageByVisitId, setVisitHistoryPageByVisitId] = useState<
    Record<number, number>
  >({});
  const [visitGroupPage, setVisitGroupPage] = useState(1);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      setLoadingSummary(true);

      try {
        const range = { from: fromDate, to: toDate };
        const [summaryData, checkedData] = await Promise.all([
          api.fetchDashboardSummary(range),
          api.fetchCheckedPatients(range),
        ]);

        setSummary(summaryData);
        setCheckedPatients(checkedData);
        setSelectedVisitId((current) => {
          if (current && checkedData.some((row) => row.visit_id === current)) return current;
          return checkedData[0]?.visit_id ?? null;
        });
        setExpandedVisitId((current) => {
          if (current && checkedData.some((row) => row.visit_id === current)) return current;
          return checkedData[0]?.visit_id ?? null;
        });
        setVisitGroupPage(1);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load doctor dashboard");
      } finally {
        setLoadingSummary(false);
      }
    }

    loadDashboardData();

    const handleRefresh = () => loadDashboardData();
    window.addEventListener("refresh-queue", handleRefresh);
    return () => window.removeEventListener("refresh-queue", handleRefresh);
  }, [fromDate, toDate]);

  const totalVisitPages = Math.max(1, Math.ceil(checkedPatients.length / VISITS_PER_PAGE));
  const paginatedVisitGroups = useMemo(() => {
    const start = (visitGroupPage - 1) * VISITS_PER_PAGE;
    return checkedPatients.slice(start, start + VISITS_PER_PAGE);
  }, [checkedPatients, visitGroupPage]);

  useEffect(() => {
    if (visitGroupPage > totalVisitPages) {
      setVisitGroupPage(totalVisitPages);
    }
  }, [totalVisitPages, visitGroupPage]);

  async function ensureVisitHistoryLoaded(visitId: number) {
    if (visitHistoryByVisitId[visitId]) return;
    setLoadingHistory(true);
    try {
      const historyData = await api.fetchVisitHistory(visitId);
      setVisitHistoryByVisitId((current) => ({ ...current, [visitId]: historyData }));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load visit history");
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    if (!expandedVisitId) return;
    void ensureVisitHistoryLoaded(expandedVisitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedVisitId]);

  const expandedVisitHistory = expandedVisitId
    ? visitHistoryByVisitId[expandedVisitId] ?? null
    : null;

  const expandedVisitHistoryPage = expandedVisitId
    ? visitHistoryPageByVisitId[expandedVisitId] ?? 1
    : 1;

  const totalHistoryPages = expandedVisitHistory
    ? Math.max(
        1,
        Math.ceil(expandedVisitHistory.history.length / HISTORY_ENTRIES_PER_PAGE)
      )
    : 1;

  const paginatedHistoryEntries = expandedVisitHistory
    ? expandedVisitHistory.history.slice(
        (expandedVisitHistoryPage - 1) * HISTORY_ENTRIES_PER_PAGE,
        expandedVisitHistoryPage * HISTORY_ENTRIES_PER_PAGE
      )
    : [];

  function updateExpandedHistoryPage(nextPage: number) {
    if (!expandedVisitId) return;
    const clampedPage = Math.max(1, Math.min(nextPage, totalHistoryPages));
    setVisitHistoryPageByVisitId((current) => ({
      ...current,
      [expandedVisitId]: clampedPage,
    }));
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      if (expandedVisitId && totalHistoryPages > 1) {
        event.preventDefault();
        if (event.key === "ArrowLeft") {
          updateExpandedHistoryPage(expandedVisitHistoryPage - 1);
        } else {
          updateExpandedHistoryPage(expandedVisitHistoryPage + 1);
        }
        return;
      }

      if (totalVisitPages > 1) {
        event.preventDefault();
        setVisitGroupPage((current) => {
          if (event.key === "ArrowLeft") return Math.max(1, current - 1);
          return Math.min(totalVisitPages, current + 1);
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedVisitId, expandedVisitHistoryPage, totalHistoryPages, totalVisitPages]);

  function openPatientDetails(row: CheckedPatientRow) {
    setPatientVisit(String(row.patient_id), String(row.visit_id));
    window.dispatchEvent(
      new CustomEvent("switch-doctor-tab", {
        detail: { tab: "patientDetails" },
      })
    );
  }

  async function editVisit(row: CheckedPatientRow) {
    try {
      await api.reopenDoctorVisitForEdit(row.visit_id);
      setCheckedPatients((current) =>
        current.map((item) =>
          item.visit_id === row.visit_id ? { ...item, current_status: "waiting" } : item
        )
      );
      setSelectedVisitId(row.visit_id);
      window.dispatchEvent(new Event("refresh-queue"));
      openPatientDetails(row);
      toast.success(`Visit #${row.visit_id} reopened for editing`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to reopen visit");
    }
  }

  async function softDeleteVisit(row: CheckedPatientRow) {
    try {
      await api.softDeleteDoctorVisit(row.visit_id);
      setCheckedPatients((current) => current.filter((item) => item.visit_id !== row.visit_id));
      setVisitHistoryByVisitId((current) => {
        const next = { ...current };
        delete next[row.visit_id];
        return next;
      });
      if (selectedVisitId === row.visit_id) {
        setSelectedVisitId(null);
      }
      if (expandedVisitId === row.visit_id) {
        setExpandedVisitId(null);
      }
      window.dispatchEvent(new Event("refresh-queue"));
      toast.success(`Visit #${row.visit_id} soft deleted`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to delete visit");
    }
  }

  async function toggleVisitHistory(visitId: number) {
    if (expandedVisitId === visitId) {
      setExpandedVisitId(null);
      return;
    }
    setExpandedVisitId(visitId);
    setSelectedVisitId(visitId);
    await ensureVisitHistoryLoaded(visitId);
  }

  return {
    fromDate,
    toDate,
    setFromDate,
    setToDate,
    summary,
    checkedPatients,
    selectedVisitId,
    setSelectedVisitId,
    expandedVisitId,
    expandedVisitHistory,
    paginatedHistoryEntries,
    expandedVisitHistoryPage,
    totalHistoryPages,
    setExpandedVisitHistoryPage: updateExpandedHistoryPage,
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
  };
}
