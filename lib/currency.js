const DEFAULT_FRACTION_DIGITS = 0;

const formatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: DEFAULT_FRACTION_DIGITS,
});

export function formatPKR(value, options = {}) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";

  if (options.maximumFractionDigits !== undefined) {
    const custom = new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: options.maximumFractionDigits,
      minimumFractionDigits: options.minimumFractionDigits ?? 0,
    });
    return custom.format(amount);
  }

  return formatter.format(amount);
}
