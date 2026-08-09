import { NextRequest, NextResponse } from "next/server";
import { resolveAccessRequest } from "@/lib/access/resolve-request";
import { createServiceClient } from "@/lib/supabase/server";
import {
  buildAccessRequestBlocks,
  getAppUrl,
  getUserEmail,
  parseSlackPayload,
  postToResponseUrl,
  verifySlackSignature,
  type SlackBlockActionPayload,
} from "@/lib/slack";

export const runtime = "nodejs";

const APPROVE_ACTION = "access_approve";
const DENY_ACTION = "access_deny";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");

  if (!verifySlackSignature(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: SlackBlockActionPayload;
  try {
    payload = parseSlackPayload(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (payload.type !== "block_actions") {
    return new NextResponse(null, { status: 200 });
  }

  const action = payload.actions[0];
  if (!action?.value) {
    return new NextResponse(null, { status: 200 });
  }

  const requestId = action.value;
  let status: "approved" | "denied" | null = null;
  if (action.action_id === APPROVE_ACTION) {
    status = "approved";
  } else if (action.action_id === DENY_ACTION) {
    status = "denied";
  } else {
    return new NextResponse(null, { status: 200 });
  }

  const supabase = await createServiceClient();

  const clickerEmail = await getUserEmail(payload.user.id);
  if (!clickerEmail) {
    await postToResponseUrl(payload.response_url, {
      response_type: "ephemeral",
      replace_original: false,
      text: "Could not verify your Slack account email.",
    });
    return new NextResponse(null, { status: 200 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("email", clickerEmail)
    .maybeSingle();

  if (!profile) {
    await postToResponseUrl(payload.response_url, {
      response_type: "ephemeral",
      replace_original: false,
      text: "No VendorLens account found for your email. Sign in with the same email as Slack.",
    });
    return new NextResponse(null, { status: 200 });
  }

  const { data: accessRequest } = await supabase
    .from("access_requests")
    .select(
      "id, status, requester_name, reason, approver_id, vendors(name)"
    )
    .eq("id", requestId)
    .single();

  if (!accessRequest) {
    await postToResponseUrl(payload.response_url, {
      response_type: "ephemeral",
      replace_original: false,
      text: "Access request not found.",
    });
    return new NextResponse(null, { status: 200 });
  }

  const vendorRow = accessRequest.vendors as { name: string } | { name: string }[] | null;
  const vendorName = Array.isArray(vendorRow)
    ? vendorRow[0]?.name
    : vendorRow?.name ?? "Unknown vendor";

  const actorLabel =
    profile.full_name ||
    payload.user.name ||
    payload.user.username ||
    "Someone";

  if (accessRequest.status !== "pending") {
    await postToResponseUrl(payload.response_url, {
      replace_original: true,
      blocks: buildAccessRequestBlocks({
        requestId,
        requesterName: accessRequest.requester_name || "Someone",
        vendorName,
        reason: accessRequest.reason,
        appUrl: getAppUrl(),
        resolved: {
          status: accessRequest.status === "approved" ? "approved" : "denied",
          actorLabel: "Already handled",
        },
      }),
    });
    return new NextResponse(null, { status: 200 });
  }

  const result = await resolveAccessRequest(supabase, {
    requestId,
    status,
    actorId: profile.id,
    actorName: profile.full_name || null,
    actorRole: profile.role || null,
  });

  if (!result.ok) {
    const message =
      result.httpStatus === 403
        ? "You are not authorized to approve this request."
        : result.error;
    await postToResponseUrl(payload.response_url, {
      response_type: "ephemeral",
      replace_original: false,
      text: message,
    });
    return new NextResponse(null, { status: 200 });
  }

  await postToResponseUrl(payload.response_url, {
    replace_original: true,
    blocks: buildAccessRequestBlocks({
      requestId,
      requesterName: accessRequest.requester_name || "Someone",
      vendorName,
      reason: accessRequest.reason,
      appUrl: getAppUrl(),
      resolved: { status, actorLabel },
    }),
  });

  return new NextResponse(null, { status: 200 });
}
