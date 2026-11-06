import { BrowserExtension, environment, getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { hostFromUrl } from "./domains";

// Browsers whose front tab can be read with AppleScript, by application name.
const CHROMIUM = ["Google Chrome", "Arc", "Brave Browser", "Microsoft Edge", "Vivaldi", "Chromium", "Opera"];
const SAFARI = ["Safari", "Safari Technology Preview"];

function escape(name: string) {
  return name.replace(/"/g, '\\"');
}

async function urlFromAppleScript(appName: string): Promise<string | null> {
  if (SAFARI.includes(appName)) {
    return runAppleScript(`tell application "${escape(appName)}" to return URL of front document`);
  }
  if (CHROMIUM.includes(appName)) {
    return runAppleScript(`tell application "${escape(appName)}" to return URL of active tab of front window`);
  }
  return null;
}

// The domain of the tab in the browser you were just using. The frontmost app
// is asked first, because that is the browser you mean. The Raycast browser
// extension, when installed, covers every other browser.
export async function frontmostTabDomain(): Promise<string | null> {
  try {
    const app = await getFrontmostApplication();
    const host = hostFromUrl(await urlFromAppleScript(app.name));
    if (host) return host;
  } catch {
    // Not a browser we know, no window open, or no permission yet.
  }

  if (environment.canAccess(BrowserExtension)) {
    try {
      const tabs = await BrowserExtension.getTabs();
      const active = tabs.find((tab) => tab.active) ?? tabs[0];
      const host = hostFromUrl(active?.url);
      if (host) return host;
    } catch {
      // The browser extension is not installed or not connected.
    }
  }
  return null;
}
