import { test, expect } from "@playwright/test";
import { PERSONA, usePersona } from "./helpers";

test.describe.configure({ mode: "serial" });

test("builder-defined chargeback workflow: queue, transition, and audit", async ({
  page,
  context,
}) => {
  await usePersona(context, PERSONA.analyst);
  await page.goto("/w/chargeback-review");
  await expect(page.getByRole("heading", { name: "Chargeback Review" })).toBeVisible();

  await page.getByRole("link", { name: "CB-90112" }).click();
  await expect(page.getByText("New").first()).toBeVisible();
  await page.getByRole("button", { name: "Start Review" }).click();
  await expect(page.getByText("In Review").first()).toBeVisible();
  await expect(page.getByText("Priya Raman").first()).toBeVisible();
  // Audit event for the transition appears in the record history.
  await expect(page.getByText("Start Review").first()).toBeVisible();
});

test("rule guard: analyst blocked from approving a >$5,000 chargeback; supervisor allowed", async ({
  browser,
}) => {
  const analystCtx = await browser.newContext();
  await usePersona(analystCtx, PERSONA.analyst);
  const analystPage = await analystCtx.newPage();
  await analystPage.goto("/w/chargeback-review");
  await analystPage.getByRole("link", { name: "CB-90144" }).click();
  await analystPage.getByRole("button", { name: "Approve Chargeback" }).click();
  await analystPage.getByRole("button", { name: /Confirm/ }).click();
  await expect(
    analystPage.getByText(/require supervisor approval/i).first()
  ).toBeVisible();
  const url = analystPage.url();
  await analystCtx.close();

  const supCtx = await browser.newContext();
  await usePersona(supCtx, PERSONA.supervisor);
  const supPage = await supCtx.newPage();
  await supPage.goto(url);
  await supPage.getByRole("button", { name: "Approve Chargeback" }).click();
  await supPage.getByRole("button", { name: /Confirm/ }).click();
  await expect(supPage.getByText("Approved").first()).toBeVisible();
  await supCtx.close();
});

test("admin creates and publishes a new workflow through the guided builder", async ({
  page,
  context,
}) => {
  await usePersona(context, PERSONA.opsAdmin);
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "Workflow Builder" })).toBeVisible();
  await expect(page.getByText("Chargeback Review").first()).toBeVisible();

  await page.getByRole("link", { name: "Create workflow" }).click();

  // Step 1: Basics
  await page.getByPlaceholder("e.g. Chargeback Review").fill("Vendor Invoices");
  await page.getByPlaceholder("e.g. chargeback", { exact: true }).fill("invoice");
  await page.getByRole("button", { name: /Next: Fields/ }).click();

  // Step 2: Fields (default "Name" field is enough)
  await page.getByRole("button", { name: /Next: States/ }).click();

  // Step 3: States (defaults)
  await page.getByRole("button", { name: /Next: Actions/ }).click();

  // Step 4: Actions (default Approve action)
  await page.getByRole("button", { name: /Next: Queue/ }).click();

  // Step 5: Queue & views (defaults)
  await page.getByRole("button", { name: /Next: Preview/ }).click();

  // Step 6: Preview shows capabilities and Devin prompt, then publish.
  await expect(page.getByText("Platform capabilities used")).toBeVisible();
  await expect(page.getByText("Extend with Devin")).toBeVisible();
  await page.getByRole("button", { name: "Publish workflow" }).click();

  await expect(page.getByRole("heading", { name: "Vendor Invoices" })).toBeVisible();
  await expect(page).toHaveURL(/\/w\/vendor-invoices/);
});
