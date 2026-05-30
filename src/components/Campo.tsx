import { type ReactNode } from "react";

export function Campo({ label, children, erro }: { label: string; children: ReactNode; erro?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {erro ? <span className="block text-xs text-red-600">{erro}</span> : null}
    </label>
  );
}
