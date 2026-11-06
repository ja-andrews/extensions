// Turning what people have to hand (a typed domain, a tab's address, a pasted
// list) into the strings the API is sent. The API cleans each entry itself, so
// this only splits, trims and removes repeats. It never decides that an entry is
// not a domain: the API says so per entry, which keeps both sides in step.

export const MAX_PER_REQUEST = 100;
export const MAX_LIST = 1000;

// The hostname of a web address, or null for anything that is not one
// (chrome://, file://, about:blank and the like have no rating to show).
export function hostFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (!host.includes(".")) return null;
  return host;
}

// Entries from a pasted list, split on new lines, commas, semicolons, tabs and
// spaces, with blanks and repeats taken out and the first spelling kept.
export function splitList(text: string | undefined | null): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const entry = raw.trim().replace(/^["'<(]+|[">)'.]+$/g, "");
    if (!entry) continue;
    const key = entry.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }
  return entries;
}

export function chunk<T>(items: T[], size: number = MAX_PER_REQUEST): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
