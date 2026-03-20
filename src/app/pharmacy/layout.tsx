"use client"
import { PatientContextProvider } from "@/contexts/PatientIdContext";
import Image from "next/image";
import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PurchaseReturn } from "@/src/features/pharmacy/purchaseReturn/components/PurchaseReturn";
import { PartiesView } from "@/src/features/pharmacy/parties";
import { TransactionsView } from "@/src/features/pharmacy/transactions";
import { SessionControls } from "@/src/components/session/SessionControls";
import {
  ShoppingCart,
  PlusCircle,
  History,
  Users,
  ArrowLeftRight,
  Layout,
  BarChart3
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
        children={children}
      />
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
    { id: "medicines", label: "Medicines", icon: <PlusCircle size={16} /> },
    { id: "reports", label: "Reports", icon: <BarChart3 size={16} /> },
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] font-sans">
      {/* Premium Clinic Header */}
      <div className="px-6 py-3 border-b border-slate-200/60 bg-white shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-10 w-10 bg-emerald-50 rounded-xl p-1.5 flex items-center justify-center border border-emerald-100/50">
            <Image src="/logo.png" alt="Clinic Logo" width={28} height={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-700 to-teal-800 bg-clip-text text-transparent leading-none">
              Fouzia Ishaq Clinic
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pharmacy Portal</p>
          </div>
        </div>

        <SessionControls />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 p-6 overflow-hidden">
        <PatientContextProvider>
          <div className="flex flex-col flex-1 bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/50 overflow-hidden relative">

            {/* Header with Switcher */}
            <div className="p-6 flex items-center justify-between border-b border-slate-100/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                  <Layout size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 leading-none">Dashboard View</h2>
                  <p className="text-[12px] text-slate-400 font-medium mt-1 uppercase tracking-tight">Active Module: {selectedTab}</p>
                </div>
              </div>

              {/* Enhanced Tab Switcher */}
              <div className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/40">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-300
                      ${selectedTab === tab.id
                        ? "bg-white text-emerald-600 shadow-sm border border-slate-200/60 scale-[1.05]"
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
                      }
                    `}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parallel Route Content Wrapper */}
            <div className="flex-1 overflow-auto custom-scrollbar p-6">
              <div className="min-h-full w-full animate-in fade-in zoom-in-95 duration-500">
                {selectedTab === "retail" && retail}
                {selectedTab === "purchases" && purchase}
                {selectedTab === "purchaseReturn" && <PurchaseReturn />}
                {selectedTab === "medicines" && medicines}
                {selectedTab === "reports" && reports}
                {selectedTab === "addParty" && <PartiesView />}
                {selectedTab === "transactions" && <TransactionsView />}
                {children}
              </div>
            </div>
          </div>
        </PatientContextProvider>
      </div>
    </div>
  );
}
