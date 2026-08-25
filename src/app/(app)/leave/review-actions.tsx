"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { cancelLeave, reviewLeave, type LeaveState } from "./actions";

export function ReviewControls({ requestId }: { requestId: string }) {
  const [state, formAction] = useActionState<LeaveState, FormData>(reviewLeave, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={requestId} />
      <input
        name="review_note"
        placeholder="Note (optional)"
        className="input w-40 py-1 text-xs"
      />
      <button
        type="submit"
        name="decision"
        value="approved"
        className="btn-primary px-3 py-1 text-xs"
      >
        Approve
      </button>
      <button
        type="submit"
        name="decision"
        value="rejected"
        className="btn-danger px-3 py-1 text-xs"
      >
        Reject
      </button>
      {state.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
      {state.success ? <span className="text-xs text-green-600">{state.success}</span> : null}
    </form>
  );
}

export function CancelControl({ requestId }: { requestId: string }) {
  const [state, formAction] = useActionState<LeaveState, FormData>(cancelLeave, {});

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={requestId} />
      <SubmitButton className="btn-secondary px-3 py-1 text-xs" pendingLabel="Cancelling…">
        Cancel
      </SubmitButton>
      {state.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
    </form>
  );
}
