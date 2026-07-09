import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import dns from "dns/promises";
import axios from "axios";

export const POST = requireLicense(async (request) => {
  try {
    const { domains } = await request.json();
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json({ error: "domains array required" }, { status: 400 });
    }

    const limitedDomains = domains
      .slice(0, 30)
      .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0])
      .filter(Boolean);

    const checkDomain = async (domain) => {
      let has_a = false;
      let has_mx = false;
      let has_ns = false;
      let ssl_valid = false;

      // DNS checks in parallel
      const [aResult, mxResult, nsResult] = await Promise.allSettled([
        dns.resolve(domain, "A"),
        dns.resolve(domain, "MX"),
        dns.resolve(domain, "NS"),
      ]);

      has_a = aResult.status === "fulfilled" && aResult.value.length > 0;
      has_mx = mxResult.status === "fulfilled" && mxResult.value.length > 0;
      has_ns = nsResult.status === "fulfilled" && nsResult.value.length > 0;

      // SSL check via HTTPS
      try {
        const res = await axios.get(`https://${domain}`, {
          timeout: 8000,
          maxRedirects: 3,
          validateStatus: () => true,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; DomainChecker/1.0)" },
        });
        ssl_valid = res.status < 500;
      } catch (_) {
        ssl_valid = false;
      }

      const status = has_a && has_ns ? "Valid" : "No DNS";

      return { domain, has_a, has_mx, has_ns, ssl_valid, status };
    };

    const results = await Promise.all(limitedDomains.map(checkDomain));
    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("Verified domains error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
