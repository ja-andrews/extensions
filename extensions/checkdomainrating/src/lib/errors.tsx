import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { ApiError, FREE_KEY_URL, PLANS_URL } from "./api";

export function ErrorView({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const kind = error instanceof ApiError ? error.kind : "server";
  const title =
    kind === "unauthenticated"
      ? "Your API key was not accepted"
      : kind === "daily_limit"
        ? "Today's free lookups are used up"
        : "Something went wrong";

  return (
    <Detail
      markdown={`# ${title}\n\n${error.message}`}
      actions={
        <ActionPanel>
          {kind === "unauthenticated" && (
            <>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser title="Get a Free API Key" url={FREE_KEY_URL} />
            </>
          )}
          {kind === "daily_limit" && <Action.OpenInBrowser title="See Plans" url={PLANS_URL} />}
          {onRetry && <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />}
        </ActionPanel>
      }
    />
  );
}
