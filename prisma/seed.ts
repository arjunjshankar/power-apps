/* eslint-disable no-console */
// Seeds the demo database with realistic synthetic data for all workflows,
// a pre-published studio workflow (Payment Exceptions), platform settings,
// and a believable audit trail. Entirely synthetic — no real customer data.

import { PrismaClient } from "@prisma/client";
import { PERSONAS } from "../src/lib/auth/personas";
import { paymentExceptionsDefinition } from "./seed-data/payment-exceptions";
import { chargebackReviewDefinition } from "./seed-data/chargeback-review";

const prisma = new PrismaClient();

const [priya, marcus, elena, devon] = PERSONAS;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

interface SeedRecord {
  workflow: string;
  status: string;
  assigneeId?: string;
  data: Record<string, unknown>;
}

const kycNames = [
  ["Amara Osei", "Individual", "UK", 82, "High", ["Sanctions list partial match", "PEP indicator"]],
  ["Meridian Trading LLC", "Business", "US", 91, "High", ["High-risk jurisdiction", "Document mismatch"]],
  ["Jonas Keller", "Individual", "EU", 74, "High", ["Velocity anomaly"]],
  ["Sofia Almeida", "Individual", "BR", 45, "Medium", ["Address verification failed"]],
  ["Northwind Imports Inc", "Business", "US", 52, "Medium", ["Document mismatch"]],
  ["Chen Wei", "Individual", "SG", 38, "Medium", []],
  ["Lucia Marino", "Individual", "EU", 22, "Low", []],
  ["Bluebird Software Ltd", "Business", "UK", 18, "Low", []],
  ["Diego Fuentes", "Individual", "MX", 61, "Medium", ["Velocity anomaly"]],
  ["Harbor Analytics Corp", "Business", "CA", 29, "Low", []],
  ["Fatima Al-Rashid", "Individual", "UK", 77, "High", ["PEP indicator"]],
  ["Oakstone Ventures", "Business", "US", 33, "Low", []],
] as const;

const kycStatuses = [
  "pending", "pending", "in_review", "pending", "in_review", "pending",
  "approved", "approved", "escalated", "pending", "escalated", "rejected",
];

const refundRows = [
  ["Amelia Torres", 129.99, "USD", "Duplicate charge", "pending"],
  ["Ravi Patel", 15250.0, "USD", "Fraudulent transaction", "escalated"],
  ["Hannah Lee", 49.0, "USD", "Billing error", "in_review"],
  ["Global Foods Co", 8400.5, "USD", "Service not delivered", "pending"],
  ["Tom Becker", 320.75, "EUR", "Customer dispute", "in_review"],
  ["Ines Rodrigues", 2150.0, "USD", "Duplicate charge", "pending"],
  ["Yusuf Ahmed", 78.25, "GBP", "Goodwill", "approved"],
  ["Clara Novak", 990.0, "USD", "Billing error", "approved"],
  ["Piotr Kowalski", 5600.0, "USD", "Customer dispute", "escalated"],
  ["Maya Singh", 34.5, "USD", "Duplicate charge", "rejected"],
  ["Ben Carter", 445.0, "USD", "Service not delivered", "pending"],
  ["Ling Zhang", 1875.0, "USD", "Billing error", "info_requested"],
] as const;

const flagRows = [
  ["new-onboarding-flow", "Redesigned merchant onboarding UI", "devon@acmepay.dev", "production", true, 25, "All users"],
  ["instant-payouts", "Instant payout rails for eligible merchants", "devon@acmepay.dev", "production", false, 0, "Enterprise accounts"],
  ["risk-model-v3", "Third-generation transaction risk model", "priya@acmepay.dev", "staging", true, 100, "Internal users"],
  ["dark-mode", "Dashboard dark mode", "elena@acmepay.dev", "development", true, 100, "All users"],
  ["fee-calculator-v2", "Updated fee calculation engine", "marcus@acmepay.dev", "production", true, 50, "Beta cohort"],
  ["kyb-auto-verify", "Automated business verification", "devon@acmepay.dev", "staging", true, 75, "New signups"],
  ["ledger-reconciliation", "New reconciliation pipeline", "devon@acmepay.dev", "development", false, 0, "Internal users"],
] as const;

