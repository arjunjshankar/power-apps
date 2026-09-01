import type { Role } from "@/lib/workflows/types";

// Demo persona system. Authentication is deliberately isolated behind
// getCurrentUser() (see session.ts) so a production deployment can swap in
// Entra ID / Okta / any OIDC provider without touching application logic.

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
}

export const PERSONAS: User[] = [
  {
    id: "u-priya",
    name: "Priya Raman",
    email: "priya@acmepay.dev",
    role: "analyst",
    initials: "PR",
  },
  {
    id: "u-marcus",
    name: "Marcus Webb",
    email: "marcus@acmepay.dev",
    role: "supervisor",
    initials: "MW",
  },
  {
    id: "u-elena",
    name: "Elena Sousa",
    email: "elena@acmepay.dev",
    role: "ops_admin",
    initials: "ES",
  },
  {
    id: "u-devon",
    name: "Devon Kim",
    email: "devon@acmepay.dev",
    role: "eng_admin",
    initials: "DK",
  },
];

export const DEFAULT_PERSONA_ID = "u-priya";

export function getPersona(id: string | undefined): User {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}
