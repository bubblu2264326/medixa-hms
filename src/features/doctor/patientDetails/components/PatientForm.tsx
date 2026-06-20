"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ClipboardList,
  ContactRound,
  FlaskConical,
  HeartPulse,
  History,
  Loader2,
  MapPin,
  NotebookTabs,
  Pill,
  Plus,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { DEFAULT_TIMEZONE, formatDateInTimezone } from "@/src/lib/timezone/client";
import type {
  AllergySeverity,
  CurrentPregnancySummary,
  MenstrualHistorySummary,
  ObstetricHistorySummary,
  PatientAllergy,
  WomenHealthSummary,
} from "../types";
import { ALLERGY_SEVERITIES } from "../types";
import { usePatientForm } from "../hooks/usePatientForm";
import { useDoctorWorkspace } from "../../workspace/DoctorWorkspaceContext";
import { StaleVisitNotice } from "../../workspace/StaleVisitNotice";

function formatVisitLabel(timestamp: string | undefined) {
  if (!timestamp) return "Date unavailable";

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function formatGenderAge(gender: string | null | undefined, age: string | number | null | undefined) {
  const genderText = gender?.trim() ? gender.trim() : "Unknown";
  const ageText = age != null && age !== "" ? String(age) : "?";
  return `${ageText}${genderText.charAt(0).toUpperCase()}`;
}

function formatValue(value: string | number | null | undefined) {
  return value != null && value !== "" ? String(value) : "Not recorded";
}

function hasValue(value: string | number | null | undefined) {
  return value != null && value !== "";
}

function isFemaleGender(gender: string | null | undefined) {
  return typeof gender === "string" && gender.trim().toLowerCase() === "female";
}

function IdentityChip({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number | null | undefined;
}) {
  if (!hasValue(value)) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
      <Icon size={14} className="text-slate-400" />
      <span className="font-bold text-slate-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-2 text-base font-black tracking-tight text-slate-900">
        {formatValue(value)}
      </div>
    </div>
  );
}

function SummaryField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (!hasValue(value)) return null;

  return (
    <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold leading-6 text-slate-700">{value}</div>
    </div>
  );
}

