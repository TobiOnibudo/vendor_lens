import { NextResponse } from "next/server";
import {
  createServiceClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";

export async function GET() {
  try {
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const supabase = await createServiceClient();
    const notifications: {
      id: string;
      type: "warning" | "info" | "renewal";
      title: string;
      body: string;
      time: string;
      href?: string;
    }[] = [];

    const now = new Date();
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    const { data: renewals } = await supabase
      .from("contracts")
      .select("id, renewal_date, auto_renew, vendors(name)")
      .neq("status", "expired")
      .gte("renewal_date", now.toISOString().split("T")[0])
      .lte("renewal_date", in30Days.toISOString().split("T")[0])
      .order("renewal_date", { ascending: true })
      .limit(5);

    if (renewals) {
      for (const c of renewals) {
        const renewalDate = new Date(c.renewal_date);
        const daysLeft = Math.ceil(
          (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const vendorName =
          (c.vendors as unknown as { name: string } | null)?.name ??
          "Unknown vendor";
        notifications.push({
          id: `renewal-${c.id}`,
          type: "renewal",
          title: `${vendorName} contract renews soon`,
          body: `${c.auto_renew ? "Auto-renews" : "Renews"} in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} — review before it locks in.`,
          time: renewalDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        });
      }
    }

    const { data: duplicates } = await supabase
      .from("duplicate_groups")
      .select("id, group_name, vendor_names, total_combined_spend, created_at")
      .eq("status", "flagged")
      .order("created_at", { ascending: false })
      .limit(3);

    if (duplicates) {
      for (const d of duplicates) {
        const names = Array.isArray(d.vendor_names)
          ? (d.vendor_names as string[]).join(" & ")
          : d.group_name;
        notifications.push({
          id: `dup-${d.id}`,
          type: "warning",
          title: "Duplicate tools detected",
          body: `${names} may overlap${d.total_combined_spend ? ` — $${Number(d.total_combined_spend).toLocaleString()} combined spend` : ""}.`,
          time: new Date(d.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          href: "/duplicates",
        });
      }
    }

    if (user) {
      const { data: requests } = await supabase
        .from("access_requests")
        .select("id, requester_name, vendors(name), created_at")
        .eq("status", "pending")
        .eq("approver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (requests) {
        for (const r of requests) {
          const vendorName =
            (r.vendors as unknown as { name: string } | null)?.name ??
            "a tool";
          notifications.push({
            id: `access-${r.id}`,
            type: "info",
            title: "Access request needs your approval",
            body: `${r.requester_name || "Someone"} requested access to ${vendorName}.`,
            time: new Date(r.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            href: "/access",
          });
        }
      }
    }

    return NextResponse.json({ notifications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
