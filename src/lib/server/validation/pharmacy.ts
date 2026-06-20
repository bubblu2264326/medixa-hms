import { z } from "zod";

// Server-side validation for pharmacy purchase-return input.
// Coerces numeric strings; created_by from the body is intentionally NOT
// accepted here — the actor is resolved server-side from the session.

export const purchaseReturnItemSchema = z.object({
  medicine_id: z.coerce.number().int().positive(),
  batch_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(0),
  sub_quantity: z.coerce.number().int().min(0).optional(),
  unit_cost: z.coerce.number().min(0).optional(),
});

export const purchaseReturnSchema = z.object({
  purchase_id: z.coerce.number().int().positive(),
  reason: z.string().max(500).optional().nullable(),
  items: z.array(purchaseReturnItemSchema).min(1, "at least one item is required"),
});

export type PurchaseReturnInput = z.infer<typeof purchaseReturnSchema>;
