"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  KeyRound,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Building2,
  Send,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { AccessRequest, Vendor } from "@/lib/types";

export default function AccessPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState("pending");

  // New request form
  const [selectedVendor, setSelectedVendor] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();
      const [requestRes, vendorRes] = await Promise.all([
        supabase
          .from("access_requests")
          .select("*, vendors(name)")
          .order("created_at", { ascending: false }),
        supabase.from("vendors").select("id, name").eq("is_active", true),
      ]);

      setRequests(
        (requestRes.data || []).map((r: Record<string, unknown>) => ({
          ...r,
          vendor_name: (r.vendors as Record<string, string>)?.name || "Unknown",
        })) as unknown as AccessRequest[]
      );
      setVendors(vendorRes.data as unknown as Vendor[] || []);
    } catch {
      // Graceful degradation
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest() {
    if (!selectedVendor) {
      toast.error("Please select a vendor");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: selectedVendor,
          reason: requestReason,
          requesterName,
          requesterEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Access request submitted!");
      setShowRequestDialog(false);
      setSelectedVendor("");
      setRequestReason("");
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApproval(requestId: string, status: "approved" | "denied") {
    try {
      const res = await fetch("/api/access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      });

      if (!res.ok) throw new Error("Failed");

      toast.success(
        status === "approved" ? "Access approved!" : "Request denied"
      );
      loadData();
    } catch {
      toast.error("Failed to update request");
    }
  }

  const filteredRequests = requests.filter((r) => {
    if (!filterStatus) return true;
    return r.status === filterStatus;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const deniedCount = requests.filter((r) => r.status === "denied").length;

  return (
    <>
      <Header
        title="Access Requests"
        description="Request and manage access to vendor tools"
      />

      <div className="p-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { icon: Clock, value: pendingCount, label: "Pending", iconBg: "bg-amber-50", iconColor: "text-amber-500", valuColor: "text-amber-700" },
            { icon: CheckCircle2, value: approvedCount, label: "Approved", iconBg: "bg-emerald-50", iconColor: "text-emerald-500", valuColor: "text-emerald-700" },
            { icon: XCircle, value: deniedCount, label: "Denied", iconBg: "bg-red-50", iconColor: "text-red-400", valuColor: "text-red-700" },
          ].map(({ icon: Icon, value, label, iconBg, iconColor, valuColor }) => (
            <div key={label} className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${valuColor}`}>{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </div>
          ))}
          <button
            onClick={() => setShowRequestDialog(true)}
            className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-4 flex items-center gap-3 hover:bg-white/90 transition-all cursor-pointer"
          >
            <div className="h-10 w-10 rounded-xl bg-slate-100/80 flex items-center justify-center flex-shrink-0">
              <Plus className="h-5 w-5 text-slate-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-800">New Request</p>
              <p className="text-xs text-slate-400">Request access to a tool</p>
            </div>
          </button>
        </div>

        {/* Requests Table */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-800">Access Requests</h2>
            </div>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-40"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </Select>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100/60 rounded-xl" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <KeyRound className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No access requests found</p>
              <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={() => setShowRequestDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Request Access
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Vendor / Tool</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{req.requester_name || "Unknown"}</p>
                          <p className="text-xs text-slate-400">{req.requester_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-300" />
                        <span className="text-sm text-slate-700">{req.vendor_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-xs text-slate-400 truncate">{req.reason || "No reason provided"}</p>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{formatDate(req.created_at)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                        req.status === "approved"
                          ? "bg-emerald-50 text-emerald-700"
                          : req.status === "denied"
                          ? "bg-slate-100 text-slate-500"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {req.status === "pending" && (
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={() => handleApproval(req.id, "approved")}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={() => handleApproval(req.id, "denied")}>
                            <XCircle className="h-3.5 w-3.5 text-slate-400" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Request Dialog */}
      <Dialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
      >
        <DialogContent onClose={() => setShowRequestDialog(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-slate-400" />
              Request Access to a Tool
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Your Name
              </label>
              <Input
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Your Email
              </label>
              <Input
                type="email"
                value={requesterEmail}
                onChange={(e) => setRequesterEmail(e.target.value)}
                placeholder="john@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tool / Vendor <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
              >
                <option value="">Select a tool...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Reason
              </label>
              <Textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Why do you need access to this tool?"
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              onClick={submitRequest}
              disabled={submitting || !selectedVendor}
            >
              {submitting ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" /> Submit Request
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
