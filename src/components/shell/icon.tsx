import {
  Banknote,
  ClipboardList,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  ToggleLeft,
  Wrench,
  AlertTriangle,
  Calculator,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Banknote,
  ClipboardList,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  ToggleLeft,
  Wrench,
  AlertTriangle,
  Calculator,
};

export function WorkflowIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? ClipboardList;
  return <Icon className={className} />;
}
