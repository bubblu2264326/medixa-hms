"use client";
import { useReturnMedicine } from "../hooks/useReturnMedicine";
import { formatDateInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

export default function ReturnMedicine() {
  const systemTimezone = useSystemTimezone();
  const {
    pId,
    setpId,
    data,
    selected,
    selectAll,
    setPatientId,
    loading,
    reason,
    setReason,
    handleCheckboxChange,
    handleSelectAll,
    returnMedicine,
  } = useReturnMedicine();

  return (
    <div>
      {/* Patient ID Input */}
      <div className="flex flex-col">
        <label htmlFor="pid" className="px-2 pb-1 text-sm text-black/70">
          Patient Id:
        </label>
        <input
          id="pid"
          type="text"
          placeholder="Enter Patient Id"
          className="w-[40%] p-2 bg-gray-200 rounded-2xl"
          value={pId}
          onChange={(e) => setpId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setPatientId(pId);
          }}
        />
      </div>

      {/* Reason Input */}
      <div className="flex flex-col mt-4">
        <label htmlFor="reason" className="px-2 pb-1 text-sm text-black/70">
          Reason for Return:
        </label>
        <input
          id="reason"
          type="text"
          placeholder="Enter reason for returning medicine"
          className="w-[60%] p-2 bg-gray-200 rounded-2xl"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {/* Medicines Table */}
      <div className="mt-4">
        <h1 className="py-2 mb-2 text-3xl font-semibold border-b-2 w-fit">
          Dispensed Medicines
        </h1>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <table className="border border-gray-300 w-full text-left text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">
                  <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                </th>
                <th className="border px-2 py-1">Order Date</th>
                <th className="border px-2 py-1">Brand</th>
                <th className="border px-2 py-1">Generic</th>
                <th className="border px-2 py-1">Dosage</th>
                <th className="border px-2 py-1">Form</th>
                <th className="border px-2 py-1">Freq.</th>
                <th className="border px-2 py-1">Duration</th>
                <th className="border px-2 py-1">Qty Prescribed</th>
                <th className="border px-2 py-1">Qty Dispensed</th>
                <th className="border px-2 py-1">Prescribed By</th>
                <th className="border px-2 py-1">Dispensed By</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((d, i) => (
                  <tr key={d.prescription_medicine_id} className="hover:bg-gray-50">
                    <td className="border px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selected[i] || false}
                        onChange={() => handleCheckboxChange(i)}
                      />
                    </td>
                    <td className="border px-2 py-1">{formatDateInTimezone(d.order_date, systemTimezone)}</td>
                    <td className="border px-2 py-1">{d.brand_name}</td>
                    <td className="border px-2 py-1">{d.generic_name}</td>
                    <td className="border px-2 py-1">{d.dosage_value} {d.dosage_unit}</td>
                    <td className="border px-2 py-1">{d.form}</td>
                    <td className="border px-2 py-1">{d.frequency}</td>
                    <td className="border px-2 py-1">{d.duration} days</td>
                    <td className="border px-2 py-1">{d.prescribed_quantity}</td>
                    <td className="border px-2 py-1">{d.dispensed_quantity}</td>
                    <td className="border px-2 py-1">{d.prescribed_by}</td>
                    <td className="border px-2 py-1">{d.dispensed_by}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="text-center text-gray-500">
                    No dispensed medicines found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Return Button */}
      <div className="flex space-x-6 col-span-2 pt-6">
        <button
          disabled={loading}
          className={`w-[20%] p-2 shadow-2xl rounded-2xl text-white 
            ${loading ? "bg-gray-400" : "bg-gradient-to-r from-[#F6ABAB] to-[#F53636]"}`}
          onClick={returnMedicine}
        >
          {loading ? "Processing..." : "Return Medicine"}
        </button>
      </div>
    </div>
  );
}
