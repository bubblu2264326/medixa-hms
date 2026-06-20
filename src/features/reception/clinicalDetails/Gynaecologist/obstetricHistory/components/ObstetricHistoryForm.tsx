"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ObstetricHistorySchema, ObstetricHistoryFormData } from "../types";
import { useObstetricHistory } from "../hooks/useObstetricHistory";
import { usePatient } from "@/contexts/PatientIdContext";

export default function ObstetricHistoryForm() {
  const { patientId } = usePatient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ObstetricHistoryFormData>({
    resolver: zodResolver(ObstetricHistorySchema),
    mode: "onChange",
  });

  const { addInfo, updateInfo, hasRecord, statusMessage } = useObstetricHistory(patientId, reset);

  return (
    <div className="w-full">
      {/* Premium Status Header */}
      <div className={`mb-6 flex items-center justify-between gap-4 px-5 py-3 rounded-md border transition-all ${
        hasRecord
          ? "border-primary/20 bg-primary/10 text-primary shadow-sm"
          : "border-border bg-muted text-muted-foreground shadow-sm"
      }`}>
        <div className="flex items-center gap-3">
          <div className="relative">
             <div className={`size-2.5 rounded-full ${hasRecord ? "bg-primary" : "bg-muted-foreground/40"}`}  />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wide leading-none mb-0.5">
              {hasRecord ? "Obstetric Ledger Active" : "New History Pipeline"}
            </span>
            <span className="text-[11px] font-medium opacity-80 leading-none">
              {statusMessage}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-md border text-[9px] font-semibold uppercase tracking-wide ${
            hasRecord
              ? "bg-primary/10 border-primary/20 text-primary"
              : "bg-card border-border text-muted-foreground"
          }`}>
            {hasRecord ? "Sync Mode" : "Initial Entry"}
          </span>
        </div>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
        <InputField
          label="First Pregnancy?"
          id="is_first_pregnancy"
          as="select"
          err={errors.is_first_pregnancy?.message}
          {...register("is_first_pregnancy")}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </InputField>

        <InputField
          label="Years Married"
          placeholder="Ex: 5"
          err={errors.married_years?.message}
          {...register("married_years")}
        />

        <InputField
          label="Gravida (Pregnancies)"
          placeholder="Ex: 2"
          err={errors.gravida?.message}
          {...register("gravida")}
        />

        <InputField
          label="Para (Live Births)"
          placeholder="Ex: 1"
          err={errors.para?.message}
          {...register("para")}
        />

        <InputField
          label="LMP"
          type="date"
          err={errors.last_menstrual_cycle?.message}
          {...register("last_menstrual_cycle")}
        />

        <InputField
          label="Abortions"
          placeholder="Ex: 0"
          err={errors.abortions?.message}
          {...register("abortions")}
        />

        <InputField
          label="EDD"
          type="date"
          err={errors.edd?.message}
          {...register("edd")}
        />

        <div className="md:col-span-2 lg:col-span-2">
          <InputField
            label="Additional Notes"
            as="textarea"
            placeholder="Relevant medical history details..."
            err={errors.notes?.message}
            {...register("notes")}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3 flex items-center justify-end gap-3 pt-6 border-t border-border mt-2">
          <FormButton
            text="Reset"
            variant="ghost"
            onClick={() => reset()}
          />
          <FormButton
            text={hasRecord ? "Update History" : "Save Record"}
            variant="primary"
            onClick={handleSubmit(hasRecord ? updateInfo : addInfo)}
          />
        </div>
      </form>
    </div>
  );
}

function InputField({ label, id, err, as = "input", children, placeholder, autoComplete = "off", ...rest }: any) {
  const Component = as;
  return (
    <div className="space-y-1 group">
      <label htmlFor={id} className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide ml-1 group-focus-within:text-primary transition-colors">
        {label}
      </label>
      <div className="relative">
        <Component
          id={id}
          placeholder={placeholder}
          autoComplete={autoComplete}
          rows={as === "textarea" ? 2 : undefined}
          className={`w-full ${as === "textarea" ? "py-2.5 min-h-[80px]" : "h-10"} px-3 bg-muted border rounded-md text-xs font-medium transition-all outline-none resize-none
            ${err
              ? "border-destructive/30 bg-destructive/10 text-destructive placeholder:text-destructive/50"
              : "border-input text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-ring focus:ring-4 focus:ring-ring/10"
            }`}
          {...rest}
        >
          {children}
        </Component>
      </div>
      {err && <p className="text-[9px] font-semibold text-destructive ml-1.5 mt-0.5">{err}</p>}
    </div>
  );
}

function FormButton({ text, onClick, variant = "primary" }: { text: string; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" }) {
  const styles = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    secondary: "bg-card text-primary border border-primary/20 hover:bg-primary/10",
    ghost: "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-6 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all active:scale-95 ${styles[variant]}`}
    >
      {text}
    </button>
  );
}
