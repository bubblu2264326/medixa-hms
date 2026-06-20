// features/reception/patientRegistration/obstetricHistory/api.ts

import { ParaDetailsFormType } from "./types";

export async function getObstetricHistoryId(patientId: string | null) {
  const res = await fetch(`/api/clinicalDetails/gynaecologist/obstetric/${patientId}`);
  if (res.status === 404) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch obstetric history");
  return data;
}

export async function getPara(obstetric_history_id: string) {
  const res = await fetch(`/api/clinicalDetails/gynaecologist/para/${obstetric_history_id}`);
  if (res.status === 404) return [];
  const data = await res.json();
  if (!res.ok) throw new Error("Failed to fetch para details");
  return Array.isArray(data) ? data : [data];
}

export async function postPara(formData: ParaDetailsFormType) {
  const res = await fetch("/api/clinicalDetails/gynaecologist/para", {
    method: "POST",
    body: JSON.stringify(formData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to post para details");
  return data;
}

export async function updatePara(formData: ParaDetailsFormType) {
  const res = await fetch("/api/clinicalDetails/gynaecologist/para", {
    method: "PATCH",
    body: JSON.stringify(formData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update para details");
  return data;
}
