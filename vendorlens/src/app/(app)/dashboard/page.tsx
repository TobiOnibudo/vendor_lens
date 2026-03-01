"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Building2,
  DollarSign,
  CalendarClock,
  Copy,
  TrendingDown,
  ArrowUpRight,
  FileText,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, daysUntil, getRenewalUrgency } from "@/lib/utils";
import Link from "next/link";
import type { DashboardStats, Contract, Vendor, DuplicateGroup } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

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
      href: "/vendors",
    },
    {
      title: "Annual Spend",
      value: formatCurrency(stats.totalAnnualSpend),
      icon: DollarSign,
      href: "/vendors",
    },
    {
      title: "Renewals (90d)",
      value: stats.upcomingRenewals90,
      icon: CalendarClock,
      href: "/contracts",
      sublabel: stats.upcomingRenewals30 > 0 ? `${stats.upcomingRenewals30} within 30 days` : "",
      sublabelWarning: stats.upcomingRenewals30 > 0,
    },
    {
      title: "Duplicate Alerts",
      value: stats.duplicateAlerts,
      icon: Copy,
      href: "/duplicates",
    },
  ];

  if (loading) {
    return (
      <>
        <Header title="Dashboard" description="Loading your vendor intelligence..." />
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 p-6">
              <div className="h-3 bg-slate-200 rounded w-24 mb-5" />
              <div className="h-7 bg-slate-200 rounded w-16" />
            </div>
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

      <div className="p-6 space-y-5">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <div className="group rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 shadow-sm hover:shadow-md hover:bg-white/90 transition-all cursor-pointer p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-black uppercase tracking-wide">
                    {stat.title}
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                    <stat.icon className="h-4 w-4 text-black" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-black">{stat.value}</div>
                <div className="mt-1 min-h-[22px] flex items-center">
                  {stat.sublabel && stat.sublabelWarning ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                      <AlertTriangle className="h-3 w-3" />
                      {stat.sublabel}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">{stat.sublabel ?? ""}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-slate-500 group-hover:text-black transition-colors font-medium">
                  View details <ArrowUpRight className="h-3 w-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Savings Banner */}
        {stats.estimatedSavings > 0 && (
          <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 shadow-sm p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-100/80 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="h-5 w-5 text-slate-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-800">
                Estimated Consolidation Savings
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatCurrency(stats.estimatedSavings)} potential savings from{" "}
                {stats.duplicateAlerts} duplicate tool groups
              </p>
            </div>
            <Link href="/duplicates">
              <Button variant="outline" size="sm" className="rounded-lg text-xs">
                Review <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Upcoming Renewals */}
          <div className="lg:col-span-2 rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">Upcoming Renewals</h2>
              </div>
              <Link href="/contracts">
                <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-slate-700 h-7 px-2">
                  View All
                </Button>
              </Link>
            </div>

            {recentContracts.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No upcoming renewals</p>
                <Link href="/contracts">
                  <Button variant="outline" size="sm" className="mt-3 text-xs rounded-lg">
                    Upload Contracts
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentContracts.map((contract) => {
                  const days = contract.renewal_date ? daysUntil(contract.renewal_date) : 999;
                  const urgency = getRenewalUrgency(days);
                  const dotColor =
                    urgency === "critical" ? "bg-red-400"
                    : urgency === "warning" ? "bg-amber-400"
                    : urgency === "upcoming" ? "bg-blue-400"
                    : "bg-slate-300";
                  const dayColor =
                    urgency === "critical" ? "text-red-600 font-semibold"
                    : urgency === "warning" ? "text-amber-600 font-semibold"
                    : urgency === "upcoming" ? "text-blue-500"
                    : "text-slate-400";
                  return (
                    <div
                      key={contract.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/70 hover:bg-white/80 border border-slate-100/60 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-100/80 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {contract.vendor_name}
                          </p>
                          <p className="text-xs text-slate-400">{contract.file_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {contract.auto_renew && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
                            Auto-renew
                          </span>
                        )}
                        <span className={`text-xs tabular-nums ${dayColor}`}>
                          {days}d
                        </span>
                        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Top Vendors */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">Top Vendors by Spend</h2>
              </div>

              {topVendors.length === 0 ? (
                <div className="text-center py-6">
                  <Building2 className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No vendors yet</p>
                  <Link href="/vendors">
                    <Button variant="outline" size="sm" className="mt-3 text-xs rounded-lg">
                      Import Vendors
                    </Button>
                  </Link>
                </div>
              ) : (
                  <div className="space-y-2">
                    {topVendors.map((vendor, idx) => (
                      <Link key={vendor.id} href={`/vendors/${vendor.id}`}>
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/70 transition-all group">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs text-slate-300 w-4 text-right tabular-nums">
                              {idx + 1}
                            </span>
                            <span className="text-sm text-slate-700 group-hover:text-black transition-colors truncate max-w-[120px]">
                              {vendor.name}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-800 tabular-nums">
                            {formatCurrency(vendor.annual_spend)}
                          </span>
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </div>

            {/* Duplicate Alerts */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-slate-800">Duplicate Alerts</h2>
              </div>

              {duplicates.length === 0 ? (
                <div className="text-center py-6">
                  <Copy className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No duplicates detected</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {duplicates.map((dup) => (
                    <Link key={dup.id} href="/duplicates">
                      <div className="px-4 py-3 rounded-xl bg-white/70 hover:bg-white/80 border border-slate-100/60 transition-all cursor-pointer">
                        <p className="text-sm font-medium text-slate-800">{dup.group_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {(dup.vendor_names as string[]).join(", ")}
                        </p>
                        <span className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${
                          (dup.estimated_overlap_pct || 0) >= 60
                            ? "bg-red-50 text-red-600"
                            : (dup.estimated_overlap_pct || 0) < 20
                            ? "bg-blue-50 text-blue-500"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {dup.estimated_overlap_pct}% overlap
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Requests */}
            {stats.pendingAccessRequests > 0 && (
              <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 shadow-sm p-5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-slate-100/80 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {stats.pendingAccessRequests} pending access {stats.pendingAccessRequests === 1 ? "request" : "requests"}
                  </p>
                  <Link href="/access" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">
                    Review now →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
