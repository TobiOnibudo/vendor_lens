"use client";

import { useState, useEffect } from "react";
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
import {
  Building2,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  X,
  Globe,
  DollarSign,
  Users,
  Tag,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  GitMerge,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Vendor } from "@/lib/types";

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
}

const EMPTY_FORM: VendorForm = {
  name: "",
  category: "",
  description: "",
  website: "",
  annual_spend: "",
  department: "",
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [vendorDepts, setVendorDepts] = useState<Map<string, string[]>>(new Map());

  // Detail panel
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [deptSpend, setDeptSpend] = useState<DepartmentSpend[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);

  // Add / Edit modal
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState<VendorForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadVendors();
  }, []);

  async function loadVendors() {
    setLoading(true);
    try {
      const supabase = createClient();

      const [{ data: vendorData }, { data: spendData }] = await Promise.all([
        supabase
          .from("vendors")
          .select("*")
          .eq("is_active", true)
          .order("annual_spend", { ascending: false }),
        supabase.from("spend_records").select("vendor_id, department"),
      ]);

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

  async function openVendorDetail(vendor: Vendor) {
    setSelectedVendor(vendor);
    setConfirmDelete(false);
    setDeptSpend([]);
    setLoadingDepts(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("spend_records")
        .select("department, amount")
        .eq("vendor_id", vendor.id);

      if (data && data.length > 0) {
        const byDept = data.reduce<Record<string, number>>((acc, row) => {
          acc[row.department] = (acc[row.department] || 0) + row.amount;
          return acc;
        }, {});
        const sorted = Object.entries(byDept)
          .map(([department, total]) => ({ department, total }))
          .sort((a, b) => b.total - a.total);
        setDeptSpend(sorted);
      } else if (vendor.department) {
        setDeptSpend([{ department: vendor.department, total: vendor.annual_spend }]);
      }
    } catch {
      if (vendor.department) {
        setDeptSpend([{ department: vendor.department, total: vendor.annual_spend }]);
      }
    } finally {
      setLoadingDepts(false);
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
    });
    setShowForm(true);
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
      setSelectedVendor(null);
      await loadVendors();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVendor() {
    if (!selectedVendor) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("vendors")
        .update({ is_active: false })
        .eq("id", selectedVendor.id);

      if (error) throw error;
      toast.success(`${selectedVendor.name} removed`);
      setSelectedVendor(null);
      setConfirmDelete(false);
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <TableRow
                      key={vendor.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => openVendorDetail(vendor)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                            {vendor.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {vendor.name}
                            </p>
                            {vendor.website && (
                              <p className="text-xs text-slate-400">
                                {vendor.website}
                              </p>
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
                              <Badge key={d} variant="outline">
                                {d}
                              </Badge>
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
                        <Badge
                          variant={vendor.is_active ? "success" : "secondary"}
                        >
                          {vendor.is_active ? "Active" : "Inactive"}
                        </Badge>
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

      {/* ── Vendor Detail Slide-Over ───────────────────────────── */}
      {selectedVendor && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => {
              setSelectedVendor(null);
              setConfirmDelete(false);
            }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Panel Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600">
                  {selectedVendor.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedVendor.name}
                  </h2>
                  {selectedVendor.canonical_name &&
                    selectedVendor.canonical_name !== selectedVendor.name && (
                      <p className="text-xs text-slate-400">
                        Also known as: {selectedVendor.canonical_name}
                      </p>
                    )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditForm(selectedVendor);
                  }}
                  className="rounded-md p-1.5 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
                  title="Edit vendor"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(true);
                  }}
                  className="rounded-md p-1.5 hover:bg-red-50 transition-colors text-slate-400 hover:text-red-600"
                  title="Delete vendor"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedVendor(null);
                    setConfirmDelete(false);
                  }}
                  className="rounded-md p-1.5 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 ml-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Delete confirmation banner */}
            {confirmDelete && (
              <div className="mx-4 mt-4 rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">
                      Remove {selectedVendor.name}?
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      This will hide the vendor from your list. Spend records
                      are preserved.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={handleDeleteVendor}
                        disabled={deleting}
                        className="bg-red-600 hover:bg-red-700 text-white h-7 px-3 text-xs"
                      >
                        {deleting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Yes, remove"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                        className="h-7 px-3 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status + Category badges */}
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedVendor.is_active ? "success" : "secondary"}
                >
                  {selectedVendor.is_active ? "Active" : "Inactive"}
                </Badge>
                {selectedVendor.category && (
                  <Badge variant="secondary">{selectedVendor.category}</Badge>
                )}
              </div>

              {/* Aliases / Also known as */}
              {selectedVendor.aliases && selectedVendor.aliases.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    <GitMerge className="h-3.5 w-3.5" />
                    Also Known As
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedVendor.aliases.map((alias) => (
                      <span
                        key={alias}
                        className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-800"
                      >
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  <Tag className="h-3.5 w-3.5" />
                  Description
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {selectedVendor.description
                    ? selectedVendor.description
                    : "No description available for this vendor."}
                </p>
              </div>

              {/* Website */}
              {selectedVendor.website && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    <Globe className="h-3.5 w-3.5" />
                    Website
                  </div>
                  <a
                    href={
                      selectedVendor.website.startsWith("http")
                        ? selectedVendor.website
                        : `https://${selectedVendor.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {selectedVendor.website}
                  </a>
                </div>
              )}

              {/* Annual Spend */}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  <DollarSign className="h-3.5 w-3.5" />
                  Annual Spend
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(selectedVendor.annual_spend)}
                </p>
              </div>

              {/* Departments */}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  <Users className="h-3.5 w-3.5" />
                  Department(s) Using This Vendor
                </div>
                {(vendorDepts.get(selectedVendor.id) ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(vendorDepts.get(selectedVendor.id) ?? []).map((d) => (
                      <Badge key={d} variant="outline">
                        {d}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400 mb-2">
                  Spend breakdown by department:
                </p>
                {loadingDepts ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-10 bg-slate-100 rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : deptSpend.length > 0 ? (
                  <div className="space-y-2">
                    {deptSpend.map(({ department, total }) => {
                      const pct =
                        selectedVendor.annual_spend > 0
                          ? Math.round(
                              (total / selectedVendor.annual_spend) * 100
                            )
                          : 0;
                      return (
                        <div
                          key={department}
                          className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-slate-800">
                              {department}
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {formatCurrency(total)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {pct}% of spend
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    No department spend data found.
                  </p>
                )}
              </div>

              {/* Owner */}
              {selectedVendor.owner_name && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Owner:{" "}
                    <span className="text-slate-600 font-medium">
                      {selectedVendor.owner_name}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
