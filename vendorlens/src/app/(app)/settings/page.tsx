"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Settings,
  User,
  Shield,
  Database,
  Key,
  Building2,
  Save,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Settings saved!");
    }, 1000);
  }

  return (
    <>
      <Header title="Settings" description="Manage your VendorLens configuration" />

      <div className="p-6 space-y-6 max-w-3xl">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-slate-500" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <Input placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <Input type="email" placeholder="you@company.com" disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Role
                </label>
                <Select disabled>
                  <option>Admin</option>
                  <option>Finance</option>
                  <option>Department Head</option>
                  <option>Employee</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Department
                </label>
                <Input placeholder="Engineering" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-500" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Company Domain
              </label>
              <Input placeholder="company.com" />
              <p className="text-xs text-slate-400 mt-1">
                Users with this email domain will be auto-provisioned
              </p>
            </div>
          </CardContent>
        </Card>

        {/* RBAC */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-500" />
              Roles &amp; Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  role: "Admin",
                  desc: "Full access to all features, user management, and settings",
                  color: "destructive" as const,
                },
                {
                  role: "Finance",
                  desc: "Upload vendors/contracts, view spend, manage duplicates",
                  color: "warning" as const,
                },
                {
                  role: "Department Head",
                  desc: "View department vendors, approve access requests",
                  color: "info" as const,
                },
                {
                  role: "Employee",
                  desc: "Search vendors, request access, view basic info",
                  color: "secondary" as const,
                },
              ].map((r) => (
                <div
                  key={r.role}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={r.color}>{r.role}</Badge>
                    <span className="text-sm text-slate-600">{r.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-slate-500" />
              Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Supabase</p>
                  <p className="text-xs text-slate-400">Database &amp; Auth</p>
                </div>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">OpenAI</p>
                  <p className="text-xs text-slate-400">
                    AI extraction &amp; search
                  </p>
                </div>
              </div>
              {/* #TODO: Check actual API key validity */}
              <Badge variant="warning">Check API Key</Badge>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </>
  );
}
