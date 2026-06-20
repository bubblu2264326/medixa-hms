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
      <div className="border border-black/30 flex items-center justify-center bg-gray-50">
        <div className="relative h-[7dvh] w-[7dvh]">
          <Image src="/logo.png" alt="Clinic Logo" fill sizes="7dvh" />
        </div>
        <h1 className="text-3xl font-bold text-green-800/80">
          Fouzia Ishaq Clinic
        </h1>
        <Button onClick={async () => {
          await logoutUser()
          redirect("/")
        }} className="absolute right-2">Logout</Button>
      </div>

      {/* Lab Technician Header */}
      <div className="border border-black/30 flex items-center justify-center bg-green-50">
        <h1 className="text-2xl p-4 font-bold text-green-800/80">
          Lab Technician&apos;s View
        </h1>
      </div>

      {/* Container with queue + tabs */}
      <div
        id="container"
        className="flex space-x-4 w-full h-full bg-gray-100"
      >
        <PatientContextProvider>
          {/* Tabs + Content */}
          <div className="p-2 rounded-2xl border-black/30 border-2 w-full bg-white shadow-md">
            {/* Tabs */}
            <div
              id="tabs"
              className="w-[70%] p-2 border-2 border-black/30 rounded-4xl flex items-center gap-2 bg-gray-200"
            >
              <button
                className={`px-4 py-1 text-center ${selectedTab === "sampleCollection"
                    ? "bg-green-400 rounded-3xl border-black/30 border-2"
                    : ""
                  }`}
                onClick={() => setSelectedTab("sampleCollection")}
              >
                Sample Collection
              </button>
              <button
                className={`px-4 py-1 text-center ${selectedTab === "testResults"
                    ? "bg-green-400 rounded-3xl border-black/30 border-2"
                    : ""
                  }`}
                onClick={() => setSelectedTab("testResults")}
              >
                Test Results
              </button>
              <button
                className={`px-4 py-1 text-center ${selectedTab === "labOrders"
                    ? "bg-green-400 rounded-3xl border-black/30 border-2"
                    : ""
                  }`}
                onClick={() => setSelectedTab("labOrders")}
              >
                Lab Orders
              </button>
            </div>

            {/* Tab Content */}
            <div id="tab-content" className="mt-4">
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
