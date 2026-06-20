"use client";
import React, { useState, useEffect } from "react";
import { 
  Users, 
  Baby, 
  UserPlus, 
  Activity,
  PieChart,
  Calendar,
  ArrowRight,
  User,
  MoreVertical,
  TrendingUp,
  MapPin
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";

export default function PatientsAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/patients/analytics")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Patient Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Population health & visit demographics</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-md border-input font-semibold text-xs h-12">
            Export Records
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md px-6 shadow-sm font-semibold text-xs h-12">
            Register New Patient
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 rounded-lg border border-border shadow-sm bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-muted text-muted-foreground rounded-md">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Patients</p>
              <h3 className="text-2xl font-semibold text-foreground tracking-tight font-mono tabular-nums">{data?.summary?.total_patients}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-lg border border-border shadow-sm bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-muted text-muted-foreground rounded-md">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">New (30 Days)</p>
              <h3 className="text-2xl font-semibold text-foreground tracking-tight font-mono tabular-nums">{data?.summary?.recent_registrations}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-lg border border-border shadow-sm bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-muted text-muted-foreground rounded-md">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active Visitors</p>
              <h3 className="text-2xl font-semibold text-foreground tracking-tight font-mono tabular-nums">{data?.summary?.active_visitors}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-lg border border-primary/20 shadow-sm bg-primary/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary text-primary-foreground rounded-md">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Growth Rate</p>
              <h3 className="text-2xl font-semibold text-primary tracking-tight font-mono tabular-nums">+12.4%</h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart Mockup (Placeholder for visual aesthetic) */}
        <div className="lg:col-span-2 space-y-8">
           <Card className="p-8 rounded-lg border border-border shadow-sm bg-card overflow-hidden">
              <div className="flex items-center justify-between mb-12">
                 <div>
                    <h3 className="text-xl font-semibold text-foreground tracking-tight">Registration Trend</h3>
                    <p className="text-xs font-semibold text-muted-foreground mt-1">Patient growth over the last 6 months</p>
                 </div>
                 <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> Registrations</span>
                 </div>
              </div>

              <div className="h-64 flex items-end justify-between gap-4 px-4 pr-12">
                 {data?.trend?.map((t: any, i: number) => {
                    const maxCount = Math.max(...data.trend.map((x: any) => Number(x.count)));
                    const height = (Number(t.count) / maxCount) * 100;

                    return (
                       <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                          <div className="relative w-full">
                             <div
                                className="w-full bg-muted rounded-md overflow-hidden relative"
                                style={{ height: '240px' }}
                             >
                                <div
                                   className="absolute bottom-0 w-full bg-primary rounded-md transition-all duration-1000"
                                   style={{ height: `${height}%` }}
                                >
                                   <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-semibold font-mono tabular-nums px-2 py-1 rounded shadow-sm transition-opacity">
                                      {t.count}
                                   </div>
                                </div>
                             </div>
                          </div>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight whitespace-nowrap rotate-[-45deg] translate-y-2">
                             {t.month}
                          </span>
                       </div>
                    );
                 })}
              </div>
           </Card>

           {/* Recent Registrations Table */}
           <Card className="p-8 rounded-lg border border-border shadow-sm bg-card">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-xl font-semibold text-foreground tracking-tight">Recent Onboarding</h3>
                 <Button variant="ghost" className="text-muted-foreground hover:text-foreground group">
                    <span className="text-xs font-semibold uppercase tracking-wide">Full Directory</span>
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                 </Button>
              </div>

              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="border-b border-border">
                          <th className="pb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4">Patient</th>
                          <th className="pb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4">Demographics</th>
                          <th className="pb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4">Address</th>
                          <th className="pb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4">Signed Up</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                       {data?.recentPatients?.map((p: any, i: number) => (
                          <tr key={i} className="group hover:bg-accent transition-colors">
                             <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center font-semibold text-muted-foreground text-xs">
                                      {p.patient_name.charAt(0)}
                                   </div>
                                   <div>
                                      <p className="text-sm font-semibold text-foreground">{p.patient_name}</p>
                                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight font-mono tabular-nums">ID: #PT-{1000 + i}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                   <span className={`w-1.5 h-1.5 rounded-full ${p.gender === 'Male' ? 'bg-info' : 'bg-primary'}`} />
                                   <p className="text-xs font-semibold text-muted-foreground">{p.gender}, {p.age}y</p>
                                </div>
                             </td>
                             <td className="py-4 px-4">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                   <MapPin className="w-3 h-3" />
                                   <span className="text-xs font-semibold truncate max-w-[120px]">{p.address || 'H-232 Block B, Lahore'}</span>
                                </div>
                             </td>
                             <td className="py-4 px-4 text-xs font-semibold text-foreground font-mono tabular-nums">{p.registered_at}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </Card>
        </div>

        {/* Demographic Breakdown */}
        <div className="space-y-8">
           <Card className="p-8 rounded-lg border border-border shadow-sm bg-card">
              <h3 className="text-xl font-semibold text-foreground tracking-tight mb-8">Gender Diversity</h3>
              <div className="flex flex-col items-center">
                 <div className="relative w-48 h-48 mb-8">
                    <div className="absolute inset-0 rounded-full border-[1.5rem] border-muted" />
                    {/* Visual Mock of Donut Chart segments */}
                    <div className="absolute inset-0 rounded-full border-[1.5rem] border-info border-r-transparent border-b-transparent rotate-45" />
                    <div className="absolute inset-0 rounded-full border-[1.5rem] border-primary border-l-transparent border-t-transparent -rotate-45" />

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active</p>
                       <h4 className="text-2xl font-semibold text-foreground tracking-tight font-mono tabular-nums">100%</h4>
                    </div>
                 </div>

                 <div className="w-full space-y-4">
                    {data?.genderDist?.map((g: any, i: number) => (
                       <div key={i} className="flex justify-between items-center bg-muted p-3 rounded-md">
                          <div className="flex items-center gap-3">
                             <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-info' : 'bg-primary'}`} />
                             <span className="text-xs font-semibold text-foreground uppercase tracking-tight">{g.gender}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground font-mono tabular-nums">{g.count}</span>
                       </div>
                    ))}
                 </div>
              </div>
           </Card>

           <Card className="p-8 rounded-lg border border-border shadow-sm bg-card overflow-hidden relative">
              <h3 className="text-xl font-semibold text-foreground tracking-tight mb-8">Patient Age Distribution</h3>
              <div className="space-y-6">
                 {data?.ageGroups?.map((group: any, i: number) => {
                    const maxCount = Math.max(...data.ageGroups.map((x: any) => Number(x.count)));
                    const width = (Number(group.count) / maxCount) * 100;

                    return (
                       <div key={i} className="space-y-2">
                          <div className="flex justify-between text-xs font-semibold uppercase tracking-wide">
                             <span className="text-muted-foreground">{group.age_group}</span>
                             <span className="text-foreground font-mono tabular-nums">{group.count}</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                             <div
                                className="h-full bg-primary rounded-full transition-all duration-1000"
                                style={{ width: `${width}%` }}
                             />
                          </div>
                       </div>
                    );
                 })}
              </div>

              <div className="mt-12 group cursor-pointer">
                 <div className="p-5 bg-muted rounded-md border border-border flex items-center justify-between group-hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                       <PieChart className="w-6 h-6 text-primary" />
                       <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">Risk Analysis</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
