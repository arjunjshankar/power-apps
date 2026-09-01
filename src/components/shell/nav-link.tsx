"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { WorkflowIcon } from "./icon";

export function NavLink({
  href,
  icon,
  label,
  exact = false,
}: {
  href: string;
  icon: string;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        active ? "bg-slate-800 font-medium text-white" : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
      )}
    >
      <WorkflowIcon name={icon} className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}
