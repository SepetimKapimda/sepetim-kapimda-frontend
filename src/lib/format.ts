// FRONTEND_CHANGES.md §0: tüm para alanları 2 ondalıklı string döner ("1450.00").
// Gösterim için: Number(value).toLocaleString("tr-TR").
export function formatCurrency(value: string | number | null | undefined): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "0,00 ₺";
  }
  return `${amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`;
}

// İstekte tutar gönderirken backend'in beklediği 2 ondalıklı string biçimi.
export function toApiAmount(value: number): string {
  return value.toFixed(2);
}
