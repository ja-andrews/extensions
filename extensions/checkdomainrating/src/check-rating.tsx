import { Action, ActionPanel, Detail, getPreferenceValues, Icon, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { band, DOCS_URL, fetchRatings, SITE } from "./lib/api";
import { frontmostTabDomain } from "./lib/browser";
import { ErrorView } from "./lib/errors";

type Result =
  | { found: false }
  | {
      found: true;
      input: string;
      domain: string | null;
      rating: number | null;
      month: string | null;
      remaining: number | null;
    };

export default function Command(props: LaunchProps<{ arguments: Arguments.CheckRating }>) {
  const { apiKey } = getPreferenceValues<Preferences.CheckRating>();
  const typed = props.arguments.domain?.trim();

  const { data, error, isLoading, revalidate } = usePromise(
    async (typedDomain: string | undefined): Promise<Result> => {
      const input = typedDomain || (await frontmostTabDomain());
      if (!input) return { found: false };
      const result = await fetchRatings([input], apiKey);
      const row = result.ratings[0];
      return {
        found: true,
        input,
        domain: row?.domain ?? null,
        rating: row?.rating ?? null,
        month: result.month,
        remaining: result.remaining,
      };
    },
    [typed],
  );

  if (error) return <ErrorView error={error} onRetry={revalidate} />;

  if (!data) return <Detail isLoading={isLoading} markdown="" />;

  if (!data.found) {
    return (
      <Detail
        markdown={
          "# No domain to check\n\nType a domain after the command, for example `example.com`.\n\n" +
          "Or open a website in your browser first. Safari, Chrome, Arc, Brave, Edge, Vivaldi and Opera work straight away. " +
          "macOS may ask once for permission to read the tab."
        }
      />
    );
  }

  const { input, domain, rating, month, remaining } = data;
  const markdown =
    rating === null
      ? `# ${domain ?? input}\n\n${domain ? "We have no rating for this domain yet." : "This does not look like a domain we can rate."}`
      : `# ${domain}\n\n## Rating: ${rating} out of 100\n\n${band(rating)}.`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {rating !== null && <Detail.Metadata.Label title="Rating" text={`${rating} / 100`} />}
          {domain && <Detail.Metadata.Label title="Domain" text={domain} />}
          {month && <Detail.Metadata.Label title="Data month" text={month} />}
          {remaining !== null && <Detail.Metadata.Label title="Free lookups left today" text={String(remaining)} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="About the rating" target={`${SITE}/en/domain-rating-faq`} text="How it works" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {rating !== null && <Action.CopyToClipboard title="Copy Rating" content={String(rating)} />}
          {domain && rating !== null && (
            <Action.CopyToClipboard title="Copy Domain and Rating" content={`${domain}: ${rating}`} />
          )}
          <Action title="Check Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action.OpenInBrowser title="Open API Documentation" url={DOCS_URL} />
        </ActionPanel>
      }
    />
  );
}
