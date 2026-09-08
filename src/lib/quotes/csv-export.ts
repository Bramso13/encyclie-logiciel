import { csvToUtf8Buffer } from "@/lib/bordereau/generateCSV";

export function csvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[;"\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function csvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvCell).join(";");
}

export function csvDocument(lines: string[]): string {
  return lines.join("\n");
}

export function csvDownloadBuffer(lines: string[]): Buffer {
  return csvToUtf8Buffer(csvDocument(lines));
}
