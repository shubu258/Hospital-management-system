import { Card } from "./Card";
import { cn } from "@/lib/cn";

const HINT_CLASSES = {
  green: "text-green-600",
  slate: "text-slate-500",
  blue: "text-blue-600",
};

export function StatCard({
  label,
  value,
  hint,
  hintColor = "slate",
}: {
  label: string;
  value: string | number;
  hint?: string;
  hintColor?: keyof typeof HINT_CLASSES;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {hint && <p className={cn("mt-1 text-xs font-medium", HINT_CLASSES[hintColor])}>{hint}</p>}
    </Card>
  );
}
