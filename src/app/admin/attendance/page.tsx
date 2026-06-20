"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Search } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { formatTimeInTimezone, getTimezoneNowDateInput } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

type AttendanceRecord = {
    attendance_id: string;
    staff_id: number;
    staff_name: string;
    user_code: string;
    status: string;
    date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    derived_status: string;
    is_unscheduled: boolean;
    late_minutes: number;
    overtime_minutes: number;
    early_leave_minutes: number;
    attendance_message?: string;
    account_type?: "staff" | "doctor";
};

type AttendanceSummary = {
    total_staff: number;
    present_today: number;
    absent: number;
    late_or_half_day: number;
    unscheduled: number;
};

type StaffMember = {
    staff_id: number;
    name: string;
    user_code: string;
    account_type: "staff" | "doctor";
};

const EMPTY_SUMMARY: AttendanceSummary = {
    total_staff: 0,
    present_today: 0,
    absent: 0,
    late_or_half_day: 0,
    unscheduled: 0,
};

function formatTime(value: string | null, timeZone: string) {
    if (!value) return "--:--";
    return formatTimeInTimezone(value, timeZone);
}

function statusStyle(status: string) {
    switch (status) {
        case "on_time":
            return "bg-success/10 text-success";
        case "late":
            return "bg-warning/15 text-warning-foreground";
        case "half_day":
            return "bg-warning/15 text-warning-foreground";
        case "early_leave":
            return "bg-warning/15 text-warning-foreground";
        case "overtime":
            return "bg-info/10 text-info";
        case "unscheduled":
            return "bg-muted text-muted-foreground";
        case "absent":
            return "bg-destructive/10 text-destructive";
        case "leave":
            return "bg-muted text-muted-foreground";
        default:
            return "bg-muted text-muted-foreground";
    }
}

