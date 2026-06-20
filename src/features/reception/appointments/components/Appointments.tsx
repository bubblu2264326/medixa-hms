"use client";
import { ChangeEvent } from "react";
import { Search } from "lucide-react";
import { useAppointments } from "../hooks/useAppointments";
import { Appointment, AppointmentStatus } from "../types";
import { Input } from "@/src/components/ui/Input";
import { Label } from "@/src/components/ui/Label";
import { formatTimeInTimezone } from "@/src/lib/timezone/client";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  booked: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-700",
  arrived: "bg-emerald-100 text-emerald-700",
  completed: "bg-teal-100 text-teal-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-amber-100 text-amber-700",
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
      <div className="lg:col-span-2 bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 p-6 h-fit">
        <div className="mb-6 px-1">
          <h2 className="text-2xl font-bold text-slate-800">Book Appointment</h2>
          <p className="text-sm text-slate-500">Schedule a patient with a doctor</p>
        </div>

        <div className="space-y-5">
          {/* Patient search */}
          <div className="space-y-1.5 relative">
            <Label className="text-slate-600 font-semibold ml-1">Patient (Name or ID)</Label>
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Search patient..."
                autoComplete="off"
                className="bg-white/70 border-slate-200 h-12 rounded-2xl pl-11"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Search className="h-4 w-4" aria-hidden /></div>
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
                </div>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto py-2">
                {searchResults.map((p) => (
                  <button
                    key={p.patient_id}
                    type="button"
                    onClick={() => selectPatient(p)}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-slate-50 last:border-none flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm">{p.patient_name}</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        CNIC: {p.cnic || "N/A"} • ID: {p.patient_id}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {p.gender} • {p.age}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedPatient && (
              <p className="text-[11px] font-bold text-emerald-700 ml-1 mt-1">
                Selected: {selectedPatient.patient_name} (ID {selectedPatient.patient_id})
              </p>
            )}
          </div>

          {/* Doctor */}
          <div className="space-y-1.5 flex flex-col">
            <Label className="text-slate-600 font-semibold ml-1">Doctor</Label>
            <select
              className="bg-white/70 border-slate-200 border rounded-2xl h-12 px-4 shadow-sm outline-none text-sm"
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
              <Label className="text-slate-600 font-semibold ml-1">Date &amp; Time</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setScheduledAt(e.target.value)}
                className="bg-white/70 border-slate-200 h-12 rounded-2xl"
              />
            </div>
            <div className="space-y-1.5 flex flex-col">
              <Label className="text-slate-600 font-semibold ml-1">Duration (min)</Label>
              <Input
                type="number"
                min={5}
                step={5}
                value={durationMin}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDurationMin(e.target.value)}
                className="bg-white/70 border-slate-200 h-12 rounded-2xl"
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5 flex flex-col">
            <Label className="text-slate-600 font-semibold ml-1">Reason</Label>
            <Input
              value={reason}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
              placeholder="Reason for appointment..."
              autoComplete="off"
              className="bg-white/70 border-slate-200 h-12 rounded-2xl"
            />
          </div>

          {clashError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {clashError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              disabled={!canBook}
              onClick={() => book()}
              className="h-12 rounded-2xl font-bold transition-all active:scale-95 shadow-lg disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isBooking && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
              Book
            </button>
            <button
              type="button"
              onClick={() => resetForm()}
              className="h-12 rounded-2xl font-bold border-2 border-slate-200 hover:bg-slate-50 text-slate-500"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Day list */}
      <div className="lg:col-span-3 bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 p-6 flex flex-col min-h-0">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Appointments</h2>
            <p className="text-sm text-slate-500">Day schedule &amp; status</p>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex flex-col">
              <Label className="text-slate-600 font-semibold ml-1 text-[11px]">Date</Label>
              <Input
                type="date"
                value={listDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setListDate(e.target.value)}
                className="bg-white/70 border-slate-200 h-10 rounded-xl w-40"
              />
            </div>
            <div className="flex flex-col">
              <Label className="text-slate-600 font-semibold ml-1 text-[11px]">Doctor</Label>
              <select
                className="bg-white/70 border-slate-200 border rounded-xl h-10 px-3 text-sm outline-none w-44"
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
            <p className="text-center text-slate-400 py-12 font-semibold">Loading…</p>
          ) : appointments.length === 0 ? (
            <p className="text-center text-slate-400 py-12 font-semibold">No appointments for this day.</p>
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
    <li className="bg-white/70 border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-center shrink-0">
            <p className="text-lg font-black text-slate-800 leading-none">
              {formatTimeInTimezone(appt.scheduled_at, timezone)}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{appt.duration_min} min</p>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 truncate">{appt.patient_name}</p>
            <p className="text-[11px] text-slate-500 truncate">
              Dr. {appt.doctor_name}
              {appt.reason ? ` • ${appt.reason}` : ""}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[appt.status]}`}>
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
              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                next === "cancelled" || next === "no_show"
                  ? "border-red-200 text-red-600 hover:bg-red-50"
                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
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
