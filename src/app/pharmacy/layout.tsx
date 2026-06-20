"use client"
import { PatientContextProvider } from "@/contexts/PatientIdContext";
import Image from "next/image";
import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PurchaseReturn } from "@/src/features/pharmacy/purchaseReturn/components/PurchaseReturn";
import { PartiesView } from "@/src/features/pharmacy/parties";
import { TransactionsView } from "@/src/features/pharmacy/transactions";
import { SettingsView } from "@/src/features/pharmacy/settings";
import { SessionControls } from "@/src/components/session/SessionControls";
import {
  ShoppingCart,
  PlusCircle,
  History,
  Users,
  ArrowLeftRight,
  BarChart3,
  Settings
} from "lucide-react";


export default function Pharmacist({
  retail,
  returnMedicine,
  purchase,
  medicines,
  reports,
  children
}: {
  retail: React.ReactNode;
  returnMedicine: React.ReactNode;
  purchase: React.ReactNode;
  medicines: React.ReactNode;
  reports: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
      <PharmacistContent
        retail={retail}
        returnMedicine={returnMedicine}
        purchase={purchase}
        medicines={medicines}
        reports={reports}
      >
        {children}
      </PharmacistContent>
    </Suspense>
  )
}

function PharmacistContent({
  retail,
  returnMedicine,
  purchase,
  medicines,
  reports,
  children
}: {
  retail: React.ReactNode;
  returnMedicine: React.ReactNode;
  purchase: React.ReactNode;
  medicines: React.ReactNode;
  reports: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  void returnMedicine;
  
  const selectedTab = searchParams.get('tab') || 'retail';

  const setSelectedTab = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    
    // Clear action-specific params when manually switching tabs
    params.delete('mode');
    params.delete('ref');
    
    router.push(`${pathname}?${params.toString()}`);
  }

  const tabs = [
    { id: "retail", label: "Retail", icon: <ShoppingCart size={16} /> },
    { id: "purchases", label: "Purchases", icon: <PlusCircle size={16} /> },
    { id: "transactions", label: "Transactions", icon: <History size={16} /> },
    { id: "addParty", label: "Parties", icon: <Users size={16} /> },
    { id: "purchaseReturn", label: "P. Return", icon: <ArrowLeftRight size={16} /> },
    { id: "medicines", label: "Products", icon: <PlusCircle size={16} /> },
    { id: "reports", label: "Reports", icon: <BarChart3 size={16} /> },
    { id: "settings", label: "Settings", icon: <Settings size={16} /> },
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-background font-sans">
      {/* Clinic Header */}
      <div className="px-6 py-2 border-b border-border bg-card shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 bg-primary/10 rounded-md p-1 flex items-center justify-center border border-primary/20">
            <Image src="/logo.png" alt="Clinic Logo" width={24} height={24} />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground leading-none">
              Fouzia Ishaq Clinic
            </h1>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">Pharmacy Portal</p>
          </div>
        </div>

        <SessionControls />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 p-4 overflow-hidden">
        <PatientContextProvider>
          <div className="flex flex-col flex-1 bg-card rounded-lg border border-border shadow-sm overflow-hidden">

            {/* Compact module tab switcher */}
            <div className="px-4 py-2 border-b border-border flex items-center gap-3 overflow-x-auto">
              <div className="bg-muted p-1 rounded-md flex items-center gap-1 border border-border w-fit">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${selectedTab === tab.id
                      ? "bg-card text-primary shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parallel Route Content Wrapper */}
            <div className="flex-1 overflow-auto custom-scrollbar p-4">
              <div className="min-h-full w-full">
                {selectedTab === "retail" && retail}
                {selectedTab === "purchases" && purchase}
                {selectedTab === "purchaseReturn" && <PurchaseReturn />}
                {selectedTab === "medicines" && medicines}
                {selectedTab === "reports" && reports}
                {selectedTab === "addParty" && <PartiesView />}
                {selectedTab === "transactions" && <TransactionsView />}
                {selectedTab === "settings" && <SettingsView />}
                {children}
              </div>
            </div>
          </div>
        </PatientContextProvider>
      </div>
    </div>
  );
}
