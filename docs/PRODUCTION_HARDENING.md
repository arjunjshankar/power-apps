# Production Hardening

This POC is a demo. It does **not** satisfy regulatory requirements and must
not be deployed as-is. The list below is what a production implementation
would change; the architecture was structured so each item is a bounded
replacement, not a rewrite.

## Identity & access
- Replace the persona switcher with enterprise SSO (Microsoft Entra ID, Okta,
  or any OIDC/SAML provider). `getCurrentUser()` in `src/lib/auth/session.ts`
  is the single seam.
- Real user/group directory instead of `PERSONAS`; map IdP groups to roles.
- Fine-grained authorization where needed (record-level access, e.g. by team
  or region), layered into `checkAction`/query scoping.
- Session management, MFA enforcement via the IdP, and admin re-authentication
  for highly privileged actions.

## Data & persistence
- PostgreSQL (managed, e.g. RDS/Cloud SQL) instead of SQLite; Prisma
  migrations in CI. Encryption at rest and TLS in transit.
- Backups with tested restore, point-in-time recovery, and a disaster-recovery
  plan (RPO/RTO defined per workflow criticality).
- Audit retention policy (append-only storage or WORM export for compliance),
  plus archival strategy for closed records.
- Field-level handling review: encrypt or tokenize sensitive KYC fields; avoid
  logging record payloads.

## Integrations
- Replace mock adapters with real clients (KYC vendor, PSP refunds API,
  feature-flag service or an owned flag store). Keep the
  `IntegrationAdapter` interface.
- Secrets from a manager (Vault, AWS Secrets Manager, Doppler) — never in
  source or plain env files in repos.
- Idempotency keys and retry/timeout policies for money-moving calls;
  reconcile failures into a Payment Exceptions-style queue.

## Application security
- Security review / penetration test before handling real data.
- Rate limiting and abuse protection on server actions.
- CSRF/session hardening, CSP headers, dependency scanning in CI.
- Input validation is already schema-driven; extend to file uploads if added.

## Operations
- Observability: structured logs, error tracking (e.g. Sentry), metrics and
  alerting on action failures and integration errors.
- CI/CD: lint + typecheck + unit + e2e gates (already runnable via npm
  scripts), staged deployments, infrastructure as code.
- Deployment: any Node-capable platform (Vercel, ECS, Fly.io). Single
  monolith keeps this simple; no Kubernetes required at this scale.

## Compliance
- Map audit events to regulatory retention requirements (e.g. BSA/AML
  record-keeping for KYC decisions).
- Access reviews and least-privilege role assignments.
- Change management for Workflow Studio: publish approvals, definition
  version history, and rollback.
