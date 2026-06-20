// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function generateReference(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `TXN-${timestamp}-${random}`;
}

export function calculateLineTotal(
  quantity: number,
  subQuantity: number,
  unitPrice: number,
  discountPercent: number
): number {
  const totalQuantity = quantity + (subQuantity / 100);
  const subtotal = totalQuantity * unitPrice;
  const discount = (subtotal * discountPercent) / 100;
  return subtotal - discount;
}

/**
 * @deprecated Returns a hardcoded `1`, which falsifies audit attribution
 * (audit H1/M4). Use `resolveActorStaffId(request, client)` from
 * `@/src/lib/server/actor` to attribute actions to the real authenticated
 * staff member. Retained only as the test-environment fallback inside
 * resolveActorStaffId; remaining direct callers are migrated per Stage A module.
 */
export function getCurrentStaffId(): number {
  return 1;
}