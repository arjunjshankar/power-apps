import { cookies } from "next/headers";
import { DEFAULT_PERSONA_ID, getPersona, type User } from "./personas";

export const PERSONA_COOKIE = "ops-persona";

// The single seam between the app and its identity provider.
// Production: replace with a real OIDC/SAML session lookup.
export function getCurrentUser(): User {
  const id = cookies().get(PERSONA_COOKIE)?.value ?? DEFAULT_PERSONA_ID;
  return getPersona(id);
}
