"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  RefreshCcw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { DuplicateGroup } from "@/lib/types";

export default function DuplicatesPage() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("duplicate_groups")
        .select("*")
        .order("created_at", { ascending: false });
      setGroups(data || []);
    } catch {
      // Graceful degradation
    } finally {
      setLoading(false);
    }
  }

  async function runScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/duplicates/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(
        `Scanned ${data.scannedVendors} vendors. Found ${data.duplicates.length} potential duplicate groups.`
      );
      loadGroups();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Scan failed";
      toast.error(message);
    } finally {
      setScanning(false);
    }
  }

  async function updateStatus(groupId: string, status: "reviewed" | "dismissed") {
    try {
      const supabase = createClient();
      await supabase
        .from("duplicate_groups")
        .update({ status })
        .eq("id", groupId);
      toast.success(status === "reviewed" ? "Marked as reviewed" : "Dismissed");
      loadGroups();
    } catch {
      toast.error("Failed to update");
    }
  }

  const flagged = groups.filter((g) => g.status === "flagged");
  const reviewed = groups.filter((g) => g.status === "reviewed");
  const dismissed = groups.filter((g) => g.status === "dismissed");

  const totalPotentialSavings = flagged.reduce(
    (sum, g) =>
      sum +
      (g.total_combined_spend || 0) * ((g.estimated_overlap_pct || 0) / 100),
    0
  );

  return (
    <>
      <Header
        title="Duplicate Detection"
        description="AI-powered detection of overlapping vendor tools"
      />

      <div className="p-6 space-y-5">
        {/* Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: AlertTriangle, value: flagged.length, label: "Flagged Duplicate Groups", iconColor: "text-amber-500", iconBg: "bg-amber-50 border border-amber-100" },
            { icon: TrendingDown, value: formatCurrency(totalPotentialSavings), label: "Estimated Consolidation Savings", iconColor: "text-emerald-600", iconBg: "bg-emerald-50 border border-emerald-100" },
            { icon: CheckCircle2, value: reviewed.length, label: "Reviewed", iconColor: "text-blue-500", iconBg: "bg-blue-50 border border-blue-100" },
          ].map(({ icon: Icon, value, label, iconColor, iconBg }) => (
            <div key={label} className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Scan Button */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-6 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">AI Duplicate Scanner</h3>
            <p className="text-xs text-slate-400 mt-1">
              Analyze all vendors using AI embeddings to find tools with overlapping functionality.
            </p>
          </div>
          <Button variant="outline" onClick={runScan} disabled={scanning} className="rounded-xl text-sm">
            {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            {scanning ? "Scanning..." : "Run Scan"}
          </Button>
        </div>

        {/* Duplicate Groups */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-6">
                <div className="h-5 bg-slate-100 rounded w-48 mb-3" />
                <div className="h-4 bg-slate-100 rounded w-64" />
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm py-16 text-center">
            <Copy className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-slate-800 mb-2">No duplicates detected yet</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
              Run an AI scan to analyze your vendor portfolio for overlapping tools and consolidation opportunities.
            </p>
            <Button variant="outline" onClick={runScan} disabled={scanning} className="rounded-xl">
              <Sparkles className="h-4 w-4 mr-1" />
              Run First Scan
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {flagged.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Needs Review ({flagged.length})
                </h3>
                <div className="space-y-4">
                  {flagged.map((group) => (
                    <DuplicateCard
                      key={group.id}
                      group={group}
                      onReview={() => updateStatus(group.id, "reviewed")}
                      onDismiss={() => updateStatus(group.id, "dismissed")}
                    />
                  ))}
                </div>
              </div>
            )}

            {reviewed.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-8">
                  Reviewed ({reviewed.length})
                </h3>
                <div className="space-y-3">
                  {reviewed.map((group) => (
                    <DuplicateCard
                      key={group.id}
                      group={group}
                      compact
                    />
                  ))}
                </div>
              </div>
            )}

            {dismissed.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-8">
                  Dismissed ({dismissed.length})
                </h3>
                <div className="space-y-3 opacity-60">
                  {dismissed.map((group) => (
                    <DuplicateCard
                      key={group.id}
                      group={group}
                      compact
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function DuplicateCard({
  group,
  onReview,
  onDismiss,
  compact,
}: {
  group: DuplicateGroup;
  onReview?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}) {
  const savings =
    (group.total_combined_spend || 0) *
    ((group.estimated_overlap_pct || 0) / 100);

  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm">
      <div className={compact ? "p-4" : "p-6"}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-semibold text-slate-800">{group.group_name}</h4>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                group.status === "flagged"
                  ? "bg-amber-50 text-amber-700"
                  : group.status === "reviewed"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-400"
              }`}>
                {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">{group.reason}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(group.vendor_names as string[]).map((name, i) => (
                <span key={i} className="text-xs text-slate-600 border border-slate-200 rounded-md px-2 py-0.5">
                  {name}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-400">
              <span>
                Combined Spend:{" "}
                <span className="font-medium text-slate-700">{formatCurrency(group.total_combined_spend || 0)}</span>
              </span>
              <span>
                Est. Overlap:{" "}
                <span className={`font-semibold ${
                  (group.estimated_overlap_pct || 0) >= 60
                    ? "text-red-600"
                    : (group.estimated_overlap_pct || 0) < 20
                    ? "text-blue-500"
                    : "text-amber-600"
                }`}>
                  {group.estimated_overlap_pct}%
                </span>
              </span>
              {savings > 0 && (
                <span>
                  Potential Savings:{" "}
                  <span className="font-medium text-slate-700">{formatCurrency(savings)}</span>
                </span>
              )}
            </div>
          </div>
          {!compact && onReview && onDismiss && (
            <div className="flex gap-2 ml-4">
              <Button variant="outline" size="sm" onClick={onReview} className="rounded-lg text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Review
              </Button>
              <Button variant="outline" size="sm" onClick={onDismiss} className="rounded-lg text-xs text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600">
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
