import { z } from "zod";

// Server-side validation for patient create/update.
// - gender values match the DB CHECK constraint (Male/Female/Other).
// - CNIC is optional (walk-ins) and only length-bounded here; uniqueness is
//   enforced by the DB partial index uq_patient_cnic.
// - empty strings are normalized to undefined so optional fields store NULL
//   rather than "" (and age "" no longer becomes NaN/0).

const emptyToUndef = (v: unknown) => (v === "" || v == null ? undefined : v);

export const patientCreateSchema = z.object({
  patient_name: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1, "patient_name is required").max(200)
  ),
  age: z.preprocess(emptyToUndef, z.coerce.number().int().min(0).max(150).optional()),
  gender: z.preprocess(emptyToUndef, z.enum(["Male", "Female", "Other"]).optional()),
  contact_number: z.preprocess(emptyToUndef, z.string().max(30).optional()),
  cnic: z.preprocess(emptyToUndef, z.string().max(20).optional()),
  address: z.preprocess(emptyToUndef, z.string().max(500).optional()),
});

export const patientUpdateSchema = patientCreateSchema.extend({
  patient_id: z.coerce.number().int().positive(),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;
