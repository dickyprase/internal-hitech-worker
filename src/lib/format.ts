export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {}
) {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...opts
    }).format(new Date(date));
  } catch {
    return '';
  }
}

export function formatDateTime(date: Date | string | number | undefined) {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  } catch {
    return '';
  }
}

export function formatRupiah(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return 'Rp 0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

export function roundToThousand(value: number): number {
  return Math.round(value / 1000) * 1000;
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
}
