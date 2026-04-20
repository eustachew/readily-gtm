import type { Match } from "./types";

const EXPORT_COLUMNS = [
  "Advisor Name",
  "Target Organization",
  "Target Name",
  "Target Role",
  "Target LinkedIn",
] as const;

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function matchesToCsv(matches: Match[]): string {
  const rows = [EXPORT_COLUMNS.join(",")];
  for (const m of matches) {
    rows.push(
      [
        m.advisorName,
        m.targetOrganization,
        m.targetName,
        m.targetRole,
        m.targetLinkedIn ?? "",
      ]
        .map(escapeCell)
        .join(","),
    );
  }
  return rows.join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
