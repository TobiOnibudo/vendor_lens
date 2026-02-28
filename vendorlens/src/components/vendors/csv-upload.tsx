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
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import type { VendorCluster } from "@/lib/types";

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

      setClusters(data.clusters || []);
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
                  <option value="">— Select column —</option>
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
                      {row.category || "—"}
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
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          Upload Complete!
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          {parsedRows.length} records processed successfully.
        </p>

        {clusters.length > 0 && (
          <div className="max-w-lg mx-auto text-left mb-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              AI Vendor Name Clusters
            </h4>
            <div className="space-y-2">
              {clusters.map((cluster, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">
                      {cluster.canonical}
                    </span>
                    {cluster.variants.length > 1 && (
                      <Badge variant="info">
                        {cluster.variants.length} merged
                      </Badge>
                    )}
                  </div>
                  {cluster.variants.length > 1 && (
                    <p className="text-xs text-slate-500 mt-1">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Merged: {cluster.variants.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button onClick={onComplete}>View Vendors</Button>
      </CardContent>
    </Card>
  );
}
