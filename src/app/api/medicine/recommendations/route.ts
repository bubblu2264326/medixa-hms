import { NextRequest, NextResponse } from "next/server";

import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { fetchMedicineMasterSuggestions } from "@/src/lib/server/medicineMasters";

type Confidence = "high" | "medium" | "low" | null;

type SuggestionPayload = {
  suggestions: {
    brandNames: string[];
    genericNames: string[];
    categories: string[];
    manufacturers: string[];
    forms: string[];
    dosageUnits: string[];
    subUnits: string[];
  };
  prediction: {
    source: string | null;
    confidence: Confidence;
    generic_name?: string;
    brand_name?: string;
    category?: string;
    dosage_value?: number;
    dosage_unit?: string;
    form?: string;
    manufacturer?: string;
    requires_prescription?: boolean;
    sub_unit?: string;
    sub_units_per_unit?: number;
    allow_sub_unit_sale?: boolean;
    min_stock_level?: number;
    max_stock_level?: number;
  } | null;
  generated: {
    sku: string;
  };
  stockGuidance: {
    minStockLevel: number | null;
    maxStockLevel: number | null;
  };
};

const EMPTY_RESPONSE: SuggestionPayload = {
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

function readText(searchParams: URLSearchParams, key: string): string {
  return searchParams.get(key)?.trim() ?? "";
}

function compactToken(value: string, maxLength: number): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").slice(0, maxLength).toUpperCase();
}

function scoreToConfidence(score: number): Confidence {
  if (score >= 100) return "high";
  if (score >= 60) return "medium";
  if (score > 0) return "low";
  return null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return null;
}

async function fetchSuggestionList(column: string, term: string) {
  const params: string[] = [];
  let sql = `
    SELECT ${column} AS value, COUNT(*)::int AS count
    FROM medicine
    WHERE ${column} IS NOT NULL
      AND BTRIM(${column}) <> ''
  `;

  if (term) {
    params.push(`${term}%`);
    sql += ` AND ${column} ILIKE $1`;
  }

  sql += `
    GROUP BY ${column}
    ORDER BY count DESC, ${column} ASC
    LIMIT 6
  `;

  const result = await query(sql, params);
  return result.rows.map((row) => row.value as string);
}

async function fetchMasterSuggestionList(type: "category" | "manufacturer" | "form", term: string) {
  return fetchMedicineMasterSuggestions(type, term, 6);
}

async function fetchDosageUnits(form: string, term: string) {
  const params: string[] = [];
  let sql = `
    SELECT dosage_unit AS value, COUNT(*)::int AS count
    FROM medicine
    WHERE dosage_unit IS NOT NULL
      AND BTRIM(dosage_unit) <> ''
  `;

  if (form) {
    params.push(form);
    sql += ` AND LOWER(form) = LOWER($${params.length})`;
  }

  if (term) {
    params.push(`${term}%`);
    sql += ` AND dosage_unit ILIKE $${params.length}`;
  }

  sql += `
    GROUP BY dosage_unit
    ORDER BY count DESC, dosage_unit ASC
    LIMIT 6
  `;

  const result = await query(sql, params);
  return result.rows.map((row) => row.value as string);
}

async function fetchSubUnits(form: string, term: string) {
  const params: string[] = [];
  let sql = `
    SELECT sub_unit AS value, COUNT(*)::int AS count
    FROM medicine
    WHERE sub_unit IS NOT NULL
      AND BTRIM(sub_unit) <> ''
  `;

  if (form) {
    params.push(form);
    sql += ` AND LOWER(form) = LOWER($${params.length})`;
  }

  if (term) {
    params.push(`${term}%`);
    sql += ` AND sub_unit ILIKE $${params.length}`;
  }

  sql += `
    GROUP BY sub_unit
    ORDER BY count DESC, sub_unit ASC
    LIMIT 6
  `;

  const result = await query(sql, params);
  return result.rows.map((row) => row.value as string);
}

