import { FileText } from "lucide-react";
import { EmptyState } from "@/src/components/ui/EmptyState";

// Lab report generation is not built yet; this slot is not wired into the lab
// tab bar. Clean placeholder (replaces the prior `<h2>dkd</h2>`) so it never
// renders garbage if routed to.
export default function Reports() {
  return (
    <EmptyState
      icon={<FileText size={22} />}
      title="Lab reports"
      hint="Printable result reports are coming soon."
    />
  );
}
