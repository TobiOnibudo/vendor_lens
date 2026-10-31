"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
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
  Inbox,
  UserCheck,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { AccessRequest, UserProfile } from "@/lib/types";

type ViewTab = "approvals" | "my-requests";
type VendorOption = { id: string; name: string; owner_name: string | null };

export default function AccessPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("approvals");
  const [filterStatus, setFilterStatus] = useState("pending");

  const [selectedVendor, setSelectedVendor] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [requestRes, vendorRes, profileRes] = await Promise.all([
        supabase
          .from("access_requests")
          .select("*, vendors(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("vendors")
          .select("id, name, owner_id, owner_name, owner:profiles!owner_id(full_name)")
          .eq("is_active", true),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
      ]);

      const mapped = (requestRes.data || []).map((r: Record<string, unknown>) => ({
        ...r,
        vendor_name: (r.vendors as Record<string, string>)?.name || "Unknown",
      })) as unknown as AccessRequest[];

      setRequests(mapped);
      const vendorRows = (vendorRes.data || []) as Array<{
        id: string;
        name: string;
        owner_name: string | null;
        owner: { full_name: string }[] | null;
      }>;
      setVendors(
        vendorRows.map((v) => ({
          ...v,
          owner_name:
            v.owner_name || v.owner?.[0]?.full_name || null,
        }))
      );
      setProfile(profileRes.data as UserProfile | null);

      const pendingForMe = mapped.filter(
        (r) => r.approver_id === user.id && r.status === "pending"
      ).length;
      if (pendingForMe === 0) setActiveTab("my-requests");
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
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Access request submitted!");
      setShowRequestDialog(false);
      setSelectedVendor("");
      setRequestReason("");
      setActiveTab("my-requests");
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      toast.success(
        status === "approved" ? "Access approved!" : "Request denied"
      );
      loadData();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update request";
      toast.error(message);
    }
  }

  const userId = profile?.id;
  const isAdmin = profile?.role === "admin";

  const approvalQueue = requests.filter((r) => {
    if (!userId) return false;
    return r.approver_id === userId || (isAdmin && r.status === "pending");
  });

  const myRequests = requests.filter((r) => r.requester_id === userId);
  const tabRequests = activeTab === "approvals" ? approvalQueue : myRequests;

  const filteredRequests = tabRequests.filter((r) => {
    if (!filterStatus) return true;
    return r.status === filterStatus;
  });

  const pendingApprovalCount = approvalQueue.filter(
    (r) => r.status === "pending"
  ).length;
  const myPendingCount = myRequests.filter((r) => r.status === "pending").length;

  function canApprove(req: AccessRequest) {
    if (req.status !== "pending" || !userId) return false;
    return req.approver_id === userId || isAdmin;
  }

  const selectedVendorData = vendors.find((v) => v.id === selectedVendor);
  const approverLabel = (v: VendorOption) => v.owner_name || "Unassigned";

  return (
    <>
      <Header
        title="Access Requests"
        description="Request tool access or review requests assigned to you"
      />

      <div className="p-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Inbox className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{pendingApprovalCount}</p>
              <p className="text-xs text-slate-400">Awaiting your approval</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{myPendingCount}</p>
              <p className="text-xs text-slate-400">Your open requests</p>
            </div>
          </div>
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

        <div className="flex gap-1 p-1 rounded-xl bg-slate-100/80 w-fit">
          <button
            onClick={() => {
              setActiveTab("approvals");
              setFilterStatus("pending");
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "approvals"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Pending my approval
            {pendingApprovalCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                {pendingApprovalCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("my-requests");
              setFilterStatus("");
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "my-requests"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            My requests
          </button>
        </div>

        {/* Requests Table */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-800">{activeTab === "approvals" ? "Requests to review" : "Your access requests"}</h2>
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
              <p className="text-sm text-slate-400">{activeTab === "approvals" ? "No requests waiting for your approval" : "You haven't submitted any access requests"}</p>
              {activeTab === "my-requests" && (
                <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={() => setShowRequestDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Request Access
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {activeTab === "approvals" && <TableHead>Requester</TableHead>}
                  <TableHead>Vendor / Tool</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  {activeTab === "approvals" && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    {activeTab === "approvals" && (
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
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-300" />
                        <span className="text-sm text-slate-700">{req.vendor_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-xs text-slate-400 truncate">{req.reason || "No reason provided"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-slate-300 flex-shrink-0" />
                        <span className="text-sm text-slate-700">
                          {req.approver_name || "Unassigned"}
                        </span>
                      </div>
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
                    {activeTab === "approvals" && (
                    <TableCell>
                      {canApprove(req) && (
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-7 px-2 rounded-lg text-xs" onClick={() => handleApproval(req.id, "approved")}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mr-1" />
                            Approve
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 rounded-lg text-xs" onClick={() => handleApproval(req.id, "denied")}>
                            <XCircle className="h-3.5 w-3.5 text-slate-400 mr-1" />
                            Deny
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    )}
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
            {profile && (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <p className="text-slate-500 text-xs mb-1">Submitting as</p>
                <p className="font-medium text-slate-800">{profile.full_name}</p>
                <p className="text-slate-400 text-xs">{profile.email}</p>
              </div>
            )}
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
            <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm">
              <p className="text-blue-600/80 text-xs mb-1">Approver</p>
              {selectedVendor ? (
                <>
                  <p className="font-medium text-slate-800 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-500" />
                    {selectedVendorData ? approverLabel(selectedVendorData) : "Unassigned"}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    Your request will be sent to this person for approval.
                  </p>
                </>
              ) : (
                <p className="text-slate-500 text-xs">
                  Select a tool above to see who will approve your request.
                </p>
              )}
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
