"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      <div className="p-6 space-y-6">
        {/* Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-2xl font-bold text-red-900">
                  {flagged.length}
                </p>
                <p className="text-xs text-red-600">Flagged Duplicate Groups</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-2xl font-bold text-emerald-900">
                  {formatCurrency(totalPotentialSavings)}
                </p>
                <p className="text-xs text-emerald-600">
                  Estimated Consolidation Savings
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {reviewed.length}
                </p>
                <p className="text-xs text-slate-500">Reviewed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scan Button */}
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">
                AI Duplicate Scanner
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Analyze all vendors using AI embeddings to find tools with
                overlapping functionality.
              </p>
            </div>
            <Button onClick={runScan} disabled={scanning}>
              {scanning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              {scanning ? "Scanning..." : "Run Scan"}
            </Button>
          </CardContent>
        </Card>

        {/* Duplicate Groups */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-slate-100 rounded w-48 mb-3" />
                  <div className="h-4 bg-slate-100 rounded w-64" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Copy className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No duplicates detected yet
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                Run an AI scan to analyze your vendor portfolio for overlapping
                tools and consolidation opportunities.
              </p>
              <Button onClick={runScan} disabled={scanning}>
                <Sparkles className="h-4 w-4 mr-1" />
                Run First Scan
              </Button>
            </CardContent>
          </Card>
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
    <Card
      className={
        group.status === "flagged" ? "border-red-200" : ""
      }
    >
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-slate-900">
                {group.group_name}
              </h4>
              <Badge
                variant={
                  group.status === "flagged"
                    ? "destructive"
                    : group.status === "reviewed"
                    ? "success"
                    : "secondary"
                }
              >
                {group.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mb-3">{group.reason}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {(group.vendor_names as string[]).map((name, i) => (
                <Badge key={i} variant="outline">
                  {name}
                </Badge>
              ))}
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-slate-500">
                Combined Spend:{" "}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(group.total_combined_spend || 0)}
                </span>
              </span>
              <span className="text-slate-500">
                Est. Overlap:{" "}
                <span className="font-semibold text-red-600">
                  {group.estimated_overlap_pct}%
                </span>
              </span>
              {savings > 0 && (
                <span className="text-slate-500">
                  Potential Savings:{" "}
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(savings)}
                  </span>
                </span>
              )}
            </div>
          </div>
          {!compact && onReview && onDismiss && (
            <div className="flex gap-2 ml-4">
              <Button
                variant="success"
                size="sm"
                onClick={onReview}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Review
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