const merchantRows = [
  ["Brightcart Commerce", "E-commerce", "US", 120000, "Tier 1 (Low)", "submitted"],
  ["Skyline SaaS GmbH", "SaaS", "EU", 640000, "Tier 2 (Medium)", "under_review"],
  ["QuickServe POS", "Retail POS", "US", 85000, "Tier 1 (Low)", "under_review"],
  ["Atlas Marketplace", "Marketplace", "UK", 1250000, "Tier 3 (High)", "submitted"],
  ["Nimbus Consulting", "Professional Services", "CA", 30000, "Tier 1 (Low)", "approved"],
  ["Velo Rides Inc", "Marketplace", "US", 480000, "Tier 2 (Medium)", "docs_requested"],
  ["Painted Door Retail", "Retail POS", "AU", 95000, "Tier 2 (Medium)", "declined"],
] as const;

const chargebackRows = [
  ["CB-90112", "Nina Alvarez", "Brightcart Commerce", 245.5, "Fraudulent transaction", "Medium", "new"],
  ["CB-90144", "Owen Marsh", "QuickServe POS", 7899.0, "Product not received", "High", "inReview"],
  ["CB-90178", "Grace Ito", "Atlas Marketplace", 62.0, "Duplicate processing", "Low", "inReview"],
  ["CB-90201", "Malik Johnson", "Velo Rides Inc", 1320.75, "Product unacceptable", "Medium", "escalated"],
  ["CB-90233", "Elsa Berg", "Skyline SaaS GmbH", 410.0, "Credit not processed", "Low", "new"],
  ["CB-90265", "Ravi Shah", "Painted Door Retail", 12480.0, "Fraudulent transaction", "High", "escalated"],
  ["CB-90297", "Ana Costa", "Brightcart Commerce", 88.9, "Duplicate processing", "Low", "approved"],
  ["CB-90310", "Leo Fischer", "Nimbus Consulting", 530.25, "Product not received", "Medium", "rejected"],
] as const;

const exceptionRows = [
  ["TXN-88231", "Settlement mismatch", 1240.55, "Stripe", "new"],
  ["TXN-88412", "Duplicate capture", 89.99, "Adyen", "investigating"],
  ["TXN-88540", "Currency conversion error", 2310.0, "Stripe", "new"],
  ["TXN-88601", "Timeout — unknown state", 560.25, "Checkout.com", "investigating"],
  ["TXN-88712", "Settlement mismatch", 15.75, "Adyen", "resolved"],
  ["TXN-88790", "Chargeback received", 4200.0, "Stripe", "new"],
] as const;