async function fetchPrediction(
  genericName: string,
  brandName: string,
  category: string,
  form: string,
) {
  const genericLike = genericName ? `%${genericName}%` : "";
  const brandLike = brandName ? `%${brandName}%` : "";

  const filters: string[] = [];
  if (genericName) filters.push(`generic_name ILIKE $3`);
  if (brandName) filters.push(`brand_name ILIKE $4`);
  if (category) filters.push(`category ILIKE $5`);
  if (form) filters.push(`form ILIKE $6`);

  if (filters.length === 0) {
    return null;
  }

  const sql = `
    SELECT
      medicine_id,
      generic_name,
      brand_name,
      category,
      dosage_value,
      dosage_unit,
      form,
      manufacturer,
      requires_prescription,
      sub_unit,
      sub_units_per_unit,
      allow_sub_unit_sale,
      min_stock_level,
      max_stock_level,
      CASE
        WHEN $1 <> '' AND LOWER(generic_name) = LOWER($1) THEN 120
        WHEN $2 <> '' AND LOWER(brand_name) = LOWER($2) THEN 110
        WHEN $1 <> '' AND generic_name ILIKE $3 THEN 80
        WHEN $2 <> '' AND brand_name ILIKE $4 THEN 70
        WHEN $5 <> '' AND LOWER(category) = LOWER($5) THEN 35
        WHEN $6 <> '' AND LOWER(form) = LOWER($6) THEN 20
        ELSE 0
      END AS score
    FROM medicine
    WHERE ${filters.join(" OR ")}
    ORDER BY score DESC, created_at DESC NULLS LAST, medicine_id DESC
    LIMIT 1
  `;

  const result = await query(sql, [
    genericName,
    brandName,
    genericLike,
    brandLike,
    category,
    form,
  ]);

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    source:
      row.score >= 120
        ? "generic_match"
        : row.score >= 110
          ? "brand_match"
          : row.score >= 60
            ? "catalog_pattern"
            : "inventory_pattern",
    confidence: scoreToConfidence(row.score),
    generic_name: row.generic_name ?? undefined,
    brand_name: row.brand_name ?? undefined,
    category: row.category ?? undefined,
    dosage_value: numberOrNull(row.dosage_value) ?? undefined,
    dosage_unit: row.dosage_unit ?? undefined,
    form: row.form ?? undefined,
    manufacturer: row.manufacturer ?? undefined,
    requires_prescription: row.requires_prescription ?? undefined,
    sub_unit: row.sub_unit ?? undefined,
    sub_units_per_unit: numberOrNull(row.sub_units_per_unit) ?? undefined,
    allow_sub_unit_sale: row.allow_sub_unit_sale ?? undefined,
    min_stock_level: numberOrNull(row.min_stock_level) ?? undefined,
    max_stock_level: numberOrNull(row.max_stock_level) ?? undefined,
  };
}

async function fetchStockGuidance(category: string) {
  const sql = `
    SELECT
      ROUND(AVG(NULLIF(min_stock_level, 0)))::int AS min_stock_level,
      ROUND(AVG(NULLIF(max_stock_level, 0)))::int AS max_stock_level
    FROM medicine
    WHERE ($1 = '' OR LOWER(category) = LOWER($1))
  `;

  const result = await query(sql, [category]);
  const row = result.rows[0] ?? {};

  return {
    minStockLevel: numberOrNull(row.min_stock_level),
    maxStockLevel: numberOrNull(row.max_stock_level),
  };
}

async function buildGeneratedSku(
  brandName: string,
  genericName: string,
  dosageValue: string,
  dosageUnit: string,
  form: string,
) {
  const baseParts = [
    compactToken(brandName || genericName, 5),
    compactToken(form, 3),
    dosageValue.replace(/[^0-9]/g, "").slice(0, 4),
    compactToken(dosageUnit, 2),
  ].filter(Boolean);

  if (baseParts.length === 0) {
    return "";
  }

  const baseSku = baseParts.join("-");
  const result = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM medicine
      WHERE sku ILIKE $1
    `,
    [`${baseSku}%`],
  );

  const total = result.rows[0]?.total ?? 0;
  return `${baseSku}-${String(total + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    await getAuthenticatedUser(req);
    const searchParams = req.nextUrl.searchParams;
    const brandName = readText(searchParams, "brand_name");
    const genericName = readText(searchParams, "generic_name");
    const category = readText(searchParams, "category");
    const manufacturer = readText(searchParams, "manufacturer");
    const form = readText(searchParams, "form");
    const dosageValue = readText(searchParams, "dosage_value");
    const dosageUnit = readText(searchParams, "dosage_unit");
    const subUnit = readText(searchParams, "sub_unit");

    const [
      brandNames,
      genericNames,
      categories,
      manufacturers,
      forms,
      dosageUnits,
      subUnits,
      prediction,
      stockGuidance,
      sku,
    ] = await Promise.all([
      fetchSuggestionList("brand_name", brandName),
      fetchSuggestionList("generic_name", genericName),
      fetchMasterSuggestionList("category", category),
      fetchMasterSuggestionList("manufacturer", manufacturer),
      fetchMasterSuggestionList("form", form),
      fetchDosageUnits(form, dosageUnit),
      fetchSubUnits(form, subUnit),
      fetchPrediction(genericName, brandName, category, form),
      fetchStockGuidance(category),
      buildGeneratedSku(brandName, genericName, dosageValue, dosageUnit, form),
    ]);

    return NextResponse.json<SuggestionPayload>({
      suggestions: {
        brandNames,
        genericNames,
        categories,
        manufacturers,
        forms,
        dosageUnits,
        subUnits,
      },
      prediction,
      generated: {
        sku,
      },
      stockGuidance,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Medicine recommendation error:", error);
    return NextResponse.json(EMPTY_RESPONSE, { status: 500 });
  }
}
