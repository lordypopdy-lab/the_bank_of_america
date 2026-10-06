import { supabase } from "@/integrations/supabase/client";

/**
 * Loosely typed data client. The generated database types can lag behind
 * migrations, so queries are written against the hand-authored interfaces
 * in `@/lib/types` instead.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again.") {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "";

  if (!raw) return fallback;
  const cleaned = raw
    .replace(/^.*violates row-level security.*$/i, "You are not allowed to perform this action.")
    .replace(/^new row for relation.*$/i, fallback)
    .replace(/duplicate key value.*$/i, "That record already exists.")
    .replace(/JWT|PGRST\d+|SQLSTATE.*/gi, "")
    .trim();

  if (/User already registered/i.test(cleaned)) return "An account with this email already exists.";
  if (/Invalid login credentials/i.test(cleaned)) return "Incorrect email or password.";
  if (/Email not confirmed/i.test(cleaned)) return "Please confirm your email address first.";
  if (!cleaned || cleaned.length > 220) return fallback;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
