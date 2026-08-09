export type UserRole = "admin" | "finance" | "department_head" | "employee";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  company_domain: string;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  canonical_name: string | null;
  aliases: string[] | null;
  category: string | null;
  description: string | null;
  department: string | null;
  owner_id: string | null;
  owner_name: string | null;
  total_spend: number;
  annual_spend: number;
  is_active: boolean;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  vendor_id: string;
  vendor_name?: string;
  file_name: string;
  file_url: string | null;
  renewal_date: string | null;
  auto_renew: boolean | null;
  notice_period_days: number | null;
  contract_value: number | null;
  pricing_escalation: string | null;
  summary: string | null;
  key_terms: string[] | null;
  status: "pending_review" | "confirmed" | "expired";
  extracted_at: string | null;
  confirmed_by: string | null;
  created_at: string;
}

export interface SpendRecord {
  id: string;
  vendor_id: string;
  amount: number;
  department: string;
  period: string;
  description: string | null;
  created_at: string;
}

export interface AccessRequest {
  id: string;
  vendor_id: string;
  vendor_name?: string;
  requester_id: string;
  requester_name?: string;
  requester_email?: string;
  approver_id: string | null;
  approver_name?: string;
  status: "pending" | "approved" | "denied";
  reason: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface DuplicateGroup {
  id: string;
  group_name: string;
  vendor_ids: string[];
  vendor_names: string[];
  reason: string;
  estimated_overlap_pct: number;
  total_combined_spend: number;
  status: "flagged" | "reviewed" | "dismissed";
  created_at: string;
}

export interface DashboardStats {
  totalVendors: number;
  totalAnnualSpend: number;
  upcomingRenewals30: number;
  upcomingRenewals60: number;
  upcomingRenewals90: number;
  duplicateAlerts: number;
  pendingAccessRequests: number;
  estimatedSavings: number;
}

export interface VendorCluster {
  canonical: string;
  variants: string[];
  accepted: boolean;
}
