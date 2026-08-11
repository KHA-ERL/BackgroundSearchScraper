/**
 * VPN-compatible Chromium wrapper with DNS mode toggle and Bright Data proxy support.
 *
 * DNS_MODE environment variable controls DNS resolution:
 *
 *   DNS_MODE=vpn  (default)
 *     Chromium uses the OS/system DNS resolver. Any VPN connected at the
 *     OS level is automatically respected — no proxy configuration needed.
 *
 *   DNS_MODE=doh
 *     Chromium uses its own built-in DNS-over-HTTPS resolver (default
 *     Chromium behaviour). Bypasses VPN DNS.
 *
 * Bright Data Web Unlocker (optional proxy):
 *
 *   BRIGHT_DATA_ENABLED=true
 *   BRIGHT_DATA_PROXY=http://brd.superproxy.io:22225
 *   BRIGHT_DATA_USERNAME=brd-customer-XXX-zone-web_unlocker
 *   BRIGHT_DATA_PASSWORD=XXX
 *
 *   When enabled, ALL scrapers using this wrapper route through Bright Data
 *   automatically — no route file changes needed.
 *
 * All env vars are read on every launch() call so Settings UI changes take
 * effect immediately without a server restart.
 */

import { chromium as _chromium } from "playwright";

const BASE_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
];

export const chromium = {
  launch: async (options = {}) => {
    // DNS mode
    const useVpnDns = (process.env.DNS_MODE || "vpn").toLowerCase() !== "doh";
    const dnsArgs = useVpnDns ? ["--disable-features=DnsOverHttps"] : [];

    // Bright Data Web Unlocker proxy
    const bdEnabled =
      (process.env.BRIGHT_DATA_ENABLED || "false").toLowerCase() === "true";
    const bdUser = process.env.BRIGHT_DATA_USERNAME || "";
    const proxyOpts =
      bdEnabled && bdUser
        ? {
            proxy: {
              server:
                process.env.BRIGHT_DATA_PROXY ||
                "http://brd.superproxy.io:22225",
              username: bdUser,
              password: process.env.BRIGHT_DATA_PASSWORD || "",
            },
          }
        : {};
    // Ignore SSL cert errors when routing through a proxy (proxy does TLS interception)
    const certArgs = bdEnabled && bdUser ? ["--ignore-certificate-errors"] : [];

    return _chromium.launch({
      ...options,
      ...proxyOpts,
      args: [
        ...(options.args || []),
        ...BASE_ARGS,
        ...dnsArgs,
        ...certArgs,
      ],
    });
  },

  launchPersistentContext: async (userDataDir, options = {}) => {
    const useVpnDns = (process.env.DNS_MODE || "vpn").toLowerCase() !== "doh";
    const dnsArgs = useVpnDns ? ["--disable-features=DnsOverHttps"] : [];

    return _chromium.launchPersistentContext(userDataDir, {
      ...options,
      args: [
        ...(options.args || []),
        ...BASE_ARGS,
        ...dnsArgs,
      ],
    });
  },
};

