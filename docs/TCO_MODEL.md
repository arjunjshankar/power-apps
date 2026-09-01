# TCO Model — Assumptions and Methodology

The in-app TCO calculator (`/tco`) compares the customer's current
internal-tool platform expense against an owned, Devin-maintained platform.

## Known baseline

- **Current license expense: ~$250,000 / year.** This is the customer-provided
  figure and the only number treated as fact.

## Editable assumptions (not facts)

Every other input is an editable assumption, presented as such in the UI:

| Variable | Meaning |
|---|---|
| Annual Devin cost | Subscription/usage spend on Devin |
| Infrastructure cost / yr | Hosting, database, monitoring for the owned platform |
| One-time implementation cost | Initial build & migration investment (year 1 only) |
| Engineering maintenance (hrs/mo) | Human time reviewing/steering internal-tools work |
| Fully loaded engineering cost ($/hr) | Salary + overhead per engineering hour |
| Planning horizon | 1 / 3 / 5 years |

## Method

- Owned-platform annual cost = Devin cost + infrastructure +
  (maintenance hours × 12 × hourly cost); year 1 adds implementation cost.
- Status-quo annual cost = license expense (assumed flat).
- The calculator reports year-1, 3-year, and 5-year totals for both options,
  cumulative savings, and the break-even point (if any) within the horizon.

## Scenarios

Three clearly labeled **hypothetical** presets (Conservative, Moderate,
Aggressive) vary the assumption inputs so the conversation starts from ranges
rather than a single invented number. None of them claim the $250K becomes
pure savings — the owned platform carries real engineering, infrastructure,
and maintenance costs.

## What the model deliberately excludes

- Productivity gains, opportunity cost, and risk-reduction value (real but
  speculative — better argued qualitatively).
- License price escalation and per-seat growth in the status quo (which would
  favor the owned platform; excluded to keep the baseline conservative).
- Devin cost changes over time.

The intended take-away is not a precise ROI figure. It is that a known,
recurring ~$250K/yr expense creates a budget envelope inside which an owned
platform — with its costs stated openly — can be credibly evaluated.
