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
  if (error) return <p className="text-center p-8 text-destructive">{error}</p>;

  return (
    <div className="p-6 bg-background min-h-screen">
      {/* Date Range Filter */}
      <div className="flex justify-end items-center gap-4 mb-6 bg-card p-4 rounded-lg shadow-sm">
        <label className="font-semibold text-foreground">Date Range:</label>
        <input
          type="date"
          className="border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          value={getDateInputInTimezone(startDate, systemTimezone)}
          onChange={(e) => setStartDate(new Date(e.target.value))}
        />
        <input
          type="date"
          className="border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          value={getDateInputInTimezone(endDate, systemTimezone)}
          onChange={(e) => setEndDate(new Date(e.target.value))}
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                <button className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-md">
                  {expanded ? "▲":">"}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Patient</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Age</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Gender</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Total Orders</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order: GroupedPatientOrders) => (
              <>
                {/* Patient Row */}
                <tr
                  key={order.patient_id}
                  onClick={() => toggleExpand(order.patient_id)}
                  className="border-b border-border hover:bg-accent cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-muted-foreground">
                      {expanded.has(order.patient_id) ? "▲" : "▼"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-foreground">{order.patient_name}</td>
                  <td className="px-6 py-4 text-foreground">{order.age}</td>
                  <td className="px-6 py-4 text-foreground">{order.gender}</td>
                  <td className="px-6 py-4 text-foreground">{order.total_orders}</td>
                </tr>

                {/* Expanded Test Details */}
                {expanded.has(order.patient_id) &&
                  order.orders.map((test: OrderItem) => (
                    <tr key={test.order_id} className="bg-muted/50">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="bg-card rounded-lg p-6 shadow-sm border border-border space-y-4">
                          {/* Urgency */}
                          <div className="flex items-start gap-4">
                            <span className="font-semibold text-foreground min-w-[140px]">Urgency:</span>
                            <span
                              className={`px-3 py-1 rounded-md text-sm font-medium ${
                                test.urgency === "Routine"
                                  ? "bg-success/10 text-success"
                                  : test.urgency === "Urgent"
                                  ? "bg-warning/15 text-warning-foreground"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {test.urgency}
                            </span>
                          </div>

                          {/* Test Name */}
                          <div className="flex items-start gap-4">
                            <span className="font-semibold text-foreground min-w-[140px]">Test Ordered:</span>
                            <span className="text-foreground">{test.test_name}</span>
                          </div>

                          {/* Status */}
                          <div className="flex items-start gap-4">
                            <span className="font-semibold text-foreground min-w-[140px]">Status:</span>
                            <span
                              className={`px-3 py-1 rounded-md text-sm font-medium ${
                                test.status === "Order Not Taken" || test.status === "Pesanan tidak diambil"
                                  ? "bg-destructive/10 text-destructive"
                                  : test.status === "Completed"
                                  ? "bg-success/10 text-success"
                                  : "bg-warning/15 text-warning-foreground"
                              }`}
                            >
                              {test.status}
                            </span>
                          </div>

                          {/* Order Number */}
                          <div className="flex items-start gap-4">
                            <span className="font-semibold text-foreground min-w-[140px]">Order Number:</span>
                            <span className="text-foreground font-mono tabular-nums">{test.order_id}</span>
                          </div>

                          {/* Order Date */}
                          <div className="flex items-start gap-4">
                            <span className="font-semibold text-foreground min-w-[140px]">Order Date:</span>
                            <span className="text-foreground">
                              {formatDateInTimezone(test.order_date, systemTimezone, {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </span>
                          </div>

                          {/* Ordered By */}
                          <div className="flex items-start gap-4">
                            <span className="font-semibold text-foreground min-w-[140px]">Ordered By:</span>
                            <span className="text-foreground">{test.ordered_by}</span>
                          </div>

                          {/* Instructions */}
                          <div className="flex items-start gap-4">
                            <span className="font-semibold text-foreground min-w-[140px]">Instructions:</span>
                            <span className="text-foreground">
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
                              className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors"
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
            className="w-full max-w-3xl rounded-lg bg-card p-6 shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <LabResult order={activeOrder} onDone={() => setActiveOrder(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
