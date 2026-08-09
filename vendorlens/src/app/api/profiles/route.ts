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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendorId = request.nextUrl.searchParams.get("vendorId");
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const supabase = await createServiceClient();

    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = actorProfile?.role === "admin";

    if (!isAdmin) {
      if (!vendorId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { data: vendor } = await supabase
        .from("vendors")
        .select("owner_id")
        .eq("id", vendorId)
        .maybeSingle();

      if (!vendor || vendor.owner_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let query = supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");

    if (q) {
      const pattern = `%${q.replace(/[%_]/g, "")}%`;
      query = query.or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
    }

    const { data: profiles, error } = await query.limit(q ? 20 : 8);

    if (error) throw error;

    return NextResponse.json({ profiles: profiles || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
