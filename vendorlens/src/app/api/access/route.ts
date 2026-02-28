import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { vendorId, reason, requesterId, requesterName, requesterEmail } =
      await request.json();

    if (!vendorId) {
      return NextResponse.json(
        { error: "Vendor ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Find vendor owner to route the request
    const { data: vendor } = await supabase
      .from("vendors")
      .select("owner_id, name")
      .eq("id", vendorId)
      .single();

    const { data: accessRequest, error } = await supabase
      .from("access_requests")
      .insert({
        vendor_id: vendorId,
        requester_id: requesterId || null,
        requester_name: requesterName || "Unknown",
        requester_email: requesterEmail || null,
        approver_id: vendor?.owner_id || null,
        reason: reason || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // #TODO: Send notification email to vendor owner
    // #TODO: Integrate with Slack/Teams for approval notifications

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
    const { requestId, status, approverId } = await request.json();

    if (!requestId || !status) {
      return NextResponse.json(
        { error: "Request ID and status required" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    const { error } = await supabase
      .from("access_requests")
      .update({
        status,
        approver_id: approverId || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) throw error;

    // #TODO: Send notification to requester about approval/denial

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
