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
  ChevronRight,
  Bell,
  FileText,
  ShieldAlert
} from "lucide-react";
import { logoutUser } from "@/src/features/Login/api";
import Image from "next/image";
import { UserProfile } from "@/src/components/session/UserProfile";
import { SidebarAttendance } from "@/src/components/admin/SidebarAttendance";
import { useState, useEffect, useMemo } from "react";

const SidebarItem = ({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) => (
  <Link
    href={href}
    className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group ${
      active 
        ? "bg-primary text-white shadow-lg " 
        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? "text-white" : "group-hover:text-primary"}`} />
    <span className="text-sm font-semibold">{label}</span>
  </Link>
);

export const AdminSidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const menuGroups = useMemo(() => [
        {
            title: "Staff Management",
            items: [
                { href: "/admin/staff", icon: Users, label: "Directory" },
                { href: "/admin/staff/access", icon: Settings, label: "Access & Roles" },
                { href: "/admin/staff/security", icon: History, label: "Security Sessions" },
                { href: "/admin/attendance", icon: CalendarCheck, label: "Attendance" },
                { href: "/admin/roster", icon: CalendarCheck, label: "Roster" },
                { href: "/admin/leave", icon: CalendarCheck, label: "Leave" },
                { href: "/admin/approvals", icon: CalendarCheck, label: "Approvals" },
                { href: "/admin/credentialing", icon: Users, label: "Credentialing" },
                { href: "/admin/lifecycle", icon: Users, label: "Lifecycle" },
                { href: "/admin/documents", icon: History, label: "Documents" },
                { href: "/admin/analytics", icon: LayoutDashboard, label: "Analytics" },
                { href: "/admin/staff/settings", icon: Settings, label: "Employee Settings" },
            ]
        },
        {
            title: "Pharmacy",
            items: [
                { href: "/admin/inventory", icon: Package, label: "Inventory" },
                { href: "/admin/cashier", icon: HandCoins, label: "Pharmacy Financials" },
                { href: "/admin/narcotics", icon: ShieldAlert, label: "Narcotics Register" },
            ]
        },
        {
            title: "Financials",
            items: [
                { href: "/admin/financials", icon: IndianRupee, label: "System Finance" },
                { href: "/admin/payroll", icon: HandCoins, label: "Payroll Runs" },
                { href: "/admin/fbr-invoices", icon: FileText, label: "FBR Invoicing" },
            ]
        },
        {
            title: "General System",
            items: [
                { href: "/admin/settings", icon: Settings, label: "Settings" },
                { href: "/admin/audit", icon: History, label: "Audit Logs" },
                { href: "/admin/notifications", icon: Bell, label: "Notifications" },
            ]
        }
    ], []);

    const toggleGroup = (title: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

    // Auto-expand group containing the active item
    useEffect(() => {
        setExpandedGroups(prev => {
            const next = { ...prev };
            let changed = false;

            menuGroups.forEach(group => {
                const hasActiveItem = group.items.some(item => item.href === pathname);
                if (hasActiveItem && !next[group.title]) {
                    next[group.title] = true;
                    changed = true;
                }
            });

            return changed ? next : prev;
        });
    }, [pathname, menuGroups]);

    return (
        <aside className="w-72 h-screen bg-white border-r border-border flex flex-col p-6 sticky top-0">
            {/* Clinic Branding */}
            <div className="flex items-center gap-3 mb-10 px-2">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/30/50">
                    <Image src="/logo.png" alt="Logo" width={24} height={24} />
                </div>
                <div>
                     <h1 className="text-sm font-bold     text-foreground leading-none">
                        Fouzia Ishaq Clinic
                     </h1>
                     <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Admin Portal</p>
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

                <div className="h-px bg-muted my-2 mx-4" />

                {menuGroups.map((group, idx) => {
                    const isExpanded = !!expandedGroups[group.title];
                    return (
                        <div key={idx} className="space-y-1">
                            <button 
                                onClick={() => toggleGroup(group.title)}
                                className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary hover:bg-primary/10/50 rounded-xl transition-all"
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

            <div className="mt-auto border-t border-border pt-6 flex flex-col gap-4">
                 {/* Live Session Status */}
                 <div className="px-4 py-2 bg-primary/10/50 border border-primary/30/50 rounded-xl flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Live Session</span>
                 </div>

                 {/* User Profile Info */}
                 <div className="px-2">
                     <UserProfile />
                 </div>

                 {/* Sidebar Attendance */}
                 <SidebarAttendance />

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
                    className="flex items-center gap-3 px-4 py-3 rounded-md text-destructive hover:bg-destructive/10 transition-all w-full border border-transparent hover:border-destructive/30"
                 >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-bold">Logout</span>
                 </button>
            </div>
        </aside>
    );
};
