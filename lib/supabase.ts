import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Types matching the database schema ────────────────────────────────────────

export type UserRole = 'industry' | 'official' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected';
export type ReportStatus = 'pending' | 'approved' | 'rejected';

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
};

export type Park = {
  id: string;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  total_area_acres: number | null;
  established_year: number | null;
  is_active: boolean;
};

export type Industry = {
  id: string;
  user_id: string | null;
  park_id: string;
  name: string;
  sector: string;
  allottee_code: string | null;
  contact_person: string | null;
  contact_email: string | null;
  is_active: boolean;
};

export type MonthlyReport = {
  id: string;
  industry_id: string;
  submitted_by: string | null;
  month: number;
  year: number;
  // Step 1
  investment_cr: number | null;
  turnover_cr: number | null;
  // Step 2
  emp_male: number;
  emp_female: number;
  emp_contractual: number;
  emp_total: number;
  // Step 3
  water_kld: number | null;
  power_kwh: number | null;
  water_alert: boolean;
  // Step 4
  csr_spend_lakhs: number | null;
  csr_activity: string | null;
  csr_file_url: string | null;
  // Workflow
  status: ReportStatus;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  submitted_at: string;
};

// Park summary view type (used by Admin Map Dashboard)
export type ParkSummary = {
  park_id: string;
  park_name: string;
  district: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  industry_count: number;
  total_investment_cr: number;
  total_turnover_cr: number;
  total_jobs: number;
  total_water_kld: number;
  total_power_kwh: number;
  total_csr_spend_lakhs: number;
  has_water_alert: boolean;
  pending_reports: number;
};

// Verification queue view type
export type VerificationItem = {
  id: string;
  industry_id: string;
  industry_name: string;
  sector: string;
  allottee_code: string | null;
  park_id: string;
  park_name: string;
  district: string;
  month: number;
  year: number;
  investment_cr: number | null;
  turnover_cr: number | null;
  emp_male: number;
  emp_female: number;
  emp_contractual: number;
  emp_total: number;
  water_kld: number | null;
  water_alert: boolean;
  power_kwh: number | null;
  csr_spend_lakhs: number | null;
  csr_activity: string | null;
  csr_file_url: string | null;
  status: ReportStatus;
  rejection_reason: string | null;
  submitted_at: string;
  verified_at: string | null;
  verified_by_name: string | null;
};
