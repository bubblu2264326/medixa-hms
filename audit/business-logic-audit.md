# HMS — Business-Logic / Domain-Correctness Audit

> Read-only, code- and schema-verified (2026-06-20). Verified against route handlers, `src/lib/server/*`, `database/migrations/*.sql`, and the live `database/snapshot/` (generated 2026-05-23 — *after* all migration dates, so it is ground truth for what actually runs).

## ⚠️ Overarching finding: migrations and the live DB have DIVERGED
The snapshot contradicts two committed migrations. **`database/snapshot/` is the only reliable source of live DB state.** Root cause: no applied-migrations check. **Recommend a CI gate** that diffs a fresh introspection against the snapshot and the migration definitions.

## CRITICAL

### C1. `pharmacy/purchase/return` is not a real transaction (pooled `query()` for BEGIN/COMMIT)
**File:** `src/app/api/pharmacy/purchase/return/route.ts:14-49` vs `database/db.ts:16-18`
`query()` = `pool.query()`, which checks out an **arbitrary** idle connection each call. This route runs `query("BEGIN")`, loop `query(detailSql)`, `query("COMMIT")` — each potentially on a *different* connection. (It's the only route that calls `query("BEGIN")`; all others correctly use `pool.connect()` + a dedicated client.)
**Failure:** `BEGIN` on conn A (left open/idle); detail INSERTs (which fire the stock-reducing trigger) on conns B/C **autocommit immediately**; `COMMIT`/`ROLLBACK` no-op on random connections. On mid-loop error, partial stock decrements are already permanent — **non-atomic stock + money**. Leaked open `BEGIN` connections also poison the pool under concurrency.
**Fix:** Rewrite with `pool.connect()` + one `client` for BEGIN/…/COMMIT/ROLLBACK/release (mirror `transactions/route.ts`).

### C2. Live stock trigger doesn't maintain `medicine.stock_quantity` and has NO negative-stock guard — the 2026-03-20 "fix" was never applied
**Files:** live `fn_tg_stockquantity_generic` (`database/snapshot/routines.md:195-239`) vs intended `database/migrations/2026_03_20_stock_reconciliation_and_guard.sql:87-252`
The migration redefines the trigger to (a) update both `medicine` and `medicine_batch` and (b) `RAISE EXCEPTION` on negative stock. The snapshot (2026-05-23, two months later) shows the **old** body: updates `medicine_batch` only, no guard (`grep -c "UPDATE medicine " = 0`). **The migration is not live.**
**Failure:** (1) `medicine.stock_quantity` is **stale/unmaintained** — any admin/inventory report reading `medicine.*` shows wrong numbers (POS is fine, it reads batches). (2) **No DB-level oversell guard** — overselling is prevented only by app `FOR UPDATE` logic; any path bypassing it (C1, or a direct detail insert) can drive batch stock negative silently.
**Fix:** Verify against prod; apply the 2026-03-20 migration (re-run its reconciliation CTE first). Add the CI migration-applied check.

### C3. `completed` is unreachable through the proc — `visit_status_history` CHECK omits it
**Files:** `visit_status_history_status_check` (`tables.md:4882`) vs `visit_status_check` (`tables.md:4836`) vs proc `update_and_log_visit_status`
`visit` allows `completed`; `visit_status_history` allows `{… payment_done, admitted, discharged}` — **`completed` is missing**. The proc updates `visit.status` then inserts a history row.
**Failure:** Moving a visit to `completed` *via the proc* sets `visit.status='completed'`, then the history INSERT violates the constraint → whole CALL aborts → 500, visit never completes through the audited path. Cashier settle only sets `payment_done`, so **visits silently never reach `completed`** through the proper path — the terminal state is effectively unreachable.
**Fix:** Add `'completed'` to `visit_status_history_status_check`; align both DB checks + the app enum to one canonical list.

## HIGH

### H1. `/api/visit` PATCH writes `visit.status` directly — skips history AND the payment-due guard
`src/app/api/visit/route.ts` PATCH validates via `assertVisitStatusTransition` but does a direct `UPDATE visit SET … status=$5`. No `visit_status_history` row, and **none** of the outstanding-due check that `/api/visit/status/route.ts:44-89` enforces.
**Failure:** A client can PATCH `status:"payment_done"`/`"completed"` with dues outstanding → succeeds, no audit, bill still unpaid.
**Fix:** Route status changes through the proc + shared due-check, or reject `status` in this PATCH.

### H2. Cashier reversal doesn't revert the visit status it caused
`src/app/api/cashier/reversal/route.ts:206-274`. Settle auto-advances the visit to `payment_done` when due hits 0; the reversal recomputes `bill.payment_status` back to `Unpaid`/`Partial` but **never touches `visit.status`**.
**Failure:** Reverse a payment → bill `Unpaid`, but visit stays `payment_done` (downstream UIs treat it as paid). Money state and visit state diverge.
**Fix:** In the reversal txn, transition the visit back via the proc + history + audit.

### H3. App lifecycle enum and DB constraints disagree (`dispensing` vs `admitted`/`completed`)
`src/lib/server/visitLifecycle.ts:1-10` enum vs `visit_status_check` vs `visit_status_history_status_check`. App has `dispensing` (never written by any route — dead) and lacks `admitted`; `visit` allows `admitted`; history lacks `completed`.
**Failure:** If anything sets `admitted`, `parseVisitStatus` rejects it → all `canDoctorEdit*` helpers return false → visit **bricked** in the UI. Three sources of truth disagree.
**Fix:** One canonical status set across app enum + both DB checks; decide if `admitted`/`dispensing` are real (add transitions/writers) or remove them.

### H4. Stale `medicine.stock_quantity` consumed as authoritative stock
Consequence of C2: any route/report reading `medicine.stock_quantity` directly gets wrong data (batch-level is correct, master-level isn't). `validateInventoryItemsForSale` correctly reads batches, but other readers don't.
**Fix:** Apply C2's trigger, or make `medicine.stock_quantity` a derived/view value and audit every reader.

## MEDIUM

- **M1. Append-to-bill doesn't lock the bill while mutating `total_amount`** (`transactions/route.ts:538-564` vs `settle/route.ts:62-82` which takes `FOR UPDATE`). Concurrent settle can compute due against a stale total and mark an unpaid bill `Paid`. Add `FOR UPDATE` to the append path.
- **M2. `bill.payment_status` denormalized with no DB enforcement; append path hard-codes `'Unpaid'`** (`transactions/route.ts:558-564`), discarding prior payments. Bill total 100/paid 100 + append 50 → status forced `Unpaid`, UIs show 150 due instead of 50. Always recompute from `total_amount − Σ cashier_payment_txn`.
- **M3. Standalone sale-return restores stock but records NO money refund** (`transactions/return/route.ts:6-120`) — no `cashier_payment_txn` reversal, no bill adjustment. Revenue/cash-drawer overstated by returned amount. Post a compensating money entry + validate returned qty ≤ sold − already-returned per batch.
- **M4. Returns attributed to hardcoded `getCurrentStaffId()=1`** (`transactions/return/route.ts:24`) while the sale path resolves the real staff. Broken audit attribution + FK risk.
- **M5. `check_stock_available` expiry predicate inconsistent** (excludes NULL-expiry; `v_medicine_pos`/`get_stock_display` include it) and is unused by the write path. Align predicate or remove.

## LOW
- **L1.** `/api/return/[patientId]` is a stub that echoes input — ensure no client relies on it.
- **L2.** Settle allocation `Math.min(remaining, mappingOpen, saleDue||mappingOpen)` masks a sale/mapping desync rather than surfacing it (`settle/route.ts:200`).
- **L3.** Sale auto-transition to `medicines_dispensed` only fires for prescription sales, not append-to-bill OTC-on-visit (`transactions/route.ts:656-678`) — confirm intent.
- **L4.** Reversal `pharmacy_sale.due_amount` CASE logic is fragile (correct outcome today, confusing for future edits).

## Prioritized Top 10
1. **C1** — fake transaction in purchase-return (non-atomic stock/money). Rewrite to a dedicated client.
2. **C2** — live stock trigger missing `medicine` update + negative guard; 2026-03-20 migration never applied. Verify + apply.
3. **C3** — `completed` unreachable via the proc (history CHECK). Fix constraint.
4. **H1** — `/api/visit` PATCH direct status write: no history, no due guard. Route through proc.
5. **H2** — reversal doesn't revert visit status; money vs visit diverge.
6. **M3** — sale returns record no refund; revenue overstated.
7. **M2** — append hard-codes `Unpaid`, discards prior payments.
8. **M1** — append doesn't lock bill; race marks unpaid bills paid.
9. **H3** — app enum vs DB checks disagree (`admitted`/`dispensing`/`completed`).
10. **M4** — returns attributed to `staff_id=1`.
