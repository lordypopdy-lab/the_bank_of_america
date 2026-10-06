import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

export type KycStatus = "not_verified" | "pending" | "verified" | "declined";

export interface KycRecord {
  id: string;
  user_id: string;
  country: string;
  id_type: string;
  document_path: string;
  selfie_path: string;
  status: KycStatus;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface AdminKycRow extends KycRecord {
  full_name: string | null;
  email: string | null;
  account_number: string | null;
  reviewer_email: string | null;
}

export function useMyKyc(userId?: string | null) {
  return useQuery({
    queryKey: ["kyc", userId],
    enabled: !!userId,
    queryFn: async (): Promise<KycRecord | null> => {
      const { data, error } = await db
        .from("kyc_verifications")
        .select("*")
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as KycRecord) ?? null;
    },
  });
}

export function useAdminKyc(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-kyc"],
    enabled,
    queryFn: async (): Promise<AdminKycRow[]> => {
      const { data, error } = await db.rpc("admin_kyc");
      if (error) throw error;
      return (data ?? []) as AdminKycRow[];
    },
  });
}

export function useKycFileUrl(path?: string | null) {
  return useQuery({
    queryKey: ["kyc-file", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 15,
    queryFn: async () => {
      if (!path) return null;
      const { data } = await supabase.storage.from("kyc").createSignedUrl(path, 60 * 30);
      return data?.signedUrl ?? null;
    },
  });
}

export const KYC_COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "South Africa", "United States", "United Kingdom",
  "Canada", "Ireland", "Germany", "France", "Spain", "Italy", "Netherlands",
  "Australia", "New Zealand", "India", "United Arab Emirates", "Other",
];

export const KYC_ID_TYPES = [
  { value: "national_id", label: "National ID" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "passport", label: "Passport" },
  { value: "other_government_id", label: "Other government ID" },
];

export function kycStatusLabel(status?: KycStatus | null) {
  switch (status) {
    case "verified":
      return "Verified";
    case "pending":
      return "Pending Review";
    case "declined":
      return "Declined";
    default:
      return "Not Verified";
  }
}
