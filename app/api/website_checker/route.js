import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import axios from "axios";

export const POST = requireLicense(async (request) => {
  try {
    const { urls } = await request.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "urls array required" }, { status: 400 });
    }

    const limitedUrls = urls.slice(0, 50).map((u) => {
      u = u.trim();
      if (!/^https?:\/\//i.test(u)) u = "https://" + u;
      return u;
    });

    const checkUrl = async (url) => {
      const start = Date.now();
      try {
        const res = await axios.get(url, {
          timeout: 10000,
          maxRedirects: 5,
          validateStatus: () => true,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; URLChecker/1.0)",
          },
        });
        const elapsed = Date.now() - start;
        const finalUrl = res.request?.res?.responseUrl || res.config?.url || url;
        return {
          url,
          status_code: res.status,
          status_text: res.statusText || "",
          response_time: elapsed,
          redirect_url: finalUrl !== url ? finalUrl : "",
        };
      } catch (err) {
        const elapsed = Date.now() - start;
        let msg = "Network Error";
        if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") msg = "Timeout";
        else if (err.code === "ENOTFOUND") msg = "DNS Error";
        else if (err.code === "ECONNREFUSED") msg = "Connection Refused";
        else if (err.message) msg = err.message.slice(0, 60);
        return {
          url,
          status_code: "error",
          status_text: msg,
          response_time: elapsed,
          redirect_url: "",
        };
      }
    };

    const results = await Promise.all(limitedUrls.map(checkUrl));
    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("Website checker error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
