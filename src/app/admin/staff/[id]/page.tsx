"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, ShieldCheck, CalendarCheck, Wallet } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { formatDateInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

type EmployeeProfile = {
  account_type: "staff" | "doctor";
  staff_id: number;
  user_code: string;
  name: string;
  role: string;
  photo_url?: string | null;
  gender?: string | null;
  dob?: string | null;
  contact_number?: string | null;
  email?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  national_id?: string | null;
  license_id?: string | null;
  department?: string | null;
  designation?: string | null;
  employment_type?: string | null;
  work_location?: string | null;
  facility_code?: string | null;
  branch_code?: string | null;
  joined_at?: string | null;
  exited_at?: string | null;
  employment_status?: string | null;
  staff_tags?: string[] | null;
};

const statusClass = (status?: string | null) => {
  if (status === "active") return "bg-success/10 text-success";
  if (status === "suspended") return "bg-warning/15 text-warning-foreground";
  if (status === "resigned" || status === "inactive") return "bg-muted text-muted-foreground";
  return "bg-destructive/10 text-destructive";
};

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value && String(value).trim() ? value : "—"}</p>
    </div>
  );
}

export default function EmployeeProfilePage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const systemTimezone = useSystemTimezone();
  const accountType = search.get("type") === "doctor" ? "doctor" : "staff";

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "related">("overview");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/staff/v2/${params.id}?accountType=${accountType}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load employee profile");
      setProfile(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load employee profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [params.id, accountType]);

  useEffect(() => {
    load();
  }, [load]);

  const fmtDate = useCallback(
    (value?: string | null) => (value ? formatDateInTimezone(value, systemTimezone) : "—"),
    [systemTimezone]
  );

  const address = useMemo(() => {
    if (!profile) return "";
    return [profile.address_line_1, profile.address_line_2, profile.city, profile.state, profile.postal_code]
      .filter((p) => p && String(p).trim())
      .join(", ");
  }, [profile]);

  const isDoctor = accountType === "doctor";

  return (
    <div className="space-y-6 py-4">
      <Link href="/admin/staff" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Staff Directory
      </Link>

      {error ? (
        <Card className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </Card>
      ) : null}

      {loading ? (
        <Card className="rounded-lg border border-border p-6"><p className="text-sm text-muted-foreground">Loading profile…</p></Card>
      ) : profile ? (
        <>
          <Card className="rounded-lg border border-border p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                {profile.name?.slice(0, 1)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{profile.name}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <span className="font-mono tabular-nums">{profile.user_code}</span> · {profile.role}
                  {profile.department ? ` · ${profile.department}` : ""}
                </p>
              </div>
              <span className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass(profile.employment_status)}`}>
                {profile.employment_status || "unknown"}
              </span>
            </div>
          </Card>

          <div className="flex gap-2">
            {(["overview", "related"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {t === "overview" ? "Overview" : "Records"}
              </button>
            ))}
          </div>

          {tab === "overview" ? (
            <div className="space-y-4">
              <Card className="rounded-lg border border-border p-5">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employment</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <Field label="Role" value={profile.role} />
                  <Field label="Department" value={profile.department} />
                  <Field label="Designation" value={profile.designation} />
                  <Field label="Employment Type" value={profile.employment_type} />
                  <Field label="Facility" value={profile.facility_code} />
                  <Field label="Branch" value={profile.branch_code} />
                  <Field label="Work Location" value={profile.work_location} />
                  <Field label="Joined" value={fmtDate(profile.joined_at)} />
                  {profile.exited_at ? <Field label="Exited" value={fmtDate(profile.exited_at)} /> : null}
                </div>
              </Card>

              <Card className="rounded-lg border border-border p-5">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <Field label="Phone" value={profile.contact_number} />
                  <Field label="Email" value={profile.email} />
                  <Field label="Emergency Contact" value={profile.emergency_contact_name} />
                  <Field label="Emergency Phone" value={profile.emergency_contact_number} />
                  <div className="col-span-2 md:col-span-4">
                    <Field label="Address" value={address} />
                  </div>
                </div>
              </Card>

              {!isDoctor ? (
                <Card className="rounded-lg border border-border p-5">
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identity</h2>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Field label="Gender" value={profile.gender} />
                    <Field label="Date of Birth" value={fmtDate(profile.dob)} />
                    <Field label="National ID" value={profile.national_id} />
                    <Field label="License ID" value={profile.license_id} />
                  </div>
                  {profile.staff_tags && profile.staff_tags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {profile.staff_tags.map((t) => (
                        <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  ) : null}
                </Card>
              ) : null}
            </div>
          ) : (
            <Card className="rounded-lg border border-border p-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked Records</h2>
              <p className="mb-4 text-sm text-muted-foreground">Open the workforce module to manage this employee&apos;s records.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { href: "/admin/documents", icon: <FileText className="h-4 w-4" />, label: "Documents" },
                  { href: "/admin/credentialing", icon: <ShieldCheck className="h-4 w-4" />, label: "Credentials" },
                  { href: "/admin/attendance", icon: <CalendarCheck className="h-4 w-4" />, label: "Attendance" },
                  { href: "/admin/payroll", icon: <Wallet className="h-4 w-4" />, label: "Payroll" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-3 text-sm font-medium text-foreground transition hover:bg-accent"
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
