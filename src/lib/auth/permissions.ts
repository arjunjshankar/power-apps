import type {
  ActionDefinition,
  Role,
  RuleGuard,
  WorkflowDefinition,
} from "@/lib/workflows/types";
import type { User } from "./personas";

export function canSeeWorkflow(user: User, wf: WorkflowDefinition): boolean {
  return wf.visibleToRoles.includes(user.role);
}

export function roleAllowed(roles: Role[], user: User): boolean {
  return roles.includes(user.role);
}

export interface GuardContext {
  data: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export interface ActionCheck {
  allowed: boolean;
  reason?: string;
}

// Server-side authorization for a workflow action. UI hiding is a convenience;
// this check is what actually protects state-changing operations.
export function checkAction(
  action: ActionDefinition,
  user: User,
  status: string,
  ctx: GuardContext
): ActionCheck {
  if (!roleAllowed(action.roles, user)) {
    return { allowed: false, reason: "Your role cannot perform this action." };
  }
  if (action.fromStatuses.length > 0 && !action.fromStatuses.includes(status)) {
    return {
      allowed: false,
      reason: `Not available from status "${status}".`,
    };
  }
  for (const guard of action.guards) {
    if (guard.type === "amountThreshold") {
      const raw = ctx.data[guard.field];
      const amount = typeof raw === "number" ? raw : Number(raw ?? 0);
      const threshold =
        guard.threshold ??
        Number(ctx.settings[guard.thresholdSettingKey ?? ""] ?? Infinity);
      if (amount >= threshold && !guard.requiredRoles.includes(user.role)) {
        return { allowed: false, reason: guard.message };
      }
    }
    if (guard.type === "rule" && ruleMatches(guard, ctx.data)) {
      // Matching rule with no requiredRoles blocks the action for everyone;
      // otherwise the actor must hold one of the required roles.
      if (guard.requiredRoles.length === 0 || !guard.requiredRoles.includes(user.role)) {
        return { allowed: false, reason: guard.message };
      }
    }
  }
  return { allowed: true };
}

export function ruleMatches(
  rule: RuleGuard,
  data: Record<string, unknown>
): boolean {
  const raw = data[rule.field];
  const empty =
    raw === undefined || raw === null || String(raw).trim() === "" ||
    (Array.isArray(raw) && raw.length === 0);
  switch (rule.operator) {
    case "isEmpty":
      return empty;
    case "isNotEmpty":
      return !empty;
    case "equals":
      return String(raw ?? "") === String(rule.value ?? "");
    case "notEquals":
      return String(raw ?? "") !== String(rule.value ?? "");
    case "greaterThan":
      return Number(raw ?? NaN) > Number(rule.value ?? NaN);
    case "lessThan":
      return Number(raw ?? NaN) < Number(rule.value ?? NaN);
    case "contains":
      return Array.isArray(raw)
        ? raw.map(String).includes(String(rule.value ?? ""))
        : String(raw ?? "").toLowerCase().includes(String(rule.value ?? "").toLowerCase());
  }
}
