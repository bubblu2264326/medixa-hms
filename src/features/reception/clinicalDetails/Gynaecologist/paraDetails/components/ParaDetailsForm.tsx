"use client";

import { useFieldArray } from "react-hook-form";
import { Inbox } from "lucide-react";
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
        <div className={`flex-1 flex items-center justify-between gap-4 px-5 py-3 rounded-2xl border transition-all duration-500 ease-in-out ${
          hasExistingRecords 
            ? "border-emerald-200 bg-emerald-50/20 text-emerald-800 shadow-sm shadow-emerald-900/5" 
            : "border-slate-200 bg-slate-50/40 text-slate-600 shadow-sm"
        }`}>
          <div className="flex items-center gap-3">
            <div className="relative">
               <div className={`size-2.5 rounded-full ${hasExistingRecords ? "bg-emerald-500" : "bg-slate-300"}`}  />
               {hasExistingRecords && <div className="absolute inset-0 size-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-0.5">
                {hasExistingRecords ? "Pregnancy Ledger Synced" : "Multi-Record Initialization"}
              </span>
              <span className="text-[11px] font-bold opacity-80 leading-none">
                {statusMessage}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tighter ${
              hasExistingRecords 
                ? "bg-emerald-100/50 border-emerald-200 text-emerald-700" 
                : "bg-white border-slate-200 text-slate-500"
            }`}>
              {hasExistingRecords ? "Batch Update Active" : "Fresh Batch Entry"}
            </span>
          </div>
        </div>
        
        <button
          type="button"
          onClick={addNewPara}
          className="h-11 px-6 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center gap-2 shrink-0 group"
        >
          <span className="text-sm group-hover:rotate-90 transition-transform duration-300">+</span> 
          Add Pregnancy Record
        </button>
      </div>

      <div className="space-y-6 pb-20">
        {fields.map((field, index) => (
          <div key={field.id} className="relative bg-white/40 backdrop-blur-sm border border-slate-100 rounded-[1.5rem] p-6 shadow-sm group hover:shadow-md transition-all hover:bg-white/60">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100/50 pb-3">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="size-6 bg-slate-800 text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg shadow-slate-900/10">
                  {index + 1}
                </span>
                Para Record Details
              </h3>
              <button
                type="button"
                onClick={() => remove(index)}
                className="size-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-100"
              >
                🗑️
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
          <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30 text-slate-300">
            <Inbox className="h-10 w-10 mb-2 opacity-50" aria-hidden />
            <p className="text-[10px] font-black uppercase tracking-widest">No records added yet</p>
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
      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-emerald-600 transition-colors">
        {label}
      </label>
      <div className="relative">
        <Component
          placeholder={placeholder}
          autoComplete={autoComplete}
          rows={as === "textarea" ? 2 : undefined}
          className={`w-full ${as === "textarea" ? "py-2 min-h-[60px]" : "h-9"} px-3 bg-white/50 border rounded-xl text-[11px] font-bold transition-all outline-none resize-none
            ${err
              ? "border-red-200 bg-red-50 text-red-900 placeholder:text-red-300"
              : "border-slate-100 text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
            }`}
          {...rest}
        >
          {children}
        </Component>
      </div>
      {err && <p className="text-[9px] font-bold text-red-500 ml-1.5 mt-0.5">{err}</p>}
    </div>
  );
}

function FormButton({ text, onClick, variant = "primary" }: { text: string; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" }) {
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-black shadow-xl shadow-slate-900/20",
    secondary: "bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 shadow-emerald-200/50",
    ghost: "bg-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-600",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 active:scale-95 flex items-center gap-3 ${styles[variant]}`}
    >
      {text}
      <span className="size-5 bg-white/10 rounded-lg flex items-center justify-center text-xs">→</span>
    </button>
  );
}
