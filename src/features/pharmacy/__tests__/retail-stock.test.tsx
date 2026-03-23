import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MedicineSearch } from "@/src/features/pharmacy/retail/components/search/MedicineSearch";
import { useCart } from "@/src/features/pharmacy/retail/hooks/useCart";
import { getMedicineAvailability, validateRequestedStock } from "@/src/features/pharmacy/retail/stock";

const baseMedicine = {
  id: 5,
  medicine_id: 5,
  brand_name: "Glucophage",
  generic_name: "Metformin",
  barcode: "1234567890",
  sku: "GLUC-500",
  price: 50,
  stock_quantity: 0,
  stock_sub_quantity: 0,
  sub_unit: "box",
  sub_units_per_unit: 10,
  sub_unit_price: 5,
  allow_sub_unit_sale: true,
  dosage_value: 500,
  dosage_unit: "mg",
  form: "tab",
  category: "otc" as const,
  batch_id: 7,
  batch_number: "BCH-7",
  batch_stock_quantity: 0,
  batch_stock_sub_quantity: 0,
  batch_sale_price: 50,
  batch_sale_sub_unit_price: 5,
  total_stock_quantity: 0,
  total_stock_sub_quantity: 0,
  min_stock_level: 3,
};

describe("retail stock hardening", () => {
  it("accepts exact stock matches and compares mixed unit/sub-unit requests correctly", () => {
    const medicine = {
      ...baseMedicine,
      batch_stock_quantity: 1,
      batch_stock_sub_quantity: 5,
      total_stock_quantity: 1,
      total_stock_sub_quantity: 5,
      stock_quantity: 1,
      stock_sub_quantity: 5,
    };

    const exact = validateRequestedStock(medicine, 1, 5);
    const overflow = validateRequestedStock(medicine, 1, 6);

    expect(exact.valid).toBe(true);
    expect(overflow.valid).toBe(false);
    expect(overflow.message).toContain("Only 1 box + 5 tabs available");
  });

  it("marks medicines out of stock and low stock from normalized availability", () => {
    const outOfStock = getMedicineAvailability(baseMedicine);
    const lowStock = getMedicineAvailability({
      ...baseMedicine,
      batch_stock_quantity: 2,
      total_stock_quantity: 2,
      stock_quantity: 2,
    });

    expect(outOfStock.isOutOfStock).toBe(true);
    expect(lowStock.isLowStock).toBe(true);
  });

  it("disables out-of-stock medicines in search results and highlights low stock", () => {
    const onSelect = vi.fn();

    render(
      <MedicineSearch
        query="glu"
        results={[
          baseMedicine,
          {
            ...baseMedicine,
            id: 6,
            medicine_id: 6,
            brand_name: "Glucophage XR",
            batch_id: 8,
            batch_number: "BCH-8",
            batch_stock_quantity: 2,
            total_stock_quantity: 2,
            stock_quantity: 2,
            is_low_stock: true,
            is_out_of_stock: false,
          },
        ]}
        isSearching={false}
        onSearch={vi.fn()}
        onSelect={onSelect}
      />
    );

    const input = screen.getByPlaceholderText("Search for medicine");
    fireEvent.focus(input);

    fireEvent.click(screen.getByText("Glucophage"));
    expect(onSelect).not.toHaveBeenCalled();

    expect(screen.getByText("Out of stock")).toBeTruthy();
    expect(screen.getByText("Low stock")).toBeTruthy();
  });

  it("rejects cart quantity edits that exceed available stock", () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem(
        {
          ...baseMedicine,
          batch_stock_quantity: 1,
          total_stock_quantity: 1,
          stock_quantity: 1,
          is_out_of_stock: false,
        },
        1,
        0,
        0,
        50
      );
    });

    const itemId = result.current.cart[0].id;

    expect(() =>
      act(() => {
        result.current.updateItem(itemId, { quantity: 2 });
      })
    ).toThrowError("Only 1 box available in batch BCH-7");
  });
});
