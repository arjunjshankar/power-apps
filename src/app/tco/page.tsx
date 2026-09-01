import { TcoCalculator } from "./tco-calculator";

export default function TcoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Cost Model</h1>
        <p className="mt-1 text-sm text-slate-500">
          Compare the current $250,000/year internal-tool platform license against owning a
          Devin-maintained platform. All alternative-cost assumptions are editable — nothing
          below is presented as fact except the current license baseline.
        </p>
      </div>
      <TcoCalculator />
    </div>
  );
}
