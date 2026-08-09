"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { CsvUpload } from "@/components/vendors/csv-upload";
import { VendorOwnerSelect } from "@/components/vendors/vendor-owner-select";
import Link from "next/link";
import {
  Building2,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { UserProfile, Vendor } from "@/lib/types";

interface DepartmentSpend {
  department: string;
  total: number;
}

interface VendorForm {
  name: string;
  category: string;
  description: string;
  website: string;
  annual_spend: string;
  department: string;
  owner_id: string;
}

const EMPTY_FORM: VendorForm = {
  name: "",
  category: "",
  description: "",
  website: "",
  annual_spend: "",
  department: "",
  owner_id: "",
};

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [vendorDepts, setVendorDepts] = useState<Map<string, string[]>>(new Map());

  // Add / Edit modal
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState<VendorForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadVendors();
  }, []);

  async function loadVendors() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [{ data: vendorData }, { data: spendData }, profileRes] =
        await Promise.all([
        supabase
          .from("vendors")
          .select("*")
          .eq("is_active", true)
          .order("annual_spend", { ascending: false }),
        supabase.from("spend_records").select("vendor_id, department"),
        user
          ? supabase.from("profiles").select("*").eq("id", user.id).single()
          : Promise.resolve({ data: null }),
      ]);

      if (user) setUserId(user.id);
      if (profileRes.data) setProfile(profileRes.data as UserProfile);

      const deptMap = new Map<string, Set<string>>();
      for (const row of spendData || []) {
        if (!deptMap.has(row.vendor_id)) deptMap.set(row.vendor_id, new Set());
        deptMap.get(row.vendor_id)!.add(row.department);
      }
      const sortedDeptMap = new Map<string, string[]>();
      for (const [vid, set] of deptMap) {
        sortedDeptMap.set(vid, [...set].sort());
      }
      setVendorDepts(sortedDeptMap);
      setVendors((vendorData || []) as Vendor[]);

      const allDepts = [
        ...new Set([...deptMap.values()].flatMap((s) => [...s])),
      ].sort();
      setDepartments(allDepts);
    } catch {
      // Graceful degradation
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditingVendor(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(vendor: Vendor) {
    setEditingVendor(vendor);
    setForm({
      name: vendor.name,
      category: vendor.category ?? "",
      description: vendor.description ?? "",
      website: vendor.website ?? "",
      annual_spend: vendor.annual_spend ? String(vendor.annual_spend) : "",
      department: (vendorDepts.get(vendor.id) ?? []).join(", "),
      owner_id: vendor.owner_id ?? "",
    });
    setShowForm(true);
  }

  function canChangeOwner(vendor: Vendor | null) {
    if (!vendor || !userId) return false;
    return profile?.role === "admin" || vendor.owner_id === userId;
  }

  async function handleSaveVendor() {
    if (!form.name.trim()) {
      toast.error("Vendor name is required");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const spend = parseFloat(form.annual_spend) || 0;
      const dept = form.department.trim() || null;

      if (editingVendor) {
        // Update existing vendor
        const { error } = await supabase
          .from("vendors")
          .update({
            name: form.name.trim(),
            canonical_name: form.name.trim(),
            category: form.category.trim() || null,
            description: form.description.trim() || null,
            website: form.website.trim() || null,
            annual_spend: spend,
            total_spend: spend,
            department: dept,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingVendor.id);

        if (error) throw error;

        const ownerChanged =
          form.owner_id !== (editingVendor.owner_id ?? "");
        if (ownerChanged && canChangeOwner(editingVendor)) {
          const ownerRes = await fetch(`/api/vendors/${editingVendor.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              owner_id: form.owner_id || null,
            }),
          });
          if (!ownerRes.ok) {
            const data = await ownerRes.json();
            throw new Error(data.error || "Failed to update owner");
          }
        }

        toast.success("Vendor updated");
      } else {
        // Insert new vendor
        const { data: newVendor, error } = await supabase
          .from("vendors")
          .insert({
            name: form.name.trim(),
            canonical_name: form.name.trim(),
            category: form.category.trim() || null,
            description: form.description.trim() || null,
            website: form.website.trim() || null,
            annual_spend: spend,
            total_spend: spend,
            department: dept,
            is_active: true,
          })
          .select("id")
          .single();

        if (error) throw error;

        // Create a spend record if a department was provided
        if (newVendor && dept && spend > 0) {
          await supabase.from("spend_records").insert({
            vendor_id: newVendor.id,
            amount: spend,
            department: dept,
            period: new Date().getFullYear().toString(),
            description: form.description.trim() || null,
          });
        }
        toast.success("Vendor added");
      }

      setShowForm(false);
      await loadVendors();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVendor() {
    if (!vendorToDelete) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("vendors")
        .update({ is_active: false })
        .eq("id", vendorToDelete.id);

      if (error) throw error;
      toast.success(`${vendorToDelete.name} removed`);
      setVendorToDelete(null);
      await loadVendors();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      !searchQuery ||
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const depts = vendorDepts.get(v.id) ?? [];
    const matchesDept = !departmentFilter || depts.includes(departmentFilter);
    return matchesSearch && matchesDept;
  });

  const totalSpend = filteredVendors.reduce(
    (sum, v) => sum + (v.annual_spend || 0),
    0
  );

  if (showUpload) {
    return (
      <>
        <Header
          title="Import Vendors"
          description="Upload a CSV file with vendor spend data"
        />
        <div className="p-6">
          <Button
            variant="outline"
            onClick={() => setShowUpload(false)}
            className="mb-4"
          >
            &larr; Back to Vendors
          </Button>
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              <CsvUpload
                onComplete={() => {
                  setShowUpload(false);
                  loadVendors();
                }}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Vendors"
        description={`${vendors.length} active vendors — ${formatCurrency(totalSpend)} total spend`}
      />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-40"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-1" /> Import CSV
            </Button>
            <Button size="sm" onClick={openAddForm}>
              <Plus className="h-4 w-4 mr-1" /> Add Vendor
            </Button>
          </div>
        </div>

        {/* Vendor Table */}
        <Card>
          {loading ? (
            <CardContent className="py-12 text-center">
              <div className="animate-pulse space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded" />
                ))}
              </div>
            </CardContent>
          ) : filteredVendors.length === 0 ? (
            <CardContent className="py-16 text-center">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No vendors yet
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                Add vendors manually or upload a CSV file with your vendor spend
                data. VendorLens AI will normalize names and detect duplicates.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={openAddForm}>
                  <Plus className="h-4 w-4 mr-1" /> Add Vendor
                </Button>
                <Button variant="outline" onClick={() => setShowUpload(true)}>
                  <Upload className="h-4 w-4 mr-1" /> Import CSV
                </Button>
              </div>
            </CardContent>
          ) : (
            <div className="border-t border-slate-100">
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Department(s)</TableHead>
                      <TableHead className="text-right">Annual Spend</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.map((vendor) => (
                      <TableRow
                        key={vendor.id}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => router.push(`/vendors/${vendor.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                              {vendor.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{vendor.name}</p>
                              {vendor.website && (
                                <p className="text-xs text-slate-400">{vendor.website}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {vendor.category ? (
                            <Badge variant="secondary">{vendor.category}</Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(vendorDepts.get(vendor.id) ?? []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(vendorDepts.get(vendor.id) ?? []).map((d) => (
                                <Badge key={d} variant="outline">{d}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(vendor.annual_spend)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={vendor.is_active ? "success" : "secondary"}>
                            {vendor.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                              onClick={() => openEditForm(vendor)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                              onClick={() => setVendorToDelete(vendor)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* ── Add / Edit Vendor Modal ─────────────────────────────── */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!saving) setShowForm(open);
        }}
      >
        <DialogContent onClose={() => !saving && setShowForm(false)}>
          <DialogHeader>
            <DialogTitle>
              {editingVendor ? "Edit Vendor" : "Add Vendor"}
            </DialogTitle>
            <p className="text-sm text-slate-500">
              {editingVendor
                ? "Update the vendor details below."
                : "Fill in the details to add a new vendor."}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Salesforce"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Category
                </label>
                <Input
                  placeholder="e.g. CRM"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                />
              </div>

              {/* Annual Spend */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Annual Spend ($)
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 24000"
                  value={form.annual_spend}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, annual_spend: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Department(s)
                <span className="text-slate-400 font-normal ml-1">
                  (comma-separated)
                </span>
              </label>
              <Input
                placeholder="e.g. Engineering, HR"
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value }))
                }
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Website
              </label>
              <Input
                placeholder="e.g. salesforce.com"
                value={form.website}
                onChange={(e) =>
                  setForm((f) => ({ ...f, website: e.target.value }))
                }
              />
            </div>

            {editingVendor && canChangeOwner(editingVendor) && (
              <VendorOwnerSelect
                vendorId={editingVendor.id}
                value={form.owner_id}
                selectedName={editingVendor.owner_name ?? undefined}
                onChange={(ownerId) =>
                  setForm((f) => ({ ...f, owner_id: ownerId }))
                }
                disabled={saving}
              />
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description
              </label>
              <Textarea
                placeholder="What does this vendor provide?"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="min-h-[80px]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveVendor} disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : editingVendor ? (
                  "Save Changes"
                ) : (
                  "Add Vendor"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!vendorToDelete} onOpenChange={(o) => { if (!o && !deleting) setVendorToDelete(null); }}>
        <DialogContent onClose={() => !deleting && setVendorToDelete(null)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Remove {vendorToDelete?.name}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 mt-1">
            This will hide the vendor from your list. Spend records and contracts are preserved.
          </p>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleDeleteVendor}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white flex-1"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, remove"}
            </Button>
            <Button variant="outline" onClick={() => setVendorToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
