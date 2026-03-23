"use client";
import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  MoreVertical,
  Mail,
  Phone,
  ArrowRight,
  Settings,
  Lock,
  UserPlus,
  Trash2,
  Check,
  X
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: "",
    user_code: "",
    role: "Staff",
    contact_number: "",
    email: "",
    password: ""
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = () => {
    setLoading(true);
    fetch("/api/admin/staff")
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error(data.error);
          setStaff([]);
        } else {
          setStaff(Array.isArray(data) ? data : []);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setStaff([]);
        setLoading(false);
      });
  };

  const fetchPermissions = (staffId: number) => {
    setPermissionsLoading(true);
    fetch(`/api/admin/staff/permissions?staff_id=${staffId}`)
      .then(res => res.json())
      .then(data => {
        setPermissions(data);
        setPermissionsLoading(false);
      });
  };

  const handleUpdatePermission = async (module: string, field: string, value: boolean) => {
    const updated = permissions.map(p => 
      p.module === module ? { ...p, [field]: value } : p
    );
    setPermissions(updated);
  };

  const savePermissions = async () => {
    if (!selectedStaff) return;
    try {
      const res = await fetch("/api/admin/staff/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: selectedStaff.staff_id,
          permissions: permissions
        })
      });
      if (res.ok) {
        setSelectedStaff(null);
        fetchStaff();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredStaff = Array.isArray(staff) ? staff.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.user_code?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">HR & Role Administration</h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">Manage staff, roles, and granular module permissions</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-6 shadow-xl font-bold text-xs uppercase tracking-wider h-12"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Onboard New Staff
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Staff List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white">
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl mb-6">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by name, role, or staff code..." 
                className="bg-transparent border-none focus:outline-none text-sm w-full placeholder:text-slate-400 font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-50">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Identity</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Department / Role</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Access Level</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-20 text-center">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : filteredStaff.map((s) => (
                    <tr key={s.staff_id} className="group hover:bg-slate-50/50 transition-all cursor-pointer" onClick={() => {
                        setSelectedStaff(s);
                        fetchPermissions(s.staff_id);
                    }}>
                      <td className="py-5 px-6">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-slate-400 text-xs shadow-inner">
                               {s.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || "?"}
                            </div>
                            <div>
                               <p className="text-sm font-black text-slate-800">{s.name}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{s.user_code}</p>
                            </div>
                         </div>
                      </td>
                      <td className="py-5 px-6">
                         <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            s.role === 'Admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                         }`}>
                            {s.role}
                         </span>
                      </td>
                      <td className="py-5 px-6">
                         <div className="flex items-center gap-1.5">
                            {Number(s.write_modules_count) > 2 ? (
                               <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                               <Shield className="w-3.5 h-3.5 text-slate-300" />
                            )}
                            <span className="text-xs font-black text-slate-700">{s.write_modules_count} Write Modules</span>
                         </div>
                      </td>
                      <td className="py-5 px-6 text-right">
                         <div className="inline-flex p-2 bg-slate-50 rounded-xl group-hover:bg-white border border-transparent group-hover:border-slate-100 transition-all shadow-sm">
                            <Lock className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Permissions Panel */}
        <div>
          <Card className="p-8 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 bg-slate-900 text-white min-h-[600px] sticky top-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-24 translate-x-24 blur-3xl" />
            
            {!selectedStaff ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                <ShieldAlert className="w-16 h-16 mb-4 text-slate-500" />
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Control Panel</h3>
                <p className="text-xs font-bold text-slate-500 mt-2">Select a staff member from the list to modify systemic permissions</p>
              </div>
            ) : (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                 <div className="flex items-center justify-between">
                    <div>
                       <h3 className="text-xl font-black uppercase tracking-tight">{selectedStaff.name}</h3>
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1">{selectedStaff.role} Permissions</p>
                    </div>
                    <button onClick={() => setSelectedStaff(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                       <X className="w-5 h-5 text-slate-400" />
                    </button>
                 </div>

                 <div className="space-y-4">
                    {permissionsLoading ? (
                       <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" /></div>
                    ) : (
                       permissions.map((p, idx) => (
                          <div key={idx} className="p-5 bg-white/5 rounded-[1.5rem] border border-white/5 group hover:border-white/20 transition-all">
                             <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-200">{p.module}</h4>
                                <Settings className="w-3.5 h-3.5 text-slate-500 group-hover:rotate-90 transition-transform duration-500" />
                             </div>
                             <div className="flex gap-4">
                                <button 
                                   onClick={() => handleUpdatePermission(p.module, 'can_read', !p.can_read)}
                                   className={`flex-1 p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-tighter ${
                                      p.can_read ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-800 text-slate-500 border border-transparent'
                                   }`}
                                >
                                   {p.can_read ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                   Read
                                </button>
                                <button 
                                   onClick={() => handleUpdatePermission(p.module, 'can_write', !p.can_write)}
                                   className={`flex-1 p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-tighter ${
                                      p.can_write ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500 border border-transparent'
                                   }`}
                                >
                                   {p.can_write ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                   Write
                                </button>
                             </div>
                          </div>
                       ))
                    )}
                 </div>

                 <div className="pt-6 relative z-10">
                    <Button 
                       onClick={savePermissions}
                       className="w-full bg-white text-slate-900 rounded-2xl h-14 font-black uppercase tracking-[0.1em] text-[11px] shadow-2xl hover:bg-slate-100"
                    >
                       Commit Access Rules
                    </Button>
                    <p className="text-[10px] font-bold text-slate-500 text-center mt-3 tracking-tight">Changes will take effect after next login session</p>
                 </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
