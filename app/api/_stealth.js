import { chromium } from "playwright";

// Stealth init script injected into every page before any page scripts run.
// Overrides the main fingerprints headless Chrome exposes.
const STEALTH_SCRIPT = `
  // 1. Hide webdriver flag
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  // 2. Inject realistic Chrome runtime
  window.chrome = {
    runtime: {
      connect: function(){},
      sendMessage: function(){},
      onMessage: { addListener: function(){} },
      id: 'fmnoegcnfjkbkbhnapohlodoabiefmoe',
    },
    loadTimes: function(){},
    csi: function(){},
    app: { isInstalled: false },
  };

  // 3. Override permissions query so notification check passes
  const _origPerms = navigator.permissions.query.bind(navigator.permissions);
  navigator.permissions.query = (p) =>
    p.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : _origPerms(p);

  // 4. Non-empty plugins array
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const p = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
      ];
      p.__proto__ = PluginArray.prototype;
      return p;
    },
  });

  // 5. Real language array
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

  // 6. Realistic screen dimensions
  Object.defineProperty(screen, 'colorDepth', { get: () => 24 });

  // 7. Remove headless user-agent substring
  const _uaDef = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
  if (_uaDef && _uaDef.get) {
    Object.defineProperty(navigator, 'userAgent', {
      get: () => _uaDef.get().replace('HeadlessChrome', 'Chrome'),
    });
  }
`;

// StealthBrowser wraps a real Playwright browser.
// newContext() patches the context so every page gets stealth init scripts.
class StealthBrowser {
  constructor(browser) {
    this._b = browser;
  }

  async newContext(options = {}) {
    const ctx = await this._b.newContext(options);
    // addInitScript on the context applies to every page opened from it
    await ctx.addInitScript(STEALTH_SCRIPT);
    return ctx;
  }

  async newPage() {
    const page = await this._b.newPage();
    await page.addInitScript(STEALTH_SCRIPT);
    return page;
  }

  async close() {
    await this._b.close();
  }

  // Forward isConnected and other props to the real browser
  isConnected() {
    return this._b.isConnected();
  }
}

export const stealthChromium = {
  launch: async (options = {}) => {
    // DNS mode — read at call time so Settings UI changes take effect immediately
    const useVpnDns = (process.env.DNS_MODE || "vpn").toLowerCase() !== "doh";
    const dnsArgs = useVpnDns ? ["--disable-features=DnsOverHttps"] : [];

    // Bright Data Web Unlocker proxy — read at call time
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

    const browser = await chromium.launch({
      ...options,
      ...proxyOpts,
      args: [
        ...(options.args || []),
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--disable-infobars",
        "--ignore-certificate-errors",
        ...dnsArgs,
      ],
    });
    return new StealthBrowser(browser);
  },
};
