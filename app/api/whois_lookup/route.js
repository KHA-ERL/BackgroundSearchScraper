import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import axios from "axios";

export const POST = requireLicense(async (request) => {
  try {
    const { domains } = await request.json();
    if (!domains || !Array.isArray(domains) || domains.length === 0)
      return NextResponse.json({ error: "domains array required" }, { status: 400 });

    const limited = domains
      .slice(0, 10)
      .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0])
      .filter(Boolean);

    const lookup = async (domain) => {
      try {
        // Use RDAP — structured JSON, no scraping needed
        const res = await axios.get(`https://rdap.org/domain/${domain}`, {
          timeout: 10000,
          headers: { Accept: "application/rdap+json" },
        });
        const d = res.data;

        const entity = (roles) =>
          d.entities?.find((e) => e.roles?.some((r) => roles.includes(r)));

        const registrarEntity = entity(["registrar"]);
        const registrar =
          registrarEntity?.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3] ||
          registrarEntity?.publicIds?.[0]?.identifier ||
          "N/A";

        const getEvent = (action) =>
          d.events?.find((e) => e.eventAction === action)?.eventDate?.split("T")[0] || "N/A";

        const ns = (d.nameservers || []).map((n) => n.ldhName || n.unicodeName).filter(Boolean).join(", ") || "N/A";

        const statusArr = Array.isArray(d.status) ? d.status : [];
        const status = statusArr.includes("active")
          ? "Active"
          : statusArr[0] || "Registered";

        return {
          domain,
          registrar,
          created: getEvent("registration"),
          expires: getEvent("expiration"),
          status,
          name_servers: ns,
        };
      } catch {
        return { domain, registrar: "N/A", created: "N/A", expires: "N/A", status: "Error", name_servers: "N/A" };
      }
    };

    const results = await Promise.all(limited.map(lookup));
    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("WHOIS lookup error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
