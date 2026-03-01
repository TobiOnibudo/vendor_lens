"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, daysUntil, getRenewalUrgency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Globe,
  DollarSign,
  FileText,
  KeyRound,
  Building2,
  Tag,
  Users,
  CalendarClock,
  ExternalLink,
  Pencil,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Vendor, Contract, AccessRequest } from "@/lib/types";

interface DeptSpend { department: string; total: number; }

interface VendorForm {
  name: string; category: string; description: string;
  website: string; annual_spend: string; department: string;
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [deptSpend, setDeptSpend] = useState<DeptSpend[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState<VendorForm>({ name: "", category: "", description: "", website: "", annual_spend: "", department: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (id) loadAll(); }, [id]);

  async function loadAll() {
    try {
      const supabase = createClient();
      const [vendorRes, contractRes, accessRes, spendRes] = await Promise.all([
        supabase.from("vendors").select("*").eq("id", id).single(),
        supabase.from("contracts").select("*").eq("vendor_id", id).order("renewal_date", { ascending: true }),
        supabase.from("access_requests").select("*").eq("vendor_id", id).order("created_at", { ascending: false }),
        supabase.from("spend_records").select("department, amount").eq("vendor_id", id),
      ]);

      if (vendorRes.data) setVendor(vendorRes.data);
      setContracts(contractRes.data || []);
      setAccessRequests(accessRes.data || []);

      if (spendRes.data && spendRes.data.length > 0) {
        const byDept = spendRes.data.reduce<Record<string, number>>((acc, row) => {
          acc[row.department] = (acc[row.department] || 0) + row.amount;
          return acc;
        }, {});
        setDeptSpend(Object.entries(byDept).map(([department, total]) => ({ department, total })).sort((a, b) => b.total - a.total));
      } else if (vendorRes.data?.department) {
        setDeptSpend([{ department: vendorRes.data.department, total: vendorRes.data.annual_spend }]);
      }
    } catch {
      // graceful degradation
    } finally {
      setLoading(false);
    }
  }

  function openEdit() {
    if (!vendor) return;
    setForm({
      name: vendor.name,
      category: vendor.category ?? "",
      description: vendor.description ?? "",
      website: vendor.website ?? "",
      annual_spend: vendor.annual_spend ? String(vendor.annual_spend) : "",
      department: vendor.department ?? "",
    });
    setShowEdit(true);
  }

  async function handleSave() {
    if (!vendor || !form.name.trim()) { toast.error("Vendor name is required"); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("vendors").update({
        name: form.name.trim(),
        canonical_name: form.name.trim(),
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        website: form.website.trim() || null,
        annual_spend: parseFloat(form.annual_spend) || 0,
        total_spend: parseFloat(form.annual_spend) || 0,
        department: form.department.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq("id", vendor.id);

      if (error) throw error;
      toast.success("Vendor updated");
      setShowEdit(false);
      loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 p-8">
        <div className="max-w-5xl mx-auto animate-pulse space-y-4">
          <div className="h-6 bg-white/80 rounded-xl w-32" />
          <div className="h-32 bg-white/80 rounded-2xl" />
          <div className="h-64 bg-white/80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Vendor not found</p>
          <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => router.back()}>Go back</Button>
        </div>
      </div>
    );
  }

  const initials = vendor.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const upcomingContracts = contracts.filter((c) => c.renewal_date && daysUntil(c.renewal_date) > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/70 backdrop-blur-md border-b border-white/60">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            {vendor.website && (
              <a href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Website
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </Button>
              </a>
            )}
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Link href="/vendors">
              <Button variant="ghost" size="sm" className="rounded-xl text-xs text-slate-400">All Vendors</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
        {/* Vendor header */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-6">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-2xl bg-black flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-black">{vendor.name}</h1>
                  {vendor.canonical_name && vendor.canonical_name !== vendor.name && (
                    <p className="text-sm text-slate-400 mt-0.5">aka {vendor.canonical_name}</p>
                  )}
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${vendor.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {vendor.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {vendor.description && (
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{vendor.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-4">
                {vendor.category && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Tag className="h-3.5 w-3.5 text-slate-400" />{vendor.category}
                  </div>
                )}
                {vendor.department && vendor.department.split(",").map((d) => d.trim()).filter(Boolean).map((dept) => (
                  <div key={dept} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="h-3.5 w-3.5 text-slate-400" />{dept}
                  </div>
                ))}
                {vendor.owner_name && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />Owner: {vendor.owner_name}
                  </div>
                )}
              </div>

              {/* Aliases */}
              {vendor.aliases && vendor.aliases.length > 0 && (
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <span className="text-xs font-medium text-slate-400 flex-shrink-0">Also known as</span>
                  {vendor.aliases.map((alias) => (
                    <span key={alias} className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {alias}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, label: "Annual Spend", value: formatCurrency(vendor.annual_spend) },
            { icon: DollarSign, label: "Total Spend", value: formatCurrency(vendor.total_spend) },
            { icon: FileText, label: "Contracts", value: contracts.length },
            { icon: KeyRound, label: "Access Requests", value: accessRequests.length },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-black uppercase tracking-wide">{label}</span>
                <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-black" />
                </div>
              </div>
              <p className="text-xl font-bold text-black">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Contracts */}
          <div className="lg:col-span-2 rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">Contracts</h2>
              </div>
              <Link href="/contracts">
                <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-slate-700 h-7 px-2">Manage</Button>
              </Link>
            </div>

            {contracts.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No contracts uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contracts.map((c) => {
                  const days = c.renewal_date ? daysUntil(c.renewal_date) : null;
                  const urgency = days !== null ? getRenewalUrgency(days) : null;
                  const isUrgent = urgency === "critical" || urgency === "warning";
                  return (
                    <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/60 border border-slate-100/60">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{c.file_name}</p>
                          {c.contract_value && <p className="text-xs text-slate-400">{formatCurrency(c.contract_value)}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        {c.renewal_date && (
                          <div className="text-right">
                            <p className="text-xs text-slate-400">{formatDate(c.renewal_date)}</p>
                            {days !== null && (
                              <p className={`text-xs font-medium tabular-nums ${isUrgent ? "text-slate-800" : "text-slate-400"}`}>{days}d</p>
                            )}
                          </div>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                          c.status === "confirmed" ? "bg-emerald-50 text-emerald-700"
                          : c.status === "expired" ? "bg-slate-100 text-slate-500"
                          : "bg-amber-50 text-amber-700"
                        }`}>
                          {c.status === "pending_review" ? "Pending" : c.status === "confirmed" ? "Confirmed" : "Expired"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Next renewal */}
            {upcomingContracts.length > 0 && (() => {
              const next = upcomingContracts[0];
              const days = daysUntil(next.renewal_date!);
              return (
                <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarClock className="h-4 w-4 text-slate-400" />
                    <h2 className="text-sm font-semibold text-slate-800">Next Renewal</h2>
                  </div>
                  <p className="text-2xl font-bold text-black">{days}d</p>
                  <p className="text-xs text-slate-400 mt-1">{formatDate(next.renewal_date!)}</p>
                  {next.auto_renew && (
                    <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700">Auto-renews</span>
                  )}
                </div>
              );
            })()}

            {/* Department spend breakdown */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">Spend by Department</h2>
              </div>
              {deptSpend.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">No spend data found</p>
              ) : (
                <div className="space-y-3">
                  {deptSpend.map(({ department, total }) => {
                    const pct = vendor.annual_spend > 0 ? Math.round((total / vendor.annual_spend) * 100) : 0;
                    return (
                      <div key={department}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-700">{department}</span>
                          <span className="text-xs font-medium text-slate-800 tabular-nums">{formatCurrency(total)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{pct}% of spend</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Access requests */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">Access Requests</h2>
              </div>
              {accessRequests.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">No requests yet</p>
              ) : (
                <div className="space-y-2">
                  {accessRequests.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700 truncate">{r.requester_name || "Unknown"}</p>
                        <p className="text-xs text-slate-400">{formatDate(r.created_at)}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0 ml-2 ${
                        r.status === "approved" ? "bg-emerald-50 text-emerald-700"
                        : r.status === "denied" ? "bg-slate-100 text-slate-500"
                        : "bg-amber-50 text-amber-700"
                      }`}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </div>
                  ))}
                  {accessRequests.length > 5 && (
                    <p className="text-xs text-slate-400 pt-1">+{accessRequests.length - 5} more</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={showEdit} onOpenChange={(o) => { if (!saving) setShowEdit(o); }}>
        <DialogContent onClose={() => !saving && setShowEdit(false)}>
          <DialogHeader>
            <DialogTitle>Edit {vendor.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Vendor Name *</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Salesforce" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Category</label>
                <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. CRM" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Annual Spend ($)</label>
                <Input type="number" min="0" value={form.annual_spend} onChange={(e) => setForm((f) => ({ ...f, annual_spend: e.target.value }))} placeholder="e.g. 24000" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Department(s) <span className="font-normal text-slate-400">(comma-separated)</span></label>
              <Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder="e.g. Engineering, HR" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Website</label>
              <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="e.g. salesforce.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does this vendor provide?" className="min-h-[72px]" />
            </div>
            <div className="flex gap-3 pt-1">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {saving ? "Saving…" : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => setShowEdit(false)} disabled={saving}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
