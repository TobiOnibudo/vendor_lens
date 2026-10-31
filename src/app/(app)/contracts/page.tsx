"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
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
  Plus,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
  Pencil,
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
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [viewContract, setViewContract] = useState<Contract | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Partial<Contract>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  function openEditMode(contract: Contract) {
    setConfirmDelete(false);
    setEditValues({
      vendor_id: contract.vendor_id ?? "",
      renewal_date: contract.renewal_date ?? "",
      auto_renew: contract.auto_renew,
      notice_period_days: contract.notice_period_days,
      contract_value: contract.contract_value,
      pricing_escalation: contract.pricing_escalation ?? "",
      summary: contract.summary ?? "",
    });
    setEditMode(true);
  }

  function closeDialog() {
    setViewContract(null);
    setEditMode(false);
    setEditValues({});
    setConfirmDelete(false);
  }

  async function deleteContract(contract: Contract) {
    try {
      const res = await fetch("/api/contracts/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: contract.id }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Contract deleted.");
      loadData();
      closeDialog();
    } catch {
      toast.error("Failed to delete contract");
    }
  }

  async function saveContract(contract: Contract, overrides?: Partial<Contract>) {
    const updates = overrides ?? {
      vendor_id: contract.vendor_id,
      renewal_date: contract.renewal_date,
      auto_renew: contract.auto_renew,
      notice_period_days: contract.notice_period_days,
      contract_value: contract.contract_value,
      pricing_escalation: contract.pricing_escalation,
      summary: contract.summary,
    };
    if ("vendor_id" in updates && !updates.vendor_id) {
      updates.vendor_id = undefined;
    }
    try {
      const res = await fetch("/api/contracts/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: contract.id, updates }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(overrides ? "Contract updated!" : "Contract confirmed!");
      loadData();
      closeDialog();
    } catch {
      toast.error("Failed to save contract");
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

      <div className="p-6 space-y-5">
        {/* Renewal Summary Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: AlertTriangle, count: renewalBuckets.critical.length, label: "Renewals within 30 days", iconBg: "bg-red-50", iconColor: "text-red-400" },
            { icon: Clock, count: renewalBuckets.warning.length, label: "Renewals within 31–60 days", iconBg: "bg-amber-50", iconColor: "text-amber-400" },
            { icon: CalendarClock, count: renewalBuckets.upcoming.length, label: "Renewals within 61–90 days", iconBg: "bg-slate-100/80", iconColor: "text-slate-400" },
          ].map(({ icon: Icon, count, label, iconBg, iconColor }) => (
            <div key={label} className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{count}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Contract List */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-800">All Contracts</h2>
            <div className="flex items-center gap-3">
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-44"
              >
                <option value="">All Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="confirmed">Confirmed</option>
                <option value="expired">Expired</option>
              </Select>
              <Button
                onClick={() => router.push("/contracts/new")}
                size="sm"
                className="rounded-xl gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Contract
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100/60 rounded-xl" />
              ))}
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400 mb-4">No contracts found.</p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5"
                onClick={() => router.push("/contracts/new")}
              >
                <Plus className="h-4 w-4" />
                Add your first contract
              </Button>
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
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => {
                  const days = contract.renewal_date ? daysUntil(contract.renewal_date) : null;
                  const urgency = days !== null ? getRenewalUrgency(days) : null;
                  const isUrgent = urgency === "critical" || urgency === "warning";

                  return (
                    <TableRow
                      key={contract.id}
                      className="cursor-pointer hover:bg-slate-50/60 group"
                      onClick={() => setViewContract(contract)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-300" />
                          <span className="font-medium text-sm text-slate-800">{contract.file_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{contract.vendor_name}</TableCell>
                      <TableCell className="font-medium text-sm text-slate-800">
                        {contract.contract_value ? formatCurrency(contract.contract_value) : "-"}
                      </TableCell>
                      <TableCell>
                        {contract.renewal_date ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600">{formatDate(contract.renewal_date)}</span>
                            {days !== null && (
                              <span className={`text-xs font-medium tabular-nums ${isUrgent ? "text-slate-800" : "text-slate-400"}`}>
                                {days}d
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contract.auto_renew === true ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">Yes</span>
                        ) : contract.auto_renew === false ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700">No</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                          contract.status === "confirmed"
                            ? "bg-emerald-50 text-emerald-700"
                            : contract.status === "expired"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {contract.status === "pending_review" ? "Pending" : contract.status === "confirmed" ? "Confirmed" : "Expired"}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                            onClick={() => { setViewContract(contract); openEditMode(contract); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                            onClick={() => deleteContract(contract)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Contract Detail / Edit Dialog */}
      <Dialog open={!!viewContract} onOpenChange={closeDialog}>
        <DialogContent onClose={closeDialog}>
          {viewContract && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-slate-400" />
                  {editMode ? "Edit Contract" : "Contract Details"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 mb-1">Contract</p>
                  <p className="text-sm font-medium">{viewContract.file_name}</p>
                </div>

                {editMode ? (
                  <>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">Vendor</label>
                        <Select
                          value={editValues.vendor_id ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, vendor_id: e.target.value || undefined }))}
                        >
                          <option value="">Unlinked</option>
                          {vendors.map((v) => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">Notes / Summary</label>
                        <textarea
                          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
                          rows={3}
                          value={editValues.summary ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, summary: e.target.value }))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-500 block mb-1">Renewal / Expiry Date</label>
                          <Input
                            type="date"
                            value={editValues.renewal_date ? editValues.renewal_date.slice(0, 10) : ""}
                            onChange={(e) => setEditValues((v) => ({ ...v, renewal_date: e.target.value || null }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 block mb-1">Contract Value (USD)</label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="e.g. 49000"
                            value={editValues.contract_value ?? ""}
                            onChange={(e) => setEditValues((v) => ({ ...v, contract_value: e.target.value ? Number(e.target.value) : null }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 block mb-1">Auto-Renew</label>
                          <Select
                            value={editValues.auto_renew === true ? "true" : editValues.auto_renew === false ? "false" : ""}
                            onChange={(e) => setEditValues((v) => ({
                              ...v,
                              auto_renew: e.target.value === "true" ? true : e.target.value === "false" ? false : null,
                            }))}
                          >
                  
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 block mb-1">Notice Period (days)</label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="e.g. 60"
                            value={editValues.notice_period_days ?? ""}
                            onChange={(e) => setEditValues((v) => ({ ...v, notice_period_days: e.target.value ? Number(e.target.value) : null }))}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">Pricing Escalation</label>
                        <Input
                          placeholder="e.g. 5% annual increase"
                          value={editValues.pricing_escalation ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, pricing_escalation: e.target.value || null }))}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button onClick={() => saveContract(viewContract, editValues)} className="flex-1">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {viewContract.status === "confirmed" ? "Save Changes" : "Save & Confirm"}
                      </Button>
                      <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-500">Vendor</p>
                        <p className="text-sm font-semibold">
                          {viewContract.vendor_name && viewContract.vendor_name !== "Unlinked"
                            ? viewContract.vendor_name
                            : <span className="text-slate-400 font-normal">Unlinked</span>}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-blue-600 hover:text-blue-700"
                        onClick={() => openEditMode(viewContract)}
                      >
                        {viewContract.vendor_id ? "Change" : "Link vendor"}
                      </Button>
                    </div>

                    {viewContract.summary && (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium text-slate-500 mb-1">Summary</p>
                        <p className="text-sm text-slate-700">{viewContract.summary}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium text-slate-500">Renewal Date</p>
                        <p className="text-sm font-semibold">
                          {viewContract.renewal_date ? formatDate(viewContract.renewal_date) : "Not set"}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium text-slate-500">Contract Value</p>
                        <p className="text-sm font-semibold">
                          {viewContract.contract_value ? formatCurrency(viewContract.contract_value) : "Not set"}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium text-slate-500">Auto-Renew</p>
                        <p className="text-sm font-semibold">
                          {viewContract.auto_renew === true ? "Yes" : viewContract.auto_renew === false ? "No" : "Unknown"}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium text-slate-500">Notice Period</p>
                        <p className="text-sm font-semibold">
                          {viewContract.notice_period_days ? `${viewContract.notice_period_days} days` : "Not set"}
                        </p>
                      </div>
                    </div>

                    {viewContract.pricing_escalation && (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium text-slate-500 mb-1">Pricing Escalation</p>
                        <p className="text-sm text-slate-700">{viewContract.pricing_escalation}</p>
                      </div>
                    )}

                    {viewContract.key_terms && (viewContract.key_terms as string[]).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-2">Key Terms</p>
                        <div className="flex flex-wrap gap-2">
                          {(viewContract.key_terms as string[]).map((term, i) => (
                            <span key={i} className="px-2.5 py-0.5 rounded-lg text-xs bg-slate-100 text-slate-600 border border-slate-200">
                              {term}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      {viewContract.status === "pending_review" && (
                        <>
                          <Button onClick={() => saveContract(viewContract)} className="flex-1">
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Confirm Data
                          </Button>
                          <Button variant="outline" onClick={() => openEditMode(viewContract)}>
                            Edit First
                          </Button>
                        </>
                      )}
                      {viewContract.status === "confirmed" && (
                        <Button variant="outline" onClick={() => openEditMode(viewContract)} className="flex-1">
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit Contract
                        </Button>
                      )}
                      {confirmDelete ? (
                        <>
                          <Button variant="destructive" onClick={() => deleteContract(viewContract)}>
                            Confirm Delete
                          </Button>
                          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-slate-600 ml-auto"
                          onClick={() => setConfirmDelete(true)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