async function main() {
  console.log("Seeding demo data...");

  await prisma.auditEvent.deleteMany();
  await prisma.workflowRecord.deleteMany();
  await prisma.studioWorkflow.deleteMany();
  await prisma.platformSetting.deleteMany();

  // Platform settings — the refund supervisor-approval threshold is
  // configuration, not code.
  await prisma.platformSetting.create({
    data: { key: "refund.approvalThreshold", value: JSON.stringify(1000) },
  });

  // Payment Exceptions and Chargeback Review ship as pre-published
  // builder-defined workflows (stored in the DB, not in code) to demonstrate
  // Level 1 (no-code) workflow creation.
  await prisma.studioWorkflow.create({
    data: {
      slug: paymentExceptionsDefinition.slug,
      definition: JSON.stringify(paymentExceptionsDefinition),
      published: true,
    },
  });
  await prisma.studioWorkflow.create({
    data: {
      slug: chargebackReviewDefinition.slug,
      definition: JSON.stringify(chargebackReviewDefinition),
      published: true,
    },
  });

  const records: SeedRecord[] = [];

  kycNames.forEach(([name, type, jurisdiction, riskScore, riskLevel, reasons], i) => {
    records.push({
      workflow: "kyc-review",
      status: kycStatuses[i],
      assigneeId:
        kycStatuses[i] === "in_review" ? (i % 2 === 0 ? priya.id : marcus.id) : undefined,
      data: {
        customerName: name,
        customerType: type,
        jurisdiction,
        submittedAt: daysAgo(2 + i),
        riskScore,
        riskLevel,
        flaggedReasons: reasons,
        verificationSignals:
          riskLevel === "High"
            ? "Document authenticity check: PASS. Liveness check: PASS. Watchlist screening: REVIEW REQUIRED. Adverse media: 2 potential matches."
            : "Document authenticity check: PASS. Liveness check: PASS. Watchlist screening: CLEAR. Adverse media: none.",
        notes: "",
      },
    });
  });

  refundRows.forEach(([customer, amount, currency, reason, status], i) => {
    records.push({
      workflow: "refunds",
      status,
      assigneeId: status === "in_review" ? priya.id : undefined,
      data: {
        refundId: `RF-${10240 + i}`,
        paymentId: `PAY-${77300 + i * 7}`,
        customerName: customer,
        amount,
        currency,
        reason,
        requestedAt: daysAgo(1 + i),
        requestedBy: ["support@acmepay.dev", "disputes@acmepay.dev"][i % 2],
        notes: "",
      },
    });
  });

  flagRows.forEach(([flagKey, description, owner, environment, enabled, rollout, segment], i) => {
    records.push({
      workflow: "feature-flags",
      status: "active",
      data: {
        flagKey,
        description,
        owner,
        environment,
        enabled,
        rolloutPercentage: rollout,
        targetSegment: segment,
        createdAt2: daysAgo(30 + i * 12),
      },
    });
  });

  merchantRows.forEach(([businessName, businessType, country, volume, riskTier, status], i) => {
    records.push({
      workflow: "merchant-onboarding",
      status,
      assigneeId: status === "under_review" ? marcus.id : undefined,
      data: {
        businessName,
        businessType,
        country,
        expectedMonthlyVolume: volume,
        volumeCurrency: "USD",
        riskTier,
        contactEmail: `founders@${String(businessName).toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`,
        appliedAt: daysAgo(3 + i * 2),
        documentsComplete: status !== "docs_requested",
        notes: "",
      },
    });
  });

  chargebackRows.forEach(
    ([chargebackId, customerName, merchantName, amount, reason, riskLevel, status], i) => {
      records.push({
        workflow: "chargeback-review",
        status,
        assigneeId: status === "inReview" ? priya.id : status === "escalated" ? marcus.id : undefined,
        data: {
          chargebackId,
          customerName,
          merchantName,
          amount,
          currency: "USD",
          reason,
          submittedAt: daysAgo(1 + i * 2),
          riskLevel,
          notes: "",
        },
      });
    }
  );

  exceptionRows.forEach(([transactionId, exceptionType, amount, processor, status], i) => {
    records.push({
      workflow: "payment-exceptions",
      status,
      data: {
        transactionId,
        exceptionType,
        amount,
        processor,
        detectedAt: daysAgo(i),
        details: `Automated reconciliation flagged ${transactionId}: ${exceptionType}.`,
      },
    });
  });

  for (const r of records) {
    const created = await prisma.workflowRecord.create({
      data: {
        workflow: r.workflow,
        status: r.status,
        assigneeId: r.assigneeId,
        data: JSON.stringify(r.data),
      },
    });
    await prisma.auditEvent.create({
      data: {
        actorId: elena.id,
        actorName: elena.name,
        actorRole: elena.role,
        workflow: r.workflow,
        recordId: created.id,
        action: "Created record",
        toState: r.status,
      },
    });
  }

  // A few richer audit events so the history views look lived-in.
  const someKyc = await prisma.workflowRecord.findFirst({
    where: { workflow: "kyc-review", status: "approved" },
  });
  if (someKyc) {
    await prisma.auditEvent.create({
      data: {
        actorId: marcus.id,
        actorName: marcus.name,
        actorRole: marcus.role,
        workflow: "kyc-review",
        recordId: someKyc.id,
        action: "Approve",
        fromState: "in_review",
        toState: "approved",
        metadata: JSON.stringify({ integration: "Recorded KYC decision with vendor" }),
      },
    });
  }
  const someFlag = await prisma.workflowRecord.findFirst({
    where: { workflow: "feature-flags" },
  });
  if (someFlag) {
    await prisma.auditEvent.create({
      data: {
        actorId: devon.id,
        actorName: devon.name,
        actorRole: devon.role,
        workflow: "feature-flags",
        recordId: someFlag.id,
        action: "Edited fields",
        metadata: JSON.stringify({ updates: { rolloutPercentage: 25 } }),
      },
    });
  }

  console.log(`Seeded ${records.length} records across 6 workflows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
