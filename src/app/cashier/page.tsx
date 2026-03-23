import { Suspense } from "react";
import CashierWorkspace from "@/src/features/cashier/workspace/components/CashierWorkspace";

export default function CashierPage() {
  return (
    <Suspense fallback={null}>
      <CashierWorkspace />
    </Suspense>
  );
}
