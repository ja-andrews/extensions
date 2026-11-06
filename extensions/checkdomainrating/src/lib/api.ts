// The one call this extension makes: POST /api/v1/ratings with up to 100
// entries, the key in the Authorization header. Nothing else is sent, and
// nothing is kept.

export const SITE = "https://checkdomainrating.com";
export const FREE_KEY_URL = `${SITE}/en/free-domain-rating-api-key`;
export const DOCS_URL = `${SITE}/en/domain-rating-api`;
export const PLANS_URL = `${SITE}/en/bulk-domain-rating-data`;

export type Rating = { input: string; domain: string | null; rating: number | null };
export type RatingsResult = { month: string | null; ratings: Rating[]; remaining: number | null };

export type ApiErrorKind = "unauthenticated" | "daily_limit" | "bad_request" | "network" | "server";

export class ApiError extends Error {
  kind: ApiErrorKind;
  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
  }
}

type FetchLike = typeof fetch;

async function post(domains: string[], apiKey: string, base: string, fetcher: FetchLike) {
  let response: Response;
  try {
    response = await fetcher(`${base}/api/v1/ratings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ domains }),
    });
  } catch {
    throw new ApiError("network", "We could not reach checkdomainrating.com. Check your connection and try again.");
  }

  let body: { message?: string; month?: string | null; ratings?: Rating[] } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    // An empty or broken body is dealt with by the status below.
  }

  if (response.status === 401) {
    throw new ApiError("unauthenticated", "Your API key was not accepted. Copy it again from your account page.");
  }
  if (response.status === 429) {
    throw new ApiError(
      "daily_limit",
      "Your free key has used today's 25 lookups. It resets at midnight UTC, or a plan lifts the limit.",
    );
  }
  if (response.status === 400 || response.status === 422) {
    throw new ApiError("bad_request", body.message || "The list could not be read.");
  }
  if (!response.ok) {
    throw new ApiError("server", `checkdomainrating.com had a problem (${response.status}). Try again soon.`);
  }

  const remaining = response.headers.get("X-RateLimit-Remaining");
  return {
    month: body.month ?? null,
    ratings: body.ratings ?? [],
    remaining: remaining === null ? null : Number(remaining),
  };
}

// Ratings for any number of entries, sent 100 at a time and in order. Each
// request of 100 counts as one lookup against a free key's daily allowance.
export async function fetchRatings(
  entries: string[],
  apiKey: string,
  options: { base?: string; fetcher?: FetchLike } = {},
): Promise<RatingsResult> {
  const base = options.base ?? SITE;
  const fetcher = options.fetcher ?? fetch;
  const result: RatingsResult = { month: null, ratings: [], remaining: null };

  for (let i = 0; i < entries.length; i += 100) {
    const batch = entries.slice(i, i + 100);
    const page = await post(batch, apiKey, base, fetcher);
    result.month = page.month ?? result.month;
    result.ratings.push(...page.ratings);
    result.remaining = page.remaining;
  }
  return result;
}

// The three bands the website uses, so a number on its own still means something.
export function band(rating: number): string {
  if (rating >= 60) return "Linked to from all over the web";
  if (rating >= 30) return "A fair spread of sites link to it";
  return "New, small or lightly linked";
}

export function toCsv(ratings: Rating[]): string {
  const quote = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const lines = ["input,domain,rating"];
  for (const row of ratings) {
    lines.push([quote(row.input), quote(row.domain ?? ""), row.rating === null ? "" : String(row.rating)].join(","));
  }
  return lines.join("\n");
}
