"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { fetchQueue, deleteVisit } from "../api";
import { QueueItem } from "../types";

export function useQueue(queueEndpoint = "/api/queue", allowDelete = true) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [filtered, setFiltered] = useState<QueueItem[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<"ALL" | "OPD" | "Emergency">("ALL");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const queueRef = useRef<QueueItem[]>([]);
  const inFlightRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const errorToastVisibleRef = useRef(false);

  const loadQueue = useCallback(async () => {
    if (inFlightRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    inFlightRef.current = true;
    const nextRequestId = requestIdRef.current + 1;
    requestIdRef.current = nextRequestId;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(queueRef.current.length === 0);

    try {
      const data = await fetchQueue(queueEndpoint, { signal: abortController.signal });

      if (requestIdRef.current !== nextRequestId) {
        return;
      }

      queueRef.current = data;
      setQueue(data);
      setErrorMessage(null);
      setIsStale(false);
      errorToastVisibleRef.current = false;
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return;
      }

      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to load queue");
      setIsStale(queueRef.current.length > 0);

      if (!errorToastVisibleRef.current) {
        toast.error("Failed to load queue");
        errorToastVisibleRef.current = true;
      }
    } finally {
      if (requestIdRef.current === nextRequestId) {
        setLoading(false);
      }

      inFlightRef.current = false;
      abortControllerRef.current = null;

      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        void loadQueue();
      }
    }
  }, [queueEndpoint]);

  useEffect(() => {
    void loadQueue();

    const interval = setInterval(() => {
      void loadQueue();
    }, 45000);

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    const streamEndpoint = `${queueEndpoint.replace(/\/$/, "")}/stream`;

    const connectToStream = () => {
      if (disposed || typeof EventSource === "undefined") {
        return;
      }

      const source = new EventSource(streamEndpoint);
      eventSourceRef.current = source;

      source.addEventListener("invalidate", () => {
        void loadQueue();
      });

      source.onerror = () => {
        source.close();

        if (eventSourceRef.current === source) {
          eventSourceRef.current = null;
        }

        if (!disposed) {
          reconnectTimer = setTimeout(connectToStream, 5000);
        }
      };
    };

    connectToStream();

    const handleRefresh = () => {
      void loadQueue();
    };
    window.addEventListener("refresh-queue", handleRefresh);

    return () => {
      clearInterval(interval);
      disposed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      abortControllerRef.current?.abort();
      eventSourceRef.current?.close();
      window.removeEventListener("refresh-queue", handleRefresh);
    };
  }, [loadQueue, queueEndpoint]);

  useEffect(() => {
    const scopedQueue =
      selectedQueue === "ALL" ? queue : queue.filter((item) => item.visit_type === selectedQueue);

    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      setFiltered(scopedQueue);
      return;
    }

    setFiltered(
      scopedQueue.filter((item) =>
        [
          item.patient_name,
          String(item.clinic_number ?? ""),
          String(item.patient_id ?? ""),
          String(item.visit_id ?? ""),
        ].some((value) => value.toLowerCase().includes(normalized))
      )
    );
  }, [queue, searchTerm, selectedQueue]);

  function filterByName(name: string) {
    setSearchTerm(name);
  }

  function safeRemoveVisit(visitId: string | number) {
    setQueue((prev) => {
      const nextQueue = prev.filter((item) => String(item.visit_id) !== String(visitId));
      queueRef.current = nextQueue;
      return nextQueue;
    });
  }

  async function handleDelete(visitId: string | number) {
    if (!allowDelete) return;

    try {
      await deleteVisit(String(visitId));
      safeRemoveVisit(visitId);
      toast.success(`Deleted visit #${visitId}`);
    } catch {
      toast.error("Failed to delete visit");
    }
  }

  return {
    allQueue: queue,
    queue: filtered,
    loading,
    selectedQueue,
    setSelectedQueue,
    filterByName,
    deleteVisit: handleDelete,
    refreshQueue: loadQueue,
    allowDelete,
    errorMessage,
    isStale,
  };
}
