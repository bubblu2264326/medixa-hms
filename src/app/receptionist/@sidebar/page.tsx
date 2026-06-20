"use client"
import { ClinicalDetailsProvider } from "@/contexts/ClinicalDetailsContext"
import { useSidebar } from "@/contexts/SidebarContext"

export default function Page() {
  const { activeTab, setActiveTab } = useSidebar();

  return (
    <div className=" p-2 rounded-lg border-border flex   w-full h-full">
      <div
        id="tab"
        className=" w-[16%]  p-2 border border-border    rounded-lg flex items-center  bg-muted "
      >
        <button
          className={`  px-4    text-center ${activeTab === "queue"
              ? "bg-primary text-primary-foreground rounded-md"
              : null
            }`}
          onClick={() => setActiveTab("queue")}
        >
          Queue Mangement
        </button>
        <button
          className={` px-4      text-center  ${activeTab === "patientRegistration"
              ? "bg-primary text-primary-foreground rounded-md"
              : null
            }`}
          onClick={() => setActiveTab("patientRegistration")}
        >
          Patient Registration
        </button>
        <button
          className={` px-4     text-center  ${activeTab === "patientVitals"
              ? "bg-primary text-primary-foreground rounded-md"
              : null
            }`}
          onClick={() => setActiveTab("patientVitals")}
        >
          Patient Vitals
        </button>
        <button
          className={` px-4     text-center  ${activeTab === "clinicalDetails"
              ? "bg-primary text-primary-foreground rounded-md"
              : null
            }`}
          onClick={() => setActiveTab("clinicalDetails")}
        >
          Clinical Details
        </button>



      </div>

      <div id="tab-paralell-routes" className="relative w-[90%] ">
        <div className="absolute top-2  left-50">

        </div>
        {/* {selectedTab === "queue" ? queueManagement : null}
            {selectedTab === "patientRegistration" ? patientRegistration : null}
            {selectedTab === "patientVitals" ? patientVitals : null}
            {selectedTab === "clinicalDetails" ? clinicalDetails : null} */}
      </div>

    </div>
  )
}
