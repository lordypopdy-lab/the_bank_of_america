export type AccountStatus = "active" | "restricted" | "suspended";
export type WithdrawalStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "processing"
  | "completed";
export type TxnType = "deposit" | "withdrawal" | "adjustment" | "fund_lock" | "fund_unlock";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  account_number: string;
  status: AccountStatus;
  status_message: string | null;
  created_at: string;
  last_active_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  total_balance: number;
  locked_balance: number;
  currency: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TxnType;
  amount: number;
  description: string;
  reference: string;
  balance_before: number;
  balance_after: number;
  status: string;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  note: string | null;
  status: WithdrawalStatus;
  reference: string;
  requested_at: string;
  processing_date: string | null;
  expected_completion_date: string | null;
  completed_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  updated_at: string;
}

export interface FundLock {
  id: string;
  user_id: string;
  amount: number;
  locked_at: string;
  unlock_date: string;
  status: "active" | "released";
  released_at: string | null;
  reference: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface WithdrawalRestriction {
  id: string;
  user_id: string;
  is_restricted: boolean;
  message: string | null;
  reason: string | null;
  start_date: string | null;
  end_date: string | null;
  updated_at: string;
}

export interface AdminActivity {
  id: string;
  admin_id: string;
  admin_email: string | null;
  action: string;
  target_user_id: string | null;
  previous_value: string | null;
  new_value: string | null;
  reason: string | null;
  reference: string;
  created_at: string;
}

export interface AdminUserRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  account_number: string;
  status: AccountStatus;
  created_at: string;
  last_active_at: string;
  total_balance: number;
  locked_balance: number;
  available_balance: number;
  pending_withdrawals: number;
  is_restricted: boolean;
}

export interface AdminOverview {
  total_users: number;
  active_users: number;
  restricted_users: number;
  total_balance: number;
  locked_balance: number;
  pending_withdrawals: number;
  processing_withdrawals: number;
  completed_withdrawals: number;
  pending_count: number;
}
