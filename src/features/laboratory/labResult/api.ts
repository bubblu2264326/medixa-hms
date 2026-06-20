import { CriticalAlert, ResultInput, Test, TestParameters } from "./types";


export async function fetchAllTests():Promise<Test[]>{
  const res=await fetch("/api/lab");
  if(!res.ok){
    throw new Error("Failed to get reponse form /api/lab");
  }
  return res.json();
}
//fetch parameters of slelcted test
export async function fetchTestParameters(test_id:number):Promise<TestParameters[]>{
  const res= await fetch("/api/lab/testParameters/"+test_id);
  if(!res.ok){
    throw new Error("Failed to fetch Parameters For Test"+test_id);
  }
  return res.json();
}

export type PostResultsResponse = {
  ok: boolean;
  entered?: number;
  critical_alerts?: CriticalAlert[];
  error?: string;
};

// POST results for a lab order. Returns critical_alerts surfaced by the server.
export async function postLabResults(
  orderId: number,
  results: ResultInput[]
): Promise<PostResultsResponse> {
  const res = await fetch("/api/lab/results", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId, results }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error || "Failed to enter results" };
  return { ok: true, entered: data.entered, critical_alerts: data.critical_alerts ?? [] };
}

// Pathologist sign-off (approve finalizes the order; reject records the review).
export async function verifyLabOrder(
  orderId: number,
  approvalStatus: "approved" | "rejected"
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/lab/results/verify", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId, approval_status: approvalStatus }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error || "Failed to verify results" };
  return { ok: true };
}
