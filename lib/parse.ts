import type { Advisor, Target } from "./types";

export function parseAdvisors(text: string): Advisor[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(",").map((s) => s.trim());
      const organization = rest.join(", ");
      return { name, organization };
    })
    .filter((a) => a.name && a.organization);
}

export function parseTargets(text: string): Target[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((organization) => ({ organization }));
}

export function advisorsToText(rows: string[][]): string {
  return rows
    .map((row) => row.map((c) => c.trim()).filter(Boolean).join(", "))
    .filter(Boolean)
    .join("\n");
}

export function targetsToText(rows: string[][]): string {
  return rows
    .map((row) => row[0]?.trim())
    .filter(Boolean)
    .join("\n");
}
