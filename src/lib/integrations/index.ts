// Integration adapter layer.
//
// Every external side effect is routed through a named adapter implementing
// IntegrationAdapter. The POC registers mock implementations; a production
// deployment replaces a mock with a real client (Stripe, a KYC vendor,
// LaunchDarkly, Slack, ...) without changing workflow or UI code.

export interface IntegrationResult {
  ok: boolean;
  detail: string;
}

export interface IntegrationAdapter {
  key: string;
  description: string;
  execute(payload: {
    recordId: string;
    workflow: string;
    action: string;
    data: Record<string, unknown>;
  }): Promise<IntegrationResult>;
}

function mock(key: string, description: string, detail: (d: Record<string, unknown>) => string): IntegrationAdapter {
  return {
    key,
    description,
    async execute({ data }) {
      // Production: call the real provider here.
      return { ok: true, detail: detail(data) };
    },
  };
}

const adapters: Record<string, IntegrationAdapter> = {};

export function registerIntegration(adapter: IntegrationAdapter) {
  adapters[adapter.key] = adapter;
}

export function getIntegration(key: string): IntegrationAdapter | undefined {
  return adapters[key];
}

// --- Mock adapters used by the demo workflows ------------------------------

registerIntegration(
  mock(
    "refund-provider",
    "Payment processor refund API (mock)",
    (d) => `Issued refund of ${d.amount} ${d.currency ?? "USD"} via payment provider`
  )
);

registerIntegration(
  mock(
    "kyc-provider",
    "KYC verification vendor (mock)",
    (d) => `Recorded KYC decision for ${d.customerName} with vendor`
  )
);

registerIntegration(
  mock(
    "feature-flag-provider",
    "Feature flag delivery system (mock)",
    (d) => `Propagated flag "${d.flagKey}" state to ${d.environment}`
  )
);

registerIntegration(
  mock(
    "notification-service",
    "Internal notification service (mock)",
    () => "Notified stakeholders"
  )
);
