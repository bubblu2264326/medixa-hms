"use client";

import React, { useDeferredValue, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";

interface Medicine {
  medicine_id: number;
  id?: number;
  generic_name: string;
  brand_name: string;
  category: string;
  category_id?: number;
  dosage_value?: number;
  dosage_unit?: string;
  form?: string;
  form_id?: number;
  barcode?: string;
  sku?: string;
  manufacturer?: string;
  manufacturer_id?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  is_active?: boolean;
  requires_prescription?: boolean;
  sub_unit?: string;
  sub_units_per_unit?: number;
  unit_price?: number;
  sub_unit_price?: number;
  allow_sub_unit_sale?: boolean;
}

interface MedicineFormProps {
  medicine: Medicine | null;
  onClose: () => void;
  onSuccess: () => void;
}

type Confidence = "high" | "medium" | "low" | null;

type CatalogRecommendations = {
  suggestions: {
    brandNames: string[];
    genericNames: string[];
    categories: string[];
    manufacturers: string[];
    forms: string[];
    dosageUnits: string[];
    subUnits: string[];
  };
  prediction: (Partial<Medicine> & {
    source: string | null;
    confidence: Confidence;
  }) | null;
  generated: {
    sku: string;
  };
  stockGuidance: {
    minStockLevel: number | null;
    maxStockLevel: number | null;
  };
};

type MedicineMasterType = "category" | "manufacturer" | "form";

type MedicineMasterResponse = {
  success: boolean;
  data?: {
    id: number;
    name: string;
    type: MedicineMasterType;
  };
  error?: string;
};

const EMPTY_RECOMMENDATIONS: CatalogRecommendations = {
  suggestions: {
    brandNames: [],
    genericNames: [],
    categories: [],
    manufacturers: [],
    forms: [],
    dosageUnits: [],
    subUnits: [],
  },
  prediction: null,
  generated: {
    sku: "",
  },
  stockGuidance: {
    minStockLevel: null,
    maxStockLevel: null,
  },
};

const DEFAULT_FORM_VALUES: Partial<Medicine> = {
  generic_name: "",
  brand_name: "",
  category: "",
  dosage_value: undefined,
  dosage_unit: "",
  form: "",
  barcode: "",
  sku: "",
  manufacturer: "",
  min_stock_level: undefined,
  max_stock_level: undefined,
  is_active: true,
  requires_prescription: false,
  sub_unit: "",
  sub_units_per_unit: 1,
  sub_unit_price: undefined,
  allow_sub_unit_sale: false,
};

function isMissingValue(value: unknown) {
  return value === undefined || value === null || value === "";
}

function cleanString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function sanitizeFormData(formData: Partial<Medicine>): Partial<Medicine> {
  return {
    ...formData,
    generic_name: cleanString(formData.generic_name),
    brand_name: cleanString(formData.brand_name),
    category: cleanString(formData.category),
    dosage_unit: cleanString(formData.dosage_unit),
    form: cleanString(formData.form),
    barcode: cleanString(formData.barcode),
    sku: cleanString(formData.sku),
    manufacturer: cleanString(formData.manufacturer),
    sub_unit: cleanString(formData.sub_unit),
    dosage_value: formData.dosage_value ?? undefined,
    min_stock_level: formData.min_stock_level ?? undefined,
    max_stock_level: formData.max_stock_level ?? undefined,
    sub_units_per_unit: formData.sub_units_per_unit ?? undefined,
    sub_unit_price: formData.sub_unit_price ?? undefined,
  };
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white/95 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)] sm:p-5">
      <div className="mb-3 flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-700">{eyebrow}</span>
        <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
        {description ? <p className="max-w-2xl text-sm text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  name,
  value,
  required,
  type = "text",
  step,
  min,
  placeholder,
  helperText,
  suggestions = [],
  onChange,
  onSuggestionSelect,
  createActionLabel,
  onCreateOption,
  onCreateStateChange,
}: {
  id: string;
  label: string;
  name: string;
  value: string | number | undefined;
  required?: boolean;
  type?: "text" | "number";
  step?: string;
  min?: number | string;
  placeholder?: string;
  helperText?: string;
  suggestions?: Array<string | number>;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSuggestionSelect?: (value: string | number) => void;
  createActionLabel?: string;
  onCreateOption?: (value: string) => Promise<void>;
  onCreateStateChange?: (isCreating: boolean) => void;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const supportsSuggestions = !!onSuggestionSelect;
  const currentValue = value == null ? "" : String(value);
  const normalizedValue = currentValue.trim().toLowerCase();
  const filteredSuggestions = suggestions.filter((suggestion) => {
    if (!normalizedValue) {
      return true;
    }

    return String(suggestion).toLowerCase().includes(normalizedValue);
  });
  const visibleSuggestions = filteredSuggestions.slice(0, 6);
  const hasExactMatch = suggestions.some((suggestion) => String(suggestion).trim().toLowerCase() === normalizedValue);
  const canCreateCustomValue = !!createActionLabel && !!onCreateOption && !!normalizedValue && !hasExactMatch;
  const hasDropdown = supportsSuggestions && (suggestions.length > 0 || !!createActionLabel);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!fieldRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!visibleSuggestions.length) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((previous) => Math.min(previous, visibleSuggestions.length - 1));
  }, [visibleSuggestions.length]);

  const selectSuggestion = (suggestion: string | number) => {
    onSuggestionSelect?.(suggestion);
    setIsOpen(false);
    setCreateError(null);
  };

  const handleCreateOption = async (optionValue: string) => {
    if (!onCreateOption) {
      return;
    }

    try {
      setIsCreating(true);
      onCreateStateChange?.(true);
      setCreateError(null);
      await onCreateOption(optionValue);
      setIsOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create option";
      setCreateError(message);
    } finally {
      setIsCreating(false);
      onCreateStateChange?.(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event);

    if (hasDropdown) {
      setIsOpen(true);
      setActiveIndex(0);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hasDropdown) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(0);
        return;
      }

      setActiveIndex((previous) => Math.min(previous + 1, visibleSuggestions.length - 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(visibleSuggestions.length - 1);
        return;
      }

      setActiveIndex((previous) => Math.max(previous - 1, 0));
    }

    if (event.key === "Enter" && isOpen) {
      event.preventDefault();

      if (visibleSuggestions[activeIndex] !== undefined) {
        selectSuggestion(visibleSuggestions[activeIndex]);
        return;
      }

      if (canCreateCustomValue) {
        void handleCreateOption(currentValue.trim());
      }
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={fieldRef} className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
        {required ? `${label} *` : label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          step={step}
          name={name}
          required={required}
          min={min}
          value={value ?? ""}
          placeholder={placeholder}
          autoComplete="off"
          onChange={handleInputChange}
          onFocus={() => {
            if (hasDropdown) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          aria-autocomplete={hasDropdown ? "list" : undefined}
          className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 ${hasDropdown ? "pr-12" : ""}`}
        />
        {hasDropdown ? (
          <button
            type="button"
            aria-label={`Toggle ${label} suggestions`}
            onClick={() => setIsOpen((previous) => !previous)}
            className="absolute inset-y-1.5 right-1.5 inline-flex w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronDown size={18} className={`transition ${isOpen ? "rotate-180" : ""}`} />
          </button>
        ) : null}
        {helperText && (
          <div className="absolute -bottom-5 left-1 text-[11px] font-medium text-slate-500 whitespace-nowrap">
            {helperText}
          </div>
        )}
        {hasDropdown && isOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.14)]">
            <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Suggestions
            </div>
            <div className="max-h-60 overflow-y-auto p-2">
              {canCreateCustomValue ? (
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => void handleCreateOption(currentValue.trim())}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  className="mb-1 flex w-full items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-left text-sm font-medium text-cyan-900 transition hover:border-cyan-300 hover:bg-cyan-100 disabled:cursor-wait disabled:opacity-70"
                >
                  <span>{isCreating ? "Saving..." : createActionLabel}</span>
                  <span className="truncate pl-3 text-cyan-700">&quot;{currentValue.trim()}&quot;</span>
                </button>
              ) : null}
              {visibleSuggestions.map((suggestion, index) => {
                const suggestionText = String(suggestion);
                const isSelected = suggestionText === currentValue;
                const isActive = index === activeIndex;

                return (
                  <button
                    key={`${id}-${suggestionText}`}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectSuggestion(suggestion);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${isActive ? "bg-cyan-50 text-cyan-900" : "text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    <span>{suggestionText}</span>
                    {isSelected ? <Check size={16} className="text-cyan-700" /> : null}
                  </button>
                );
              })}
              {!visibleSuggestions.length && !canCreateCustomValue ? (
                <div className="px-3 py-2.5 text-sm text-slate-500">No matching suggestions</div>
              ) : null}
              {createError ? <div className="px-3 py-2 text-xs text-rose-600">{createError}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
      {helperText ? <p className="text-xs leading-4 text-slate-500">{helperText}</p> : null}
    </div>
  );
}

function ToggleField({
  id,
  label,
  checked,
  name,
  helperText,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  name: string;
  helperText?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300"
    >
      <input
        id={id}
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
      />
      <span className="space-y-1">
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        {helperText ? <span className="block text-xs leading-5 text-slate-500">{helperText}</span> : null}
      </span>
    </label>
  );
}

export default function MedicineForm({ medicine, onClose, onSuccess }: MedicineFormProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingMasterCreates, setPendingMasterCreates] = useState(0);
  const [formData, setFormData] = useState<Partial<Medicine>>(medicine ? { ...DEFAULT_FORM_VALUES, ...medicine } : DEFAULT_FORM_VALUES);
  const [recommendations, setRecommendations] = useState<CatalogRecommendations>(EMPTY_RECOMMENDATIONS);
  const deferredFormData = useDeferredValue(formData);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMounted]);

  useEffect(() => {
    setFormData(medicine ? { ...DEFAULT_FORM_VALUES, ...medicine } : DEFAULT_FORM_VALUES);
  }, [medicine]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();

    [
      "brand_name",
      "generic_name",
      "category",
      "manufacturer",
      "form",
      "dosage_unit",
      "sub_unit",
    ].forEach((field) => {
      const value = deferredFormData[field as keyof Medicine];
      if (typeof value === "string" && value.trim()) {
        params.set(field, value.trim());
      }
    });

    if (!isMissingValue(deferredFormData.dosage_value)) {
      params.set("dosage_value", String(deferredFormData.dosage_value));
    }

    fetch(`/api/medicine/recommendations?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load medicine recommendations");
        }

        return response.json() as Promise<CatalogRecommendations>;
      })
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }

        setRecommendations(data);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setRecommendations(EMPTY_RECOMMENDATIONS);
      });

    return () => controller.abort();
  }, [deferredFormData]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = event.target;

    const parsedValue =
      type === "checkbox"
        ? event.target.checked
        : type === "number"
          ? value === ""
            ? undefined
            : Number(value)
          : value;

    setFormData((previous) => {
      const next = { ...previous, [name]: parsedValue };

      if (name === "category") {
        next.category_id = undefined;
      }

      if (name === "manufacturer") {
        next.manufacturer_id = undefined;
      }

      if (name === "form") {
        next.form_id = undefined;
      }

      return next;
    });
  };

  const setFieldValue = (field: keyof Medicine, value: string | number | boolean | undefined) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const pushSuggestion = (field: "categories" | "manufacturers" | "forms", value: string) => {
    setRecommendations((previous) => ({
      ...previous,
      suggestions: {
        ...previous.suggestions,
        [field]: [value, ...previous.suggestions[field].filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 6),
      },
    }));
  };

  const createMasterOption = async (type: MedicineMasterType, name: string) => {
    const response = await fetch("/api/medicine/masters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name }),
    });

    const payload = (await response.json()) as MedicineMasterResponse;

    if (!response.ok || !payload.data) {
      throw new Error(payload.error || `Failed to create ${type}`);
    }

    if (type === "category") {
      setFormData((previous) => ({
        ...previous,
        category: payload.data?.name,
        category_id: payload.data?.id,
      }));
      pushSuggestion("categories", payload.data.name);
      return;
    }

    if (type === "manufacturer") {
      setFormData((previous) => ({
        ...previous,
        manufacturer: payload.data?.name,
        manufacturer_id: payload.data?.id,
      }));
      pushSuggestion("manufacturers", payload.data.name);
      return;
    }

    setFormData((previous) => ({
      ...previous,
      form: payload.data?.name,
      form_id: payload.data?.id,
    }));
    pushSuggestion("forms", payload.data.name);
  };

  const handleCreateStateChange = (isCreating: boolean) => {
    setPendingMasterCreates((previous) => {
      const next = previous + (isCreating ? 1 : -1);
      return next < 0 ? 0 : next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setLoading(true);

      const isEdit = !!medicine?.medicine_id;
      const url = isEdit ? `/api/medicine/${medicine.medicine_id}` : "/api/medicine";
      const method = isEdit ? "PUT" : "POST";
      const payload = sanitizeFormData(formData);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save medicine");
      }

      toast.success(`Product ${isEdit ? "updated" : "added"} successfully`);
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save medicine";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-2 backdrop-blur-md sm:p-4">
      <div className="flex h-[min(860px,calc(100dvh-1rem))] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,#f8fbff_0%,#eef7ff_42%,#f7fbff_100%)] shadow-[0_30px_100px_rgba(15,23,42,0.32)] sm:h-[min(860px,calc(100dvh-2rem))]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white/80 px-5 py-3 backdrop-blur sm:px-6 xl:px-8">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-800">
                <Sparkles size={14} />
                Catalog-guided entry
              </span>
            </div>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              {medicine ? "Edit product" : "Add product"}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close product form"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 xl:px-8 xl:py-5">
          <form id="medicine-form" onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-4 pb-6">
            <SectionCard
              eyebrow="Section 01"
              title="Product identity"
              description=""
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  id="brand_name"
                  name="brand_name"
                  label="Product Name (Brand Name)"
                  required
                  value={formData.brand_name}
                  onChange={handleChange}
                  suggestions={recommendations.suggestions.brandNames}
                  onSuggestionSelect={(value) => setFieldValue("brand_name", String(value))}
                />
                <Field
                  id="generic_name"
                  name="generic_name"
                  label="Base Name / Composition (Generic Name)"
                  required
                  value={formData.generic_name}
                  onChange={handleChange}
                  suggestions={recommendations.suggestions.genericNames}
                  onSuggestionSelect={(value) => setFieldValue("generic_name", String(value))}
                />
                <Field
                  id="category"
                  name="category"
                  label="Category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  suggestions={recommendations.suggestions.categories}
                  onSuggestionSelect={(value) => {
                    setFieldValue("category", String(value));
                    setFieldValue("category_id", undefined);
                  }}
                  createActionLabel="Add new category"
                  onCreateOption={(value) => createMasterOption("category", value)}
                  onCreateStateChange={handleCreateStateChange}
                />
                <Field
                  id="manufacturer"
                  name="manufacturer"
                  label="Manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  suggestions={recommendations.suggestions.manufacturers}
                  onSuggestionSelect={(value) => {
                    setFieldValue("manufacturer", String(value));
                    setFieldValue("manufacturer_id", undefined);
                  }}
                  createActionLabel="Add new manufacturer"
                  onCreateOption={(value) => createMasterOption("manufacturer", value)}
                  onCreateStateChange={handleCreateStateChange}
                />
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Section 02"
              title="Dispensing configuration"
              description=""
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  id="dosage_value"
                  name="dosage_value"
                  label="Dosage Value"
                  type="number"
                  step="0.01"
                  value={formData.dosage_value}
                  onChange={handleChange}
                />
                <Field
                  id="dosage_unit"
                  name="dosage_unit"
                  label="Dosage Unit"
                  value={formData.dosage_unit}
                  onChange={handleChange}
                  placeholder="e.g. mg, ml, mcg"
                  suggestions={recommendations.suggestions.dosageUnits}
                  onSuggestionSelect={(value) => setFieldValue("dosage_unit", String(value))}
                />
                <Field
                  id="form"
                  name="form"
                  label="Form"
                  value={formData.form}
                  onChange={handleChange}
                  placeholder="e.g. Tablet, Syrup, Injection"
                  suggestions={recommendations.suggestions.forms}
                  onSuggestionSelect={(value) => {
                    setFieldValue("form", String(value));
                    setFieldValue("form_id", undefined);
                  }}
                  createActionLabel="Add new form"
                  onCreateOption={(value) => createMasterOption("form", value)}
                  onCreateStateChange={handleCreateStateChange}
                />
                <Field
                  id="sku"
                  name="sku"
                  label="SKU"
                  value={formData.sku}
                  onChange={handleChange}
                  suggestions={recommendations.generated.sku ? [recommendations.generated.sku] : []}
                  onSuggestionSelect={(value) => setFieldValue("sku", String(value))}
                />
                <Field
                  id="barcode"
                  name="barcode"
                  label="Barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                />
                <div className="grid gap-4">
                  <ToggleField
                    id="requires_prescription"
                    name="requires_prescription"
                    label="Requires Prescription"
                    checked={!!formData.requires_prescription}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Section 03"
              title="Pack breakdown and inventory"
              description=""
            >
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <Field
                  id="sub_unit"
                  name="sub_unit"
                  label="Sub Unit Name"
                  value={formData.sub_unit}
                  onChange={handleChange}
                  placeholder="e.g. Blister, Strip, Drop"
                  suggestions={recommendations.suggestions.subUnits}
                  onSuggestionSelect={(value) => setFieldValue("sub_unit", String(value))}
                />
                <Field
                  id="sub_units_per_unit"
                  name="sub_units_per_unit"
                  label="Sub Units / Unit"
                  type="number"
                  min="1"
                  required
                  value={formData.sub_units_per_unit || 1}
                  onChange={handleChange}
                />
                <Field
                  id="unit_price"
                  name="unit_price"
                  label="Unit Price"
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={handleChange}
                />
                <div className="relative">
                  <Field
                    id="sub_unit_price"
                    name="sub_unit_price"
                    label="Sub Unit Price"
                    type="number"
                    step="0.01"
                    value={formData.sub_unit_price || formData.unit_price}
                    onChange={handleChange}
                  />
                </div>
                <Field
                  id="min_stock_level"
                  name="min_stock_level"
                  label="Min Stock Level"
                  type="number"
                  value={formData.min_stock_level}
                  onChange={handleChange}
                  suggestions={recommendations.stockGuidance.minStockLevel ? [recommendations.stockGuidance.minStockLevel] : []}
                  onSuggestionSelect={(value) => setFieldValue("min_stock_level", Number(value))}
                />
                <Field
                  id="max_stock_level"
                  name="max_stock_level"
                  label="Max Stock Level"
                  type="number"
                  value={formData.max_stock_level}
                  onChange={handleChange}
                  suggestions={recommendations.stockGuidance.maxStockLevel ? [recommendations.stockGuidance.maxStockLevel] : []}
                  onSuggestionSelect={(value) => setFieldValue("max_stock_level", Number(value))}
                />
                <div className="space-y-4">
                  <ToggleField
                    id="allow_sub_unit_sale"
                    name="allow_sub_unit_sale"
                    label="Allow Sub Unit Sale"
                    checked={!!formData.allow_sub_unit_sale}
                    onChange={handleChange}
                  />
                  <ToggleField
                    id="is_active"
                    name="is_active"
                    label="Active Product"
                    checked={!!formData.is_active}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </SectionCard>
          </form>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-end sm:px-6 xl:px-8">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              form="medicine-form"
              type="submit"
              disabled={loading || pendingMasterCreates > 0}
              className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.25)] transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving..." : pendingMasterCreates > 0 ? "Saving option..." : medicine ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
