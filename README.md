# Operations Platform

A proof-of-concept internal operations platform for a fintech company — built with
Devin — demonstrating how a shared, fully owned software platform can replace a
low-code internal-tool product such as Microsoft Power Apps.

Instead of three disconnected apps, this is **one platform** with a reusable
workflow runtime. Five workflows run on it today:

| Workflow | How it's built |
|---|---|
| KYC Review | Declarative TypeScript definition + shared runtime |
| Refunds | Declarative definition, configurable supervisor-approval threshold, dashboard |
| Feature Flags | Declarative definition + custom full-code detail UI (Level 3 extension) |
| Merchant Onboarding | Declarative definition only — pure reuse of the runtime |
| Payment Exceptions | Created entirely in the no-code **Workflow Studio** (stored in the database) |

Plus: **Workflow Studio** (create/edit/publish workflows without code), global
**Audit History**, **Administration** (configurable business rules), and a
**TCO calculator** framing the ~$250K/yr license spend against an owned platform.

## Quick start

```bash
git clone <repo>
cd power-apps
npm install
npm run dev
```

That's it. On first run the dev server automatically creates a local SQLite
database and seeds it with realistic synthetic demo data. Open
http://localhost:3000.

**Demo mode:** there is no login. Use the persona switcher (bottom of the
sidebar) to instantly switch between four demo roles:

- **Priya Raman** — Analyst
- **Marcus Webb** — Supervisor
- **Elena Sousa** — Operations Admin
- **Devon Kim** — Engineering Admin

No external services, credentials, or paid APIs are required. All data is
synthetic. Integrations (KYC vendor, refund provider, feature-flag service,
notifications) are local mock adapters behind explicit interfaces.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server (auto-creates + seeds the DB on first run) |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) — engine, permissions, validation, audit |
| `npm run test:e2e` | End-to-end tests (Playwright; run `npx playwright install chromium` once) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run db:reset` | Reset + reseed the demo database |

## Documentation

- [AGENTS.md](AGENTS.md) — instructions for Devin / AI agents and engineers
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — platform architecture
- [docs/POWER_APPS_REPLACEMENT.md](docs/POWER_APPS_REPLACEMENT.md) — capability mapping
- [docs/ADDING_A_WORKFLOW.md](docs/ADDING_A_WORKFLOW.md) — how to add a workflow
- [docs/ADDING_A_WORKFLOW_WITH_DEVIN.md](docs/ADDING_A_WORKFLOW_WITH_DEVIN.md) — example Devin prompts
- [docs/DEVIN_BUILD_LOG.md](docs/DEVIN_BUILD_LOG.md) — factual implementation journal
- [docs/PRODUCTION_HARDENING.md](docs/PRODUCTION_HARDENING.md) — path to production
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) — live demo walkthrough
- [docs/TCO_MODEL.md](docs/TCO_MODEL.md) — cost model methodology

## The thesis

> The company does not need Devin to independently rebuild every Power App.
> It can use Devin to build and maintain a shared internal operations platform,
> and then use that platform plus Devin to rapidly create new business workflows.

Three levels of customization make this concrete:

1. **Business configuration** — Workflow Studio: authorized operators create or
   modify workflows (fields, statuses, actions, roles) with no code.
2. **Declarative technical configuration** — new workflows are ~150-line typed,
   Zod-validated TypeScript definitions (`src/workflows/`).
3. **Full code** — anything unique is normal React/TypeScript: custom detail
   components, integration adapters, business guards. Devin operates across all
   three levels.
