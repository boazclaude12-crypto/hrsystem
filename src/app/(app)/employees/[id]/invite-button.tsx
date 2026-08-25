"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { inviteEmployeeAction, type EmployeeFormState } from "../actions";

export function InviteButton({ email }: { email: string }) {
  const [state, formAction] = useActionState<EmployeeFormState, FormData>(
    inviteEmployeeAction,
    {},
  );

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="email" value={email} />
      <SubmitButton className="btn-secondary text-xs" pendingLabel="Sending…">
        Send sign-in invite
      </SubmitButton>
      {state.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
      {state.success ? <span className="text-xs text-green-600">{state.success}</span> : null}
    </form>
  );
}
