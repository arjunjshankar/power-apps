"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

interface Assumptions {
  licenseCost: number; // current platform, per year (known baseline)
  devinCost: number; // per year
  infraCost: number; // per year
  maintenanceFte: number; // fraction of an engineer per year
  loadedEngCost: number; // fully loaded cost per engineer-year
  implementationCost: number; // one-time, year 1
}

const SCENARIOS: Record<string, Assumptions> = {
  Conservative: {
    licenseCost: 250000,
    devinCost: 60000,
    infraCost: 12000,
    maintenanceFte: 0.5,
    loadedEngCost: 220000,
    implementationCost: 120000,
  },
  Moderate: {
    licenseCost: 250000,
    devinCost: 40000,
    infraCost: 8000,
    maintenanceFte: 0.25,
    loadedEngCost: 220000,
    implementationCost: 80000,
  },
  Aggressive: {
    licenseCost: 250000,
    devinCost: 25000,
    infraCost: 5000,
    maintenanceFte: 0.1,
    loadedEngCost: 220000,
    implementationCost: 40000,
  },
};

export function TcoCalculator() {
  const [a, setA] = useState<Assumptions>(SCENARIOS.Moderate);
  const [scenario, setScenario] = useState<string>("Moderate");

  const model = useMemo(() => {
    const ownedAnnual = a.devinCost + a.infraCost + a.maintenanceFte * a.loadedEngCost;
    const years = [1, 2, 3, 4, 5].map((year) => {
      const license = a.licenseCost * year;
      const owned = ownedAnnual * year + a.implementationCost;
      return { year, license, owned, savings: license - owned };
    });
    const annualSavings = a.licenseCost - ownedAnnual;
    const breakEvenYears =
      annualSavings > 0 ? a.implementationCost / annualSavings : Infinity;
    return { ownedAnnual, years, annualSavings, breakEvenYears };
  }, [a]);

  function field(key: keyof Assumptions, label: string, help?: string) {
    return (
      <div className="space-y-1">
        <Label htmlFor={key}>{label}</Label>
        <Input
          id={key}
          type="number"
          min={0}
          step="any"
          value={a[key]}
          onChange={(e) => {
            setScenario("Custom");
            setA((s) => ({ ...s, [key]: Number(e.target.value) }));
          }}
        />
        {help && <p className="text-xs text-slate-500">{help}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {Object.keys(SCENARIOS).map((name) => (
          <Button
            key={name}
            size="sm"
            variant={scenario === name ? "default" : "outline"}
            onClick={() => {
              setScenario(name);
              setA(SCENARIOS[name]);
            }}
          >
            {name}
          </Button>
        ))}
        {scenario === "Custom" && (
          <Button size="sm" variant="ghost" disabled>
            Custom
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Assumptions</CardTitle>
            <CardDescription>Hypothetical, editable inputs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {field("licenseCost", "Current platform license ($/yr)", "Known baseline: ~$250K/yr")}
            {field("devinCost", "Devin cost ($/yr)")}
            {field("infraCost", "Incremental infrastructure ($/yr)")}
            {field("maintenanceFte", "Maintenance engineering (FTE)", "Fraction of one engineer-year")}
            {field("loadedEngCost", "Fully loaded engineer cost ($/yr)")}
            {field("implementationCost", "One-time implementation ($)")}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs uppercase tracking-wide text-slate-500">
                  Owned platform ($/yr)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatMoney(model.ownedAnnual)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs uppercase tracking-wide text-slate-500">
                  Annual savings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-semibold tabular-nums ${model.annualSavings >= 0 ? "text-green-700" : "text-red-700"}`}
                >
                  {formatMoney(model.annualSavings)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs uppercase tracking-wide text-slate-500">
                  Break-even
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {model.breakEvenYears === Infinity
                    ? "Never"
                    : `${model.breakEvenYears.toFixed(1)} yrs`}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cumulative cost comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="py-2 font-medium">Horizon</th>
                    <th className="py-2 text-right font-medium">Current platform</th>
                    <th className="py-2 text-right font-medium">Owned platform</th>
                    <th className="py-2 text-right font-medium">Cumulative savings</th>
                  </tr>
                </thead>
                <tbody>
                  {model.years
                    .filter((y) => [1, 3, 5].includes(y.year))
                    .map((y) => (
                      <tr key={y.year} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 font-medium">Year {y.year}</td>
                        <td className="py-2.5 text-right tabular-nums">{formatMoney(y.license)}</td>
                        <td className="py-2.5 text-right tabular-nums">{formatMoney(y.owned)}</td>
                        <td
                          className={`py-2.5 text-right font-semibold tabular-nums ${y.savings >= 0 ? "text-green-700" : "text-red-700"}`}
                        >
                          {formatMoney(y.savings)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-slate-500">
                The $250K/yr license expense is the customer-stated baseline. All owned-platform
                figures are editable hypotheses, not claims — see docs/TCO_MODEL.md for
                methodology.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
