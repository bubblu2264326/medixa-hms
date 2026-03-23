import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MedicineForm from "@/src/features/pharmacy/medicines/components/MedicineForm";

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

type RecommendationResponse = {
  suggestions: {
    brandNames: string[];
    genericNames: string[];
    categories: string[];
    manufacturers: string[];
    forms: string[];
    dosageUnits: string[];
    subUnits: string[];
  };
  prediction: null;
  generated: {
    sku: string;
  };
  stockGuidance: {
    minStockLevel: number | null;
    maxStockLevel: number | null;
  };
};

const defaultRecommendations: RecommendationResponse = {
  suggestions: {
    brandNames: [],
    genericNames: [],
    categories: ["Analgesic", "Antibiotic"],
    manufacturers: ["GSK", "Getz"],
    forms: ["Tablet", "Capsule"],
    dosageUnits: ["mg", "ml"],
    subUnits: ["Blister", "Strip"],
  },
  prediction: null,
  generated: {
    sku: "MED-001",
  },
  stockGuidance: {
    minStockLevel: 10,
    maxStockLevel: 1000,
  },
};

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

describe("MedicineForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.startsWith("/api/medicine/recommendations")) {
        return Promise.resolve(jsonResponse(defaultRecommendations));
      }

      if (url === "/api/medicine/masters" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { type: string; name: string };

        return Promise.resolve(
          jsonResponse({
            success: true,
            data: {
              id: 77,
              type: body.type,
              name: body.name.trim(),
            },
          }),
        );
      }

      if (url === "/api/medicine" && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ success: true, data: {} }));
      }

      return Promise.resolve(jsonResponse({}));
    }) as typeof fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new category from the dropdown and fills the field", async () => {
    render(<MedicineForm medicine={null} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const categoryInput = screen.getByLabelText("Category *");

    fireEvent.focus(categoryInput);
    fireEvent.change(categoryInput, { target: { value: "Pain Relief Special" } });

    const createButton = await screen.findByRole("button", {
      name: /Add new category/i,
    });

    fireEvent.click(createButton);

    await waitFor(() => {
      expect((screen.getByLabelText("Category *") as HTMLInputElement).value).toBe("Pain Relief Special");
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/medicine/masters",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("submits created master ids when saving a medicine", async () => {
    const onSuccess = vi.fn();
    render(<MedicineForm medicine={null} onClose={vi.fn()} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText("Product Name (Brand Name) *"), {
      target: { value: "Claromist-XT" },
    });
    fireEvent.change(screen.getByLabelText("Base Name / Composition (Generic Name) *"), {
      target: { value: "Desloratadine" },
    });

    const categoryInput = screen.getByLabelText("Category *");
    fireEvent.focus(categoryInput);
    fireEvent.change(categoryInput, { target: { value: "Allergy Relief Plus" } });
    fireEvent.click(
      await screen.findByRole("button", {
        name: /Add new category/i,
      }),
    );

    const manufacturerInput = screen.getByLabelText("Manufacturer");
    fireEvent.focus(manufacturerInput);
    fireEvent.change(manufacturerInput, { target: { value: "NovaCrest Labs" } });
    fireEvent.click(
      await screen.findByRole("button", {
        name: /Add new manufacturer/i,
      }),
    );

    const formInput = screen.getByLabelText("Form");
    fireEvent.focus(formInput);
    fireEvent.change(formInput, { target: { value: "Oral Film" } });
    fireEvent.click(
      await screen.findByRole("button", {
        name: /Add new form/i,
      }),
    );

    await waitFor(() => {
      expect((screen.getByRole("button", { name: "Add Product" }) as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Product" }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    const saveCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      ([url, init]) => url === "/api/medicine" && init?.method === "POST",
    );

    expect(saveCall).toBeTruthy();

    const payload = JSON.parse(String(saveCall?.[1]?.body)) as Record<string, unknown>;
    expect(payload.category).toBe("Allergy Relief Plus");
    expect(payload.category_id).toBe(77);
    expect(payload.manufacturer).toBe("NovaCrest Labs");
    expect(payload.manufacturer_id).toBe(77);
    expect(payload.form).toBe("Oral Film");
    expect(payload.form_id).toBe(77);
  }, 15000);
});
