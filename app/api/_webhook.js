import axios from "axios";

/**
 * Fire-and-forget webhook notification.
 * Called after any scraper returns results.
 *
 * @param {string} toolName  Human-readable tool name (e.g. "Email Scraper")
 * @param {Array}  results   The result rows array
 */
export async function notifyWebhook(toolName, results) {
  const url = process.env.WEBHOOK_URL;
  if (!url || !url.startsWith("http")) return;
  try {
    await axios.post(
      url,
      {
        tool: toolName,
        count: results.length,
        results,
        timestamp: new Date().toISOString(),
      },
      { timeout: 5000 }
    );
  } catch (_) {
    // Webhook failures are non-fatal — silently ignored
  }
}
