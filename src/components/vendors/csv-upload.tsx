"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  GitMerge,
  DollarSign,
  Users,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import type { VendorCluster } from "@/lib/types";

interface ClusterStats {
  departments: string[];
  totalSpend: number;
  category: string;
  rowCount: number;
}

interface ParsedRow {
  vendor_name: string;
  amount: number;
  department: string;
  category?: string;
  description?: string;
  period?: string;
}

type UploadStep = "upload" | "mapping" | "preview" | "clustering" | "done";

export function CsvUpload({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<UploadStep>("upload");
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [clusters, setClusters] = useState<VendorCluster[]>([]);
  const [clusterStats, setClusterStats] = useState<Map<string, ClusterStats>>(new Map());
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast.error("No data found in CSV");
          return;
        }
        const data = results.data as Record<string, string>[];
        const cols = Object.keys(data[0]);
        setRawData(data);
        setHeaders(cols);

        const autoMap: Record<string, string> = {};
        for (const col of cols) {
          const lower = col.toLowerCase();
          if (lower.includes("vendor") || lower.includes("supplier") || lower.includes("company")) {
            autoMap.vendor_name = col;
          } else if (lower.includes("amount") || lower.includes("spend") || lower.includes("cost") || lower.includes("price")) {
            autoMap.amount = col;
          } else if (lower.includes("department") || lower.includes("dept") || lower.includes("team")) {
            autoMap.department = col;
          } else if (lower.includes("category") || lower.includes("type")) {
            autoMap.category = col;
          } else if (lower.includes("description") || lower.includes("desc") || lower.includes("notes")) {
            autoMap.description = col;
          } else if (lower.includes("period") || lower.includes("date") || lower.includes("year") || lower.includes("month")) {
            autoMap.period = col;
          }
        }
        setMapping(autoMap);
        setStep("mapping");
      },
      error: () => {
        toast.error("Failed to parse CSV file");
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    multiple: false,
  });

  function handleMapping() {
    if (!mapping.vendor_name || !mapping.amount || !mapping.department) {
      toast.error("Please map Vendor Name, Amount, and Department columns");
      return;
    }

    const rows: ParsedRow[] = rawData
      .map((row) => ({
        vendor_name: row[mapping.vendor_name]?.trim() || "",
        amount: parseFloat(row[mapping.amount]?.replace(/[,$]/g, "") || "0"),
        department: row[mapping.department]?.trim() || "Unknown",
        category: mapping.category ? row[mapping.category]?.trim() : undefined,
        description: mapping.description ? row[mapping.description]?.trim() : undefined,
        period: mapping.period ? row[mapping.period]?.trim() : undefined,
      }))
      .filter((r) => r.vendor_name && !isNaN(r.amount));

    setParsedRows(rows);
    setStep("preview");
  }

  async function handleUpload() {
    setProcessing(true);
    setStep("clustering");

    try {
      const res = await fetch("/api/vendors/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const incomingClusters: VendorCluster[] = data.clusters || [];
      setClusters(incomingClusters);

      // Compute per-cluster stats from the original parsed rows
      const statsMap = new Map<string, ClusterStats>();
      for (const cluster of incomingClusters) {
        const variantSet = new Set(
          cluster.variants.map((v: string) => v.toLowerCase())
        );
        const matching = parsedRows.filter((r) =>
          variantSet.has(r.vendor_name.toLowerCase())
        );
        const departments = [...new Set(matching.map((r) => r.department))].sort();
        const totalSpend = matching.reduce((sum, r) => sum + r.amount, 0);
        const category = matching.find((r) => r.category)?.category ?? "";
        statsMap.set(cluster.canonical, {
          departments,
          totalSpend,
          category,
          rowCount: matching.length,
        });
      }
      setClusterStats(statsMap);

      setStep("done");
      toast.success(`${data.vendorsProcessed} vendors processed successfully!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
      setStep("preview");
    } finally {
      setProcessing(false);
    }
  }

  if (step === "upload") {
    return (
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? "border-blue-400 bg-blue-50"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Upload className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Upload Vendor Spend CSV
          </h3>
          <p className="text-sm text-slate-500 mb-4 max-w-sm">
            Drag and drop your CSV file here, or click to browse. We&apos;ll
            auto-detect columns and normalize vendor names with AI.
          </p>
          <Badge variant="secondary">
            Required: Vendor Name, Amount, Department
          </Badge>
        </div>
      </div>
    );
  }

  if (step === "mapping") {
    const fields = [
      { key: "vendor_name", label: "Vendor Name", required: true },
      { key: "amount", label: "Amount / Spend", required: true },
      { key: "department", label: "Department", required: true },
      { key: "category", label: "Category", required: false },
      { key: "description", label: "Description", required: false },
      { key: "period", label: "Period / Date", required: false },
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-500" />
            Map Your Columns
          </CardTitle>
          <p className="text-sm text-slate-500">
            We auto-detected your columns from <strong>{fileName}</strong>.
            Adjust if needed.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {field.label}{" "}
                  {field.required && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <Select
                  value={mapping[field.key] || ""}
                  onChange={(e) =>
                    setMapping((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                >
                  <option value="">Select column</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <Button onClick={handleMapping}>Continue to Preview</Button>
            <Button variant="outline" onClick={() => setStep("upload")}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "preview") {
    const totalSpend = parsedRows.reduce((sum, r) => sum + r.amount, 0);
    const uniqueVendors = new Set(parsedRows.map((r) => r.vendor_name)).size;
    const uniqueDepts = new Set(parsedRows.map((r) => r.department)).size;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Preview Data</CardTitle>
          <div className="flex gap-4 mt-2">
            <Badge variant="secondary">{parsedRows.length} rows</Badge>
            <Badge variant="secondary">{uniqueVendors} unique vendors</Badge>
            <Badge variant="secondary">{uniqueDepts} departments</Badge>
            <Badge variant="info">Total: {formatCurrency(totalSpend)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-4 max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.slice(0, 20).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {row.vendor_name}
                    </TableCell>
                    <TableCell>{formatCurrency(row.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.department}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {row.category || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {parsedRows.length > 20 && (
            <p className="text-xs text-slate-400 mb-4">
              Showing 20 of {parsedRows.length} rows
            </p>
          )}
          <div className="flex gap-3">
            <Button onClick={handleUpload}>
              <Sparkles className="h-4 w-4 mr-1" />
              Process with AI
            </Button>
            <Button variant="outline" onClick={() => setStep("mapping")}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "clustering") {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            AI Processing Your Data
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Normalizing vendor names, clustering duplicates, and generating
            embeddings for semantic search...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Done
  const totalImportSpend = [...clusterStats.values()].reduce(
    (s, v) => s + v.totalSpend,
    0
  );
  const mergedCount = clusters.filter((c) => c.variants.length > 1).length;

  return (
    <Card>
      <CardContent className="pt-10 pb-6">
        {/* Header */}
        <div className="text-center mb-6">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-slate-900">
            Upload Complete!
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {parsedRows.length} records imported across{" "}
            {clusters.length} vendors
          </p>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
            <DollarSign className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">
              {formatCurrency(totalImportSpend)} total spend
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">
              {clusters.length} vendors
            </span>
          </div>
          {mergedCount > 0 && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5">
              <GitMerge className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-semibold text-blue-700">
                {mergedCount} duplicates merged
              </span>
            </div>
          )}
        </div>

        {/* Cluster cards */}
        {clusters.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              AI Vendor Name Clusters
            </h4>
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {clusters.map((cluster, i) => {
                const stats = clusterStats.get(cluster.canonical);
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    {/* Top row: avatar + name + spend */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
                          {cluster.canonical.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {cluster.canonical}
                          </p>
                          {cluster.variants.length > 1 && (
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              {cluster.variants.join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {cluster.variants.length > 1 && (
                          <Badge variant="info">
                            {cluster.variants.length} merged
                          </Badge>
                        )}
                        {stats && (
                          <span className="text-sm font-bold text-slate-900">
                            {formatCurrency(stats.totalSpend)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom row: category + departments */}
                    {stats && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {stats.category && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Tag className="h-2.5 w-2.5" />
                            {stats.category}
                          </Badge>
                        )}
                        {stats.departments.map((d) => (
                          <Badge key={d} variant="outline">
                            {d}
                          </Badge>
                        ))}
                        {stats.rowCount > 1 && (
                          <span className="text-xs text-slate-400 ml-auto">
                            {stats.rowCount} records
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-center">
          <Button onClick={onComplete}>View Vendors</Button>
        </div>
      </CardContent>
    </Card>
  );
}
