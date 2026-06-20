"use client";
import { ChangeEvent } from "react";
import { Search } from "lucide-react";
import { useAppointments } from "../hooks/useAppointments";
import { Appointment, AppointmentStatus } from "../types";
import { Input } from "@/src/components/ui/Input";
import { Label } from "@/src/components/ui/Label";
import { formatTimeInTimezone } from "@/src/lib/timezone/client";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  booked: "bg-muted text-muted-foreground",
  confirmed: "bg-info/10 text-info",
  arrived: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-warning/15 text-warning-foreground",
};

// Status actions offered per current state — keeps the day list a single-click workflow.
const NEXT_ACTIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ["confirmed", "arrived", "cancelled", "no_show"],
  confirmed: ["arrived", "cancelled", "no_show"],
  arrived: ["completed", "cancelled"],
  completed: [],
  cancelled: ["booked"],
  no_show: ["booked"],
};

const ACTION_LABEL: Record<AppointmentStatus, string> = {
  booked: "Re-book",
  confirmed: "Confirm",
  arrived: "Arrived",
  completed: "Complete",
  cancelled: "Cancel",
  no_show: "No-show",
};

export function Appointments() {
  const {
    doctors,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    selectedPatient,
    selectPatient,
    doctorId,
    setDoctorId,
    scheduledAt,
    setScheduledAt,
    durationMin,
    setDurationMin,
    reason,
    setReason,
    isBooking,
    clashError,
    canBook,
    book,
    resetForm,
    systemTimezone,
    listDate,
    setListDate,
    filterDoctorId,
    setFilterDoctorId,
    appointments,
    isLoadingList,
    changeStatus,
  } = useAppointments();

  return (
    <div className="w-full h-full p-2 grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Booking form */}
      <div className="lg:col-span-2 bg-card border border-border rounded-lg shadow-sm p-6 h-fit">
        <div className="mb-6 px-1">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Book Appointment</h2>
          <p className="text-sm text-muted-foreground">Schedule a patient with a doctor</p>
        </div>

        <div className="space-y-5">
          {/* Patient search */}
          <div className="space-y-1.5 relative">
            <Label className="text-foreground font-semibold ml-1">Patient (Name or ID)</Label>
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Search patient..."
                autoComplete="off"
                className="bg-background border-input h-12 rounded-md pl-11"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"><Search className="h-4 w-4" aria-hidden /></div>
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-card border border-border rounded-md shadow-md max-h-60 overflow-y-auto py-2">
                {searchResults.map((p) => (
                  <button
                    key={p.patient_id}
                    type="button"
                    onClick={() => selectPatient(p)}
                    className="w-full text-left px-4 py-3 hover:bg-accent border-b border-border last:border-none flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground text-sm">{p.patient_name}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        CNIC: {p.cnic || "N/A"} • ID: {p.patient_id}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {p.gender} • {p.age}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedPatient && (
              <p className="text-[11px] font-semibold text-primary ml-1 mt-1">
                Selected: {selectedPatient.patient_name} (ID {selectedPatient.patient_id})
              </p>
            )}
          </div>

          {/* Doctor */}
          <div className="space-y-1.5 flex flex-col">
            <Label className="text-foreground font-semibold ml-1">Doctor</Label>
            <select
              className="bg-background border-input border rounded-md h-12 px-4 shadow-sm outline-none text-sm"
              value={doctorId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setDoctorId(e.target.value)}
            >
              <option value="">Select Practitioner</option>
              {doctors.map((d) => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  Dr. {d.doctor_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date/time + duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 flex flex-col">
              <Label className="text-foreground font-semibold ml-1">Date &amp; Time</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setScheduledAt(e.target.value)}
                className="bg-background border-input h-12 rounded-md"
              />
            </div>
            <div className="space-y-1.5 flex flex-col">
              <Label className="text-foreground font-semibold ml-1">Duration (min)</Label>
              <Input
                type="number"
                min={5}
                step={5}
                value={durationMin}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDurationMin(e.target.value)}
                className="bg-background border-input h-12 rounded-md"
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5 flex flex-col">
            <Label className="text-foreground font-semibold ml-1">Reason</Label>
            <Input
              value={reason}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
              placeholder="Reason for appointment..."
              autoComplete="off"
              className="bg-background border-input h-12 rounded-md"
            />
          </div>

          {clashError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
              {clashError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              disabled={!canBook}
              onClick={() => book()}
              className="h-12 rounded-md font-semibold transition-all active:scale-95 shadow-sm disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isBooking && <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />}
              Book
            </button>
            <button
              type="button"
              onClick={() => resetForm()}
              className="h-12 rounded-md font-semibold border border-border hover:bg-accent text-muted-foreground"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Day list */}
      <div className="lg:col-span-3 bg-card border border-border rounded-lg shadow-sm p-6 flex flex-col min-h-0">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Appointments</h2>
            <p className="text-sm text-muted-foreground">Day schedule &amp; status</p>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex flex-col">
              <Label className="text-foreground font-semibold ml-1 text-[11px]">Date</Label>
              <Input
                type="date"
                value={listDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setListDate(e.target.value)}
                className="bg-background border-input h-10 rounded-md w-40"
              />
            </div>
            <div className="flex flex-col">
              <Label className="text-foreground font-semibold ml-1 text-[11px]">Doctor</Label>
              <select
                className="bg-background border-input border rounded-md h-10 px-3 text-sm outline-none w-44"
                value={filterDoctorId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterDoctorId(e.target.value)}
              >
                <option value="">All doctors</option>
                {doctors.map((d) => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    Dr. {d.doctor_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar -mx-2 px-2">
          {isLoadingList ? (
            <p className="text-center text-muted-foreground py-12 font-semibold">Loading…</p>
          ) : appointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 font-semibold">No appointments for this day.</p>
          ) : (
            <ul className="space-y-3">
              {appointments.map((a) => (
                <AppointmentRow key={a.appointment_id} appt={a} timezone={systemTimezone} onChange={changeStatus} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AppointmentRow({
  appt,
  timezone,
  onChange,
}: {
  appt: Appointment;
  timezone: string;
  onChange: (id: number, status: AppointmentStatus) => void;
}) {
  return (
    <li className="bg-card border border-border rounded-md px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-center shrink-0">
            <p className="text-lg font-semibold font-mono tabular-nums text-foreground leading-none">
              {formatTimeInTimezone(appt.scheduled_at, timezone)}
            </p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mt-1">{appt.duration_min} min</p>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{appt.patient_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              Dr. {appt.doctor_name}
              {appt.reason ? ` • ${appt.reason}` : ""}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold uppercase px-2.5 py-1 rounded-md shrink-0 ${STATUS_STYLES[appt.status]}`}>
          {appt.status.replace("_", " ")}
        </span>
      </div>
      {NEXT_ACTIONS[appt.status].length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {NEXT_ACTIONS[appt.status].map((next) => (
            <button
              key={next}
              type="button"
              onClick={() => onChange(appt.appointment_id, next)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-md border transition-all active:scale-95 ${
                next === "cancelled" || next === "no_show"
                  ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                  : "border-primary/30 text-primary hover:bg-primary/10"
              }`}
            >
              {ACTION_LABEL[next]}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
