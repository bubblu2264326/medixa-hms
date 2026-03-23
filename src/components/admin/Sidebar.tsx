"use client";
import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  CalendarCheck, 
  IndianRupee, 
  HandCoins,
  Package, 
  Users, 
  Settings, 
  History,
  LogOut,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { logoutUser } from "@/src/features/Login/api";
import Image from "next/image";
import { UserProfile } from "@/src/components/session/UserProfile";
import { useState, useEffect } from "react";

const SidebarItem = ({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) => (
  <Link
    href={href}
    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
      active 
        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" 
        : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? "text-white" : "group-hover:text-emerald-600"}`} />
    <span className="text-sm font-semibold">{label}</span>
  </Link>
);

export const AdminSidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const menuGroups = [
        {
            title: "Staff Management",
            items: [
                { href: "/admin/staff", icon: Users, label: "Access Control" },
                { href: "/admin/attendance", icon: CalendarCheck, label: "Attendance" },
            ]
        },
        {
            title: "Pharmacy",
            items: [
                { href: "/admin/inventory", icon: Package, label: "Inventory" },
                { href: "/admin/cashier", icon: HandCoins, label: "Pharmacy Financials" },
            ]
        },
        {
            title: "Financials",
            items: [
                { href: "/admin/financials", icon: IndianRupee, label: "System Finance" },
            ]
        },
        {
            title: "General System",
            items: [
                { href: "/admin/settings", icon: Settings, label: "Settings" },
                { href: "/admin/audit", icon: History, label: "Audit Logs" },
            ]
        }
    ];

    const toggleGroup = (title: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

    return (
        <aside className="w-72 h-screen bg-white border-r border-slate-100 flex flex-col p-6 sticky top-0">
            {/* Clinic Branding */}
            <div className="flex items-center gap-3 mb-10 px-2">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100/50">
                    <Image src="/logo.png" alt="Logo" width={24} height={24} />
                </div>
                <div>
                     <h1 className="text-sm font-bold bg-gradient-to-r from-emerald-700 to-teal-800 bg-clip-text text-transparent leading-none">
                        Fouzia Ishaq Clinic
                     </h1>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Admin Portal</p>
                </div>
            </div>

            <nav className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {/* Standalone Dashboard */}
                <div className="mb-2">
                    <SidebarItem 
                        href="/admin"
                        icon={LayoutDashboard}
                        label="Dashboard"
                        active={pathname === "/admin"}
                    />
                </div>

                <div className="h-px bg-slate-100 my-2 mx-4" />

                {menuGroups.map((group, idx) => {
                    const isExpanded = !!expandedGroups[group.title];
                    return (
                        <div key={idx} className="space-y-1">
                            <button 
                                onClick={() => toggleGroup(group.title)}
                                className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-emerald-700 hover:bg-emerald-50/50 rounded-xl transition-all"
                            >
                                <span>{group.title}</span>
                                {isExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                ) : (
                                    <ChevronRight className="w-3 h-3" />
                                )}
                            </button>
                            
                            {isExpanded && (
                                <div className="flex flex-col gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {group.items.map((item) => (
                                        <SidebarItem 
                                            key={item.href}
                                            href={item.href}
                                            icon={item.icon}
                                            label={item.label}
                                            active={pathname === item.href}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="mt-auto border-t border-slate-100 pt-6 flex flex-col gap-4">
                 {/* Live Session Status */}
                 <div className="px-4 py-2 bg-emerald-50/50 border border-emerald-100/50 rounded-xl flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Live Session</span>
                 </div>

                 {/* User Profile Info */}
                 <div className="px-2">
                     <UserProfile />
                 </div>

                 {/* Premium Logout Button */}
                 <button 
                    onClick={async () => {
                        try {
                            await logoutUser();
                        } finally {
                            router.replace("/");
                            router.refresh();
                        }
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all w-full border border-transparent hover:border-rose-100"
                 >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-bold">Logout</span>
                 </button>
            </div>
        </aside>
    );
};

