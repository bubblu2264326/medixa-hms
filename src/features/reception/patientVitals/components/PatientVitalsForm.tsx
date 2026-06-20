// features/patient-vitals/components/PatientVitalsForm.tsx
"use client";

import { usePatientVitals } from "../hooks/usePatientVitals";
import { 
  Heart, 
  Activity, 
  Thermometer, 
  Ruler, 
  Weight as WeightIcon, 
  Droplets,
  Search,
  User,
  History,
  AlertCircle
} from "lucide-react";

export function PatientVitalsForm() {
  const {
    patientId,
    selectedVisitId,
    register,
    handleSubmit,
    errors,
    addPatient,
    updateInfo,
    mode,
    statusMessage,
  } = usePatientVitals();

  if (!selectedVisitId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background border border-dashed border-border rounded-lg text-center p-12">
        <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center mb-6 shadow-sm">
          <Thermometer className="h-10 w-10 text-muted-foreground" aria-hidden />
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-foreground leading-none mb-3">No Visit Selected</h3>
        <p className="text-sm font-medium text-muted-foreground max-w-xs">
          Please select a patient from the queue on the left to record or update their vital signs.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-2">
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-lg shadow-sm p-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-5">
            <div className="h-12 w-12 bg-primary rounded-md flex items-center justify-center shadow-sm">
              <Thermometer className="text-primary-foreground w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-foreground tracking-tight">Biometric Intake</h2>
                <span className="bg-primary/10 text-primary text-[10px] px-2.5 py-1 rounded-md font-semibold uppercase tracking-wide border border-primary/20">
                  Visit #{selectedVisitId}
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-medium mt-1">Capture patient vitals and physical metrics for Patient ID: {patientId}</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-muted px-4 py-2 rounded-md border border-border shadow-sm">
             <div className="w-2 h-2 rounded-full bg-primary" />
             <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{mode === "update" ? "Update Mode" : "New Entry"}</span>
          </div>
        </div>

        {/* Status Mode Badge */}
        <div className={`mb-8 rounded-md border px-5 py-4 text-xs font-semibold transition-all ${
          mode === "update"
            ? "border-primary/20 bg-primary/10 text-primary shadow-sm"
            : "border-info/20 bg-info/10 text-info shadow-sm"
        }`}>
          <div className="flex items-center gap-3">
            <AlertCircle className={`w-4 h-4 ${mode === "update" ? "text-primary" : "text-info"}`} />
            <span>{statusMessage}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(mode === "update" ? updateInfo : addPatient)} className="space-y-8">
          {/* Clinical Vitals Grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-2 mb-4">Core Vitals</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Input
                label="Blood Pressure"
                id="bgp"
                icon={<Activity className="w-4 h-4" />}
                reg={register("blood_pressure")}
                err={errors.blood_pressure?.message}
                placeholder="120/80"
              />
              <Input
                label="Temperature"
                id="temp"
                icon={<Thermometer className="w-4 h-4" />}
                reg={register("temperature")}
                err={errors.temperature?.message}
                placeholder="98.6 °F"
              />
              <Input
                label="Heart Rate"
                id="heart_rate"
                icon={<Heart className="w-4 h-4" />}
                reg={register("heart_rate")}
                err={errors.heart_rate?.message}
                placeholder="72 BPM"
              />
            </div>
          </div>

          <div className="h-px bg-border w-full" />

          {/* Physical Metrics + Blood Group Grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-2 mb-4">Physical Attributes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Input
                label="Height"
                id="height"
                icon={<Ruler className="w-4 h-4" />}
                reg={register("height")}
                err={errors.height?.message}
                placeholder="175 cm"
              />
              <Input
                label="Weight"
                id="weight"
                icon={<WeightIcon className="w-4 h-4" />}
                reg={register("weight")}
                err={errors.weight?.message}
                placeholder="70 kg"
              />
              <Input
                label="Blood Group"
                id="blood_group"
                icon={<Droplets className="w-4 h-4" />}
                reg={register("blood_group")}
                err={errors.blood_group?.message}
                placeholder="O+"
              />
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-semibold uppercase tracking-wide text-xs shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Activity className="w-4 h-4" />
              {mode === "update" ? "Update Biometric Data" : "Save Biometric Data"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reusable Inner Components for clean layout
function Input({ label, id, icon, reg, err, placeholder }: any) {
  return (
    <div className="flex flex-col space-y-2">
      <label htmlFor={id} className="text-xs uppercase font-semibold tracking-wide text-muted-foreground ml-1">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-all">
          {icon}
        </div>
        <input
          id={id}
          {...reg}
          placeholder={placeholder}
          className="w-full h-10 pl-12 pr-4 bg-background border border-input rounded-md outline-none focus:ring-4 focus:ring-ring/10 focus:border-ring transition-all font-medium text-foreground placeholder:text-muted-foreground shadow-sm"
        />
      </div>
      {err && <p className="text-[10px] font-semibold text-destructive ml-1 mt-1 uppercase">! {err}</p>}
    </div>
  );
}
