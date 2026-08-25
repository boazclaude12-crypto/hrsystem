"use client";

import { useState, useTransition } from "react";
import { LogIn, LogOut } from "lucide-react";

import { clockIn, clockOut } from "@/app/(app)/attendance/actions";
import { formatTime } from "@/lib/format";

export function ClockWidget({
  clockedInAt,
  clockedOutAt,
}: {
  clockedInAt: string | null;
  clockedOutAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string; success?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(result.error ?? result.success ?? null);
    });
  }

  return (
    <div className="card">
      <h2 className="text-sm font-medium text-muted">Today</h2>

      <div className="mt-3 flex items-baseline gap-4">
        <div>
          <p className="text-xs text-muted">In</p>
          <p className="text-lg font-semibold">{formatTime(clockedInAt)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Out</p>
          <p className="text-lg font-semibold">{formatTime(clockedOutAt)}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="btn-primary flex-1"
          disabled={pending || Boolean(clockedInAt)}
          onClick={() => run(clockIn)}
        >
          <LogIn size={16} /> Clock in
        </button>
        <button
          type="button"
          className="btn-secondary flex-1"
          disabled={pending || !clockedInAt || Boolean(clockedOutAt)}
          onClick={() => run(clockOut)}
        >
          <LogOut size={16} /> Clock out
        </button>
      </div>

      {message ? <p className="mt-3 text-xs text-muted">{message}</p> : null}
    </div>
  );
}
