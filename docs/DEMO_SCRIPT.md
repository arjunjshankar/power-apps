# Demo Script (~15 minutes)

Setup: `npm install && npm run dev` → http://localhost:3000. The database
seeds itself. Start as **Priya Raman (Analyst)**.

## 1. The unified platform (1 min)
- Overview page: one product, five workflows in the sidebar, recent activity.
- Say: *"These are not five generated apps — they're five definitions running
  on one owned platform."*

## 2. KYC Review (3 min)
- Open **KYC Review**. Show saved views: Unassigned, Assigned to Me, High
  Risk, Escalated, Recently Completed. Search and sort.
- Open a pending case (e.g. Amara Osei). Show risk context, flagged reasons,
  verification signals. Click **Assign to Me** → status changes, audit entry
  appears in History.
- Open the escalated high-risk case **Fatima Al-Rashid** and try **Approve**
  as the analyst → blocked: *"High-risk cases require supervisor approval."*
  Emphasize: enforced server-side, not just hidden buttons.
- Switch persona to **Marcus Webb (Supervisor)**, approve the same case,
  show the audit trail with both attempts' context.

## 3. Refunds (2 min)
- Open **Refunds**: same primitives, different business — dashboard cards
  (pending count/amount, approved amount, escalated).
- Approve a small refund as analyst — fine. Point at the $15,250 escalated
  refund: above the **configurable** threshold, supervisor-only.
- Visit **Administration** as Elena (Ops Admin): the threshold is a setting,
  not code. Change it live if asked.

## 4. Feature Flags (2 min)
- Switch to **Devon Kim (Eng Admin)** → **Feature Flags**. A different UI
  pattern entirely (flag panel, rollout slider, environment badges) —
  full-code custom component on the same platform.
- Toggle a production flag → explicit confirmation dialog. Show the change in
  Audit History.
- Switch back to Priya: Feature Flags disappears from nav; the URL itself 404s.

## 5. Workflow Studio — the key moment (3 min)
- As Elena/Devon, open **Workflow Studio**. Show that **Payment Exceptions**
  is a published Studio workflow: open it and show the configuration — fields,
  statuses, actions, roles. No code.
- Create a small new workflow live (e.g. "Vendor Reviews"): a few fields,
  three statuses, one approve action, publish → it appears in nav and works
  immediately: create a record, run the transition, see the audit event.

## 6. The extension model (1 min)
- Level 1: what you just saw (Studio).
- Level 2: open `src/workflows/merchant-onboarding.ts` — an entire workflow in
  ~150 typed lines; the pattern Devin implements from a business description
  (show `docs/ADDING_A_WORKFLOW_WITH_DEVIN.md` prompts).
- Level 3: the Feature Flags panel — normal React when the business needs it.

## 7. TCO (2 min)
- Open **TCO**. Known baseline: ~$250K/yr license expense. All alternative
  costs are editable assumptions with three labeled hypothetical scenarios —
  1/3/5-year totals, cumulative delta, break-even.
- Close: *"You own the platform, the code, and the roadmap. Devin is the
  engineering capacity that keeps extending it."*

## Fallbacks
- If something looks off mid-demo: `npm run db:reset` restores the seeded state.
- Tests as proof of engineering practice: `npm test` (23 unit),
  `npm run test:e2e` (6 Playwright flows).
