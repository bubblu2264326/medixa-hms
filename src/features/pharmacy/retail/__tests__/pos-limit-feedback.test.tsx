import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const medicineFixture = vi.hoisted(() => ({
  id: 101,
  medicine_id: 101,
  brand_name: "TestMed",
  generic_name: "TestGeneric",
  barcode: "0000000000",
  sku: "TEST-101",
  price: 100,
  stock_quantity: 0,
  stock_sub_quantity: 0,
  sub_unit: "box",
  sub_units_per_unit: 10,
  sub_unit_price: 10,
  allow_sub_unit_sale: true,
  dosage_value: 10,
  dosage_unit: "mg",
  form: "tab",
  category: "otc" as const,
  batch_id: 11,
  batch_number: "BCH-11",
  batch_stock_quantity: 1,
  batch_stock_sub_quantity: 0,
  total_stock_quantity: 1,
  total_stock_sub_quantity: 0,
  min_stock_level: 0,
  expiry_date: "2027-01-01",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/pharmacy",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/contexts/PatientIdContext", () => ({
  usePatient: () => ({
    patientId: null,
    selectedVisitId: null,
    setPatientVisit: vi.fn(),
    clearSelection: vi.fn(),
  }),
}));

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock("@/src/features/pharmacy/retail/components/search", () => ({
  MedicineSearch: ({ onSelect }: { onSelect: (medicine: any) => void }) => (
    <button type="button" onClick={() => onSelect(medicineFixture)}>
      Select medicine
    </button>
  ),
}));

vi.mock("@/src/features/pharmacy/retail/components/cart", () => ({
  CartTable: () => null,
}));

vi.mock("@/src/features/pharmacy/retail/components/payment/CheckoutCard", () => ({
  CheckoutCard: () => null,
}));

vi.mock("@/src/features/pharmacy/retail/components/product-entry/AddProductButton", () => ({
  default: () => null,
}));

vi.mock("@/src/features/pharmacy/retail/hooks", () => ({
  useCart: () => ({
    cart: [],
    selectedItem: null,
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    loadCart: vi.fn(),
    selectItem: vi.fn(),
  }),
  usePayment: () => ({
    payment: {},
    setPaymentType: vi.fn(),
    setPaidAmount: vi.fn(),
    setAdjustment: vi.fn(),
    resetPayment: vi.fn(),
    loadPayment: vi.fn(),
  }),
  useMedicineSearch: () => ({
    results: [],
    isSearching: false,
    search: vi.fn(),
    clearResults: vi.fn(),
    invalidateCache: vi.fn(),
  }),
}));

vi.mock("@/src/features/pharmacy/retail/api", () => ({
  fetchPrescriptionSale: vi.fn(),
  searchPrescriptionPatients: vi.fn(),
  fetchActiveVisits: vi.fn(),
  updateVisitWorkflowStatus: vi.fn(),
  searchInvoices: vi.fn(async () => ({ success: true, data: [] })),
}));

import PharmacyPOS from "@/src/features/pharmacy/retail/components/PharmacyPOS";

describe("PharmacyPOS real-time limit feedback", () => {
  it("blocks Qty/Sub-Qty at stock limits and flashes red border on invalid attempts", () => {
    vi.useFakeTimers();

    render(<PharmacyPOS />);
    fireEvent.click(screen.getByText("Select medicine"));

    // Stock is 1 unit (perUnit=10), so Qty max is 1 and Sub-Qty max is 0 when Qty=1
    expect((screen.getByTestId("qty-input") as HTMLInputElement).value).toBe("1");
    expect((screen.getByTestId("subqty-input") as HTMLInputElement).value).toBe("0");

    fireEvent.click(screen.getByTestId("qty-inc"));
    expect((screen.getByTestId("qty-input") as HTMLInputElement).value).toBe("1");
    expect(screen.getByTestId("qty-field").className).toContain("border-rose-500");

    fireEvent.click(screen.getByTestId("subqty-inc"));
    expect((screen.getByTestId("subqty-input") as HTMLInputElement).value).toBe("0");
    expect(screen.getByTestId("subqty-field").className).toContain("border-rose-500");

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(screen.getByTestId("qty-field").className).not.toContain("border-rose-500");
    expect(screen.getByTestId("subqty-field").className).not.toContain("border-rose-500");

    vi.useRealTimers();
  });
});
