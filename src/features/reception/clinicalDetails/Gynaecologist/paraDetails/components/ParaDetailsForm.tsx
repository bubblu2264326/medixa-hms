"use client";

import { useFieldArray } from "react-hook-form";
import { Inbox, Plus, Trash2, ArrowRight } from "lucide-react";
import { useParaDetails } from "../hooks/useParaDetails";

export default function ParaDetailsForm() {
  const { methods, control, addPara, updateParaData, obstetricHistoryId, hasExistingRecords, statusMessage } = useParaDetails();
  const { register, handleSubmit } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: "para" });

  const addNewPara = () => {
    append({
      obstetric_history_id: obstetricHistoryId || "",
      para_number: fields.length + 1,
      birth_year: "",
      birth_month: "",
      gender: "Male",
      delivery_type: "Normal",
      alive: "true",
      birth_weight_grams: "",
      complications: "",
      notes: "",
      gestational_age_weeks: "",
    });
  };

  return (
    <div className="w-full flex flex-col">
      {/* Action Header */}
      {/* Premium Status Header */}
      <div className="flex items-center justify-between mb-8 gap-4">
        <div className={`flex-1 flex items-center justify-between gap-4 px-5 py-3 rounded-md border transition-all ${
          hasExistingRecords
            ? "border-primary/20 bg-primary/10 text-primary shadow-sm"
            : "border-border bg-muted text-muted-foreground shadow-sm"
        }`}>
          <div className="flex items-center gap-3">
            <div className="relative">
               <div className={`size-2.5 rounded-full ${hasExistingRecords ? "bg-primary" : "bg-muted-foreground/40"}`}  />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wide leading-none mb-0.5">
                {hasExistingRecords ? "Pregnancy Ledger Synced" : "Multi-Record Initialization"}
              </span>
              <span className="text-[11px] font-medium opacity-80 leading-none">
                {statusMessage}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-md border text-[9px] font-semibold uppercase tracking-wide ${
              hasExistingRecords
                ? "bg-primary/10 border-primary/20 text-primary"
                : "bg-card border-border text-muted-foreground"
            }`}>
              {hasExistingRecords ? "Batch Update Active" : "Fresh Batch Entry"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={addNewPara}
          className="h-11 px-6 bg-primary text-primary-foreground rounded-md text-[10px] font-semibold uppercase tracking-wide hover:bg-primary/90 transition-all shadow-sm active:scale-95 flex items-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add Pregnancy Record
        </button>
      </div>

      <div className="space-y-6 pb-20">
        {fields.map((field, index) => (
          <div key={field.id} className="relative bg-card border border-border rounded-lg p-6 shadow-sm group hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-3">
                <span className="size-6 bg-primary text-primary-foreground rounded-md flex items-center justify-center text-[10px] font-semibold font-mono tabular-nums shadow-sm">
                  {index + 1}
                </span>
                Para Record Details
              </h3>
              <button
                type="button"
                onClick={() => remove(index)}
                className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-destructive/20"
                aria-label="Remove record"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
              <InputField
                label="Birth Year"
                placeholder="Ex: 2020"
                {...register(`para.${index}.birth_year`)}
              />
              <InputField
                label="Birth Month"
                placeholder="Ex: June"
                {...register(`para.${index}.birth_month`)}
              />
              <InputField
                label="Gender"
                as="select"
                {...register(`para.${index}.gender`)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </InputField>
              <InputField
                label="Delivery Type"
                as="select"
                {...register(`para.${index}.delivery_type`)}
              >
                <option value="Normal">Normal</option>
                <option value="C-Section">C-Section</option>
                <option value="AssistedVD">Assisted Vd</option>
              </InputField>
              <InputField
                label="Status"
                as="select"
                {...register(`para.${index}.alive`)}
              >
                <option value="true">Alive</option>
                <option value="false">Not Alive</option>
              </InputField>
              <InputField
                label="Weight (g)"
                placeholder="Ex: 3200"
                {...register(`para.${index}.birth_weight_grams`)}
              />
              <InputField
                label="Gest. Age (w)"
                placeholder="Ex: 38"
                {...register(`para.${index}.gestational_age_weeks`)}
              />
              <InputField
                label="Complications"
                placeholder="Specify if any"
                {...register(`para.${index}.complications`)}
              />
              <div className="md:col-span-full">
                <InputField
                  label="Clinical Notes"
                  as="textarea"
                  placeholder="Notes, congenital issues, etc..."
                  {...register(`para.${index}.notes`)}
                />
              </div>
            </div>
            <input {...register(`para.${index}.para_number`)} defaultValue={index + 1} type="hidden" />
          </div>
        ))}

        {fields.length === 0 && (
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border rounded-lg bg-muted text-muted-foreground">
            <Inbox className="h-10 w-10 mb-2 opacity-50" aria-hidden />
            <p className="text-[10px] font-semibold uppercase tracking-wide">No records added yet</p>
          </div>
        )}
      </div>

      {fields.length > 0 && (
         <div className="fixed bottom-10 right-10 z-50">
           <FormButton
             text={hasExistingRecords ? "Update All Records" : "Submit Pregnancy History"}
             variant="primary"
             onClick={handleSubmit(hasExistingRecords ? updateParaData : addPara)}
           />
         </div>
      )}
    </div>
  );
}

function InputField({ label, err, as = "input", children, placeholder, autoComplete = "off", ...rest }: any) {
  const Component = as;
  return (
    <div className="space-y-0.5 group">
      <label className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-wide ml-1 group-focus-within:text-primary transition-colors">
        {label}
      </label>
      <div className="relative">
        <Component
          placeholder={placeholder}
          autoComplete={autoComplete}
          rows={as === "textarea" ? 2 : undefined}
          className={`w-full ${as === "textarea" ? "py-2 min-h-[60px]" : "h-9"} px-3 bg-background border rounded-md text-[11px] font-medium transition-all outline-none resize-none
            ${err
              ? "border-destructive/30 bg-destructive/10 text-destructive placeholder:text-destructive/50"
              : "border-input text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-ring focus:ring-4 focus:ring-ring/10 shadow-sm"
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
      className={`h-11 px-8 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all active:scale-95 flex items-center gap-3 ${styles[variant]}`}
    >
      {text}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </button>
  );
}
