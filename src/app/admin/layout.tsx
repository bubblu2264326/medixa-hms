import React from "react";
import { AdminSidebar } from "@/src/components/admin/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
            {/* Sidebar (Fixed) */}
            <AdminSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
                {/* Clean Header */}
                <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0">
                    <div>
                        {/* Placeholder for page specific titles if needed */}
                    </div>
                </header>

                {/* Main Scrollable Content */}
                <main className="flex-1 p-8 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