function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function WomenHealthPanel({
  summary,
  gender,
}: {
  summary: WomenHealthSummary | null | undefined;
  gender: string | null | undefined;
}) {
  if (!summary || !isFemaleGender(gender)) return null;

  const obstetric = summary.obstetricHistory;
  const pregnancy = summary.currentPregnancy;
  const menstrual = summary.menstrualHistory;
  const highSignal = [
    hasValue(obstetric?.gravida) ? `G${obstetric?.gravida}` : null,
    hasValue(obstetric?.para) ? `P${obstetric?.para}` : null,
    hasValue(obstetric?.abortions) ? `A${obstetric?.abortions}` : null,
    hasValue(obstetric?.edd) ? `EDD ${obstetric?.edd}` : null,
    hasValue(obstetric?.last_menstrual_cycle) ? `LMP ${obstetric?.last_menstrual_cycle}` : null,
    hasValue(pregnancy?.gestational_age_weeks)
      ? `${pregnancy?.gestational_age_weeks} weeks`
      : null,
    hasValue(pregnancy?.complications) ? pregnancy?.complications : null,
  ].filter(Boolean) as string[];

  return (
    <section className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5">
      <details className="group" open={highSignal.length > 0}>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-2xl bg-rose-50 p-2 text-rose-600">
              <HeartPulse size={18} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                Women&apos;s Health
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                Reception intake summary
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                High-signal OB/GYN context captured during reception intake. Expand for more detail.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            {highSignal.length > 0 ? "Available" : "Recorded"}
          </span>
        </summary>

        {highSignal.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {highSignal.map((item) => (
              <span
                key={item}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700"
              >
                {item}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <WomenHealthSection title="Obstetric" data={obstetric}>
            <SummaryField label="First Pregnancy" value={obstetric?.is_first_pregnancy} />
            <SummaryField label="Married Years" value={obstetric?.married_years} />
            <SummaryField label="Gravida" value={obstetric?.gravida} />
            <SummaryField label="Para" value={obstetric?.para} />
            <SummaryField label="Abortions" value={obstetric?.abortions} />
            <SummaryField label="EDD" value={obstetric?.edd} />
            <SummaryField label="Last Menstrual Cycle" value={obstetric?.last_menstrual_cycle} />
            <SummaryField label="Notes" value={obstetric?.notes} />
          </WomenHealthSection>

          <WomenHealthSection title="Current Pregnancy" data={pregnancy}>
            <SummaryField label="Multiple Pregnancy" value={pregnancy?.multiple_pregnancy} />
            <SummaryField label="Gestational Age" value={pregnancy?.gestational_age_weeks} />
            <SummaryField label="Fetal Heart Rate" value={pregnancy?.fetal_heart_rate_bpm} />
            <SummaryField label="Presentation" value={pregnancy?.presentation} />
            <SummaryField label="Placenta Position" value={pregnancy?.placenta_position} />
            <SummaryField label="Complications" value={pregnancy?.complications} />
            <SummaryField label="Ultrasound Findings" value={pregnancy?.ultrasound_findings} />
            <SummaryField label="Notes" value={pregnancy?.notes} />
          </WomenHealthSection>

          <WomenHealthSection title="Menstrual" data={menstrual}>
            <SummaryField label="Menarch Age" value={menstrual?.menarch_age} />
            <SummaryField label="Cycle Length" value={menstrual?.cycle_length_days} />
            <SummaryField label="Bleeding Days" value={menstrual?.bleeding_days} />
            <SummaryField label="Regularity" value={menstrual?.menstrual_regular} />
            <SummaryField label="Contraception History" value={menstrual?.contraception_history} />
            <SummaryField label="Gynecologic Surgeries" value={menstrual?.gynecologic_surgeries} />
            <SummaryField label="Medical Conditions" value={menstrual?.medical_conditions} />
            <SummaryField label="Menopause Status" value={menstrual?.menopause_status} />
            <SummaryField label="Notes" value={menstrual?.notes} />
          </WomenHealthSection>
        </div>
      </details>
    </section>
  );
}

function WomenHealthSection<T extends MenstrualHistorySummary | ObstetricHistorySummary | CurrentPregnancySummary>({
  title,
  data,
  children,
}: {
  title: string;
  data: T | null | undefined;
  children: React.ReactNode;
}) {
  if (!data) {
    return (
      <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-400">
        No {title.toLowerCase()} intake recorded for this patient.
      </div>
    );
  }

  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

const SEVERITY_TONE: Record<string, string> = {
  severe: "border-rose-200 bg-rose-50 text-rose-700",
  moderate: "border-amber-200 bg-amber-50 text-amber-700",
  mild: "border-emerald-200 bg-emerald-50 text-emerald-700",
  unknown: "border-slate-200 bg-slate-50 text-slate-600",
};

function severityTone(severity: string | null | undefined) {
  return SEVERITY_TONE[String(severity ?? "").toLowerCase()] ?? SEVERITY_TONE.unknown;
}

function AllergiesPanel({
  allergies = [],
  isSaving,
  canEdit,
  onAdd,
  onRemove,
}: {
  allergies?: PatientAllergy[];
  isSaving: boolean;
  canEdit: boolean;
  onAdd: (input: { allergen: string; severity: AllergySeverity; reaction?: string }) => Promise<boolean>;
  onRemove: (allergyId: number) => void;
}) {
  const [allergen, setAllergen] = useState("");
  const [severity, setSeverity] = useState<AllergySeverity>("unknown");
  const [reaction, setReaction] = useState("");

  const handleAdd = async () => {
    if (!allergen.trim()) return;
    const added = await onAdd({ allergen, severity, reaction });
    if (added) {
      setAllergen("");
      setSeverity("unknown");
      setReaction("");
    }
  };

  return (
    <section className="mt-6 rounded-[1.75rem] border border-rose-100 bg-white p-5">
      <div className="flex items-center gap-2">
        <div className="rounded-2xl bg-rose-50 p-2 text-rose-600">
          <AlertTriangle size={18} />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
            Known Allergies
          </p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
            Active allergy register for this patient
          </h3>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {allergies.length > 0 ? (
          allergies.map((item) => (
            <div
              key={item.allergy_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[1.1rem] border border-slate-200 bg-slate-50/70 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black tracking-tight text-slate-900">
                    {item.allergen}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${severityTone(
                      item.severity
                    )}`}
                  >
                    {item.severity}
                  </span>
                </div>
                {item.reaction?.trim() && (
                  <div className="mt-1 text-sm text-slate-600">Reaction: {item.reaction}</div>
                )}
                {item.noted_at && (
                  <div className="mt-1 text-xs text-slate-400">
                    Noted {formatDateInTimezone(item.noted_at, DEFAULT_TIMEZONE)}
                  </div>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onRemove(item.allergy_id)}
                  disabled={isSaving}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Remove allergy ${item.allergen}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-400">
            No allergies recorded for this patient yet.
          </div>
        )}
      </div>

      {canEdit && (
        <div className="mt-4 rounded-[1.35rem] border border-slate-200 bg-slate-50/60 p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Add Allergy
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)]">
            <Input
              value={allergen}
              onChange={(event) => setAllergen(event.target.value)}
              placeholder="Allergen (e.g. Penicillin)"
              aria-label="Allergen"
            />
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value as AllergySeverity)}
              aria-label="Severity"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {ALLERGY_SEVERITIES.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
            <Input
              value={reaction}
              onChange={(event) => setReaction(event.target.value)}
              placeholder="Reaction (optional)"
              aria-label="Reaction"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              onClick={handleAdd}
              disabled={isSaving || !allergen.trim()}
              className="h-10 rounded-xl px-4 font-bold"
            >
              <Plus size={16} className="mr-1" />
              {isSaving ? "Saving..." : "Add Allergy"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function PatientForm() {
  const {
    doctor,
    contextSummary,
    recentVisits,
    recentPrescriptions,
    allergies,
    doctorNoteDraft,
    setDoctorNoteDraft,
    isLoading,
    isSaving,
    isSavingAllergy,
    error,
    saveDoctorNote,
    addAllergy,
    removeAllergy,
    markVisitSeen,
    reopenVisit,
    cancelVisit,
    softDeleteVisit,
  } = usePatientForm();
  const { staleVisitSelection } = useDoctorWorkspace();

  const patient = contextSummary?.patient;
  const visit = contextSummary?.activeVisit;
  const encounterNote = contextSummary?.encounterNote;
  const capabilities = contextSummary?.capabilities;
  const vitals = contextSummary?.vitals;
  const womenHealthSummary = contextSummary?.womenHealthSummary;
  const isSeen = visit?.status === "seen_by_doctor";
  const isCancelled = visit?.status === "discharged";
  const isActionable = Boolean(capabilities?.canEditPrescriptions);
  const canSoftDeleteVisit = Boolean(capabilities?.canSoftDeleteVisit);
  const patientLabel = formatGenderAge(patient?.gender, patient?.age);

  const switchTab = (tab: "pharmacyOrder" | "labOrder" | "pastVisits") => {
    window.dispatchEvent(new CustomEvent("switch-doctor-tab", { detail: { tab } }));
  };

  if (staleVisitSelection) {
    return (
      <StaleVisitNotice
        title="Selected visit is stale"
        message={`${staleVisitSelection.message} The patient selection stays visible so you can confirm who was being reviewed.`}
      />
    );
  }

  if (!patient && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white/60 text-slate-500">
        Select a patient from your queue to review the chosen visit.
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        className={`h-full rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] transition-opacity duration-200 xl:p-8 ${
          isLoading ? "opacity-70" : "opacity-100"
        }`}
      >
        {isLoading && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <Loader2 size={16} className="animate-spin" />
            <span aria-live="polite">Loading selected patient data...</span>
          </div>
        )}

        <div className="rounded-[1.75rem] border border-emerald-100 bg-[linear-gradient(135deg,rgba(236,253,245,0.95),rgba(255,255,255,0.96))] p-5 shadow-[0_20px_50px_rgba(16,185,129,0.08)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
                Patient Context Summary
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="text-3xl font-black tracking-tight text-slate-950">
                  {patient?.patient_name}
                </h2>
                <span className="text-sm font-semibold text-slate-500">{patientLabel}</span>
                <span className="text-sm text-slate-300">|</span>
                <span className="text-sm font-semibold text-slate-600">ID {patient?.patient_id}</span>
                <span className="text-sm text-slate-300">|</span>
                <span className="text-sm font-semibold text-slate-600">
                  Visit #{visit?.clinic_number ?? visit?.visit_id}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                    visit?.visit_type === "Emergency"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {visit?.visit_type ?? "Visit"}
                </span>
              </div>
              <p className="mt-3 max-w-3xl text-sm text-slate-600">
                Reception intake distilled for the doctor: identity, current visit, vitals, and
                relevant women&apos;s health context before clinical action.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 xl:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {doctor?.doctor_name ?? "Doctor"}
                </span>
                {visit && (
                  <span
                    className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] ${
                      isCancelled
                        ? "bg-rose-100 text-rose-700"
                        : isSeen
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {isCancelled ? "Cancelled" : isSeen ? "Seen By Doctor" : "Waiting"}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={markVisitSeen}
                  disabled={!visit || isSaving || isSeen || !isActionable}
                  className="h-11 rounded-2xl px-5 font-bold"
                >
                  {isSeen ? "Already Seen" : !isActionable ? "Visit Locked" : "Mark As Seen"}
                </Button>
                <Button
                  type="button"
                  onClick={reopenVisit}
                  disabled={!visit || isSaving || isCancelled || visit?.status === "waiting"}
                  className="h-11 rounded-2xl border border-slate-300 bg-white px-5 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Reopen Encounter
                </Button>
                <Button
                  type="button"
                  onClick={cancelVisit}
                  disabled={!visit || isSaving || isCancelled || visit?.status === "dispensing"}
                  className="h-11 rounded-2xl border border-rose-300 bg-rose-50 px-5 font-bold text-rose-700 hover:bg-rose-100"
                >
                  Cancel Encounter
                </Button>
                <Button
                  type="button"
                  onClick={softDeleteVisit}
                  disabled={!visit || isSaving || !canSoftDeleteVisit}
                  className="h-11 rounded-2xl border border-slate-300 bg-white px-5 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Soft Delete
                </Button>
              </div>
              {!canSoftDeleteVisit && capabilities?.lockReason && (
                <p className="max-w-xl text-xs font-semibold text-amber-700">
                  {capabilities.lockReason}
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        <section className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                Identity
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                Core patient details from reception
              </h3>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <IdentityChip icon={NotebookTabs} label="CNIC" value={patient?.cnic} />
            <IdentityChip icon={ContactRound} label="Contact" value={patient?.contact_number} />
            <IdentityChip icon={MapPin} label="Address" value={patient?.address} />
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-emerald-600" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Active Visit
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  What is happening right now
                </h3>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Presenting Complaint
                </div>
                <div className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                  {encounterNote?.reception_complaint?.trim() ||
                    visit?.reason?.trim() ||
                    "No presenting complaint recorded yet."}
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Visit Metadata
                </div>
                <div className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                  Doctor: {visit?.doctor_name || doctor?.doctor_name || "Unassigned"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {visit?.visit_timestamp
                    ? `Logged ${formatVisitLabel(visit.visit_timestamp)}`
                    : "Current visit time unavailable."}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-600">
                    Clinic #{visit?.clinic_number ?? "-"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-600">
                    {visit?.visit_type ?? "Visit type unavailable"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="visit-reason-note"
                className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500"
              >
                Doctor Intake Note
              </label>
              <textarea
                id="visit-reason-note"
                value={doctorNoteDraft}
                onChange={(event) => setDoctorNoteDraft(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Write the doctor encounter note without overwriting reception intake"
              />
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  onClick={saveDoctorNote}
                  disabled={!visit || isSaving || !isActionable}
                  className="h-11 rounded-2xl px-5 font-bold"
                >
                  {isSaving ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-center gap-2">
              <Stethoscope size={18} className="text-emerald-600" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Vitals
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  Current-visit clinical snapshot
                </h3>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Blood Pressure" value={vitals?.blood_pressure} />
              <MetricCard label="Heart Rate" value={vitals?.heart_rate} />
              <MetricCard label="Temperature" value={vitals?.temperature} />
              <MetricCard label="Blood Group" value={vitals?.blood_group} />
              <MetricCard label="Weight" value={vitals?.weight} />
              <MetricCard label="Height" value={vitals?.height} />
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              These vitals are loaded by visit. Missing values stay non-blocking so the doctor still
              gets the rest of the context summary.
            </p>
          </section>
        </div>

        <WomenHealthPanel summary={womenHealthSummary} gender={patient?.gender} />

        <AllergiesPanel
          allergies={allergies}
          isSaving={isSavingAllergy}
          canEdit={Boolean(patient)}
          onAdd={addAllergy}
          onRemove={removeAllergy}
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History size={18} className="text-emerald-600" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Previous Visits
                  </p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                    Recent clinical context
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => switchTab("pastVisits")}
                className="text-sm font-bold text-emerald-700 transition hover:text-emerald-800"
              >
                View full history
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {recentVisits.length > 0 ? (
                recentVisits.map((pastVisit) => (
                  <article
                    key={pastVisit.visit_id}
                    className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-black text-slate-900">
                        {formatVisitLabel(pastVisit.visit_timestamp)}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          {pastVisit.visit_type}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          {pastVisit.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-slate-700">
                      {pastVisit.reason?.trim() || "No reason captured for this visit."}
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      Clinic #{pastVisit.clinic_number ?? "-"} · {pastVisit.doctor_name}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-400">
                  No previous visits are available for this doctor-patient context yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Pill size={18} className="text-emerald-600" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Medication History
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  Recent prescriptions
                </h3>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recentPrescriptions.length > 0 ? (
                recentPrescriptions.map((item, index) => (
                  <article
                    key={`${item.prescription_id}-${item.order_date}-${index}`}
                    className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-black text-slate-900">{item.brand_name}</div>
                      <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                        {item.order_date}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{item.generic_name}</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                        {item.dosage || "Dose not captured"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                        {item.frequency}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                        {item.duration}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-400">
                  No recent prescriptions are available yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} className="text-emerald-600" />
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                Quick Actions
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                Move into the next clinical step
              </h3>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <QuickAction label="Start Prescription" icon={Pill} onClick={() => switchTab("pharmacyOrder")} />
            <QuickAction label="Order Labs" icon={FlaskConical} onClick={() => switchTab("labOrder")} />
            <QuickAction label="Open Full History" icon={History} onClick={() => switchTab("pastVisits")} />
          </div>
        </section>
      </div>

      {isLoading && (
        <div className="pointer-events-none absolute inset-0 z-10 rounded-[2rem] bg-white/35 backdrop-blur-[1px]" />
      )}
    </div>
  );
}
