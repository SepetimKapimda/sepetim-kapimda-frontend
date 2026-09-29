// Market, Kurye ve Kurye Yöneticisi payout uçlarının hepsi aynı şema
// parçalarını (BankInfo, Wallet, PayoutRequest, PayoutHistoryResponse)
// paylaşır — tek kaynak burada tutulur.

export interface BankInfo {
  iban_account_holder: string | null;
  iban: string | null;
}

export interface Wallet {
  earned_total: string;
  approved_total: string;
  pending_total: string;
  balance: string;
  available_balance: string;
}

export type PayoutStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PayoutRequestItem {
  id: number;
  amount: string;
  status: PayoutStatus;
  status_display: string;
  iban: string;
  account_holder_name: string;
  requested_at: string;
  processed_at: string | null;
  receipt_url: string | null;
  notes: string | null;
  processor_note: string | null;
}

export interface PayoutHistoryResponse {
  wallet: Wallet;
  count: number;
  next: string | null;
  previous: string | null;
  results: PayoutRequestItem[];
}

export interface PayoutCreatedResponse {
  payout: PayoutRequestItem;
  wallet: Wallet;
}

// Ödeyen tarafın (Admin / Kurye Yöneticisi) gördüğü talep — requester bilgisi eklenmiş hali.
export interface ProcessorPayoutRequest extends PayoutRequestItem {
  requester: { id: number; username: string; full_name: string };
  requester_role?: string;
  requester_role_display?: string;
}

export interface PayoutProcessPayload {
  receipt_url?: string;
  note?: string;
}
