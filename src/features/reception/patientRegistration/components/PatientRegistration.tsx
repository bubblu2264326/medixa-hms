"use client";
import { Pencil, UserPlus } from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePatient } from "@/contexts/PatientIdContext";
import { patientSchema, PatientFormData } from "../types";
import { usePatientRegistration } from "../hooks/usePatientRegistration";
import { composePatientName, formatCNIC, formatPhone, RELATION_TAGS, RelationTag, splitPatientName } from "../utils";
import { Input } from "@/src/components/ui/Input";
import { Label } from "@/src/components/ui/Label";

export default function PatientRegistrationForm() {
  const { register, handleSubmit, control, reset, formState: { errors }, setValue } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    mode: "onChange",
  });

  const {
    isEditMode, loadedPatientId,
    loadPatient, clearPatient, addPatient, updateInfo,
  } = usePatientRegistration();

  const { patientId } = usePatient();
  const lastLoadedIdRef = useRef<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [relationTag, setRelationTag] = useState<RelationTag | "">("");

  // Load patient from context
  useEffect(() => {
    if (patientId && patientId !== lastLoadedIdRef.current) {
      loadPatient(patientId).then((data) => {
        if (data) {
          populateForm(data);
          lastLoadedIdRef.current = patientId;
        }
      });
    } else if (!patientId) {
      lastLoadedIdRef.current = null;
    }
  }, [patientId, reset, loadPatient]);

  /** Populate form with patient data — handles Controller fields explicitly */
  function populateForm(data: any) {
    const parsedName = splitPatientName(data.patient_name || "");
    setRelationTag(parsedName.tag || "");

    // Reset all register-based fields
    reset({
      patient_name: parsedName.baseName || "",
      age: data.age != null ? String(data.age) : "",
      gender: data.gender || "",
      cnic: data.cnic || "",
      contact_number: data.contact_number || "",
      address: data.address || "",
    });
    // Explicitly set Controller-managed fields (they sometimes don't pick up reset)
    setValue("cnic", data.cnic || "", { shouldValidate: true });
    setValue("contact_number", data.contact_number || "", { shouldValidate: true });
    // Focus the first form field
    setTimeout(() => firstFieldRef.current?.focus(), 100);
  }

  function handleNewPatient() {
    clearPatient();
    setRelationTag("");
    reset({ patient_name: "", age: "", gender: "", cnic: "", contact_number: "", address: "" });
    setValue("cnic", "");
    setValue("contact_number", "");
    lastLoadedIdRef.current = null;
    setTimeout(() => firstFieldRef.current?.focus(), 100);
  }

  async function onSubmit(data: PatientFormData) {
    const payload: PatientFormData = {
      ...data,
      patient_name: composePatientName(relationTag, data.patient_name),
    };

    if (isEditMode) {
      await updateInfo(payload);
    } else {
      const result = await addPatient(payload);
      if (result?.patient_id) {
        lastLoadedIdRef.current = String(result.patient_id);
      }
    }
  }

  /** Arrow Left/Right navigates between form fields, Up/Down reserved for value changes */
  function handleFormKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;

    const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement;

    // For text inputs and textareas: only navigate when cursor is at the boundary
    if ((active?.tagName === "INPUT" && (active as HTMLInputElement).type !== "number") || active?.tagName === "TEXTAREA") {
      const pos = active.selectionStart ?? 0;
      const len = (active.value || "").length;
      if (e.key === "ArrowLeft" && pos > 0) return;
      if (e.key === "ArrowRight" && pos < len) return;
    }

    const form = formRef.current;
    if (!form) return;

    const focusable = Array.from(
      form.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea')
    ).filter((el) => !el.hasAttribute("disabled"));

    const idx = focusable.indexOf(active);
    if (idx === -1) return;

    e.preventDefault();
    const next = e.key === "ArrowRight"
      ? focusable[(idx + 1) % focusable.length]
      : focusable[(idx - 1 + focusable.length) % focusable.length];
    next.focus();
  }

  return (
    <div className="w-full h-full p-2 space-y-4">
      {/* ═══════ REGISTRATION FORM ═══════ */}
      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={handleFormKeyDown}
        className="max-w-4xl mx-auto bg-card border border-border rounded-lg shadow-sm p-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {isEditMode ? "Update Patient Profile" : "Register New Patient"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditMode
                ? `Editing record for Patient ID: ${loadedPatientId}`
                : "Fill out the details below to create a new patient record"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isEditMode && (
              <span className="text-xs font-semibold font-mono tabular-nums bg-warning/15 text-warning-foreground px-3 py-1.5 rounded-md tracking-wide">
                ID: {loadedPatientId}
              </span>
            )}
            <div className={`h-12 w-12 rounded-md flex items-center justify-center p-2 ${isEditMode ? "bg-warning/15" : "bg-primary/10"}`}>
              {isEditMode ? <Pencil className="h-6 w-6 text-warning-foreground" aria-hidden /> : <UserPlus className="h-6 w-6 text-primary" aria-hidden />}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {/* Patient Name — first field, gets focus after patient load */}
          <div className="flex flex-col space-y-1.5">
            <div className="ml-1 flex items-center justify-between gap-3">
              <Label htmlFor="pname" className="text-foreground font-semibold">Patient Name</Label>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {RELATION_TAGS.map((tag) => {
                  const selected = relationTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setRelationTag((prev) => (prev === tag ? "" : tag))}
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold tracking-wide transition ${
                        selected
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/20 hover:text-primary"
                      }`}
                      aria-pressed={selected}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
            <Input
              id="pname"
              type="text"
              placeholder="Name / Reference Name"
              autoComplete="off"
              className="h-12 bg-background border-input focus:border-ring focus:ring-ring/20 rounded-md transition-all shadow-sm"
              {...register("patient_name")}
              ref={(el) => {
                register("patient_name").ref(el);
                (firstFieldRef as any).current = el;
              }}
            />
            {errors.patient_name?.message && <p className="text-destructive text-[10px] mt-1 ml-1">{errors.patient_name?.message}</p>}
          </div>

          {/* Age + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Age" id="age" type="number" {...register("age")} err={errors.age?.message} placeholder="Years" />
            <div className="flex flex-col space-y-1.5">
              <Label className="text-foreground font-semibold ml-1">Gender</Label>
              <select
                {...register("gender")}
                className="h-12 bg-background border border-input focus:ring-2 focus:ring-ring/20 rounded-md px-4 outline-none text-sm transition-all shadow-sm"
              >
                <option value="" hidden>Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {errors.gender?.message && <p className="text-destructive text-[10px] mt-1 ml-1">{errors.gender?.message}</p>}
            </div>
          </div>

          {/* ═══ CNIC — Masked Input ═══ */}
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="cnic" className="text-foreground font-semibold ml-1">CNIC / Identity No.</Label>
            <Controller
              name="cnic"
              control={control}
              render={({ field }) => (
                <div className="relative">
                  {/* Static mask overlay */}
                  <div className="absolute inset-0 h-12 flex items-center px-4 pointer-events-none font-mono tracking-[0.25em] text-muted-foreground/50 text-sm select-none">
                    {(() => {
                      const digits = (field.value || "").replace(/\D/g, "");
                      // Show mask only for unfilled positions
                      const filled = formatCNIC(field.value || "");
                      const mask = "_____-_______-_";
                      let result = "";
                      for (let i = 0; i < mask.length; i++) {
                        if (i < filled.length) {
                          result += "\u00A0"; // invisible space for filled chars
                        } else {
                          result += mask[i];
                        }
                      }
                      return result;
                    })()}
                  </div>
                  <input
                    id="cnic"
                    type="text"
                    autoComplete="off"
                    maxLength={15}
                    className="w-full h-12 bg-background border border-input focus:border-ring focus:ring-4 focus:ring-ring/10 px-4 rounded-md outline-none text-sm transition-all shadow-sm font-mono tracking-[0.25em]"
                    value={formatCNIC(field.value || "")}
                    onChange={(e) => {
                      const formatted = formatCNIC(e.target.value);
                      field.onChange(formatted);
                    }}
                  />
                </div>
              )}
            />
            {errors.cnic?.message && <p className="text-destructive text-[10px] mt-1 ml-1">{errors.cnic?.message}</p>}
          </div>

          {/* ═══ Contact Number — 03 prefix ═══ */}
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="contact" className="text-foreground font-semibold ml-1">Contact Number</Label>
            <Controller
              name="contact_number"
              control={control}
              render={({ field }) => (
                <div className="relative">
                  {/* Static 03 prefix badge */}
                  <div className="absolute left-0 top-0 h-12 flex items-center pl-4 pointer-events-none">
                    <span className="font-mono text-sm font-semibold text-primary tracking-wider">03</span>
                  </div>
                  <input
                    id="contact"
                    type="text"
                    autoComplete="off"
                    maxLength={12}
                    placeholder="XX-XXXXXXX"
                    className="w-full h-12 bg-background border border-input focus:border-ring focus:ring-4 focus:ring-ring/10 rounded-md outline-none text-sm transition-all shadow-sm font-mono tracking-wider pl-12"
                    value={(() => {
                      // Display without the "03" prefix since it's shown as a badge
                      const formatted = formatPhone(field.value || "");
                      return formatted.startsWith("03") ? formatted.slice(2) : formatted;
                    })()}
                    onChange={(e) => {
                      // Prepend 03 to whatever user types
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 9);
                      const full = "03" + raw;
                      const formatted = formatPhone(full);
                      field.onChange(formatted);
                    }}
                  />
                </div>
              )}
            />
            {errors.contact_number?.message && <p className="text-destructive text-[10px] mt-1 ml-1">{errors.contact_number?.message}</p>}
          </div>

          {/* Address */}
          <div className="flex flex-col col-span-2 space-y-1.5">
            <Label className="text-foreground font-semibold ml-1">Permanent Address</Label>
            <textarea
              id="address"
              {...register("address")}
              placeholder="House, Street, Area, City..."
              autoComplete="off"
              className="w-full bg-background border border-input focus:border-ring focus:ring-4 focus:ring-ring/10 p-4 rounded-md outline-none transition-all placeholder:text-muted-foreground text-sm shadow-sm h-24 resize-none"
            />
            {errors.address?.message && <p className="text-destructive text-[10px] mt-1 ml-1">{errors.address?.message}</p>}
          </div>

          {/* ═══════ ACTION BUTTONS ═══════ */}
          <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <button
              type="submit"
              className={`h-14 rounded-md font-semibold text-lg transition-all active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm`}
            >
              {isEditMode ? "Update Patient" : "Add Patient"}
            </button>
            <button
              type="button"
              onClick={handleNewPatient}
              className="h-14 rounded-md font-semibold text-lg transition-all bg-muted hover:bg-accent text-foreground"
            >
              New Patient
            </button>
            <button
              type="button"
              onClick={handleNewPatient}
              className="h-14 rounded-md font-semibold text-lg transition-all border border-border hover:bg-accent text-muted-foreground"
            >
              Reset Form
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// --- Reusable Components ---

function InputField({ label, id, err, type = "text", placeholder, autoComplete = "off", ...rest }: any) {
  return (
    <div className="flex flex-col space-y-1.5">
      <Label htmlFor={id} className="text-foreground font-semibold ml-1">{label}</Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-12 bg-background border-input focus:border-ring focus:ring-ring/20 rounded-md transition-all shadow-sm"
        {...rest}
      />
      {err && <p className="text-destructive text-[10px] mt-1 ml-1">{err}</p>}
    </div>
  );
}