export default function AttendancePage() {
    const systemTimezone = useSystemTimezone();
    const today = getTimezoneNowDateInput(systemTimezone);
    const [selectedDate, setSelectedDate] = useState(today);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [summary, setSummary] = useState<AttendanceSummary>(EMPTY_SUMMARY);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [preview, setPreview] = useState<any | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [manual, setManual] = useState({
        staff_id: "",
        account_type: "staff" as "staff" | "doctor",
        date: today,
        status: "Present",
        check_in_time: "",
        check_out_time: "",
        reason: "",
    });

    async function fetchAttendance(date: string) {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/attendance?date=${date}`);
            const data = await res.json();
            const nextRecords = Array.isArray(data) ? data : Array.isArray(data?.records) ? data.records : [];
            const nextSummary = data?.summary ?? EMPTY_SUMMARY;
            setRecords(nextRecords);
            setSummary(nextSummary);
        } catch (error) {
            console.error("Failed to load attendance", error);
            setRecords([]);
            setSummary(EMPTY_SUMMARY);
        } finally {
            setLoading(false);
        }
    }

    async function fetchStaff() {
        try {
            const res = await fetch("/api/admin/staff");
            const data = await res.json();
            if (!Array.isArray(data)) return;
            const normalized: StaffMember[] = data.map((row: any): StaffMember => ({
                staff_id: Number(row.staff_id),
                name: String(row.name ?? ""),
                user_code: String(row.user_code ?? ""),
                account_type: String(row.account_type ?? "staff") === "doctor" ? "doctor" : "staff",
            }));
            setStaff(normalized);
        } catch (error) {
            console.error("Failed to load staff list", error);
        }
    }

    useEffect(() => {
        fetchAttendance(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        fetchStaff();
    }, []);

    const filteredRecords = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return records;
        return records.filter((row) => {
            return row.staff_name?.toLowerCase().includes(query) || row.user_code?.toLowerCase().includes(query);
        });
    }, [records, searchQuery]);

    useEffect(() => {
        if (!showModal || !manual.staff_id || !manual.date) {
            setPreview(null);
            return;
        }
        let active = true;
        const handle = setTimeout(async () => {
            setPreviewLoading(true);
            try {
                const res = await fetch("/api/admin/attendance/manual", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(manual),
                });
                const data = await res.json();
                if (!active) return;
                setPreview(res.ok ? data.preview : null);
            } catch (error) {
                if (active) setPreview(null);
                console.error("Preview failed", error);
            } finally {
                if (active) setPreviewLoading(false);
            }
        }, 250);
        return () => {
            active = false;
            clearTimeout(handle);
        };
    }, [manual, showModal]);

    async function handleManualSubmit(event: React.FormEvent) {
        event.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/attendance/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(manual),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || "Failed to save attendance");
            }
            setShowModal(false);
            setManual({
                staff_id: "",
                account_type: "staff",
                date: selectedDate,
                status: "Present",
                check_in_time: "",
                check_out_time: "",
                reason: "",
            });
            setPreview(null);
            await fetchAttendance(selectedDate);
        } catch (error: any) {
            alert(error?.message || "Failed to save attendance");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Attendance & Time Tracking</h1>
                    <p className="text-sm font-medium text-muted-foreground">Roster-aware attendance with policy-based outcomes.</p>
                </div>
                <Button
                    onClick={() => {
                        setManual((prev) => ({ ...prev, date: selectedDate }));
                        setShowModal(true);
                    }}
                    className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    Manual Entry Override
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card className="rounded-lg border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Staff</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground font-mono tabular-nums">{summary.total_staff}</p>
                </Card>
                <Card className="rounded-lg border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Present Today</p>
                    <p className="mt-1 text-2xl font-semibold text-success font-mono tabular-nums">{summary.present_today}</p>
                </Card>
                <Card className="rounded-lg border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Absent</p>
                    <p className="mt-1 text-2xl font-semibold text-destructive font-mono tabular-nums">{summary.absent}</p>
                </Card>
                <Card className="rounded-lg border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Late / Half Day</p>
                    <p className="mt-1 text-2xl font-semibold text-warning-foreground font-mono tabular-nums">{summary.late_or_half_day}</p>
                </Card>
                <Card className="rounded-lg border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unscheduled</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground font-mono tabular-nums">{summary.unscheduled}</p>
                </Card>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3 rounded-md border border-input bg-muted px-3 py-2 md:w-96">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or code"
                            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-input bg-muted px-3 py-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-sm font-medium text-foreground focus:outline-none"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-muted">
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Staff</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Derived Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check In</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check Out</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Minutes</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-14 text-center text-sm font-semibold text-muted-foreground">
                                        Loading attendance records...
                                    </td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-14 text-center text-sm font-semibold text-muted-foreground">
                                        No attendance records found for this date.
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((record) => (
                                    <tr key={record.attendance_id} className="border-t border-border">
                                        <td className="px-4 py-4">
                                            <div className="font-semibold text-foreground">{record.staff_name}</div>
                                            <div className="text-xs font-medium text-muted-foreground font-mono tabular-nums">{record.user_code}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span
                                                className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusStyle(
                                                    String(record.derived_status || "")
                                                )}`}
                                            >
                                                {String(record.derived_status || record.status).replace("_", " ")}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm font-medium text-foreground font-mono tabular-nums">{formatTime(record.check_in_time, systemTimezone)}</td>
                                        <td className="px-4 py-4 text-sm font-medium text-foreground font-mono tabular-nums">{formatTime(record.check_out_time, systemTimezone)}</td>
                                        <td className="px-4 py-4 text-xs font-medium text-muted-foreground font-mono tabular-nums">
                                            <div>Late: {record.late_minutes ?? 0}</div>
                                            <div>Early: {record.early_leave_minutes ?? 0}</div>
                                            <div>OT: {record.overtime_minutes ?? 0}</div>
                                        </td>
                                        <td className="px-4 py-4 text-xs font-medium text-muted-foreground">
                                            {record.attendance_message || (record.is_unscheduled ? "Unscheduled shift day." : "-")}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded-lg bg-card p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold tracking-tight text-foreground">Manual Attendance Override</h2>
                            <button className="text-sm font-semibold text-muted-foreground" onClick={() => setShowModal(false)}>
                                Close
                            </button>
                        </div>
                        <form className="space-y-4" onSubmit={handleManualSubmit}>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employee</label>
                                    <select
                                        value={manual.staff_id}
                                        onChange={(e) => {
                                            const selected = staff.find((person) => String(person.staff_id) === e.target.value);
                                            setManual((prev) => ({
                                                ...prev,
                                                staff_id: e.target.value,
                                                account_type: selected?.account_type ?? "staff",
                                            }));
                                        }}
                                        className="w-full rounded-md border border-input px-3 py-2 text-sm font-medium"
                                        required
                                    >
                                        <option value="">Select staff</option>
                                        {staff.map((person) => (
                                            <option key={person.staff_id} value={String(person.staff_id)}>
                                                {person.name} ({person.user_code}) - {person.account_type}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</label>
                                    <input
                                        type="date"
                                        value={manual.date}
                                        onChange={(e) => setManual((prev) => ({ ...prev, date: e.target.value }))}
                                        className="w-full rounded-md border border-input px-3 py-2 text-sm font-medium"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</label>
                                    <select
                                        value={manual.status}
                                        onChange={(e) => setManual((prev) => ({ ...prev, status: e.target.value }))}
                                        className="w-full rounded-md border border-input px-3 py-2 text-sm font-medium"
                                    >
                                        <option value="Present">Present</option>
                                        <option value="Absent">Absent</option>
                                        <option value="Half-Day">Half-Day</option>
                                        <option value="Leave">Leave</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check In</label>
                                    <input
                                        type="time"
                                        value={manual.check_in_time}
                                        onChange={(e) => setManual((prev) => ({ ...prev, check_in_time: e.target.value }))}
                                        className="w-full rounded-md border border-input px-3 py-2 text-sm font-medium"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check Out</label>
                                    <input
                                        type="time"
                                        value={manual.check_out_time}
                                        onChange={(e) => setManual((prev) => ({ ...prev, check_out_time: e.target.value }))}
                                        className="w-full rounded-md border border-input px-3 py-2 text-sm font-medium"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason (audit)</label>
                                <input
                                    type="text"
                                    value={manual.reason}
                                    onChange={(e) => setManual((prev) => ({ ...prev, reason: e.target.value }))}
                                    placeholder="Correction reason"
                                    className="w-full rounded-md border border-input px-3 py-2 text-sm font-medium"
                                />
                            </div>
                            <div className="rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
                                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Computed Outcome Preview</div>
                                {previewLoading ? (
                                    <span>Calculating...</span>
                                ) : preview ? (
                                    <div className="space-y-1">
                                        <div>Status: <strong>{String(preview.derived_status || "").replace("_", " ")}</strong></div>
                                        <div>Late: {preview.late_minutes ?? 0} min, Early Leave: {preview.early_leave_minutes ?? 0} min, Overtime: {preview.overtime_minutes ?? 0} min</div>
                                        <div>{preview.message}</div>
                                    </div>
                                ) : (
                                    <span>Select employee/date to preview policy outcome.</span>
                                )}
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" className="rounded-md" onClick={() => setShowModal(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    {submitting ? "Saving..." : "Save Override"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
