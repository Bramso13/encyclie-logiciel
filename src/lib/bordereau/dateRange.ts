/**
 * Période demi-ouverte [start, end) — identique à l’UI admin bordereaux.
 */
export function getBordereauDateRangeForMonthYear(
  month: number,
  year: number,
): {
  startDate: Date;
  endDate: Date;
  startDateStr: string;
  endDateStr: string;
  label: string;
} {
  const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDateStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  return {
    startDateStr,
    endDateStr,
    startDate: new Date(startDateStr),
    endDate: new Date(endDateStr),
    label: `${String(month).padStart(2, "0")}/${year}`,
  };
}

export function getBordereauDateRangeFromArgs(
  argv: string[],
): {
  startDate: Date;
  endDate: Date;
  startDateStr: string;
  endDateStr: string;
  label: string;
  month: number;
  year: number;
} {
  const a = argv[2];
  const b = argv[3];

  if (a != null && b != null && /^\d{4}-\d{2}-\d{2}$/.test(a)) {
    const endDateStr = b;
    return {
      startDateStr: a,
      endDateStr,
      startDate: new Date(a),
      endDate: new Date(b),
      label: `${a} → ${b}`,
      month: new Date(a).getUTCMonth() + 1,
      year: new Date(a).getUTCFullYear(),
    };
  }

  const now = new Date();
  const month =
    a != null && /^\d{1,2}$/.test(a) ? parseInt(a, 10) : now.getMonth() + 1;
  const year =
    b != null && /^\d{4}$/.test(b) ? parseInt(b, 10) : now.getFullYear();

  const range = getBordereauDateRangeForMonthYear(month, year);
  return { ...range, month, year };
}
