import { cn } from "@/lib/utils";

const COLOR_CLASSES: Record<string, string> = {
  gray: "bg-slate-100 text-slate-700 ring-slate-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  yellow: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
  orange: "bg-orange-50 text-orange-700 ring-orange-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  green: "bg-green-50 text-green-700 ring-green-600/20",
  purple: "bg-purple-50 text-purple-700 ring-purple-600/20",
};

export function Badge({
  color = "gray",
  className,
  children,
}: {
  color?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        COLOR_CLASSES[color] ?? COLOR_CLASSES.gray,
        className
      )}
    >
      {children}
    </span>
  );
}
