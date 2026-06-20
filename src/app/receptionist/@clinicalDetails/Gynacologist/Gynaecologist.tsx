"use client";
import ParaDetailsForm from "./allForms/ParaDetaisl";
import MenstrualHistory from "./allForms/MenstrualHistory";
import CurrentPregnancy from "./allForms/CurrentPregnancy";
import ObstetricHistory from "./allForms/ObstetricHistory";
import { Droplet, HeartPulse, ClipboardList, Hash } from "lucide-react";

const TABS = [
  { id: "Menstrual History", icon: Droplet, label: "Menstrual History" },
  { id: "Current Pregnancy", icon: HeartPulse, label: "Current Pregnancy" },
  { id: "Obstetric History", icon: ClipboardList, label: "Obstetric History" },
  { id: "Para Details", icon: Hash, label: "Para Details" },
];

export default function Gynaecologist({
  patientId,
  layoutMode,
  activeTab,
}: {
  patientId: string | null;
  layoutMode: "tabbed" | "full";
  activeTab: string;
  onTabChange?: (tab: string) => void;
}) {
  
  const renderForm = (id: string) => {
    switch (id) {
      case "Menstrual History": return <MenstrualHistory />;
      case "Current Pregnancy": return <CurrentPregnancy />;
      case "Obstetric History": return <ObstetricHistory />;
      case "Para Details": return <ParaDetailsForm />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto custom-scrollbar p-6 pt-2">
        <div className="max-w-6xl mx-auto space-y-6">
          {layoutMode === "tabbed" ? (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm min-h-[300px]">
               <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                  <div className="p-2 bg-primary/10 text-primary rounded-md">
                    {(() => {
                      const Icon = TABS.find((t) => t.id === activeTab)?.icon;
                      return Icon ? <Icon className="h-5 w-5" aria-hidden /> : null;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-foreground leading-none">{TABS.find(t => t.id === activeTab)?.label}</h3>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mt-1">Documentation View</p>
                  </div>
               </div>
               {renderForm(activeTab)}
            </div>
          ) : (
            <div className="space-y-6 pb-20">
              {TABS.map((tab) => (
                <section
                  key={tab.id}
                  id={tab.id}
                  className="bg-card border border-border rounded-lg p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-6 border-b border-border pb-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-md">
                      <tab.icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-foreground leading-none">{tab.label}</h3>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mt-1">Clinical Record Section</p>
                    </div>
                  </div>
                  {renderForm(tab.id)}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
