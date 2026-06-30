export function formatINR(value: number): string {
  if (isNaN(value)) return "₹0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  // Indian comma separator
  const formatted = abs.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
  return `${sign}₹${formatted}`;
}

export function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function dateToISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
