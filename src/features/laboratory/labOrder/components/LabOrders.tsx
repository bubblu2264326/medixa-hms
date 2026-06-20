"use client";
import { useState } from "react";
import { useLabOrders } from "../hooks/useLaborders";
import { GroupedPatientOrders, OrderItem } from "../types";
import { formatDateInTimezone, getDateInputInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";
import LabResult from "@/src/features/laboratory/labResult/components/LabResult";
import type { ActiveOrder } from "@/src/features/laboratory/labResult/types";

export default function LabOrders() {
  const systemTimezone = useSystemTimezone();
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const {
    orders,
    loading,
    error,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    toggleExpand,
    expanded
  } = useLabOrders();

  if (loading) return <p className="text-center p-8">Loading...</p>;
  if (error) return <p className="text-center p-8 text-red-600">{error}</p>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Date Range Filter */}
      <div className="flex justify-end items-center gap-4 mb-6 bg-white p-4 rounded-lg shadow">
        <label className="font-semibold text-gray-700">Date Range:</label>
        <input
          type="date"
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={getDateInputInTimezone(startDate, systemTimezone)}
          onChange={(e) => setStartDate(new Date(e.target.value))}
        />
        <input
          type="date"
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={getDateInputInTimezone(endDate, systemTimezone)}
          onChange={(e) => setEndDate(new Date(e.target.value))}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-200 border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                <button className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded">
                  {expanded ? "▲":">"}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Patient</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Age</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Gender</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total Orders</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order: GroupedPatientOrders) => (
              <>
                {/* Patient Row */}
                <tr
                  key={order.patient_id}
                  onClick={() => toggleExpand(order.patient_id)}
                  className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-gray-600">
                      {expanded.has(order.patient_id) ? "▲" : "▼"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-800">{order.patient_name}</td>
                  <td className="px-6 py-4 text-gray-800">{order.age}</td>
                  <td className="px-6 py-4 text-gray-800">{order.gender}</td>
                  <td className="px-6 py-4 text-gray-800">{order.total_orders}</td>
                </tr>

                {/* Expanded Test Details */}
                {expanded.has(order.patient_id) &&
                  order.orders.map((test: OrderItem) => (
                    <tr key={test.order_id} className="bg-gray-50">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 space-y-4">
                          {/* Urgency */}
                          <div className="flex items-start gap-4">
                            <span className="font-semibold text-gray-700 min-w-[140px]">Urgency:</span>
                            <span
                              className={`px-3 py-1 rounded text-sm font-medium ${
                                test.urgency === "Routine"
                                  ? "bg-green-100 text-green-700"
                                  : test.urgency === "Urgent"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {test.urgency}
                            </span>
                          </div>

                          {/* Test Name */}
                          <div className="flex items-start gap-4">
                            <span className="font-semibold text-gray-700 min-w-[140px]">Test Ordered:</span>
                            <span className="text-gray-800">{test.test_name}</span>
                          </div>

                          {/* Status */}
                          <div className="flex items-start gap-4">
                            <span className="font-semibold text-gray-700 min-w-[140px]">Status:</span>
                            <span
                              className={`px-3 py-1 rounded text-sm font-medium ${
                                test.status === "Order Not Taken" || test.status === "Pesanan tidak diambil"
                                  ? "bg-red-100 text-red-700"
                                  : test.status === "Completed"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {test.status}
                            </span>
                          </div>

                          {/* Order Number */}
                          <div className="flex items-start gap-4">
                            <span className="font-semibold text-gray-700 min-w-[140px]">Order Number:</span>
                            <span className="text-gray-800">{test.order_id}</span>
                          </div>

                          {/* Order Date */}
                          <div className="flex items-start gap-4">
                            <span className="font-semibold text-gray-700 min-w-[140px]">Order Date:</span>
                            <span className="text-gray-800">
                              {formatDateInTimezone(test.order_date, systemTimezone, {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </span>
                          </div>

                          {/* Ordered By */}
                          <div className="flex items-start gap-4">
                            <span className="font-semibold text-gray-700 min-w-[140px]">Ordered By:</span>
                            <span className="text-gray-800">{test.ordered_by}</span>
                          </div>

                          {/* Instructions */}
                          <div className="flex items-start gap-4">
                            <span className="font-semibold text-gray-700 min-w-[140px]">Instructions:</span>
                            <span className="text-gray-800">
                              {/* {test.instruction || "No instructions provided."} */}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3 pt-4">
                            <button
                              onClick={() =>
                                setActiveOrder({
                                  orderId: test.order_id,
                                  testId: test.test_id,
                                  testName: test.test_name,
                                  patientName: order.patient_name,
                                })
                              }
                              className="px-4 py-2 bg-teal-600 text-white font-medium rounded hover:bg-teal-700 transition-colors"
                            >
                              Enter Results
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Result-entry modal driven by the selected pending order */}
      {activeOrder && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 md:p-8"
          onClick={() => setActiveOrder(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <LabResult order={activeOrder} onDone={() => setActiveOrder(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
