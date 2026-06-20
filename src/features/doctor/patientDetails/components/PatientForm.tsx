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
    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground">
      <Icon size={14} className="text-muted-foreground" aria-hidden />
      <span className="font-semibold text-muted-foreground">{label}</span>
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
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-base font-semibold tracking-tight text-foreground">
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
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-semibold leading-6 text-foreground">{value}</div>
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
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
    <section className="mt-6 rounded-lg border border-border bg-card p-5">
      <details className="group" open={highSignal.length > 0}>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
              <HeartPulse size={18} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Women&apos;s Health
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                Reception intake summary
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                High-signal OB/GYN context captured during reception intake. Expand for more detail.
              </p>
            </div>
          </div>
          <span className="rounded-md border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {highSignal.length > 0 ? "Available" : "Recorded"}
          </span>
        </summary>

        {highSignal.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {highSignal.map((item) => (
              <span
                key={item}
                className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
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
      <div className="rounded-md border border-dashed border-border bg-muted/50 px-4 py-6 text-sm text-muted-foreground">
        No {title.toLowerCase()} intake recorded for this patient.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-muted/50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

const SEVERITY_TONE: Record<string, string> = {
  severe: "border-destructive/30 bg-destructive/10 text-destructive",
  moderate: "border-warning/50 bg-warning/15 text-warning-foreground",
  mild: "border-success/30 bg-success/10 text-success",
  unknown: "border-border bg-muted text-muted-foreground",
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
    <section className="mt-6 rounded-lg border border-destructive/20 bg-card p-5">
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-destructive/10 p-2 text-destructive">
          <AlertTriangle size={18} aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Known Allergies
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Active allergy register for this patient
          </h3>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {allergies.length > 0 ? (
          allergies.map((item) => (
            <div
              key={item.allergy_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/50 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold tracking-tight text-foreground">
                    {item.allergen}
                  </span>
                  <span
                    className={`rounded-md border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityTone(
                      item.severity
                    )}`}
                  >
                    {item.severity}
                  </span>
                </div>
                {item.reaction?.trim() && (
                  <div className="mt-1 text-sm text-muted-foreground">Reaction: {item.reaction}</div>
                )}
                {item.noted_at && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Noted {formatDateInTimezone(item.noted_at, DEFAULT_TIMEZONE)}
                  </div>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onRemove(item.allergy_id)}
                  disabled={isSaving}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-destructive/20 bg-destructive/10 text-destructive transition hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Remove allergy ${item.allergen}`}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
            No allergies recorded for this patient yet.
          </div>
        )}
      </div>

      {canEdit && (
        <div className="mt-4 rounded-md border border-border bg-muted/50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
              className="h-10 rounded-md px-4 font-semibold"
            >
              <Plus size={16} className="mr-1" aria-hidden />
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
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-card text-muted-foreground">
        Select a patient from your queue to review the chosen visit.
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        className={`h-full rounded-lg border border-border bg-card p-6 shadow-sm transition-opacity duration-200 xl:p-8 ${
          isLoading ? "opacity-70" : "opacity-100"
        }`}
      >
        {isLoading && (
          <div className="mb-4 flex items-center gap-3 rounded-md border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
            <Loader2 size={16} className="animate-spin" aria-hidden />
            <span aria-live="polite">Loading selected patient data...</span>
          </div>
        )}

        <div className="rounded-lg border border-border bg-muted/40 p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Patient Context Summary
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                  {patient?.patient_name}
                </h2>
                <span className="text-sm font-semibold text-muted-foreground">{patientLabel}</span>
                <span className="text-sm text-border">|</span>
                <span className="text-sm font-semibold text-muted-foreground font-mono tabular-nums">ID {patient?.patient_id}</span>
                <span className="text-sm text-border">|</span>
                <span className="text-sm font-semibold text-muted-foreground font-mono tabular-nums">
                  Visit #{visit?.clinic_number ?? visit?.visit_id}
                </span>
                <span
                  className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    visit?.visit_type === "Emergency"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-info/10 text-info"
                  }`}
                >
                  {visit?.visit_type ?? "Visit"}
                </span>
              </div>
              <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
                Reception intake distilled for the doctor: identity, current visit, vitals, and
                relevant women&apos;s health context before clinical action.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 xl:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {doctor?.doctor_name ?? "Doctor"}
                </span>
                {visit && (
                  <span
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                      isCancelled
                        ? "bg-destructive/10 text-destructive"
                        : isSeen
                          ? "bg-success text-success-foreground"
                          : "bg-warning/15 text-warning-foreground"
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
                  className="h-11 rounded-md px-5 font-semibold"
                >
                  {isSeen ? "Already Seen" : !isActionable ? "Visit Locked" : "Mark As Seen"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={reopenVisit}
                  disabled={!visit || isSaving || isCancelled || visit?.status === "waiting"}
                  className="h-11 rounded-md px-5 font-semibold"
                >
                  Reopen Encounter
                </Button>
                <Button
                  type="button"
                  onClick={cancelVisit}
                  disabled={!visit || isSaving || isCancelled || visit?.status === "dispensing"}
                  className="h-11 rounded-md border border-destructive/30 bg-destructive/10 px-5 font-semibold text-destructive hover:bg-destructive/15"
                >
                  Cancel Encounter
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={softDeleteVisit}
                  disabled={!visit || isSaving || !canSoftDeleteVisit}
                  className="h-11 rounded-md px-5 font-semibold"
                >
                  Soft Delete
                </Button>
              </div>
              {!canSoftDeleteVisit && capabilities?.lockReason && (
                <p className="max-w-xl text-xs font-semibold text-warning-foreground">
                  {capabilities.lockReason}
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-warning/50 bg-warning/15 px-4 py-3 text-sm text-warning-foreground">
            {error}
          </div>
        )}

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Identity
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
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
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-primary" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Active Visit
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  What is happening right now
                </h3>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-border bg-muted/50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Presenting Complaint
                </div>
                <div className="mt-2 text-sm font-semibold leading-6 text-foreground">
                  {encounterNote?.reception_complaint?.trim() ||
                    visit?.reason?.trim() ||
                    "No presenting complaint recorded yet."}
                </div>
              </div>
              <div className="rounded-md border border-border bg-muted/50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Visit Metadata
                </div>
                <div className="mt-2 text-sm font-semibold leading-6 text-foreground">
                  Doctor: {visit?.doctor_name || doctor?.doctor_name || "Unassigned"}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {visit?.visit_timestamp
                    ? `Logged ${formatVisitLabel(visit.visit_timestamp)}`
                    : "Current visit time unavailable."}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md border border-border bg-card px-2.5 py-1 font-semibold text-muted-foreground">
                    Clinic #{visit?.clinic_number ?? "-"}
                  </span>
                  <span className="rounded-md border border-border bg-card px-2.5 py-1 font-semibold text-muted-foreground">
                    {visit?.visit_type ?? "Visit type unavailable"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="visit-reason-note"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Doctor Intake Note
              </label>
              <textarea
                id="visit-reason-note"
                value={doctorNoteDraft}
                onChange={(event) => setDoctorNoteDraft(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-md border border-input bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                placeholder="Write the doctor encounter note without overwriting reception intake"
              />
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  onClick={saveDoctorNote}
                  disabled={!visit || isSaving || !isActionable}
                  className="h-11 rounded-md px-5 font-semibold"
                >
                  {isSaving ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-muted/50 p-5">
            <div className="flex items-center gap-2">
              <Stethoscope size={18} className="text-primary" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Vitals
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
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
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
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
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History size={18} className="text-primary" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Previous Visits
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                    Recent clinical context
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => switchTab("pastVisits")}
                className="text-sm font-semibold text-primary transition hover:text-primary/80"
              >
                View full history
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {recentVisits.length > 0 ? (
                recentVisits.map((pastVisit) => (
                  <article
                    key={pastVisit.visit_id}
                    className="rounded-md border border-border bg-muted/50 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-foreground">
                        {formatVisitLabel(pastVisit.visit_timestamp)}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="rounded-md border border-border bg-card px-2.5 py-1">
                          {pastVisit.visit_type}
                        </span>
                        <span className="rounded-md border border-border bg-card px-2.5 py-1">
                          {pastVisit.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-foreground">
                      {pastVisit.reason?.trim() || "No reason captured for this visit."}
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Clinic #{pastVisit.clinic_number ?? "-"} · {pastVisit.doctor_name}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
                  No previous visits are available for this doctor-patient context yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Pill size={18} className="text-primary" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Medication History
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  Recent prescriptions
                </h3>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recentPrescriptions.length > 0 ? (
                recentPrescriptions.map((item, index) => (
                  <article
                    key={`${item.prescription_id}-${item.order_date}-${index}`}
                    className="rounded-md border border-border bg-muted/50 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-foreground">{item.brand_name}</div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {item.order_date}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.generic_name}</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md border border-border bg-card px-2.5 py-1">
                        {item.dosage || "Dose not captured"}
                      </span>
                      <span className="rounded-md border border-border bg-card px-2.5 py-1">
                        {item.frequency}
                      </span>
                      <span className="rounded-md border border-border bg-card px-2.5 py-1">
                        {item.duration}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
                  No recent prescriptions are available yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} className="text-primary" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quick Actions
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
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
        <div className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-background/35" />
      )}
    </div>
  );
}
