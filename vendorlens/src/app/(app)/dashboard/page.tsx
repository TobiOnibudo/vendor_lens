"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  DollarSign,
  CalendarClock,
  AlertTriangle,
  Copy,
  TrendingDown,
  ArrowUpRight,
  FileText,
  Clock,
} from "lucide-react";
import { formatCurrency, daysUntil, getRenewalUrgency } from "@/lib/utils";
import Link from "next/link";
import type { DashboardStats, Contract, Vendor, DuplicateGroup } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const urgencyColors = {
  critical: "destructive" as const,
  warning: "warning" as const,
  upcoming: "info" as const,
  safe: "success" as const,
};

const urgencyLabels = {
  critical: "Critical",
  warning: "Warning",
  upcoming: "Upcoming",
  safe: "Safe",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVendors: 0,
    totalAnnualSpend: 0,
    upcomingRenewals30: 0,
    upcomingRenewals60: 0,
    upcomingRenewals90: 0,
    duplicateAlerts: 0,
    pendingAccessRequests: 0,
    estimatedSavings: 0,
  });
  const [recentContracts, setRecentContracts] = useState<Contract[]>([]);
  const [topVendors, setTopVendors] = useState<Vendor[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const supabase = createClient();

      const [vendorRes, contractRes, duplicateRes, accessRes] = await Promise.all([
        supabase.from("vendors").select("*").eq("is_active", true),
        supabase.from("contracts").select("*, vendors(name)").order("renewal_date", { ascending: true }),
        supabase.from("duplicate_groups").select("*").eq("status", "flagged"),
        supabase.from("access_requests").select("*").eq("status", "pending"),
      ]);

      const vendors = vendorRes.data || [];
      const contracts = contractRes.data || [];
      const dupes = duplicateRes.data || [];
      const accessReqs = accessRes.data || [];

      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 86400000);
      const in60 = new Date(now.getTime() + 60 * 86400000);
      const in90 = new Date(now.getTime() + 90 * 86400000);

      const upcomingContracts = contracts.filter(
        (c) => c.renewal_date && new Date(c.renewal_date) > now
      );

      setStats({
        totalVendors: vendors.length,
        totalAnnualSpend: vendors.reduce((sum, v) => sum + (v.annual_spend || 0), 0),
        upcomingRenewals30: upcomingContracts.filter(
          (c) => new Date(c.renewal_date) <= in30
        ).length,
        upcomingRenewals60: upcomingContracts.filter(
          (c) => new Date(c.renewal_date) <= in60
        ).length,
        upcomingRenewals90: upcomingContracts.filter(
          (c) => new Date(c.renewal_date) <= in90
        ).length,
        duplicateAlerts: dupes.length,
        pendingAccessRequests: accessReqs.length,
        estimatedSavings: dupes.reduce(
          (sum, d) =>
            sum + (d.total_combined_spend || 0) * ((d.estimated_overlap_pct || 0) / 100),
          0
        ),
      });

      setRecentContracts(
        upcomingContracts.slice(0, 5).map((c) => ({
          ...c,
          vendor_name: c.vendors?.name || "Unknown",
        }))
      );
      setTopVendors(vendors.sort((a, b) => (b.annual_spend || 0) - (a.annual_spend || 0)).slice(0, 5));
      setDuplicates(dupes.slice(0, 3));
    } catch {
      // Graceful degradation — show empty state
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      title: "Total Vendors",
      value: stats.totalVendors,
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/vendors",
    },
    {
      title: "Annual Spend",
      value: formatCurrency(stats.totalAnnualSpend),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/vendors",
    },
    {
      title: "Renewals (90d)",
      value: stats.upcomingRenewals90,
      icon: CalendarClock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/contracts",
      sublabel: `${stats.upcomingRenewals30} within 30 days`,
    },
    {
      title: "Duplicate Alerts",
      value: stats.duplicateAlerts,
      icon: Copy,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/duplicates",
    },
  ];

  if (loading) {
    return (
      <>
        <Header title="Dashboard" description="Loading your vendor intelligence..." />
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-100 rounded w-24 mb-4" />
                <div className="h-8 bg-slate-100 rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Dashboard"
        description="Your vendor intelligence at a glance"
      />

      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-500">
                      {stat.title}
                    </span>
                    <div className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  {stat.sublabel && (
                    <p className="text-xs text-slate-400 mt-1">{stat.sublabel}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
                    View details <ArrowUpRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Savings Banner */}
        {stats.estimatedSavings > 0 && (
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-900">
                  Estimated Consolidation Savings
                </h3>
                <p className="text-sm text-emerald-700 mt-0.5">
                  {formatCurrency(stats.estimatedSavings)} potential savings from{" "}
                  {stats.duplicateAlerts} duplicate tool groups
                </p>
              </div>
              <Link href="/duplicates">
                <Button variant="success" size="sm">
                  Review <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Renewals */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-amber-500" />
                Upcoming Renewals
              </CardTitle>
              <Link href="/contracts">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentContracts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No upcoming renewals</p>
                  <Link href="/contracts">
                    <Button variant="outline" size="sm" className="mt-3">
                      Upload Contracts
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentContracts.map((contract) => {
                    const days = contract.renewal_date
                      ? daysUntil(contract.renewal_date)
                      : 999;
                    const urgency = getRenewalUrgency(days);
                    return (
                      <div
                        key={contract.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {contract.vendor_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {contract.file_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {contract.auto_renew && (
                            <Badge variant="warning">Auto-renew</Badge>
                          )}
                          <Badge variant={urgencyColors[urgency]}>
                            {days} days — {urgencyLabels[urgency]}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions / Alerts */}
          <div className="space-y-6">
            {/* Top Vendors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  Top Vendors by Spend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topVendors.length === 0 ? (
                  <div className="text-center py-6">
                    <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No vendors yet</p>
                    <Link href="/vendors">
                      <Button variant="outline" size="sm" className="mt-3">
                        Import Vendors
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topVendors.map((vendor, idx) => (
                      <div
                        key={vendor.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-slate-300 w-5">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]">
                            {vendor.name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                          {formatCurrency(vendor.annual_spend)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Duplicate Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Duplicate Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {duplicates.length === 0 ? (
                  <div className="text-center py-6">
                    <Copy className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No duplicates detected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {duplicates.map((dup) => (
                      <Link key={dup.id} href="/duplicates">
                        <div className="p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors cursor-pointer">
                          <p className="text-sm font-medium text-red-900">
                            {dup.group_name}
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            {(dup.vendor_names as string[]).join(", ")}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="destructive">
                              {dup.estimated_overlap_pct}% overlap
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Requests */}
            {stats.pendingAccessRequests > 0 && (
              <Card className="border-blue-200">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {stats.pendingAccessRequests} Pending Access Requests
                    </p>
                    <Link
                      href="/access"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Review now
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
