import { NextRequest, NextResponse } from "next/server";
import { resolveAccessRequest } from "@/lib/access/resolve-request";
import { isSlackConfigured, notifyApproverOfAccessRequest } from "@/lib/slack";
import {
  createServiceClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";

async function getAuthenticatedUser() {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vendorId, reason } = await request.json();

    if (!vendorId) {
      return NextResponse.json(
        { error: "Vendor ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const requesterName =
      profile?.full_name ||
      (user.user_metadata?.full_name as string | undefined) ||
      user.email ||
      "Unknown";
    const requesterEmail = profile?.email || user.email || null;

    const { data: vendor } = await supabase
      .from("vendors")
      .select("owner_id, owner_name, name")
      .eq("id", vendorId)
      .single();

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    let approverName: string | null = vendor.owner_name || null;
    let approverEmail: string | null = null;
    if (vendor.owner_id) {
      const { data: approverProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", vendor.owner_id)
        .maybeSingle();
      approverName = approverProfile?.full_name || approverName;
      approverEmail = approverProfile?.email || null;
    }

    const { data: accessRequest, error } = await supabase
      .from("access_requests")
      .insert({
        vendor_id: vendorId,
        requester_id: user.id,
        requester_name: requesterName,
        requester_email: requesterEmail,
        approver_id: vendor.owner_id || null,
        approver_name: approverName,
        reason: reason || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    if (isSlackConfigured() && approverEmail) {
      try {
        await notifyApproverOfAccessRequest({
          requestId: accessRequest.id,
          requesterName: requesterName,
          vendorName: vendor.name,
          reason: reason || null,
          approverEmail,
        });
      } catch (slackErr) {
        console.error("[slack] notifyApproverOfAccessRequest failed:", slackErr);
      }
    }

    return NextResponse.json({
      success: true,
      request: accessRequest,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestId, status } = await request.json();

    if (!requestId || !status) {
      return NextResponse.json(
        { error: "Request ID and status required" },
        { status: 400 }
      );
    }

    if (status !== "approved" && status !== "denied") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const result = await resolveAccessRequest(supabase, {
      requestId,
      status,
      actorId: user.id,
      actorName: profile?.full_name || null,
      actorRole: profile?.role || null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.httpStatus }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
