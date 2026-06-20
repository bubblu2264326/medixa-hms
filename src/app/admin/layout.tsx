import React from "react";
import { AdminSidebar } from "@/src/components/admin/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-background font-sans text-foreground overflow-x-hidden">
            {/* Sidebar (Fixed) */}
            <AdminSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
                {/* Main Scrollable Content */}
                <main className="flex-1 px-8 pt-2 pb-8 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
