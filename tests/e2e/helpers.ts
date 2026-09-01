import type { BrowserContext } from "@playwright/test";

export const PERSONA = {
  analyst: "u-priya",
  supervisor: "u-marcus",
  opsAdmin: "u-elena",
  engAdmin: "u-devon",
} as const;

export async function usePersona(context: BrowserContext, personaId: string) {
  await context.addCookies([
    { name: "ops-persona", value: personaId, url: "http://localhost:3000" },
  ]);
}
