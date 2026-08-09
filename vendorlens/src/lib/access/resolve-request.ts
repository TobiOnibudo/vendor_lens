import type { SupabaseClient } from "@supabase/supabase-js";

export type AccessRequestStatus = "approved" | "denied";

export type ResolveAccessRequestResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      httpStatus: number;
    };

export async function resolveAccessRequest(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    status: AccessRequestStatus;
    actorId: string;
    actorName: string | null;
    actorRole: string | null;
  }
): Promise<ResolveAccessRequestResult> {
  const { requestId, status, actorId, actorName, actorRole } = params;

  const { data: accessRequest, error: fetchError } = await supabase
    .from("access_requests")
    .select("approver_id, status")
    .eq("id", requestId)
    .single();

  if (fetchError || !accessRequest) {
    return { ok: false, error: "Request not found", httpStatus: 404 };
  }

  if (accessRequest.status !== "pending") {
    return {
      ok: false,
      error: "Request has already been resolved",
      httpStatus: 400,
    };
  }

  const isAdmin = actorRole === "admin";
  const isAssignedApprover = accessRequest.approver_id === actorId;

  if (!isAdmin && !isAssignedApprover) {
    return {
      ok: false,
      error: "You are not authorized to approve this request",
      httpStatus: 403,
    };
  }

  const { error: updateError } = await supabase
    .from("access_requests")
    .update({
      status,
      approver_name: actorName,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    return { ok: false, error: updateError.message, httpStatus: 500 };
  }

  return { ok: true };
}
