// Generates db/seed/demo-catalogue.sql — an IDEMPOTENT demo catalogue:
// categories/forms/manufacturers (insert-if-missing by name, serial ids), 6
// suppliers (party), and 110 diverse medicine/supply/inventory rows
// (insert-if-missing by brand_name). Catalogue rows ONLY — no stock/batches
// (stock is established later through the purchase flow / trigger chain).
//
// Run:  node scripts/pitch/gen-catalogue-seed.mjs   ->  db/seed/demo-catalogue.sql

import { writeFileSync, mkdirSync } from "node:fs";

const sq = (s) => "'" + String(s).replace(/'/g, "''") + "'";

// ── Reference data (names ensured to exist) ─────────────────────────────────
const CATEGORIES = [
  "Analgesic", "Antibiotic", "Antihistamine", "Anti-diabetic", "Gastroprotective",
  "Bronchodilator", "Antacid", "Antimalarial", "Cardiovascular", "Antifungal",
  "Corticosteroid", "Vitamin & Supplement", "Injectable", "IV Fluid",
  "Surgical Supplies", "Consumables", "General Inventory", "Vaccine", "Antiseptic",
];
const FORMS = [
  "Tablet", "Capsule", "Syrup", "Suspension", "Injection", "Vial", "Solution",
  "Inhaler", "Drops", "Sachet", "Device", "Consumable", "Ointment",
];
const MANUFACTURERS = [
  "Abbott", "Getz Pharma", "GSK", "Searle", "Sanofi", "Pfizer", "Hilton Pharma",
  "Martin Dow", "Highnoon", "Ferozsons", "Bosch Pharma", "CarePlus Surgicals",
  "Medisure Devices", "Local Generics",
];
const PARTIES = [
  ["Sohail Medical Suppliers", "042-35711234", "Hall Road, Lahore", "sales@sohailmed.pk", "GST-3520-1187"],
  ["Pakistan Pharma Distributors", "021-34556677", "Shahrah-e-Faisal, Karachi", "orders@ppd.com.pk", "GST-1190-7745"],
  ["CarePlus Surgicals", "051-2876612", "Blue Area, Islamabad", "info@careplus.pk", "GST-7781-4420"],
  ["Northern Medico Traders", "091-2563399", "University Road, Peshawar", "contact@northmed.pk", "GST-6610-2231"],
  ["Indus Healthcare Supply", "061-4567880", "Cantt, Multan", "supply@indushc.pk", "GST-4521-8890"],
  ["Vitalis Distribution", "042-35990012", "Gulberg III, Lahore", "hello@vitalis.pk", "GST-9912-3360"],
];

// ── Catalogue items ─────────────────────────────────────────────────────────
// [brand, generic, category, form, manufacturer, dose, unit, rx, controlled, subPerUnit]
const M = (brand, generic, category, form, mfr, dose, unit, rx = false, ctrl = false, sub = 1) =>
  ({ brand, generic, category, form, mfr, dose, unit, rx, ctrl, sub });

const ITEMS = [
  // Tablets / capsules (analgesics, antibiotics, etc.)
  M("Panadol", "Paracetamol", "Analgesic", "Tablet", "GSK", 500, "mg", false, false, 10),
  M("Panadol Extra", "Paracetamol + Caffeine", "Analgesic", "Tablet", "GSK", 500, "mg", false, false, 10),
  M("Brufen", "Ibuprofen", "Analgesic", "Tablet", "Abbott", 400, "mg", false, false, 10),
  M("Ponstan", "Mefenamic Acid", "Analgesic", "Tablet", "Pfizer", 500, "mg", false, false, 10),
  M("Disprol", "Paracetamol", "Analgesic", "Tablet", "Highnoon", 500, "mg", false, false, 10),
  M("Voltral", "Diclofenac Sodium", "Analgesic", "Tablet", "Searle", 50, "mg", true, false, 10),
  M("Augmentin", "Amoxicillin + Clavulanate", "Antibiotic", "Tablet", "GSK", 625, "mg", true, false, 6),
  M("Amoxil", "Amoxicillin", "Antibiotic", "Capsule", "GSK", 500, "mg", true, false, 10),
  M("Flagyl", "Metronidazole", "Antibiotic", "Tablet", "Sanofi", 400, "mg", true, false, 10),
  M("Ciproxin", "Ciprofloxacin", "Antibiotic", "Tablet", "Bayer", 500, "mg", true, false, 10),
  M("Klaricid", "Clarithromycin", "Antibiotic", "Tablet", "Abbott", 500, "mg", true, false, 7),
  M("Velosef", "Cephradine", "Antibiotic", "Capsule", "GSK", 500, "mg", true, false, 12),
  M("Azomax", "Azithromycin", "Antibiotic", "Capsule", "Getz Pharma", 250, "mg", true, false, 6),
  M("Risek", "Omeprazole", "Gastroprotective", "Capsule", "Getz Pharma", 20, "mg", false, false, 14),
  M("Nexum", "Esomeprazole", "Gastroprotective", "Capsule", "Getz Pharma", 40, "mg", false, false, 14),
  M("Motilium", "Domperidone", "Gastroprotective", "Tablet", "Abbott", 10, "mg", false, false, 10),
  M("Gaviscon", "Sodium Alginate", "Antacid", "Tablet", "GSK", 500, "mg", false, false, 16),
  M("Telfast", "Fexofenadine", "Antihistamine", "Tablet", "Sanofi", 120, "mg", false, false, 10),
  M("Softin", "Cetirizine", "Antihistamine", "Tablet", "Hilton Pharma", 10, "mg", false, false, 10),
  M("Avil", "Pheniramine", "Antihistamine", "Tablet", "Sanofi", 25, "mg", false, false, 10),
  M("Glucophage", "Metformin", "Anti-diabetic", "Tablet", "Martin Dow", 500, "mg", true, false, 20),
  M("Diamicron", "Gliclazide", "Anti-diabetic", "Tablet", "Servier", 80, "mg", true, false, 30),
  M("Januvia", "Sitagliptin", "Anti-diabetic", "Tablet", "Pfizer", 50, "mg", true, false, 14),
  M("Tenormin", "Atenolol", "Cardiovascular", "Tablet", "Searle", 50, "mg", true, false, 14),
  M("Concor", "Bisoprolol", "Cardiovascular", "Tablet", "Merck", 5, "mg", true, false, 14),
  M("Norvasc", "Amlodipine", "Cardiovascular", "Tablet", "Pfizer", 5, "mg", true, false, 14),
  M("Lipiget", "Atorvastatin", "Cardiovascular", "Tablet", "Getz Pharma", 20, "mg", true, false, 14),
  M("Cardexa", "Clopidogrel", "Cardiovascular", "Tablet", "Highnoon", 75, "mg", true, false, 14),
  M("Diovan", "Valsartan", "Cardiovascular", "Tablet", "Novartis", 80, "mg", true, false, 14),
  M("Lasix", "Furosemide", "Cardiovascular", "Tablet", "Sanofi", 40, "mg", true, false, 10),
  M("Deltacortril", "Prednisolone", "Corticosteroid", "Tablet", "Pfizer", 5, "mg", true, false, 20),
  M("Medrol", "Methylprednisolone", "Corticosteroid", "Tablet", "Pfizer", 4, "mg", true, false, 10),
  M("Coartem", "Artemether + Lumefantrine", "Antimalarial", "Tablet", "Novartis", 80, "mg", true, false, 24),
  M("Fungone", "Fluconazole", "Antifungal", "Capsule", "Ferozsons", 150, "mg", true, false, 1),
  M("Surbex Z", "Multivitamin + Zinc", "Vitamin & Supplement", "Tablet", "Abbott", 0, "mg", false, false, 30),
  M("CAC-1000", "Calcium + Vitamin C", "Vitamin & Supplement", "Tablet", "GSK", 1000, "mg", false, false, 10),
  M("Tranexa", "Tranexamic Acid", "Analgesic", "Tablet", "Bosch Pharma", 500, "mg", true, false, 10),
  M("Tegral", "Carbamazepine", "Analgesic", "Tablet", "Novartis", 200, "mg", true, false, 30),
  M("Lexotanil", "Bromazepam", "Analgesic", "Tablet", "Roche", 3, "mg", true, true, 30),

  // Syrups / suspensions
  M("Calpol Syrup", "Paracetamol", "Analgesic", "Syrup", "GSK", 120, "mg/5ml", false, false, 1),
  M("Brufen Suspension", "Ibuprofen", "Analgesic", "Suspension", "Abbott", 100, "mg/5ml", false, false, 1),
  M("Augmentin Syrup", "Amoxicillin + Clavulanate", "Antibiotic", "Suspension", "GSK", 156, "mg/5ml", true, false, 1),
  M("Klaricid Syrup", "Clarithromycin", "Antibiotic", "Suspension", "Abbott", 125, "mg/5ml", true, false, 1),
  M("Ventolin Syrup", "Salbutamol", "Bronchodilator", "Syrup", "GSK", 2, "mg/5ml", false, false, 1),
  M("Hydryllin", "Diphenhydramine", "Antihistamine", "Syrup", "Searle", 0, "mg/5ml", false, false, 1),
  M("Peditral", "Oral Rehydration Salts", "IV Fluid", "Solution", "Searle", 0, "ml", false, false, 1),
  M("Flagyl Suspension", "Metronidazole", "Antibiotic", "Suspension", "Sanofi", 200, "mg/5ml", true, false, 1),
  M("Risek Syrup", "Omeprazole", "Gastroprotective", "Suspension", "Getz Pharma", 0, "mg/5ml", false, false, 1),
  M("Softin Syrup", "Cetirizine", "Antihistamine", "Syrup", "Hilton Pharma", 5, "mg/5ml", false, false, 1),
  M("Entamizole", "Metronidazole + Diloxanide", "Antibiotic", "Suspension", "Abbott", 0, "mg/5ml", true, false, 1),
  M("Polyfax Drops", "Polymyxin B", "Antibiotic", "Drops", "GSK", 0, "ml", false, false, 1),
  M("Sinecod", "Butamirate", "Bronchodilator", "Syrup", "Novartis", 0, "mg/5ml", false, false, 1),
  M("Ferinorm Syrup", "Iron Polymaltose", "Vitamin & Supplement", "Syrup", "Highnoon", 0, "mg/5ml", false, false, 1),
  M("Mucolator", "Bromhexine", "Bronchodilator", "Syrup", "Bosch Pharma", 4, "mg/5ml", false, false, 1),

  // Injectables / vials
  M("Rocephin Inj", "Ceftriaxone", "Injectable", "Vial", "Roche", 1, "g", true, false, 1),
  M("Augmentin Inj", "Amoxicillin + Clavulanate", "Injectable", "Vial", "GSK", 12, "g", true, false, 1),
  M("Toradol Inj", "Ketorolac", "Injectable", "Injection", "Sanofi", 30, "mg", true, false, 1),
  M("Dexa Inj", "Dexamethasone", "Injectable", "Injection", "Highnoon", 4, "mg", true, false, 1),
  M("Buscopan Inj", "Hyoscine", "Injectable", "Injection", "Sanofi", 20, "mg", true, false, 1),
  M("Gravinate Inj", "Dimenhydrinate", "Injectable", "Injection", "Searle", 50, "mg", true, false, 1),
  M("Insulin Mixtard", "Human Insulin", "Anti-diabetic", "Vial", "Novo Nordisk", 100, "IU", true, false, 1),
  M("Lantus", "Insulin Glargine", "Anti-diabetic", "Vial", "Sanofi", 100, "IU", true, false, 1),
  M("Optiray Inj", "Ioversol", "Injectable", "Vial", "Guerbet", "Guerbet", "ml", true, false, 1),
  M("Tramal Inj", "Tramadol", "Injectable", "Injection", "Searle", 100, "mg", true, true, 1),
  M("Morphine Inj", "Morphine Sulphate", "Injectable", "Injection", "Local Generics", 10, "mg", true, true, 1),
  M("Voltral Inj", "Diclofenac Sodium", "Injectable", "Injection", "Searle", 75, "mg", true, false, 1),
  M("Solu-Medrol", "Methylprednisolone", "Injectable", "Vial", "Pfizer", 500, "mg", true, false, 1),
  M("Decadron Inj", "Dexamethasone", "Corticosteroid", "Injection", "Merck", 8, "mg", true, false, 1),
  M("Vitamin K Inj", "Phytomenadione", "Injectable", "Injection", "Local Generics", 10, "mg", true, false, 1),

  // IV fluids / solutions
  M("Normal Saline 0.9%", "Sodium Chloride", "IV Fluid", "Solution", "Otsuka", "Otsuka", "ml", false, false, 1),
  M("Ringer's Lactate", "Compound Sodium Lactate", "IV Fluid", "Solution", "Otsuka", "Otsuka", "ml", false, false, 1),
  M("Dextrose 5%", "Dextrose", "IV Fluid", "Solution", "Otsuka", 5, "%", false, false, 1),
  M("Dextrose 10%", "Dextrose", "IV Fluid", "Solution", "Otsuka", 10, "%", false, false, 1),
  M("DextroSaline", "Dextrose + Saline", "IV Fluid", "Solution", "Otsuka", 0, "ml", false, false, 1),
  M("Sterile Water 500ml", "Water for Injection", "IV Fluid", "Solution", "Otsuka", 500, "ml", false, false, 1),
  M("Mannitol 20%", "Mannitol", "IV Fluid", "Solution", "Otsuka", 20, "%", true, false, 1),
  M("Haemaccel", "Polygeline", "IV Fluid", "Solution", "Hoechst", "Hoechst", "ml", true, false, 1),
  M("Metronidazole IV", "Metronidazole", "IV Fluid", "Solution", "Sanofi", 500, "mg", true, false, 1),
  M("Potassium Chloride IV", "Potassium Chloride", "IV Fluid", "Solution", "Otsuka", 0, "ml", true, false, 1),

  // Consumable supplies
  M("Disposable Syringe 3cc", "Syringe 3ml", "Consumables", "Consumable", "CarePlus Surgicals", 3, "ml", false, false, 1),
  M("Disposable Syringe 5cc", "Syringe 5ml", "Consumables", "Consumable", "CarePlus Surgicals", 5, "ml", false, false, 1),
  M("Disposable Syringe 10cc", "Syringe 10ml", "Consumables", "Consumable", "CarePlus Surgicals", 10, "ml", false, false, 1),
  M("Insulin Syringe", "Insulin Syringe 1ml", "Consumables", "Consumable", "CarePlus Surgicals", 1, "ml", false, false, 1),
  M("IV Cannula 20G", "IV Cannula Pink", "Surgical Supplies", "Device", "Medisure Devices", 20, "G", false, false, 1),
  M("IV Cannula 22G", "IV Cannula Blue", "Surgical Supplies", "Device", "Medisure Devices", 22, "G", false, false, 1),
  M("IV Cannula 24G", "IV Cannula Yellow", "Surgical Supplies", "Device", "Medisure Devices", 24, "G", false, false, 1),
  M("Surgical Gloves M", "Latex Gloves Medium", "Surgical Supplies", "Consumable", "CarePlus Surgicals", 0, "pair", false, false, 1),
  M("Surgical Gloves L", "Latex Gloves Large", "Surgical Supplies", "Consumable", "CarePlus Surgicals", 0, "pair", false, false, 1),
  M("Examination Gloves", "Nitrile Gloves", "Surgical Supplies", "Consumable", "CarePlus Surgicals", 0, "box", false, false, 100),
  M("Gauze Swab", "Sterile Gauze 4x4", "Surgical Supplies", "Consumable", "CarePlus Surgicals", 0, "pc", false, false, 1),
  M("Cotton Roll 500g", "Absorbent Cotton", "Consumables", "Consumable", "CarePlus Surgicals", 500, "g", false, false, 1),
  M("Crepe Bandage 4in", "Elastic Bandage", "Surgical Supplies", "Consumable", "CarePlus Surgicals", 4, "in", false, false, 1),
  M("Adhesive Tape", "Surgical Tape", "Consumables", "Consumable", "CarePlus Surgicals", 0, "roll", false, false, 1),
  M("Disposable Mask", "3-Ply Face Mask", "Consumables", "Consumable", "Medisure Devices", 0, "box", false, false, 50),
  M("IV Infusion Set", "Drip Set", "Surgical Supplies", "Device", "Medisure Devices", 0, "pc", false, false, 1),
  M("Urinary Catheter 16Fr", "Foley Catheter", "Surgical Supplies", "Device", "Medisure Devices", 16, "Fr", false, false, 1),
  M("Suction Catheter", "Suction Tube", "Surgical Supplies", "Device", "Medisure Devices", 0, "pc", false, false, 1),
  M("Disposable Apron", "Plastic Apron", "Consumables", "Consumable", "CarePlus Surgicals", 0, "pc", false, false, 1),
  M("Alcohol Swab", "Isopropyl Swab", "Consumables", "Consumable", "Medisure Devices", 0, "box", false, false, 100),

  // General hospital inventory / antiseptics
  M("Pyodine Solution", "Povidone Iodine", "Antiseptic", "Solution", "Brookes", "Brookes", "ml", false, false, 1),
  M("Dettol Antiseptic", "Chloroxylenol", "Antiseptic", "Solution", "Reckitt", "Reckitt", "ml", false, false, 1),
  M("Hand Sanitizer 500ml", "Ethanol Gel", "General Inventory", "Solution", "Local Generics", 500, "ml", false, false, 1),
  M("Digital Thermometer", "Thermometer", "General Inventory", "Device", "Medisure Devices", 0, "pc", false, false, 1),
  M("BP Apparatus", "Aneroid Sphygmomanometer", "General Inventory", "Device", "Medisure Devices", 0, "pc", false, false, 1),
  M("Pulse Oximeter", "Fingertip Oximeter", "General Inventory", "Device", "Medisure Devices", 0, "pc", false, false, 1),
  M("Nebulizer Mask", "Nebulizer Kit", "General Inventory", "Device", "Medisure Devices", 0, "pc", false, false, 1),
  M("Glucometer Strips", "Blood Glucose Strips", "General Inventory", "Consumable", "Abbott", 0, "box", false, false, 50),
  M("Surgical Spirit", "Methylated Spirit", "Antiseptic", "Solution", "Brookes", 0, "ml", false, false, 1),
  M("Hydrogen Peroxide", "Hydrogen Peroxide 3%", "Antiseptic", "Solution", "Brookes", 3, "%", false, false, 1),
  M("Burnol Cream", "Aminacrine + Cetrimide", "Antiseptic", "Ointment", "GSK", 0, "g", false, false, 1),
  M("Polyfax Ointment", "Polymyxin + Bacitracin", "Antibiotic", "Ointment", "GSK", 0, "g", false, false, 1),
];

function emit() {
  const L = [];
  L.push("-- DEMO CATALOGUE SEED (idempotent). Generated by scripts/pitch/gen-catalogue-seed.mjs.");
  L.push("-- Catalogue rows only: categories/forms/manufacturers, suppliers, and medicines.");
  L.push("-- NO stock or batch rows here — stock is established via the purchase flow (trigger chain).");
  L.push("BEGIN;");

  // dynamic manufacturers union (collect any referenced not in base list)
  const mfrs = Array.from(new Set([...MANUFACTURERS, ...ITEMS.map((i) => i.mfr)]));
  L.push("\n-- categories");
  for (const c of CATEGORIES)
    L.push(`INSERT INTO medicine_category (name) SELECT ${sq(c)} WHERE NOT EXISTS (SELECT 1 FROM medicine_category WHERE name=${sq(c)});`);
  L.push("\n-- forms");
  for (const f of FORMS)
    L.push(`INSERT INTO medicine_form (name) SELECT ${sq(f)} WHERE NOT EXISTS (SELECT 1 FROM medicine_form WHERE name=${sq(f)});`);
  L.push("\n-- manufacturers");
  for (const m of mfrs)
    L.push(`INSERT INTO medicine_manufacturer (name) SELECT ${sq(m)} WHERE NOT EXISTS (SELECT 1 FROM medicine_manufacturer WHERE name=${sq(m)});`);

  L.push("\n-- suppliers (party)");
  for (const [name, phone, addr, email, gst] of PARTIES)
    L.push(`INSERT INTO party (name, contact_number, address, email, gst_number) SELECT ${sq(name)},${sq(phone)},${sq(addr)},${sq(email)},${sq(gst)} WHERE NOT EXISTS (SELECT 1 FROM party WHERE name=${sq(name)});`);

  L.push("\n-- medicines (insert-if-missing by brand_name)");
  for (const it of ITEMS) {
    const dose = typeof it.dose === "number" ? it.dose : 0;
    L.push(
      `INSERT INTO medicine (brand_name, generic_name, category, form, manufacturer, dosage_value, dosage_unit, requires_prescription, is_controlled, sub_unit, sub_units_per_unit, allow_sub_unit_sale, category_id, form_id, manufacturer_id, min_stock_level, max_stock_level, is_active) ` +
      `SELECT ${sq(it.brand)},${sq(it.generic)},${sq(it.category)},${sq(it.form)},${sq(it.mfr)},${dose},${sq(it.unit)},${it.rx},${it.ctrl},` +
      `${it.sub > 1 ? sq("unit") : "NULL"},${it.sub},${it.sub > 1},` +
      `(SELECT category_id FROM medicine_category WHERE name=${sq(it.category)} LIMIT 1),` +
      `(SELECT form_id FROM medicine_form WHERE name=${sq(it.form)} LIMIT 1),` +
      `(SELECT manufacturer_id FROM medicine_manufacturer WHERE name=${sq(it.mfr)} LIMIT 1),` +
      `${it.sub > 1 ? 20 : 10},${it.sub > 1 ? 5000 : 1000},true ` +
      `WHERE NOT EXISTS (SELECT 1 FROM medicine WHERE brand_name=${sq(it.brand)});`
    );
  }

  L.push("\nCOMMIT;");
  L.push(`-- items: ${ITEMS.length}`);
  return L.join("\n") + "\n";
}

mkdirSync("db/seed", { recursive: true });
writeFileSync("db/seed/demo-catalogue.sql", emit());
console.log(`wrote db/seed/demo-catalogue.sql  (${ITEMS.length} items, ${CATEGORIES.length} categories, ${FORMS.length} forms, ${PARTIES.length} suppliers)`);
