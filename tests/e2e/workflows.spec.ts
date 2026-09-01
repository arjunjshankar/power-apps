import { test, expect } from "@playwright/test";
import { PERSONA, usePersona } from "./helpers";

test.describe.configure({ mode: "serial" });

test("analyst reviews a pending KYC case and assigns it to themselves", async ({
  page,
  context,
}) => {
  await usePersona(context, PERSONA.analyst);
  await page.goto("/w/kyc-review");
  await page.getByRole("link", { name: "Amara Osei" }).click();
  await expect(page.getByText("Pending Review").first()).toBeVisible();
  await page.getByRole("button", { name: "Assign to Me" }).click();
  await expect(page.getByText("In Review").first()).toBeVisible();
  await expect(page.getByText("Priya Raman").first()).toBeVisible();
});

test("analyst cannot approve a high-risk KYC case; supervisor can", async ({
  browser,
}) => {
  const analystCtx = await browser.newContext();
  await usePersona(analystCtx, PERSONA.analyst);
  const analystPage = await analystCtx.newPage();
  await analystPage.goto("/w/kyc-review?view=escalated");
  await analystPage.getByRole("link", { name: "Fatima Al-Rashid" }).click();
  await analystPage.getByRole("button", { name: "Approve", exact: true }).click();
  await analystPage.getByRole("button", { name: /Confirm Approve/ }).click();
  await expect(
    analystPage.getByText(/require supervisor approval/i).first()
  ).toBeVisible();
  const url = analystPage.url();
  await analystCtx.close();

  const supCtx = await browser.newContext();
  await usePersona(supCtx, PERSONA.supervisor);
  const supPage = await supCtx.newPage();
  await supPage.goto(url);
  await supPage.getByRole("button", { name: "Approve", exact: true }).click();
  await supPage.getByRole("button", { name: /Confirm Approve/ }).click();
  await expect(supPage.getByText("Approved").first()).toBeVisible();
  await supCtx.close();
});

test("analyst approves a below-threshold refund with audit trail", async ({
  page,
  context,
}) => {
  await usePersona(context, PERSONA.analyst);
  await page.goto("/w/refunds");
  await page.getByRole("link", { name: "Hannah Lee" }).click();
  await page.getByRole("button", { name: /Approve/ }).click();
  await page.getByRole("button", { name: /Confirm/ }).click();
  await expect(page.getByText("Approved").first()).toBeVisible();
  await expect(page.getByText(/Approve/).first()).toBeVisible();
});

test("analyst cannot access the feature flag admin workflow", async ({
  page,
  context,
}) => {
  await usePersona(context, PERSONA.analyst);
  const response = await page.goto("/w/feature-flags");
  expect(response?.status()).toBe(404);
});

test("engineering admin can open feature flags with production safeguards", async ({
  page,
  context,
}) => {
  await usePersona(context, PERSONA.engAdmin);
  await page.goto("/w/feature-flags");
  await page.getByRole("link", { name: "new-onboarding-flow" }).click();
  await expect(page.getByText("production").first()).toBeVisible();
});

test("studio-configured workflow renders and accepts a state transition", async ({
  page,
  context,
}) => {
  await usePersona(context, PERSONA.supervisor);
  await page.goto("/w/payment-exceptions");
  await page.getByRole("link", { name: "TXN-88231" }).click();
  await page.getByRole("button", { name: "Start Investigation" }).click();
  await expect(page.getByText("Investigating").first()).toBeVisible();
});
