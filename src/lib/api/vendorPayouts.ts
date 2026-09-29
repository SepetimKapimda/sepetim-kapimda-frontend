import { apiClient } from "@/lib/apiClient";
import type {
  BankInfo,
  PayoutCreatedResponse,
  PayoutHistoryResponse,
} from "@/lib/api/payoutTypes";

export type { BankInfo, PayoutCreatedResponse, PayoutHistoryResponse } from "@/lib/api/payoutTypes";
export type { PayoutRequestItem, Wallet, PayoutStatus } from "@/lib/api/payoutTypes";

export function fetchMarketBankInfo(): Promise<BankInfo> {
  return apiClient.get<BankInfo>("/api/markets/me/bank-info/");
}

export function updateMarketBankInfo(payload: Partial<BankInfo>): Promise<BankInfo> {
  return apiClient.patch<BankInfo>("/api/markets/me/bank-info/", payload);
}

export function fetchMarketPayoutHistory(page = 1): Promise<PayoutHistoryResponse> {
  return apiClient.get<PayoutHistoryResponse>(
    `/api/markets/payout/history/?page=${page}&page_size=20`
  );
}

export function requestMarketPayout(amount: string, notes?: string): Promise<PayoutCreatedResponse> {
  return apiClient.post<PayoutCreatedResponse>("/api/markets/payout/request/", {
    amount,
    ...(notes ? { notes } : {}),
  });
}
