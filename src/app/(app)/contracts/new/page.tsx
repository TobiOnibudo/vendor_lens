"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ArrowLeft,
  Upload,
  FileText,
  Loader2,
  Plus,
  X,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Vendor } from "@/lib/types";

type Tab = "upload" | "manual";

export default function NewContractPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upload");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Upload tab state
  const [uploadVendor, setUploadVendor] = useState("");

  // Manual entry state
  const [form, setForm] = useState({
    file_name: "",
    vendor_id: "",
    contract_value: "",
    start_date: "",
    renewal_date: "",
    auto_renew: "",
    notice_period_days: "",
    pricing_escalation: "",
    summary: "",
  });
  const [keyTermInput, setKeyTermInput] = useState("");
  const [keyTerms, setKeyTerms] = useState<string[]>([]);

  useEffect(() => {
    async function loadVendors() {
      const supabase = createClient();
      const { data } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      setVendors((data as unknown as Vendor[]) || []);
    }
    loadVendors();
  }, []);

  // ── Upload tab ──
  const onDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploading(true);
      let successCount = 0;

      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          if (uploadVendor) formData.append("vendor_id", uploadVendor);

          const res = await fetch("/api/contracts/upload", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          successCount++;
          if (data.autoLinked && data.detectedVendorName) {
            toast.info(`Auto-linked to vendor: ${data.detectedVendorName}`);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Upload failed";
          toast.error(`Failed to upload ${file.name}: ${message}`);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} contract(s) uploaded and analyzed!`);
        router.push("/contracts");
      }
      setUploading(false);
    },
    [uploadVendor, router]
  );

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    },
    disabled: uploading,
  });

  // ── Manual entry ──
  function addKeyTerm() {
    const t = keyTermInput.trim();
    if (t && !keyTerms.includes(t)) {
      setKeyTerms((prev) => [...prev, t]);
      setKeyTermInput("");
    }
  }

  async function handleManualSave() {
    if (!form.file_name.trim()) {
      toast.error("Contract name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/contracts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: form.file_name,
          vendor_id: form.vendor_id || null,
          contract_value: form.contract_value ? Number(form.contract_value) : null,
          start_date: form.start_date || null,
          renewal_date: form.renewal_date || null,
          auto_renew:
            form.auto_renew === "true"
              ? true
              : form.auto_renew === "false"
              ? false
              : null,
          notice_period_days: form.notice_period_days
            ? Number(form.notice_period_days)
            : null,
          pricing_escalation: form.pricing_escalation || null,
          summary: form.summary || null,
          key_terms: keyTerms.length ? keyTerms : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Contract saved!");
      router.push("/contracts");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-white/70 px-6 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/contracts")}
          className="rounded-xl text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Contracts
        </Button>
        <div className="h-4 w-px bg-slate-200" />
        <h1 className="text-sm font-semibold text-slate-800">Add Contract</h1>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-5">
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-white/80 backdrop-blur-md border border-white/70 rounded-2xl shadow-sm w-fit">
          <button
            onClick={() => setTab("upload")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === "upload"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload PDF
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === "manual"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Manual Entry
          </button>
        </div>

        {/* ── Upload Tab ── */}
        {tab === "upload" && (
          <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-6 space-y-5">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">
                Link to Vendor (optional)
              </label>
              <Select
                value={uploadVendor}
                onChange={(e) => setUploadVendor(e.target.value)}
                className="w-full"
              >
                <option value="">Auto-detect vendor from contract</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-slate-400 mt-1.5">
                Leave blank and AI will attempt to auto-link the vendor from the contract.
              </p>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                isDragActive
                  ? "border-slate-400 bg-slate-50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 text-slate-400 animate-spin mb-3" />
                  <p className="text-sm font-medium text-slate-600">Uploading and analyzing with AI...</p>
                  <p className="text-xs text-slate-400 mt-1">This may take a few seconds</p>
                </div>
              ) : acceptedFiles.length > 0 ? (
                <div className="flex flex-col items-center">
                  <FileText className="h-10 w-10 text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700">{acceptedFiles.map((f) => f.name).join(", ")}</p>
                  <p className="text-xs text-slate-400 mt-1">Ready to upload</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <FileText className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    {isDragActive ? "Drop files here" : "Drop contract PDFs here or click to browse"}
                  </p>
                  <p className="text-xs text-slate-400">
                    AI will extract renewal dates, auto-renew clauses, values & more
                  </p>
                  <p className="text-xs text-slate-300 mt-2">Supports PDF and TXT files</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Manual Entry Tab ── */}
        {tab === "manual" && (
          <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-6 space-y-5">
            {/* Contract name */}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">
                Contract Name <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="e.g. Salesforce Enterprise Agreement 2025"
                value={form.file_name}
                onChange={(e) => setForm((f) => ({ ...f, file_name: e.target.value }))}
              />
            </div>

            {/* Vendor */}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Vendor</label>
              <Select
                value={form.vendor_id}
                onChange={(e) => setForm((f) => ({ ...f, vendor_id: e.target.value }))}
                className="w-full"
              >
                <option value="">Select a vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Start Date</label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Renewal / Expiry Date</label>
                <Input
                  type="date"
                  value={form.renewal_date}
                  onChange={(e) => setForm((f) => ({ ...f, renewal_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Value + notice */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Contract Value (USD)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 49000"
                  value={form.contract_value}
                  onChange={(e) => setForm((f) => ({ ...f, contract_value: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Notice Period (days)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 60"
                  value={form.notice_period_days}
                  onChange={(e) => setForm((f) => ({ ...f, notice_period_days: e.target.value }))}
                />
              </div>
            </div>

            {/* Auto-renew + escalation */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Auto-Renew</label>
                <Select
                  value={form.auto_renew}
                  onChange={(e) => setForm((f) => ({ ...f, auto_renew: e.target.value }))}
                  className="w-full"
                >
                  <option value="">Unknown</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Pricing Escalation</label>
                <Input
                  placeholder="e.g. 5% annual increase"
                  value={form.pricing_escalation}
                  onChange={(e) => setForm((f) => ({ ...f, pricing_escalation: e.target.value }))}
                />
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Notes / Summary</label>
              <textarea
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
                rows={3}
                placeholder="Any key notes about this contract..."
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              />
            </div>

            {/* Key terms */}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Key Terms</label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add a term and press Enter"
                  value={keyTermInput}
                  onChange={(e) => setKeyTermInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyTerm();
                    }
                  }}
                />
                <Button variant="outline" size="sm" onClick={addKeyTerm} className="shrink-0 rounded-lg">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {keyTerms.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {keyTerms.map((term) => (
                    <span
                      key={term}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs bg-slate-100 text-slate-600 border border-slate-200"
                    >
                      {term}
                      <button
                        onClick={() => setKeyTerms((prev) => prev.filter((t) => t !== term))}
                        className="text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <Button
                onClick={handleManualSave}
                disabled={saving || !form.file_name.trim()}
                className="flex-1 rounded-xl"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                )}
                {saving ? "Saving..." : "Save Contract"}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/contracts")}
                className="rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
