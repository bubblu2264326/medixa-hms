import { QueueItem } from "./types";

const DEFAULT_BASE_URL = "/api/queue";

type FetchQueueOptions = {
  signal?: AbortSignal;
};

export async function fetchQueue(
  baseUrl = DEFAULT_BASE_URL,
  options: FetchQueueOptions = {}
): Promise<QueueItem[]> {
  const res = await fetch(baseUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
    signal: options.signal,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "Failed to fetch queue";
    throw new Error(message);
  }

  if (!Array.isArray(data)) {
    throw new Error("Queue response was not an array");
  }

  return data as QueueItem[];
}

export async function deleteVisit(visitId: string): Promise<void> {
  const res = await fetch(`/api/visit`, {
    method: "DELETE",
    body: JSON.stringify({ visit_id: visitId }),
  });
  if (!res.ok) throw new Error("Failed to delete visit");
}
