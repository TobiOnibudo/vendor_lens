"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-xs text-slate-500">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{deniedCount}</p>
                <p className="text-xs text-slate-500">Denied</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-blue-200 bg-blue-50/50"
            onClick={() => setShowRequestDialog(true)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Plus className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  New Request
                </p>
                <p className="text-xs text-blue-600">Request access to a tool</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-slate-500" />
              Access Requests
            </CardTitle>
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
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded" />
                ))}
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <KeyRound className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No access requests found</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowRequestDialog(true)}
                >
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
                            <User className="h-4 w-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {req.requester_name || "Unknown"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {req.requester_email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium">
                            {req.vendor_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-slate-500 truncate">
                          {req.reason || "No reason provided"}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {formatDate(req.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.status === "approved"
                              ? "success"
                              : req.status === "denied"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {req.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() =>
                                handleApproval(req.id, "approved")
                              }
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleApproval(req.id, "denied")
                              }
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Dialog */}
      <Dialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
      >
        <DialogContent onClose={() => setShowRequestDialog(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-500" />
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
