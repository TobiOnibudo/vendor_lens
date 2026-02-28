"use client";

import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Upload,
  Loader2,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Eye,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  daysUntil,
  getRenewalUrgency,
} from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Contract, Vendor } from "@/lib/types";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewContract, setViewContract] = useState<Contract | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();
      const [contractRes, vendorRes] = await Promise.all([
        supabase
          .from("contracts")
          .select("*, vendors(name)")
          .order("created_at", { ascending: false }),
        supabase.from("vendors").select("id, name").eq("is_active", true),
      ]);
      setContracts(
        (contractRes.data || []).map((c: Record<string, unknown>) => ({
          ...c,
          vendor_name: (c.vendors as Record<string, string>)?.name || "Unlinked",
        })) as unknown as Contract[]
      );
      setVendors(vendorRes.data as unknown as Vendor[] || []);
    } catch {
      // Graceful degradation
    } finally {
      setLoading(false);
    }
  }

  const onDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setUploading(true);
      let successCount = 0;

      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          if (selectedVendor) {
            formData.append("vendor_id", selectedVendor);
          }

          const res = await fetch("/api/contracts/upload", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          successCount++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Upload failed";
          toast.error(`Failed to upload ${file.name}: ${message}`);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} contract(s) uploaded and analyzed!`);
        loadData();
      }
      setUploading(false);
    },
    [selectedVendor]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    },
    disabled: uploading,
  });

  async function confirmContract(contract: Contract) {
    try {
      const res = await fetch("/api/contracts/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: contract.id,
          updates: {
            renewal_date: contract.renewal_date,
            auto_renew: contract.auto_renew,
            notice_period_days: contract.notice_period_days,
            contract_value: contract.contract_value,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Contract confirmed!");
      loadData();
      setViewContract(null);
    } catch {
      toast.error("Failed to confirm contract");
    }
  }

  const filteredContracts = contracts.filter((c) => {
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  const renewalBuckets = {
    critical: contracts.filter(
      (c) => c.renewal_date && daysUntil(c.renewal_date) <= 30 && daysUntil(c.renewal_date) > 0
    ),
    warning: contracts.filter(
      (c) =>
        c.renewal_date &&
        daysUntil(c.renewal_date) > 30 &&
        daysUntil(c.renewal_date) <= 60
    ),
    upcoming: contracts.filter(
      (c) =>
        c.renewal_date &&
        daysUntil(c.renewal_date) > 60 &&
        daysUntil(c.renewal_date) <= 90
    ),
  };

  return (
    <>
      <Header
        title="Contracts"
        description="Upload, analyze, and track contract renewals"
      />

      <div className="p-6 space-y-6">
        {/* Renewal Summary Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-900">
                  {renewalBuckets.critical.length}
                </p>
                <p className="text-xs text-red-600">Renewals within 30 days</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-900">
                  {renewalBuckets.warning.length}
                </p>
                <p className="text-xs text-amber-600">
                  Renewals within 31–60 days
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <CalendarClock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-900">
                  {renewalBuckets.upcoming.length}
                </p>
                <p className="text-xs text-blue-600">
                  Renewals within 61–90 days
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-500" />
              Upload Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="w-64"
              >
                <option value="">Link to vendor (optional)</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragActive
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300"
              } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-3" />
                  <p className="text-sm text-slate-500">
                    Uploading and analyzing with AI...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <FileText className="h-10 w-10 text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    Drop contract PDFs here
                  </p>
                  <p className="text-xs text-slate-400">
                    AI will extract renewal dates, auto-renew clauses, values &amp;
                    more
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contract List */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>All Contracts</CardTitle>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-48"
            >
              <option value="">All Statuses</option>
              <option value="pending_review">Pending Review</option>
              <option value="confirmed">Confirmed</option>
              <option value="expired">Expired</option>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded" />
                ))}
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  No contracts found. Upload PDF contracts above.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Renewal</TableHead>
                    <TableHead>Auto-Renew</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => {
                    const days = contract.renewal_date
                      ? daysUntil(contract.renewal_date)
                      : null;
                    const urgency = days !== null ? getRenewalUrgency(days) : null;

                    const urgencyBadge: Record<string, "destructive" | "warning" | "info" | "success"> = {
                      critical: "destructive",
                      warning: "warning",
                      upcoming: "info",
                      safe: "success",
                    };

                    return (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="font-medium text-sm">
                              {contract.file_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {contract.vendor_name}
                        </TableCell>
                        <TableCell className="font-semibold text-sm">
                          {contract.contract_value
                            ? formatCurrency(contract.contract_value)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {contract.renewal_date ? (
                            <div>
                              <span className="text-sm">
                                {formatDate(contract.renewal_date)}
                              </span>
                              {urgency && days !== null && (
                                <Badge
                                  variant={urgencyBadge[urgency]}
                                  className="ml-2"
                                >
                                  {days}d
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contract.auto_renew === true ? (
                            <Badge variant="warning">Yes</Badge>
                          ) : contract.auto_renew === false ? (
                            <Badge variant="secondary">No</Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              contract.status === "confirmed"
                                ? "success"
                                : contract.status === "expired"
                                ? "destructive"
                                : "warning"
                            }
                          >
                            {contract.status === "pending_review"
                              ? "Pending Review"
                              : contract.status === "confirmed"
                              ? "Confirmed"
                              : "Expired"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewContract(contract)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contract Detail Dialog */}
      <Dialog
        open={!!viewContract}
        onOpenChange={() => setViewContract(null)}
      >
        <DialogContent onClose={() => setViewContract(null)}>
          {viewContract && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  AI-Extracted Contract Data
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    File
                  </p>
                  <p className="text-sm font-medium">{viewContract.file_name}</p>
                </div>

                {viewContract.summary && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs font-medium text-blue-600 mb-1">
                      AI Summary
                    </p>
                    <p className="text-sm text-blue-900">
                      {viewContract.summary}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-500">
                      Renewal Date
                    </p>
                    <p className="text-sm font-semibold">
                      {viewContract.renewal_date
                        ? formatDate(viewContract.renewal_date)
                        : "Not found"}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-500">
                      Contract Value
                    </p>
                    <p className="text-sm font-semibold">
                      {viewContract.contract_value
                        ? formatCurrency(viewContract.contract_value)
                        : "Not found"}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-500">
                      Auto-Renew
                    </p>
                    <p className="text-sm font-semibold">
                      {viewContract.auto_renew === true
                        ? "Yes"
                        : viewContract.auto_renew === false
                        ? "No"
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-500">
                      Notice Period
                    </p>
                    <p className="text-sm font-semibold">
                      {viewContract.notice_period_days
                        ? `${viewContract.notice_period_days} days`
                        : "Not found"}
                    </p>
                  </div>
                </div>

                {viewContract.pricing_escalation && (
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-xs font-medium text-amber-600 mb-1">
                      Pricing Escalation
                    </p>
                    <p className="text-sm text-amber-900">
                      {viewContract.pricing_escalation}
                    </p>
                  </div>
                )}

                {viewContract.key_terms &&
                  (viewContract.key_terms as string[]).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2">
                        Key Terms
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(viewContract.key_terms as string[]).map(
                          (term, i) => (
                            <Badge key={i} variant="secondary">
                              {term}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {viewContract.status === "pending_review" && (
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => confirmContract(viewContract)}
                      className="flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Confirm Extracted Data
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setViewContract(null)}
                    >
                      Edit First
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
