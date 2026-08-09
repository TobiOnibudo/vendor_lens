"use client";

import { useState, useEffect } from "react";
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
import { createClient } from "@/lib/supabase/client";
import type { UserProfile, UserRole } from "@/lib/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  finance: "Finance",
  department_head: "Department Head",
  employee: "Employee",
};

const ROLE_DESCRIPTIONS: {
  role: UserRole;
  label: string;
  desc: string;
  color: "destructive" | "warning" | "info" | "secondary";
}[] = [
  {
    role: "admin",
    label: "Admin",
    desc: "Full access to all features, user management, and settings",
    color: "destructive",
  },
  {
    role: "finance",
    label: "Finance",
    desc: "Upload vendors/contracts, view spend, manage duplicates",
    color: "warning",
  },
  {
    role: "department_head",
    label: "Department Head",
    desc: "View department vendors, approve access requests",
    color: "info",
  },
  {
    role: "employee",
    label: "Employee",
    desc: "Search vendors, request access, view basic info",
    color: "secondary",
  },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (!data) return;

      const p = data as UserProfile;
      setProfile(p);
      setFullName(p.full_name || "");
      setDepartment(p.department || "");
      setCompanyDomain(p.company_domain || "");
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const updates: Partial<UserProfile> = {
        full_name: fullName.trim(),
        department: department.trim() || null,
      };
      if (profile.role === "admin") {
        updates.company_domain = companyDomain.trim();
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profile.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const isAdmin = profile?.role === "admin";

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
            {loading ? (
              <p className="text-sm text-slate-400">Loading profile...</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <Input
                      placeholder="Your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={profile?.email ?? ""}
                      disabled
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Role
                    </label>
                    <Select disabled value={profile?.role ?? ""}>
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Department
                    </label>
                    <Input
                      placeholder="Engineering"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
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
              <Input
                placeholder="company.com"
                value={companyDomain}
                onChange={(e) => setCompanyDomain(e.target.value)}
                disabled={!isAdmin || loading}
              />
              <p className="text-xs text-slate-400 mt-1">
                {isAdmin
                  ? "Users with this email domain will be auto-provisioned"
                  : "Contact an admin to change your organization domain"}
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
              {ROLE_DESCRIPTIONS.map((r) => (
                <div
                  key={r.role}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    profile?.role === r.role
                      ? "bg-blue-50 ring-1 ring-blue-200"
                      : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={r.color}>{r.label}</Badge>
                    <span className="text-sm text-slate-600">{r.desc}</span>
                  </div>
                  {profile?.role === r.role && (
                    <Badge variant="info">Your role</Badge>
                  )}
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

        <Button
          onClick={handleSave}
          disabled={saving || loading || !profile}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </>
  );
}
