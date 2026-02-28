"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Vendor } from "@/lib/types";

interface DepartmentSpend {
  department: string;
  total: number;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [vendorDepts, setVendorDepts] = useState<Map<string, string[]>>(new Map());
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [deptSpend, setDeptSpend] = useState<DepartmentSpend[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);

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
        supabase
          .from("spend_records")
          .select("vendor_id, department"),
      ]);

      // Build vendor_id → sorted unique departments from spend_records (ground truth)
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

      // All unique departments across all vendors for the filter dropdown
      const allDepts = [...new Set([...deptMap.values()].flatMap((s) => [...s]))].sort();
      setDepartments(allDepts);
    } catch {
      // Graceful degradation
    } finally {
      setLoading(false);
    }
  }

  async function openVendorDetail(vendor: Vendor) {
    setSelectedVendor(vendor);
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
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-1" /> Import CSV
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
                Upload a CSV file with your vendor spend data to get started.
                VendorLens AI will normalize names and detect duplicates.
              </p>
              <Button onClick={() => setShowUpload(true)}>
                <Plus className="h-4 w-4 mr-1" /> Import Vendors
              </Button>
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

      {/* Vendor Detail Slide-Over */}
      {selectedVendor && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelectedVendor(null)}
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
              <button
                onClick={() => setSelectedVendor(null)}
                className="rounded-md p-1.5 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status + Category badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant={selectedVendor.is_active ? "success" : "secondary"}>
                  {selectedVendor.is_active ? "Active" : "Inactive"}
                </Badge>
                {selectedVendor.category && (
                  <Badge variant="secondary">{selectedVendor.category}</Badge>
                )}
              </div>

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
                      <Badge key={d} variant="outline">{d}</Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400 mb-2">Spend breakdown by department:</p>
                {loadingDepts ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : deptSpend.length > 0 ? (
                  <div className="space-y-2">
                    {deptSpend.map(({ department, total }) => {
                      const pct =
                        selectedVendor.annual_spend > 0
                          ? Math.round((total / selectedVendor.annual_spend) * 100)
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
                          <p className="text-xs text-slate-400 mt-1">{pct}% of spend</p>
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
                    Owner: <span className="text-slate-600 font-medium">{selectedVendor.owner_name}</span>
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
