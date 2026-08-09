import { NextRequest, NextResponse } from "next/server";
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: vendorId } = await params;
    const { owner_id } = await request.json();

    if (owner_id !== null && typeof owner_id !== "string") {
      return NextResponse.json(
        { error: "owner_id must be a string or null" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    const [{ data: vendor }, { data: actorProfile }] = await Promise.all([
      supabase
        .from("vendors")
        .select("owner_id")
        .eq("id", vendorId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const isAdmin = actorProfile?.role === "admin";
    const isOwner = vendor.owner_id === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "You are not authorized to change the owner" },
        { status: 403 }
      );
    }

    let ownerName: string | null = null;
    if (owner_id) {
      const { data: newOwner } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", owner_id)
        .maybeSingle();

      if (!newOwner) {
        return NextResponse.json(
          { error: "Selected owner not found" },
          { status: 400 }
        );
      }
      ownerName = newOwner.full_name || null;
    }

    const { error: updateError } = await supabase
      .from("vendors")
      .update({
        owner_id,
        owner_name: ownerName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vendorId);

    if (updateError) throw updateError;

    await supabase
      .from("access_requests")
      .update({
        approver_id: owner_id,
        approver_name: ownerName,
      })
      .eq("vendor_id", vendorId)
      .eq("status", "pending");

    return NextResponse.json({
      success: true,
      owner_id,
      owner_name: ownerName,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
