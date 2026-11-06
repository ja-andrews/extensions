import { Action, ActionPanel, Clipboard, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { band, fetchRatings, Rating, toCsv } from "./lib/api";
import { MAX_LIST, splitList } from "./lib/domains";
import { ErrorView } from "./lib/errors";

function colour(rating: number) {
  if (rating >= 60) return Color.Green;
  if (rating >= 30) return Color.Yellow;
  return Color.SecondaryText;
}

export default function Command() {
  const { apiKey } = getPreferenceValues<Preferences.RateList>();

  const { data, error, isLoading, revalidate } = usePromise(async () => {
    const all = splitList(await Clipboard.readText());
    const entries = all.slice(0, MAX_LIST);
    if (entries.length === 0)
      return { ratings: [] as Rating[], total: 0, month: null as string | null, remaining: null as number | null };
    const result = await fetchRatings(entries, apiKey);
    return { ratings: result.ratings, total: all.length, month: result.month, remaining: result.remaining };
  });

  if (error) return <ErrorView error={error} onRetry={revalidate} />;

  const ratings = data?.ratings ?? [];
  const csv = toCsv(ratings);
  const listActions = (
    <>
      <Action.CopyToClipboard title="Copy All as CSV" content={csv} />
      <Action title="Read Clipboard Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
    </>
  );

  const cut = data && data.total > MAX_LIST ? ` (first ${MAX_LIST} of ${data.total})` : "";
  const section = data?.month ? `Data month ${data.month}${cut}` : `Ratings${cut}`;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter the list">
      {!isLoading && ratings.length === 0 && (
        <List.EmptyView
          icon={Icon.Clipboard}
          title="Your clipboard has no domains"
          description="Copy a list of domains or links, one per line or separated by commas, then run this again."
          actions={
            <ActionPanel>
              <Action title="Read Clipboard Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      )}
      <List.Section title={section} subtitle={ratings.length ? `${ratings.length} checked` : undefined}>
        {ratings.map((row, index) => (
          <List.Item
            key={`${index}-${row.input}`}
            title={row.domain ?? row.input}
            subtitle={row.domain && row.domain !== row.input ? row.input : undefined}
            accessories={
              row.rating === null
                ? [{ text: row.domain ? "No rating yet" : "Not a domain" }]
                : [{ tag: { value: String(row.rating), color: colour(row.rating) }, tooltip: band(row.rating) }]
            }
            actions={
              <ActionPanel>
                {row.rating !== null && (
                  <Action.CopyToClipboard title="Copy Domain and Rating" content={`${row.domain}: ${row.rating}`} />
                )}
                {listActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
