export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const expectedKey = process.env.INDEXNOW_KEY;
  const requestedKey = params?.indexNowKey;

  if (!expectedKey || requestedKey !== expectedKey) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(expectedKey, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
