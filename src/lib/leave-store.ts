import { useSyncExternalStore } from "react";
import { makeStore } from "./store";
import { SEED_LEAVES, type AppLeave, type LeaveStatus, type LeaveType } from "@/data/seed";
import { pushNotification, nameOf } from "./notification-store";
import { EMPLOYEES } from "@/data/seed";

const store = makeStore<AppLeave[]>("gp_leaves_v1", SEED_LEAVES);

export function ensureLeaveSeed() {
  store.ensureSeed();
}

export function useLeaves(): AppLeave[] {
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.read(),
    store.getServerSnapshot,
  );
}

export function applyLeave(input: { employeeId: string; type: LeaveType; startDate: string; endDate: string; reason: string }) {
  const next: AppLeave = {
    ...input,
    id: crypto.randomUUID(),
    appliedAt: Date.now(),
    status: "pending",
  };
  store.write([next, ...store.read()]);
  // notify the employee's manager (or HR if none)
  const emp = EMPLOYEES.find((e) => e.id === input.employeeId);
  const approverId = emp?.managerId ?? EMPLOYEES.find((e) => e.role === "HR")?.id;
  if (approverId) {
    pushNotification({
      kind: "approval",
      toId: approverId,
      fromId: input.employeeId,
      title: `${nameOf(input.employeeId)} requested ${input.type.toLowerCase()} leave`,
      body: `${input.startDate}${input.endDate !== input.startDate ? " → " + input.endDate : ""} · ${input.reason}`,
      actionLabel: "Review",
      actionTo: "/leaves",
    });
  }
  return next;
}

export function reviewLeave(id: string, by: string, decision: LeaveStatus, note?: string) {
  store.write(
    store.read().map((l) =>
      l.id === id ? { ...l, status: decision, reviewedById: by, reviewNote: note } : l
    )
  );
  const leave = store.read().find((l) => l.id === id);
  if (leave) {
    pushNotification({
      kind: "approval",
      toId: leave.employeeId,
      fromId: by,
      title: `Your leave was ${decision}`,
      body: `${leave.startDate} · ${nameOf(by)}${note ? ` — '${note}'` : ""}`,
      actionLabel: "Open",
      actionTo: "/leaves",
    });
  }
}
