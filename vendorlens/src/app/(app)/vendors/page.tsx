"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Vendor } from "@/lib/types";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    loadVendors();
  }, []);

  async function loadVendors() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("vendors")
        .select("*")
        .eq("is_active", true)
        .order("annual_spend", { ascending: false });

      setVendors((data || []) as Vendor[]);
      const depts = [
        ...new Set((data || []).map((v) => v.department).filter(Boolean)),
      ] as string[];
      setDepartments(depts);
    } catch {
      // Graceful degradation
    } finally {
      setLoading(false);
    }
  }

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      !searchQuery ||
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = !departmentFilter || v.department === departmentFilter;
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
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Annual Spend</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
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
                        {vendor.department ? (
                          <Badge variant="outline">{vendor.department}</Badge>
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
    </>
  );
}
