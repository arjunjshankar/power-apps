import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CardValue } from "@/lib/workflows/queries";

export function DashboardCards({ cards }: { cards: CardValue[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {c.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-slate-900">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
