import { SITE_URL, seoTools } from "../../../lib/seo/tools";

export const dynamic = "force-dynamic";

function urlsFromRequest(searchParams) {
  const rawUrls = searchParams.get("urls");
  if (!rawUrls) {
    return [SITE_URL, `${SITE_URL}/llms.txt`, ...seoTools.map((tool) => `${SITE_URL}${tool.path}`)];
  }

  return rawUrls
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.startsWith(SITE_URL))
    .slice(0, 10000);
}

export async function GET(request) {
  const key = process.env.INDEXNOW_KEY;

  if (!key) {
    return Response.json(
      { ok: false, error: "Missing INDEXNOW_KEY. Add it to your deployment environment before submitting URLs." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const urlList = urlsFromRequest(searchParams);

  if (!urlList.length) {
    return Response.json({ ok: false, error: "No valid canonical URLs were provided." }, { status: 400 });
  }

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key,
      keyLocation: `${SITE_URL}/${key}.txt`,
      urlList,
    }),
  });

  return Response.json(
    {
      ok: response.ok,
      status: response.status,
      submitted: urlList,
    },
    { status: response.ok ? 200 : response.status }
  );
}
