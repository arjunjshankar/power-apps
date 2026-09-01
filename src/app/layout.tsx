import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth/session";
import { canSeeWorkflow } from "@/lib/auth/permissions";
import { getAllWorkflows } from "@/lib/workflows/registry";
import { AppShell } from "@/components/shell/app-shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AcmePay Ops — Internal Operations Platform",
  description: "Unified internal operations platform (Power Apps replacement POC)",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  const workflows = (await getAllWorkflows()).filter((wf) => canSeeWorkflow(user, wf));

  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        <AppShell user={user} workflows={workflows}>
          {children}
        </AppShell>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
