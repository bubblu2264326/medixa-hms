"use client";
import { PatientContextProvider } from "@/contexts/PatientIdContext";
import Image from "next/image";
import { useState } from "react";
import { redirect } from "next/navigation";
import { Button } from "@/src/components/ui/Button";
import { logoutUser } from "@/src/features/Login/api";
export default function LabTechnician({
  sampleCollection,
  testResults,
  labOrders,
}: {
  sampleCollection: React.ReactNode;
  testResults: React.ReactNode;
  labOrders: React.ReactNode;
}) {
  const [selectedTab, setSelectedTab] = useState("sampleCollection");

  return (
    <div className="flex flex-col h-screen w-screen">
      {/* Clinic Header */}
      <div className="border-b border-border flex items-center justify-center bg-card">
        <div className="relative h-[7dvh] w-[7dvh] overflow-hidden">
          <Image src="/logo_mark.png" alt="Medixa" fill sizes="7dvh" className="object-cover" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-primary">
          Medixa
        </h1>
        <Button onClick={async () => {
          await logoutUser()
          redirect("/")
        }} className="absolute right-2">Logout</Button>
      </div>

      {/* Lab Technician Header */}
      <div className="border-b border-border flex items-center bg-muted px-6 py-2.5">
        <h1 className="text-base font-semibold tracking-tight text-foreground">
          Lab Technician&apos;s View
        </h1>
      </div>

      {/* Container with queue + tabs */}
      <div
        id="container"
        className="flex w-full h-full min-h-0 bg-background p-4"
      >
        <PatientContextProvider>
          {/* Tabs + Content */}
          <div className="p-4 rounded-lg border-border border w-full bg-card shadow-sm flex flex-col min-h-0">
            {/* Tabs */}
            <div
              id="tabs"
              className="w-fit p-1 border border-border rounded-md flex items-center gap-1 bg-muted"
            >
              <button
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${selectedTab === "sampleCollection"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
                onClick={() => setSelectedTab("sampleCollection")}
              >
                Sample Collection
              </button>
              <button
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${selectedTab === "testResults"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
                onClick={() => setSelectedTab("testResults")}
              >
                Test Results
              </button>
              <button
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${selectedTab === "labOrders"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
                onClick={() => setSelectedTab("labOrders")}
              >
                Lab Orders
              </button>
            </div>

            {/* Tab Content */}
            <div id="tab-content" className="mt-3 flex-1 overflow-auto">
              {selectedTab === "sampleCollection" ? sampleCollection : null}
              {selectedTab === "testResults" ? testResults : null}
              {selectedTab === "labOrders" ? labOrders : null}
            </div>
          </div>
        </PatientContextProvider>
      </div>
    </div>
  );
}
