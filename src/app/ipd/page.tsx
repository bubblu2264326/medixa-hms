import { Suspense } from "react";
import IpdWorkspace from "@/src/features/ipd/components/IpdWorkspace";

export default function IpdPage() {
  return (
    <Suspense fallback={null}>
      <IpdWorkspace />
    </Suspense>
  );
}
